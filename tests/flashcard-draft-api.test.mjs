import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {DatabaseSync} from 'node:sqlite'
import {createAccountHandler} from '../server/accounts.mjs'
import {createFlashcardHandler} from '../server/flashcards/handler.mjs'
import {createStudyHandler} from '../server/study.mjs'
import {MAX_DRAFT_GENERATION_COUNT,MAX_DRAFT_BATCH_SIZE} from '../server/flashcards/review/repository.mjs'
import {purgeRejectedDraftsOnStartup} from '../server/flashcards/review/startup.mjs'
import {REJECTED_DRAFT_RETENTION_MS} from '../server/flashcards/review/policy.mjs'

const password='Brouillons-tests-solides-2026'
const source='Le nerf médian innerve le muscle pronateur rond. Le rein filtre le plasma sanguin. Le cœur est situé dans le médiastin thoracique.'
const root='/api/flashcards'
const docRoute=id=>`${root}/documents/${id}/drafts`
const draftRoute=id=>`${root}/drafts/${id}`

async function fixture() {
  const directory=mkdtempSync(path.join(tmpdir(),'corpus-draft-api-'))
  const config={ACCOUNT_DATA_DIR:directory,APP_ORIGIN:'https://mycorpus.test'}
  let clock=Date.UTC(2026,9,8,10)
  const account=createAccountHandler(config),flash=createFlashcardHandler(config,{now:()=>clock}),study=createStudyHandler(config)
  const callWith=handler=>async(route,method='GET',body,cookie='',headers={})=>{
    const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))])
    req.url=route;req.method=method;req.headers={cookie,...(body===undefined?{}:{'x-mycorpus-request':'1','content-type':'application/json'}),...headers};req.socket={remoteAddress:'127.0.0.1'}
    let status=200,output='',responseHeaders={}
    const res={writeHead(code,values={}){status=code;responseHeaders={...responseHeaders,...values}},setHeader(name,value){responseHeaders[name]=value},end(value=''){output+=value}}
    await handler(req,res)
    const cookies=responseHeaders['Set-Cookie']||responseHeaders['set-cookie']||[]
    return {status,data:output?JSON.parse(output):null,cookie:(Array.isArray(cookies)?cookies:[cookies]).map(c=>c.split(';')[0]).find(c=>c.startsWith('mycorpus_session='))}
  }
  const call=async(route,...args)=>callWith(route.startsWith('/api/account/')?account:route.startsWith('/api/study/')?study:flash)(route,...args)
  const alice=await call('/api/account/register','POST',{email:'alice@example.test',name:'Alice',password})
  const bob=await call('/api/account/register','POST',{email:'bob@example.test',name:'Bob',password})
  const deck=(await call(`${root}/decks`,'POST',{name:'Cours'},alice.cookie)).data.deck
  const db=new DatabaseSync(path.join(directory,'mycorpus.sqlite'));db.exec('PRAGMA foreign_keys=ON;')
  const addDoc=(id,userId,text=source)=>{
    const iso=new Date(clock).toISOString()
    db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,status,created_at,updated_at) VALUES(?,?,?,'cours.pdf',100,5,'ready',?,?)").run(id,userId,`Cours ${id}`,iso,iso)
    db.prepare('INSERT INTO study_sections(id,document_id,user_id,title,section_order,start_page,end_page,content,token_count) VALUES(?,?,?,\'Section\',0,3,4,?,100)').run(`${id}-section`,id,userId,text)
  }
  addDoc('doc-a',alice.data.user.id);addDoc('doc-b',bob.data.user.id)
  const generate=async(id='doc-a',body={})=>call(`${docRoute(id)}/generate`,'POST',body,alice.cookie)
  const list=async(query='')=>(await call(docRoute('doc-a')+query,'GET',undefined,alice.cookie)).data
  return {directory,db,config,call,callWith,alice,bob,deck,addDoc,generate,list,setTime:value=>{clock=value},now:()=>clock,
    close(){db.close();rmSync(directory,{recursive:true,force:true})}}
}

