import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractTypedStudyFacts } from '../server/study/symbolic-facts.mjs'
import { buildSymbolicSummaryCategories, generateSymbolicStudyQuestions } from '../server/study/symbolic-rules.mjs'
import { generateLocalGroundedQuestions, generateLocalSummary } from '../server/study.mjs'

function section(content, id = 'section-1') {
  return { id, title: 'Relations anatomiques', startPage: 4, endPage: 6, content }
}

const innervationText = [
  'Le nerf phrénique innerve le diaphragme.',
  'Le nerf vague innerve les muscles du pharynx.',
  'Le nerf hypoglosse innerve les muscles de la langue.',
  'Le nerf facial innerve les muscles de la mimique.'
].join(' ')

const vascularText = [
  'L’artère coronaire vascularise le myocarde.',
  'L’artère hépatique irrigue le foie.',
  'L’artère rénale vascularise le rein.',
  'L’artère splénique alimente la rate.'
].join(' ')

const locationText = [
  'Le pancréas se situe dans la cavité abdominale.',
  'La trachée est située dans la région cervicale.',
  'Le cœur se trouve dans le médiastin thoracique.',
  'La vessie est localisée dans la région pelvienne.'
].join(' ')

test('faits typés : innervation, vascularisation et localisation gardent type, source, pages et confiance', () => {
  const facts = extractTypedStudyFacts([section(`${innervationText} ${vascularText} ${locationText}`)])
  const innervation = facts.find(fact => fact.relation === 'innervation' && fact.subject.includes('phrénique'))
  const vascularisation = facts.find(fact => fact.relation === 'vascularisation' && fact.subject.includes('coronaire'))
  const localisation = facts.find(fact => fact.relation === 'localisation' && fact.subject.includes('pancréas'))

  assert.deepEqual([innervation.subject, innervation.object, innervation.subjectType, innervation.objectType], ['nerf phrénique', 'diaphragme', 'nerve', 'muscle'])
  assert.deepEqual([vascularisation.subject, vascularisation.object, vascularisation.subjectType], ['artère coronaire', 'myocarde', 'artery'])
  assert.deepEqual([localisation.subject, localisation.object, localisation.subjectType, localisation.objectType], ['pancréas', 'cavité abdominale', 'organ', 'anatomical_region'])
  for (const fact of [innervation, vascularisation, localisation]) {
    assert.ok(fact.id.startsWith('sf-'))
    assert.deepEqual(fact.pages, [4, 6])
    assert.ok(fact.confidence >= 0.9)
    assert.equal(fact.confidenceLevel, fact.relation === 'localisation' ? 'medium' : 'high')
    assert.ok(fact.evidence.length >= 35)
  }
  assert.equal(extractTypedStudyFacts([section(`${innervationText} ${vascularText} ${locationText}`)])[0].id, facts[0].id, 'les identifiants de fait doivent être stables')
})

test('les formulations négatives et incertaines ne deviennent pas des faits positifs', () => {
  const facts = extractTypedStudyFacts([section([
    'Le nerf vague n’innerve pas les muscles du pharynx.',
    'Le nerf phrénique peut innerver le diaphragme dans cette hypothèse.',
    'Le nerf vague innerve les muscles du pharynx ou du larynx.',
    'Le pancréas pourrait se situer dans la cavité abdominale.'
  ].join(' '))])
  assert.deepEqual(facts, [])
})

test('les règles d’innervation gardent les distracteurs dans la catégorie nerf et tracent l’extrait exact', () => {
  const sections = [section(`${innervationText} ${vascularText}`)]
  const facts = extractTypedStudyFacts(sections)
  const questions = generateSymbolicStudyQuestions({ id: 'doc-1', title: 'Anatomie' }, sections, 20, [], facts)
  const questionsNerve = questions.filter(question => question.prompt.includes('innervation'))
  assert.equal(questionsNerve.length, 4)
  for (const question of questionsNerve) {
    assert.equal(question.options.length, 4)
    assert.equal(question.correct.length, 1)
    const expected = facts.find(fact => fact.id === question.sourceFactId)
    assert.equal(question.options[question.correct[0]], expected.subject)
    assert.ok(sections[0].content.includes(question.sourceExcerpt))
    assert.ok(question.why.every(reason => reason.length >= 20))
    assert.ok(question.options.every(option => facts.some(fact => fact.relation === 'innervation' && fact.subject === option)))
    assert.ok(!question.options.some(option => option.startsWith('artère')))
  }
})

