import { test } from 'node:test'
import assert from 'node:assert/strict'
import { courses } from '../src/study/curriculum.ts'
import { questions } from '../src/study/questions.ts'
import { canonicalCourses } from '../src/study/taxonomy/canonicalCourses.ts'
import { legacyHubs } from '../src/study/taxonomy/legacyHubs.ts'
import { chemistryCourseIds, curatedChemistryCourseIds } from '../src/study/content/chemistry/index.ts'
import { cellBiologyCourses, cellBiologyQuestionCourseIds } from '../src/study/content/cellBiology/index.ts'
import { biochemistryCourses, biochemistryQuestions } from '../src/study/content/biochemistry/index.ts'
import { geneticsCourses, geneticsQuestions } from '../src/study/content/genetics/index.ts'
import { embryologyCourses, embryologyQuestions } from '../src/study/content/embryology/index.ts'
import { histologyCourses, histologyQuestions } from '../src/study/content/histology/index.ts'
import { biophysicsCourses, biophysicsQuestions } from '../src/study/content/biophysics/index.ts'
import { physiologyCourses, physiologyQuestions } from '../src/study/content/physiology/index.ts'
import { immunologyCourses, immunologyQuestions } from '../src/study/content/immunology/index.ts'
import { statisticsCourses, statisticsQuestions } from '../src/study/content/statistics/index.ts'
import { pharmacologyCourses, pharmacologyQuestions } from '../src/study/content/pharmacology/index.ts'
import { publicHealthCourses, publicHealthQuestions } from '../src/study/content/publicHealth/index.ts'
import { shsCourses, shsQuestions } from '../src/study/content/shs/index.ts'
import { upperLimbCourses, upperLimbQuestions } from '../src/study/content/anatomy/upperLimb.ts'
import { lowerLimbCourses, lowerLimbQuestions } from '../src/study/content/anatomy/lowerLimb.ts'
import { upperNeurovascularCourses, upperNeurovascularQuestions } from '../src/study/content/anatomy/upperNeurovascular.ts'
import { lowerNeurovascularCourses, lowerNeurovascularQuestions } from '../src/study/content/anatomy/lowerNeurovascular.ts'
import { trunkWallCourses, trunkWallQuestions } from '../src/study/content/anatomy/trunkWalls.ts'
import { thoraxVisceraCourses, thoraxVisceraQuestions } from '../src/study/content/anatomy/thoraxViscera.ts'
import { abdominalCourses, abdominalQuestions } from '../src/study/content/anatomy/abdomen.ts'
import { pelvisHeadNeckCourses, pelvisHeadNeckQuestions } from '../src/study/content/anatomy/pelvisHeadNeck.ts'
import { additionalHistologyCourses, additionalHistologyQuestions } from '../src/study/content/histology/additional.ts'
import { additionalEmbryologyCourses, additionalEmbryologyQuestions } from '../src/study/content/embryology/additional.ts'
import { developmentEmbryologyCourses, developmentEmbryologyQuestions } from '../src/study/content/embryology/development.ts'
import { additionalGeneticsCourses, additionalGeneticsQuestions } from '../src/study/content/genetics/additional.ts'
import { additionalBiochemistryCourses, additionalBiochemistryQuestions } from '../src/study/content/biochemistry/additional.ts'
import { imagingCourses, imagingQuestions } from '../src/study/content/biophysics/imaging.ts'
import { fluidCourses, fluidQuestions } from '../src/study/content/biophysics/fluids.ts'
import { radiationCourses, radiationQuestions } from '../src/study/content/biophysics/radiation.ts'
import { waveCourses, waveQuestions } from '../src/study/content/biophysics/waves.ts'
import { cellNeuromuscularCourses, cellNeuromuscularQuestions } from '../src/study/content/physiology/cellNeuromuscular.ts'
import { cardiorespiratoryCourses, cardiorespiratoryQuestions } from '../src/study/content/physiology/cardiorespiratory.ts'
import { renalEndocrineCourses, renalEndocrineQuestions } from '../src/study/content/physiology/renalEndocrine.ts'
import { firstImmunologyCourses, firstImmunologyQuestions } from '../src/study/content/immunology/first.ts'
import { secondImmunologyCourses, secondImmunologyQuestions } from '../src/study/content/immunology/second.ts'
import { advancedStatisticsCourses, advancedStatisticsQuestions } from '../src/study/content/statistics/advanced.ts'
import { additionalPharmacologyCourses, additionalPharmacologyQuestions } from '../src/study/content/pharmacology/additional.ts'
import { additionalPublicHealthCourses, additionalPublicHealthQuestions } from '../src/study/content/publicHealth/additional.ts'
import { additionalShsCourses, additionalShsQuestions } from '../src/study/content/shs/additional.ts'
import { drugSocietyCourses, drugSocietyQuestions } from '../src/study/content/drugSociety.ts'
import { researchCourses, researchQuestions } from '../src/study/content/research/additional.ts'
import { odontologyCourses, odontologyQuestions } from '../src/study/content/odontology/additional.ts'
import { medicalEnglishCourses, medicalEnglishQuestions } from '../src/study/content/english/medical.ts'