test('brouillons API : propriété 404 sur liste, génération, PATCH, actions et lots ; CSRF conservé',async()=>{
  const f=await fixture()
  try {
    const created=await f.generate(),id=created.data.ids[0]
    for(const [route,method,body] of [
      [docRoute('doc-a'),'GET',undefined],
      [`${docRoute('doc-a')}/generate`,'POST',{}],
      [draftRoute(id),'PATCH',{front:'Autre recto'}],
      ...['accept','reject','restore'].flatMap(action=>[
        [`${draftRoute(id)}/${action}`,'POST',{deckId:f.deck.id}],
        [`${docRoute('doc-a')}/${action}`,'POST',{ids:[id],deckId:f.deck.id}],
      ]),
      [`${docRoute('doc-a')}/accept`,'POST',{faithfulOnly:true,deckId:f.deck.id}],
    ])assert.equal((await f.call(route,method,body,f.bob.cookie)).status,404,route)
    const ownedBatch=await f.call(`${docRoute('doc-b')}/accept`,'POST',{ids:[id],deckId:f.deck.id},f.bob.cookie)
    assert.equal(ownedBatch.status,200)
    assert.equal(ownedBatch.data.results[0].status,'not_found')
    assert.equal((await f.call(docRoute('doc-a'))).status,401)
    assert.equal((await f.call(`${docRoute('doc-a')}/generate`,'POST',{},f.alice.cookie,{origin:'https://evil.test'})).status,403)
  }finally{f.close()}
})

test('brouillons API : génération depuis la base, plafond, pagination, régénération et rejets conservés',async()=>{
  const f=await fixture()
  try {
    assert.equal(MAX_DRAFT_GENERATION_COUNT,60)
    assert.equal((await f.generate('doc-a',{text:'Le client invente une autre source.'})).status,400)
    assert.equal((await f.generate('doc-a',{count:1.5})).status,400)
    assert.equal((await f.generate('doc-a',{count:0})).status,400)
    f.addDoc('long',f.alice.data.user.id,Array.from({length:90},(_,i)=>`Le muscle numéro ${i} permet la flexion de la partie ${i}.`).join(' '))
    const capped=await f.generate('long',{count:1000,level:'complete'})
    assert.equal(capped.status,201);assert.equal(capped.data.requestedCount,60);assert.equal(capped.data.created,60)
    const first=await f.generate();assert.equal(first.status,201);assert.ok(first.data.created>=2)
    assert.equal(first.data.ignored,0)
    const rows=await f.list()
    assert.equal(rows.counts.pending,first.data.created)
    assert.equal(rows.counts.total,rows.drafts.length)
    assert.equal(rows.drafts[0].page,3)
    assert.equal(rows.drafts[0].sectionId,'doc-a-section')
    assert.equal(rows.drafts[0].sourceExcerpt.length>10,true)
    const paginated=await f.list('?limit=1&status=pending')
    assert.equal(paginated.drafts.length,1);assert.equal(paginated.nextOffset,1)
    assert.equal(paginated.counts.total,first.data.created)
    assert.equal((await f.call(docRoute('doc-a')+'?status=unknown','GET',undefined,f.alice.cookie)).status,400)
    const id=first.data.ids[0]
    await f.call(`${draftRoute(id)}/reject`,'POST',{},f.alice.cookie)
    const again=await f.generate()
    assert.equal(again.data.created,0);assert.equal(again.data.ignored,first.data.created)
    assert.equal((await f.list('?status=rejected')).drafts[0].id,id)
    await f.call(`${draftRoute(id)}/restore`,'POST',{},f.alice.cookie)
    const oldHash=f.db.prepare('SELECT content_hash FROM flashcard_drafts WHERE id=?').get(id).content_hash
    await f.call(draftRoute(id),'PATCH',{front:'Recto corrigé par l’étudiant'},f.alice.cookie)
    assert.equal((await f.generate()).data.created,0)
    assert.equal(f.db.prepare('SELECT content_hash FROM flashcard_drafts WHERE id=?').get(id).content_hash,oldHash)
  }finally{f.close()}
})

