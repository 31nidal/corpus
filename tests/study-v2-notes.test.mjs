import test from 'node:test'
import assert from 'node:assert/strict'
import {fixture,register,imported} from './helpers/study-v2-api.mjs'
import {noteCoverage, noteItems, selectNoteSources, NOTE_LEVELS, localNoteSummary} from '../server/study/v2/note-sources.mjs'
import {StudyNotes, MAX_NOTES_PER_DOCUMENT, NOTE_LEASE_MS} from '../server/study/v2/notes.mjs'
import {DatabaseSync} from 'node:sqlite'
import {initStudySchema, generateLocalSummary} from '../server/study.mjs'
import {migrateStudyV2} from '../server/study/v2/schema.mjs'

function repository(options = {}) {
  const db = new DatabaseSync(':memory:')
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u'),('other');")
  initStudySchema(db)
  db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,created_at,updated_at) VALUES('d','u','Rein','rein.pdf',100,3,'2026-10-14','2026-10-14')").run()
  const text = 'Le rein filtre le plasma sanguin. La pression de filtration atteint 44 mmHg. La fonction rénale dépend du débit sanguin.'
  for (let page=1;page<=3;page++) {
    db.prepare('INSERT INTO study_sections VALUES(?,?,?,?,?,?,?,?,?)').run('s'+page,'d','u','Chapitre '+page,page,page,page,text,30)
    db.prepare('INSERT INTO study_pdf_pages VALUES(?,?,?,?)').run('d','u',page,text)
  }
  migrateStudyV2(db)
  const notes = new StudyNotes({db,localSummary:generateLocalSummary,...options})
  return {db,notes,text,async close(){await notes.close();db.close()}}
}

