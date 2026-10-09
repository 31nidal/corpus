import {readFileSync} from 'node:fs'
import {extractPdfPagesAndText} from '../server/pdfExtractor.mjs'
import {generateLocalDrafts,generateLocalNoteDrafts} from '../server/flashcards/generation.mjs'
import {qualityPdf} from '../tests/fixtures/local-generation-quality.mjs'
const pdf = process.argv[2] ? readFileSync(process.argv[2]) : qualityPdf()
const {totalText,pageCount} = extractPdfPagesAndText(pdf)
const result = {pdf:process.argv[2] || 'qualityPdf fixture',pageCount}
for (const [name,generate] of [['cards',generateLocalDrafts],['notes',generateLocalNoteDrafts]]) {
  const diagnostics = {}
  const drafts = generate({text:totalText,level:'complete',requestedCount:60,diagnostics})
  result[name] = {drafts:drafts.length,diagnostics,fronts:drafts.map(draft=>draft.front)}
}
console.log(JSON.stringify(result,null,2))
