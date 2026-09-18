import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import { Readable } from 'node:stream'
import { createAccountHandler } from '../server/accounts.mjs'
import { createStudyHandler } from '../server/study.mjs'

function makePdf(textLines) {
  const streamContent = 'BT /F1 12 Tf 72 712 Td ' +
    textLines.map(l => `(${l.replace(/[()]/g, '')}) Tj T*`).join(' ') +
    ' ET'
  const deflated = deflateSync(Buffer.from(streamContent))
  const pdfParts = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n',
    '4 0 obj\n<< /Length ' + deflated.length + ' /Filter /FlateDecode >>\nstream\n'
  ]
  return Buffer.concat([
    Buffer.from(pdfParts.join(''), 'latin1'),
    deflated,
    Buffer.from('\nendstream\nendobj\nxref\n0 5\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'latin1')
  ])
}

function makeScannedPdf() {
  const streamContent = 'q 10 0 0 10 50 50 cm /Im1 Do Q' // Image only, no text
  const pdfParts = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n',
    '4 0 obj\n<< /Length ' + streamContent.length + ' >>\nstream\n' + streamContent + '\nendstream\nendobj\n',
    'xref\n0 5\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  ]
  return Buffer.from(pdfParts.join(''), 'latin1')
}

function setupTestApi(dataDir) {
  const config = { ACCOUNT_DATA_DIR: dataDir }
  const accountHandler = createAccountHandler(config)
  const studyHandler = createStudyHandler(config)

  async function call(route, body, cookie = '', headers = {}) {
    let raw = ''
    let reqHeaders = { cookie, ...headers }

    if (Buffer.isBuffer(body)) {
      raw = body
      reqHeaders['content-type'] = headers['content-type'] || 'application/pdf'
    } else if (body !== undefined) {
      raw = JSON.stringify(body)
      reqHeaders['content-type'] = 'application/json'
      reqHeaders['x-mycorpus-request'] = '1'
    }

    const req = Readable.from(raw ? [Buffer.isBuffer(raw) ? raw : Buffer.from(raw)] : [])
    req.url = route.startsWith('/api/') ? route : `/api/${route}`
    req.method = body === undefined ? 'GET' : (headers.method || 'POST')
    req.headers = reqHeaders
    req.socket = { remoteAddress: '127.0.0.1' }

    let status = 200
    let responseHeaders = {}
    let output = ''

    const res = {
      setHeader(name, value) { responseHeaders[name.toLowerCase()] = value },
      writeHead(code, nextHeaders) {
        status = code
        for (const [name, value] of Object.entries(nextHeaders || {})) {
          responseHeaders[name.toLowerCase()] = value
        }
      },
      end(value = '') {
        if (Buffer.isBuffer(value)) {
          output += value.toString('latin1')
        } else {
          output += value
        }
      }
    }

    if (req.url.startsWith('/api/account/')) {
      await accountHandler(req, res)
    } else if (req.url.startsWith('/api/study/')) {
      await studyHandler(req, res)
    } else {
      status = 404
    }

    const rawCookies = Array.isArray(responseHeaders['set-cookie'])
      ? responseHeaders['set-cookie']
      : (responseHeaders['set-cookie'] ? [responseHeaders['set-cookie']] : [])
    const cookies = rawCookies.map(value => value.split(';')[0])

    let data = null
    try {
      data = output ? JSON.parse(output) : null
    } catch {
      data = output
    }

    return {
      status,
      data,
      cookies,
      cookie: cookies.find(v => v.startsWith('mycorpus_session=')),
      headers: responseHeaders
    }
  }

  return { call }
}