test('brouillons API : édition validée, rejets édités, PATCH accepté et restore non rejeté',async()=>{
  const f=await fixture()
  try {
    const {data:{ids}}=await f.generate(),id=ids[0]
    assert.equal((await f.call(`${draftRoute(id)}/restore`,'POST',{},f.alice.cookie)).status,409)
    for(const body of [{noteType:'unknown'},{front:'x'.repeat(2001)},{back:'x'.repeat(8001)},{fields:{front:'',back:'A'}},{status:'accepted'}]) {
      assert.equal((await f.call(draftRoute(id),'PATCH',body,f.alice.cookie)).status,400)
    }
    const edited=await f.call(draftRoute(id),'PATCH',{front:'Quelle est la réponse du cours ?',back:'Réponse relue.'},f.alice.cookie)
    assert.equal(edited.status,200);assert.equal(edited.data.draft.status,'edited');assert.equal(edited.data.draft.confidence,0)
    assert.equal(edited.data.draft.faithfulToCourse,false)
    await f.call(`${draftRoute(id)}/reject`,'POST',{},f.alice.cookie)
    const rejectedEdit=await f.call(draftRoute(id),'PATCH',{noteType:'reverse',fields:{front:'Réponse relue.',back:'Quelle est la question ?'}},f.alice.cookie)
    assert.equal(rejectedEdit.data.draft.status,'rejected');assert.equal(rejectedEdit.data.draft.rejectedFrom,'edited')
    const restored=await f.call(`${draftRoute(id)}/restore`,'POST',{},f.alice.cookie)
    assert.equal(restored.data.draft.status,'edited')
    const accepted=await f.call(`${draftRoute(id)}/accept`,'POST',{deckId:f.deck.id},f.alice.cookie)
    assert.equal(accepted.data.status,'accepted')
    assert.equal((await f.call(draftRoute(id),'PATCH',{front:'Modification interdite'},f.alice.cookie)).status,409)
    assert.equal((await f.call(`${draftRoute(id)}/restore`,'POST',{},f.alice.cookie)).status,409)
    assert.equal((await f.call(`${draftRoute(id)}/reject`,'POST',{},f.alice.cookie)).status,409)
  }finally{f.close()}
})

test('brouillons API : acceptation idempotente sans reçu, deux appels rapprochés et réacceptation après suppression',async()=>{
  const f=await fixture()
  try {
    const {data:{ids}}=await f.generate(),id=ids[0]
    f.db.exec('DELETE FROM flashcard_generation_receipts')
    const otherHandler=createFlashcardHandler(f.config,{now:f.now})
    const [a,b]=await Promise.all([
      f.call(`${draftRoute(id)}/accept`,'POST',{deckId:f.deck.id},f.alice.cookie),
      f.callWith(otherHandler)(`${draftRoute(id)}/accept`,'POST',{deckId:f.deck.id},f.alice.cookie),
    ])
    assert.deepEqual([a.data.status,b.data.status].sort(),['accepted','already_accepted'])
    assert.equal(a.data.note.id,b.data.note.id)
    const cardCount=a.data.note.cards.length
    assert.equal(f.db.prepare('SELECT count(*) n FROM flashcards WHERE user_id=?').get(f.alice.data.user.id).n,cardCount)
    assert.equal(a.data.note.source.documentId,'doc-a')
    assert.equal(a.data.note.source.sectionId,'doc-a-section')
    assert.deepEqual(a.data.note.source.locator.pages,[3,3])
    assert.equal(a.data.note.cards[0].review.state,'new')
    const removed=await f.call(`${root}/notes/${a.data.note.id}`,'DELETE',{expectedVersion:a.data.note.noteVersion},f.alice.cookie)
    assert.equal(removed.status,200)
    const replacement=await f.call(`${draftRoute(id)}/accept`,'POST',{deckId:f.deck.id},f.alice.cookie)
    assert.equal(replacement.data.status,'accepted');assert.notEqual(replacement.data.note.id,a.data.note.id)
    const repeated=await f.call(`${draftRoute(id)}/accept`,'POST',{},f.alice.cookie)
    assert.equal(repeated.data.status,'already_accepted');assert.equal(repeated.data.note.id,replacement.data.note.id)
    assert.equal(f.db.prepare('SELECT count(*) n FROM flashcards WHERE user_id=?').get(f.alice.data.user.id).n,cardCount)
  }finally{f.close()}
})

