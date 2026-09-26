import { DatabaseSync } from 'node:sqlite'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, existsSync, unlinkSync, writeFileSync, readFileSync, renameSync } from 'node:fs'
import path from 'node:path'
import { extractPdfPagesAndText, chunkIntoSections } from './pdfExtractor.mjs'

const digest = value => createHash('sha256').update(value).digest('hex')

export const MAX_STUDY_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 Mo (26 214 400 octets)

function cookieValue(req, name) {
  return req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1) || ''
}

export function initStudySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS study_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      page_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ready',
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS study_documents_user ON study_documents(user_id, created_at);

    CREATE TABLE IF NOT EXISTS study_sections (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES study_documents(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      section_order INTEGER NOT NULL,
      start_page INTEGER NOT NULL,
      end_page INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS study_sections_doc ON study_sections(document_id, section_order);

    CREATE TABLE IF NOT EXISTS study_summaries (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES study_documents(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      summary_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS study_summaries_doc ON study_summaries(document_id);

    CREATE TABLE IF NOT EXISTS study_questions (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES study_documents(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      section_id TEXT REFERENCES study_sections(id) ON DELETE SET NULL,
      start_page INTEGER,
      end_page INTEGER,
      prompt TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_json TEXT NOT NULL,
      why_json TEXT NOT NULL,
      source_excerpt TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'essentiel',
      format TEXT NOT NULL DEFAULT 'single',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS study_questions_doc ON study_questions(document_id);

    CREATE TABLE IF NOT EXISTS study_quotas (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      max_documents INTEGER NOT NULL DEFAULT 25,
      max_file_size_bytes INTEGER NOT NULL DEFAULT 26214400,
      monthly_generations INTEGER NOT NULL DEFAULT 100,
      generations_used INTEGER NOT NULL DEFAULT 0,
      quota_resets_at TEXT
    );
  `)
}

export function computeNextMonthlyReset(from = new Date()) {
  const date = new Date(from)
  date.setMonth(date.getMonth() + 1)
  return date.toISOString()
}

export function getOrResetStudyQuota(userId, d) {
  let quota = d.prepare('SELECT * FROM study_quotas WHERE user_id = ?').get(userId)
  const now = new Date()

  if (!quota) {
    const resetsAt = computeNextMonthlyReset(now)
    d.prepare(`
      INSERT INTO study_quotas(user_id, max_documents, max_file_size_bytes, monthly_generations, generations_used, quota_resets_at)
      VALUES(?, 25, 26214400, 100, 0, ?)
    `).run(userId, resetsAt)
    return d.prepare('SELECT * FROM study_quotas WHERE user_id = ?').get(userId)
  }

  if (quota.max_file_size_bytes > MAX_STUDY_FILE_SIZE_BYTES) {
    d.prepare('UPDATE study_quotas SET max_file_size_bytes=? WHERE user_id=?').run(MAX_STUDY_FILE_SIZE_BYTES, userId)
    quota.max_file_size_bytes = MAX_STUDY_FILE_SIZE_BYTES
  }
  // Si quota_resets_at est manquant, initialiser
  if (!quota.quota_resets_at) {
    const resetsAt = computeNextMonthlyReset(now)
    d.prepare('UPDATE study_quotas SET quota_resets_at = ? WHERE user_id = ?').run(resetsAt, userId)
    quota.quota_resets_at = resetsAt
  }

  // Vérifier si la date de renouvellement mensuel est échue
  const resetDate = new Date(quota.quota_resets_at)
  if (!isNaN(resetDate.getTime()) && now >= resetDate) {
    let nextReset = new Date(resetDate)
    while (nextReset <= now) {
      nextReset.setMonth(nextReset.getMonth() + 1)
    }
    const nextResetIso = nextReset.toISOString()
    d.prepare(`
      UPDATE study_quotas 
      SET generations_used = 0, quota_resets_at = ?
      WHERE user_id = ?
    `).run(nextResetIso, userId)
    quota.generations_used = 0
    quota.quota_resets_at = nextResetIso
  }

  return quota
}

export function checkGenerationQuota(userId, d) {
  const quota = getOrResetStudyQuota(userId, d)
  if (quota.generations_used >= quota.monthly_generations) {
    let resetDateFormatted = ''
    try {
      resetDateFormatted = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date(quota.quota_resets_at))
    } catch {
      resetDateFormatted = quota.quota_resets_at
    }
    const err = new Error(`Quota mensuel de générations IA atteint (${quota.generations_used}/${quota.monthly_generations}). Votre quota sera réinitialisé le ${resetDateFormatted}.`)
    err.status = 403
    err.code = 'ERR_GENERATION_QUOTA_EXCEEDED'
    throw err
  }
  return quota
}

export function reserveGenerationQuota(userId, d) {
  getOrResetStudyQuota(userId, d)
  const res = d.prepare(`
    UPDATE study_quotas
    SET generations_used = generations_used + 1
    WHERE user_id = ? AND generations_used < monthly_generations
  `).run(userId)

  if (res.changes === 0) {
    return checkGenerationQuota(userId, d)
  }

  return getOrResetStudyQuota(userId, d)
}

export function releaseGenerationQuota(userId, d) {
  d.prepare(`
    UPDATE study_quotas
    SET generations_used = MAX(0, generations_used - 1)
    WHERE user_id = ?
  `).run(userId)
}


export function createStudyHandler(config = process.env, dependencies = {}) {
  let db = dependencies.db
  const provider = dependencies.provider || null

  const getDb = () => {
    if (db) return db
    const directory = config.RAILWAY_VOLUME_MOUNT_PATH || config.ACCOUNT_DATA_DIR || path.resolve('.data')
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    db = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
    initStudySchema(db)
    return db
  }

  const getStorageDir = (userId) => {
    const rootDir = config.RAILWAY_VOLUME_MOUNT_PATH || config.ACCOUNT_DATA_DIR || path.resolve('.data')
    const userDir = path.join(rootDir, 'uploads', userId)
    mkdirSync(userDir, { recursive: true, mode: 0o700 })
    return userDir
  }

  const authenticate = (req, d) => {
    const token = cookieValue(req, 'mycorpus_session')
    if (!token) return null
    return d.prepare('SELECT u.id, u.email, u.name FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ? AND s.expires > ?')
      .get(digest(token), Date.now()) || null
  }

  const checkQuota = (userId, d, fileSize = 0) => {
    const quota = getOrResetStudyQuota(userId, d)

    const currentDocCount = d.prepare('SELECT COUNT(*) as count FROM study_documents WHERE user_id = ?').get(userId)?.count || 0
    if (currentDocCount >= quota.max_documents) {
      const err = new Error(`Quota atteint : vous avez atteint la limite de ${quota.max_documents} cours enregistrés.`)
      err.status = 403
      throw err
    }

    const maxAllowed = Math.min(quota.max_file_size_bytes || MAX_STUDY_FILE_SIZE_BYTES, MAX_STUDY_FILE_SIZE_BYTES)
    if (fileSize > maxAllowed) {
      const maxMb = Math.round(maxAllowed / (1024 * 1024))
      const err = new Error(`Fichier trop volumineux. La taille maximale autorisée est de ${maxMb} Mo.`)
      err.status = 413
      throw err
    }

    return quota
  }

  return async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      })
      res.end(JSON.stringify(body))
    }

    try {
      const d = getDb()

      const user = authenticate(req, d)
      if (!user) {
        return send(401, { error: 'Connexion requise pour accéder à MyCorpus Study.' })
      }

      const url = new URL(req.url, 'http://localhost')
      const subpath = url.pathname.replace('/api/study/', '').replace(/\/$/, '')
      const origin = (config.APP_ORIGIN || `${config.RAILWAY_ENVIRONMENT_ID ? 'https' : 'http'}://${req.headers.host || 'localhost:5173'}`).replace(/\/$/, '')
      const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
      if (mutating && (req.headers['x-mycorpus-request'] !== '1' || (req.headers.origin && req.headers.origin !== origin))) {
        return send(403, { error: 'Origine de la requête refusée.' })
      }

      // GET /api/study/quotas
      if (req.method === 'GET' && subpath === 'quotas') {
        const quota = getOrResetStudyQuota(user.id, d)
        const docCount = d.prepare('SELECT COUNT(*) as count FROM study_documents WHERE user_id = ?').get(user.id)?.count || 0
        return send(200, {
          quota: {
            maxDocuments: quota.max_documents,
            documentsUsed: docCount,
            maxFileSizeBytes: quota.max_file_size_bytes,
            monthlyGenerations: quota.monthly_generations,
            generationsUsed: quota.generations_used,
            quotaResetsAt: quota.quota_resets_at
          }
        })
      }

      // GET /api/study/documents
      if (req.method === 'GET' && subpath === 'documents') {
        const docs = d.prepare(`
          SELECT 
            d.id, d.title, d.filename, d.file_size as fileSize, d.page_count as pageCount, 
            d.status, d.error_message as errorMessage, d.created_at as createdAt, d.updated_at as updatedAt,
            (SELECT COUNT(*) FROM study_sections s WHERE s.document_id = d.id) as sectionCount,
            (SELECT COUNT(*) FROM study_questions q WHERE q.document_id = d.id) as questionCount,
            (SELECT COUNT(*) FROM study_summaries sm WHERE sm.document_id = d.id) as hasSummary
          FROM study_documents d
          WHERE d.user_id = ?
          ORDER BY d.created_at DESC
        `).all(user.id).map(row => ({
          ...row,
          hasSummary: Boolean(row.hasSummary)
        }))

        return send(200, { documents: docs })
      }

      // POST /api/study/documents/upload
      if (req.method === 'POST' && subpath === 'documents/upload') {
        const contentType = req.headers['content-type'] || ''
        if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
          return send(415, { error: 'Format non supporté. Envoyez directement le flux binaire application/pdf.' })
        }

        const chunks = []
        let totalLen = 0
        for await (const chunk of req) {
          totalLen += chunk.length
          if (totalLen > MAX_STUDY_FILE_SIZE_BYTES) {
            return send(413, { error: 'Fichier trop volumineux. La taille maximale autorisée est de 25 Mo.' })
          }
          chunks.push(chunk)
        }

        const pdfBuffer = Buffer.concat(chunks)
        if (!pdfBuffer.length) {
          return send(400, { error: 'Aucun fichier PDF fourni.' })
        }

        const filename = decodeURIComponent(req.headers['x-document-filename'] || 'cours.pdf').replace(/[^a-zA-Z0-9_\-.]/g, '_').slice(0, 150)
        let title = decodeURIComponent(req.headers['x-document-title'] || filename.replace(/\.pdf$/i, '')).trim().slice(0, 150)

        checkQuota(user.id, d, pdfBuffer.length)

        if (!title) title = 'Cours sans titre'

        // Step 2: Extract text and check for scanned PDF / extractable text
        let extracted
        try {
          extracted = extractPdfPagesAndText(pdfBuffer)
        } catch (err) {
          if (err.code === 'ERR_NO_EXTRACTABLE_TEXT') {
            return send(422, {
              error: err.message,
              code: 'ERR_NO_EXTRACTABLE_TEXT',
              scanned: true
            })
          }
          return send(400, { error: err.message || 'Impossible d’extraire le texte de ce document PDF.' })
        }

        const sections = chunkIntoSections(extracted.pages)
        const documentId = randomUUID()
        const now = new Date().toISOString()

        // Préparer les chemins — écriture dans un fichier temporaire d'abord
        const userDir  = getStorageDir(user.id)
        const filePath = path.join(userDir, `${documentId}.pdf`)
        const tmpPath  = filePath + '.tmp'

        // Étape 1 : écrire le PDF dans un fichier .tmp (avant la transaction)
        writeFileSync(tmpPath, pdfBuffer)

        // Étape 2 : enregistrer en base dans une transaction
        d.exec('BEGIN IMMEDIATE')
        try {
          d.prepare(`
            INSERT INTO study_documents(id, user_id, title, filename, file_size, page_count, status, created_at, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, 'ready', ?, ?)
          `).run(documentId, user.id, title, filename, pdfBuffer.length, extracted.pageCount, now, now)

          const insertSec = d.prepare(`
            INSERT INTO study_sections(id, document_id, user_id, title, section_order, start_page, end_page, content, token_count)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)

          for (let i = 0; i < sections.length; i++) {
            const sec = sections[i]
            insertSec.run(
              `${documentId}-sec-${i + 1}`,
              documentId,
              user.id,
              sec.title,
              i + 1,
              sec.startPage,
              sec.endPage,
              sec.content,
              sec.tokenCount
            )
          }

          d.exec('COMMIT')
        } catch (err) {
          d.exec('ROLLBACK')
          // Nettoyage du fichier temporaire si la DB a échoué
          try { unlinkSync(tmpPath) } catch { /* best effort */ }
          throw err
        }

        // Étape 3 : renommage atomique du .tmp vers le chemin final
        try {
          renameSync(tmpPath, filePath)
        } catch (renameErr) {
          // Annuler l'enregistrement en base si le fichier ne peut pas être finalisé
          try {
            d.exec('BEGIN IMMEDIATE')
            d.prepare('DELETE FROM study_sections WHERE document_id = ?').run(documentId)
            d.prepare('DELETE FROM study_documents WHERE id = ?').run(documentId)
            d.exec('COMMIT')
          } catch { /* best effort cleanup */ }
          try { unlinkSync(tmpPath) } catch { /* best effort */ }
          throw new Error('Impossible d\u2019enregistrer le fichier PDF sur le serveur.')
        }


        return send(201, {
          document: {
            id: documentId,
            title,
            filename,
            fileSize: pdfBuffer.length,
            pageCount: extracted.pageCount,
            sectionCount: sections.length,
            sections: sections.map((s, idx) => ({
              id: `${documentId}-sec-${idx + 1}`,
              title: s.title,
              startPage: s.startPage,
              endPage: s.endPage,
              tokenCount: s.tokenCount
            })),
            createdAt: now
          }
        })
      }

      // Match /documents/:id, /documents/:id/sections, /documents/:id/pdf, etc.
      const docMatch = subpath.match(/^documents\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/)
      if (docMatch) {
        const documentId = docMatch[1]
        const action = docMatch[2] || ''

        // Server-side ownership check: always filter by user_id
        const doc = d.prepare(`
          SELECT id, user_id, title, filename, file_size as fileSize, page_count as pageCount, 
                 status, error_message as errorMessage, created_at as createdAt, updated_at as updatedAt
          FROM study_documents
          WHERE id = ? AND user_id = ?
        `).get(documentId, user.id)

        if (!doc) {
          return send(404, { error: 'Document introuvable ou accès non autorisé.' })
        }

        // GET /documents/:id
        if (req.method === 'GET' && !action) {
          const sections = d.prepare(`
            SELECT id, title, section_order as sectionOrder, start_page as startPage, end_page as endPage, content, token_count as tokenCount
            FROM study_sections
            WHERE document_id = ? AND user_id = ?
            ORDER BY section_order ASC
          `).all(documentId, user.id)

          const summaryRow = d.prepare(`
            SELECT summary_json, created_at FROM study_summaries WHERE document_id = ? AND user_id = ?
          `).get(documentId, user.id)

          const questionCount = d.prepare(`
            SELECT COUNT(*) as count FROM study_questions WHERE document_id = ? AND user_id = ?
          `).get(documentId, user.id)?.count || 0

          return send(200, {
            document: {
              ...doc,
              sections,
              summary: summaryRow ? JSON.parse(summaryRow.summary_json) : null,
              summaryCreatedAt: summaryRow?.created_at || null,
              questionCount
            }
          })
        }

        // GET /documents/:id/pdf
        if (req.method === 'GET' && action === 'pdf') {
          const filePath = path.join(getStorageDir(user.id), `${documentId}.pdf`)
          if (!existsSync(filePath)) {
            return send(404, { error: 'Fichier PDF physique introuvable.' })
          }
          const data = readFileSync(filePath)
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': data.length,
            'Content-Disposition': `inline; filename="${doc.filename}"`,
            'Cache-Control': 'private, max-age=3600'
          })
          return res.end(data)
        }

        // DELETE /documents/:id
        if (req.method === 'DELETE' && !action) {
          d.exec('BEGIN IMMEDIATE')
          try {
            d.prepare('DELETE FROM study_questions WHERE document_id = ? AND user_id = ?').run(documentId, user.id)
            d.prepare('DELETE FROM study_summaries WHERE document_id = ? AND user_id = ?').run(documentId, user.id)
            d.prepare('DELETE FROM study_sections WHERE document_id = ? AND user_id = ?').run(documentId, user.id)
            d.prepare('DELETE FROM study_documents WHERE id = ? AND user_id = ?').run(documentId, user.id)
            d.exec('COMMIT')
          } catch (err) {
            d.exec('ROLLBACK')
            throw err
          }

          const filePath = path.join(getStorageDir(user.id), `${documentId}.pdf`)
          if (existsSync(filePath)) {
            try { unlinkSync(filePath) } catch { /* best effort */ }
          }

          return send(200, { ok: true, message: 'Document supprimé avec succès.' })
        }

        // POST /documents/:id/summarize
        if (req.method === 'POST' && action === 'summarize') {
          const sections = d.prepare(`
            SELECT id, title, section_order as sectionOrder, start_page as startPage, end_page as endPage, content
            FROM study_sections
            WHERE document_id = ? AND user_id = ?
            ORDER BY section_order ASC
          `).all(documentId, user.id)

          if (!sections.length) {
            return send(400, { error: 'Aucune section disponible pour ce document.' })
          }

          const hasRemoteProvider = Boolean(provider && typeof provider.generateStudySummary === 'function')
          let quotaReserved = false

          if (hasRemoteProvider) {
            reserveGenerationQuota(user.id, d)
            quotaReserved = true
          }

          // Build structured summary
          let summary = null
          if (hasRemoteProvider) {
            try {
              summary = await provider.generateStudySummary({
                documentTitle: doc.title,
                sections: sections.map(s => ({ id: s.id, title: s.title, content: s.content, pages: `${s.startPage}-${s.endPage}` }))
              })
            } catch (err) {
              console.warn('Provider summary generation failed, falling back to local extractor:', err.message)
            }
          }

          if (!summary) {
            if (quotaReserved) {
              releaseGenerationQuota(user.id, d)
              quotaReserved = false
            }
            // High-quality local structured summary strictly grounded in extracted sections
            summary = generateLocalSummary(doc.title, sections)
          }

          const summaryJson = JSON.stringify(summary)
          const now = new Date().toISOString()
          d.exec('BEGIN IMMEDIATE')
          try {
            // Supprimer l'ancienne synthèse avant d'insérer (garantit au plus 1 ligne par document/user)
            d.prepare('DELETE FROM study_summaries WHERE document_id = ? AND user_id = ?').run(documentId, user.id)
            d.prepare(`
              INSERT INTO study_summaries(id, document_id, user_id, summary_json, created_at)
              VALUES(?, ?, ?, ?, ?)
            `).run(randomUUID(), documentId, user.id, summaryJson, now)
            d.exec('COMMIT')
          } catch (err) {
            d.exec('ROLLBACK')
            if (quotaReserved) {
              releaseGenerationQuota(user.id, d)
              quotaReserved = false
            }
            throw err
          }

          return send(200, { summary, createdAt: now })
        }

        // POST /documents/:id/questions (Generate QCM)
        if (req.method === 'POST' && action === 'questions') {
          let count = 5
          let sectionId = null
          let replaceExisting = false
          try {
            let raw = ''
            for await (const chunk of req) raw += chunk
            if (raw) {
              const body = JSON.parse(raw)
              if (body.count && Number.isInteger(body.count)) count = Math.min(Math.max(body.count, 1), 20)
              if (body.sectionId) sectionId = String(body.sectionId)
              replaceExisting = body.replace === true
            }
          } catch { /* default count */ }

          const sections = d.prepare(`
            SELECT id, title, section_order as sectionOrder, start_page as startPage, end_page as endPage, content
            FROM study_sections
            WHERE document_id = ? AND user_id = ? ${sectionId ? 'AND id = ?' : ''}
            ORDER BY section_order ASC
          `).all(...(sectionId ? [documentId, user.id, sectionId] : [documentId, user.id]))

          if (!sections.length) {
            return send(400, { error: 'Aucune section trouvée pour générer des questions.' })
          }

          const hasRemoteProvider = Boolean(provider && typeof provider.generateStudyQuestions === 'function')
          let quotaReserved = false

          if (hasRemoteProvider) {
            reserveGenerationQuota(user.id, d)
            quotaReserved = true
          }

          let generatedQuestions = []
          if (hasRemoteProvider) {
            try {
              generatedQuestions = await provider.generateStudyQuestions({
                documentTitle: doc.title,
                count,
                sections: sections.map(s => ({ id: s.id, title: s.title, content: s.content, startPage: s.startPage, endPage: s.endPage }))
              })
            } catch (err) {
              console.warn('Provider QCM generation failed, falling back to local grounded generator:', err.message)
            }
          }

          if (!generatedQuestions || !Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
            if (quotaReserved) {
              releaseGenerationQuota(user.id, d)
              quotaReserved = false
            }
            // Strict local grounded generation
            generatedQuestions = generateLocalGroundedQuestions(doc, sections, count)
          }

          const validSectionIds = new Set(sections.map(section => section.id))
          const preparedQuestions = generatedQuestions
            .map((question, index) => prepareStudyQuestion(question, {
              documentId,
              fallbackSection: sections[index % sections.length],
              validSectionIds
            }))
            .filter(Boolean)

          if (!preparedQuestions.length) {
            if (quotaReserved) {
              releaseGenerationQuota(user.id, d)
              quotaReserved = false
            }
            return send(422, { error: 'Aucun QCM de qualité suffisante n’a pu être généré à partir de ce document.' })
          }

          const now = new Date().toISOString()
          d.exec('BEGIN IMMEDIATE')
          try {
            if (replaceExisting) {
              d.prepare('DELETE FROM study_questions WHERE document_id = ? AND user_id = ?').run(documentId, user.id)
            }

            const insertQ = d.prepare(`
              INSERT INTO study_questions(
                id, document_id, user_id, section_id, start_page, end_page, 
                prompt, options_json, correct_json, why_json, source_excerpt, difficulty, format, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)

            for (const q of preparedQuestions) {
              insertQ.run(
                q.id,
                documentId,
                user.id,
                q.sourceSectionId || sections[0].id,
                q.sourcePages?.[0] || sections[0].startPage,
                q.sourcePages?.[1] || sections[0].endPage,
                q.prompt,
                JSON.stringify(q.options),
                JSON.stringify(q.correct),
                JSON.stringify(q.why),
                q.sourceExcerpt || 'Extrait source du cours.',
                q.difficulty || 'essentiel',
                q.format || 'single',
                now
              )
            }
            d.exec('COMMIT')
          } catch (err) {
            d.exec('ROLLBACK')
            if (quotaReserved) {
              releaseGenerationQuota(user.id, d)
              quotaReserved = false
            }
            throw err
          }

          return send(201, {
            count: preparedQuestions.length,
            replaced: replaceExisting,
            questions: preparedQuestions
          })
        }

        // GET /documents/:id/questions
        if (req.method === 'GET' && action === 'questions') {
          const rows = d.prepare(`
            SELECT 
              q.id, q.document_id as documentId, q.section_id as sourceSectionId,
              q.start_page as startPage, q.end_page as endPage,
              q.prompt, q.options_json as optionsJson, q.correct_json as correctJson,
              q.why_json as whyJson, q.source_excerpt as sourceExcerpt,
              q.difficulty, q.format, q.created_at as createdAt,
              s.title as sectionTitle
            FROM study_questions q
            LEFT JOIN study_sections s ON s.id = q.section_id
            WHERE q.document_id = ? AND q.user_id = ?
            ORDER BY q.created_at ASC
          `).all(documentId, user.id)

          const questions = rows.map(r => ({
            id: r.id,
            course: `doc-${r.documentId}`,
            topic: doc.title,
            prompt: r.prompt,
            options: JSON.parse(r.optionsJson),
            correct: JSON.parse(r.correctJson),
            why: JSON.parse(r.whyJson),
            difficulty: r.difficulty,
            format: r.format,
            documentId: r.documentId,
            sourceSectionId: r.sourceSectionId,
            sourceSectionTitle: r.sectionTitle,
            sourcePages: r.startPage && r.endPage ? [r.startPage, r.endPage] : [doc.pageCount || 1],
            sourceExcerpt: r.sourceExcerpt,
            createdAt: r.createdAt
          }))

          return send(200, { questions })
        }

        // GET /documents/:id/anki
        if (req.method === 'GET' && action === 'anki') {
          const rows = d.prepare(`
            SELECT 
              q.id, q.prompt, q.options_json as optionsJson, q.correct_json as correctJson,
              q.why_json as whyJson, q.source_excerpt as sourceExcerpt,
              q.difficulty, q.start_page as startPage, q.end_page as endPage,
              s.title as sectionTitle
            FROM study_questions q
            LEFT JOIN study_sections s ON s.id = q.section_id
            WHERE q.document_id = ? AND q.user_id = ?
            ORDER BY q.created_at ASC
          `).all(documentId, user.id)

          const questions = rows.map(r => ({
            id: r.id,
            prompt: r.prompt,
            options: JSON.parse(r.optionsJson),
            correct: JSON.parse(r.correctJson),
            why: JSON.parse(r.whyJson),
            difficulty: r.difficulty,
            sourceExcerpt: r.sourceExcerpt,
            sourcePages: r.startPage && r.endPage ? [r.startPage, r.endPage] : [doc.pageCount || 1],
            sourceSectionTitle: r.sectionTitle
          }))

          const csvContent = formatAnkiCsv(doc.title, doc.filename, questions)
          const cleanSlug = doc.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_')
          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="mycorpus-${cleanSlug}.csv"`,
            'Cache-Control': 'no-store'
          })
          return res.end(csvContent)
        }
      }

      return send(404, { error: 'Route MyCorpus Study inconnue.' })
    } catch (error) {
      console.error('Study API error:', error)
      return send(error.status || 500, {
        error: error.message || 'Erreur interne du service d’études.',
        ...(error.code ? { code: error.code } : {})
      })
    }
  }
}

function prepareStudyQuestion(question, { documentId, fallbackSection, validSectionIds }) {
  if (!question || typeof question !== 'object') return null

  const prompt = String(question.prompt || '').replace(/\s+/g, ' ').trim()
  const options = Array.isArray(question.options)
    ? question.options.map(option => String(option || '').replace(/\s+/g, ' ').trim())
    : []
  const correct = Array.isArray(question.correct)
    ? [...new Set(question.correct.filter(index => Number.isInteger(index)))]
    : []

  if (prompt.length < 12 || options.length < 2 || options.length > 6) return null
  if (options.some(option => option.length < 1)) return null
  if (new Set(options.map(option => option.toLocaleLowerCase('fr-FR'))).size !== options.length) return null
  if (!correct.length || correct.some(index => index < 0 || index >= options.length)) return null

  const rawWhy = Array.isArray(question.why) ? question.why : []
  const why = options.map((_, index) => {
    const value = String(rawWhy[index] || '').replace(/\s+/g, ' ').trim()
    return value || (correct.includes(index)
      ? 'Cette proposition correspond au passage source du cours.'
      : 'Cette proposition ne correspond pas au passage source du cours.')
  })

  const order = options.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  const sourceSectionId = validSectionIds.has(question.sourceSectionId)
    ? question.sourceSectionId
    : fallbackSection.id
  const sourcePages = Array.isArray(question.sourcePages) ? question.sourcePages : []
  const startPage = Number.isInteger(sourcePages[0]) ? sourcePages[0] : fallbackSection.startPage
  const endPage = Number.isInteger(sourcePages[1]) ? sourcePages[1] : fallbackSection.endPage
  const shuffledCorrect = order
    .map((originalIndex, newIndex) => correct.includes(originalIndex) ? newIndex : -1)
    .filter(index => index >= 0)

  return {
    ...question,
    id: `q-${randomUUID()}`,
    course: `doc-${documentId}`,
    documentId,
    prompt,
    options: order.map(index => options[index]),
    correct: shuffledCorrect,
    why: order.map(index => why[index]),
    sourceSectionId,
    sourcePages: [startPage, endPage],
    sourceExcerpt: String(question.sourceExcerpt || '').replace(/\s+/g, ' ').trim() || 'Passage source du cours.',
    difficulty: ['essentiel', 'application'].includes(question.difficulty) ? question.difficulty : 'essentiel',
    format: question.format === 'multiple' ? 'multiple' : 'single'
  }
}

/**
 * High-quality grounded summary generator derived strictly from parsed section contents
 */
export function generateLocalSummary(title, sections) {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim()
  const stopLead = /^(figure|tableau|schéma|source|référence|bibliographie|objectif|introduction|conclusion)\b/i

  const scoreSentence = (sentence, sectionTitle) => {
    const value = normalize(sentence)
    if (value.length < 35 || value.length > 280 || stopLead.test(value)) return -Infinity

    let score = 0
    if (value.length >= 70 && value.length <= 190) score += 3
    if (/\d/.test(value)) score += 1
    if (/\b(est|sont|permet|assure|comprend|contient|constitue|présente|se compose|se divise|innerve|vascularise|relie|traverse|forme|participe|fonctionne)\b/i.test(value)) score += 2
    if (/\b(artère|veine|nerf|muscle|os|ligament|organe|structure|cellule|récepteur|cavité|cortex|moelle|tronc|branche|fonction|mécanisme|pression|débit|innervation|vascularisation)\b/i.test(value)) score += 2
    if (sectionTitle && value.toLowerCase().includes(String(sectionTitle).toLowerCase().split(/\s+/)[0] || '')) score += 1
    if (/^(ce|cette|cela|il|elle|ils|elles)\b/i.test(value)) score -= 1
    return score
  }

  const chapters = sections.map(sec => {
    const sentences = normalize(sec.content)
      .split(/(?<=[.!?])\s+/)
      .map(normalize)
      .filter(Boolean)

    const ranked = sentences
      .map((sentence, index) => ({ sentence, index, score: scoreSentence(sentence, sec.title) }))
      .filter(item => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score || a.index - b.index)

    const selected = []
    const seen = new Set()
    for (const item of ranked) {
      const key = item.sentence
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]+/g, '')
        .split(/\s+/)
        .slice(0, 10)
        .join(' ')
      if (!key || seen.has(key)) continue
      seen.add(key)
      selected.push(item)
      if (selected.length >= 5) break
    }

    selected.sort((a, b) => a.index - b.index)

    const keyPoints = selected.map(item => item.sentence)
    if (keyPoints.length === 0) {
      const fallback = normalize(sec.content).slice(0, 220)
      keyPoints.push(fallback || `Section couvrant les pages ${sec.startPage} à ${sec.endPage}.`)
    }

    return {
      id: sec.id,
      title: sec.title,
      pages: `Pages ${sec.startPage}–${sec.endPage}`,
      keyPoints,
      excerpt: keyPoints.slice(0, 2).join(' ')
    }
  })

  const overviewPoints = chapters
    .filter(chapter => chapter.keyPoints?.length)
    .slice(0, 3)
    .map(chapter => chapter.keyPoints[0])

  return {
    title,
    overview: overviewPoints.join(' ') || `Synthèse structurée de « ${title} » à partir de ${sections.length} section(s).`,
    sectionCount: sections.length,
    chapters
  }
}

const LOCAL_QCM_STOPWORDS = new Set([
  'alors','ainsi','apres','après','avant','avec','avoir','cette','comme','dans','depuis','donc','elle','elles',
  'entre','etre','être','fait','font','leurs','mais','meme','même','moins','plus','pour','sans','selon','sont',
  'sous','sur','tous','tout','toute','toutes','vers','dont','afin','chez','celui','celle','ceux','celles',
  'peut','peuvent','permet','permettent','notamment','également','partir','niveau','cours','page',
  'section','structure','structures','correspond','correspondent','présente','présentent','comprend','comprennent'
])

function extractGroundedSentences(section) {
  return String(section.content || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence =>
      sentence.length >= 45 &&
      sentence.length <= 240 &&
      !/^(figure|tableau|schéma|source|référence|bibliographie)\b/i.test(sentence)
    )
}

function candidateTerms(sentence) {
  const matches = sentence.match(/[A-Za-zÀ-ÖØ-öø-ÿŒœ'-]{5,}/g) || []
  return [...new Set(matches)]
    .filter(word => !LOCAL_QCM_STOPWORDS.has(word.toLowerCase()))
    .filter(word => !/^\d+$/.test(word))
    .sort((a, b) => b.length - a.length)
}

/**
 * Strict source-grounded local fallback.
 * It avoids inventing medically false statements: each question is an exact cloze from the
 * uploaded course, and every distractor is a term that appears elsewhere in the same document.
 */
export function generateLocalGroundedQuestions(doc, sections, count = 5) {
  const sectionPool = sections
    .map(section => ({ ...section, sentences: extractGroundedSentences(section) }))
    .filter(section => section.sentences.length > 0)

  if (sectionPool.length === 0) return []

  const globalTerms = []
  for (const section of sectionPool) {
    for (const sentence of section.sentences) {
      for (const term of candidateTerms(sentence)) {
        if (!globalTerms.some(existing => existing.toLowerCase() === term.toLowerCase())) {
          globalTerms.push(term)
        }
      }
    }
  }

  const questions = []
  let cursor = 0

  while (questions.length < count && cursor < count * 8) {
    const section = sectionPool[cursor % sectionPool.length]
    const sentence = section.sentences[Math.floor(cursor / sectionPool.length) % section.sentences.length]
    const terms = candidateTerms(sentence)
    const target = terms[(cursor + questions.length) % Math.max(terms.length, 1)]
    cursor += 1

    if (!target) continue

    const distractors = globalTerms
      .filter(term => term.toLowerCase() !== target.toLowerCase())
      .filter(term => !sentence.toLowerCase().includes(term.toLowerCase()))
      .sort((a, b) => Math.abs(a.length - target.length) - Math.abs(b.length - target.length))
      .slice(0, 3)

    if (distractors.length < 3) continue

    const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const cloze = sentence.replace(new RegExp(`\\b${escapedTarget}\\b`, 'i'), '_____')
    if (cloze === sentence) continue

    const correctPos = (questions.length * 3 + 1) % 4
    const options = []
    let distractorIndex = 0
    for (let pos = 0; pos < 4; pos++) {
      options.push(pos === correctPos ? target : distractors[distractorIndex++])
    }

    const why = options.map((option, index) =>
      index === correctPos
        ? `Exact : le passage source emploie le terme « ${target} ».`
        : `Le terme attendu dans le passage source est « ${target} ».`
    )

    questions.push({
      id: `study-${doc.id.slice(0, 8)}-${questions.length + 1}`,
      course: `doc-${doc.id}`,
      topic: doc.title,
      prompt: `Complétez exactement l’énoncé du cours (section « ${section.title} ») : « ${cloze} »`,
      options,
      correct: [correctPos],
      why,
      difficulty: sentence.length > 150 ? 'application' : 'essentiel',
      format: 'single',
      documentId: doc.id,
      sourceSectionId: section.id,
      sourceSectionTitle: section.title,
      sourcePages: [section.startPage, section.endPage],
      sourceExcerpt: sentence
    })
  }

  return questions
}

export function formatAnkiCsv(title, filename, questions) {
  const warning = 'Contenu pédagogique généré à partir de votre cours — ne remplace pas les supports officiels de votre faculté.'
  const html = val => String(val || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('\n', '<br>')
  const csv = val => `"${String(val || '').replaceAll('"', '""')}"`
  const tagSlug = val => String(val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'cours'
  const generated = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date())

  const rows = [
    [
      `À propos de cet export MyCorpus Study — ${html(title)}`,
      `<b>Document source :</b> ${html(filename)}<br><b>Généré le :</b> ${html(generated)}<br><br>${html(warning)}`,
      'mycorpus_study information',
      `mycorpus-doc-info-${tagSlug(title)}`
    ],
    ...questions.map(q => {
      const answers = q.correct.map(idx => `${String.fromCharCode(65 + idx)}. ${html(q.options[idx] || '')}`).join('<br>')
      const explanations = q.options.map((opt, idx) => `<b>${String.fromCharCode(65 + idx)}. ${html(opt)}</b> — ${html(q.why[idx] || '')}`).join('<br>')
      const sourceMeta = q.sourcePages ? `<br><br><b>Passage source (p. ${q.sourcePages.join('–')}) :</b><br><i>« ${html(q.sourceExcerpt || '')} »</i>` : ''
      const verso = `<b>Bonne${q.correct.length > 1 ? 's' : ''} réponse${q.correct.length > 1 ? 's' : ''}</b><br>${answers}<br><br><b>Explication</b><br>${explanations}${sourceMeta}`
      const tags = [tagSlug(title), 'mes_cours', q.difficulty === 'application' ? 'niveau_2' : 'niveau_1', 'mycorpus']
      return [html(q.prompt), verso, [...new Set(tags)].join(' '), q.id]
    })
  ]

  const directives = ['#separator:Comma', '#html:true', '#columns:Recto,Verso,Tags,NotionId', '#tags column:3']
  return '\uFEFF' + [...directives, ...rows.map(row => row.map(csv).join(','))].join('\r\n') + '\r\n'
}
