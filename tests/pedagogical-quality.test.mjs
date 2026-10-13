import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
import {layoutText,extractStudyPdf} from '../server/study/pdf-layout.mjs'
import {cardQuality,summaryText,uniqueCards,literalCardAnswer} from '../server/ai/quality.mjs'
import {GeminiPedagogy} from '../server/ai/pedagogy.mjs'
import {chunkIntoSections} from '../server/pdfExtractor.mjs'
import {initStudySchema} from '../server/study.mjs'
import {sourcePage} from '../server/study/source-page.mjs'
import {transcribeMissingPages} from '../server/study/ocr-pages.mjs'
import {recoverMathText} from '../server/study/pdf-text.mjs'
import {getOrResetStudyQuota} from '../server/study/quota.mjs'

const run=(str,x,y,width=200,height=12)=>({str,transform:[height,0,0,height,x,y],width,height})
test('PDF : colonnes non alignées et lignes courtes ne mélangent pas les paragraphes',()=>{
  const items=[]
  for(let i=0;i<5;i++) {
    items.push(run(`Paragraphe de gauche : explication détaillée numéro ${i}.`,40,700-i*32,230))
    items.push(run(`Paragraphe de droite : explication détaillée numéro ${i}.`,320,700-i*32,230))
    items.push(run('suite à gauche.',40,684-i*32,95))
  }
  const text=layoutText(items,600).text
  assert.ok(text.indexOf('numéro 4.')<text.indexOf('Paragraphe de droite'))
  assert.equal((text.match(/suite à gauche/g)||[]).length,5)
})
test('PDF : indentation et lignes du code conservées jusque dans les sections',()=>{
  const styles={mono:{fontFamily:'monospace'}}
  const code=(text,x,y)=>({...run(text,x,y,text.length*6),fontName:'mono'})
  const layout=layoutText([code('for i in range(3):',40,700),code('print(i)',64,684),code('print("fin")',40,668)],600,styles)
  assert.equal(layout.text,'```\nfor i in range(3):\n    print(i)\nprint("fin")\n```')
  const sections=chunkIntoSections([{pageNumber:1,text:layout.text,headings:[]}])
  assert.match(sections[0].content,/\n    print\(i\)/)
})
test('PDF : indices attachés, glyphes AMS corrigés sans changer les chiffres ordinaires',()=>{
  const layout=layoutText([run('Soit x',40,700,30),run('0',70,697,5,8),run(' dans I.',75,700,50)],600)
  assert.match(layout.text,/x_\{0\}/)
  assert.equal(recoverMathText('x 6 M','ABCDEF+MSAM10'),'x ⩽ M')
  assert.equal(recoverMathText('6 > 3','Helvetica'),'6 > 3')
})
test('PDF : métadonnées de titres excluent les formules et ne tronquent pas Dérivée ou L’essentiel',()=>{
  const text='Dérivée d’une fonction\n\n'+('Une explication claire de la dérivée. '.repeat(12))+'\n\n| 0\n\nL’essentiel\n\n'+('Une autre explication claire. '.repeat(12))
  const sections=chunkIntoSections([{pageNumber:1,text,headings:['Dérivée d’une fonction','L’essentiel']}])
  assert.equal(sections[0].title,'Dérivée d’une fonction')
  assert.equal(sections[1].title,'L’essentiel')
  assert.ok(!sections.some(s=>s.title==='| 0'))
})
test('PDF : ordre visuel, paragraphes, titre, ligatures et formule intacte',()=>{
  const result=layoutText([run('dans le cytoplasme.',40,680),run('La glycolyse se déroule',40,700),run('MÉTABOLISME',40,740,200,20),run('E = mc² ; ∫ f(x) dx ; Na⁺',40,630)],600)
  assert.equal(result.text,'MÉTABOLISME\n\nLa glycolyse se déroule dans le cytoplasme.\n\nE = mc² ; ∫ f(x) dx ; Na⁺')
  assert.equal(layoutText([run('Le ﬁltre rénal',40,700)],600).text,'Le filtre rénal')
})
test('PDF : colonnes lues intégralement avant la colonne suivante, tableau conservé',()=>{
  const items=[]
  for(let i=0;i<4;i++){items.push(run(`Colonne gauche : phrase longue de physiologie ${i}.`,40,700-i*16,230));items.push(run(`Colonne droite : phrase longue de pharmacologie ${i}.`,320,700-i*16,230))}
  const result=layoutText(items.reverse(),600)
  assert.equal(result.columns,2)
  assert.ok(result.text.indexOf('physiologie 3')<result.text.indexOf('pharmacologie 0'))
  const table=layoutText([run('Sodium',40,700,40),run('135–145 mmol/L',220,700,100),run('Potassium',40,680,70),run('3,5–5 mmol/L',220,680,100)],600)
  assert.match(table.text,/Sodium \| 135–145 mmol\/L/)
  assert.equal(table.columns,1)
})
test('PDF : les trois compressions restent lisibles et les titres ne disparaissent pas',async()=>{
  for(const name of ['reportlab-a85-flate.pdf','reportlab-flate.pdf','reportlab-raw.pdf']){
    const result=await extractStudyPdf(readFileSync(new URL(`./fixtures/pdf-compression/${name}`,import.meta.url)))
    assert.equal(result.pageCount,1)
    assert.match(result.totalText,/rein/)
    assert.match(result.totalText,/coeur/)
  }
  const sections=chunkIntoSections([{pageNumber:1,text:'Le contenu introductif est assez long pour former une première section.\nI. Physiologie\nLe rein filtre le plasma sanguin.'}])
  assert.ok(sections.some(section=>section.content.includes('I. Physiologie')))
})
test('Flashcards : réponses tronquées, questions sans contexte et cloze tout masqué refusés',()=>{
  assert.equal(cardQuality({noteType:'basic',fields:{front:'Quel est son rôle ?',back:'la filtration'}}),'ambiguous_question')
  assert.equal(cardQuality({noteType:'basic',fields:{front:'Quel est le rôle de l’aldostérone ?',back:'augmente la réabsorption de'}}),'incomplete_answer')
  assert.equal(cardQuality({noteType:'cloze',fields:{text:'{{c1::Le rein filtre le plasma.}}'}}),'cloze_without_context')
  assert.equal(cardQuality({noteType:'typed',fields:{front:'Quel est le débit cardiaque au repos ?',answer:'5 L/min'}}),null)
  assert.equal(cardQuality({noteType:'cloze',fields:{text:'Le rein filtre le {{c1::plasma}} sanguin.'}}),null)
})
test('Flashcards : pas de questions identiques avec deux réponses, rejets comptés',()=>{
  const generation={rejected:0,rejectionReasons:{}}
  const card=(back,sourceExcerpt)=>({noteType:'basic',fields:{front:'Quel est le débit cardiaque au repos ?',back},sourceExcerpt})
  const result=uniqueCards([[card('5 L/min','Au repos, le débit est 5 L/min.')],[card('5 L/min','Le débit atteint 5 L/min au repos.'),card('10 L/min','Le débit est 10 L/min.')]],generation).flat()
  assert.equal(result.length,1)
  assert.deepEqual(generation,{rejected:2,rejectionReasons:{duplicate:1,conflicting_question:1}})
})
test('Synthèse : reformulation avec preuve séparée, chiffres inventés refusés',()=>{
  assert.equal(summaryText({text:'La glycolyse a lieu dans le cytoplasme.',sourceExcerpt:'La glycolyse se déroule dans le cytoplasme.'}),'La glycolyse a lieu dans le cytoplasme.')
  assert.equal(summaryText({text:'La glycolyse produit 38 ATP.',sourceExcerpt:'La glycolyse produit 2 ATP.'}),null)
})
test('Synthèse : les 20 sections, y compris la dernière, sont représentées et catégorisées',async()=>{
  const sections=Array.from({length:20},(_,i)=>({id:`s${i}`,title:`Section ${i}`,content:`La notion ${i} correspond à une définition précise dans le cours. `.repeat(30),startPage:i+1,endPage:i+1}))
  const client={model:'fake',json:async({data})=>({points:data.fragments.map(fragment=>({sourceSectionId:fragment.sectionId,sourceExcerpt:fragment.content.split('. ')[0]+'.',text:fragment.content.split('. ')[0]+'.',category:'Définition'}))})}
  const summary=await new GeminiPedagogy({}, {client}).generateStudySummary({sections})
  assert.equal(summary.chapters.length,20)
  assert.ok(summary.chapters.every(chapter=>chapter.keyPoints.length&&chapter.proofs.length&&chapter.categories.length))
  assert.match(summary.chapters.at(-1).keyPoints[0],/19/)
})
test('Preuve : page exacte et isolation, anciennes données compatibles, suppression en cascade',()=>{
  const db=new DatabaseSync(':memory:')
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u'),('other');")
  initStudySchema(db)
  db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,created_at,updated_at) VALUES('d','u','Cours','cours.pdf',100,'now','now')").run()
  db.prepare("INSERT INTO study_pdf_pages VALUES('d','u',2,'Le rein filtre le plasma sanguin.')").run()
  assert.equal(sourcePage(db,'u','d','Le rein filtre le plasma sanguin.',1),2)
  assert.equal(sourcePage(db,'other','d','Le rein filtre le plasma sanguin.',1),1)
  assert.equal(sourcePage(db,'u','unknown','Le rein filtre le plasma sanguin.',1),1)
  db.exec("DELETE FROM study_documents WHERE id='d'")
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_pdf_pages').get().n,0)
  db.close()
})

