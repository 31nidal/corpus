import {DatabaseSync} from 'node:sqlite'
import {createHash, randomUUID} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
import {initFlashcardSchema} from './schema.mjs'
import {migrateFlashcards} from './migrations.mjs'
import {FlashcardRepository} from './repository.mjs'
import {cleanText, ratings, validateCard, validateDeck, validateNote} from './validation.mjs'
import {defaultFsrsScheduler} from './fsrsScheduler.mjs'
import {deriveCardsFromNote} from './derivation.mjs'
import {generateLocalDrafts, generateLocalNoteDrafts, sanitizeGeneratedDrafts, sanitizeGeneratedNoteDrafts, normalize} from './generation.mjs'
import {buildFlashcardAnki} from './anki.mjs'
import {initStudySchema, releaseGenerationQuota, reserveGenerationQuota} from '../study.mjs'

const digest = value => createHash('sha256').update(value).digest('hex')
const cookieValue = (req, name) => req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || ''
async function readJson(req, maximum = 250000) {
  let raw = ''
  for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > maximum) throw Object.assign(new Error('Requête trop volumineuse.'), {status: 413}) }
  try { return raw ? JSON.parse(raw) : {} } catch { throw Object.assign(new Error('Requête JSON invalide.'), {status: 400}) }
}
const decodeCursor = value => { try { const parsed = JSON.parse(Buffer.from(value, 'base64url').toString()); return parsed?.updatedAt && parsed?.id ? parsed : null } catch { return null } }

