// Compatibility migration only. The retired 3D format is never accepted by the API.
// Keep card IDs, text, ownership and all FSRS rows; archive the removed scene metadata.
export function retireAtlasCards(db) {
 db.exec(`CREATE TABLE IF NOT EXISTS flashcard_retired_content (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL, retired_at INTEGER NOT NULL
 )`)
 const archive=db.prepare('INSERT OR IGNORE INTO flashcard_retired_content VALUES(?,?,?,?)')
 const now=Date.now(),retiredCardIds=new Set()
 const notes=db.prepare("SELECT * FROM flashcard_notes WHERE note_type='atlas_3d'").all()
 if(!notes.length&&!db.prepare("SELECT 1 FROM flashcards WHERE card_type='atlas_3d' LIMIT 1").get())return
 const convert=db.prepare("UPDATE flashcards SET note_id=?,derivation_key=?,card_type='basic',visual_json=NULL,typed_target=NULL,accepted_answers_json=NULL,tags_json=? WHERE id=? AND user_id=?")
 const tag=raw=>{try{return JSON.stringify([...new Set([...JSON.parse(raw||'[]'),'ancienne-carte-3d'])])}catch{return '["ancienne-carte-3d"]'}}
 for(const note of notes){
  const cards=db.prepare('SELECT * FROM flashcards WHERE note_id=? AND user_id=? ORDER BY created_at,id').all(note.id,note.user_id)
  archive.run('note:'+note.id,note.user_id,JSON.stringify({note,cards}),now)
  db.prepare('UPDATE flashcards SET note_id=NULL,derivation_key=NULL WHERE note_id=? AND user_id=?').run(note.id,note.user_id)
  cards.forEach(card=>retiredCardIds.add(card.id))
  // A basic note owns one card. Other former targets become independent text cards.
  for(const [index,card] of cards.entries())convert.run(index===0?note.id:null,index===0?'forward':null,tag(card.tags_json),card.id,note.user_id)
  let original={};try{original=JSON.parse(note.fields_json)}catch{/* Snapshot retains invalid legacy data too. */}
  const fields={front:cards[0]?.front||original.prompt||note.title||'Ancienne carte anatomique',back:cards[0]?.back||original.extra||note.title||'Contenu conservé dans les archives du compte.'}
  db.prepare("UPDATE flashcard_notes SET note_type='basic',fields_json=?,suppressed_derivations_json='[]',visual_json=NULL,note_version=note_version+1,tags_json=? WHERE id=? AND user_id=?").run(JSON.stringify(fields),tag(note.tags_json),note.id,note.user_id)
 }
 for(const card of db.prepare("SELECT * FROM flashcards WHERE card_type='atlas_3d'").all()){
  retiredCardIds.add(card.id)
  archive.run('card:'+card.id,card.user_id,JSON.stringify({card}),now)
  convert.run(null,null,tag(card.tags_json),card.id,card.user_id)
 }
 // Stored previews refer to the old face; invalidate just those previews, never review history.
 const removePreview=db.prepare('DELETE FROM flashcard_review_previews WHERE card_id=?')
 for(const id of retiredCardIds)removePreview.run(id)
}