test('Fiches V2 API : génération persistée idempotente, édition avant/après sauvegarde et conflit',async()=>{
  const api=fixture()
  try {
    const cookie=await register(api),uploaded=await imported(api,cookie),id=uploaded.document.id
    await api.drain()
    const route=`/api/study/v2/documents/${id}/notes`
    const generated=await api.call(route,{method:'POST',cookie,body:{requestId:'note-request',kind:'structured'}})
    assert.equal(generated.status,202)
    const noteId=generated.data.note.id
    const repeated=await api.call(route,{method:'POST',cookie,body:{requestId:'note-request',kind:'structured'}})
    assert.equal(repeated.data.note.id,noteId);assert.equal(repeated.data.reused,true)
    await api.drain()
    const note=(await api.call(route+'/'+noteId,{cookie})).data.note
    assert.equal(note.generationState,'succeeded');assert.equal(note.state,'draft')
    assert.ok(note.items.length);assert.equal(note.coverage.sectionsRepresented,1)
    const items=note.items.map(item=>({id:item.id,text:item.text+' Relu par moi.'}))
    const edited=await api.call(route+'/'+noteId,{method:'PATCH',cookie,body:{expectedEditVersion:note.editVersion,items,state:'saved'}})
    assert.equal(edited.status,200);assert.equal(edited.data.note.state,'saved');assert.ok(edited.data.note.items.every(item=>item.edited))
    assert.equal(edited.data.note.items[0].sourceExcerpt,note.items[0].sourceExcerpt)
    assert.equal((await api.call(route+'/'+noteId,{method:'PATCH',cookie,body:{expectedEditVersion:note.editVersion,title:'Conflit'}})).status,409)
    const renamed=await api.call(route+'/'+noteId,{method:'PATCH',cookie,body:{expectedEditVersion:edited.data.note.editVersion,title:'Fiche relue'}})
    assert.equal(renamed.status,200);assert.equal(renamed.data.note.title,'Fiche relue')
    assert.equal((await api.call(route,{cookie})).data.notes.length,1)
    assert.equal((await api.call(`/api/study/documents/${id}`,{cookie})).data.document.summary,null)
  }finally{await api.close()}
})
test('Fiches V2 API : chaque route refuse autrui avec 404, sans exposer sources ou état',async()=>{
  const api=fixture()
  try {
    const cookie=await register(api),other=await register(api),uploaded=await imported(api,cookie),id=uploaded.document.id
    await api.drain()
    const route=`/api/study/v2/documents/${id}/notes`
    const note=(await api.call(route,{method:'POST',cookie,body:{requestId:'private',kind:'short'}})).data.note
    for(const [url,method,body]of [[route,'GET'],[route,'POST',{requestId:'theft',kind:'short'}],[route+'/'+note.id,'GET'],[route+'/'+note.id,'PATCH',{expectedEditVersion:1,title:'Vol'}],[route+'/'+note.id,'DELETE']])assert.equal((await api.call(url,{method,body,cookie:other})).status,404)
    assert.equal((await api.call(route,{cookie:''})).status,401)
    assert.equal((await api.call(route,{method:'POST',cookie,body:{requestId:'csrf',kind:'short'},headers:{origin:'https://intrus.example'}})).status,403)
  }finally{await api.close()}
})
test('Fiches V2 : scope lu en base, passage exact, refus d’un texte inventé ou d’une section étrangère',async()=>{
  const api=repository()
  try {
    const doc={id:'d',pageCount:3}
    const selected=selectNoteSources(api.db,'u',doc,{selection:{page:2,text:'La pression de filtration atteint 44 mmHg.'}})
    assert.equal(selected.sections.length,1);assert.equal(selected.sections[0].id,'s2')
    assert.equal(selected.sections[0].content,'La pression de filtration atteint 44 mmHg.')
    assert.throws(()=>selectNoteSources(api.db,'u',doc,{selection:{page:2,text:'La pression de filtration atteint 99 mmHg.'}}),error=>error.status===400)
    assert.throws(()=>selectNoteSources(api.db,'u',doc,{sectionIds:['foreign']}),error=>error.status===404)
    assert.throws(()=>selectNoteSources(api.db,'u',doc,{sectionIds:[]}),error=>error.status===400)
    const note=api.notes.create('u','d',{requestId:'selection',kind:'short',selection:{page:2,text:'La pression de filtration atteint 44 mmHg.'}}).note
    await api.notes.drain()
    assert.equal(api.notes.get('u','d',note.id).items[0].page,2)
    assert.throws(()=>api.db.prepare("UPDATE study_v2_notes SET scope_json='{}'").run(),/immutable/)
  }finally{await api.close()}
})
test('Fiches V2 : niveaux distincts, preuve intacte, sections manquantes et valeurs exactes contrôlées',()=>{
  const scope={sections:[{id:'s1',title:'Valeurs',content:'La pression est 10 mmHg. La seconde pression est 100 mmHg.',startPage:1,endPage:1},{id:'s2',title:'Autre section',content:'Une autre notion substantielle doit être représentée.',startPage:2,endPage:2}],pages:[{page:1,text:'La pression est 10 mmHg. La seconde pression est 100 mmHg.'}]}
  const result=noteItems({chapters:[{id:'s1',proofs:[{text:'La seconde pression est 100 mmHg.',sourceExcerpt:'La seconde pression est 100 mmHg.'},{text:'La pression est 999 mmHg.',sourceExcerpt:'La pression est 10 mmHg.'}]}]},scope,'short')
  assert.equal(result.items.length,1);assert.equal(result.refused,1);assert.equal(result.items[0].exactPage,true)
  const coverage=noteCoverage(scope,result.items)
  assert.deepEqual(coverage.missingSections,[{id:'s2',title:'Autre section'}])
  assert.ok(coverage.missingQuantities.some(item=>item.value==='10 mmHg'))
  assert.ok(!coverage.missingQuantities.some(item=>item.value==='100 mmHg'))
  assert.deepEqual(Object.keys(NOTE_LEVELS),['short','structured','detailed'])
  assert.equal(NOTE_LEVELS.short.pointsPerSection,2);assert.equal(NOTE_LEVELS.detailed.pointsPerSection,20)
})
test('Fiches V2 : ancienne synthèse importée sans écraser ses données ni ses éditions V2',async()=>{
  const api=repository()
  try {
    const summary={title:'Rein',overview:'Une vue d’ensemble historique.',chapters:[{id:'s1',title:'Chapitre 1',keyPoints:[api.text]}]}
    api.db.prepare('INSERT INTO study_summaries VALUES(?,?,?,?,?)').run('old','d','u',JSON.stringify(summary),'2026-10-14')
    const notes=api.notes.list('u','d');assert.equal(notes.length,1);assert.equal(notes[0].origin,'legacy')
    assert.equal(notes[0].items[0].proofStatus,'unverified')
    api.notes.patch('u','d',notes[0].id,{expectedEditVersion:1,title:'Mon titre édité'})
    assert.equal(api.notes.list('u','d')[0].title,'Mon titre édité')
    assert.deepEqual(JSON.parse(api.db.prepare('SELECT summary_json FROM study_summaries').get().summary_json),summary)
    api.notes.delete('u','d',notes[0].id)
    assert.equal(api.notes.list('u','d').length,0)
    assert.deepEqual(JSON.parse(api.db.prepare('SELECT summary_json FROM study_summaries').get().summary_json),summary)
    api.db.exec("DELETE FROM study_documents WHERE id='d'")
    assert.equal(api.db.prepare('SELECT COUNT(*) AS n FROM study_v2_notes').get().n,0)
    assert.deepEqual(api.db.prepare('PRAGMA foreign_key_check').all(),[])
  }finally{await api.close()}
})
test('Fiches V2 : génération interrompue jamais relancée automatiquement et plafond documentaire',async()=>{
  const api=repository()
  try {
    const created=api.notes.create('u','d',{requestId:'interrupted',kind:'structured'}).note
    api.db.prepare("UPDATE study_v2_notes SET generation_state='running',lease_until=0 WHERE id=?").run(created.id)
    api.notes.pump()
    assert.equal(api.notes.get('u','d',created.id).generationState,'interrupted')
    assert.equal(api.notes.get('u','d',created.id).items.length,0)
    assert.equal(NOTE_LEASE_MS,60000)
    for(let i=1;i<MAX_NOTES_PER_DOCUMENT;i++)api.db.prepare("INSERT INTO study_v2_notes(id,document_id,user_id,request_id,request_hash,kind,title,source_version,scope_json,generation_state,created_at,updated_at) VALUES(?,?,?,?,?,'short','Fiche',1,'{}','failed',1,1)").run('limit-'+i,'d','u','limit-'+i,'hash')
    assert.throws(()=>api.notes.create('u','d',{requestId:'too-many',kind:'short'}),error=>error.status===403)
  }finally{await api.close()}
})

