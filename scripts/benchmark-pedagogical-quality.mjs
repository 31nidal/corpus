// Bounded real benchmark: 6 subjects × (cards + summary). Key stays server-side.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {GeminiPedagogy} from '../server/ai/pedagogy.mjs'
import {extractStudyPdf} from '../server/study/pdf-layout.mjs'
import {extractPdfPagesAndText} from '../server/pdfExtractor.mjs'
import {generateLocalNoteDrafts} from '../server/flashcards/generation.mjs'

import {pedagogicalSubjects as corpus} from '../tests/fixtures/pedagogical-subjects.mjs'

const provider=new GeminiPedagogy(process.env)
const output=process.argv[2]||'/private/tmp/pedagogical-quality-report.json'
const previous=process.argv.includes('--cards-only')&&existsSync(output)?JSON.parse(readFileSync(output,'utf8')):null
let rawResponses=[]
const originalJson=provider.client.json.bind(provider.client)
provider.client.json=async args=>{const result=await originalJson(args);if(result.cards)rawResponses.push({task:args.data.task,cards:result.cards});return result}
const report={date:'2026-10-11',model:provider.client.model,subjects:[],pdfs:[],limitations:['Échantillon limité ; aucune certification médicale automatique.','La reconstruction de colonnes reste heuristique.','Safari/iPhone et lecteur d’écran non vérifiés manuellement.']}
for(const [subject,text] of corpus){
  rawResponses=[]
  const sections=[{id:'s1',title:subject,content:text,startPage:1,endPage:1}]
  try{
    const cards=await provider.generateFlashcards({subject,sections,requestedCount:5,level:'standard'})
    const earlier=previous?.subjects.find(s=>s.subject===subject)
    const summary=earlier?{chapters:earlier.summary,generation:earlier.summaryGeneration}:await provider.generateStudySummary({subject,sections,documentTitle:subject})
    const local=generateLocalNoteDrafts({text,subject,requestedCount:5,level:'standard',source:{type:'free_text'}})
    report.subjects.push({subject,localCount:local.length,localCards:local.map(c=>({type:c.noteType,fields:c.fields})),count:cards.length,cards:cards.map(c=>({type:c.noteType,fields:c.fields,proof:c.sourceExcerpt})),summary:summary.chapters,generation:cards.generation,summaryGeneration:summary.generation,rawResponses})
    console.log(`${subject}: local ${local.length}, Gemini ${cards.length}, synthèse ${summary.chapters.flatMap(c=>c.keyPoints).length} points`)
  }catch(error){report.subjects.push({subject,errorCode:error.code||'UNKNOWN',error:error.message});console.log(`${subject}: échec ${error.code||'UNKNOWN'}`)}
}
for(const filename of ['cardiologie-college.pdf','cardiologie-uness.pdf','pharmacologie-lyon.pdf','physiologie-grenoble.pdf']){
  const path=`/private/tmp/corpus-real-pdfs/${filename}`
  if(!existsSync(path)){report.pdfs.push({filename,error:'PDF de validation absent localement'});continue}
  const buffer=readFileSync(path)
  let before
  try{const result=extractPdfPagesAndText(buffer);before={pages:result.pageCount,characters:result.totalText.length}}catch(error){before={errorCode:error.code}}
  try{const after=await extractStudyPdf(buffer);report.pdfs.push({filename,before,after:{pages:after.pageCount,characters:after.totalText.length,method:after.extraction.method,warnings:after.extraction.warnings}});console.log(`${filename}: ${after.pageCount} pages, ${after.totalText.length} caractères, ${after.extraction.method}`)}catch(error){report.pdfs.push({filename,before,after:{errorCode:error.code,error:error.message}})}
}
writeFileSync(output,JSON.stringify(report,null,2))
if(report.subjects.some(result=>result.errorCode)||report.pdfs.some(result=>result.after?.errorCode))process.exitCode=1
