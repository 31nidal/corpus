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

export async function uploadStudyDocument(file: File, title?: string): Promise<StudyDocument> {
  const customTitle = title?.trim() || file.name.replace(/\.pdf$/i, '')

  // We can read file as base64 to send via JSON
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)

  const res = await fetch('/api/study/documents/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mycorpus-request': '1'
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      title: customTitle,
      filename: file.name,
      data: base64
    })
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
