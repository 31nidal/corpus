const sourceTypes = new Set(['manual', 'catalog_course', 'study_document', 'qcm_error', 'free_text'])
export const ratings = new Set(['again', 'hard', 'good', 'easy'])

export function cleanText(value, max, required = false) {
  if (value == null) return required ? null : ''
  if (typeof value !== 'string') return null
  const clean = value.trim()
  if ((required && !clean) || clean.length > max) return null
  return clean
}

export function normalizeName(value) {
  return value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

export function validateTags(value) {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > 20) return null
  const tags = value.map(tag => cleanText(tag, 50, true))
  if (tags.some(tag => tag === null)) return null
  return [...new Set(tags)]
}

export function validateVisual(value) {
  if (value == null) return null
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const type = cleanText(value.type, 30, true)
  const url = cleanText(value.url, 1000)
  const alt = cleanText(value.alt, 300)
  const resourceId = cleanText(value.resourceId, 150)
  if (!type || url === null || alt === null || resourceId === null) return undefined
  if (url && !(/^https:\/\//.test(url) || url.startsWith('/'))) return undefined
  const visual = {type, ...(url ? {url} : {}), ...(alt ? {alt} : {}), ...(resourceId ? {resourceId} : {})}
  if (Number.isSafeInteger(value.page) && value.page > 0 && value.page < 100000) visual.page = value.page
  return visual
}

export function validateCard(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const front = input.front === undefined && partial ? undefined : cleanText(input.front, 2000, true)
  const back = input.back === undefined && partial ? undefined : cleanText(input.back, 8000, true)
  const deckId = input.deckId === undefined && partial ? undefined : cleanText(input.deckId, 100, true)
  const subject = input.subject === undefined && partial ? undefined : cleanText(input.subject, 150)
  const chapter = input.chapter === undefined && partial ? undefined : cleanText(input.chapter, 200)
  const tags = input.tags === undefined && partial ? undefined : validateTags(input.tags)
  const visual = input.visual === undefined && partial ? undefined : validateVisual(input.visual)
  if (front === null || back === null || deckId === null || subject === null || chapter === null || tags === null || (input.visual !== undefined && visual === undefined)) return null
  const source = input.source && typeof input.source === 'object' && !Array.isArray(input.source) ? input.source : {}
  const sourceType = input.source === undefined && partial ? undefined : (sourceTypes.has(source.type) ? source.type : 'manual')
  const sourceFields = {}
  for (const [key, max] of [['courseId', 150], ['documentId', 100], ['sectionId', 180], ['excerpt', 1500]]) {
    const cleaned = cleanText(source[key], max)
    if (cleaned === null) return null
    sourceFields[key] = cleaned || null
  }
  let locator = null
  if (source.locator != null) {
    if (!source.locator || typeof source.locator !== 'object' || Array.isArray(source.locator) || JSON.stringify(source.locator).length > 1500) return null
    locator = source.locator
  }
  return {front, back, deckId, subject, chapter, tags, visual, source: sourceType === undefined ? undefined : {type: sourceType, ...sourceFields, locator}}
}

export function validateDeck(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const name = input.name === undefined && partial ? undefined : cleanText(input.name, 100, true)
  const description = input.description === undefined && partial ? undefined : cleanText(input.description, 500)
  const subject = input.subject === undefined && partial ? undefined : cleanText(input.subject, 150)
  if (name === null || description === null || subject === null) return null
  return {name, description, subject}
}

export function validateNote(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  const noteType = input.noteType === undefined && partial ? undefined : cleanText(input.noteType, 50, true)
  if (noteType !== undefined && !['basic', 'reverse', 'bidirectional', 'cloze', 'typed'].includes(noteType)) {
    return null
  }

  const defaultDeckId = input.defaultDeckId === undefined && partial ? undefined : cleanText(input.defaultDeckId, 100, !partial)
  if (input.defaultDeckId !== undefined && defaultDeckId === null) return null

  const title = input.title === undefined && partial ? undefined : cleanText(input.title, 200)
  const subject = input.subject === undefined && partial ? undefined : cleanText(input.subject, 150)
  const chapter = input.chapter === undefined && partial ? undefined : cleanText(input.chapter, 200)
  const tags = input.tags === undefined && partial ? undefined : validateTags(input.tags)
  const visual = input.visual === undefined && partial ? undefined : validateVisual(input.visual)

  if (title === null || subject === null || chapter === null || tags === null || (input.visual !== undefined && visual === undefined)) {
    return null
  }

  let fields = undefined
  if (input.fields !== undefined || !partial) {
    if (!input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields)) return null
    const f = input.fields
    if (noteType === 'basic' || noteType === 'reverse' || noteType === 'bidirectional') {
      const front = cleanText(f.front, 2000, true)
      const back = cleanText(f.back, 8000, true)
      if (!front || !back) return null
      fields = {front, back}
    } else if (noteType === 'cloze') {
      const text = cleanText(f.text, 8000, true)
      if (!text) return null
      // Check cloze syntax
      const keys = [...text.matchAll(/\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g)]
      if (!keys.length) return null
      const extra = cleanText(f.extra, 4000)
      if (extra === null) return null
      fields = {text, extra: extra || ''}
    } else if (noteType === 'typed') {
      const front = cleanText(f.front, 2000, true)
      const answer = cleanText(f.answer, 2000, true)
      if (!front || !answer) return null
      let acceptedAnswers = []
      if (f.acceptedAnswers !== undefined) {
        if (!Array.isArray(f.acceptedAnswers) || f.acceptedAnswers.length > 20) return null
        const cleanedAnswers = f.acceptedAnswers.map(a => cleanText(a, 500, true))
        if (cleanedAnswers.some(a => a === null)) return null
        acceptedAnswers = [...new Set(cleanedAnswers)]
      }
      const extra = cleanText(f.extra, 4000)
      if (extra === null) return null
      fields = {front, answer, acceptedAnswers, extra: extra || ''}
    } else if (partial && noteType === undefined) {
      // Partial update without changing noteType; validate generic field strings
      fields = {}
      if (f.front !== undefined) {
        const front = cleanText(f.front, 2000, true)
        if (!front) return null
        fields.front = front
      }
      if (f.back !== undefined) {
        const back = cleanText(f.back, 8000, true)
        if (!back) return null
        fields.back = back
      }
      if (f.text !== undefined) {
        const text = cleanText(f.text, 8000, true)
        if (!text) return null
        const keys = [...text.matchAll(/\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g)]
        if (!keys.length) return null
        fields.text = text
      }
      if (f.answer !== undefined) {
        const answer = cleanText(f.answer, 2000, true)
        if (!answer) return null
        fields.answer = answer
      }
      if (f.extra !== undefined) {
        const extra = cleanText(f.extra, 4000)
        if (extra === null) return null
        fields.extra = extra || ''
      }
      if (f.acceptedAnswers !== undefined) {
        if (!Array.isArray(f.acceptedAnswers) || f.acceptedAnswers.length > 20) return null
        const cleanedAnswers = f.acceptedAnswers.map(a => cleanText(a, 500, true))
        if (cleanedAnswers.some(a => a === null)) return null
        fields.acceptedAnswers = [...new Set(cleanedAnswers)]
      }
    } else {
      return null
    }
  }

  const source = input.source && typeof input.source === 'object' && !Array.isArray(input.source) ? input.source : {}
  const sourceType = input.source === undefined && partial ? undefined : (sourceTypes.has(source.type) ? source.type : 'manual')
  const sourceFields = {}
  for (const [key, max] of [['courseId', 150], ['documentId', 100], ['sectionId', 180], ['excerpt', 1500]]) {
    const cleaned = cleanText(source[key], max)
    if (cleaned === null) return null
    sourceFields[key] = cleaned || null
  }
  let locator = null
  if (source.locator != null) {
    if (!source.locator || typeof source.locator !== 'object' || Array.isArray(source.locator) || JSON.stringify(source.locator).length > 1500) return null
    locator = source.locator
  }

  let expectedVersion = undefined
  if (input.expectedVersion !== undefined) {
    if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) return null
    expectedVersion = input.expectedVersion
  }

  return {
    noteType,
    defaultDeckId,
    title,
    fields,
    subject,
    chapter,
    tags,
    visual,
    expectedVersion,
    source: sourceType === undefined ? undefined : {type: sourceType, ...sourceFields, locator},
  }
}

