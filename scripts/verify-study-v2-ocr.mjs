// Explicit live check only: one HTTP request, synthetic PDF, temporary account/DB.
// node --env-file-if-exists=.env scripts/verify-study-v2-ocr.mjs --live
import assert from 'node:assert/strict'
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {chromium} from '@playwright/test'
import {jsPDF} from 'jspdf'
import {initStudySchema} from '../server/study.mjs'
import {migrateStudyV2} from '../server/study/v2/schema.mjs'
import {DocumentPipeline, extractInWorker} from '../server/study/v2/pipeline.mjs'
import {GeminiPedagogy} from '../server/ai/pedagogy.mjs'

if (!process.argv.includes('--live')) throw new Error('Ajouter --live pour autoriser cet appel OCR réel.')
if (!process.env.GEMINI_API_KEY) throw new Error('Clé Gemini locale absente.')
const directory = mkdtempSync(join(tmpdir(), 'study-v2-live-ocr-'))
const reportPath = join(tmpdir(), 'study-v2-live-ocr-result.json')
const db = new DatabaseSync(':memory:')
const browser = await chromium.launch()
let pipeline, requests = 0
const report = {date: new Date().toISOString(), synthetic: true, requests: 0, checks: {}}
try {
  const page = await browser.newPage()
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200; canvas.height = 1500
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'black'; ctx.font = '32px sans-serif'
    const lines = [
      'Fiche synthétique de test OCR — aucune donnée patient',
      'Le rein filtre le plasma sanguin.',
      'Le débit de test vaut 5 mL/min, et non 50 mL/min.',
      'Tableau de transcription (valeurs fictives)',
      'Paramètre         Valeur         Unité',
      'Sodium            140            mmol/L',
      'Glucose           5              mmol/L',
      'Ne pas confondre mg/min et mg/mL.',
    ]
    lines.forEach((line, index) => ctx.fillText(line, 50, 100 + index * 65))
    return canvas.toDataURL('image/png')
  })
  const pdf = new jsPDF()
  pdf.text('Page native conservee sans reecriture par OCR.', 15, 25)
  pdf.text('Le rein filtre le plasma sanguin. Source selectable originale.', 15, 40)
  pdf.addPage(); pdf.addImage(image, 'PNG', 0, 0, 210, 262.5)
  const bytes = Buffer.from(pdf.output('arraybuffer'))
  const native = await extractInWorker(bytes)
  assert.ok(native.pages[0].text.includes('Page native conservee'))
  assert.equal(native.pages[1].text.trim(), '')
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('ocr-check');")
  initStudySchema(db); migrateStudyV2(db)
  const config = {...process.env, AI_MONTHLY_GENERATIONS: '1', AI_DAILY_BUDGET_USD: '.01'}
  const provider = new GeminiPedagogy(config, {fetchImpl: async (url, options) => {
    if (requests >= 1) throw new Error('Plafond OCR : un seul appel HTTP, aucune relance.')
    requests++
    const body = JSON.parse(options.body)
    body.generationConfig.maxOutputTokens = 2048
    return fetch(url, {...options, body: JSON.stringify(body)})
  }})
  pipeline = new DocumentPipeline({db, config, provider, getStorageDir: () => {
    const path = join(directory, 'uploads'); mkdirSync(path, {recursive: true}); return path
  }})
  const imported = pipeline.upload('ocr-check', bytes, {
    requestId: 'synthetic-ocr-one-request', filename: 'synthetic-ocr.pdf',
    title: 'Validation OCR synthétique', consentOcr: true,
  })
  await pipeline.drain()
  const job = pipeline.job('ocr-check', imported.job.id)
  const pages = db.prepare('SELECT page_number,text FROM study_pdf_pages WHERE document_id=? ORDER BY page_number').all(imported.document.id)
  report.job = job
  report.pages = pages
  report.usage = db.prepare('SELECT task,outcome,input_tokens,output_tokens,estimated_usd FROM ai_generation_usage').all()
  assert.equal(job.state, 'succeeded', job.errorMessage || job.errorCode)
  assert.equal(pages[0].text, native.pages[0].text)
  report.checks.nativePreserved = true
  const text = pages[1].text.replace(/\s+/g, ' ')
  for (const proof of ['5 mL/min', '50 mL/min', '140', 'Sodium', 'Glucose', 'mg/min', 'mg/mL']) assert.ok(text.includes(proof), `Valeur manquante : ${proof}`)
  assert.match(text, /non 50/)
  report.checks.unitsNegationAndValues = true
  assert.ok(pages[1].text.includes('|'), 'Colonnes du tableau non restituées')
  assert.match(pages[1].text, /Sodium\s*\|\s*140\s*\|\s*mmol\/L/)
  assert.match(pages[1].text, /Glucose\s*\|\s*5\s*\|\s*mmol\/L/)
  report.checks.tableSeparators = true
  assert.deepEqual(readFileSync(pipeline.file('ocr-check', imported.document.id)), bytes)
  report.checks.originalPreserved = true
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
  report.checks.foreignKeys = true
  report.success = true
} catch (error) {
  report.success = false
  report.error = {code: error.code || 'OCR_CHECK_FAILED', message: error.message}
  process.exitCode = 1
} finally {
  report.requests = requests
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  await pipeline?.close(); db.close(); await browser.close()
  rmSync(directory, {recursive: true, force: true})
  console.log(JSON.stringify({success: report.success, requests, checks: report.checks, error: report.error, reportPath}))
}
