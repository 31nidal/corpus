import {TERMS_VERSION} from '../shared/legal.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {deflateSync} from 'node:zlib'
import {DatabaseSync} from 'node:sqlite'
import {createAccountHandler} from '../server/accounts.mjs'
import {createStudyHandler, initStudySchema, getOrResetStudyQuota} from '../server/study.mjs'
import {GeminiPedagogy} from '../server/ai/pedagogy.mjs'
import {generateWithQuota} from '../server/ai/generation.mjs'
import {aiError} from '../server/ai/gemini-client.mjs'

const TEXT = ['La glycolyse se déroule dans le cytoplasme de la cellule.', 'Le cycle de Krebs se déroule dans la matrice mitochondriale.', 'L insuline est une hormone hypoglycémiante sécrétée par le pancréas.', 'Le glucagon est une hormone hyperglycémiante sécrétée par le pancréas.']

// Fake Gemini client: answers from the fragments it receives, plus one invented item.
function fakeClient({fail} = {}) {
  const calls = []
  return {calls, model: 'gemini-test', async json({data, schema, onUsage}) {
    calls.push({data, schema})
    onUsage({attempts: 1, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, usageKnown: false})
    if (fail) throw fail
    onUsage({attempts: 0, inputTokens: 1000, outputTokens: 200, estimatedUsd: .0002, usageKnown: true})
    if (data.expectedPages) return {pages: Array.from({length: data.expectedPages}, (_, i) => ({pageNumber: i + 1, text: TEXT.join('\n'), uncertain: false}))}
    const f = data.fragments[0], sentence = f.content.match(/[^.\n]*cytoplasme[^.\n]*/)?.[0] || f.content.slice(0, 60)
    const invented = {sourceSectionId: f.sectionId, sourceExcerpt: 'La glycolyse produit 38 ATP dans le noyau.'}
    if (schema.properties.cards) return {cards: [
      {noteType: 'basic', fields: {front: 'Où se déroule la glycolyse ?', back: 'dans le cytoplasme'}, sourceSectionId: f.sectionId, sourceExcerpt: sentence},
      {noteType: 'basic', fields: {front: 'Combien d ATP ?', back: '38 ATP'}, ...invented},
    ]}
    if (schema.properties.points) return {points: [{sourceSectionId: f.sectionId, sourceExcerpt: sentence, category: 'Localisation'}, {...invented, category: 'Faux'}]}
    if (schema.properties.questions) return {questions: [
      {prompt: 'Dans quel compartiment se déroule la glycolyse ?', options: ['le cytoplasme', 'le noyau', 'la matrice mitochondriale'], correct: [0], sourceSectionId: f.sectionId, sourceExcerpt: sentence},
      {prompt: 'Combien d ATP produit la glycolyse dans le noyau ?', options: ['38 ATP', '2 ATP', '4 ATP'], correct: [0], ...invented},
    ]}
  }}
}

function makePdf(lines) {
  const raw = deflateSync(Buffer.from('BT /F1 12 Tf 72 712 Td ' + lines.map(l => `(${l}) Tj T*`).join(' ') + ' ET'))
  return Buffer.concat([Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${raw.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'), raw, Buffer.from('\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'latin1')])
}
const scannedPdf = () => Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 30 >>\nstream\nq 10 0 0 10 50 50 cm /Im1 Do Q\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'latin1')

function setup(provider, config = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-gemini-'))
  const cfg = {ACCOUNT_DATA_DIR: dir, ...config}
  const accounts = createAccountHandler(cfg), study = createStudyHandler(cfg, {provider})
  async function call(route, body, cookie = '', headers = {}) {
    const raw = Buffer.isBuffer(body) ? body : body === undefined ? null : Buffer.from(JSON.stringify(body))
    const req = Readable.from(raw ? [raw] : [])
    Object.assign(req, {url: route, method: body === undefined ? 'GET' : 'POST', socket: {remoteAddress: '127.0.0.1'},
      headers: {cookie, ...(raw ? {'content-type': Buffer.isBuffer(body) ? 'application/pdf' : 'application/json', 'x-mycorpus-request': '1'} : {}), ...headers}})
    let status = 200, out = '', h = {}
    const res = {setHeader(n, v) {h[n.toLowerCase()] = v}, writeHead(c, x) {status = c; for (const [k, v] of Object.entries(x || {})) h[k.toLowerCase()] = v}, end(v = '') {out += v}}
    await (route.startsWith('/api/account/') ? accounts : study)(req, res)
    const cookies = [h['set-cookie']].flat().filter(Boolean).map(v => v.split(';')[0])
    return {status, data: out ? JSON.parse(out) : null, cookie: cookies.find(v => v.startsWith('mycorpus_session='))}
  }
  return {dir, call, close: () => rmSync(dir, {recursive: true, force: true})}
}
async function register(api) {
  const r = await api.call('/api/account/register', {acceptTerms:true,termsVersion:TERMS_VERSION,email: `e${Math.random()}@fac.fr`, name: 'Test', password: 'mot-de-passe-securise-2026'})
  assert.equal(r.status, 201)
  return r.cookie
}
const quotaUsed = async (api, cookie) => (await api.call('/api/study/quotas', undefined, cookie)).data.quota

