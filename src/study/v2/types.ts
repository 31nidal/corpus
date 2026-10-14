import type {StudyDocument} from '../myCoursesTypes'

export type ProcessingState = 'imported' | 'processing' | 'ready' | 'partial' | 'needs_attention' | 'failed'
export type DocumentMeta = Pick<StudyDocument, 'id' | 'title' | 'filename' | 'fileSize' | 'pageCount' | 'createdAt' | 'updatedAt' | 'sectionCount' | 'errorMessage'> & {
  folderId: string | null
  archivedAt: number | null
  lastOpenedAt: number | null
  readingPage: number
  processingState: ProcessingState
  version: number
  metadataUpdatedAt: number | null
}
export type StudyFolder = {id: string; name: string; kind: 'subject' | 'chapter'; parentId: string | null}
export type DocumentJob = {
  id: string; documentId: string
  state: 'queued' | 'running' | 'succeeded' | 'failed' | 'needs_attention' | 'interrupted'
  stage: string; attempts: number; errorCode: string | null; errorMessage: string | null; updatedAt: number
}
export type LibraryResult = {documents: DocumentMeta[]; folders: StudyFolder[]; nextOffset: number | null}
export type DocumentResult = {document: DocumentMeta; job: DocumentJob | null}
export type DocumentPatch = Partial<Pick<DocumentMeta, 'title' | 'folderId' | 'readingPage'>> & {
  archived?: boolean; opened?: boolean; expectedUpdatedAt?: number | null
}
export type PdfSelection = {text: string; page: number}
export const processingLabels: Record<ProcessingState, string> = {
  imported: 'Importé · en attente', processing: 'Traitement en cours', ready: 'Prêt',
  partial: 'Extraction partielle · à vérifier', needs_attention: 'Intervention nécessaire', failed: 'Échec du traitement',
}

export type RevisionNoteItem = {
  id: string; sectionId: string | null; sectionTitle: string
  sourceSupplement?: boolean; text: string; originalText: string; originalCategory?: string; category: string; sourceExcerpt: string
  page: number; endPage: number; exactPage: boolean; edited: boolean; proofStatus: 'matched' | 'unverified'; sourceTable?: string[][]
}
export type RevisionNote = {
  id: string; documentId: string; title: string; kind: 'short' | 'structured' | 'detailed'
  origin: 'generated' | 'legacy'; state: 'draft' | 'saved'
  generationState: 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted'
  extraction: {method: string; warnings: string[]}; sourceState: string
  sourceVersion: number; editVersion: number; items: RevisionNoteItem[]
  sections: {id: string; title: string; startPage: number; endPage: number}[]
  selection: PdfSelection | null; generation: import('../ai/GenerationNotice').GenerationInfo
  coverage: {sectionsTotal: number; sectionsRepresented: number; missingSections: {id: string; title: string}[]; missingQuantities: {sectionId: string; sectionTitle: string; value: string}[]; edited: boolean; message: string}
  errorCode: string | null; errorMessage: string | null; createdAt: number; updatedAt: number
}
export type RevisionNoteHeader = Omit<RevisionNote, 'items'> & {itemCount: number}
export type NoteGeneration = {requestId: string; kind: RevisionNote['kind']; sectionIds?: string[]; selection?: PdfSelection}
export type NoteEdit = {expectedEditVersion: number; title: string; state: 'draft' | 'saved'; items: Pick<RevisionNoteItem, 'id' | 'text' | 'category'>[]}
