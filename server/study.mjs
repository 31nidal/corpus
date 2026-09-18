import { DatabaseSync } from 'node:sqlite'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, existsSync, unlinkSync, writeFileSync, readFileSync, renameSync } from 'node:fs'
import path from 'node:path'
import { extractPdfPagesAndText, chunkIntoSections } from './pdfExtractor.mjs'

const digest = value => createHash('sha256').update(value).digest('hex')

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
      max_file_size_bytes INTEGER NOT NULL DEFAULT 30000000,
      monthly_generations INTEGER NOT NULL DEFAULT 100,
      generations_used INTEGER NOT NULL DEFAULT 0,
      quota_resets_at TEXT
    );
  `)
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
    let quota = d.prepare('SELECT * FROM study_quotas WHERE user_id = ?').get(userId)
    if (!quota) {
      d.prepare('INSERT INTO study_quotas(user_id) VALUES(?)').run(userId)
      quota = d.prepare('SELECT * FROM study_quotas WHERE user_id = ?').get(userId)
    }

    const currentDocCount = d.prepare('SELECT COUNT(*) as count FROM study_documents WHERE user_id = ?').get(userId)?.count || 0
    if (currentDocCount >= quota.max_documents) {
      const err = new Error(`Quota atteint : vous avez atteint la limite de ${quota.max_documents} cours enregistrés.`)
      err.status = 403
      throw err
    }

    if (fileSize > quota.max_file_size_bytes) {
      const maxMb = Math.round(quota.max_file_size_bytes / (1024 * 1024))
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

      // GET /api/study/quotas
      if (req.method === 'GET' && subpath === 'quotas') {
        const quota = d.prepare('SELECT * FROM study_quotas WHERE user_id = ?').get(user.id) || {
          max_documents: 25,
          max_file_size_bytes: 30000000,
          monthly_generations: 100,
          generations_used: 0
        }
        const docCount = d.prepare('SELECT COUNT(*) as count FROM study_documents WHERE user_id = ?').get(user.id)?.count || 0
        return send(200, {
          quota: {
            maxDocuments: quota.max_documents,
            documentsUsed: docCount,
            maxFileSizeBytes: quota.max_file_size_bytes,
            monthlyGenerations: quota.monthly_generations,
            generationsUsed: quota.generations_used
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
        let pdfBuffer = null
        let title = ''
        let filename = 'cours.pdf'

        if (contentType.includes('application/json')) {
          let raw = ''
          for await (const chunk of req) {
            raw += chunk
            if (raw.length > 35 * 1024 * 1024) return send(413, { error: 'Fichier trop volumineux (max 25 Mo).' })
          }
          let body
          try {
            body = JSON.parse(raw)
          } catch {
            return send(400, { error: 'Requête JSON invalide.' })
          }
          if (!body.data) return send(400, { error: 'Aucun fichier PDF fourni.' })
          pdfBuffer = Buffer.from(body.data, 'base64')
          filename = String(body.filename || 'cours.pdf').replace(/[^a-zA-Z0-9_\-.]/g, '_').slice(0, 150)
          title = String(body.title || filename.replace(/\.pdf$/i, '')).trim().slice(0, 150)
        } else {
          // Direct PDF binary stream
          const chunks = []
          let totalLen = 0
          for await (const chunk of req) {
            totalLen += chunk.length
            if (totalLen > 30 * 1024 * 1024) return send(413, { error: 'Fichier trop volumineux (max 25 Mo).' })
            chunks.push(chunk)
          }
          pdfBuffer = Buffer.concat(chunks)
          filename = decodeURIComponent(req.headers['x-document-filename'] || 'cours.pdf').replace(/[^a-zA-Z0-9_\-.]/g, '_').slice(0, 150)
          title = decodeURIComponent(req.headers['x-document-title'] || filename.replace(/\.pdf$/i, '')).trim().slice(0, 150)
        }

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

          // Build structured summary
          let summary
          if (provider && typeof provider.generateStudySummary === 'function') {
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
            // High-quality local structured summary strictly grounded in extracted sections
            summary = generateLocalSummary(doc.title, sections)
          }

          const summaryJson = JSON.stringify(summary)
          const now = new Date().toISOString()
          // Supprimer l'ancienne synthèse avant d'insérer (garantit au plus 1 ligne par document/user)
          d.prepare('DELETE FROM study_summaries WHERE document_id = ? AND user_id = ?').run(documentId, user.id)
          d.prepare(`
            INSERT INTO study_summaries(id, document_id, user_id, summary_json, created_at)
            VALUES(?, ?, ?, ?, ?)
          `).run(randomUUID(), documentId, user.id, summaryJson, now)

          // Track quota generation
          d.prepare('UPDATE study_quotas SET generations_used = generations_used + 1 WHERE user_id = ?').run(user.id)

          return send(200, { summary, createdAt: now })
        }

        // POST /documents/:id/questions (Generate QCM)
        if (req.method === 'POST' && action === 'questions') {
          let count = 5
          let sectionId = null
          try {
            let raw = ''
            for await (const chunk of req) raw += chunk
            if (raw) {
              const body = JSON.parse(raw)
              if (body.count && Number.isInteger(body.count)) count = Math.min(Math.max(body.count, 1), 20)
              if (body.sectionId) sectionId = String(body.sectionId)
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

          let generatedQuestions = []
          if (provider && typeof provider.generateStudyQuestions === 'function') {
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

          if (!generatedQuestions || generatedQuestions.length === 0) {
            // Strict local grounded generation
            generatedQuestions = generateLocalGroundedQuestions(doc, sections, count)
          }

          const now = new Date().toISOString()
          d.exec('BEGIN IMMEDIATE')
          try {
            const insertQ = d.prepare(`
              INSERT INTO study_questions(
                id, document_id, user_id, section_id, start_page, end_page, 
                prompt, options_json, correct_json, why_json, source_excerpt, difficulty, format, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)

            for (const q of generatedQuestions) {
              insertQ.run(
                q.id || `q-${randomUUID()}`,
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
            throw err
          }

          d.prepare('UPDATE study_quotas SET generations_used = generations_used + 1 WHERE user_id = ?').run(user.id)

          return send(201, {
            count: generatedQuestions.length,
            questions: generatedQuestions
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
      return send(error.status || 500, { error: error.message || 'Erreur interne du service d’études.' })
    }
  }
}

