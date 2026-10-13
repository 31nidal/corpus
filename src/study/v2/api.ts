import type {DocumentPatch, DocumentResult, LibraryResult, StudyFolder} from './types'

async function request<T>(route: string, options: RequestInit = {}, prefix = '/api/study/v2/'): Promise<T> {
  const timeout = AbortSignal.timeout(30000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(prefix + route, {
      ...options, signal, credentials: 'same-origin',
      headers: {'x-mycorpus-request': '1', ...options.headers},
    })
  } catch (problem) {
    if (options.signal?.aborted) throw problem
    throw new Error(timeout.aborted ? 'Le serveur met trop de temps à répondre. Réessayez.' : 'Connexion au serveur impossible. Réessayez.')
  }
  let body
  try {body = await response.json()} catch {throw new Error('Réponse du serveur illisible. Réessayez.')}
  if (!response.ok) throw Object.assign(new Error(body.error || 'Le serveur n’a pas pu répondre.'), {status: response.status, code: body.code})
  return body
}
const json = (method: string, body: unknown) => ({method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
export function listLibrary(filters: {q: string; folderId?: string | null; archived: boolean}, signal?: AbortSignal) {
  const query = new URLSearchParams({q: filters.q, archived: String(filters.archived), limit: '100'})
  if (filters.folderId !== undefined) query.set('folderId', filters.folderId ?? '')
  return request<LibraryResult>('documents?' + query, {signal})
}
export const getDocumentMeta = (id: string, signal?: AbortSignal) => request<DocumentResult>('documents/' + encodeURIComponent(id), {signal})
export const patchDocument = (id: string, patch: DocumentPatch) => request<DocumentResult>('documents/' + encodeURIComponent(id), json('PATCH', patch))
export const createFolder = (name: string, parentId: string | null = null) => request<{folder: StudyFolder}>('folders', json('POST', {name, kind: parentId ? 'chapter' : 'subject', parentId}))
export function importPdf(file: File, requestId: string, consentOcr: boolean) {
  if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('Choisissez un PDF non vide de 25 Mo maximum.')
  return request<DocumentResult & {reused: boolean}>('documents/upload', {
    method: 'POST', body: file,
    headers: {'Content-Type': 'application/pdf', 'x-study-request-id': requestId,
      'x-document-filename': encodeURIComponent(file.name), 'x-document-title': encodeURIComponent(file.name.replace(/\.pdf$/i, '')),
      'x-document-ocr': consentOcr ? '1' : '0'},
  })
}
export const retryDocument = (id: string, requestId: string, consentOcr: boolean) => request('documents/' + encodeURIComponent(id) + '/retry', json('POST', {requestId, consentOcr}))
export async function getLegacyDocument(id: string, signal: AbortSignal): Promise<import('../myCoursesTypes').StudyDocument> {
  const body = await request<{document: import('../myCoursesTypes').StudyDocument}>('documents/' + encodeURIComponent(id), {signal}, '/api/study/')
  return body.document
}
