import {normalize} from '../flashcards/generation.mjs'

export function sourcePage(db, userId, documentId, excerpt, fallback) {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='study_pdf_pages'").get()) return fallback
  const proof = normalize(excerpt)
  const pages = db.prepare('SELECT page_number,text FROM study_pdf_pages WHERE document_id=? AND user_id=? ORDER BY page_number').all(documentId,userId)
  return pages.find(page => normalize(page.text).includes(proof))?.page_number ?? fallback
}