/**
 * High-quality grounded summary generator derived strictly from parsed section contents
 */
export function generateLocalSummary(title, sections) {
  const chapters = sections.map(sec => {
    // Extract key sentences and normalize whitespace
    const sentences = sec.content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(s => s.length >= 25 && s.length <= 250 && !/^(figure|tableau|schéma)\b/i.test(s))

    const keyPoints = sentences.slice(0, Math.min(4, Math.max(2, sentences.length)))
    if (keyPoints.length === 0) {
      if (sec.content && sec.content.length > 20) {
        keyPoints.push(sec.content.replace(/\s+/g, ' ').slice(0, 180))
      } else {
        keyPoints.push(`Section couvrant les pages ${sec.startPage} à ${sec.endPage}.`)
      }
    }

    return {
      id: sec.id,
      title: sec.title,
      pages: `Pages ${sec.startPage}–${sec.endPage}`,
      keyPoints,
      excerpt: sentences.slice(0, 2).join(' ') || sec.content.replace(/\s+/g, ' ').slice(0, 200)
    }
  })

  return {
    title,
    overview: `Fiche de synthèse structurée établie à partir des ${sections.length} sections du document « ${title} ». Les points clés sont strictement extraits du texte source.`,
    sectionCount: sections.length,
    chapters
  }
}

const MEDICAL_INVERSIONS = [
  [/\bgauche\b/gi, 'droite'],
  [/\bdroite\b/gi, 'gauche'],
  [/\bantérieur(s)?\b/gi, 'postérieur$1'],
  [/\bantérieure(s)?\b/gi, 'postérieure$1'],
  [/\bpostérieur(s)?\b/gi, 'antérieur$1'],
  [/\bpostérieure(s)?\b/gi, 'antérieure$1'],
  [/\bsupérieur(s)?\b/gi, 'inférieur$1'],
  [/\bsupérieure(s)?\b/gi, 'inférieure$1'],
  [/\binférieur(s)?\b/gi, 'supérieur$1'],
  [/\binférieure(s)?\b/gi, 'supérieure$1'],
  [/\bmédial(e)?(s)?\b/gi, 'latéral$1$2'],
  [/\blatéral(e)?(s)?\b/gi, 'médial$1$2'],
  [/\bproximal(e)?(s)?\b/gi, 'distal$1$2'],
  [/\bdistal(e)?(s)?\b/gi, 'proximal$1$2'],
  [/\baugmente(nt)?\b/gi, 'diminue$1'],
  [/\bdiminue(nt)?\b/gi, 'augmente$1'],
  [/\bartériel(le)?(s)?\b/gi, 'veineux$1$2'],
  [/\bveineux(se)?(s)?\b/gi, 'artériel$1$2'],
  [/\bactive(ment)?\b/gi, 'passive$1'],
  [/\bpassive(ment)?\b/gi, 'active$1'],
  [/\bafférent(e)?(s)?\b/gi, 'efférent$1$2'],
  [/\befférent(e)?(s)?\b/gi, 'afférent$1$2'],
  [/\bstimule(nt)?\b/gi, 'inhibe$1'],
  [/\binhibe(nt)?\b/gi, 'stimule$1'],
  [/\bcentral(e)?(s)?\b/gi, 'périphérique$1$2'],
  [/\bpériphérique(s)?\b/gi, 'central$1'],
  [/\bexterne(s)?\b/gi, 'interne$1'],
  [/\binterne(s)?\b/gi, 'externe$1'],
  [/\bpermet(tent)?\b/gi, 'empêche$1'],
  [/\best\b/gi, 'n’est pas'],
  [/\bsont\b/gi, 'ne sont pas']
]