test('Pédagogie Gemini : seules les cartes citant verbatim le cours sont conservées', async () => {
  const client = fakeClient(), pedagogy = new GeminiPedagogy({}, {client})
  const cards = await pedagogy.generateFlashcards({sections: [{id: 's1', title: 'Métabolisme', content: TEXT.join('\n')}], requestedCount: 5, level: 'standard'})
  assert.equal(cards.length, 1)
  assert.match(cards[0].sourceExcerpt, /cytoplasme/)
  assert.equal(cards.generation.mode, 'gemini')
  assert.equal(cards.generation.rejected, 1)
  assert.equal(cards.generation.coverage.chunksAnalyzed, cards.generation.coverage.chunksTotal)
  // The source is passed as data only; the instruction warns about injection.
  assert.ok(client.calls[0].data.fragments.every(f => typeof f.content === 'string'))
})

test('Quota : réservé puis restitué sur échec Gemini, repli local, erreurs de quota propagées', async () => {
  const db = new DatabaseSync(':memory:')
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('u');")
  initStudySchema(db)
  const context = {sections: [{id: 's1', title: '', content: TEXT.join('\n')}], requestedCount: 3}
  const ok = await generateWithQuota({db, userId: 'u', provider: new GeminiPedagogy({}, {client: fakeClient()}), task: 'flashcards', context, local: () => ['local']})
  assert.equal(ok.generation.mode, 'gemini')
  assert.equal(getOrResetStudyQuota('u', db).generations_used, 1)
  ok.refund(); ok.refund()
  assert.equal(getOrResetStudyQuota('u', db).generations_used, 0, 'remboursement idempotent')

  const failing = new GeminiPedagogy({}, {client: fakeClient({fail: aiError('AI_UPSTREAM', 'Gemini indisponible')})})
  const fallback = await generateWithQuota({db, userId: 'u', provider: failing, task: 'flashcards', context, local: () => ['local']})
  assert.deepEqual(fallback.value, ['local'])
  assert.equal(fallback.generation.mode, 'local')
  assert.equal(fallback.generation.errorCode, 'AI_UPSTREAM')
  assert.equal(getOrResetStudyQuota('u', db).generations_used, 0)

  const limited = new GeminiPedagogy({}, {client: fakeClient({fail: aiError('AI_RATE_LIMIT', 'limite', 429)})})
  await assert.rejects(generateWithQuota({db, userId: 'u', provider: limited, task: 'flashcards', context, local: () => []}), {code: 'AI_RATE_LIMIT'})
  assert.equal(getOrResetStudyQuota('u', db).generations_used, 0)

  db.exec("UPDATE study_quotas SET generations_used=monthly_generations WHERE user_id='u'")
  await assert.rejects(generateWithQuota({db, userId: 'u', provider: new GeminiPedagogy({}, {client: fakeClient()}), task: 'flashcards', context, local: () => []}), {code: 'ERR_GENERATION_QUOTA_EXCEEDED'})

  db.exec("UPDATE study_quotas SET generations_used=0 WHERE user_id='u'")
  await assert.rejects(generateWithQuota({db, userId: 'u', provider: new GeminiPedagogy({}, {client: fakeClient()}), config: {AI_DAILY_REQUEST_LIMIT: 1}, task: 'flashcards', context, local: () => []}), {code: 'AI_DAILY_BUDGET'})
  db.close()
})