test('Flashcards : une seule réparation bornée pour un extrait réel, sans relâcher la preuve',async()=>{
  let calls=0
  const text='La glycolyse se déroule dans le cytoplasme.'
  const client={model:'fake',json:async({data})=>{
    calls++
    const section=data.fragments[0].sectionId
    return {cards:[{noteType:'basic',fields:{front:'Où se déroule la glycolyse ?',back:data.task==='repair'?'dans le cytoplasme':'dans le cytosol'},sourceSectionId:section,sourceExcerpt:text}]}
  }}
  const cards=await new GeminiPedagogy({}, {client}).generateFlashcards({requestedCount:5,sections:[{id:'a',content:(text+' ').repeat(275)},{id:'b',content:(text+' ').repeat(275)}]})
  assert.equal(calls,3,'deux blocs source et une seule réparation')
  assert.equal(cards.length,1)
  assert.equal(cards[0].fields.back,'dans le cytoplasme')
  assert.equal(cards.generation.repaired,1)
  assert.equal(cards.generation.rejected,1)
})

test('PDF mixte : OCR récupère la page vide sans remplacer le texte lisible, échec restitué',async()=>{
  const db=new DatabaseSync(':memory:')
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u');")
  initStudySchema(db)
  const extracted={pageCount:2,pages:[{pageNumber:1,text:'Le rein filtre le plasma sanguin.'},{pageNumber:2,text:''}],extraction:{method:'pdfjs',warnings:['Page 2 : aucun texte sélectionnable.']}}
  let recovered='Le cœur est situé dans le médiastin thoracique.'
  const provider={name:'gemini',extractScannedPdf:async()=>({pages:[{pageNumber:1,text:'Texte à ne jamais substituer au cours.',uncertain:false},{pageNumber:2,text:recovered,uncertain:false}],generation:{mode:'gemini'}})}
  const result=await transcribeMissingPages({extracted,buffer:Buffer.from('pdf'),db,userId:'u',provider,config:{}})
  assert.equal(result.extracted.pages[0].text,extracted.pages[0].text)
  assert.equal(result.extracted.pages[1].text,recovered)
  assert.deepEqual(result.extracted.extraction.warnings,[])
  assert.equal(getOrResetStudyQuota('u',db).generations_used,1)
  recovered=''
  const failed=await transcribeMissingPages({extracted,buffer:Buffer.from('pdf'),db,userId:'u',provider,config:{}})
  assert.match(failed.extracted.extraction.warnings[0],/aucun texte récupéré/)
  assert.equal(getOrResetStudyQuota('u',db).generations_used,1,'quota restitué si aucune page récupérée')
  db.close()
})