test('each authored chemistry chapter is a canonical course with a complete learning record', () => {
  assert.equal(chemistryCourseIds.size, 20)
  assert.equal(curatedChemistryCourseIds.size, 19)
  for (const id of chemistryCourseIds) {
    const canonical = canonicalCourses.find(item => item.id === id)
    const matches = courses.filter(course => course.id === id)
    assert.ok(canonical, `${id} is present in the canonical taxonomy`)
    assert.equal(matches.length, 1, `${id} resolves to exactly one Course`)
    const [course] = matches
    assert.equal(course.title, canonical.title)
    assert.equal(course.category, canonical.subject)
    assert.ok(course.objectives.length >= 3 && course.objectives.length <= 6, `${id} has 3–6 objectives`)
    assert.ok(course.sections.length >= 5 && course.sections.length <= 8, `${id} has 5–8 sections`)
    assert.ok(course.sections.every(section => section.text.trim().length >= 100), `${id} sections explain a notion`)
    assert.ok(course.trap.trim() && course.recall.trim() && course.answer.trim())
    assert.equal(course.review?.status, 'unreviewed')
    assert.ok(course.minutes >= 10 && course.minutes <= 25)
    for (const source of course.sources ?? []) {
      assert.equal(new URL(source.url).protocol, 'https:')
      assert.ok(source.label.trim())
    }
    assert.doesNotMatch(course.sections.map(section => section.text).join(' '), /Nouveau chapitre au programme canonique|rédaction complète.*programmée/i)
  }
})

test('each authored chemistry chapter has five distinct, fully explained QCM', () => {
  const seenIds = new Set()
  const seenPrompts = new Set()
  for (const id of curatedChemistryCourseIds) {
    const own = questions.filter(question => question.course === id)
    assert.equal(own.length, 5, `${id} has five authored questions and no generated filler`)
    for (const question of own) {
      assert.ok(question.id.startsWith(`${id}-q`))
      assert.ok(!seenIds.has(question.id), `question id ${question.id} is unique`)
      assert.ok(!seenPrompts.has(question.prompt), `question prompt ${question.prompt} is unique`)
      seenIds.add(question.id)
      seenPrompts.add(question.prompt)
      assert.ok(question.options.length >= 2 && question.options.length <= 4)
      assert.ok(question.correct.length >= 1)
      assert.ok(question.correct.every(index => index >= 0 && index < question.options.length))
      assert.equal(question.why.length, question.options.length)
      assert.ok(question.why.every(explanation => explanation.trim().length >= 12))
    }
  }
})

test('the cell-biology batch has canonical lessons and five authored questions per chapter', () => {
  assert.equal(cellBiologyCourses.length, 15)
  assert.equal(cellBiologyQuestionCourseIds.size, 15)
  for (const course of cellBiologyCourses) {
    const canonical = canonicalCourses.find(item => item.id === course.id)
    assert.ok(canonical, `${course.id} belongs to the validated taxonomy`)
    assert.equal(course.title, canonical.title)
    assert.ok(course.objectives.length >= 3 && course.sections.length >= 5)
    assert.ok(course.sections.every(section => section.text.trim().length >= 100))
    assert.ok(course.sources?.length)
    assert.equal(new URL(course.source).protocol, 'https:')
    const own = questions.filter(question => question.course === course.id)
    assert.equal(own.length, 5, `${course.id} has five authored questions`)
    for (const question of own) {
      assert.ok(question.id.startsWith(`${course.id}-q`))
      assert.ok(question.options.length >= 2 && question.options.length <= 4)
      assert.ok(question.correct.length >= 1 && question.correct.every(index => index >= 0 && index < question.options.length))
      assert.equal(question.why.length, question.options.length)
      assert.ok(question.why.every(text => text.trim().length >= 12))
    }
  }
})

test('the chemistry batch introduces no duplicate Course IDs or QCM IDs', () => {
  const courseIds = courses.map(course => course.id)
  assert.equal(courseIds.length, new Set(courseIds).size)
  const questionIds = questions.map(question => question.id)
  assert.equal(questionIds.length, new Set(questionIds).size)
})

