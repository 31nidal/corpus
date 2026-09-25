import { writeFileSync } from 'node:fs'
import { courses } from '../src/study/curriculum.ts'
import { questions } from '../src/study/questions.ts'
import { editorialAudit } from './course-editorial-quality.mjs'

// Usage: node --experimental-strip-types --experimental-loader=./scripts/ts-loader.mjs
// scripts/audit-editorial-catalog.mjs [report.json] [subject]
const [, , output, subject] = process.argv
const selected = subject ? courses.filter(c => c.category === subject) : courses
if (!selected.length) throw new Error(`Matière inconnue : ${subject}`)
const ids = new Set(selected.map(c => c.id))
const report = editorialAudit(selected, questions.filter(q => ids.has(q.course)))
if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({counts: report.counts, subjects: report.subjects}, null, 2))
if (report.counts.errors) process.exitCode = 1
