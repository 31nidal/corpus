import type {Flashcard, FlashcardDeck, FlashcardDraft, FlashcardPreview, FlashcardStats, FlashcardReview, GenerationSource, FlashcardNote} from './flashcardsTypes'

const headers = {'Content-Type': 'application/json', 'x-mycorpus-request': '1'}
const clientTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
  } catch {
    return 'Europe/Paris'
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  let response: Response
  try {
    response = await fetch('/api/flashcards/' + path, {
      credentials: 'same-origin',
      signal: AbortSignal.timeout(45000),
      ...options,
      headers: {...headers, ...options.headers},
    })
  } catch {
    throw new Error('Connexion interrompue ou délai dépassé. Vos modifications restent affichées ; réessayez.')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Service flashcards indisponible.')
  return body as T
}

export const listDecks = async () => (await request<{decks: FlashcardDeck[]}>('decks', {headers: {}})).decks

export const createDeck = async (value: {name: string; description?: string; subject?: string}) =>
  (await request<{deck: FlashcardDeck}>('decks', {method: 'POST', body: JSON.stringify(value)})).deck

export const updateDeck = async (id: string, value: Partial<Pick<FlashcardDeck, 'name' | 'description' | 'subject'>>) =>
  (await request<{deck: FlashcardDeck}>(`decks/${encodeURIComponent(id)}`, {method: 'PATCH', body: JSON.stringify(value)})).deck

export const deleteDeck = async (id: string, destinationDeckId?: string) =>
  request(`decks/${encodeURIComponent(id)}`, {method: 'DELETE', body: JSON.stringify({destinationDeckId})})

export async function listCards(filters: Record<string, string | number | boolean | undefined> = {}) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== '' && v !== false) params.set(k, String(v))
  return request<{cards: Flashcard[]; nextCursor: string | null}>('cards?' + params, {headers: {}})
}

export const createCard = async (value: Partial<Flashcard> & {deckId: string; front: string; back: string}) =>
  (await request<{card: Flashcard}>('cards', {method: 'POST', body: JSON.stringify(value)})).card

export const createCards = async (cards: (Partial<Flashcard> & {deckId: string; front: string; back: string})[], requestId?: string) =>
  (await request<{cards: Flashcard[]}>('cards/bulk', {method: 'POST', body: JSON.stringify({cards, requestId})})).cards

export const updateCard = async (id: string, value: Partial<Flashcard>) =>
  (await request<{card: Flashcard}>(`cards/${encodeURIComponent(id)}`, {method: 'PATCH', body: JSON.stringify(value)})).card

export const deleteCard = async (id: string, expectedVersion?: number) =>
  request(`cards/${encodeURIComponent(id)}`, {method: 'DELETE', body: JSON.stringify({expectedVersion})})

export async function listNotes(filters: Record<string, string | number | boolean | undefined> = {}) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== '' && v !== false) params.set(k, String(v))
  return request<{notes: FlashcardNote[]; nextCursor: string | null}>('notes?' + params, {headers: {}})
}

export const fetchNote = async (id: string) =>
  (await request<{note: FlashcardNote}>(`notes/${encodeURIComponent(id)}`, {headers: {}})).note

export const createNote = async (value: Partial<FlashcardNote>) =>
  (await request<{note: FlashcardNote}>('notes', {method: 'POST', body: JSON.stringify(value)})).note

export const updateNote = async (id: string, value: Partial<FlashcardNote>, expectedVersion?: number) =>
  (await request<{note: FlashcardNote}>(`notes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({...value, expectedVersion}),
  })).note

export const deleteNote = async (id: string, expectedVersion?: number) =>
  request(`notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({expectedVersion}),
  })

export const restoreDerivation = async (noteId: string, derivationKey: string, expectedVersion?: number) =>
  (await request<{note: FlashcardNote}>(`notes/${encodeURIComponent(noteId)}/derivations/${encodeURIComponent(derivationKey)}/restore`, {
    method: 'POST',
    body: JSON.stringify({expectedVersion}),
  })).note

export const duplicateCard = async (id: string, deckId?: string) =>
  (await request<{card: Flashcard}>(`cards/${encodeURIComponent(id)}/duplicate`, {method: 'POST', body: JSON.stringify({deckId})})).card

export const moveCard = async (id: string, deckId: string) =>
  (await request<{card: Flashcard}>(`cards/${encodeURIComponent(id)}/move`, {method: 'POST', body: JSON.stringify({deckId})})).card

export const reviewQueue = async (deckId?: string) =>
  (await request<{cards: Flashcard[]}>('review' + (deckId ? `?deck=${encodeURIComponent(deckId)}` : ''), {
    headers: {'x-timezone': clientTimezone()},
  })).cards

export const previewCard = async (id: string) =>
  request<{preview: FlashcardPreview}>(`cards/${encodeURIComponent(id)}/preview`, {
    method: 'POST',
    body: '{}',
  })

export const reviewCard = async (
  id: string,
  rating: 'again' | 'hard' | 'good' | 'easy',
  responseMs: number,
  expectedDueAt?: number,
  expectedVersion?: number,
  previewId?: string
) =>
  request<{review: FlashcardReview}>(`cards/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: JSON.stringify({rating, responseMs, expectedDueAt, expectedVersion, previewId}),
  })

export const fetchStats = async () =>
  (await request<{stats: FlashcardStats}>('stats', {
    headers: {'x-timezone': clientTimezone()},
  })).stats

export async function generateDrafts(
  source: GenerationSource,
  level: 'essential' | 'standard' | 'complete',
  count: number,
  sectionIds: string[],
  pages?: {startPage?: number; endPage?: number}
) {
  const selected = source.sections?.filter(section => sectionIds.includes(section.id)) || []
  const text = source.text || selected.map(section => `${section.title}. ${section.text || ''}`).join('\n')
  const payload = {
    text,
    qcm: source.qcm,
    segments: selected.map(section => ({
      id: section.id,
      title: section.title,
      text: section.text || '',
      startPage: section.startPage,
      endPage: section.endPage,
    })),
    level,
    count,
    courseId: source.courseId,
    documentId: source.documentId,
    subject: source.subject,
    chapter: source.chapter || source.title,
    sectionIds,
    sectionId: source.sectionId || (selected.length === 1 ? selected[0].id : undefined),
    locator: source.locator,
    ...pages,
  }
  return request<{drafts: FlashcardDraft[]; generation: {mode: string; produced: number; persisted: boolean}}>(
    `generate/${source.kind}`,
    {method: 'POST', body: JSON.stringify(payload)}
  )
}

export async function exportAnki(filters: Record<string, unknown> = {}) {
  const response = await fetch('/api/flashcards/export', {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify(filters),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Export impossible.')
  }
  return response.text()
}

export function downloadCsv(content: string, name = 'mycorpus-flashcards.csv') {
  const blob = new Blob([content], {type: 'text/csv;charset=utf-8'}),
    url = URL.createObjectURL(blob),
    link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
