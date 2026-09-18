import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import { Readable } from 'node:stream'
import { DatabaseSync } from 'node:sqlite'
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

test('Système de quota IA : non atteint, atteint, reset mensuel, isolation et absence d’incrémentation sur échec', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-quota-test-'))
  const api = setupTestApi(dir)
  const pw = 'mot-de-passe-securise-2026'

  try {
    // 1. Inscription Utilisateur A (Alice)
    const regAlice = await api.call('/api/account/register', {
      email: 'alice.quota@fac.fr',
      name: 'Alice',
      password: pw
    })
    assert.equal(regAlice.status, 201)
    const aliceCookie = regAlice.cookie

    // 2. Vérification initialisation correcte de quota_resets_at
    const quotaInitRes = await api.call('/api/study/quotas', undefined, aliceCookie)
    assert.equal(quotaInitRes.status, 200)
    assert.equal(quotaInitRes.data.quota.generationsUsed, 0)
    assert.equal(quotaInitRes.data.quota.monthlyGenerations, 100)
    assert.ok(quotaInitRes.data.quota.quotaResetsAt, 'quotaResetsAt doit être initialisé')
    const resetDate = new Date(quotaInitRes.data.quota.quotaResetsAt)
    assert.ok(!isNaN(resetDate.getTime()))
    assert.ok(resetDate.getTime() > Date.now(), 'La date de reset doit être dans le futur')

    // Upload d'un cours pour Alice
    const pdfAlice = makePdf([
      'Chapitre : Neurologie et transmission synaptique.',
      'Le potentiel d action se propage le long de l axone jusqu au bouton synaptique.',
      'La liberation de neurotransmetteurs permet la communication entre les neurones.'
    ])
    const upAlice = await api.call('/api/study/documents/upload', {
      title: 'Neurophysiologie',
      filename: 'neuro.pdf',
      data: pdfAlice.toString('base64')
    }, aliceCookie)
    assert.equal(upAlice.status, 201)
    const docAliceId = upAlice.data.document.id

    // 3. Quota non atteint : synthèse puis QCM
    const sumAlice1 = await api.call(`/api/study/documents/${docAliceId}/summarize`, {}, aliceCookie)
    assert.equal(sumAlice1.status, 200)

    const qAlice1 = await api.call(`/api/study/documents/${docAliceId}/questions`, { count: 3 }, aliceCookie)
    assert.equal(qAlice1.status, 201)

    // Vérifier incrémentation normale (2 générations consommées)
    const quotaAfter2 = await api.call('/api/study/quotas', undefined, aliceCookie)
    assert.equal(quotaAfter2.data.quota.generationsUsed, 2)

    // 4. Aucune incrémentation incorrecte du quota en cas d'échec
    const failSum = await api.call('/api/study/documents/id-inexistant-xyz/summarize', {}, aliceCookie)
    assert.equal(failSum.status, 404)

    const failQcm = await api.call('/api/study/documents/id-inexistant-xyz/questions', { count: 3 }, aliceCookie)
    assert.equal(failQcm.status, 404)

    const quotaAfterFail = await api.call('/api/study/quotas', undefined, aliceCookie)
    assert.equal(quotaAfterFail.data.quota.generationsUsed, 2, 'Le quota ne doit pas augmenter après un échec')

    // 5. Quota atteint : blocage serveur à generations_used >= monthly_generations
    // On simule l'atteinte du quota pour Alice via la base SQLite
    const db = new DatabaseSync(path.join(dir, 'mycorpus.sqlite'))
    db.prepare('UPDATE study_quotas SET generations_used = 100 WHERE user_id = (SELECT id FROM users WHERE email = ?)').run('alice.quota@fac.fr')
    db.close()

    // Vérifier que /summarize est bloqué avec 403 et message explicite
    const blockedSum = await api.call(`/api/study/documents/${docAliceId}/summarize`, {}, aliceCookie)
    assert.equal(blockedSum.status, 403)
    assert.ok(blockedSum.data.error.includes('Quota mensuel de générations IA atteint'), 'Message explicite de quota attendu')
    assert.equal(blockedSum.data.code, 'ERR_GENERATION_QUOTA_EXCEEDED')

    // 6. Anti-contournement : vérifier que /questions est également bloqué
    const blockedQcm = await api.call(`/api/study/documents/${docAliceId}/questions`, { count: 2 }, aliceCookie)
    assert.equal(blockedQcm.status, 403)
    assert.ok(blockedQcm.data.error.includes('Quota mensuel de générations IA atteint'))
    assert.equal(blockedQcm.data.code, 'ERR_GENERATION_QUOTA_EXCEEDED')

    // 7. Isolation entre utilisateurs : Bob a son propre quota et n'est pas bloqué
    const regBob = await api.call('/api/account/register', {
      email: 'bob.quota@fac.fr',
      name: 'Bob',
      password: pw
    })
    const bobCookie = regBob.cookie

    const upBob = await api.call('/api/study/documents/upload', {
      title: 'Immunologie',
      filename: 'immuno.pdf',
      data: pdfAlice.toString('base64')
    }, bobCookie)
    const docBobId = upBob.data.document.id

    // Bob peut générer une synthèse sans être bloqué par Alice
    const sumBob = await api.call(`/api/study/documents/${docBobId}/summarize`, {}, bobCookie)
    assert.equal(sumBob.status, 200)

    const quotaBob = await api.call('/api/study/quotas', undefined, bobCookie)
    assert.equal(quotaBob.data.quota.generationsUsed, 1)

    // 8. Reset mensuel automatique et fiable
    // On place la date quota_resets_at d'Alice dans le passé
    const pastResetIso = new Date(Date.now() - 3600000).toISOString()
    const db2 = new DatabaseSync(path.join(dir, 'mycorpus.sqlite'))
    db2.prepare('UPDATE study_quotas SET quota_resets_at = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(pastResetIso, 'alice.quota@fac.fr')
    db2.close()

    // Consultation des quotas d'Alice : doit automatiquement reset à 0 et fixer une nouvelle date dans le futur
    const quotaResetRes = await api.call('/api/study/quotas', undefined, aliceCookie)
    assert.equal(quotaResetRes.status, 200)
    assert.equal(quotaResetRes.data.quota.generationsUsed, 0, 'generationsUsed doit être réinitialisé à 0')
    assert.ok(new Date(quotaResetRes.data.quota.quotaResetsAt).getTime() > Date.now(), 'La nouvelle date de reset doit être dans le futur')

    // Alice peut à nouveau générer sa synthèse
    const sumAliceReset = await api.call(`/api/study/documents/${docAliceId}/summarize`, {}, aliceCookie)
    assert.equal(sumAliceReset.status, 200)
    const quotaAliceFinal = await api.call('/api/study/quotas', undefined, aliceCookie)
    assert.equal(quotaAliceFinal.data.quota.generationsUsed, 1)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* cleanup */ }
  }
})