test('Fiches V2 : quota refusé explicite, demande identique non relancée et aucune génération débitée',async()=>{
  let calls=0
  const api=repository({provider:{name:'gemini',async generateStudySummary(){calls++;throw Object.assign(new Error('Budget IA atteint.'),{status:429,code:'AI_DAILY_BUDGET'})}}})
  try {
    const note=api.notes.create('u','d',{requestId:'quota',kind:'structured'}).note
    await api.notes.drain()
    assert.equal(api.notes.get('u','d',note.id).generationState,'failed')
    assert.equal(api.notes.get('u','d',note.id).errorCode,'AI_DAILY_BUDGET')
    assert.equal(api.notes.create('u','d',{requestId:'quota',kind:'structured'}).note.id,note.id)
    await api.notes.drain();assert.equal(calls,1)
    assert.equal(api.db.prepare("SELECT generations_used FROM study_quotas WHERE user_id='u'").get().generations_used,0)
  }finally{await api.close()}
})
test('Fiches V2 : preuves hors cours refusées et génération sans résultat remboursée',async()=>{
  const api=repository({provider:{name:'gemini',async generateStudySummary(){return {chapters:[{id:'s1',proofs:[{text:'La pression est de 99 mmHg.',sourceExcerpt:'La pression est de 99 mmHg.'}]}],generation:{mode:'gemini'}}}}})
  try {
    const note=api.notes.create('u','d',{requestId:'no-evidence',kind:'detailed'}).note
    await api.notes.drain()
    assert.equal(api.notes.get('u','d',note.id).generationState,'failed')
    assert.equal(api.notes.get('u','d',note.id).items.length,0)
    assert.equal(api.db.prepare("SELECT generations_used FROM study_quotas WHERE user_id='u'").get().generations_used,0)
  }finally{await api.close()}
})
test('Fiches V2 : plusieurs niveaux indépendants, édition concurrente et sources non modifiables',async()=>{
  const api=repository()
  try {
    const created=Object.keys(NOTE_LEVELS).map(kind=>api.notes.create('u','d',{requestId:'kind-'+kind,kind}).note)
    await api.notes.drain()
    assert.equal(api.notes.list('u','d').length,3)
    const original=api.notes.get('u','d',created[0].id)
    assert.ok(original.items.length)
    assert.ok(original.items.every(item => item.page === Number(item.sectionId.slice(1))))
    assert.throws(()=>api.notes.patch('u','d',original.id,{expectedEditVersion:1,items:[{id:original.items[0].id,text:'Modifié',sourceExcerpt:'Preuve falsifiée'}]}),error=>error.status===400)
    api.notes.patch('u','d',original.id,{expectedEditVersion:1,title:'Premier éditeur'})
    assert.throws(()=>api.notes.patch('u','d',original.id,{expectedEditVersion:1,title:'Second éditeur'}),error=>error.status===409)
    assert.equal(api.notes.get('u','d',original.id).title,'Premier éditeur')
    assert.equal(api.db.prepare('SELECT COUNT(*) AS n FROM study_summaries').get().n,0)
  }finally{await api.close()}
})