test('Study API : inscription, upload PDF, extraction, structuration et quotas', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-study-test-'))
  const api = setupTestApi(dir)
  const pw = 'mot-de-passe-securise-2026'

  try {
    // 1. Create User
    const reg = await api.call('/api/account/register', {
      email: 'etudiant@fac.fr',
      name: 'Thomas',
      password: pw
    })
    assert.equal(reg.status, 201)
    const sessionCookie = reg.cookie

    // 2. Check Quotas
    const quotaRes = await api.call('/api/study/quotas', undefined, sessionCookie)
    assert.equal(quotaRes.status, 200)
    assert.equal(quotaRes.data.quota.documentsUsed, 0)
    assert.ok(quotaRes.data.quota.maxDocuments >= 20)

    // 3. Reject scanned PDF (No OCR)
    const scannedPdf = makeScannedPdf()
    const scannedRes = await api.call('/api/study/documents/upload', {
      title: 'Scanned PDF',
      filename: 'scan.pdf',
      data: scannedPdf.toString('base64')
    }, sessionCookie)
    assert.equal(scannedRes.status, 422)
    assert.equal(scannedRes.data.code, 'ERR_NO_EXTRACTABLE_TEXT')
    assert.ok(scannedRes.data.error.includes('scannés') || scannedRes.data.error.includes('OCR'))

    // 4. Upload valid course PDF
    const validPdf = makePdf([
      'Chapitre 1 : Physiologie respiratoire et mecanique ventilatoire.',
      'Le diaphragme est le muscle principal de la respiration chez l etre humain.',
      'Lors de la contraction du diaphragme, la pression intra-thoracique diminue.',
      'L oxygene diffuse ensuite des alveoles vers le sang capillaire pulmonaire.'
    ])

    const uploadRes = await api.call('/api/study/documents/upload', {
      title: 'Physiologie Respiratoire',
      filename: 'respiration.pdf',
      data: validPdf.toString('base64')
    }, sessionCookie)

    assert.equal(uploadRes.status, 201)
    const docId = uploadRes.data.document.id
    assert.ok(docId)
    assert.equal(uploadRes.data.document.title, 'Physiologie Respiratoire')
    assert.ok(uploadRes.data.document.sectionCount >= 1)

    // 5. List documents
    const listRes = await api.call('/api/study/documents', undefined, sessionCookie)
    assert.equal(listRes.status, 200)
    assert.equal(listRes.data.documents.length, 1)
    assert.equal(listRes.data.documents[0].id, docId)

    // 6. Get single document with sections
    const getRes = await api.call(`/api/study/documents/${docId}`, undefined, sessionCookie)
    assert.equal(getRes.status, 200)
    assert.equal(getRes.data.document.sections.length, uploadRes.data.document.sectionCount)
    assert.ok(getRes.data.document.sections[0].content.includes('diaphragme'))

    // 7. Generate structured summary
    const sumRes = await api.call(`/api/study/documents/${docId}/summarize`, {}, sessionCookie)
    assert.equal(sumRes.status, 200)
    assert.ok(sumRes.data.summary.chapters.length >= 1)
    assert.ok(sumRes.data.summary.chapters[0].keyPoints.length >= 1)

    // 8. Generate strictly grounded QCM questions
    const qcmRes = await api.call(`/api/study/documents/${docId}/questions`, { count: 3 }, sessionCookie)
    assert.equal(qcmRes.status, 201)
    assert.ok(qcmRes.data.questions.length >= 1)

    const q1 = qcmRes.data.questions[0]
    assert.ok(q1.prompt)
    assert.ok(Array.isArray(q1.options) && q1.options.length === 4)
    assert.ok(Array.isArray(q1.correct))
    assert.ok(q1.documentId === docId)
    assert.ok(q1.sourceSectionId)
    assert.ok(q1.sourceExcerpt)

    // 9. Fetch questions for document
    const qListRes = await api.call(`/api/study/documents/${docId}/questions`, undefined, sessionCookie)
    assert.equal(qListRes.status, 200)
    assert.equal(qListRes.data.questions.length, qcmRes.data.questions.length)

    // 10. Export to Anki
    const ankiRes = await api.call(`/api/study/documents/${docId}/anki`, undefined, sessionCookie)
    assert.equal(ankiRes.status, 200)
    assert.ok(typeof ankiRes.data === 'string')
    assert.ok(ankiRes.data.includes('#separator:Comma'))
    assert.ok(ankiRes.data.includes('#html:true'))
    assert.ok(ankiRes.data.includes('Passage source'))
    assert.ok(ankiRes.data.includes('diaphragme'))
    assert.ok(ankiRes.data.includes('mes_cours'))

    // 11. Test Security & Isolation between users
    const bobReg = await api.call('/api/account/register', {
      email: 'bob@fac.fr',
      name: 'Bob',
      password: pw
    })
    const bobCookie = bobReg.cookie

    // Bob cannot access Alice's document
    const bobGetAliceDoc = await api.call(`/api/study/documents/${docId}`, undefined, bobCookie)
    assert.equal(bobGetAliceDoc.status, 404)

    // Bob cannot see Alice's document in his list
    const bobList = await api.call('/api/study/documents', undefined, bobCookie)
    assert.equal(bobList.data.documents.length, 0)

    // Bob cannot delete Alice's document
    const bobDelete = await api.call(`/api/study/documents/${docId}`, {}, bobCookie, { method: 'DELETE' })
    assert.equal(bobDelete.status, 404)

    // Alice deletes her document
    const aliceDelete = await api.call(`/api/study/documents/${docId}`, {}, sessionCookie, { method: 'DELETE' })
    assert.equal(aliceDelete.status, 200)
    assert.equal(aliceDelete.data.ok, true)

    // Verify it is gone
    const afterDelete = await api.call(`/api/study/documents/${docId}`, undefined, sessionCookie)
    assert.equal(afterDelete.status, 404)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* cleanup */ }
  }
})

