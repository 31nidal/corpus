export type FlashcardDeck = {
  id: string
  name: string
  description: string
  subject: string
  cardCount: number
  dueCount: number
  createdAt: string
  updatedAt: string
}

export type FlashcardSource = {
  type: 'manual' | 'catalog_course' | 'study_document' | 'qcm_error' | 'free_text'
  courseId?: string | null
  documentId?: string | null
  sectionId?: string | null
  locator?: Record<string, unknown> | null
  excerpt?: string | null
}

export type ImageOcclusionMask = {
  id: string
  x: number
  y: number
  width: number
  height: number
  label?: string
}

export type FlashcardVisual = {
  type: string
  url?: string
  alt?: string
  resourceId?: string
  page?: number
  assetId?: string
  targetMaskId?: string
  targetRect?: {
    x: number
    y: number
    width: number
    height: number
  }
  modelKey?: string
  atlasRevision?: string
  targetId?: string
  structureId?: string
}

export type FlashcardAsset = {
  id: string
  userId: string
  kind: string
  mimeType: string
  width: number
  height: number
  byteSize: number
  sha256: string
  storageKey: string
  sourceKind: string
  sourceDocumentId?: string | null
  sourcePage?: number | null
  sourceCrop?: {x: number; y: number; width: number; height: number} | null
  createdAt: number
}

export type FlashcardReview = {
  state: string
  dueAt: number
  intervalDays: number
  easeFactor: number
  repetitions: number
  lapses: number
  lastRating?: string | null
  lastReviewedAt?: number | null
  stability?: number
  difficulty?: number
  fsrsReps?: number
  learningSteps?: number
  scheduledDays?: number
  reviewVersion?: number
  origin?: string
}

export type FlashcardPreviewLabels = {
  again: string
  hard: string
  good: string
  easy: string
}

export type FlashcardPreview = {
  id: string
  labels: FlashcardPreviewLabels
}

export type NoteType = 'basic' | 'reverse' | 'bidirectional' | 'cloze' | 'typed' | 'image_occlusion' | 'atlas_3d'
export type CardType = 'basic' | 'cloze' | 'typed' | 'image_occlusion' | 'atlas_3d'

export type Atlas3DTarget = {
  id: string
  structureId: string
}

export type Atlas3DScene = {
  modelKey: 'bp3d_overview' | 'bp3d_detail' | 'female_detail'
  atlasRevision: string
  camera: {
    position: [number, number, number]
    target: [number, number, number]
  }
  visibility: Partial<Record<string, boolean>>
  opacity: Partial<Record<string, number>>
  cut: {
    enabled: boolean
    axis: 'x' | 'y' | 'z'
    position: number
    flipped: boolean
    guide: boolean
  }
  isolationStructureId: string | null
  hiddenStructureIds: string[]
}

export type FlashcardNoteFields = {
  front?: string
  back?: string
  text?: string
  answer?: string
  acceptedAnswers?: string[]
  extra?: string
  prompt?: string
  occlusionMode?: 'hide_one'
  masks?: ImageOcclusionMask[]
  modelKey?: 'bp3d_overview' | 'bp3d_detail' | 'female_detail'
  atlasRevision?: string
  scene?: Atlas3DScene
  targets?: Atlas3DTarget[]
}

export type FlashcardNote = {
  id: string
  defaultDeckId?: string | null
  noteType: NoteType
  title: string
  fields: FlashcardNoteFields
  suppressedDerivations: string[]
  subject: string
  chapter: string
  tags: string[]
  visual?: FlashcardVisual | null
  assetId?: string | null
  source: FlashcardSource
  schemaVersion: number
  noteVersion: number
  createdAt: string
  updatedAt: string
  cards: Flashcard[]
}

export type Flashcard = {
  id: string
  deckId: string
  noteId?: string | null
  derivationKey?: string | null
  noteVersion?: number | null
  cardType?: CardType
  front: string
  back: string
  typedTarget?: string | null
  acceptedAnswers?: string[]
  subject: string
  chapter: string
  tags: string[]
  visual?: FlashcardVisual | null
  source: FlashcardSource
  createdAt: string
  updatedAt: string
  review?: FlashcardReview
  preview?: FlashcardPreview
}

export type FlashcardDraft = {
  temporaryId: string
  front: string
  back: string
  subject: string
  chapter: string
  tags: string[]
  selected: boolean
  source: FlashcardSource
}

export type FlashcardNoteDraft = {
  temporaryId: string
  noteType: NoteType
  title?: string
  fields: FlashcardNoteFields
  subject?: string
  chapter?: string
  tags: string[]
  selected: boolean
  source: FlashcardSource
  rationale?: string
}

export type FlashcardStats = {
  total: number
  newCards: number
  dueToday: number
  mastered: number
  reviews: number
  successRate: number
  streak: number
  decks: {id: string; name: string; total: number; mastered: number; due: number}[]
  courses: {id: string; title: string; total: number}[]
  subjects: {name: string; total: number; mastered: number}[]
}

export type GenerationSource = {
  kind: 'catalog' | 'study' | 'text' | 'qcm-error'
  title: string
  qcm?: {front: string; back: string}
  text?: string
  courseId?: string
  documentId?: string
  sectionId?: string
  pageCount?: number
  subject?: string
  chapter?: string
  sections?: {id: string; title: string; text?: string; startPage?: number; endPage?: number}[]
  locator?: Record<string, unknown>
}
