import type {StudyDocument} from '../myCoursesTypes'

export type ProcessingState = 'imported' | 'processing' | 'ready' | 'partial' | 'needs_attention' | 'failed'
export type DocumentMeta = Pick<StudyDocument, 'id' | 'title' | 'filename' | 'fileSize' | 'pageCount' | 'createdAt' | 'updatedAt' | 'sectionCount' | 'errorMessage'> & {
  folderId: string | null
  archivedAt: number | null
  lastOpenedAt: number | null
  readingPage: number
  processingState: ProcessingState
  version: number
  metadataUpdatedAt: number
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
  archived?: boolean; opened?: boolean; expectedUpdatedAt?: number
}
export type PdfSelection = {text: string; page: number}
export const processingLabels: Record<ProcessingState, string> = {
  imported: 'Importé · en attente', processing: 'Traitement en cours', ready: 'Prêt',
  partial: 'Extraction partielle · à vérifier', needs_attention: 'Intervention nécessaire', failed: 'Échec du traitement',
}
