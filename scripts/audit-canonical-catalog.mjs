import { canonicalCourses } from '../src/study/taxonomy/canonicalCourses.ts'
import { legacyHubs } from '../src/study/taxonomy/legacyHubs.ts'

try {
  const { courses } = await import('../src/study/curriculum.ts')
  const { questions } = await import('../src/study/questions.ts')
  const byId = new Map(courses.map(course => [course.id, course]))
  const hubIds = new Set(legacyHubs.map(hub => hub.id))
  const words = course => [
    ...course.objectives, course.trap, course.recall, course.answer,
    ...course.sections.flatMap(section => [section.title, section.text, ...(section.bullets ?? [])]),
    ...(course.glossary ?? []).flat(),
    ...(course.caseStudy ? [course.caseStudy.prompt, course.caseStudy.answer] : []),
    ...(course.learning ? [course.learning.formula.label, course.learning.formula.expression, course.learning.formula.explanation,
      ...course.learning.comparison.headers, ...course.learning.comparison.rows.flat(), course.learning.example.prompt,
      ...course.learning.example.steps, course.learning.example.result,
      ...course.learning.errors.flatMap(error => [error.title, error.detail])] : [])
  ].join(' ').trim().split(/\s+/).filter(Boolean).length
  const isComplete = course => course.objectives.length >= 3 && course.objectives.length <= 6
    && course.sections.length >= 5 && course.sections.length <= 8
    && words(course) >= 350 && Boolean(course.trap && course.recall && course.answer && course.source)
    && Boolean(course.sources?.length) && questions.filter(question => question.course === course.id).length >= 5
  const preservedComplete = []
  const toEnrich = []
  const toCreate = []
  for (const canonical of canonicalCourses) {
    if (hubIds.has(canonical.id)) continue
    const course = byId.get(canonical.id)
    if (!course) toCreate.push(canonical)
    else if (isComplete(course)) preservedComplete.push(canonical)
    else toEnrich.push({ canonical, course, words: words(course), questionCount: questions.filter(question => question.course === course.id).length })
  }
  const report = {
    counts: { canonical: canonicalCourses.length, legacyHubs: legacyHubs.length, catalogCourses: courses.length, preservedComplete: preservedComplete.length, toEnrich: toEnrich.length, toCreate: toCreate.length },
    preservedComplete: preservedComplete.map(course => course.id),
    toEnrich: toEnrich.map(({ canonical, words: wordCount, questionCount }) => ({ id: canonical.id, title: canonical.title, words: wordCount, questions: questionCount })),
    toCreate: toCreate.map(course => ({ id: course.id, subject: course.subject, module: course.module, title: course.title }))
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} finally {
  // Keep this CLI safe to invoke in restricted CI environments.
}
