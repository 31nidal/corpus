import {randomUUID} from 'node:crypto'
import {normalizeName} from './validation.mjs'

const parse = value => { try { return value ? JSON.parse(value) : null } catch { return null } }
export function cardView(row) {
  return {id: row.id, deckId: row.deck_id, front: row.front, back: row.back, subject: row.subject || '', chapter: row.chapter || '', tags: parse(row.tags_json) || [], visual: parse(row.visual_json), source: {type: row.source_type, courseId: row.source_course_id, documentId: row.source_document_id, sectionId: row.source_section_id, locator: parse(row.source_locator_json), excerpt: row.source_excerpt}, createdAt: row.created_at, updatedAt: row.updated_at, review: row.due_at == null ? undefined : {state: row.review_state, dueAt: row.due_at, intervalDays: row.interval_days, easeFactor: row.ease_factor, repetitions: row.repetitions, lapses: row.lapses, lastRating: row.last_rating, lastReviewedAt: row.last_reviewed_at}}
}

export class FlashcardRepository {
  constructor(db) { this.db = db }
  deck(userId, id) { return this.db.prepare('SELECT * FROM flashcard_decks WHERE id=? AND user_id=?').get(id, userId) }
  listDecks(userId) {
    return this.db.prepare(`SELECT d.*,COUNT(c.id) card_count,SUM(CASE WHEN r.due_at<=? THEN 1 ELSE 0 END) due_count FROM flashcard_decks d LEFT JOIN flashcards c ON c.deck_id=d.id AND c.user_id=d.user_id LEFT JOIN flashcard_reviews r ON r.card_id=c.id WHERE d.user_id=? GROUP BY d.id ORDER BY d.updated_at DESC`).all(Date.now(), userId).map(row => ({id: row.id, name: row.name, description: row.description || '', subject: row.subject || '', cardCount: row.card_count, dueCount: row.due_count || 0, createdAt: row.created_at, updatedAt: row.updated_at}))
  }
  createDeck(userId, value) {
    const id = randomUUID(), now = new Date().toISOString()
    this.db.prepare('INSERT INTO flashcard_decks VALUES(?,?,?,?,?,?,?,?)').run(id, userId, value.name, normalizeName(value.name), value.description || null, value.subject || null, now, now)
    return this.listDecks(userId).find(deck => deck.id === id)
  }
  updateDeck(userId, id, value) {
    const current = this.deck(userId, id); if (!current) return null
    const next = {...current, ...Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))}, now = new Date().toISOString()
    this.db.prepare('UPDATE flashcard_decks SET name=?,name_normalized=?,description=?,subject=?,updated_at=? WHERE id=? AND user_id=?').run(next.name, normalizeName(next.name), next.description || null, next.subject || null, now, id, userId)
    return this.listDecks(userId).find(deck => deck.id === id)
  }
  deleteDeck(userId, id, destinationId) {
    if (!this.deck(userId, id)) return false
    if (destinationId) {
      if (destinationId === id || !this.deck(userId, destinationId)) return false
      this.db.prepare('UPDATE flashcards SET deck_id=?,updated_at=? WHERE deck_id=? AND user_id=?').run(destinationId, new Date().toISOString(), id, userId)
    }
    this.db.prepare('DELETE FROM flashcard_decks WHERE id=? AND user_id=?').run(id, userId)
    return true
  }
  card(userId, id) {
    const row = this.db.prepare(`SELECT c.*,r.state review_state,r.due_at,r.interval_days,r.ease_factor,r.repetitions,r.lapses,r.last_rating,r.last_reviewed_at FROM flashcards c LEFT JOIN flashcard_reviews r ON r.card_id=c.id WHERE c.id=? AND c.user_id=?`).get(id, userId)
    return row ? cardView(row) : null
  }
  listCards(userId, filters = {}) {
    const where = ['c.user_id=?'], args = [userId]
    if (filters.deckId) { where.push('c.deck_id=?'); args.push(filters.deckId) }
    for (const [field, values] of [['c.deck_id', filters.deckIds], ['c.id', filters.cardIds]]) {
      if (Array.isArray(values)) { where.push(values.length ? `${field} IN (${values.map(() => '?').join(',')})` : '0'); args.push(...values) }
    }
    if (filters.subject) { where.push('c.subject=?'); args.push(filters.subject) }
    if (filters.chapter) { where.push('c.chapter=?'); args.push(filters.chapter) }
    if (filters.tag) { where.push('EXISTS (SELECT 1 FROM json_each(c.tags_json) WHERE LOWER(value)=LOWER(?))'); args.push(filters.tag) }
    if (filters.courseId) { where.push('c.source_course_id=?'); args.push(filters.courseId) }
    if (filters.due) { where.push('r.due_at<=?'); args.push(Date.now()) }
    if (filters.query) { where.push("(LOWER(c.front) LIKE ? OR LOWER(c.back) LIKE ? OR LOWER(c.subject) LIKE ? OR LOWER(c.chapter) LIKE ? OR LOWER(c.tags_json) LIKE ?)"); const q = `%${filters.query.toLowerCase()}%`; args.push(q, q, q, q, q) }
    if (filters.cursor) { where.push('(c.updated_at<? OR (c.updated_at=? AND c.id<?))'); args.push(filters.cursor.updatedAt, filters.cursor.updatedAt, filters.cursor.id) }
    const limit = Number.isFinite(filters.limit) ? Math.min(100, Math.max(1, Math.floor(filters.limit))) : 50
    const rows = this.db.prepare(`SELECT c.*,r.state review_state,r.due_at,r.interval_days,r.ease_factor,r.repetitions,r.lapses,r.last_rating,r.last_reviewed_at FROM flashcards c LEFT JOIN flashcard_reviews r ON r.card_id=c.id WHERE ${where.join(' AND ')} ORDER BY c.updated_at DESC,c.id DESC LIMIT ?`).all(...args, limit + 1)
    const hasMore = rows.length > limit, page = rows.slice(0, limit), last = page.at(-1)
    return {cards: page.map(cardView), nextCursor: hasMore && last ? Buffer.from(JSON.stringify({updatedAt: last.updated_at, id: last.id})).toString('base64url') : null}
  }
  createCard(userId, value) {
    if (!this.deck(userId, value.deckId)) return null
    const id = randomUUID(), now = new Date().toISOString(), source = value.source || {type: 'manual'}
    if (source.documentId && !this.db.prepare('SELECT 1 FROM study_documents WHERE id=? AND user_id=?').get(source.documentId, userId)) return null
    this.db.prepare(`INSERT INTO flashcards(id,user_id,deck_id,front,back,subject,chapter,tags_json,visual_json,source_type,source_course_id,source_document_id,source_section_id,source_locator_json,source_excerpt,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, userId, value.deckId, value.front, value.back, value.subject || null, value.chapter || null, JSON.stringify(value.tags || []), value.visual ? JSON.stringify(value.visual) : null, source.type, source.courseId || null, source.documentId || null, source.sectionId || null, source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null, now, now)
    this.db.prepare('INSERT INTO flashcard_reviews(card_id,user_id,state,due_at) VALUES(?,?,?,?)').run(id, userId, 'new', Date.now())
    return this.card(userId, id)
  }
  updateCard(userId, id, value) {
    const current = this.card(userId, id); if (!current) return null
    const next = {...current, ...Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))}
    if (!this.deck(userId, next.deckId)) return null
    const source = next.source || current.source
    if (source.documentId && !this.db.prepare('SELECT 1 FROM study_documents WHERE id=? AND user_id=?').get(source.documentId, userId)) return null
    this.db.prepare(`UPDATE flashcards SET deck_id=?,front=?,back=?,subject=?,chapter=?,tags_json=?,visual_json=?,source_type=?,source_course_id=?,source_document_id=?,source_section_id=?,source_locator_json=?,source_excerpt=?,updated_at=? WHERE id=? AND user_id=?`).run(next.deckId, next.front, next.back, next.subject || null, next.chapter || null, JSON.stringify(next.tags || []), next.visual ? JSON.stringify(next.visual) : null, source.type, source.courseId || null, source.documentId || null, source.sectionId || null, source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null, new Date().toISOString(), id, userId)
    return this.card(userId, id)
  }
  deleteCard(userId, id) { return Boolean(this.db.prepare('DELETE FROM flashcards WHERE id=? AND user_id=?').run(id, userId).changes) }
  reviewQueue(userId, deckId, limit = 30) {
    const args = [userId, Date.now()], deck = deckId ? ' AND c.deck_id=?' : ''; if (deckId) args.push(deckId)
    return this.db.prepare(`SELECT c.*,r.state review_state,r.due_at,r.interval_days,r.ease_factor,r.repetitions,r.lapses,r.last_rating,r.last_reviewed_at FROM flashcards c JOIN flashcard_reviews r ON r.card_id=c.id WHERE c.user_id=? AND r.due_at<=?${deck} ORDER BY r.due_at ASC,c.id ASC LIMIT ?`).all(...args, Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 30).map(cardView)
  }
  stats(userId) {
    const now = Date.now(), day = 86400000
    const totals = this.db.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN r.state='new' THEN 1 ELSE 0 END) new_cards,SUM(CASE WHEN r.due_at<=? THEN 1 ELSE 0 END) due,SUM(CASE WHEN r.repetitions>=3 AND r.interval_days>=21 THEN 1 ELSE 0 END) mastered FROM flashcards c JOIN flashcard_reviews r ON r.card_id=c.id WHERE c.user_id=?`).get(now, userId)
    const reviews = this.db.prepare(`SELECT COUNT(*) count,SUM(CASE WHEN rating!='again' THEN 1 ELSE 0 END) success FROM flashcard_review_logs WHERE user_id=?`).get(userId)
    const days = new Set(this.db.prepare('SELECT reviewed_at FROM flashcard_review_logs WHERE user_id=? ORDER BY reviewed_at DESC').all(userId).map(row => Math.floor(row.reviewed_at / day)))
    let streak = 0, cursor = Math.floor(now / day); if (!days.has(cursor)) cursor--
    while (days.has(cursor)) { streak++; cursor-- }
    const decks = this.db.prepare(`SELECT d.id,d.name,COUNT(c.id) total,SUM(CASE WHEN r.repetitions>=3 AND r.interval_days>=21 THEN 1 ELSE 0 END) mastered,SUM(CASE WHEN r.due_at<=? THEN 1 ELSE 0 END) due FROM flashcard_decks d LEFT JOIN flashcards c ON c.deck_id=d.id LEFT JOIN flashcard_reviews r ON r.card_id=c.id WHERE d.user_id=? GROUP BY d.id ORDER BY d.name`).all(now, userId)
    const courses = this.db.prepare(`SELECT source_course_id id,MAX(chapter) title,COUNT(*) total FROM flashcards WHERE user_id=? AND source_course_id IS NOT NULL GROUP BY source_course_id ORDER BY title`).all(userId)
    const subjects = this.db.prepare(`SELECT COALESCE(NULLIF(subject,''),'Sans matière') name,COUNT(*) total,SUM(CASE WHEN r.repetitions>=3 AND r.interval_days>=21 THEN 1 ELSE 0 END) mastered FROM flashcards c JOIN flashcard_reviews r ON r.card_id=c.id WHERE c.user_id=? GROUP BY COALESCE(NULLIF(subject,''),'Sans matière') ORDER BY total DESC`).all(userId)
    return {total: totals.total || 0, newCards: totals.new_cards || 0, dueToday: totals.due || 0, mastered: totals.mastered || 0, reviews: reviews.count || 0, successRate: reviews.count ? Math.round(reviews.success / reviews.count * 100) : 0, streak, decks, courses, subjects}
  }
}
