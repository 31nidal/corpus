import { DatabaseSync } from 'node:sqlite'
import { createHash, randomInt, randomUUID } from 'node:crypto'
import { mkdirSync, existsSync, unlinkSync, writeFileSync, readFileSync, renameSync } from 'node:fs'
import path from 'node:path'
import { extractPdfPagesAndText, chunkIntoSections } from './pdfExtractor.mjs'
import { extractTypedStudyFacts } from './study/symbolic-facts.mjs'
import { buildSymbolicSummaryCategories, generateSymbolicStudyQuestions, POC_RELATIONS } from './study/symbolic-rules.mjs'

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

          if (hasRemoteProvider && provider.usesPaidQuota !== false) {
            reserveGenerationQuota(user.id, d)
            quotaReserved = true
          }

          // Build structured summary
          let summary = null
          if (hasRemoteProvider) {
            try {
              const providerSections = provider.contextMode === 'structured-facts'
                ? buildOllamaSummaryContext(sections)
                : { sections: sections.map(s => ({ id: s.id, title: s.title, content: s.content, pages: `${s.startPage}-${s.endPage}` })) }
              summary = await provider.generateStudySummary({
                documentTitle: doc.title,
                ...providerSections
              })
            } catch (err) {
              console.warn('Provider summary generation failed, falling back to local extractor:', err.message)
            }
          }

          if (summary && provider?.requiresFactGrounding) {
            summary = prepareGroundedStudySummary(summary, { documentTitle: doc.title, sections })
            if (!summary) console.warn('Ollama summary rejected by server validation; using local extractor.')
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

          const existingQuestions = d.prepare(`
            SELECT id, prompt, options_json as optionsJson, correct_json as correctJson,
              source_excerpt as sourceExcerpt, section_id as sourceSectionId
            FROM study_questions WHERE document_id = ? AND user_id = ?
          `).all(documentId, user.id).map(row => ({
            id: row.id,
            prompt: row.prompt,
            options: JSON.parse(row.optionsJson),
            correct: JSON.parse(row.correctJson),
            sourceExcerpt: row.sourceExcerpt,
            sourceSectionId: row.sourceSectionId
          }))

          const hasRemoteProvider = Boolean(provider && typeof provider.generateStudyQuestions === 'function')
          let quotaReserved = false

          if (hasRemoteProvider && provider.usesPaidQuota !== false) {
            reserveGenerationQuota(user.id, d)
            quotaReserved = true
          }

          let generatedQuestions = []
          if (hasRemoteProvider) {
            try {
              const providerContext = provider.contextMode === 'structured-facts'
                ? buildOllamaQuestionContext(doc.title, sections, count)
                : { sections: sections.map(s => ({ id: s.id, title: s.title, content: s.content, startPage: s.startPage, endPage: s.endPage })) }
              generatedQuestions = await provider.generateStudyQuestions({
                documentTitle: doc.title,
                count,
                ...providerContext
              })
            } catch (err) {
              console.warn('Provider QCM generation failed, falling back to local grounded generator:', err.message)
            }
          }

          if (provider?.requiresFactGrounding && Array.isArray(generatedQuestions)) {
            const sourceFacts = extractStudyFacts(sections)
            generatedQuestions = generatedQuestions
              .filter(question => isQuestionGroundedInFacts(question, sourceFacts))
              .map(question => {
                const correctIndex = question.correct[0]
                const correctAnswer = comparableStudyText(question.options[correctIndex])
                const sourceFact = sourceFacts.find(fact => fact.section.id === question.sourceSectionId &&
                  comparableStudyText(fact.evidence) === comparableStudyText(question.sourceExcerpt) &&
                  comparableStudyText(fact.answer) === correctAnswer)
                if (!sourceFact) return question
                const alternatives = relatedFacts(sourceFact, sourceFacts)
                return {
                  ...question,
                  why: question.options.map((option, index) => {
                    if (index === correctIndex) return factExplanation(sourceFact, true, sourceFact)
                    const optionFact = alternatives.find(fact => comparableStudyText(fact.answer) === comparableStudyText(option))
                    return optionFact
                      ? factExplanation(optionFact, false, sourceFact)
                      : 'Cette proposition ne correspond pas à la relation explicitement indiquée dans l’extrait source.'
                  })
                }
              })
          }

          if (!generatedQuestions || !Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
            if (quotaReserved) {
              releaseGenerationQuota(user.id, d)
              quotaReserved = false
            }
            // Strict local grounded generation
            generatedQuestions = generateLocalGroundedQuestions(doc, sections, count, replaceExisting ? [] : existingQuestions)
          }

          const validSectionIds = new Set(sections.map(section => section.id))
          const sectionsById = new Map(sections.map(section => [section.id, section]))
          const priorQuestionsForDeduplication = replaceExisting ? [] : existingQuestions
          const prepareUniqueQuestions = items => {
            const prepared = []
            const seen = [...priorQuestionsForDeduplication]
            for (const question of items.slice(0, count)) {
              const item = prepareStudyQuestion(question, { documentId, validSectionIds, sectionsById })
              if (!item || seen.some(previous => questionNearDuplicate(previous, item))) continue
              prepared.push(item)
              seen.push(item)
            }
            return prepared
          }
          let preparedQuestions = prepareUniqueQuestions(generatedQuestions)

          // If a configured provider returns no supported novel question, try local facts.
          if (!preparedQuestions.length && hasRemoteProvider && generatedQuestions.length) {
            if (quotaReserved) {
              releaseGenerationQuota(user.id, d)
              quotaReserved = false
            }
            generatedQuestions = generateLocalGroundedQuestions(doc, sections, count, priorQuestionsForDeduplication)
            preparedQuestions = prepareUniqueQuestions(generatedQuestions)
          }

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

function normalizeStudyText(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('fr-FR').replace(/\s+/g, ' ').trim()
}

function comparableStudyText(value) {
  return normalizeStudyText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function questionNearDuplicate(a, b) {
  const excerptA = comparableStudyText(a.sourceExcerpt)
  const excerptB = comparableStudyText(b.sourceExcerpt)
  if (excerptA && excerptA === excerptB) return true
  if (a.sourceSectionId && b.sourceSectionId && a.sourceSectionId !== b.sourceSectionId) return false
  if (comparableStudyText(a.prompt) === comparableStudyText(b.prompt)) return true
  if (comparableStudyText(a.options?.[a.correct?.[0]]) !== comparableStudyText(b.options?.[b.correct?.[0]])) return false
  const left = new Set(comparableStudyText(a.prompt).split(' ').filter(word => word.length > 2))
  const right = new Set(comparableStudyText(b.prompt).split(' ').filter(word => word.length > 2))
  if (!left.size || !right.size) return false
  return [...left].filter(word => right.has(word)).length / Math.min(left.size, right.size) >= 0.92
}

function prepareStudyQuestion(question, { documentId, validSectionIds, sectionsById }) {
  if (!question || typeof question !== 'object') return null

  const prompt = String(question.prompt || '').replace(/\s+/g, ' ').trim()
  const options = Array.isArray(question.options)
    ? question.options.map(option => String(option || '').replace(/\s+/g, ' ').trim())
    : []
  const correct = Array.isArray(question.correct)
    ? [...new Set(question.correct.filter(index => Number.isInteger(index)))]
    : []

  if (prompt.length < 20 || options.length < 3 || options.length > 5) return null
  if (options.some(option => option.length < 1)) return null
  if (new Set(options.map(comparableStudyText)).size !== options.length) return null
  if (correct.length !== 1 || correct.some(index => index < 0 || index >= options.length)) return null

  const sourceSection = sectionsById.get(question.sourceSectionId)
  if (!sourceSection || !validSectionIds.has(question.sourceSectionId)) return null
  const sourceExcerpt = String(question.sourceExcerpt || '').replace(/\s+/g, ' ').trim()
  const comparableSource = comparableStudyText(sourceSection.content)
  const comparableExcerpt = comparableStudyText(sourceExcerpt)
  if (comparableExcerpt.length < 35 || !comparableSource.includes(comparableExcerpt)) return null
  if (!comparableExcerpt.includes(comparableStudyText(options[correct[0]]))) return null

  const rawWhy = Array.isArray(question.why) ? question.why : []
  const why = options.map((_, index) => {
    const value = String(rawWhy[index] || '').replace(/\s+/g, ' ').trim()
    return value
  })
  if (why.some(value => value.length < 20)) return null

  const order = options.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  const sourceSectionId = sourceSection.id
  const startPage = sourceSection.startPage
  const endPage = sourceSection.endPage
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
    sourceExcerpt,
    difficulty: ['essentiel', 'application'].includes(question.difficulty) ? question.difficulty : 'essentiel',
    format: 'single'
  }
}

/**
 * High-quality grounded summary generator derived strictly from parsed section contents
 */
export function generateLocalSummary(title, sections) {
  const typedFacts = extractTypedStudyFacts(sections)
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

    const categories = buildSymbolicSummaryCategories(typedFacts.filter(fact => fact.sectionId === sec.id))
    if (keyPoints.length) categories.push({ id: 'essentials', label: 'Points essentiels', items: keyPoints })

    return {
      id: sec.id,
      title: sec.title,
      pages: `Pages ${sec.startPage}–${sec.endPage}`,
      keyPoints,
      ...(categories.length ? { categories } : {}),
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

const MEDICAL_ENTITY_PREFIX = String.raw`(?:le|la|les|l['’])?\s*(?:nerf|artère|artere|veine|vaisseau|muscle|os|ligament|tendon|organe|glande|articulation|vertèbre|vertebre|cavité|cavite|valve|canal|conduit|bronche|nerfs|artères|arteres|veines|vaisseaux|muscles|organes|glandes|articulations|vertèbres|vertebres|cavités|cavites|valves|canaux|conduits|bronches)\b`

function extractStudySentences(section) {
  const content = typeof section.content === 'string'
    ? section.content
    : (section.content?.text || section.text || '')
  return String(content).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 35 && sentence.length <= 360 &&
      !/^(figure|tableau|schéma|source|référence|bibliographie)\b/i.test(sentence))
}

function buildOllamaSummaryContext(sections) {
  const facts = extractStudyFacts(sections).slice(0, 28).map(fact => ({
    sectionId: fact.section.id,
    sectionTitle: fact.section.title,
    pages: `${fact.section.startPage}-${fact.section.endPage}`,
    kind: fact.kind,
    subject: fact.subject,
    relation: fact.relation,
    answer: fact.answer,
    evidence: fact.evidence
  }))
  const excerpts = []
  let budget = facts.length ? 0 : 4200
  for (const section of sections) {
    if (budget <= 0) break
    for (const text of extractStudySentences(section)) {
      if (budget <= 0) break
      const excerpt = text.slice(0, Math.min(360, budget))
      if (excerpt.length < 35) continue
      excerpts.push({ sectionId: section.id, text: excerpt })
      budget -= excerpt.length
      if (excerpts.length >= 14) break
    }
  }
  return {
    sections: sections.slice(0, 80).map(section => ({
      id: section.id,
      title: section.title,
      pages: `${section.startPage}-${section.endPage}`
    })),
    facts,
    excerpts
  }
}

function buildOllamaQuestionContext(documentTitle, sections, count) {
  const facts = extractStudyFacts(sections)
  const candidates = facts.flatMap(fact => {
    const alternatives = relatedFacts(fact, facts)
    const distractors = [...new Set(alternatives.map(candidate => comparableStudyText(candidate.answer)))]
      .map(key => alternatives.find(candidate => comparableStudyText(candidate.answer) === key)?.answer)
      .filter(Boolean)
      .filter(answer => comparableStudyText(answer) !== comparableStudyText(fact.answer))
      .slice(0, 3)
    if (distractors.length < 3) return []
    return [{
      sectionId: fact.section.id,
      sectionTitle: fact.section.title,
      pages: `${fact.section.startPage}-${fact.section.endPage}`,
      kind: fact.kind,
      subject: fact.subject,
      relation: fact.relation,
      answer: fact.answer,
      distractors,
      evidence: fact.evidence
    }]
  }).slice(0, Math.min(32, Math.max(6, count * 3)))
  return {
    facts: candidates,
    documentTitle,
    count,
    sections: sections.map(section => ({ id: section.id, title: section.title, pages: `${section.startPage}-${section.endPage}` }))
  }
}

function isQuestionGroundedInFacts(question, facts) {
  if (!question || !Array.isArray(question.options) || !Array.isArray(question.correct) || question.correct.length !== 1) return false
  const correctIndex = question.correct[0]
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= question.options.length) return false
  const correctAnswer = comparableStudyText(question.options[correctIndex])
  const excerpt = comparableStudyText(question.sourceExcerpt)
  const fact = facts.find(candidate => candidate.section.id === question.sourceSectionId &&
    comparableStudyText(candidate.evidence) === excerpt && comparableStudyText(candidate.answer) === correctAnswer)
  if (!fact) return false
  const allowed = new Set(relatedFacts(fact, facts).map(candidate => comparableStudyText(candidate.answer)))
  return question.options.every((option, index) => index === correctIndex || allowed.has(comparableStudyText(option)))
}

function prepareGroundedStudySummary(summary, { documentTitle, sections }) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null
  const overview = String(summary.overview || '').replace(/\s+/g, ' ').trim()
  if (overview.length < 20 || overview.length > 5000 || !Array.isArray(summary.chapters) || !summary.chapters.length) return null
  if (summary.chapters.length > sections.length) return null
  const sectionsById = new Map(sections.map(section => [section.id, section]))
  const seen = new Set()
  const chapters = []
  for (const chapter of summary.chapters) {
    if (!chapter || typeof chapter !== 'object' || typeof chapter.sectionId !== 'string') return null
    const source = sectionsById.get(chapter.sectionId)
    const title = String(chapter.title || '').trim()
    const text = String(chapter.summary || '').replace(/\s+/g, ' ').trim()
    const points = Array.isArray(chapter.keyPoints)
      ? chapter.keyPoints.map(point => String(point || '').replace(/\s+/g, ' ').trim())
      : []
    if (!source || seen.has(source.id) || !title || title.length > 180 || text.length < 20 || text.length > 1800 ||
        !points.length || points.length > 12 || points.some(point => point.length < 10 || point.length > 360)) return null
    seen.add(source.id)
    chapters.push({
      id: source.id,
      sourceSectionId: source.id,
      title,
      pages: `${source.startPage}-${source.endPage}`,
      summary: text,
      keyPoints: points
    })
  }
  return { title: documentTitle, overview, sectionCount: sections.length, chapters }
}