test('PDF Extractor : restitution des ligatures TeX, accents français et intégrité des titres de sections', async () => {
  const { extractPdfPagesAndText, chunkIntoSections } = await import('../server/pdfExtractor.mjs')
  const fs = await import('node:fs')

  const samplePath = '/Users/nidal/.gemini/antigravity/brain/267ee99c-9b2d-46cf-9100-0660216d1c76/.user_uploaded/media_1789562900775.pdf'
  if (fs.existsSync(samplePath)) {
    const buf = fs.readFileSync(samplePath)
    const { pages } = extractPdfPagesAndText(buf)
    assert.equal(pages.length, 3)

    const textAll = pages.map(p => p.text).join('\n')
    // Check accents and ligatures
    assert.ok(textAll.includes('Résolution de problèmes'), 'Résolution de problèmes doit être correctement reconstruit')
    assert.ok(textAll.includes('modifié par'), 'modifié par doit être correctement reconstruit')
    assert.ok(textAll.includes('arêtes'), 'arêtes doit être accentué')
    assert.ok(textAll.includes('connaît'), 'connaît doit être accentué avec î')
    assert.ok(textAll.includes('différente'), 'différente doit avoir la ligature ff')
    assert.ok(textAll.includes('suffisamment'), 'suffisamment doit avoir la ligature ffi')

    const sections = chunkIntoSections(pages)
    // Check reasonable section chunking (not 22 micro-fragments)
    assert.ok(sections.length >= 4 && sections.length <= 12, `Le document de 3 pages doit avoir entre 4 et 12 sections cohérentes, obtenu: ${sections.length}`)

    const titles = sections.map(s => s.title)
    // Check first letters are not stripped by Roman numeral regex
    assert.ok(titles.some(t => t.includes('Contexte')), 'Le titre Contexte ne doit pas perdre son C')
    assert.ok(titles.some(t => t.includes('Planning')), 'Le titre Planning doit être présent')
    assert.ok(titles.some(t => t.includes('Matériel')), 'Le titre Matériel ne doit pas perdre son M')
    assert.ok(titles.some(t => t.includes('Contraintes')), 'Le titre Contraintes ne doit pas perdre son C')
  }
})