test('Régressions réelles : « de la » est grammatical et ne supprime ni ATP ni dérivée',async()=>{
  const source='La glycolyse produit un bilan net de 2 ATP. Pour une fonction f dérivable, la dérivée de f(x) = x² est f′(x) = 2x.'
  const cards=[
    {noteType:'basic',fields:{front:'Quel est le bilan net en ATP de la glycolyse ?',back:'un bilan net de 2 ATP'},sourceSectionId:'s',sourceExcerpt:'La glycolyse produit un bilan net de 2 ATP.'},
    {noteType:'basic',fields:{front:'Quelle est la dérivée de la fonction f(x) = x² ?',back:'f′(x) = 2x'},sourceSectionId:'s',sourceExcerpt:'Pour une fonction f dérivable, la dérivée de f(x) = x² est f′(x) = 2x.'},
  ]
  const result=await new GeminiPedagogy({}, {client:{model:'test',json:async()=>({cards})}}).generateFlashcards({sections:[{id:'s',content:source}],requestedCount:5})
  assert.equal(result.length,2)
  const fixed=literalCardAnswer({noteType:'basic',fields:{back:'le produit de la fréquence cardiaque par le volume d’éjection systolique'},sourceExcerpt:'Le débit cardiaque est égal au produit de la fréquence cardiaque par le volume d’éjection systolique.'})
  assert.equal(fixed.fields.back,'produit de la fréquence cardiaque par le volume d’éjection systolique')
  assert.ok(fixed.sourceExcerpt.includes(fixed.fields.back))
})