function trimEntity(value) {
  let result = String(value || '').replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '').trim()
  result = result.split(/\s+(?:qui|dont|tandis que|alors que|mais|ce qui|car|notamment|en revanche|par ailleurs|lorsque|quand)\b/i)[0]
  result = result.split(/[,;](?:\s|$)/)[0].trim()
  if (result.split(/\s+/).length > 10) result = result.split(/\s+/).slice(-8).join(' ')
  return result.replace(/[.!?]+$/g, '').trim()
}

function startsWithMedicalType(value, typePattern) {
  return new RegExp(`^(?:(?:le|la|les)\\s+|l['’])?(?:${typePattern})\\b`, 'i').test(String(value || '').trim())
}

function addStudyFact(facts, section, sentence, kind, subject, answer, relation) {
  const cleanSubject = trimEntity(subject)
  const cleanAnswer = trimEntity(answer)
  if (!cleanSubject || !cleanAnswer || cleanSubject.length < 3 || cleanAnswer.length < 3) return
  if (cleanSubject.split(/\s+/).length > 9 || cleanAnswer.split(/\s+/).length > 12) return
  if (/^(?:il|elle|ils|elles|ce|cela|ça|on|nous|vous)\b/i.test(cleanSubject)) return
  if (comparableStudyText(cleanSubject) === comparableStudyText(cleanAnswer)) return
  const signature = [kind, comparableStudyText(cleanSubject), comparableStudyText(cleanAnswer)].join('|')
  if (facts.some(fact => fact.signature === signature)) return
  facts.push({ signature, section, evidence: sentence, kind, subject: cleanSubject, answer: cleanAnswer, relation })
}