test('Fiches V2 : directives de détail appliquées seulement au nouveau parcours',async()=>{
  const {GeminiPedagogy}=await import('../server/ai/pedagogy.mjs')
  const {SUMMARY_INSTRUCTION}=await import('../server/ai/summary.mjs')
  const instructions=[]
  const provider=new GeminiPedagogy({}, {client:{model:'fixture',async json({instruction,data}){instructions.push(instruction);return {points:data.fragments.map(fragment=>({sourceSectionId:fragment.sectionId,sourceExcerpt:fragment.content,text:fragment.content,category:'À retenir'}))}}}})
  const context={documentTitle:'Rein',sections:[{id:'s',title:'Rein',content:'Le rein filtre le plasma sanguin et assure la filtration glomérulaire.',startPage:1,endPage:1}]}
  await provider.generateStudySummary({...context,detailLevel:'short'})
  assert.match(instructions[0],/au plus deux idées essentielles par section/)
  await provider.generateStudySummary(context)
  assert.ok(instructions[1].endsWith(SUMMARY_INSTRUCTION))
})

test('Fiches V2 : tableau uniquement lorsqu’il existe dans la preuve source, sans inventer de cellule',()=>{
  const text='Paramètre | Valeur\nPression | 44 mmHg'
  const scope={sections:[{id:'s',title:'Mesures',content:text,startPage:1,endPage:1}],pages:[{page:1,text}]}
  const result=noteItems({chapters:[{id:'s',proofs:[{text:'La pression est de 44 mmHg.',sourceExcerpt:'Paramètre | Valeur Pression | 44 mmHg'}]}]},scope,'structured')
  assert.equal(result.items[0].sourceExcerpt,text)
  assert.deepEqual(result.items[0].sourceTable,[['Paramètre','Valeur'],['Pression','44 mmHg']])
})


test('Fiches V2 : changer ou retirer une unité chiffrée est refusé sans inventer de conversion',()=>{
  const source='La pression de filtration atteint 44 mmHg.'
  const scope={sections:[{id:'s',title:'Filtration',content:source,startPage:1,endPage:1}],pages:[{page:1,text:source}]}
  const summary=text=>({chapters:[{id:'s',proofs:[{text,sourceExcerpt:source}]}]})
  assert.throws(()=>noteItems(summary('La pression de filtration atteint 44 mL.'),scope,'structured'),error=>error.status===422)
  assert.throws(()=>noteItems(summary('La pression de filtration atteint 44.'),scope,'structured'),error=>error.status===422)
  assert.equal(noteItems(summary('La pression de filtration atteint 44 mm Hg.'),scope,'structured').items.length,1)
})