test('Flashcards : basic et cloze du même fait ne gonflent pas artificiellement le nombre',()=>{
  const proof='La glycolyse se déroule dans le cytoplasme.'
  const generation={rejected:0,rejectionReasons:{}}
  const result=uniqueCards([[{noteType:'basic',fields:{front:'Où se déroule la glycolyse ?',back:'dans le cytoplasme'},sourceExcerpt:proof},{noteType:'cloze',fields:{text:'La glycolyse se déroule dans le {{c1::cytoplasme}}.'},sourceExcerpt:proof}]],generation).flat()
  assert.equal(result.length,1)
  assert.equal(generation.rejectionReasons.duplicate_fact,1)
})

test('Synthèse : refuse inversion des bornes et renforcement des possibilités',()=>{
  assert.equal(summaryText({text:'La variation est minorée par M.',sourceExcerpt:'La variation est majorée : |f(x)-f(y)| ⩽ M.'}),null)
  assert.equal(summaryText({text:'Le médicament entraîne une somnolence.',sourceExcerpt:'Le médicament peut entraîner une somnolence.'}),null)
  assert.equal(summaryText({text:'Le médicament peut entraîner une somnolence.',sourceExcerpt:'Le médicament peut entraîner une somnolence.'}),'Le médicament peut entraîner une somnolence.')
})
test('Synthèse : réparation des sections absentes, preuve exacte et règles de source conservées',async()=>{
  const a='La demande augmente lorsque le prix diminue.',b='La production dépend des ressources disponibles.'
  let calls=0, firstSignal
  const client={model:'test',json:async({data,instruction,signal})=>{
    calls++
    if(data.task==='summary-repair') {
      assert.equal(signal,firstSignal)
      assert.match(instruction,/instructions/i)
      return {points:[{sourceSectionId:'b',text:b,sourceExcerpt:b,category:'Comprendre'}]}
    }
    firstSignal=signal
    return {points:[{sourceSectionId:'a',text:a,sourceExcerpt:a,category:'Comprendre'}]}
  }}
  const result=await new GeminiPedagogy({}, {client}).generateStudySummary({sections:[{id:'a',title:'Demande',content:a},{id:'b',title:'Production',content:b}]})
  assert.equal(calls,2)
  assert.equal(result.generation.summaryRepaired,1)
  assert.equal(result.generation.coverage.sectionsSummarized,2)
  assert.deepEqual(result.generation.coverage.missingSections,[])
})
test('Synthèse : échec de réparation explicite, aucune nouvelle tentative réseau',async()=>{
  const source='La demande augmente lorsque le prix diminue.'
  let calls=0
  const client={model:'test',json:async({data})=>{
    calls++
    if(data.task==='summary-repair')throw Object.assign(new Error('network'),{code:'NETWORK'})
    return {points:[{sourceSectionId:'a',text:source,sourceExcerpt:source,category:'Comprendre'}]}
  }}
  const result=await new GeminiPedagogy({}, {client}).generateStudySummary({sections:[{id:'a',content:source},{id:'b',title:'Production',content:'La production dépend des ressources disponibles.'}]})
  assert.equal(calls,2)
  assert.equal(result.generation.coverage.sectionsSummarized,1)
  assert.deepEqual(result.generation.coverage.missingSections,[{id:'b',title:'Production'}])
  assert.match(result.generation.message,/partielle/)
})