/** Extract only relations whose subject, predicate and answer can be quoted from the PDF. */
export function extractStudyFacts(sections) {
  const facts = []
  const prefix = MEDICAL_ENTITY_PREFIX
  for (const section of sections) {
    for (const sentence of extractStudySentences(section)) {
      let match

      // Active relations preserve the typed entity on the left (nerf/artère/vaisseau).
      match = sentence.match(new RegExp(`^(${prefix}[^,;.!?]{1,70}?)\\s+(innerve|vascularise|irrigue|draine|alimente)\\s+(.+)$`, 'i'))
      if (match) {
        const agent = trimEntity(match[1])
        const verb = match[2].toLocaleLowerCase('fr-FR')
        const patient = trimEntity(match[3])
        if (startsWithMedicalType(agent, 'nerf') && verb === 'innerve') addStudyFact(facts, section, sentence, 'innervation', patient, agent, 'est innervé par')
        if (startsWithMedicalType(agent, 'artère|artere|veine|vaisseau') && ['vascularise','irrigue','alimente'].includes(verb)) {
          addStudyFact(facts, section, sentence, 'vascularisation', patient, agent, 'est vascularisé par')
        }
        if (startsWithMedicalType(agent, 'veine|vaisseau') && verb === 'draine') addStudyFact(facts, section, sentence, 'drainage', patient, agent, 'est drainé par')
      }

      // Passive relations are common in anatomy descriptions.
      match = sentence.match(new RegExp(`^(.{2,90}?)\\s+(?:est|sont)\\s+innervé(?:e|es|s)?\\s+par\\s+(${prefix}[^,;.!?]{1,70})`, 'i'))
      if (match) addStudyFact(facts, section, sentence, 'innervation', match[1], match[2], 'est innervé par')

      match = sentence.match(new RegExp(`^(.{2,90}?)\\s+(?:est|sont)\\s+(?:vascularisé(?:e|es|s)?|irrigué(?:e|es|s)?)\\s+par\\s+(${prefix}[^,;.!?]{1,70})`, 'i'))
      if (match) addStudyFact(facts, section, sentence, 'vascularisation', match[1], match[2], 'est vascularisé par')

      match = sentence.match(/^(.{2,90}?)\s+(?:est|sont)\s+(?:situé(?:e|es|s)?|localisé(?:e|es|s)?|placé(?:e|es|s)?)\s+(dans|sur|sous|devant|derrière|entre|au niveau de|à proximité de)\s+(.+)$/i)
      if (match) addStudyFact(facts, section, sentence, 'localisation', match[1], `${match[2]} ${match[3]}`, 'se situe')

      match = sentence.match(/^(.{2,90}?)\s+(?:se situe|se trouve|prend naissance|débute|se termine|débouche|rejoint|traverse|chemine|passe)\s+(dans|sur|sous|devant|derrière|entre|au niveau de|à proximité de|à|vers|par|dans la|dans le|dans les)\s+(.+)$/i)
      if (match) addStudyFact(facts, section, sentence, 'trajet', match[1], `${match[2]} ${match[3]}`, 'suit le trajet')

      match = sentence.match(/^(.{2,90}?)\s+(permet|assure|participe à|contribue à|joue un rôle dans|a pour rôle de|sert à|est responsable de)\s+(.+)$/i)
      if (match) addStudyFact(facts, section, sentence, 'fonction', match[1], match[3], match[2])

      match = sentence.match(/^(.{2,90}?)\s+(entraîne|provoque|conduit à|aboutit à|augmente|diminue|réduit|favorise|déclenche)\s+(.+)$/i)
      if (match) addStudyFact(facts, section, sentence, 'conséquence', match[1], match[3], match[2])

      match = sentence.match(/^(.{2,90}?)\s+(?:comprend|contient|est composé(?:e)? de|est constitué(?:e)? de|est formé(?:e)? de)\s+(.+)$/i)
      if (match && /[,;]|\bet\b/i.test(match[2])) addStudyFact(facts, section, sentence, 'classification', match[1], match[2], 'comprend')

      match = sentence.match(/^(.{2,90}?)\s+(?:compte|comporte|mesure|est égal(?:e)? à|correspond à)\s+(\d+(?:[,.]\d+)?\s*(?:%|mmHg|mm|cm|mL|ml|L|l|Hz|h|jours?|semaines?|mois|ans?|vertèbres?|nerfs?|artères?|veines?|muscles?|couches?|parties?|segments?|valves?|branches?)?[^,;.!?]*)/i)
      if (match) addStudyFact(facts, section, sentence, 'valeur', match[1], match[2], 'a pour valeur')
    }
  }
  return facts
}