test('Fiches V2 locales : titre de chapitre séparé et définition courte pertinente conservée',()=>{
  const sections=[{id:'s',title:'Anatomie rénale',content:'Chapitre 1 : Anatomie rénale\n\nLe rein filtre le plasma sanguin.\n\nLe cortex rénal contient les glomérules.',startPage:1,endPage:1}]
  const local=localNoteSummary('Rein',sections,'structured',generateLocalSummary)
  const result=noteItems(local,{sections,pages:[{page:1,text:sections[0].content}]},'structured')
  assert.ok(result.items.some(item=>item.text==='Le rein filtre le plasma sanguin.'))
  assert.ok(result.items.every(item=>!item.text.startsWith('Chapitre 1')))
})


test('Fiches V2 : signe négatif préservé, plages non interprétées comme valeurs négatives',()=>{
  const make=(content,text)=>noteItems({chapters:[{id:'s',proofs:[{text,sourceExcerpt:content}]}]},{sections:[{id:'s',title:'Mesure',content,startPage:1,endPage:1}],pages:[{page:1,text:content}]},'structured')
  assert.throws(()=>make('Le potentiel indiqué dans le cours est −70 mV.','Le potentiel indiqué dans le cours est 70 mV.'),error=>error.status===422)
  assert.equal(make('Le potentiel indiqué dans le cours est −70 mV.','Le potentiel indiqué dans le cours est -70 mV.').items.length,1)
  assert.equal(make('La pression indiquée est 40-60 mmHg.','La pression indiquée est de 40 à 60 mmHg.').items.length,1)
})
test('Fiches V2 : origine partiellement extraite signalée même après une récupération du document',async()=>{
  const api=repository()
  try {
    api.db.prepare("UPDATE study_v2_document_meta SET processing_state='partial' WHERE document_id='d'").run()
    api.db.prepare('INSERT INTO study_pdf_extractions VALUES(?,?,?)').run('d','u',JSON.stringify({method:'pdfjs',warnings:['Une page est illisible.']}))
    const note=api.notes.create('u','d',{requestId:'partial',kind:'structured'}).note
    await api.notes.drain()
    api.db.prepare("UPDATE study_v2_document_meta SET processing_state='ready',current_version=2 WHERE document_id='d'").run()
    const saved=api.notes.get('u','d',note.id)
    assert.equal(saved.sourceState,'partial');assert.equal(saved.sourceVersion,1)
    assert.deepEqual(saved.extraction.warnings,['Une page est illisible.'])
  }finally{await api.close()}
})

test('Fiches V2 locales : phrase pronominale conservée avec son antécédent verbatim, sans assouplir le garde-fou',()=>{
  const content='La veine médiane cubitale relie les réseaux superficiels. Elle est souvent utilisée pour la ponction veineuse, mais ses configurations sont variables.'
  const sections=[{id:'s',title:'Veine médiane cubitale',content,startPage:1,endPage:1}]
  for(const kind of ['short','structured','detailed']){
    const result=noteItems(localNoteSummary('Veines',sections,kind,generateLocalSummary),{sections,pages:[{page:1,text:content}]},kind)
    assert.ok(result.items.some(item=>item.text.includes('Elle est souvent utilisée')))
    assert.ok(result.items.every(item=>!item.text.startsWith('Elle')))
    assert.equal(result.items[0].sourceExcerpt,content)
  }
  const separated=[{...sections[0],content:'La veine médiane cubitale relie les réseaux superficiels.\nElle est souvent utilisée pour la ponction veineuse.'}]
  const result=noteItems(localNoteSummary('Veines',separated,'structured',generateLocalSummary),{sections:separated,pages:[{page:1,text:separated[0].content}]},'structured')
  assert.ok(!result.items.some(item=>item.text.includes('Elle est souvent utilisée')))
})
test('Fiches V2 locales : regroupement de prose ne fragmente pas les tableaux de source',()=>{
  const content='Paramètre | Valeur\nPression | 44 mmHg'
  const sections=[{id:'s',title:'Mesures',content,startPage:1,endPage:1}]
  const result=noteItems(localNoteSummary('Mesures',sections,'detailed',generateLocalSummary),{sections,pages:[{page:1,text:content}]},'detailed')
  assert.deepEqual(result.items[0].sourceTable,[['Paramètre','Valeur'],['Pression','44 mmHg']])
})