function createMedicalDistractor(sentence, seed = 0) {
  for (let i = 0; i < MEDICAL_INVERSIONS.length; i++) {
    const [pattern, repl] = MEDICAL_INVERSIONS[(i + seed) % MEDICAL_INVERSIONS.length]
    if (pattern.test(sentence)) {
      return sentence.replace(pattern, repl).trim()
    }
  }
  // Fallback negation
  if (/^Le |^La |^Les |^L’|^L'/i.test(sentence)) {
    return sentence.replace(/^(Le|La|Les|L’|L')\s+/i, '$1 ') + ' n’est pas observé dans cette situation.'
  }
  return 'L’inverse est décrit pour cette structure dans le cours.'
}

/**
 * Strict source-grounded QCM generator
 * Never generates answers from outside the uploaded document.
 */
export function generateLocalGroundedQuestions(doc, sections, count = 5) {
  const result = []
  let questionIdx = 1

  const candidateSections = sections.filter(s => s.content && s.content.length > 40)
  if (candidateSections.length === 0) return []

  const promptsTemplates = [
    (title) => `D’après la section « ${title} », quelle proposition est conforme au texte du cours ?`,
    (title) => `Concernant les données exposées dans « ${title} », quelle affirmation est exacte ?`,
    (title) => `À propos des repères décrits dans « ${title} », quelle proposition est juste ?`,
    (title) => `Quelle proposition est validée par les éléments de la section « ${title} » ?`
  ]

  for (let i = 0; i < count; i++) {
    const sec = candidateSections[i % candidateSections.length]
    const rawSentences = sec.content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length >= 25 && s.length <= 220 && !/^(figure|tableau|schéma)\b/i.test(s))

    if (rawSentences.length === 0) {
      rawSentences.push(sec.content.slice(0, 150))
    }

    const coreSentence = rawSentences[i % rawSentences.length] || rawSentences[0]
    const cleanTrue = coreSentence.endsWith('.') ? coreSentence.slice(0, -1) : coreSentence

    // Generate 3 plausible distractors from the course content
    const distractors = []
    
    // Distractor 1: Medical inversion of the core statement
    const d1 = createMedicalDistractor(cleanTrue, i)
    distractors.push(d1 !== cleanTrue ? d1 : `Cette structure n’intervient pas dans ce mécanisme.`)

    // Distractor 2: Inversion of another sentence if available, or inverted landmark
    const otherSentence = rawSentences[(i + 1) % rawSentences.length]
    if (otherSentence && otherSentence !== coreSentence) {
      const d2 = createMedicalDistractor(otherSentence.endsWith('.') ? otherSentence.slice(0, -1) : otherSentence, i + 3)
      distractors.push(d2)
    } else {
      distractors.push(`L’orientation anatomique opposée est indiquée à la page ${sec.startPage}.`)
    }

    // Distractor 3: Inverted physiological direction or contrast
    const thirdSentence = rawSentences[(i + 2) % rawSentences.length]
    if (thirdSentence && thirdSentence !== coreSentence) {
      const d3 = createMedicalDistractor(thirdSentence.endsWith('.') ? thirdSentence.slice(0, -1) : thirdSentence, i + 7)
      distractors.push(d3)
    } else {
      distractors.push(`Cette fonction est attribuée à un autre organe dans cette même section.`)
    }

    // Ensure 3 unique distractors that don't match cleanTrue
    const finalDistractors = distractors
      .filter(d => d !== cleanTrue)
      .slice(0, 3)

    while (finalDistractors.length < 3) {
      finalDistractors.push(`Cette modalité est inversée par rapport aux données du cours (page ${sec.startPage}).`)
    }

    // Randomize position of correct answer (0, 1, 2, or 3)
    const correctPos = (i * 2 + 1) % 4
    const options = []
    const why = []
    let distractorIdx = 0

    for (let pos = 0; pos < 4; pos++) {
      if (pos === correctPos) {
        options.push(cleanTrue)
        why.push(`Exact. Conforme au texte de la page ${sec.startPage} : « ${cleanTrue} ».`)
      } else {
        const distText = finalDistractors[distractorIdx++]
        options.push(distText)
        why.push(`Non conforme : contredit le passage source de la page ${sec.startPage}.`)
      }
    }

    const qId = `study-${doc.id.slice(0, 8)}-${questionIdx++}`
    const promptBuilder = promptsTemplates[i % promptsTemplates.length]

    result.push({
      id: qId,
      course: `doc-${doc.id}`,
      topic: doc.title,
      prompt: promptBuilder(sec.title),
      options,
      correct: [correctPos],
      why,
      difficulty: i % 2 === 0 ? 'essentiel' : 'application',
      format: 'single',
      documentId: doc.id,
      sourceSectionId: sec.id,
      sourceSectionTitle: sec.title,
      sourcePages: [sec.startPage, sec.endPage],
      sourceExcerpt: cleanTrue
    })
  }

  return result
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