function entityAnswerType(value) {
  if (/\bmmhg\b/i.test(value)) return 'pression'
  if (/%/.test(value)) return 'pourcentage'
  if (/\b(?:mm|cm|mL|ml|l|L|Hz|h|jours?|semaines?|mois|ans?)\b/i.test(value)) return 'mesure'
  if (/\b(?:vertèbres?|nerfs?|artères?|arteres?|veines?|muscles?|couches?|parties?|segments?|valves?|branches?)\b/i.test(value)) return 'effectif'
  if (/\bnerf\b/i.test(value)) return 'nerf'
  if (/\b(?:artère|artere)\b/i.test(value)) return 'artère'
  if (/\bveine\b/i.test(value)) return 'veine'
  if (/\b(?:vaisseau|artère|artere|veine)\b/i.test(value)) return 'vaisseau'
  return null
}

function questionStemForFact(fact) {
  switch (fact.kind) {
    case 'innervation': return `Quel nerf le document associe-t-il à l’innervation de ${fact.subject} ?`
    case 'vascularisation': return `Quel vaisseau le document associe-t-il à la vascularisation de ${fact.subject} ?`
    case 'localisation': return `Où le document situe-t-il ${fact.subject} ?`
    case 'trajet': return `Quel trajet le document décrit-il pour ${fact.subject} ?`
    case 'fonction': return `Quel rôle le document attribue-t-il à ${fact.subject} ?`
    case 'conséquence': return `Quelle conséquence le document associe-t-il à ${fact.subject} ?`
    case 'classification': return `Quels éléments le document regroupe-t-il pour ${fact.subject} ?`
    case 'valeur': return `Quelle valeur le document indique-t-il pour ${fact.subject} ?`
    case 'drainage': return `Quel vaisseau le document associe-t-il au drainage de ${fact.subject} ?`
    default: return null
  }
}