test('les règles de vascularisation et localisation ne mélangent pas leurs types de réponses', () => {
  const sections = [section(`${vascularText} ${locationText}`)]
  const facts = extractTypedStudyFacts(sections)
  const questions = generateSymbolicStudyQuestions({ id: 'doc-2', title: 'Anatomie' }, sections, 20, [], facts)
  const vesselQuestions = questions.filter(question => question.prompt.includes('vascularisation'))
  const locationQuestions = questions.filter(question => question.prompt.includes('région'))
  assert.equal(vesselQuestions.length, 4)
  assert.equal(locationQuestions.length, 4)
  for (const question of vesselQuestions) {
    assert.ok(question.options.every(option => facts.some(fact => fact.relation === 'vascularisation' && fact.subject === option && ['artery', 'vein', 'blood_vessel'].includes(fact.subjectType))))
  }
  for (const question of locationQuestions) {
    assert.ok(question.options.every(option => facts.some(fact => fact.relation === 'localisation' && fact.object === option && fact.objectType === 'anatomical_region')))
    const correctFact = facts.find(fact => fact.id === question.sourceFactId)
    assert.equal(question.options[question.correct[0]], correctFact.object)
  }
})

test('les règles s’abstiennent si les distracteurs manquent ou si une relation est contradictoire', () => {
  const tooSmall = [section(innervationText.split('. ').slice(0, 3).join('. ') + '.')]
  assert.deepEqual(generateSymbolicStudyQuestions({ id: 'doc-3', title: 'Cours' }, tooSmall, 10), [])

  const contradictory = [section(`${innervationText} Le nerf accessoire innerve le diaphragme.`)]
  const questions = generateSymbolicStudyQuestions({ id: 'doc-4', title: 'Cours' }, contradictory, 10)
  assert.ok(questions.every(question => !question.prompt.includes('diaphragme')))
})

test('les faits dupliqués et questions répétées sont dédupliqués de façon stable', () => {
  const repeated = section(`${innervationText} ${innervationText}`)
  const factsA = extractTypedStudyFacts([repeated])
  const factsB = extractTypedStudyFacts([repeated])
  assert.equal(factsA.length, 4)
  assert.deepEqual(factsA.map(fact => fact.id), factsB.map(fact => fact.id))
  const doc = { id: 'doc-5', title: 'Cours' }
  const first = generateSymbolicStudyQuestions(doc, [repeated], 10)
  const second = generateSymbolicStudyQuestions(doc, [repeated], 10)
  const stableForm = questions => questions.map(question => [question.prompt, [...question.options].sort(), question.sourceExcerpt])
  assert.deepEqual(stableForm(first), stableForm(second))
  assert.equal(generateSymbolicStudyQuestions(doc, [repeated], 10, first).length, 0)
})

test('la synthèse locale regroupe les faits disponibles et omet les catégories vides', () => {
  const sections = [section(`${innervationText} ${vascularText} ${locationText}`)]
  const summary = generateLocalSummary('Anatomie', sections)
  const categories = summary.chapters[0].categories
  const labels = categories.map(category => category.label)
  assert.deepEqual(labels, ['Structures importantes', 'Innervation', 'Vascularisation', 'Localisation / rapports', 'Points essentiels'])
  assert.ok(categories.every(category => category.items.length > 0))
  assert.ok(categories.find(category => category.label === 'Innervation').items.every(item => sections[0].content.includes(item)))

  const sparse = generateLocalSummary('Cours', [section(innervationText)])
  assert.ok(!sparse.chapters[0].categories.some(category => category.label === 'Vascularisation'))
  assert.ok(!sparse.chapters[0].categories.some(category => category.items.length === 0))
})

test('le générateur local intègre les règles symboliques sans créer une relation absente', () => {
  const sections = [section(`${innervationText} Le nerf accessoire n’innerve pas le diaphragme.`)]
  const questions = generateLocalGroundedQuestions({ id: 'doc-6', title: 'Neuroanatomie' }, sections, 20)
  assert.equal(questions.length, 4)
  assert.ok(questions.every(question => !question.options.includes('nerf accessoire')))
  assert.ok(questions.every(question => sections[0].content.includes(question.sourceExcerpt)))
  assert.ok(questions.every(question => question.options[question.correct[0]] && question.sourceExcerpt.includes(question.options[question.correct[0]])))
})