test('Synthèse : une preuve peut appartenir au second fragment de la même section',async()=>{
  const {validateSummary}=await import('../server/ai/summary.mjs')
  const text='La seconde explication précise les limites de la méthode.'
  const result=validateSummary({points:[{sourceSectionId:'s',sourceExcerpt:text,text,category:'Comprendre'}]},[{sectionId:'s',content:'Un premier fragment sans cette preuve.'},{sectionId:'s',content:text}])
  assert.equal(result.items.length,1)
})
test('Synthèse : la réparation reste plafonnée sans masquer les sections absentes',async()=>{
  const {MAX_SUMMARY_REPAIR_CALLS}=await import('../server/ai/summary.mjs')
  let repairs=0
  const sections=Array.from({length:8},(_,i)=>({id:`s${i}`,title:`Section ${i}`,content:`La notion ${i} présente une définition détaillée. `.repeat(100)}))
  const client={model:'test',json:async({data})=>{
    if(data.task==='summary-repair'){repairs++;return {points:[]}}
    const fragment=data.fragments.find(f=>f.sectionId==='s0')
    return {points:fragment?[{sourceSectionId:'s0',text:'La notion 0 présente une définition détaillée.',sourceExcerpt:'La notion 0 présente une définition détaillée.',category:'Comprendre'}]:[]}
  }}
  const result=await new GeminiPedagogy({}, {client}).generateStudySummary({sections})
  assert.equal(repairs,MAX_SUMMARY_REPAIR_CALLS)
  assert.equal(result.generation.coverage.missingSections.length,7)
})

test('Synthèse validée : couverture recalculée après suppression d’un point',async()=>{
  const {handleStudySupports}=await import('../server/study/supports.mjs')
  const db=new DatabaseSync(':memory:')
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u');")
  initStudySchema(db)
  db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,created_at,updated_at) VALUES('d','u','Cours','cours.pdf',100,'now','now')").run()
  const texts=['La demande dépend des prix disponibles.','La production dépend des ressources disponibles.']
  for(let i=0;i<2;i++)db.prepare('INSERT INTO study_sections VALUES(?,?,?,?,?,?,?,?,?)').run(`s${i}`,'d','u',`Section ${i}`,i,1,1,texts[i],10)
  const args={db,userId:'u',doc:{id:'d',title:'Cours'},provider:null,config:{},localSummary:()=>({chapters:texts.map((text,i)=>({id:`s${i}`,keyPoints:[text]}))})}
  const preview=await handleStudySupports({...args,body:{action:'generate',task:'summary'}})
  // Old/local payloads have no coverage; the save path remains compatible.
  const payload=JSON.parse(db.prepare('SELECT payload_json FROM study_generation_previews').get().payload_json)
  payload.generation.coverage={sectionsTotal:2,sectionsAnalyzed:2,chunksTotal:1,chunksAnalyzed:1,sectionsSummarized:2,missingSections:[]}
  db.prepare('UPDATE study_generation_previews SET payload_json=?').run(JSON.stringify(payload))
  const saved=await handleStudySupports({...args,body:{action:'save',previewId:preview.previewId,items:[preview.items[0]]}})
  assert.equal(saved.generation.coverage.sectionsSummarized,1)
  assert.deepEqual(saved.generation.coverage.missingSections,[{id:'s1',title:'Section 1'}])
  db.close()
})

test('Synthèse : les petits blocs ne réduisent pas la limite des cours longs',async()=>{
  const sections=Array.from({length:70},(_,i)=>({id:`s${i}`,content:`La notion ${i} correspond à une définition précise dans le cours. `.repeat(50)}))
  const client={model:'test',json:async({data})=>({points:data.fragments.map(fragment=>({sourceSectionId:fragment.sectionId,text:fragment.content.split('. ')[0]+'.',sourceExcerpt:fragment.content.split('. ')[0]+'.',category:'Comprendre'}))})}
  const result=await new GeminiPedagogy({}, {client}).generateStudySummary({sections})
  assert.equal(result.generation.coverage.sectionsSummarized,70)
  assert.ok(result.generation.coverage.chunksTotal<=32)
})

test('PDF structuré : une consigne d’exercice numérotée reste dans sa section',()=>{
  const intro='Les algorithmes sont présentés avec leurs conditions et leurs résultats. '.repeat(7)
  const instruction='1. Voici la fonction qui retourne la somme des cubes'
  const sections=chunkIntoSections([{pageNumber:1,headings:['1. Premiers pas avec Python','1.2. Somme des cubes'],text:`1. Premiers pas avec Python\n${intro}\n${instruction}\n${intro}\n1.2. Somme des cubes\n${intro}`}])
  assert.ok(sections.some(section=>section.title==='Somme des cubes'))
  assert.ok(!sections.some(section=>section.title.startsWith('Voici la fonction')))
  assert.ok(sections.some(section=>section.content.includes(instruction)))
})
