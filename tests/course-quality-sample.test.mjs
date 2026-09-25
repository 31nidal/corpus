import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { courses } from '../src/study/curriculum.ts'
import { questions } from '../src/study/questions.ts'
import { inspectCourse, editorialAudit } from '../scripts/course-editorial-quality.mjs'
import { canonicalCourses } from '../src/study/taxonomy/canonicalCourses.ts'

const hash = value => {
  let h = 2166136261
  for (const char of value) {
    h ^= char.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const bySubject = new Map()
for (const course of canonicalCourses) {
  const list = bySubject.get(course.subject) ?? []
  list.push(course)
  bySubject.set(course.subject, list)
}

const sample = []
const selected = new Set()

for (const [subject, items] of [...bySubject.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'))) {
  const pick = [...items].sort((a, b) => hash('mycorpus-quality-v1:'+a.id) - hash('mycorpus-quality-v1:'+b.id))[0]
  if (pick) {
    sample.push(pick)
    selected.add(pick.id)
  }
}

const remaining = canonicalCourses
  .filter(course => !selected.has(course.id))
  .sort((a, b) => hash('mycorpus-quality-v1-extra:'+a.id) - hash('mycorpus-quality-v1-extra:'+b.id))

for (const course of remaining) {
  if (sample.length >= 30) break
  sample.push(course)
  selected.add(course.id)
}

const placeholderPattern = /nouveau chapitre au programme canonique|rédaction complète.*programmée|contenu à venir|placeholder|lorem ipsum/i
const genericLeadPattern = /^(cette notion|ce chapitre|il est important|il est essentiel)\b/i

test('quality sample contains 30 canonical courses and covers every subject', () => {
  assert.equal(sample.length, 30)
  assert.equal(new Set(sample.map(course => course.subject)).size, bySubject.size)
  assert.equal(bySubject.size, 18)
})

test('30-course stratified sample meets publication-quality structural checks', () => {
  for (const canonical of sample) {
    const matches = courses.filter(course => course.id === canonical.id)
    assert.equal(matches.length, 1, `${canonical.id} resolves to exactly one Course`)
    const [course] = matches

    assert.equal(course.title, canonical.title, `${course.id}: canonical title preserved`)
    assert.equal(course.category, canonical.subject, `${course.id}: canonical subject preserved`)
    assert.ok(course.objectives.length >= 3 && course.objectives.length <= 6, `${course.id}: 3-6 objectives`)
    assert.ok(course.sections.length >= 5 && course.sections.length <= 8, `${course.id}: 5-8 sections`)
    assert.ok(Number.isFinite(course.minutes) && course.minutes > 0, `${course.id}: positive study duration`)
    assert.ok(course.trap?.trim(), `${course.id}: trap`)
    assert.ok(course.recall?.trim(), `${course.id}: active-recall prompt`)
    assert.ok(course.answer?.trim(), `${course.id}: recall answer (a precise name or formula may suffice)`)
    assert.ok(course.source?.startsWith('https://'), `${course.id}: primary source is HTTPS`)
    assert.ok((course.sources?.length ?? 0) >= 1, `${course.id}: at least one labelled source`)

    const sectionTexts = course.sections.map(section => section.text.trim())
    const findings = inspectCourse(course, questions.filter(q => q.course === course.id))
    assert.deepEqual(findings.filter(f => f.severity === 'error'), [], `${course.id}: publication errors`)
    assert.ok(new Set(sectionTexts).size === sectionTexts.length, `${course.id}: no duplicated section body`)

    const fullText = [
      ...course.objectives,
      ...course.sections.flatMap(section => [section.title, section.text, ...(section.bullets ?? [])]),
      course.trap,
      course.recall,
      course.answer
    ].join(' ')
    assert.doesNotMatch(fullText, placeholderPattern, `${course.id}: no placeholder language`)

    const genericLeads = course.sections.filter(section => genericLeadPattern.test(section.text.trim())).length
    assert.ok(genericLeads <= 2, `${course.id}: avoids repetitive generic section openings`)

    for (const source of course.sources ?? []) {
      assert.ok(source.label.trim().length >= 3, `${course.id}: source has a label`)
      const url = new URL(source.url)
      assert.equal(url.protocol, 'https:', `${course.id}: source uses HTTPS`)
    }

    const ownQuestions = questions.filter(question => question.course === course.id)
    assert.ok(ownQuestions.length >= 5, `${course.id}: at least five QCM`)
    assert.equal(new Set(ownQuestions.map(question => question.id)).size, ownQuestions.length, `${course.id}: unique QCM ids`)
    assert.equal(new Set(ownQuestions.map(question => question.prompt)).size, ownQuestions.length, `${course.id}: unique QCM prompts`)
    for (const question of ownQuestions.slice(0, 5)) {
      assert.ok(question.prompt.trim().length >= 12, `${course.id}: non-trivial QCM prompt`)
      assert.ok(question.options.length >= 2 && question.options.length <= 4, `${course.id}: QCM option count`)
      assert.ok(question.correct.length >= 1, `${course.id}: QCM has a correct answer`)
      assert.equal(question.why.length, question.options.length, `${course.id}: every option is explained`)
      assert.ok(question.why.every(text => text.trim().length >= 12), `${course.id}: explanations are substantive`)
    }
  }
})

test('quality sample is deterministic and visible in test output', () => {
  console.log('Quality sample (30 courses):')
  for (const course of sample) console.log(`- [${course.subject}] ${course.id} — ${course.title}`)
  assert.equal(sample.length, 30)
})

test('editorial scan covers all 305 courses, without a word-count publication target', () => {
  const report = editorialAudit(courses, questions)
  console.log('Editorial signals:', report.counts.signals)
  assert.equal(report.counts.courses, 305)
  for (const row of report.courses) assert.deepEqual(row.issues.filter(i => i.severity === 'error'), [], row.id)
})

test('editorial corrections preserve every canonical course and existing question identity', () => {
  const baseline=JSON.parse(readFileSync(new URL('./fixtures/catalog-identities.json',import.meta.url),'utf8'))
  assert.deepEqual(courses.map(c=>c.id).sort(),baseline.courses)
  assert.deepEqual(questions.map(q=>[q.id,q.course]).sort(),baseline.questions)
})

test('mathematical alternatives preserve signs and operators; placeholders remain blocking', () => {
 const original=courses[0]
 const q={id:'test',prompt:'Quelle opération ?',options:['a+b','a/b','−1','+1'],correct:[0],why:['Une somme.','Un quotient.','Une valeur négative.','Une valeur positive.']}
 assert.ok(!inspectCourse(original,[q,q,q,q,q]).some(i=>i.code==='duplicate-option'))
 assert.ok(inspectCourse({...original,sections:[{title:'Test',text:'Contenu à venir'}]},[]).some(i=>i.code==='placeholder'))
 assert.ok(inspectCourse(original,[{...q,why:['','','','']}]).some(i=>i.code==='empty-qcm'))
})
