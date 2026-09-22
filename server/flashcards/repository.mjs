import {randomUUID} from 'node:crypto'
import {normalizeName} from './validation.mjs'
import {defaultFsrsScheduler} from './fsrsScheduler.mjs'
import {deriveCardsFromNote} from './derivation.mjs'

const parse = value => { try { return value ? JSON.parse(value) : null } catch { return null } }

export function getPreviousIanaDayString(dayString) {
  const [year, month, day] = dayString.split('-').map(Number)
  const prev = new Date(Date.UTC(year, month - 1, day - 1))
  const y = prev.getUTCFullYear()
  const m = String(prev.getUTCMonth() + 1).padStart(2, '0')
  const d = String(prev.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getStartOfDayIana(ms, timeZone = 'Europe/Paris') {
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: timeZone || 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  let dayStr
  try {
    dayStr = formatter.format(new Date(ms))
  } catch {
    dayStr = new Date(ms).toISOString().slice(0, 10)
  }
  const [y, m, d] = dayStr.split('-').map(Number)
  let guess = Date.UTC(y, m - 1, d)
  try {
    const dtFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Europe/Paris',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    for (let i = 0; i < 3; i++) {
      const parts = dtFmt.formatToParts(new Date(guess))
      const h = Number(parts.find(p => p.type === 'hour')?.value || 0) % 24
      const min = Number(parts.find(p => p.type === 'minute')?.value || 0)
      const s = Number(parts.find(p => p.type === 'second')?.value || 0)
      const offsetMs = (h * 3600 + min * 60 + s) * 1000
      if (offsetMs === 0) break
      guess -= offsetMs
    }
  } catch {
    // fallback to UTC day start if timezone invalid
  }
  return guess
}

export function cardView(row) {
  return {
    id: row.id,
    deckId: row.deck_id,
    noteId: row.note_id || null,
    derivationKey: row.derivation_key || null,
    noteVersion: row.note_version ?? null,
    cardType: row.card_type || 'basic',
    front: row.front,
    back: row.back,
    typedTarget: row.typed_target || null,
    acceptedAnswers: parse(row.accepted_answers_json) || [],
    subject: row.subject || '',
    chapter: row.chapter || '',
    tags: parse(row.tags_json) || [],
    visual: parse(row.visual_json),
    source: {
      type: row.source_type,
      courseId: row.source_course_id,
      documentId: row.source_document_id,
      sectionId: row.source_section_id,
      locator: parse(row.source_locator_json),
      excerpt: row.source_excerpt,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    review: row.due_at == null ? undefined : {
      state: row.review_state,
      dueAt: row.due_at,
      intervalDays: row.interval_days,
      easeFactor: row.ease_factor,
      repetitions: row.repetitions,
      lapses: row.lapses,
      lastRating: row.last_rating,
      lastReviewedAt: row.last_reviewed_at,
      stability: row.fsrs_stability ?? 0,
      difficulty: row.fsrs_difficulty ?? 0,
      fsrsReps: row.fsrs_reps ?? 0,
      learningSteps: row.fsrs_learning_steps ?? 0,
      scheduledDays: row.fsrs_scheduled_days ?? row.interval_days ?? 0,
      reviewVersion: row.review_version ?? 0,
      origin: row.fsrs_origin ?? 'new',
    },
  }
}

export function noteView(row, cards = []) {
  return {
    id: row.id,
    userId: row.user_id,
    defaultDeckId: row.default_deck_id,
    noteType: row.note_type,
    title: row.title || '',
    fields: parse(row.fields_json) || {},
    suppressedDerivations: parse(row.suppressed_derivations_json) || [],
    subject: row.subject || '',
    chapter: row.chapter || '',
    tags: parse(row.tags_json) || [],
    visual: parse(row.visual_json),
    source: {
      type: row.source_type,
      courseId: row.source_course_id,
      documentId: row.source_document_id,
      sectionId: row.source_section_id,
      locator: parse(row.source_locator_json),
      excerpt: row.source_excerpt,
    },
    schemaVersion: row.schema_version ?? 1,
    noteVersion: row.note_version ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cards: cards.map(cardView),
  }
}

const SELECT_CARD_FIELDS = `
  c.*,
  n.note_version,
  r.state review_state,
  r.due_at,
  r.interval_days,
  r.ease_factor,
  r.repetitions,
  r.lapses,
  r.last_rating,
  r.last_reviewed_at,
  r.fsrs_stability,
  r.fsrs_difficulty,
  r.fsrs_reps,
  r.fsrs_learning_steps,
  r.fsrs_scheduled_days,
  r.review_version,
  r.fsrs_origin
`

export class FlashcardRepository {
  constructor(db) { this.db = db }

  deck(userId, id) {
    return this.db.prepare('SELECT * FROM flashcard_decks WHERE id=? AND user_id=?').get(id, userId)
  }

  listDecks(userId) {
    return this.db.prepare(`
      SELECT d.*,
        COUNT(c.id) card_count,
        SUM(CASE WHEN r.due_at<=? THEN 1 ELSE 0 END) due_count
      FROM flashcard_decks d
      LEFT JOIN flashcards c ON c.deck_id=d.id AND c.user_id=d.user_id
      LEFT JOIN flashcard_reviews r ON r.card_id=c.id
      WHERE d.user_id=?
      GROUP BY d.id
      ORDER BY d.updated_at DESC
    `).all(Date.now(), userId).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      subject: row.subject || '',
      cardCount: row.card_count,
      dueCount: row.due_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  createDeck(userId, value) {
    const id = randomUUID(), now = new Date().toISOString()
    this.db.prepare('INSERT INTO flashcard_decks VALUES(?,?,?,?,?,?,?,?)').run(
      id, userId, value.name, normalizeName(value.name), value.description || null, value.subject || null, now, now
    )
    return this.listDecks(userId).find(deck => deck.id === id)
  }

  updateDeck(userId, id, value) {
    const current = this.deck(userId, id); if (!current) return null
    const next = {...current, ...Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))}, now = new Date().toISOString()
    this.db.prepare('UPDATE flashcard_decks SET name=?,name_normalized=?,description=?,subject=?,updated_at=? WHERE id=? AND user_id=?').run(
      next.name, normalizeName(next.name), next.description || null, next.subject || null, now, id, userId
    )
    return this.listDecks(userId).find(deck => deck.id === id)
  }

  deleteDeck(userId, id, destinationId) {
    if (!this.deck(userId, id)) return false
    if (destinationId) {
      if (destinationId === id || !this.deck(userId, destinationId)) return false
      this.db.prepare('UPDATE flashcards SET deck_id=?,updated_at=? WHERE deck_id=? AND user_id=?').run(
        destinationId, new Date().toISOString(), id, userId
      )
      this.db.prepare('UPDATE flashcard_notes SET default_deck_id=?,updated_at=? WHERE default_deck_id=? AND user_id=?').run(
        destinationId, new Date().toISOString(), id, userId
      )
    }
    this.db.prepare('DELETE FROM flashcard_decks WHERE id=? AND user_id=?').run(id, userId)
    return true
  }

  // --- NOTES CRUD ---

  note(userId, id) {
    const row = this.db.prepare('SELECT * FROM flashcard_notes WHERE id=? AND user_id=?').get(id, userId)
    if (!row) return null
    const cards = this.db.prepare(`
      SELECT ${SELECT_CARD_FIELDS}
      FROM flashcards c
      LEFT JOIN flashcard_notes n ON n.id=c.note_id
      LEFT JOIN flashcard_reviews r ON r.card_id=c.id
      WHERE c.note_id=? AND c.user_id=?
      ORDER BY c.created_at ASC, c.id ASC
    `).all(id, userId)
    return noteView(row, cards)
  }

  listNotes(userId, filters = {}) {
    const where = ['n.user_id=?'], args = [userId]
    if (filters.deckId) { where.push('n.default_deck_id=?'); args.push(filters.deckId) }
    if (filters.noteType) { where.push('n.note_type=?'); args.push(filters.noteType) }
    if (filters.subject) { where.push('n.subject=?'); args.push(filters.subject) }
    if (filters.chapter) { where.push('n.chapter=?'); args.push(filters.chapter) }
    if (filters.courseId) { where.push('n.source_course_id=?'); args.push(filters.courseId) }
    if (filters.query) {
      where.push('(LOWER(n.title) LIKE ? OR LOWER(n.fields_json) LIKE ? OR LOWER(n.subject) LIKE ? OR LOWER(n.chapter) LIKE ?)')
      const q = `%${filters.query.toLowerCase()}%`
      args.push(q, q, q, q)
    }
    if (filters.cursor) {
      where.push('(n.updated_at<? OR (n.updated_at=? AND n.id<?))')
      args.push(filters.cursor.updatedAt, filters.cursor.updatedAt, filters.cursor.id)
    }
    const limit = Number.isFinite(filters.limit) ? Math.min(100, Math.max(1, Math.floor(filters.limit))) : 50
    const rows = this.db.prepare(`
      SELECT n.*
      FROM flashcard_notes n
      WHERE ${where.join(' AND ')}
      ORDER BY n.updated_at DESC, n.id DESC
      LIMIT ?
    `).all(...args, limit + 1)
    const hasMore = rows.length > limit, page = rows.slice(0, limit), last = page.at(-1)

    const notes = page.map(row => {
      const cards = this.db.prepare(`
        SELECT ${SELECT_CARD_FIELDS}
        FROM flashcards c
        LEFT JOIN flashcard_notes n ON n.id=c.note_id
        LEFT JOIN flashcard_reviews r ON r.card_id=c.id
        WHERE c.note_id=? AND c.user_id=?
        ORDER BY c.created_at ASC, c.id ASC
      `).all(row.id, userId)
      return noteView(row, cards)
    })

    return {
      notes,
      nextCursor: hasMore && last ? Buffer.from(JSON.stringify({updatedAt: last.updated_at, id: last.id})).toString('base64url') : null,
    }
  }

  createNote(userId, value) {
    if (!this.deck(userId, value.defaultDeckId)) {
      throw Object.assign(new Error('Deck par défaut introuvable.'), {status: 400})
    }
    const id = randomUUID(), now = new Date().toISOString()
    const source = value.source || {type: 'manual'}
    if (source.documentId && !this.db.prepare('SELECT 1 FROM study_documents WHERE id=? AND user_id=?').get(source.documentId, userId)) {
      throw Object.assign(new Error('Document source introuvable.'), {status: 400})
    }

    const derivations = deriveCardsFromNote(value.noteType, value.fields, [])
    if (!derivations.length) {
      throw Object.assign(new Error('Impossible de générer des cartes depuis cette note.'), {status: 400})
    }

    this.db.exec('BEGIN IMMEDIATE')
    try {
      this.db.prepare(`
        INSERT INTO flashcard_notes(
          id, user_id, default_deck_id, note_type, title, fields_json,
          suppressed_derivations_json, subject, chapter, tags_json, visual_json,
          source_type, source_course_id, source_document_id, source_section_id,
          source_locator_json, source_excerpt, schema_version, note_version,
          created_at, updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        id, userId, value.defaultDeckId, value.noteType, value.title || null,
        JSON.stringify(value.fields), '[]', value.subject || null, value.chapter || null,
        JSON.stringify(value.tags || []), value.visual ? JSON.stringify(value.visual) : null,
        source.type, source.courseId || null, source.documentId || null, source.sectionId || null,
        source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null,
        1, 0, now, now
      )

      for (const d of derivations) {
        const cardId = randomUUID()
        this.db.prepare(`
          INSERT INTO flashcards(
            id, user_id, deck_id, note_id, derivation_key, card_type,
            front, back, typed_target, accepted_answers_json,
            subject, chapter, tags_json, visual_json,
            source_type, source_course_id, source_document_id, source_section_id,
            source_locator_json, source_excerpt, created_at, updated_at
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          cardId, userId, value.defaultDeckId, id, d.derivationKey, d.cardType,
          d.front, d.back, d.typedTarget || null, d.acceptedAnswers ? JSON.stringify(d.acceptedAnswers) : null,
          value.subject || null, value.chapter || null, JSON.stringify(value.tags || []),
          value.visual ? JSON.stringify(value.visual) : null,
          source.type, source.courseId || null, source.documentId || null, source.sectionId || null,
          source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null,
          now, now
        )

        this.db.prepare(`
          INSERT INTO flashcard_reviews(
            card_id, user_id, state, due_at, interval_days, ease_factor, repetitions, lapses,
            fsrs_stability, fsrs_difficulty, fsrs_reps, fsrs_learning_steps, fsrs_scheduled_days,
            review_version, fsrs_origin
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(cardId, userId, 'new', Date.now(), 0, 2.5, 0, 0, 0, 0, 0, 0, 0, 0, 'new')
      }

      this.db.exec('COMMIT')
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }

    return this.note(userId, id)
  }

  syncNoteDerivations(note) {
    const planned = deriveCardsFromNote(note.note_type, parse(note.fields_json) || {}, parse(note.suppressed_derivations_json) || [])
    const existingCards = this.db.prepare('SELECT * FROM flashcards WHERE note_id=? AND user_id=?').all(note.id, note.user_id)
    const existingByKey = new Map(existingCards.map(c => [c.derivation_key, c]))
    const plannedKeys = new Set(planned.map(p => p.derivationKey))
    const now = new Date().toISOString()

    const needsNewCard = planned.some(p => !existingByKey.has(p.derivationKey))
    if (needsNewCard) {
      if (!note.default_deck_id || !this.deck(note.user_id, note.default_deck_id)) {
        throw Object.assign(new Error('Un deck par défaut valide est requis pour créer de nouvelles cartes dérivées.'), {status: 400})
      }
    }

    for (const p of planned) {
      const existing = existingByKey.get(p.derivationKey)
      if (existing) {
        this.db.prepare(`
          UPDATE flashcards
          SET front=?, back=?, card_type=?, typed_target=?, accepted_answers_json=?, updated_at=?
          WHERE id=? AND user_id=?
        `).run(
          p.front, p.back, p.cardType, p.typedTarget || null,
          p.acceptedAnswers ? JSON.stringify(p.acceptedAnswers) : null,
          now, existing.id, note.user_id
        )
      } else {
        const cardId = randomUUID()
        this.db.prepare(`
          INSERT INTO flashcards(
            id, user_id, deck_id, note_id, derivation_key, card_type,
            front, back, typed_target, accepted_answers_json,
            subject, chapter, tags_json, visual_json,
            source_type, source_course_id, source_document_id, source_section_id,
            source_locator_json, source_excerpt, created_at, updated_at
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          cardId, note.user_id, note.default_deck_id, note.id, p.derivationKey, p.cardType,
          p.front, p.back, p.typedTarget || null,
          p.acceptedAnswers ? JSON.stringify(p.acceptedAnswers) : null,
          note.subject, note.chapter, note.tags_json, note.visual_json,
          note.source_type, note.source_course_id, note.source_document_id, note.source_section_id,
          note.source_locator_json, note.source_excerpt,
          now, now
        )
        this.db.prepare(`
          INSERT INTO flashcard_reviews(
            card_id, user_id, state, due_at, interval_days, ease_factor, repetitions, lapses,
            fsrs_stability, fsrs_difficulty, fsrs_reps, fsrs_learning_steps, fsrs_scheduled_days,
            review_version, fsrs_origin
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(cardId, note.user_id, 'new', Date.now(), 0, 2.5, 0, 0, 0, 0, 0, 0, 0, 0, 'new')
      }
    }

    for (const existing of existingCards) {
      if (!plannedKeys.has(existing.derivation_key)) {
        this.db.prepare('DELETE FROM flashcards WHERE id=? AND user_id=?').run(existing.id, note.user_id)
      }
    }
  }

  updateNote(userId, id, value, expectedVersion) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const current = this.db.prepare('SELECT * FROM flashcard_notes WHERE id=? AND user_id=?').get(id, userId)
      if (!current) {
        this.db.exec('ROLLBACK')
        return null
      }

      if (!Number.isSafeInteger(expectedVersion)) {
        throw Object.assign(new Error('expectedVersion obligatoire pour modifier une note.'), {status: 422})
      }
      if (current.note_version !== expectedVersion) {
        throw Object.assign(new Error('Conflit de version sur la note. Veuillez recharger.'), {status: 409})
      }

      const defaultDeckId = value.defaultDeckId !== undefined ? value.defaultDeckId : current.default_deck_id
      if (defaultDeckId && !this.deck(userId, defaultDeckId)) {
        throw Object.assign(new Error('Deck par défaut introuvable.'), {status: 400})
      }

      const noteType = value.noteType || current.note_type
      const currentFields = parse(current.fields_json) || {}

      const isFamilyChange = (
        (['basic', 'reverse', 'bidirectional'].includes(current.note_type) && !['basic', 'reverse', 'bidirectional'].includes(noteType)) ||
        (current.note_type === 'cloze' && noteType !== 'cloze') ||
        (current.note_type === 'typed' && noteType !== 'typed')
      )

      const baseFields = isFamilyChange ? {} : currentFields
      const fields = value.fields ? {...baseFields, ...value.fields} : baseFields

      // Strict validation of the complete canonical state for target noteType
      if (['basic', 'reverse', 'bidirectional'].includes(noteType)) {
        if (!fields.front || typeof fields.front !== 'string' || !fields.front.trim() ||
            !fields.back || typeof fields.back !== 'string' || !fields.back.trim()) {
          throw Object.assign(new Error(`Les champs front et back sont obligatoires et ne peuvent être vides pour le type ${noteType}.`), {status: 400})
        }
      } else if (noteType === 'cloze') {
        if (!fields.text || typeof fields.text !== 'string' || !fields.text.trim()) {
          throw Object.assign(new Error('Le champ text est obligatoire pour une note Texte à trous.'), {status: 400})
        }
        const matches = [...fields.text.matchAll(/\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g)]
        if (!matches.length) {
          throw Object.assign(new Error('Le texte doit contenir au moins un trou valide {{c1::mot}}.'), {status: 400})
        }
      } else if (noteType === 'typed') {
        if (!fields.front || typeof fields.front !== 'string' || !fields.front.trim() ||
            !fields.answer || typeof fields.answer !== 'string' || !fields.answer.trim()) {
          throw Object.assign(new Error('Les champs front et answer sont obligatoires pour une note Réponse saisie.'), {status: 400})
        }
      }
      const suppressed = parse(current.suppressed_derivations_json) || []

      const title = value.title !== undefined ? (value.title || null) : current.title
      const subject = value.subject !== undefined ? (value.subject || null) : current.subject
      const chapter = value.chapter !== undefined ? (value.chapter || null) : current.chapter
      const tags = value.tags !== undefined ? value.tags : (parse(current.tags_json) || [])
      const visual = value.visual !== undefined ? value.visual : parse(current.visual_json)
      const source = value.source || {
        type: current.source_type,
        courseId: current.source_course_id,
        documentId: current.source_document_id,
        sectionId: current.source_section_id,
        locator: parse(current.source_locator_json),
        excerpt: current.source_excerpt,
      }

      const now = new Date().toISOString()
      const nextVersion = current.note_version + 1

      // Compute new derivations
      const planned = deriveCardsFromNote(noteType, fields, suppressed)

      // Check existing cards
      const existingCards = this.db.prepare(`
        SELECT * FROM flashcards WHERE note_id=? AND user_id=?
      `).all(id, userId)
      const existingByKey = new Map(existingCards.map(c => [c.derivation_key, c]))
      const plannedKeys = new Set(planned.map(p => p.derivationKey))

      // Check if any new card needs to be created
      const needsNewCard = planned.some(p => !existingByKey.has(p.derivationKey))
      if (needsNewCard) {
        if (!defaultDeckId || !this.deck(userId, defaultDeckId)) {
          throw Object.assign(new Error('Un deck par défaut valide est requis pour créer de nouvelles cartes dérivées.'), {status: 400})
        }
      }

      // Update the note table
      this.db.prepare(`
        UPDATE flashcard_notes
        SET default_deck_id=?, note_type=?, title=?, fields_json=?,
            subject=?, chapter=?, tags_json=?, visual_json=?,
            source_type=?, source_course_id=?, source_document_id=?, source_section_id=?,
            source_locator_json=?, source_excerpt=?,
            note_version=?, updated_at=?
        WHERE id=? AND user_id=? AND note_version=?
      `).run(
        defaultDeckId, noteType, title, JSON.stringify(fields),
        subject, chapter, JSON.stringify(tags), visual ? JSON.stringify(visual) : null,
        source.type, source.courseId || null, source.documentId || null, source.sectionId || null,
        source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null,
        nextVersion, now, id, userId, current.note_version
      )

      // Sync derivations
      // 1. Update existing cards or insert new ones
      for (const p of planned) {
        const existing = existingByKey.get(p.derivationKey)
        if (existing) {
          this.db.prepare(`
            UPDATE flashcards
            SET front=?, back=?, card_type=?, typed_target=?, accepted_answers_json=?,
                subject=?, chapter=?, tags_json=?, visual_json=?,
                source_type=?, source_course_id=?, source_document_id=?, source_section_id=?,
                source_locator_json=?, source_excerpt=?, updated_at=?
            WHERE id=? AND user_id=?
          `).run(
            p.front, p.back, p.cardType, p.typedTarget || null,
            p.acceptedAnswers ? JSON.stringify(p.acceptedAnswers) : null,
            subject, chapter, JSON.stringify(tags), visual ? JSON.stringify(visual) : null,
            source.type, source.courseId || null, source.documentId || null, source.sectionId || null,
            source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null,
            now, existing.id, userId
          )
        } else {
          const cardId = randomUUID()
          this.db.prepare(`
            INSERT INTO flashcards(
              id, user_id, deck_id, note_id, derivation_key, card_type,
              front, back, typed_target, accepted_answers_json,
              subject, chapter, tags_json, visual_json,
              source_type, source_course_id, source_document_id, source_section_id,
              source_locator_json, source_excerpt, created_at, updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `).run(
            cardId, userId, defaultDeckId, id, p.derivationKey, p.cardType,
            p.front, p.back, p.typedTarget || null,
            p.acceptedAnswers ? JSON.stringify(p.acceptedAnswers) : null,
            subject, chapter, JSON.stringify(tags), visual ? JSON.stringify(visual) : null,
            source.type, source.courseId || null, source.documentId || null, source.sectionId || null,
            source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null,
            now, now
          )
          this.db.prepare(`
            INSERT INTO flashcard_reviews(
              card_id, user_id, state, due_at, interval_days, ease_factor, repetitions, lapses,
              fsrs_stability, fsrs_difficulty, fsrs_reps, fsrs_learning_steps, fsrs_scheduled_days,
              review_version, fsrs_origin
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `).run(cardId, userId, 'new', Date.now(), 0, 2.5, 0, 0, 0, 0, 0, 0, 0, 0, 'new')
        }
      }

      // 2. Delete cards whose derivation key is no longer in planned
      for (const existing of existingCards) {
        if (!plannedKeys.has(existing.derivation_key)) {
          this.db.prepare('DELETE FROM flashcards WHERE id=? AND user_id=?').run(existing.id, userId)
        }
      }

      this.db.exec('COMMIT')
      return this.note(userId, id)
    } catch (err) {
      try { this.db.exec('ROLLBACK') } catch {}
      throw err
    }
  }

  deleteNote(userId, id, expectedVersion) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const note = this.db.prepare('SELECT id, note_version FROM flashcard_notes WHERE id=? AND user_id=?').get(id, userId)
      if (!note) {
        this.db.exec('ROLLBACK')
        return false
      }
      if (!Number.isSafeInteger(expectedVersion)) {
        throw Object.assign(new Error('expectedVersion obligatoire pour supprimer une note.'), {status: 422})
      }
      if (note.note_version !== expectedVersion) {
        throw Object.assign(new Error('Conflit de version sur la note.'), {status: 409})
      }
      this.db.prepare('DELETE FROM flashcard_notes WHERE id=? AND user_id=?').run(id, userId)
      this.db.exec('COMMIT')
      return true
    } catch (err) {
      try { this.db.exec('ROLLBACK') } catch {}
      throw err
    }
  }

  restoreDerivation(userId, noteId, derivationKey, expectedVersion) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const note = this.db.prepare('SELECT * FROM flashcard_notes WHERE id=? AND user_id=?').get(noteId, userId)
      if (!note) {
        this.db.exec('ROLLBACK')
        return null
      }
      if (!Number.isSafeInteger(expectedVersion)) {
        throw Object.assign(new Error('expectedVersion obligatoire pour restaurer une dérivation.'), {status: 422})
      }
      if (note.note_version !== expectedVersion) {
        throw Object.assign(new Error('Conflit de version sur la note.'), {status: 409})
      }
      const suppressed = parse(note.suppressed_derivations_json) || []
      if (!suppressed.includes(derivationKey)) {
        this.db.exec('ROLLBACK')
        return this.note(userId, noteId)
      }
      const updatedSuppressed = suppressed.filter(k => k !== derivationKey)
      const now = new Date().toISOString()
      this.db.prepare(`
        UPDATE flashcard_notes
        SET suppressed_derivations_json=?, note_version=note_version + 1, updated_at=?
        WHERE id=? AND user_id=?
      `).run(JSON.stringify(updatedSuppressed), now, noteId, userId)

      const updatedNote = this.db.prepare('SELECT * FROM flashcard_notes WHERE id=? AND user_id=?').get(noteId, userId)
      this.syncNoteDerivations(updatedNote)
      this.db.exec('COMMIT')
      return this.note(userId, noteId)
    } catch (err) {
      try { this.db.exec('ROLLBACK') } catch {}
      throw err
    }
  }

  // --- CARDS CRUD ---

  card(userId, id) {
    const row = this.db.prepare(`
      SELECT ${SELECT_CARD_FIELDS}
      FROM flashcards c
      LEFT JOIN flashcard_notes n ON n.id=c.note_id
      LEFT JOIN flashcard_reviews r ON r.card_id=c.id
      WHERE c.id=? AND c.user_id=?
    `).get(id, userId)
    return row ? cardView(row) : null
  }

  listCards(userId, filters = {}) {
    const where = ['c.user_id=?'], args = [userId]
    if (filters.deckId) { where.push('c.deck_id=?'); args.push(filters.deckId) }
    for (const [field, values] of [['c.deck_id', filters.deckIds], ['c.id', filters.cardIds]]) {
      if (Array.isArray(values)) {
        where.push(values.length ? `${field} IN (${values.map(() => '?').join(',')})` : '0')
        args.push(...values)
      }
    }
    if (filters.noteId) { where.push('c.note_id=?'); args.push(filters.noteId) }
    if (filters.cardType) { where.push('c.card_type=?'); args.push(filters.cardType) }
    if (filters.subject) { where.push('c.subject=?'); args.push(filters.subject) }
    if (filters.chapter) { where.push('c.chapter=?'); args.push(filters.chapter) }
    if (filters.tag) { where.push('EXISTS (SELECT 1 FROM json_each(c.tags_json) WHERE LOWER(value)=LOWER(?))'); args.push(filters.tag) }
    if (filters.courseId) { where.push('c.source_course_id=?'); args.push(filters.courseId) }
    if (filters.due) { where.push('r.due_at<=?'); args.push(Date.now()) }
    if (filters.query) {
      where.push('(LOWER(c.front) LIKE ? OR LOWER(c.back) LIKE ? OR LOWER(c.subject) LIKE ? OR LOWER(c.chapter) LIKE ? OR LOWER(c.tags_json) LIKE ? OR LOWER(COALESCE(c.typed_target, \'\')) LIKE ?)')
      const q = `%${filters.query.toLowerCase()}%`
      args.push(q, q, q, q, q, q)
    }
    if (filters.cursor) {
      where.push('(c.updated_at<? OR (c.updated_at=? AND c.id<?))')
      args.push(filters.cursor.updatedAt, filters.cursor.updatedAt, filters.cursor.id)
    }
    const limit = Number.isFinite(filters.limit) ? Math.min(100, Math.max(1, Math.floor(filters.limit))) : 50
    const rows = this.db.prepare(`
      SELECT ${SELECT_CARD_FIELDS}
      FROM flashcards c
      LEFT JOIN flashcard_notes n ON n.id=c.note_id
      LEFT JOIN flashcard_reviews r ON r.card_id=c.id
      WHERE ${where.join(' AND ')}
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT ?
    `).all(...args, limit + 1)
    const hasMore = rows.length > limit, page = rows.slice(0, limit), last = page.at(-1)
    return {
      cards: page.map(cardView),
      nextCursor: hasMore && last ? Buffer.from(JSON.stringify({updatedAt: last.updated_at, id: last.id})).toString('base64url') : null,
    }
  }

  createCard(userId, value) {
    if (!this.deck(userId, value.deckId)) return null
    const id = randomUUID(), now = new Date().toISOString(), source = value.source || {type: 'manual'}
    if (source.documentId && !this.db.prepare('SELECT 1 FROM study_documents WHERE id=? AND user_id=?').get(source.documentId, userId)) return null
    this.db.prepare(`
      INSERT INTO flashcards(
        id, user_id, deck_id, note_id, derivation_key, card_type,
        front, back, typed_target, accepted_answers_json,
        subject, chapter, tags_json, visual_json,
        source_type, source_course_id, source_document_id, source_section_id,
        source_locator_json, source_excerpt, created_at, updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, userId, value.deckId, value.noteId || null, value.derivationKey || null, value.cardType || 'basic',
      value.front, value.back, value.typedTarget || null,
      value.acceptedAnswers ? JSON.stringify(value.acceptedAnswers) : null,
      value.subject || null, value.chapter || null,
      JSON.stringify(value.tags || []), value.visual ? JSON.stringify(value.visual) : null,
      source.type, source.courseId || null, source.documentId || null, source.sectionId || null,
      source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null, now, now
    )
    this.db.prepare(`
      INSERT INTO flashcard_reviews(
        card_id, user_id, state, due_at, interval_days, ease_factor, repetitions, lapses,
        fsrs_stability, fsrs_difficulty, fsrs_reps, fsrs_learning_steps, fsrs_scheduled_days,
        review_version, fsrs_origin
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id, userId, 'new', Date.now(), 0, 2.5, 0, 0, 0, 0, 0, 0, 0, 0, 'new')
    return this.card(userId, id)
  }

  updateCard(userId, id, value) {
    const current = this.card(userId, id); if (!current) return null
    if (current.noteId) {
      const keys = Object.keys(value).filter(k => value[k] !== undefined)
      const nonDeckKeys = keys.filter(k => k !== 'deckId')
      if (nonDeckKeys.length > 0) {
        throw Object.assign(new Error('Cette carte est dérivée d’une Note. Modifiez la Note parente.'), {status: 422})
      }
      if (value.deckId) {
        if (!this.deck(userId, value.deckId)) return null
        this.db.prepare('UPDATE flashcards SET deck_id=?, updated_at=? WHERE id=? AND user_id=?').run(value.deckId, new Date().toISOString(), id, userId)
        return this.card(userId, id)
      }
      return current
    }
    const next = {...current, ...Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))}
    if (!this.deck(userId, next.deckId)) return null
    const source = next.source || current.source
    if (source.documentId && !this.db.prepare('SELECT 1 FROM study_documents WHERE id=? AND user_id=?').get(source.documentId, userId)) return null
    this.db.prepare(`
      UPDATE flashcards
      SET deck_id=?, front=?, back=?, subject=?, chapter=?, tags_json=?, visual_json=?,
          source_type=?, source_course_id=?, source_document_id=?, source_section_id=?,
          source_locator_json=?, source_excerpt=?, updated_at=?
      WHERE id=? AND user_id=?
    `).run(
      next.deckId, next.front, next.back, next.subject || null, next.chapter || null,
      JSON.stringify(next.tags || []), next.visual ? JSON.stringify(next.visual) : null,
      source.type, source.courseId || null, source.documentId || null, source.sectionId || null,
      source.locator ? JSON.stringify(source.locator) : null, source.excerpt || null,
      new Date().toISOString(), id, userId
    )
    return this.card(userId, id)
  }

  deleteCard(userId, id, expectedVersion) {
    const card = this.db.prepare('SELECT id, user_id, note_id, derivation_key FROM flashcards WHERE id=? AND user_id=?').get(id, userId)
    if (!card) return false

    if (card.note_id) {
      if (!Number.isSafeInteger(expectedVersion)) {
        throw Object.assign(new Error('expectedVersion obligatoire pour supprimer une carte dérivée.'), {status: 422})
      }
      this.db.exec('BEGIN IMMEDIATE')
      try {
        const note = this.db.prepare('SELECT id, note_version, suppressed_derivations_json FROM flashcard_notes WHERE id=? AND user_id=?').get(card.note_id, userId)
        if (note) {
          if (note.note_version !== expectedVersion) {
            throw Object.assign(new Error('Conflit de version sur la note.'), {status: 409})
          }
          const suppressed = parse(note.suppressed_derivations_json) || []
          if (card.derivation_key && !suppressed.includes(card.derivation_key)) {
            suppressed.push(card.derivation_key)
          }
          this.db.prepare(`
            UPDATE flashcard_notes
            SET suppressed_derivations_json=?, note_version=note_version + 1, updated_at=?
            WHERE id=? AND user_id=?
          `).run(JSON.stringify(suppressed), new Date().toISOString(), note.id, userId)
        }
        this.db.prepare('DELETE FROM flashcards WHERE id=? AND user_id=?').run(id, userId)
        this.db.exec('COMMIT')
        return true
      } catch (err) {
        try { this.db.exec('ROLLBACK') } catch {}
        throw err
      }
    }

    return Boolean(this.db.prepare('DELETE FROM flashcards WHERE id=? AND user_id=?').run(id, userId).changes)
  }

  duplicateNote(userId, noteId, targetDeckId) {
    const original = this.db.prepare('SELECT * FROM flashcard_notes WHERE id=? AND user_id=?').get(noteId, userId)
    if (!original) return null
    let defaultDeckId = targetDeckId || original.default_deck_id
    if (!defaultDeckId) {
      const existingCard = this.db.prepare('SELECT deck_id FROM flashcards WHERE note_id=? AND user_id=? LIMIT 1').get(noteId, userId)
      defaultDeckId = existingCard?.deck_id
    }
    if (!defaultDeckId || !this.deck(userId, defaultDeckId)) {
      const anyDeck = this.db.prepare('SELECT id FROM flashcard_decks WHERE user_id=? LIMIT 1').get(userId)
      defaultDeckId = anyDeck?.id || null
    }
    if (!defaultDeckId) {
      throw Object.assign(new Error('Un deck valide est requis pour dupliquer la note.'), {status: 400})
    }

    const fields = parse(original.fields_json) || {}
    const tags = parse(original.tags_json) || []
    const visual = parse(original.visual_json) || null
    const source = {
      type: original.source_type,
      courseId: original.source_course_id,
      documentId: original.source_document_id,
      sectionId: original.source_section_id,
      locator: parse(original.source_locator_json),
      excerpt: original.source_excerpt,
    }

    return this.createNote(userId, {
      defaultDeckId,
      noteType: original.note_type,
      title: original.title ? `${original.title} (copie)` : undefined,
      fields,
      subject: original.subject || '',
      chapter: original.chapter || '',
      tags,
      visual,
      source,
    })
  }

  duplicateCard(userId, id, deckId) {
    const original = this.card(userId, id)
    if (!original) return null
    if (original.noteId) {
      const newNote = this.duplicateNote(userId, original.noteId, deckId)
      if (!newNote) return null
      const newCard = newNote.cards.find(c => c.derivationKey === original.derivationKey) || newNote.cards[0]
      return newCard || null
    }
    return this.createCard(userId, {...original, deckId: deckId || original.deckId})
  }

  // --- REVIEW QUEUE WITH DETERMINISTIC SIBLING BURYING ---

  reviewQueue(userId, deckId, limit = 30, timeZone = 'Europe/Paris', now = Date.now()) {
    const midnightIana = getStartOfDayIana(now, timeZone)
    const args = [userId, now]
    const deckFilter = deckId ? ' AND c.deck_id=?' : ''
    if (deckId) args.push(deckId)
    args.push(userId, midnightIana)
    const maxLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 30
    args.push(maxLimit)

    return this.db.prepare(`
      WITH eligible_cards AS (
        SELECT
          ${SELECT_CARD_FIELDS},
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(c.note_id, c.id)
            ORDER BY r.due_at ASC, c.id ASC
          ) AS rn
        FROM flashcards c
        LEFT JOIN flashcard_notes n ON n.id=c.note_id
        JOIN flashcard_reviews r ON r.card_id=c.id
        WHERE c.user_id=?
          AND r.due_at<=?
          ${deckFilter}
          AND NOT EXISTS (
            SELECT 1 FROM flashcards sibling
            JOIN flashcard_review_logs l ON l.card_id=sibling.id
            WHERE sibling.note_id IS NOT NULL
              AND sibling.note_id = c.note_id
              AND sibling.id <> c.id
              AND l.user_id = ?
              AND l.reviewed_at >= ?
          )
      )
      SELECT * FROM eligible_cards
      WHERE rn = 1
      ORDER BY due_at ASC, id ASC
      LIMIT ?
    `).all(...args).map(cardView)
  }

  stats(userId, timeZone = 'Europe/Paris', now = Date.now()) {
    const totals = this.db.prepare(`
      SELECT COUNT(*) total,
        SUM(CASE WHEN r.state='new' THEN 1 ELSE 0 END) new_cards,
        SUM(CASE WHEN r.due_at<=? THEN 1 ELSE 0 END) due,
        SUM(CASE WHEN r.repetitions>=3 AND r.interval_days>=21 THEN 1 ELSE 0 END) mastered
      FROM flashcards c
      JOIN flashcard_reviews r ON r.card_id=c.id
      WHERE c.user_id=?
    `).get(now, userId)

    const reviews = this.db.prepare(`
      SELECT COUNT(*) count,
        SUM(CASE WHEN rating!='again' THEN 1 ELSE 0 END) success
      FROM flashcard_review_logs
      WHERE user_id=?
    `).get(userId)

    const formatter = new Intl.DateTimeFormat('fr-CA', {
      timeZone: timeZone || 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const toDayString = ms => {
      try { return formatter.format(new Date(ms)) } catch { return new Date(ms).toISOString().slice(0, 10) }
    }

    const reviewRows = this.db.prepare('SELECT reviewed_at FROM flashcard_review_logs WHERE user_id=? ORDER BY reviewed_at DESC').all(userId)
    const days = new Set(reviewRows.map(row => toDayString(row.reviewed_at)))

    let streak = 0
    let cursorDay = toDayString(now)
    if (!days.has(cursorDay)) {
      cursorDay = getPreviousIanaDayString(cursorDay)
    }
    while (days.has(cursorDay)) {
      streak++
      cursorDay = getPreviousIanaDayString(cursorDay)
    }

    const decks = this.db.prepare(`
      SELECT d.id, d.name, COUNT(c.id) total,
        SUM(CASE WHEN r.repetitions>=3 AND r.interval_days>=21 THEN 1 ELSE 0 END) mastered,
        SUM(CASE WHEN r.due_at<=? THEN 1 ELSE 0 END) due
      FROM flashcard_decks d
      LEFT JOIN flashcards c ON c.deck_id=d.id AND c.user_id=d.user_id
      LEFT JOIN flashcard_reviews r ON r.card_id=c.id
      WHERE d.user_id=?
      GROUP BY d.id
      ORDER BY d.name
    `).all(now, userId)

    const courses = this.db.prepare(`
      SELECT source_course_id id, MAX(chapter) title, COUNT(*) total
      FROM flashcards
      WHERE user_id=? AND source_course_id IS NOT NULL
      GROUP BY source_course_id
      ORDER BY title
    `).all(userId)

    const subjects = this.db.prepare(`
      SELECT COALESCE(NULLIF(subject,''),'Sans matière') name, COUNT(*) total,
        SUM(CASE WHEN r.repetitions>=3 AND r.interval_days>=21 THEN 1 ELSE 0 END) mastered
      FROM flashcards c
      JOIN flashcard_reviews r ON r.card_id=c.id
      WHERE c.user_id=?
      GROUP BY COALESCE(NULLIF(subject,''),'Sans matière')
      ORDER BY total DESC
    `).all(userId)

    return {
      total: totals.total || 0,
      newCards: totals.new_cards || 0,
      dueToday: totals.due || 0,
      mastered: totals.mastered || 0,
      reviews: reviews.count || 0,
      successRate: reviews.count ? Math.round(reviews.success / reviews.count * 100) : 0,
      streak,
      decks,
      courses,
      subjects,
    }
  }
}
