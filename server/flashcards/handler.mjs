import {DatabaseSync} from 'node:sqlite'
import {createHash, randomUUID} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
import {initFlashcardSchema} from './schema.mjs'
import {FlashcardRepository} from './repository.mjs'
import {cleanText, ratings, validateCard, validateDeck} from './validation.mjs'
import {scheduleReview} from './scheduler.mjs'
import {generateLocalDrafts, sanitizeGeneratedDrafts} from './generation.mjs'
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
  const getDb = () => {
    if (db) return db
    const directory = config.RAILWAY_VOLUME_MOUNT_PATH || config.ACCOUNT_DATA_DIR || path.resolve('.data')
    mkdirSync(directory, {recursive: true, mode: 0o700})
    db = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
    initStudySchema(db); initFlashcardSchema(db)
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
        const values = body.cards.map(validateCard); if (values.some(value => !value)) return send(400, {error: 'Une carte du lot est invalide.'})
        const cards = []; d.exec('BEGIN IMMEDIATE')
        try { for (const value of values) { const card = repo.createCard(user.id, value); if (!card) throw new Error('Deck invalide.'); cards.push(card) } d.exec('COMMIT') } catch (error) { d.exec('ROLLBACK'); throw error }
        return send(201, {cards})
      }
      const cardMatch = subpath.match(/^cards\/([^/]+)(?:\/(duplicate|move|review))?$/)
      if (cardMatch && !cardMatch[2] && req.method === 'PATCH') {
        const value = validateCard(await readJson(req), true); if (!value) return send(400, {error: 'Carte invalide.'})
        const card = repo.updateCard(user.id, cardMatch[1], value); return card ? send(200, {card}) : send(404, {error: 'Carte ou deck introuvable.'})
      }
      if (cardMatch && !cardMatch[2] && req.method === 'DELETE') return repo.deleteCard(user.id, cardMatch[1]) ? send(200, {ok: true}) : send(404, {error: 'Carte introuvable.'})
      if (cardMatch?.[2] === 'duplicate' && req.method === 'POST') {
        const original = repo.card(user.id, cardMatch[1]); if (!original) return send(404, {error: 'Carte introuvable.'})
        const body = await readJson(req), card = repo.createCard(user.id, {...original, deckId: cleanText(body.deckId, 100) || original.deckId})
        return card ? send(201, {card}) : send(400, {error: 'Deck invalide.'})
      }
      if (cardMatch?.[2] === 'move' && req.method === 'POST') {
        const body = await readJson(req), card = repo.updateCard(user.id, cardMatch[1], {deckId: cleanText(body.deckId, 100, true)})
        return card ? send(200, {card}) : send(400, {error: 'Carte ou deck invalide.'})
      }
      if (cardMatch?.[2] === 'review' && req.method === 'POST') {
        const body = await readJson(req), rating = body.rating
        if (!ratings.has(rating)) return send(400, {error: 'Réponse de révision invalide.'})
        const card = repo.card(user.id, cardMatch[1]); if (!card) return send(404, {error: 'Carte introuvable.'})
        const before = d.prepare('SELECT * FROM flashcard_reviews WHERE card_id=? AND user_id=?').get(card.id, user.id), now = Date.now(), next = scheduleReview(before, rating, now), responseMs = Number.isSafeInteger(body.responseMs) && body.responseMs >= 0 && body.responseMs <= 3600000 ? body.responseMs : null
        d.exec('BEGIN IMMEDIATE'); try {
          d.prepare('UPDATE flashcard_reviews SET state=?,due_at=?,interval_days=?,ease_factor=?,repetitions=?,lapses=?,last_rating=?,last_reviewed_at=? WHERE card_id=? AND user_id=?').run(next.state, next.dueAt, next.intervalDays, next.easeFactor, next.repetitions, next.lapses, next.lastRating, next.lastReviewedAt, card.id, user.id)
          d.prepare('INSERT INTO flashcard_review_logs VALUES(?,?,?,?,?,?,?,?,?,?)').run(randomUUID(), card.id, user.id, rating, now, before.due_at, before.interval_days, next.dueAt, next.intervalDays, responseMs); d.exec('COMMIT')
        } catch (error) { d.exec('ROLLBACK'); throw error }
        return send(200, {review: next})
      }
      if (req.method === 'GET' && subpath === 'review') return send(200, {cards: repo.reviewQueue(user.id, cleanText(url.searchParams.get('deck'), 100), Number(url.searchParams.get('limit')) || 30)})
      if (req.method === 'GET' && subpath === 'stats') return send(200, {stats: repo.stats(user.id)})

      if (req.method === 'POST' && subpath.startsWith('generate/')) {
        const kind = subpath.slice(9), body = await readJson(req, 1000000), level = ['essential', 'standard', 'complete'].includes(body.level) ? body.level : 'standard', requestedCount = Math.min(80, Math.max(1, Number(body.count) || 12))
        let text = '', sourceSegments = [], source = {type: kind === 'text' ? 'free_text' : kind === 'qcm-error' ? 'qcm_error' : kind === 'study' ? 'study_document' : 'catalog_course'}
        let subject = cleanText(body.subject, 150) || '', chapter = cleanText(body.chapter, 200) || '', tags = Array.isArray(body.tags) ? body.tags.slice(0, 20).map(value => String(value).slice(0, 50)) : []
        if (kind === 'study') {
          const documentId = cleanText(body.documentId, 100, true); if (!documentId) return send(400, {error: 'Document requis.'})
          const document = d.prepare('SELECT id,title,page_count FROM study_documents WHERE id=? AND user_id=?').get(documentId, user.id); if (!document) return send(404, {error: 'Document introuvable.'})
          const sectionIds = Array.isArray(body.sectionIds) ? body.sectionIds.slice(0, 100).map(String) : []
          let sections = d.prepare('SELECT id,title,start_page,end_page,content FROM study_sections WHERE document_id=? AND user_id=? ORDER BY section_order').all(documentId, user.id)
          if (sectionIds.length) sections = sections.filter(section => sectionIds.includes(section.id))
          if (Number.isSafeInteger(body.startPage) || Number.isSafeInteger(body.endPage)) { const start = Math.max(1, body.startPage || 1), end = Math.min(document.page_count, body.endPage || document.page_count); sections = sections.filter(section => section.end_page >= start && section.start_page <= end) }
          sourceSegments = sections.map(section => ({id: section.id, title: section.title, text: section.content, startPage: section.start_page, endPage: section.end_page}))
          text = sections.map(section => `${section.title}. ${section.content}`).join('\n'); chapter ||= document.title; source = {...source, documentId, sectionId: sections.length === 1 ? sections[0].id : null, locator: {pages: sections.length ? [Math.min(...sections.map(s => s.start_page)), Math.max(...sections.map(s => s.end_page))] : []}}
        } else {
          text = cleanText(body.text, 300000, true) || ''
          if (kind === 'catalog' && Array.isArray(body.segments)) sourceSegments = body.segments.slice(0, 200).flatMap(segment => { const id = cleanText(segment?.id, 180, true), segmentText = cleanText(segment?.text, 50000, true), title = cleanText(segment?.title, 200); return id && segmentText ? [{id, text: segmentText, title: title || '', startPage: null, endPage: null}] : [] })
        }
        if (text.length < 40) return send(400, {error: 'Le contenu sélectionné est trop court pour générer des cartes utiles.'})
        source = {...source, courseId: cleanText(body.courseId, 150) || null, sectionId: source.sectionId || cleanText(body.sectionId, 180) || null, locator: source.locator || (body.locator && typeof body.locator === 'object' ? body.locator : null)}
        const fallback = {text, level, requestedCount, source, subject, chapter, tags}; let drafts = [], usedProvider = false, reserved = false
        if (provider?.generateFlashcards) {
          reserveGenerationQuota(user.id, d); reserved = true
          try { drafts = sanitizeGeneratedDrafts(await provider.generateFlashcards({text, level, requestedCount, source, subject, chapter, instructions: 'Créer des cartes utiles, non triviales, sans information absente de la source. Répondre en français.'}), fallback); usedProvider = Boolean(drafts.length) } catch (error) { console.warn('Provider flashcard generation failed, falling back to local generator:', error.message) }
          if (!usedProvider && reserved) { releaseGenerationQuota(user.id, d); reserved = false }
        }
        if (!drafts.length) drafts = generateLocalDrafts(fallback)
        if (sourceSegments.length) drafts = drafts.map(draft => { const excerpt = String(draft.source?.excerpt || '').toLocaleLowerCase('fr'), segment = sourceSegments.find(item => excerpt && item.text.toLocaleLowerCase('fr').includes(excerpt)) || (sourceSegments.length === 1 ? sourceSegments[0] : null); return segment ? {...draft, source: {...draft.source, sectionId: segment.id, locator: kind === 'study' ? {pages: [segment.startPage, segment.endPage]} : {route: `#tab=cours&cours=${source.courseId}&section=${segment.id}`}}} : draft })
        if (kind === 'text') drafts = drafts.map(draft => ({...draft, source: {...draft.source, excerpt: null}}))
        return send(200, {drafts, generation: {mode: usedProvider ? 'provider' : 'local', level, requestedCount, produced: drafts.length, persisted: false}})
      }
      if (req.method === 'POST' && subpath === 'export') {
        const body = await readJson(req), filters = {deckId: cleanText(body.deckId, 100), courseId: cleanText(body.courseId, 150), due: body.due === true, limit: 100}; let cursor = null, cards = []
        do { const page = repo.listCards(user.id, {...filters, cursor}); cards.push(...page.cards); cursor = page.nextCursor ? decodeCursor(page.nextCursor) : null } while (cursor && cards.length < 10000)
        if (Array.isArray(body.deckIds)) { const deckIds = new Set(body.deckIds.slice(0, 1000).map(String)); cards = cards.filter(card => deckIds.has(card.deckId)) }
        if (Array.isArray(body.cardIds)) { const ids = new Set(body.cardIds.slice(0, 10000).map(String)); cards = cards.filter(card => ids.has(card.id)) }
        return send(200, buildFlashcardAnki(cards, repo.listDecks(user.id)), 'text/csv; charset=utf-8')
      }
      return send(404, {error: 'Route flashcards inconnue.'})
    } catch (error) {
      if (String(error?.message).includes('UNIQUE constraint failed')) return send(409, {error: 'Un deck porte déjà ce nom.'})
      console.error('Flashcard API error:', error)
      return send(error.status || 500, {error: error.message || 'Service flashcards indisponible.'})
    }
  }
}
