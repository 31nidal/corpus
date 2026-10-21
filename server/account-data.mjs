import {rmSync} from 'node:fs'
import path from 'node:path'

// Read only tables explicitly reviewed for the account access export. No authentication secrets.
const tables=['account_retention','account_value_activity','entries','history','identities','account_terms_acceptances','study_documents','study_pdf_extractions','study_pdf_pages','study_sections','study_summaries','study_questions','study_quotas','flashcard_decks','flashcard_notes','flashcards','flashcard_reviews','flashcard_review_logs','flashcard_assets','flashcard_retired_content','flashcard_drafts','flashcard_generation_receipts','flashcard_save_requests','flashcard_legacy_reviews','ai_generation_usage']
export function exportAccountData(db,userId){
 const data={}
 for(const table of tables){
  if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))continue
  data[table]=db.prepare(`SELECT * FROM ${table} WHERE user_id=?`).all(userId)
 }
 return {data,files:[...(data.study_documents||[]).map(row=>({id:row.id,kind:'pdf',url:`/api/study/documents/${encodeURIComponent(row.id)}/pdf`})),...(data.flashcard_assets||[]).map(row=>({id:row.id,kind:'image',url:`/api/flashcards/assets/${encodeURIComponent(row.id)}`}))],fileNotice:'Les originaux se téléchargent séparément via ces liens, dans votre session active. Les signalements envoyés sans compte sont à demander au contact RGPD.'}
}
export function removeAccountFiles(db,directory,userId){
 // Fetch before the user cascade erases the asset ownership metadata.
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='flashcard_assets'").get()){
  for(const row of db.prepare('SELECT storage_key FROM flashcard_assets WHERE user_id=?').all(userId)){
   if(typeof row.storage_key!=='string'||!row.storage_key||path.basename(row.storage_key)!==row.storage_key||['.','..'].includes(row.storage_key))throw new Error('Invalid asset storage key')
   rmSync(path.join(directory,'flashcard_assets',row.storage_key),{force:true})
  }
 }
 rmSync(path.join(directory,'uploads',userId),{recursive:true,force:true})
}
