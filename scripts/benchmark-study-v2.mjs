// Run with Node's existing TS loader. Default is local and makes no paid call.
import {readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs'
import {createHash,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {performance} from 'node:perf_hooks'
import {DatabaseSync} from 'node:sqlite'
import {courses} from '../src/study/curriculum.ts'
import {generateLocalNoteDrafts,normalize} from '../server/flashcards/generation.mjs'
import {generateLocalSummary,initStudySchema} from '../server/study.mjs'
import {localNoteSummary,noteItems,noteCoverage,canonicalSource} from '../server/study/v2/note-sources.mjs'
import {extractInWorker} from '../server/study/v2/pipeline.mjs'
import {chunkIntoSections} from '../server/pdfExtractor.mjs'
import {GeminiPedagogy} from '../server/ai/pedagogy.mjs'
import {generateWithQuota} from '../server/ai/generation.mjs'
import {questionSettings} from '../server/study/v2/question-validation.mjs'
import {validateAssistantResponse} from '../server/ai/document-assistant.mjs'

const arg=(name,fallback)=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)||fallback
const baseline=arg('baseline','c6e98d1'),output=arg('output','/private/tmp/study-v2-benchmark.json')
if(!/^[0-9a-f]{7,40}$/.test(baseline))throw new Error('SHA de base invalide.')
const baselineFile=new URL(`../server/flashcards/.__study_v2_baseline_${randomUUID()}.mjs`,import.meta.url)
const notesBaseline=arg('notes-baseline','80fbfc0')
if(!/^[0-9a-f]{7,40}$/.test(notesBaseline))throw new Error('SHA de base des fiches invalide.')
const notesBaselineFile=new URL(`../server/study/v2/.__study_v2_notes_${randomUUID()}.mjs`,import.meta.url)
const report={date:new Date().toISOString(),baseline,catalog:[],pdfs:[],live:[],limitations:[
  'Comptages et preuves littérales, sans certification médicale ou exhaustivité sémantique.',
  'Les fiches locales sont extractives ; leur qualité ne prouve pas celle de Gemini.',
  'Safari/iPhone, gestes tactiles et lecteur d’écran non vérifiés manuellement.',
]}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const hash=value=>{let result=2166136261;for(const letter of value){result^=letter.charCodeAt(0);result=Math.imul(result,16777619)}return result>>>0}
const duplicates=cards=>cards.length-new Set(cards.map(card=>normalize(card.front))).size
const medical=['Anatomie','Physiologie','Pharmacologie','Biochimie'].flatMap(category=>courses.filter(course=>course.category===category)
  .sort((a,b)=>hash('validation-quality-v1:'+a.id)-hash('validation-quality-v1:'+b.id)).slice(0,15))
const sectionsFor=course=>course.sections.map((section,index)=>({id:section.id||`${course.id}-${index}`,title:section.title,
  content:[section.title,section.text,...(section.bullets||[])].filter(Boolean).join('\n'),startPage:index+1,endPage:index+1}))
const scopeFor=sections=>({sections,pages:sections.map(section=>({page:section.startPage,text:section.content}))})
function proofCharacterCoverage(scope,items){
  let represented=0,total=0
  for(const section of scope.sections){
    const source=canonicalSource(section.content);total+=source.length
    const intervals=items.filter(item=>item.sectionId===section.id).map(item=>{
      const proof=canonicalSource(item.sourceExcerpt),start=source.indexOf(proof)
      return [start,start+proof.length]
    }).filter(([start])=>start>=0).sort((a,b)=>a[0]-b[0])
    let end=0
    for(const [start,next]of intervals){if(next>end){represented+=next-Math.max(start,end);end=next}}
  }
  return {represented,total,ratio:total?Number((represented/total).toFixed(4)):0}
}
function measureNotes(module,course,sections,scope,kind){
  try{
    const result=module.noteItems(module.localNoteSummary(course.title,sections,kind,generateLocalSummary),scope,kind,{preserveQuantities:true})
    const coverage=noteCoverage(scope,result.items)
    return {points:result.items.length,refused:result.refused,reasons:result.rejectionReasons,
      sectionsTotal:coverage.sectionsTotal,sectionsRepresented:coverage.sectionsRepresented,
      missingSections:coverage.missingSections.map(section=>section.id),missingWrittenQuantities:coverage.missingQuantities.length,
      proofCharacters:proofCharacterCoverage(scope,result.items)}
  }catch(error){return {errorCode:error.code||'NO_GROUNDED_RESULT',message:error.message}}
}

try{
  writeFileSync(baselineFile,execFileSync('git',['show',`${baseline}:server/flashcards/generation.mjs`]),{mode:0o600})
  writeFileSync(notesBaselineFile,execFileSync('git',['show',`${notesBaseline}:server/study/v2/note-sources.mjs`]),{mode:0o600})
  const before=(await import(baselineFile.href)).generateLocalNoteDrafts
  const beforeNotes=await import(notesBaselineFile.href)
  report.notesBaseline=notesBaseline
  for(const course of medical){
    const sections=sectionsFor(course),text=sections.map(section=>section.content).join('\n')
    const input={text,requestedCount:60,level:'complete',source:{type:'catalog_course'},subject:course.category,chapter:course.title}
    const old=before(input),diagnostics={},next=generateLocalNoteDrafts({...input,diagnostics}),scope=scopeFor(sections)
    const lost=old.filter(card=>!next.some(next=>normalize(next.source.excerpt).includes(normalize(card.source.excerpt))))
    const notes={},notesBefore={}
    for(const kind of ['short','structured','detailed']){
      notes[kind]=measureNotes({noteItems,localNoteSummary},course,sections,scope,kind)
      notesBefore[kind]=measureNotes(beforeNotes,course,sections,scope,kind)
    }
    report.catalog.push({id:course.id,title:course.title,category:course.category,sections:sections.length,characters:text.length,
      before:old.length,after:next.length,duplicatesBefore:duplicates(old),duplicatesAfter:duplicates(next),
      proofFailures:next.filter(card=>!normalize(text).includes(normalize(card.source.excerpt))).length,
      lost:lost.map(card=>({type:card.noteType,front:card.front,proof:card.source.excerpt})),diagnostics,notes,notesBefore})
  }
}finally{rmSync(baselineFile,{force:true});rmSync(notesBaselineFile,{force:true})}

const medicalHashes={
  'cardiologie-uness':'6871cb0b189e0a99baf26c8d99be7d06cb5037692ef790cb10cc37938ebb3050',
  'physiologie-grenoble':'7e81b2060d74374bf46b0500d9ed1ad85bd350a300b9c8843d0e9066abee13ed',
  'pharmacologie-lyon':'698fdb0bd16e660900399a1717513f2887e735435d1da7e36529539f9b76ae65',
  'cardiologie-college':'b99ed323d1f8120ad92c7e5b9303075559702327280b16f7994754ec9b73f51a',
}
const files=[...Object.keys(medicalHashes).map(name=>({name,path:`${arg('pdf-dir','/private/tmp/corpus-real-pdfs')}/${name}.pdf`})),
  ...['derivee','python','inflation'].map(name=>({name,path:`${arg('nonmedical-dir','/private/tmp/nonmedical-pdf-trial')}/${name}.pdf`}))]
for(const {name,path}of files){
  const row={name};report.pdfs.push(row)
  if(!existsSync(path)){row.errorCode='PDF_REFERENCE_MISSING';continue}
  const bytes=readFileSync(path);Object.assign(row,{bytes:bytes.length,sha256:sha(bytes),matchesPreviousReference:medicalHashes[name]?sha(bytes)===medicalHashes[name]:null})
  const started=performance.now()
  try{
    const parsed=await extractInWorker(bytes),sections=chunkIntoSections(parsed.pages.filter(page=>page.text.trim()))
    Object.assign(row,{pages:parsed.pageCount,characters:parsed.totalText.length,sections:sections.length,method:parsed.extraction.method,
      warnings:parsed.extraction.warnings,pagesWithoutText:parsed.pages.filter(page=>!page.text.trim()).map(page=>page.pageNumber),
      blockKinds:parsed.pages.reduce((counts,page)=>{for(const block of page.blocks||[]){const kind=block.heading?'heading':block.code?'code':block.table?'table':'paragraph';counts[kind]=(counts[kind]||0)+1};return counts},{})})
  }catch(error){row.errorCode=error.code||'PDF_FAILED';row.error=error.message}
  row.durationMs=Math.round(performance.now()-started)
}

// Optional bounded real Gemini evaluation: never print configuration or keys.
if(process.argv.includes('--live')){
  if(!process.env.GEMINI_API_KEY)report.live.push({state:'unavailable',errorCode:'AI_CONFIGURATION'})
  else{
    const config={...process.env,AI_MONTHLY_GENERATIONS:'3',AI_DAILY_BUDGET_USD:'.10'}
    const provider=new GeminiPedagogy(config),db=new DatabaseSync(':memory:')
    db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('benchmark');")
    initStudySchema(db)
    const callLimit=Number(arg('live-limit','8'))
    if(!Number.isSafeInteger(callLimit)||callLimit<1||callLimit>8)throw new Error('Plafond HTTP invalide.')
    const tasks=arg('live-task','all')==='all'?['revision','study_questions','document_assistant']:[arg('live-task','all')]
    if(tasks.some(task=>!['revision','study_questions','document_assistant'].includes(task)))throw new Error('Tâche de benchmark invalide.')
    let invocations=0,httpCalls=0
    const originalFetch=provider.client.fetch
    provider.client.fetch=(...args)=>{
      if(httpCalls>=callLimit)throw new Error('Plafond HTTP du benchmark atteint.')
      httpCalls++;return originalFetch(...args)
    }
    const original=provider.client.json.bind(provider.client)
    provider.client.json=options=>{
      if(++invocations>callLimit)throw Object.assign(new Error('Limite de huit appels de benchmark atteinte.'),{code:'AI_BENCHMARK_LIMIT',status:429})
      return original(options)
    }
    const course=courses.find(course=>course.id===arg('live-course','phys-renal'))
    if(!course)throw new Error('Cours du catalogue introuvable.')
    const sections=sectionsFor(course),scope=scopeFor(sections)
    try{
      for(const task of tasks){
        const started=performance.now(),row={task,course:course.id};report.live.push(row)
        const context={...scope,documentTitle:course.title,kind:'revision',detailLevel:'structured',
          settings:questionSettings({count:2}),prompt:arg('prompt','Quels sont les mécanismes décrits dans ce cours et leurs conditions ?'),history:[]}
        try{
          const result=await generateWithQuota({db,userId:'benchmark',provider,config,task,context,allowLocalFallback:false,
            local:()=>{throw new Error('Pas de résultat local pour le benchmark distant.')}})
          if(task==='revision'){
            const notes=noteItems(result.value,scope,'structured',{preserveQuantities:true}),coverage=noteCoverage(scope,notes.items)
            Object.assign(row,{points:notes.items.length,refused:notes.refused,coverage})
          }else if(task==='study_questions')Object.assign(row,{questions:result.value.questions.length,verificationPassed:result.value.questions.every(question=>question.verification.passed)})
          else{const response=validateAssistantResponse(result.value,scope);Object.assign(row,{answered:response.answered,paragraphs:response.paragraphs.length,verified:result.value.verified===true})}
          Object.assign(row,{state:'succeeded',generation:result.generation})
          if(process.argv.includes('--include-generated'))row.generated=result.value
        }catch(error){Object.assign(row,{state:'failed',errorCode:error.code||'AI_FAILED',message:error.message,generation:error.generation});row.durationMs=Math.round(performance.now()-started);break}
        row.durationMs=Math.round(performance.now()-started)
      }
    }finally{report.liveHttpCalls=httpCalls;db.close()}
  }
}
report.summary=['Anatomie','Physiologie','Pharmacologie','Biochimie'].map(category=>{
  const rows=report.catalog.filter(row=>row.category===category)
  return {category,courses:rows.length,before:rows.reduce((n,row)=>n+row.before,0),after:rows.reduce((n,row)=>n+row.after,0),
    duplicates:rows.reduce((n,row)=>n+row.duplicatesAfter,0),proofFailures:rows.reduce((n,row)=>n+row.proofFailures,0),lost:rows.reduce((n,row)=>n+row.lost.length,0),
    notes:Object.fromEntries(['short','structured','detailed'].map(kind=>[kind,{points:rows.reduce((n,row)=>n+(row.notes[kind].points||0),0),
      failures:rows.filter(row=>row.notes[kind].errorCode).length,sectionsTotal:rows.reduce((n,row)=>n+(row.notes[kind].sectionsTotal||0),0),
      sectionsRepresented:rows.reduce((n,row)=>n+(row.notes[kind].sectionsRepresented||0),0),refused:rows.reduce((n,row)=>n+(row.notes[kind].refused||0),0)}]))}
})
writeFileSync(output,JSON.stringify(report,null,2))
console.log(JSON.stringify({output,summary:report.summary,pdfs:report.pdfs.map(({warnings,...row})=>({...row,warnings: warnings?.length})),live:report.live.map(({generated,...row})=>row)},null,2))
if(report.pdfs.some(row=>row.errorCode)||report.live.some(row=>row.state!=='succeeded')||report.catalog.some(row=>row.proofFailures||row.lost.length))process.exitCode=1