export function createFlashcardHandler(config = process.env, dependencies = {}) {
  let db = dependencies.db
  const provider = dependencies.provider || null
  const scheduler = dependencies.scheduler || defaultFsrsScheduler
  const getDb = () => {
    if (db) return db
    const directory = config.RAILWAY_VOLUME_MOUNT_PATH || config.ACCOUNT_DATA_DIR || path.resolve('.data')
    mkdirSync(directory, {recursive: true, mode: 0o700})
    db = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
    initStudySchema(db); initFlashcardSchema(db); migrateFlashcards(db, scheduler)
    new FlashcardRepository(db).purgeExpiredGenerationReceipts()
    return db
  }
  return async (req, res) => {
    const send = (status, body, type = 'application/json; charset=utf-8') => { res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store'}); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body) }
    try {
      const d = getDb(), token = cookieValue(req, 'mycorpus_session')
      const user = token && d.prepare('SELECT u.id,u.email,u.name FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(digest(token), Date.now())
      if (!user) return send(401, {error: 'Connexion requise pour utiliser les flashcards.'})
      const origin = (config.APP_ORIGIN || `${config.RAILWAY_ENVIRONMENT_ID ? 'https' : 'http'}://${req.headers.host || 'localhost:5173'}`).replace(/\/$/, '')
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && (req.headers['x-mycorpus-request'] !== '1' || (req.headers.origin && req.headers.origin !== origin))) return send(403, {error: 'Origine de la requête refusée.'})
      const url = new URL(req.url, 'http://localhost'), subpath = url.pathname.replace('/api/flashcards/', '').replace(/\/$/, ''), repo = new FlashcardRepository(d)

      if (req.method === 'GET' && subpath === 'decks') return send(200, {decks: repo.listDecks(user.id)})
      if (req.method === 'POST' && subpath === 'decks') {
        const value = validateDeck(await readJson(req)); if (!value) return send(400, {error: 'Deck invalide.'})
        return send(201, {deck: repo.createDeck(user.id, value)})
      }
      const deckMatch = subpath.match(/^decks\/([^/]+)$/)
      if (deckMatch && req.method === 'PATCH') {
        const value = validateDeck(await readJson(req), true); if (!value) return send(400, {error: 'Deck invalide.'})
        const deck = repo.updateDeck(user.id, deckMatch[1], value); return deck ? send(200, {deck}) : send(404, {error: 'Deck introuvable.'})
      }
      if (deckMatch && req.method === 'DELETE') {
        const body = await readJson(req), ok = repo.deleteDeck(user.id, deckMatch[1], cleanText(body.destinationDeckId, 100) || null)
        return ok ? send(200, {ok: true}) : send(400, {error: 'Deck ou destination invalide.'})
      }

      if (req.method === 'GET' && subpath === 'notes') {
        const result = repo.listNotes(user.id, {
          deckId: cleanText(url.searchParams.get('deck'), 100),
          noteType: cleanText(url.searchParams.get('type'), 50),
          subject: cleanText(url.searchParams.get('subject'), 150),
          chapter: cleanText(url.searchParams.get('chapter'), 200),
          courseId: cleanText(url.searchParams.get('course'), 150),
          query: cleanText(url.searchParams.get('query'), 200),
          cursor: decodeCursor(url.searchParams.get('cursor')),
          limit: Number(url.searchParams.get('limit')) || 50,
        })
        return send(200, result)
      }
      if (req.method === 'POST' && subpath === 'notes') {
        const value = validateNote(await readJson(req))
        if (!value) return send(400, {error: 'Note invalide.'})
        const note = repo.createNote(user.id, value)
        return send(201, {note})
      }
      const noteMatch = subpath.match(/^notes\/([^/]+)$/)
      if (noteMatch && req.method === 'GET') {
        const note = repo.note(user.id, noteMatch[1])
        return note ? send(200, {note}) : send(404, {error: 'Note introuvable.'})
      }
      if (noteMatch && req.method === 'PATCH') {
        const body = await readJson(req)
        if (!Number.isSafeInteger(body?.expectedVersion)) {
          return send(422, {error: 'expectedVersion obligatoire pour modifier une note.'})
        }
        const value = validateNote(body, true)
        if (!value) return send(400, {error: 'Note invalide.'})
        const note = repo.updateNote(user.id, noteMatch[1], value, body.expectedVersion)
        return note ? send(200, {note}) : send(404, {error: 'Note introuvable.'})
      }
      if (noteMatch && req.method === 'DELETE') {
        const body = await readJson(req).catch(() => ({}))
        if (!Number.isSafeInteger(body?.expectedVersion)) {
          return send(422, {error: 'expectedVersion obligatoire pour supprimer une note.'})
        }
        const ok = repo.deleteNote(user.id, noteMatch[1], body.expectedVersion)
        return ok ? send(200, {ok: true}) : send(404, {error: 'Note introuvable.'})
      }
      const duplicateNoteMatch = subpath.match(/^notes\/([^/]+)\/duplicate$/)
      if (duplicateNoteMatch && req.method === 'POST') {
        const body = await readJson(req).catch(() => ({}))
        const note = repo.duplicateNote(user.id, duplicateNoteMatch[1], cleanText(body?.deckId, 100) || undefined)
        return note ? send(201, {note}) : send(404, {error: 'Note introuvable.'})
      }
      const restoreMatch = subpath.match(/^notes\/([^/]+)\/derivations\/([^/]+)\/restore$/)
      if (restoreMatch && req.method === 'POST') {
        const body = await readJson(req).catch(() => ({}))
        if (!Number.isSafeInteger(body?.expectedVersion)) {
          return send(422, {error: 'expectedVersion obligatoire pour restaurer une dérivation.'})
        }
        const note = repo.restoreDerivation(user.id, restoreMatch[1], restoreMatch[2], body.expectedVersion)
        return note ? send(200, {note}) : send(404, {error: 'Note introuvable.'})
      }

      if (req.method === 'POST' && subpath === 'notes/bulk') {
        const body = await readJson(req, 2000000)
        if (!Array.isArray(body.notes) || !body.notes.length || body.notes.length > 100) {
          return send(400, {error: 'Entre 1 et 100 notes sont attendues.'})
        }
        const requestId = cleanText(body.requestId, 100, true)
        if (!requestId) {
          return send(422, {error: 'Identifiant d’enregistrement (requestId) obligatoire.'})
        }

        repo.purgeExpiredGenerationReceipts()
        let receipt = null
        if (body.generationId) {
          const genId = cleanText(body.generationId, 100, true)
          receipt = genId ? repo.getGenerationReceipt(user.id, genId) : null
          if (!receipt) {
            return send(400, {error: 'Reçu de génération invalide ou expiré.'})
          }
        }

        const KIND_TO_SOURCE_TYPE = {
          text: 'free_text',
          free_text: 'free_text',
          catalog: 'catalog_course',
          catalog_course: 'catalog_course',
          study: 'study_document',
          study_document: 'study_document',
          'qcm-error': 'qcm_error',
          qcm_error: 'qcm_error',
        }

        const validNotes = []
        let totalDerivedCards = 0

        for (const rawNote of body.notes) {
          const valid = validateNote(rawNote)
          if (!valid) {
            return send(400, {error: 'Une note du lot est invalide.'})
          }
          if (!repo.deck(user.id, valid.defaultDeckId)) {
            return send(400, {error: 'Deck par défaut introuvable.'})
          }

          // Check study document provenance
          if (valid.source?.type === 'study_document' && valid.source.documentId) {
            const doc = d.prepare('SELECT 1 FROM study_documents WHERE id=? AND user_id=?').get(valid.source.documentId, user.id)
            if (!doc) return send(400, {error: 'Document source invalide ou non autorisé.'})
            if (valid.source.sectionId) {
              const sec = d.prepare('SELECT content FROM study_sections WHERE id=? AND document_id=? AND user_id=?').get(valid.source.sectionId, valid.source.documentId, user.id)
              if (!sec) return send(400, {error: 'Section source invalide.'})
              if (valid.source.excerpt && !normalize(sec.content).includes(normalize(valid.source.excerpt))) {
                return send(400, {error: 'Citation source non trouvée dans la section indiquée.'})
              }
            }
          }

          // Strict binding between generation receipt and note source
          if (!receipt) {
            if (valid.source?.type && valid.source.type !== 'manual') {
              return send(400, {error: 'Un identifiant de génération (generationId) valide est obligatoire pour enregistrer des notes issues d’une source générée.'})
            }
          } else {
            const expectedSourceType = KIND_TO_SOURCE_TYPE[receipt.kind]
            if (!expectedSourceType || valid.source?.type !== expectedSourceType) {
              return send(400, {error: 'Type de source incompatible avec le reçu de génération.'})
            }

            if ((valid.source?.courseId || null) !== (receipt.source?.courseId || null)) {
              return send(400, {error: 'Incohérence de provenance avec le reçu de génération (courseId).'})
            }
            if ((valid.source?.documentId || null) !== (receipt.source?.documentId || null)) {
              return send(400, {error: 'Incohérence de provenance avec le reçu de génération (documentId).'})
            }
            if (receipt.source?.sectionId && (valid.source?.sectionId || null) !== receipt.source.sectionId) {
              return send(400, {error: 'Incohérence de provenance avec le reçu de génération (sectionId).'})
            }

            const normSource = normalize(receipt.sourceText)
            switch (valid.noteType) {
              case 'basic':
              case 'reverse': {
                if (!normSource.includes(normalize(valid.fields.back))) {
                  return send(400, {error: 'La réponse de la note n’est pas attestée dans la source d’origine.'})
                }
                break
              }
              case 'typed': {
                if (!normSource.includes(normalize(valid.fields.answer))) {
                  return send(400, {error: 'La réponse à saisir n’est pas attestée dans la source d’origine.'})
                }
                break
              }
              case 'cloze': {
                const stripped = (valid.fields.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '$1')
                if (!normSource.includes(normalize(stripped))) {
                  return send(400, {error: 'Le texte à trous n’est pas conforme à la source d’origine.'})
                }
                const spans = [...(valid.fields.text || '').matchAll(/\{\{c\d+::(.*?)\}\}/g)].map(m => normalize(m[1]))
                if (spans.some(s => !s || !normSource.includes(s))) {
                  return send(400, {error: 'Un trou masqué n’est pas attesté dans la source d’origine.'})
                }
                break
              }
              case 'bidirectional': {
                if (!normSource.includes(normalize(valid.fields.front)) || !normSource.includes(normalize(valid.fields.back))) {
                  return send(400, {error: 'Les termes bidirectionnels ne sont pas attestés dans la source d’origine.'})
                }
                break
              }
            }

            if (valid.source?.type !== 'free_text' && valid.source?.excerpt) {
              if (!normSource.includes(normalize(valid.source.excerpt))) {
                return send(400, {error: 'Citation source non attestée dans le contenu généré.'})
              }
            }
          }

          // If free_text: excerpt MUST NOT be persisted
          if (valid.source?.type === 'free_text' || (receipt && (receipt.kind === 'free_text' || receipt.kind === 'text'))) {
            valid.source = {...valid.source, type: 'free_text', excerpt: null}
          }

          const derived = deriveCardsFromNote(valid.noteType, valid.fields, [])
          totalDerivedCards += derived.length
          validNotes.push(valid)
        }

        if (totalDerivedCards > 300) {
          return send(400, {error: 'Le lot dépasse la limite maximale de 300 cartes dérivées.'})
        }

        const payloadHash = digest(JSON.stringify(body.notes))
        const result = repo.createNotesBulk(user.id, validNotes, requestId, payloadHash)
        return send(201, result)
      }

      if (req.method === 'GET' && subpath === 'cards') {
        const result = repo.listCards(user.id, {deckId: cleanText(url.searchParams.get('deck'), 100), subject: cleanText(url.searchParams.get('subject'), 150), chapter: cleanText(url.searchParams.get('chapter'), 200), tag: cleanText(url.searchParams.get('tag'), 50), courseId: cleanText(url.searchParams.get('course'), 150), query: cleanText(url.searchParams.get('query'), 200), due: url.searchParams.get('due') === '1', cursor: decodeCursor(url.searchParams.get('cursor')), limit: Number(url.searchParams.get('limit')) || 50})
        return send(200, result)
      }
      if (req.method === 'POST' && subpath === 'cards') {
        const value = validateCard(await readJson(req)); if (!value) return send(400, {error: 'Carte invalide.'})
        const card = repo.createCard(user.id, value); return card ? send(201, {card}) : send(400, {error: 'Deck invalide.'})
      }
      if (req.method === 'POST' && subpath === 'cards/bulk') {
        const body = await readJson(req, 2000000)
        if (!Array.isArray(body.cards) || !body.cards.length || body.cards.length > 200) return send(400, {error: 'Entre 1 et 200 cartes sont attendues.'})
        const requestId = body.requestId === undefined ? null : cleanText(body.requestId, 100, true)
        if (body.requestId !== undefined && !requestId) return send(400, {error: 'Identifiant d’enregistrement invalide.'})
        const payloadHash = digest(JSON.stringify(body.cards))
        const previous = requestId && d.prepare('SELECT payload_hash,response_json FROM flashcard_save_requests WHERE user_id=? AND request_id=?').get(user.id, requestId)
        if (previous) return previous.payload_hash === payloadHash ? send(200, JSON.parse(previous.response_json)) : send(409, {error: 'Cette demande d’enregistrement a déjà été utilisée pour un autre contenu.'})
        const values = body.cards.map(value => validateCard(value)); if (values.some(value => !value)) return send(400, {error: 'Une carte du lot est invalide.'})
        if (values.some(value => !repo.deck(user.id, value.deckId) || (value.source.documentId && !d.prepare('SELECT 1 FROM study_documents WHERE id=? AND user_id=?').get(value.source.documentId, user.id)))) return send(400, {error: 'Deck ou document source invalide.'})
        const cards = []; d.exec('BEGIN IMMEDIATE')
        try {
          for (const value of values) { const card = repo.createCard(user.id, value); if (!card) throw new Error('Deck invalide.'); cards.push(card) }
          if (requestId) d.prepare('INSERT INTO flashcard_save_requests VALUES(?,?,?,?,?)').run(user.id, requestId, payloadHash, JSON.stringify({cards}), Date.now())
          d.prepare('DELETE FROM flashcard_save_requests WHERE created_at<?').run(Date.now() - 7 * 86400000)
          d.exec('COMMIT')
        } catch (error) { d.exec('ROLLBACK'); throw error }
        return send(201, {cards})
      }
      const cardMatch = subpath.match(/^cards\/([^/]+)(?:\/(duplicate|move|review|preview))?$/)
      if (cardMatch && !cardMatch[2] && req.method === 'PATCH') {
        const card = repo.card(user.id, cardMatch[1])
        if (!card) return send(404, {error: 'Carte introuvable.'})
        if (card.noteId) {
          return send(422, {error: 'Cette carte est dérivée d’une Note. Modifiez la Note parente.'})
        }
        const value = validateCard(await readJson(req), true); if (!value) return send(400, {error: 'Carte invalide.'})
        const updated = repo.updateCard(user.id, cardMatch[1], value); return updated ? send(200, {card: updated}) : send(404, {error: 'Carte ou deck introuvable.'})
      }
      if (cardMatch && !cardMatch[2] && req.method === 'DELETE') {
        const body = await readJson(req).catch(() => ({}))
        const card = repo.card(user.id, cardMatch[1])
        if (!card) return send(404, {error: 'Carte introuvable.'})
        if (card.noteId && !Number.isSafeInteger(body?.expectedVersion)) {
          return send(422, {error: 'expectedVersion obligatoire pour supprimer une carte dérivée.'})
        }
        return repo.deleteCard(user.id, cardMatch[1], body?.expectedVersion) ? send(200, {ok: true}) : send(404, {error: 'Carte introuvable.'})
      }
      if (cardMatch?.[2] === 'duplicate' && req.method === 'POST') {
        const original = repo.card(user.id, cardMatch[1]); if (!original) return send(404, {error: 'Carte introuvable.'})
        const body = await readJson(req)
        const targetDeckId = cleanText(body.deckId, 100) || undefined
        const card = repo.duplicateCard(user.id, original.id, targetDeckId)
        if (!card) return send(400, {error: 'Deck invalide.'})
        const note = card.noteId ? repo.note(user.id, card.noteId) : undefined
        return send(201, {card, ...(note ? {note} : {})})
      }
      if (cardMatch?.[2] === 'move' && req.method === 'POST') {
        const body = await readJson(req), card = repo.updateCard(user.id, cardMatch[1], {deckId: cleanText(body.deckId, 100, true)})
        return card ? send(200, {card}) : send(400, {error: 'Carte ou deck invalide.'})
      }
      if (cardMatch?.[2] === 'preview' && req.method === 'POST') {
        const card = repo.card(user.id, cardMatch[1]); if (!card) return send(404, {error: 'Carte introuvable.'})
        const row = d.prepare('SELECT * FROM flashcard_reviews WHERE card_id=? AND user_id=?').get(card.id, user.id)
        if (!row) return send(404, {error: 'Carte introuvable.'})
        const now = Date.now()
        if (row.due_at > now) {
          return send(400, {error: 'Cette carte n’est pas encore due pour révision.'})
        }
        const snapshot = scheduler.createPreviewSnapshot(row, now)
        d.exec('BEGIN IMMEDIATE')
        try {
          d.prepare('DELETE FROM flashcard_review_previews WHERE card_id=? AND user_id=?').run(card.id, user.id)
          d.prepare(`
            INSERT INTO flashcard_review_previews(
              id, user_id, card_id, review_version, preview_at, expires_at, candidates_json, scheduler_version, scheduler_config_hash
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            snapshot.id,
            user.id,
            card.id,
            snapshot.reviewVersion,
            snapshot.previewAt,
            snapshot.expiresAt,
            JSON.stringify(snapshot.candidates),
            snapshot.schedulerVersion,
            snapshot.schedulerConfigHash
          )
          d.prepare('DELETE FROM flashcard_review_previews WHERE expires_at<?').run(now)
          d.exec('COMMIT')
        } catch (err) {
          d.exec('ROLLBACK')
          throw err
        }
        return send(200, {preview: {id: snapshot.id, labels: snapshot.labels}})
      }
      if (cardMatch?.[2] === 'review' && req.method === 'POST') {
        const body = await readJson(req), rating = body.rating
        if (!ratings.has(rating)) return send(400, {error: 'Réponse de révision invalide.'})
        const card = repo.card(user.id, cardMatch[1]); if (!card) return send(404, {error: 'Carte introuvable.'})
        const before = d.prepare('SELECT * FROM flashcard_reviews WHERE card_id=? AND user_id=?').get(card.id, user.id)
        if (!before) return send(404, {error: 'Carte introuvable.'})
        const now = Date.now()

        // 1. previewId obligatoire pour garantir l'équivalence exacte aperçu = révision
        if (!body.previewId || typeof body.previewId !== 'string') {
          return send(422, {error: 'Aperçu de révision (previewId) obligatoire pour enregistrer une révision FSRS.'})
        }

        // 2. Contrôles de concurrence optimiste
        if (body.expectedVersion !== undefined && body.expectedVersion !== before.review_version) {
          return send(409, {error: 'Cette carte a déjà été révisée sur un autre onglet ou appareil. Rechargez la session.'})
        }
        if (body.expectedDueAt !== undefined && body.expectedDueAt !== before.due_at) {
          return send(409, {error: 'Cette carte a déjà été révisée sur un autre onglet ou appareil. Rechargez la session.'})
        }

        const responseMs = Number.isSafeInteger(body.responseMs) && body.responseMs >= 0 && body.responseMs <= 3600000 ? body.responseMs : null

        d.exec('BEGIN IMMEDIATE')
        try {
          const previewRow = d.prepare('SELECT * FROM flashcard_review_previews WHERE id=?').get(body.previewId)
          if (!previewRow) {
            d.exec('ROLLBACK')
            return send(409, {error: 'Aperçu de révision introuvable ou déjà consommé. Rechargez la carte.'})
          }
          if (previewRow.card_id !== card.id || previewRow.user_id !== user.id) {
            d.exec('ROLLBACK')
            return send(403, {error: 'Cet aperçu de révision ne correspond pas à cette carte ou cet utilisateur.'})
          }
          if (previewRow.expires_at <= now) {
            d.prepare('DELETE FROM flashcard_review_previews WHERE id=?').run(body.previewId)
            d.exec('COMMIT')
            return send(409, {error: 'Aperçu de révision expiré. Affichez de nouveau la réponse.'})
          }
          if (previewRow.review_version !== before.review_version) {
            d.exec('ROLLBACK')
            return send(409, {error: 'Conflit de version de révision. Cette carte a déjà été révisée.'})
          }
          if (previewRow.scheduler_config_hash !== scheduler.schedulerConfigHash) {
            d.exec('ROLLBACK')
            return send(409, {error: 'La configuration du planificateur a changé. Veuillez réafficher la réponse.'})
          }

          // 3. Refus si la carte n'est pas due en mode SRS normal
          if (before.due_at > now) {
            d.exec('ROLLBACK')
            return send(400, {error: 'Cette carte n’est pas encore due pour révision.'})
          }

          const candidates = JSON.parse(previewRow.candidates_json)
          const candidate = candidates[rating]
          if (!candidate) {
            d.exec('ROLLBACK')
            return send(422, {error: 'Candidat de révision introuvable dans l’aperçu.'})
          }

          // Consommer le preview immédiatement au sein de la transaction
          d.prepare('DELETE FROM flashcard_review_previews WHERE id=?').run(body.previewId)

          const next = scheduler.applyReview(before, rating, now, candidate)

          const updateResult = d.prepare(`
            UPDATE flashcard_reviews
            SET state=?, due_at=?, interval_days=?, ease_factor=?, repetitions=?, lapses=?,
                last_rating=?, last_reviewed_at=?, fsrs_stability=?, fsrs_difficulty=?,
                fsrs_reps=?, fsrs_learning_steps=?, fsrs_scheduled_days=?, review_version=?
            WHERE card_id=? AND user_id=? AND review_version=?
          `).run(
            next.state, next.dueAt, next.intervalDays, next.easeFactor, next.repetitions, next.lapses,
            next.lastRating, next.lastReviewedAt, next.stability, next.difficulty,
            next.fsrsReps, next.learningSteps, next.scheduledDays, next.reviewVersion,
            card.id, user.id, before.review_version
          )

          if (!updateResult.changes) {
            d.exec('ROLLBACK')
            return send(409, {error: 'Cette carte a déjà été révisée sur un autre onglet ou appareil. Rechargez la session.'})
          }

          // Nettoyer les previews restants pour cette carte et supprimer les expirés
          d.prepare('DELETE FROM flashcard_review_previews WHERE card_id=? AND user_id=?').run(card.id, user.id)
          d.prepare('DELETE FROM flashcard_review_previews WHERE expires_at<?').run(now)

          d.prepare(`
            INSERT INTO flashcard_review_logs(
              id, card_id, user_id, rating, reviewed_at,
              previous_due_at, previous_interval_days, next_due_at, next_interval_days, response_ms,
              previous_state, next_state, fsrs_difficulty, fsrs_stability, scheduled_days, elapsed_days,
              scheduler_version, scheduler_config_hash, scheduler_data_json
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `).run(
            randomUUID(), card.id, user.id, rating, now,
            before.due_at, before.interval_days, next.dueAt, next.intervalDays, responseMs,
            before.state, next.state, next.difficulty, next.stability, next.scheduledDays, next.elapsedDays,
            next.schedulerVersion, next.schedulerConfigHash, next.auditJson
          )

          d.exec('COMMIT')
          return send(200, {review: next})
        } catch (error) {
          d.exec('ROLLBACK')
          throw error
        }
      }
      if (req.method === 'GET' && subpath === 'review') {
        const timeZone = cleanText(req.headers['x-timezone'] || url.searchParams.get('timezone'), 60) || 'Europe/Paris'
        const cards = repo.reviewQueue(user.id, cleanText(url.searchParams.get('deck'), 100), Number(url.searchParams.get('limit')) || 30, timeZone)
        return send(200, {cards})
      }
      if (req.method === 'GET' && subpath === 'stats') {
        const timeZone = cleanText(req.headers['x-timezone'] || url.searchParams.get('timezone'), 60) || 'Europe/Paris'
        return send(200, {stats: repo.stats(user.id, timeZone)})
      }

      if (req.method === 'POST' && subpath.startsWith('generate/')) {
        repo.purgeExpiredGenerationReceipts()
        const kind = subpath.slice(9), body = await readJson(req, 1000000), level = ['essential', 'standard', 'complete'].includes(body.level) ? body.level : 'standard', requestedCount = Math.min(80, Math.max(1, Number(body.count) || 12))
        if (!['text', 'catalog', 'study', 'qcm-error'].includes(kind)) return send(404, {error: 'Source de génération inconnue.'})
        const generationId = 'gen_' + randomUUID()

        if (kind === 'qcm-error' && body.qcm !== undefined) {
          const front = cleanText(body.qcm?.front, 2000, true), back = cleanText(body.qcm?.back, 8000, true)
          if (!front || !back) return send(400, {error: 'Question ou correction QCM invalide.'})
          const qcmText = `${front}\n\n${back}`
          const qcmSource = {type: 'qcm_error', courseId: cleanText(body.courseId, 150) || null, excerpt: back.slice(0, 1500)}
          repo.saveGenerationReceipt(user.id, generationId, 'qcm_error', qcmSource, qcmText)

          let noteType = 'basic'
          let fields = {front, back}
          let rationale = 'Correction d’erreur QCM'

          const valMatch = back.match(/(?:vaut|est égal(?:e)? à|seuil de|valeur de|taux de|concentration de)\s+(\d+(?:[.,]\d+)?\s*(?:[a-zA-Z/%µ]+(?:\/[a-zA-Z0-9]+)?)?)/i)
          if (valMatch && valMatch[1].trim().length <= 40) {
            noteType = 'typed'
            fields = {front: `Quelle est la valeur clé : ${front} ?`, answer: valMatch[1].trim(), acceptedAnswers: []}
            rationale = 'Valeur médicale chiffrée issue de la correction'
          }

          const draft = {
            temporaryId: randomUUID(),
            noteType,
            front: fields.front,
            back: fields.back || fields.answer,
            fields,
            selected: true,
            subject: cleanText(body.subject, 150) || '',
            chapter: cleanText(body.chapter, 200) || '',
            tags: [],
            source: qcmSource,
            rationale,
          }
          return send(200, {drafts: [draft], generationId, generation: {mode: 'local', produced: 1, persisted: false}})
        }

        if (body.count !== undefined && (!Number.isInteger(body.count) || body.count < 1 || body.count > 80)) return send(400, {error: 'Choisissez entre 1 et 80 notions.'})
        let text = '', sourceSegments = [], source = {type: kind === 'text' ? 'free_text' : kind === 'qcm-error' ? 'qcm_error' : kind === 'study' ? 'study_document' : 'catalog_course'}
        let subject = cleanText(body.subject, 150) || '', chapter = cleanText(body.chapter, 200) || '', tags = Array.isArray(body.tags) ? body.tags.slice(0, 20).map(value => String(value).slice(0, 50)) : []

        if (kind === 'study') {
          const documentId = cleanText(body.documentId, 100, true); if (!documentId) return send(400, {error: 'Document requis.'})
          const document = d.prepare('SELECT id,title,page_count FROM study_documents WHERE id=? AND user_id=?').get(documentId, user.id); if (!document) return send(404, {error: 'Document introuvable.'})
          if ([body.startPage, body.endPage].some(page => page !== undefined && (!Number.isInteger(page) || page < 1 || page > document.page_count)) || (body.startPage !== undefined && body.endPage !== undefined && body.startPage > body.endPage)) return send(400, {error: 'La plage de pages est invalide.'})
          const sectionIds = Array.isArray(body.sectionIds) ? body.sectionIds.slice(0, 100).map(String) : []
          let sections = d.prepare('SELECT id,title,start_page,end_page,content FROM study_sections WHERE document_id=? AND user_id=? ORDER BY section_order').all(documentId, user.id)
          if (sectionIds.length) sections = sections.filter(section => sectionIds.includes(section.id))
          if (Number.isSafeInteger(body.startPage) || Number.isSafeInteger(body.endPage)) { const start = Math.max(1, body.startPage || 1), end = Math.min(document.page_count, body.endPage || document.page_count); sections = sections.filter(section => section.end_page >= start && section.start_page <= end) }
          sourceSegments = sections.map(section => ({id: section.id, title: section.title, text: section.content, startPage: section.start_page, endPage: section.end_page}))
          text = sections.map(section => `${section.title}. ${section.content}`).join('\n'); chapter ||= document.title
          const pagesRange = sections.length ? [Math.min(...sections.map(s => s.start_page)), Math.max(...sections.map(s => s.end_page))] : []
          source = {...source, documentId, sectionId: sections.length === 1 ? sections[0].id : null, locator: {pages: pagesRange}}
        } else {
          text = cleanText(body.text, 300000, true) || ''
          if (kind === 'catalog' && Array.isArray(body.segments)) sourceSegments = body.segments.slice(0, 200).flatMap(segment => { const id = cleanText(segment?.id, 180, true), segmentText = cleanText(segment?.text, 50000, true), title = cleanText(segment?.title, 200); return id && segmentText ? [{id, text: segmentText, title: title || '', startPage: null, endPage: null}] : [] })
        }
        if (text.length < 20) return send(400, {error: 'Le contenu sélectionné est trop court pour générer des cartes utiles.'})
        source = {...source, courseId: cleanText(body.courseId, 150) || null, sectionId: source.sectionId || cleanText(body.sectionId, 180) || null, locator: source.locator || (body.locator && typeof body.locator === 'object' ? body.locator : null)}

        repo.saveGenerationReceipt(user.id, generationId, kind, source, text)

        const fallback = {text, level, requestedCount, source, subject, chapter, tags}; let drafts = [], usedProvider = false, reserved = false
        if (provider?.generateFlashcards) {
          reserveGenerationQuota(user.id, d); reserved = true
          try {
            const providerResult = await provider.generateFlashcards({
              text, level, requestedCount, source, subject, chapter,
              instructions: `Créer des flashcards structurées sous forme de Notes pédagogiques en français.
Chaque élément doit comporter :
- noteType : l'un de 'basic', 'cloze', 'typed', 'bidirectional'.
  * 'typed' : pour les valeurs chiffrées précises avec unités, les formules ou scores cliniques. Le champ fields doit être { front, answer }. answer doit être une citation exacte de la valeur dans le texte.
  * 'cloze' : pour les phrases anatomiques ou contextuelles clés où 1 à 3 termes précis sont masqués sous la forme {{c1::terme}}, {{c2::terme}}. Le texte complet sans les balises doit être strictement identique au passage source.
  * 'bidirectional' : uniquement en cas d'équivalence explicite (synonyme officiel, éponyme vs nomenclature, abréviation explicitement définie). Les deux termes doivent être dans le texte.
  * 'basic' : par défaut pour les définitions, mécanismes et rôles physiologiques. { front, back } où back est une citation exacte du texte.
- fields : les champs correspondant au noteType.
- sourceExcerpt : citation exacte et intégrale d'une phrase du contenu fourni attestant la notion.
- rationale : justification courte du choix du type.
Ne jamais utiliser de pronom sans antécédent (il, elle, ce...).`
            })
            drafts = sanitizeGeneratedNoteDrafts(providerResult, fallback, text)
            usedProvider = Boolean(drafts.length)
          } catch (error) {
            console.warn('Provider flashcard generation failed, falling back to local generator:', error.message)
          }
          if (!usedProvider && reserved) { releaseGenerationQuota(user.id, d); reserved = false }
        }
        if (!drafts.length) drafts = generateLocalNoteDrafts(fallback)
        if (sourceSegments.length) drafts = drafts.map(draft => { const excerpt = String(draft.source?.excerpt || '').toLocaleLowerCase('fr'), segment = sourceSegments.find(item => excerpt && item.text.toLocaleLowerCase('fr').includes(excerpt)) || (sourceSegments.length === 1 ? sourceSegments[0] : null); return segment ? {...draft, source: {...draft.source, sectionId: segment.id, locator: kind === 'study' ? {pages: [segment.startPage, segment.endPage]} : {route: `#tab=cours&cours=${source.courseId}&section=${segment.id}`}}} : draft })
        if (kind === 'text') drafts = drafts.map(draft => ({...draft, source: {...draft.source, excerpt: null}}))
        return send(200, {drafts, generationId, generation: {mode: usedProvider ? 'provider' : 'local', level, requestedCount, produced: drafts.length, persisted: false}})
      }
      if (req.method === 'POST' && subpath === 'export') {
        const body = await readJson(req)
        const isFiltered = Boolean(
          body.deckId ||
          (Array.isArray(body.deckIds) && body.deckIds.length > 0) ||
          body.courseId ||
          body.due === true ||
          (Array.isArray(body.cardIds) && body.cardIds.length > 0)
        )
        const filters = {deckId: cleanText(body.deckId, 100), courseId: cleanText(body.courseId, 150), due: body.due === true, limit: 100}; let cursor = null, cards = []
        for (const [key, max] of [['deckIds', 1000], ['cardIds', 10000]]) {
          if (body[key] !== undefined) {
            if (!Array.isArray(body[key]) || body[key].length > max || body[key].some(id => !cleanText(id, 100, true))) return send(400, {error: 'Sélection d’export invalide.'})
            filters[key] = body[key]
          }
        }
        do { const page = repo.listCards(user.id, {...filters, cursor}); cards.push(...page.cards); cursor = page.nextCursor ? decodeCursor(page.nextCursor) : null } while (cursor && cards.length < 10000)
        if (cursor) return send(413, {error: 'Plus de 10 000 cartes sélectionnées. Exportez vos decks en plusieurs fois.'})
        const noteIds = isFiltered ? [] : [...new Set(cards.map(c => c.noteId).filter(Boolean))]
        const notesMap = new Map()
        for (const nid of noteIds) {
          const n = repo.note(user.id, nid)
          if (n) notesMap.set(n.id, n)
        }
        return send(200, buildFlashcardAnki(cards, repo.listDecks(user.id), notesMap, isFiltered), 'text/csv; charset=utf-8')
      }
      return send(404, {error: 'Route flashcards inconnue.'})
    } catch (error) {
      if (String(error?.message).includes('flashcard_decks')) return send(409, {error: 'Un deck porte déjà ce nom.'})
      if (String(error?.message).includes('flashcards_note_derivation')) return send(409, {error: 'Cette dérivation existe déjà pour cette note.'})
      if (String(error?.message).includes('UNIQUE constraint failed')) return send(409, {error: 'Un élément identique existe déjà.'})
      console.error('Flashcard API error:', error)
      return send(error.status || 500, {error: error.status ? error.message : 'Service flashcards indisponible. Réessayez dans quelques instants.'})
    }
  }
}