function relatedFacts(fact, facts) {
  return facts.filter(candidate => candidate.kind === fact.kind && candidate.signature !== fact.signature &&
    (fact.kind !== 'innervation' && fact.kind !== 'vascularisation' && fact.kind !== 'drainage' && fact.kind !== 'valeur' ||
      entityAnswerType(candidate.answer) === entityAnswerType(fact.answer)))
}

function factExplanation(fact, isCorrect, targetFact) {
  if (isCorrect) return `Le passage indique que ${fact.subject} ${fact.relation} ${fact.answer}. Extrait : « ${fact.evidence} »`
  return `Le document associe « ${fact.answer} » à ${fact.subject} dans un autre passage. Pour ${targetFact.subject}, il indique : ${targetFact.relation} ${targetFact.answer}.`
}

/**
 * Conservative, fact-based local fallback. It emits a question only when the PDF itself
 * supplies one source relation and three distinct, same-category alternatives.
 */
export function generateLocalGroundedQuestions(doc, sections, count = 5, existingQuestions = []) {
  const symbolicQuestions = generateSymbolicStudyQuestions(doc, sections, count, existingQuestions)
  const remaining = Math.max(0, count - symbolicQuestions.length)
  if (!remaining) return symbolicQuestions
  const previous = [...existingQuestions, ...symbolicQuestions]
  const legacyFacts = extractStudyFacts(sections).filter(fact => !POC_RELATIONS.has(fact.kind))
  const legacyQuestions = generateLegacyGroundedQuestions(doc, sections, remaining, previous, legacyFacts)
  return [...symbolicQuestions, ...legacyQuestions].slice(0, Math.max(0, count))
}

