import {randomUUID} from 'node:crypto'
import {disambiguateDraftFronts} from '../draftFronts.mjs'
import {generateLocalNoteDrafts} from '../generation.mjs'
import {validateNote} from '../validation.mjs'
import {draftContentHash,draftEvidenceSignals,isSafeDraft} from './policy.mjs'

export const MAX_DRAFT_GENERATION_COUNT = 60
export const MAX_DRAFT_PAGE_SIZE = 500
export const MAX_DRAFT_BATCH_SIZE = 100
const error = (status,message) => Object.assign(new Error(message),{status})
const parse = value => JSON.parse(value)
const preview = (type,fields) => ({
  front: type==='cloze' ? fields.text.replace(/\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g,'[...]') : fields.front ?? fields.prompt ?? '',
  back: type==='cloze' ? fields.text.replace(/\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g,'$1') : fields.back ?? fields.answer ?? fields.extra ?? '',
})

export class DraftReviewRepository {
  constructor(db,notes,now=Date.now) {this.db=db;this.notes=notes;this.now=now}
  document(userId,id) {
    return this.db.prepare('SELECT id,title,page_count FROM study_documents WHERE id=? AND user_id=?').get(id,userId)
  }
  row(userId,id,documentId) {
    return documentId
      ? this.db.prepare('SELECT * FROM flashcard_drafts WHERE id=? AND user_id=? AND document_id=?').get(id,userId,documentId)
      : this.db.prepare('SELECT * FROM flashcard_drafts WHERE id=? AND user_id=?').get(id,userId)
  }
  section(userId,row) {
    return row.section_id && this.db.prepare('SELECT id,content,start_page AS startPage,end_page AS endPage FROM study_sections WHERE id=? AND document_id=? AND user_id=?').get(row.section_id,row.document_id,userId)
  }
  view(userId,row) {
    const signals=draftEvidenceSignals({source:{excerpt:row.source_excerpt}},this.section(userId,row))
    // Never treat edited content as generated typed evidence, including while rejected.
    const confidence=row.status==='edited'||row.rejected_from==='edited' ? 0 : Math.min(row.confidence,signals.confidence)
    const item={id:row.id,documentId:row.document_id,sectionId:row.section_id,page:row.page,
      noteType:row.note_type,front:row.front,back:row.back,fields:parse(row.fields_json),
      sourceExcerpt:row.source_excerpt,subject:row.subject,chapter:row.chapter,tags:parse(row.tags_json),
      confidence,verbatimProof:Boolean(row.verbatim_proof && signals.verbatimProof),status:row.status,
      rejectedFrom:row.rejected_from,acceptedNoteId:row.accepted_note_id,createdAt:row.created_at,updatedAt:row.updated_at}
    return {...item,faithfulToCourse:isSafeDraft(item)}
  }
  list(userId,documentId,status,limit=50,offset=0) {
    const rows=this.db.prepare('SELECT * FROM flashcard_drafts WHERE user_id=? AND document_id=? ORDER BY created_at,id').all(userId,documentId)
    const counts={total:rows.length,pending:0,edited:0,accepted:0,rejected:0,faithfulToCourse:0}
    const views=rows.map(row=>this.view(userId,row))
    for(const item of views){counts[item.status]++;if(item.faithfulToCourse)counts.faithfulToCourse++}
    const filtered=status ? views.filter(item=>item.status===status) : views
    return {drafts:filtered.slice(offset,offset+limit),counts,filteredTotal:filtered.length,limit,offset,
      nextOffset:offset+limit<filtered.length?offset+limit:null}
  }
  generate(userId,documentId,{count=12,level='standard',sectionId,sectionIds,startPage,endPage}={}) {
    if(!Number.isSafeInteger(count)||count<1)throw error(400,'Le nombre demandé doit être un entier positif.')
    if(!['essential','standard','complete'].includes(level))throw error(400,'Niveau de génération invalide.')
    const doc=this.document(userId,documentId);if(!doc)throw error(404,'Document introuvable.')
    const requestedCount=Math.min(count,MAX_DRAFT_GENERATION_COUNT)
    let sections=this.db.prepare('SELECT id,title,content,start_page AS startPage,end_page AS endPage FROM study_sections WHERE document_id=? AND user_id=? ORDER BY section_order,id').all(documentId,userId)
    if(sectionId!==undefined && (typeof sectionId!=='string'||!sections.some(s=>s.id===sectionId)))throw error(404,'Section introuvable.')
    if(sectionIds!==undefined && (!Array.isArray(sectionIds)||!sectionIds.length||sectionIds.length>100||sectionIds.some(id=>typeof id!=='string'||!sections.some(s=>s.id===id))))throw error(404,'Section introuvable.')
    if(sectionId!==undefined && sectionIds!==undefined)throw error(400,'Choisissez sectionId ou sectionIds.')
    if([startPage,endPage].some(p=>p!==undefined&&(!Number.isSafeInteger(p)||p<1||p>doc.page_count)) || (startPage!==undefined&&endPage!==undefined&&startPage>endPage))throw error(400,'La plage de pages est invalide.')
    const allSections=sections
    if(sectionId!==undefined)sections=sections.filter(s=>s.id===sectionId)
    if(sectionIds!==undefined)sections=sections.filter(s=>sectionIds.includes(s.id))
    if(startPage!==undefined||endPage!==undefined)sections=sections.filter(s=>s.endPage>=(startPage??1)&&s.startPage<=(endPage??doc.page_count))
    if(!sections.length)throw error(422,'Aucune section disponible pour générer des brouillons.')
    // Generate per section, then round-robin before the global cap. Later sections
    // get the same opportunity as the first; source attribution stays exact.
    const allQueues=allSections.map(section=>generateLocalNoteDrafts({text:section.content,level,requestedCount,
      source:{type:'study_document',documentId,sectionId:section.id,sectionTitle:section.title},chapter:doc.title}).map(draft=>({draft,section})))
    // Resolve collisions across the whole document, including section-only runs.
    disambiguateDraftFronts(allQueues.flat().map(item=>item.draft))
    const queues=allQueues.filter(queue=>queue.length&&sections.some(section=>section.id===queue[0].section.id))
    const maximum=Math.min(requestedCount,level==='essential'?20:level==='standard'?35:60)
    const candidates=[]
    for(let index=0;candidates.length<maximum&&queues.some(q=>index<q.length);index++) {
      for(const queue of queues)if(queue[index]&&candidates.length<maximum)candidates.push(queue[index])
    }
    let created=0,ignored=0,unattributed=0
    const ids=[]
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const insert=this.db.prepare(`INSERT OR IGNORE INTO flashcard_drafts
        (id,user_id,document_id,section_id,page,note_type,front,back,fields_json,source_excerpt,content_hash,
         subject,chapter,tags_json,confidence,verbatim_proof,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      const existing=this.db.prepare('SELECT section_id,note_type,back,source_excerpt FROM flashcard_drafts WHERE user_id=? AND document_id=?').all(userId,documentId)
      for(const {draft,section} of candidates) {
        // Front improvements never resurrect rejected/edited or existing facts.
        if(existing.some(row=>row.section_id===section.id&&row.source_excerpt===draft.source.excerpt)){ignored++;continue}
        // Never attribute a quote assembled across sections to a fabricated page.
        if(!draftEvidenceSignals(draft,section).verbatimProof){unattributed++;continue}
        const signals=draftEvidenceSignals(draft,section),id=randomUUID(),time=this.now()
        const changes=insert.run(id,userId,documentId,section.id,section.startPage,draft.noteType,
          draft.front,draft.back,JSON.stringify(draft.fields),draft.source.excerpt,
          draftContentHash(draft.front,draft.source.excerpt),draft.subject||'',draft.chapter||'',
          JSON.stringify(draft.tags||[]),signals.confidence,Number(signals.verbatimProof),time,time).changes
        if(changes){created++;ids.push(id)}else{ignored++}
      }
      this.db.exec('COMMIT')
    }catch(e){this.db.exec('ROLLBACK');throw e}
    return {requestedCount,generated:candidates.length,created,ignored,unattributed,ids}
  }
  patch(userId,id,body) {
    const row=this.row(userId,id);if(!row)throw error(404,'Brouillon introuvable.')
    if(row.status==='accepted')throw error(409,'Un brouillon accepté ne peut plus être modifié.')
    if(!body||typeof body!=='object'||Array.isArray(body)||!Object.keys(body).length||Object.keys(body).some(k=>!['front','back','noteType','fields'].includes(k)))throw error(400,'Champs de modification invalides.')
    const noteType=body.noteType??row.note_type
    let fields=body.fields??parse(row.fields_json)
    if(body.front!==undefined||body.back!==undefined) {
      if(!['basic','reverse','bidirectional','typed'].includes(noteType))throw error(400,'Modifiez les champs structurés pour ce type de note.')
      fields={...fields,...(body.front===undefined?{}:{front:body.front}),...(body.back===undefined?{}:noteType==='typed'?{answer:body.back}:{back:body.back})}
    }
    const valid=validateNote({noteType,fields,defaultDeckId:'draft-validation'})
    if(!valid)throw error(400,'Type ou contenu du brouillon invalide.')
    const text=preview(noteType,valid.fields),time=Math.max(this.now(),row.updated_at+1)
    const result=this.db.prepare(`UPDATE flashcard_drafts SET note_type=?,front=?,back=?,fields_json=?,
      status=CASE WHEN status='rejected' THEN 'rejected' ELSE 'edited' END,
      rejected_from=CASE WHEN status='rejected' THEN 'edited' ELSE NULL END,
      confidence=0,updated_at=? WHERE id=? AND user_id=? AND status!='accepted' AND updated_at=?`)
      .run(noteType,text.front,text.back,JSON.stringify(valid.fields),time,id,userId,row.updated_at)
    if(!result.changes)throw error(409,'Le brouillon a changé. Rechargez-le avant de modifier.')
    return this.view(userId,this.row(userId,id))
  }
  act(userId,id,action,{deckId,documentId,faithfulOnly=false}={}) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const row=this.row(userId,id,documentId)
      if(!row){this.db.exec('ROLLBACK');return {id,status:'not_found',error:'Brouillon introuvable.',httpStatus:404}}
      const time=Math.max(this.now(),row.updated_at+1)
      let result
      if(action==='accept') {
        if(row.status==='accepted'&&row.accepted_note_id) {
          const note=this.notes.note(userId,row.accepted_note_id)
          if(!note)throw error(409,'Note acceptée indisponible.')
          result={id,status:'already_accepted',noteId:note.id,note}
        }else {
          if(row.status==='rejected')throw error(409,'Restaurez le brouillon avant de l’accepter.')
          if(faithfulOnly&&!this.view(userId,row).faithfulToCourse)throw error(409,'Ce brouillon ne remplit plus le critère de fidélité au cours.')
          if(!this.notes.deck(userId,deckId))throw error(400,'Deck de destination introuvable.')
          const noteValue=validateNote({noteType:row.note_type,fields:parse(row.fields_json),defaultDeckId:deckId,
            subject:row.subject,chapter:row.chapter,tags:parse(row.tags_json),source:{type:'study_document',
              documentId:row.document_id,sectionId:row.section_id,locator:{pages:[row.page,row.page]},excerpt:row.source_excerpt}})
          if(!noteValue)throw error(400,'Contenu du brouillon invalide.')
          const note=this.notes.createNoteRows(userId,noteValue)
          this.db.prepare("UPDATE flashcard_drafts SET status='accepted',accepted_note_id=?,rejected_from=NULL,rejected_at=NULL,updated_at=? WHERE id=? AND user_id=?").run(note.id,time,id,userId)
          result={id,status:'accepted',noteId:note.id,note}
        }
      }else if(action==='reject') {
        if(row.status==='accepted')throw error(409,'Supprimez la note pour annuler une acceptation.')
        if(row.status!=='rejected')this.db.prepare("UPDATE flashcard_drafts SET rejected_from=status,status='rejected',rejected_at=?,updated_at=? WHERE id=? AND user_id=?").run(time,time,id,userId)
        result={id,status:'rejected'}
      }else if(action==='restore') {
        if(row.status!=='rejected')throw error(409,'Seul un brouillon rejeté peut être restauré.')
        this.db.prepare('UPDATE flashcard_drafts SET status=rejected_from,rejected_from=NULL,rejected_at=NULL,updated_at=? WHERE id=? AND user_id=?').run(time,id,userId)
        result={id,status:'restored'}
      }else throw error(400,'Action invalide.')
      const draft=this.view(userId,this.row(userId,id))
      this.db.exec('COMMIT')
      return {...result,draft}
    }catch(e){
      this.db.exec('ROLLBACK')
      if(!e.status)console.error('Draft review transaction failed:',e)
      return {id,status:'invalid',error:e.status?e.message:'Impossible de traiter ce brouillon. Réessayez.',httpStatus:e.status||500}
    }
  }
  batch(userId,documentId,action,body) {
    const faithfulOnly=body.faithfulOnly===true
    if(body.faithfulOnly!==undefined&&(action!=='accept'||typeof body.faithfulOnly!=='boolean'))throw error(400,'Drapeau de fidélité invalide.')
    if(faithfulOnly&&body.ids!==undefined)throw error(400,'Choisissez les identifiants ou le lot fidèle, pas les deux.')
    const eligibleIds=faithfulOnly ? this.db.prepare("SELECT * FROM flashcard_drafts WHERE user_id=? AND document_id=? AND status='pending' ORDER BY created_at,id").all(userId,documentId)
      .filter(row=>this.view(userId,row).faithfulToCourse).map(row=>row.id) : null
    const ids=faithfulOnly ? eligibleIds.slice(0,MAX_DRAFT_BATCH_SIZE) : body.ids
    if(!Array.isArray(ids)||(!faithfulOnly&&!ids.length)||ids.length>MAX_DRAFT_BATCH_SIZE)throw error(400,`Le lot doit contenir de 1 à ${MAX_DRAFT_BATCH_SIZE} identifiants.`)
    const results=ids.map(id=>typeof id==='string'&&id.length>0&&id.length<=100
      ? this.act(userId,id,action,{deckId:body.deckId,documentId,faithfulOnly})
      : {id,status:'invalid',error:'Identifiant invalide.',httpStatus:400})
    return {results,...(faithfulOnly?{eligibleBefore:eligibleIds.length,remainingFaithful:this.list(userId,documentId).counts.faithfulToCourse,batchLimit:MAX_DRAFT_BATCH_SIZE}:{}),accepted:results.filter(r=>r.status==='accepted').length,alreadyAccepted:results.filter(r=>r.status==='already_accepted').length,
      rejected:results.filter(r=>r.status==='rejected').length,restored:results.filter(r=>r.status==='restored').length,
      notFound:results.filter(r=>r.status==='not_found').length,invalid:results.filter(r=>r.status==='invalid').length}
  }
}
