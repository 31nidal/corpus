import type { StudyDocument, StudyQuota, StudyQuestion, StudySummary } from './myCoursesTypes'

export async function fetchStudyQuotas(): Promise<StudyQuota | null> {
  try {
    const res = await fetch('/api/study/quotas', { credentials: 'same-origin' })
    if (!res.ok) return null
    const data = await res.json()
    return data.quota || null
  } catch {
    return null
  }
}

export async function fetchStudyDocuments(): Promise<StudyDocument[]> {
  const res = await fetch('/api/study/documents', { credentials: 'same-origin' })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Connexion requise pour accéder à vos cours.')
    throw new Error('Impossible de charger vos cours.')
  }
  const data = await res.json()
  return data.documents || []
}

export async function fetchStudyDocument(id: string): Promise<StudyDocument> {
  const res = await fetch(`/api/study/documents/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Document introuvable.')
    throw new Error('Erreur lors de la récupération du cours.')
  }
  const data = await res.json()
  return data.document
}

export const MAX_STUDY_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 Mo (26 214 400 octets)

export async function uploadStudyDocument(file: File, title?: string): Promise<StudyDocument> {
  if (file.size > MAX_STUDY_FILE_SIZE_BYTES) {
    throw new Error('Le fichier dépasse la taille maximale autorisée de 25 Mo.')
  }

  const customTitle = title?.trim() || file.name.replace(/\.pdf$/i, '')

  const res = await fetch('/api/study/documents/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'x-mycorpus-request': '1',
      'x-document-filename': encodeURIComponent(file.name),
      'x-document-title': encodeURIComponent(customTitle)
    },
    credentials: 'same-origin',
    body: file
  })

  const body = await res.json()
  if (!res.ok) {
    const error = new Error(body.error || 'Échec de l’importation du PDF.')
    ;(error as any).code = body.code
    ;(error as any).scanned = body.scanned
    throw error
  }

  return body.document
}

export async function deleteStudyDocument(id: string): Promise<void> {
  const res = await fetch(`/api/study/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'x-mycorpus-request': '1' },
    credentials: 'same-origin'
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Échec de la suppression.')
  }
}

export async function generateDocumentSummary(id: string): Promise<StudySummary> {
  const res = await fetch(`/api/study/documents/${encodeURIComponent(id)}/summarize`, {
    method: 'POST',
    headers: { 'x-mycorpus-request': '1' },
    credentials: 'same-origin'
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Échec de la génération de la synthèse.')
  return body.summary
}

export async function generateDocumentQuestions(
  id: string,
  count = 5,
  sectionId?: string
): Promise<StudyQuestion[]> {
  const res = await fetch(`/api/study/documents/${encodeURIComponent(id)}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mycorpus-request': '1'
    },
    credentials: 'same-origin',
    body: JSON.stringify({ count, sectionId })
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Échec de la génération du QCM.')
  return body.questions || []
}

export async function fetchDocumentQuestions(id: string): Promise<StudyQuestion[]> {
  const res = await fetch(`/api/study/documents/${encodeURIComponent(id)}/questions`, {
    credentials: 'same-origin'
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Échec du chargement des questions.')
  return body.questions || []
}
