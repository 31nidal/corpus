import { extractTypedStudyFacts, symbolicFactRules } from './symbolic-facts.mjs'

const POC_RELATIONS = new Set(['innervation', 'vascularisation', 'localisation'])
const MIN_CONFIDENCE = symbolicFactRules.minConfidence
const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('fr-FR').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

function answerFor(fact) {
  return fact.relation === 'localisation' ? fact.object : fact.subject
}

function targetFor(fact) {
  return fact.relation === 'localisation' ? fact.subject : fact.object
}

function comparableKey(fact) {
  return normalize(targetFor(fact))
}

function ruleIsAmbiguous(target, facts) {
  const targetKey = comparableKey(target)
  const expected = normalize(answerFor(target))
  return facts.some(fact => fact.id !== target.id && fact.relation === target.relation &&
    comparableKey(fact) === targetKey && normalize(answerFor(fact)) !== expected)
}

function sameAnswerType(target, candidate) {
  if (target.relation === 'innervation') return target.subjectType === 'nerve' && candidate.subjectType === 'nerve'
  if (target.relation === 'vascularisation') {
    return ['artery', 'vein', 'blood_vessel'].includes(target.subjectType) &&
      ['artery', 'vein', 'blood_vessel'].includes(candidate.subjectType)
  }
  return target.relation === 'localisation' && target.objectType === 'anatomical_region' && candidate.objectType === 'anatomical_region'
}

function alternativesFor(target, facts) {
  const targetKey = comparableKey(target)
  const targetAnswer = normalize(answerFor(target))
  const unique = new Map()
  for (const candidate of facts) {
    if (candidate.id === target.id || candidate.relation !== target.relation || candidate.confidence < MIN_CONFIDENCE) continue
    if (!sameAnswerType(target, candidate) || comparableKey(candidate) === targetKey) continue
    const answer = answerFor(candidate)
    const key = normalize(answer)
    if (!key || key === targetAnswer || unique.has(key)) continue
    // A distractor is excluded when its own subject/object has conflicting source facts.
    if (ruleIsAmbiguous(candidate, facts)) continue
    unique.set(key, candidate)
  }
  return [...unique.values()].slice(0, 3)
}

function questionText(fact) {
  if (fact.relation === 'innervation') return `Quel nerf le document associe-t-il à l’innervation de « ${fact.object} » ?`
  if (fact.relation === 'vascularisation') return `Quel vaisseau le document associe-t-il à la vascularisation de « ${fact.object} » ?`
  if (fact.relation === 'localisation') return `Dans quelle région le document situe-t-il « ${fact.subject} » ?`
  return null
}

function relationStatement(fact) {
  return fact.evidence
}

function explanation(optionFact, targetFact, correct) {
  if (correct) return `Le passage source confirme la relation demandée : « ${relationStatement(targetFact)} »`
  if (targetFact.relation === 'localisation') {
    return `Le document situe « ${optionFact.subject} » dans « ${optionFact.object} » ; pour « ${targetFact.subject} », le passage source indique « ${targetFact.object} ».`
  }
  return `Le document associe « ${optionFact.subject} » à « ${optionFact.object} » dans un autre passage ; pour « ${targetFact.object} », il indique « ${targetFact.subject} ».`
}

function isDuplicate(question, existingQuestions) {
  const excerpt = normalize(question.sourceExcerpt)
  const prompt = normalize(question.prompt)
  return existingQuestions.some(existing => {
    if (excerpt && normalize(existing.sourceExcerpt) === excerpt) return true
    return prompt === normalize(existing.prompt) &&
      normalize(existing.options?.[existing.correct?.[0]]) === normalize(question.options[0])
  })
}

/** Run explicit, source-grounded rules for the three POC relations only. */
export function generateSymbolicStudyQuestions(doc, sections, count = 5, existingQuestions = [], facts = extractTypedStudyFacts(sections)) {
  const candidates = []
  const seen = new Set()
  const sectionById = new Map(sections.map(section => [String(section.id), section]))
  for (const fact of facts) {
    if (!POC_RELATIONS.has(fact.relation) || fact.confidence < MIN_CONFIDENCE) continue
    if (ruleIsAmbiguous(fact, facts)) continue
    const alternatives = alternativesFor(fact, facts)
    if (alternatives.length < 3) continue
    const prompt = questionText(fact)
    if (!prompt) continue
    const signature = `${fact.relation}|${comparableKey(fact)}|${normalize(answerFor(fact))}`
    if (seen.has(signature)) continue
    seen.add(signature)
    const section = sectionById.get(fact.sectionId)
    if (!section || !String(section.content || '').includes(fact.evidence)) continue
    const optionFacts = [fact, ...alternatives]
    const question = {
      id: `local-symbolic-${fact.id}`,
      course: `doc-${doc.id}`,
      topic: doc.title,
      prompt,
      options: optionFacts.map(answerFor),
      correct: [0],
      why: optionFacts.map((optionFact, index) => explanation(optionFact, fact, index === 0)),
      difficulty: 'essentiel',
      format: 'single',
      documentId: doc.id,
      sourceSectionId: fact.sectionId,
      sourceSectionTitle: fact.sectionTitle,
      sourcePages: fact.pages,
      sourceExcerpt: fact.evidence,
      sourceFactId: fact.id
    }
    if (!isDuplicate(question, [...existingQuestions, ...candidates])) candidates.push(question)
  }
  return candidates.slice(0, Math.max(0, count))
}

function uniqueItems(facts, select) {
  const items = []
  const seen = new Set()
  for (const fact of facts) {
    const item = select(fact)
    const key = normalize(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    items.push(item)
  }
  return items
}

/** Categories for local summaries; empty groups are deliberately omitted. */
export function buildSymbolicSummaryCategories(facts = []) {
  const categories = []
  const structures = uniqueItems(facts, fact => `${fact.subject} (${fact.subjectType}) ; ${fact.object} (${fact.objectType})`)
  if (structures.length) categories.push({ id: 'structures', label: 'Structures importantes', items: structures })

  const relationCategories = [
    ['innervation', 'Innervation'],
    ['vascularisation', 'Vascularisation'],
    ['localisation', 'Localisation / rapports']
  ]
  for (const [relation, label] of relationCategories) {
    const related = facts.filter(fact => fact.relation === relation && fact.confidence >= MIN_CONFIDENCE)
    const items = uniqueItems(related, relationStatement)
    if (items.length) categories.push({ id: relation, label, items })
  }
  return categories
}

export { POC_RELATIONS }