test('biochemistry, genetics and embryology courses are canonical and have authored QCM', () => {
  const batches = [
    ['Biochimie', biochemistryCourses, biochemistryQuestions],
    ['Génétique & Biologie moléculaire', geneticsCourses, geneticsQuestions],
    ['Embryologie & Reproduction', embryologyCourses, embryologyQuestions],
    ['Histologie', histologyCourses, histologyQuestions],
    ['Biophysique', biophysicsCourses, biophysicsQuestions],
    ['Physiologie', physiologyCourses, physiologyQuestions],
    ['Immunologie', immunologyCourses, immunologyQuestions],
    ['Biostatistiques', statisticsCourses, statisticsQuestions],
    ['Biostatistiques', advancedStatisticsCourses, advancedStatisticsQuestions],
    ['Pharmacologie', pharmacologyCourses, pharmacologyQuestions],
    ['Pharmacologie', additionalPharmacologyCourses, additionalPharmacologyQuestions],
    ['Santé publique', publicHealthCourses, publicHealthQuestions],
    ['Santé publique', additionalPublicHealthCourses, additionalPublicHealthQuestions],
    ['Santé publique', additionalPublicHealthCourses, additionalPublicHealthQuestions],
    ['Santé, Société, Humanité', shsCourses, shsQuestions],
    ['Santé, Société, Humanité', additionalShsCourses, additionalShsQuestions],
    ['Médicament & Société', drugSocietyCourses, drugSocietyQuestions],
    ['Recherche biomédicale', researchCourses, researchQuestions],
    ['Odontologie', odontologyCourses, odontologyQuestions],
    ['Anglais médical', medicalEnglishCourses, medicalEnglishQuestions],
    ['Anatomie', upperLimbCourses, upperLimbQuestions],
    ['Anatomie', lowerLimbCourses, lowerLimbQuestions],
    ['Anatomie', upperNeurovascularCourses, upperNeurovascularQuestions],
    ['Anatomie', lowerNeurovascularCourses, lowerNeurovascularQuestions],
    ['Anatomie', trunkWallCourses, trunkWallQuestions],
    ['Anatomie', thoraxVisceraCourses, thoraxVisceraQuestions],
    ['Anatomie', abdominalCourses, abdominalQuestions],
    ['Anatomie', pelvisHeadNeckCourses, pelvisHeadNeckQuestions],
    ['Histologie', additionalHistologyCourses, additionalHistologyQuestions],
    ['Embryologie & Reproduction', additionalEmbryologyCourses, additionalEmbryologyQuestions],
    ['Embryologie & Reproduction', developmentEmbryologyCourses, developmentEmbryologyQuestions],
    ['Génétique & Biologie moléculaire', additionalGeneticsCourses, additionalGeneticsQuestions],
    ['Biochimie', additionalBiochemistryCourses, additionalBiochemistryQuestions],
    ['Biophysique', imagingCourses, imagingQuestions],
    ['Biophysique', fluidCourses, fluidQuestions],
    ['Biophysique', radiationCourses, radiationQuestions],
    ['Biophysique', waveCourses, waveQuestions],
    ['Physiologie', cellNeuromuscularCourses, cellNeuromuscularQuestions],
    ['Physiologie', cardiorespiratoryCourses, cardiorespiratoryQuestions],
    ['Physiologie', renalEndocrineCourses, renalEndocrineQuestions],
    ['Immunologie', firstImmunologyCourses, firstImmunologyQuestions],
    ['Immunologie', secondImmunologyCourses, secondImmunologyQuestions]
  ]
  for (const [subject, batchCourses, batchQuestions] of batches) {
    assert.ok(batchCourses.length > 0)
    const ids = new Set(batchCourses.map(course => course.id))
    assert.equal(batchQuestions.length, ids.size * 5)
    for (const course of batchCourses) {
      const canonical = canonicalCourses.find(item => item.id === course.id)
      assert.ok(canonical, `${course.id} exists in canonical taxonomy`)
      assert.equal(canonical.subject, subject)
      assert.equal(course.title, canonical.title)
      assert.equal(course.category, subject)
      assert.ok(course.objectives.length >= 3 && course.objectives.length <= 6)
      assert.ok(course.sections.length >= 5 && course.sections.length <= 8)
      assert.ok(course.sections.every(section => section.text.trim().length >= 100))
      assert.ok(course.sources?.length)
      assert.equal(new URL(course.source).protocol, 'https:')
      const own = batchQuestions.filter(question => question.course === course.id)
      assert.equal(own.length, 5)
      for (const question of own) {
        assert.ok(question.id.startsWith(`${course.id}-q`))
        assert.ok(question.options.length >= 2 && question.options.length <= 4)
        assert.equal(question.correct.length, 1)
        assert.equal(question.why.length, question.options.length)
        assert.ok(question.why.every(text => text.trim().length >= 12))
      }
    }
  }
})

test('all 305 canonical entries resolve to exactly one pedagogical Course; Legacy Hubs remain separate', () => {
  const hubIds = new Set(legacyHubs.map(hub => hub.id))
  const canonicalNonHubs = canonicalCourses.filter(item => !hubIds.has(item.id))
  for (const canonical of canonicalNonHubs) {
    const matches = courses.filter(course => course.id === canonical.id)
    assert.equal(matches.length, 1, `${canonical.id} resolves to one course`)
  }
  assert.equal(canonicalCourses.length, 305)
  assert.equal(legacyHubs.length, 26)
  assert.ok(legacyHubs.every(hub => !courses.some(course => course.id === hub.id)), 'compatibility hubs are not pedagogical courses')
})