function generateLegacyGroundedQuestions(doc, sections, count = 5, existingQuestions = [], facts = extractStudyFacts(sections)) {
  const candidates = []
  const emitted = new Set()

  for (const fact of facts) {
    const prompt = questionStemForFact(fact)
    if (!prompt) continue
    const distractorFacts = relatedFacts(fact, facts)
    const distinct = new Map()
    for (const alternative of distractorFacts) {
      const key = comparableStudyText(alternative.answer)
      if (key !== comparableStudyText(fact.answer) && !distinct.has(key)) distinct.set(key, alternative)
    }
    if (distinct.size < 3) continue

    const factKey = `${comparableStudyText(fact.evidence)}|${comparableStudyText(fact.answer)}`
    if (emitted.has(factKey)) continue
    emitted.add(factKey)

    const optionsWithFacts = [
      { text: fact.answer, fact, correct: true },
      ...[...distinct.values()].slice(0, 3).map(alternative => ({ text: alternative.answer, fact: alternative, correct: false }))
    ]
    const raw = {
      id: `local-${randomUUID()}`,
      course: `doc-${doc.id}`,
      topic: doc.title,
      prompt,
      options: optionsWithFacts.map(item => item.text),
      correct: [0],
      why: optionsWithFacts.map(item => factExplanation(item.fact, item.correct, fact)),
      difficulty: ['innervation','vascularisation','trajet','conséquence'].includes(fact.kind) ? 'application' : 'essentiel',
      format: 'single',
      documentId: doc.id,
      sourceSectionId: fact.section.id,
      sourceSectionTitle: fact.section.title,
      sourcePages: [fact.section.startPage, fact.section.endPage],
      sourceExcerpt: fact.evidence
    }
    const seen = [...existingQuestions, ...candidates]
    if (seen.some(question => questionNearDuplicate(question, raw))) continue
    candidates.push(raw)
  }

  // Keep source order for a stable learning progression; vary answer positions independently.
  const selected = candidates.slice(0, Math.max(0, count))
  for (let index = 0; index < selected.length; index++) {
    const question = selected[index]
    const rotation = randomInt(4)
    const order = [0, 1, 2, 3].map(offset => (offset + rotation) % 4)
    const sourceToDisplay = new Map(order.map((sourceIndex, displayIndex) => [sourceIndex, displayIndex]))
    const rawOptions = question.options
    const rawWhy = question.why
    const factCorrectIndex = sourceToDisplay.get(0)
    selected[index] = {
      ...question,
      options: order.map(sourceIndex => rawOptions[sourceIndex]),
      correct: [factCorrectIndex],
      why: order.map(sourceIndex => rawWhy[sourceIndex])
    }
  }
  return selected
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