test('brouillons API : lots partiels bornés, résultats par ID et fidélité recalculée côté serveur',async()=>{
  const f=await fixture()
  try {
    assert.equal(MAX_DRAFT_BATCH_SIZE,100)
    const {data:{ids}}=await f.generate()
    const excessive=await f.call(`${docRoute('doc-a')}/accept`,'POST',{ids:Array(101).fill(ids[0]),deckId:f.deck.id},f.alice.cookie)
    assert.equal(excessive.status,400)
    const noDeck=await f.call(`${docRoute('doc-a')}/accept`,'POST',{ids:[ids[0]],deckId:'other-users-deck'},f.alice.cookie)
    assert.equal(noDeck.data.results[0].status,'invalid')
    const valid=ids[0],rejected=ids[1]
    await f.call(`${draftRoute(rejected)}/reject`,'POST',{},f.alice.cookie)
    const lot=await f.call(`${docRoute('doc-a')}/accept`,'POST',{ids:[valid,'missing',null,rejected,valid],deckId:f.deck.id},f.alice.cookie)
    assert.equal(lot.status,200)
    assert.deepEqual(lot.data.results.map(r=>r.status),['accepted','not_found','invalid','invalid','already_accepted'])
    assert.equal(lot.data.accepted,1);assert.equal(lot.data.alreadyAccepted,1);assert.equal(lot.data.notFound,1);assert.equal(lot.data.invalid,2)
    assert.equal(f.db.prepare('SELECT count(*) n FROM flashcard_notes').get().n,1)
    f.addDoc('safe',f.alice.data.user.id,'Le nerf médian innerve le muscle pronateur rond. Le nerf radial innerve le muscle triceps brachial.')
    await f.generate('safe')
    const initial=(await f.call(docRoute('safe'),'GET',undefined,f.alice.cookie)).data
    assert.equal(initial.counts.faithfulToCourse,2)
    f.db.prepare("UPDATE study_sections SET content='Le nerf médian innerve le muscle pronateur rond.' WHERE document_id='safe'").run()
    const faithful=await f.call(`${docRoute('safe')}/accept`,'POST',{faithfulOnly:true,deckId:f.deck.id},f.alice.cookie)
    assert.equal(faithful.status,200);assert.equal(faithful.data.accepted,1)
    assert.equal(faithful.data.results.length,1)
    assert.equal((await f.call(`${docRoute('safe')}/accept`,'POST',{faithfulOnly:true,deckId:f.deck.id},f.alice.cookie)).data.accepted,0)
    const restoreLot=await f.call(`${docRoute('doc-a')}/restore`,'POST',{ids:[rejected,valid,'missing']},f.alice.cookie)
    assert.deepEqual(restoreLot.data.results.map(r=>r.status),['restored','invalid','not_found'])
    const rejectLot=await f.call(`${docRoute('doc-a')}/reject`,'POST',{ids:[rejected,valid]},f.alice.cookie)
    assert.deepEqual(rejectLot.data.results.map(r=>r.status),['rejected','invalid'])
  }finally{f.close()}
})

test('brouillons API : purge au démarrage seulement, horloge injectable et frontière des 30 jours',async()=>{
  const f=await fixture()
  try {
    const {data:{ids}}=await f.generate()
    for(const id of ids)await f.call(`${draftRoute(id)}/reject`,'POST',{},f.alice.cookie)
    const rejectedAt=f.db.prepare('SELECT rejected_at FROM flashcard_drafts WHERE id=?').get(ids[0]).rejected_at
    assert.equal(purgeRejectedDraftsOnStartup(f.config,{now:()=>rejectedAt+REJECTED_DRAFT_RETENTION_MS}),0)
    f.setTime(rejectedAt+REJECTED_DRAFT_RETENTION_MS+1)
    assert.equal((await f.list()).counts.rejected,ids.length) // GET must not purge.
    const newest=ids.at(-1)
    await f.call(`${draftRoute(newest)}/restore`,'POST',{},f.alice.cookie)
    f.db.prepare('UPDATE flashcard_drafts SET rejected_at=? WHERE id=?').run(rejectedAt+1,ids[1])
    assert.equal(purgeRejectedDraftsOnStartup(f.config,{now:f.now}),1)
    assert.equal((await f.call(`${draftRoute(ids[0])}/restore`,'POST',{},f.alice.cookie)).status,404)
    assert.equal((await f.list()).counts.total,ids.length-1)
    assert.equal((await f.call(`${draftRoute(ids[1])}/restore`,'POST',{},f.alice.cookie)).status,200)
  }finally{f.close()}
})