test('Study + Gemini : synthèse et QCM gardent le contrat historique, supports prévisualisés puis validés', async () => {
  const client = fakeClient(), api = setup(new GeminiPedagogy({}, {client}))
  try {
    const cookie = await register(api)
    const up = await api.call('/api/study/documents/upload', makePdf(TEXT), cookie, {'x-document-filename': 'bio.pdf', 'x-document-title': 'Bio'})
    assert.equal(up.status, 201)
    const id = up.data.document.id

    const summary = await api.call(`/api/study/documents/${id}/summarize`, {}, cookie)
    assert.equal(summary.status, 200)
    assert.ok(summary.data.summary.chapters.length >= 1)
    assert.ok(summary.data.summary.chapters.flatMap(c => c.keyPoints).every(p => !/38 ATP/.test(p)), 'point inventé écarté')
    assert.equal(summary.data.generation.mode, 'gemini')

    const qcm = await api.call(`/api/study/documents/${id}/questions`, {count: 5}, cookie)
    assert.equal(qcm.status, 201)
    assert.equal(qcm.data.questions.length, 1)
    assert.equal(qcm.data.questions[0].options[qcm.data.questions[0].correct[0]], 'le cytoplasme')
    const listed = await api.call(`/api/study/documents/${id}/questions`, undefined, cookie)
    assert.equal(listed.data.questions.length, 1)
    assert.equal((await quotaUsed(api, cookie)).generationsUsed, 2)

    const preview = await api.call(`/api/study/documents/${id}/supports`, {action: 'generate', task: 'questions', count: 3}, cookie)
    assert.equal(preview.status, 200)
    assert.equal(preview.data.persisted, false)
    const item = preview.data.items[0]
    const tampered = await api.call(`/api/study/documents/${id}/supports`, {action: 'save', previewId: preview.data.previewId, items: [{...item, options: ['le noyau', 'le cytosol', 'la membrane']}]}, cookie)
    assert.equal(tampered.status, 400, 'la bonne réponse doit rester attestée')
    const saved = await api.call(`/api/study/documents/${id}/supports`, {action: 'save', previewId: preview.data.previewId, items: [{...item, text: item.text + ' (relu)'}]}, cookie)
    assert.equal(saved.status, 200)
    assert.equal(saved.data.generation.edited, true)
    const again = await api.call(`/api/study/documents/${id}/supports`, {action: 'save', previewId: preview.data.previewId, items: [item]}, cookie)
    assert.deepEqual(again.data.questions.map(q => q.id), saved.data.questions.map(q => q.id), 'double validation idempotente')

    const other = await register(api)
    assert.equal((await api.call(`/api/study/documents/${id}/supports`, {action: 'save', previewId: preview.data.previewId, items: [item]}, other)).status, 404)
  } finally {api.close()}
})

test('Study + Gemini en panne : repli local et quota restitué', async () => {
  const api = setup(new GeminiPedagogy({}, {client: fakeClient({fail: aiError('AI_UPSTREAM', 'panne')})}))
  try {
    const cookie = await register(api)
    const up = await api.call('/api/study/documents/upload', makePdf(TEXT), cookie, {'x-document-filename': 'bio.pdf', 'x-document-title': 'Bio'})
    const r = await api.call(`/api/study/documents/${up.data.document.id}/questions`, {count: 3}, cookie)
    assert.ok([201, 422].includes(r.status), JSON.stringify(r.data))
    if (r.status === 201) assert.equal(r.data.generation.mode, 'local')
    assert.equal((await quotaUsed(api, cookie)).generationsUsed, 0)
  } finally {api.close()}
})

test('PDF scanné : OCR Gemini borné, sinon refus historique sans Gemini', async () => {
  const api = setup(new GeminiPedagogy({}, {client: fakeClient()}))
  try {
    const cookie = await register(api)
    const up = await api.call('/api/study/documents/upload', scannedPdf(), cookie, {'x-document-filename': 'scan.pdf', 'x-document-title': 'Scan'})
    assert.equal(up.status, 201, JSON.stringify(up.data))
    assert.equal(up.data.ocr.mode, 'gemini')
    assert.equal(up.data.document.pageCount, 1)
    assert.ok(up.data.document.sectionCount >= 1)
  } finally {api.close()}
  const local = setup(null)
  try {
    const cookie = await register(local)
    const up = await local.call('/api/study/documents/upload', scannedPdf(), cookie, {'x-document-filename': 'scan.pdf'})
    assert.equal(up.status, 422)
    assert.equal(up.data.scanned, true)
  } finally {local.close()}
})