test('brouillons API : suppression du document en cascade, cartes acceptées préservées',async()=>{
  const f=await fixture()
  try {
    const {data:{ids}}=await f.generate()
    await f.call(`${draftRoute(ids[0])}/accept`,'POST',{deckId:f.deck.id},f.alice.cookie)
    assert.equal((await f.call('/api/study/documents/doc-a','DELETE',{},f.bob.cookie)).status,404)
    assert.equal((await f.call('/api/study/documents/doc-a','DELETE',{},f.alice.cookie)).status,200)
    assert.equal(f.db.prepare("SELECT count(*) n FROM flashcard_drafts WHERE document_id='doc-a'").get().n,0)
    assert.equal((await f.call(docRoute('doc-a'),'GET',undefined,f.alice.cookie)).status,404)
    assert.equal((await f.call(`${draftRoute(ids[0])}/accept`,'POST',{deckId:f.deck.id},f.alice.cookie)).status,404)
    assert.ok(f.db.prepare('SELECT count(*) n FROM flashcards WHERE user_id=?').get(f.alice.data.user.id).n>0)
  }finally{f.close()}
})

test('brouillons API : une panne d’insertion annule uniquement le brouillon concerné',async()=>{
  const f=await fixture()
  try {
    const {data:{ids}}=await f.generate()
    const failingFront=f.db.prepare('SELECT front FROM flashcard_drafts WHERE id=?').get(ids[0]).front
    f.db.exec(`CREATE TRIGGER reject_one_note BEFORE INSERT ON flashcard_notes
      WHEN json_extract(NEW.fields_json,'$.front')='${failingFront.replaceAll("'","''")}'
      BEGIN SELECT RAISE(ABORT,'Simulated note failure'); END;`)
    const lot=await f.call(`${docRoute('doc-a')}/accept`,'POST',{ids:[ids[0],ids[1]],deckId:f.deck.id},f.alice.cookie)
    assert.equal(lot.status,200)
    assert.deepEqual(lot.data.results.map(r=>r.status),['invalid','accepted'])
    assert.equal(lot.data.results[0].httpStatus,500)
    assert.equal(lot.data.accepted,1);assert.equal(lot.data.invalid,1)
    assert.equal(f.db.prepare('SELECT status FROM flashcard_drafts WHERE id=?').get(ids[0]).status,'pending')
    assert.equal(f.db.prepare('SELECT count(*) n FROM flashcard_notes').get().n,1)
  }finally{f.close()}
})

test('brouillons API : liste avec compteurs globaux, états filtrés et exemple JSON réel',async()=>{
  const f=await fixture()
  try {
    const {data:{ids}}=await f.generate()
    await f.call(draftRoute(ids[0]),'PATCH',{front:'Question relue'},f.alice.cookie)
    await f.call(`${draftRoute(ids[1])}/reject`,'POST',{},f.alice.cookie)
    await f.call(`${draftRoute(ids[2])}/accept`,'POST',{deckId:f.deck.id},f.alice.cookie)
    const response=await f.call(docRoute('doc-a')+'?status=edited','GET',undefined,f.alice.cookie)
    assert.equal(response.status,200)
    assert.deepEqual(response.data.counts,{total:3,pending:0,edited:1,accepted:1,rejected:1,faithfulToCourse:0})
    assert.equal(response.data.filteredTotal,1)
    assert.equal(response.data.drafts[0].status,'edited')
    assert.equal(response.data.drafts[0].faithfulToCourse,false)
    if(process.env.DRAFT_REVIEW_EXAMPLE_PATH){
      const {writeFileSync}=await import('node:fs')
      writeFileSync(process.env.DRAFT_REVIEW_EXAMPLE_PATH,JSON.stringify(response.data,null,2)+'\n')
    }
  }finally{f.close()}
})
