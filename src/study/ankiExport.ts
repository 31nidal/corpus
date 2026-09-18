import type {Course} from './curriculum'
import type {Question} from './questions'
import {validReview,type ReviewRecord} from './reviewSchedule'

export type AnkiExportMode='course'|'errors'|'difficult'
export type ReviewRecords=Record<string,ReviewRecord>
const warning='Contenu pédagogique — ne remplace pas les supports officiels de votre faculté.'

const html=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('\n','<br>')
const csv=(value:string)=>`"${value.replaceAll('"','""')}"`
export const tagSlug=(value:string)=>value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'cours'

export function parseReviewRecords(raw:string|null,knownQuestions:Question[]):ReviewRecords{
 try{const value=JSON.parse(raw||'{}');if(!value||typeof value!=='object'||Array.isArray(value))return {};const ids=new Set(knownQuestions.map(question=>question.id));return Object.fromEntries(Object.entries(value).filter(([id,record])=>ids.has(id)&&validReview(record))) as ReviewRecords}catch{return {}}
}

export function isDifficult(record:ReviewRecord|undefined){return Boolean(record&&record.seen>=3&&record.correct/record.seen<.7)}

export function selectAnkiQuestions(items:Question[],records:ReviewRecords,mode:AnkiExportMode){
 const selected=mode==='course'?items:mode==='errors'?items.filter(question=>records[question.id]?.wrong):items.filter(question=>isDifficult(records[question.id]))
 const ids=new Set<string>(),prompts=new Set<string>()
 return selected.filter(question=>{const prompt=question.prompt.trim().toLocaleLowerCase('fr');if(ids.has(question.id)||prompts.has(prompt))return false;ids.add(question.id);prompts.add(prompt);return true})
}

function sourceHtml(course:Course){
 const sources=course.sources?.length?course.sources:[{label:'Source pédagogique du cours',url:course.source}]
 return sources.map(source=>`<a href="${html(source.url)}">${html(source.label)}</a>`).join('<br>')
}

function answerHtml(question:Question,course:Course){
 const answers=question.correct.map(index=>`${String.fromCharCode(65+index)}. ${html(question.options[index]||'')}`).join('<br>')
 const explanations=question.options.map((option,index)=>`<b>${String.fromCharCode(65+index)}. ${html(option)}</b> — ${html(question.why[index]||'')}`).join('<br>')
 return `<b>Bonne${question.correct.length>1?'s':''} réponse${question.correct.length>1?'s':''}</b><br>${answers}<br><br><b>Explication</b><br>${explanations}<br><br><b>Source${(course.sources?.length||1)>1?'s':''}</b><br>${sourceHtml(course)}`
}

export function buildAnkiCsv(course:Course,items:Question[],generatedAt=new Date()){
 const unique=selectAnkiQuestions(items,{},'course')
 const generated=new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'Europe/Paris'}).format(generatedAt)
 const updated=course.review?.updatedAt?new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'Europe/Paris'}).format(new Date(course.review.updatedAt+'T12:00:00Z')):'non renseignée'
 const rows=[
  [`À propos de cet export MyCorpus — ${html(course.title)}`,`<b>Généré le :</b> ${html(generated)}<br><b>Contenu mis à jour le :</b> ${html(updated)}<br><br>${html(warning)}`,'mycorpus information',`mycorpus-info-${course.id}`],
  ...unique.map(question=>{const level=question.difficulty==='application'?'niveau_2':'niveau_1',tags=[`${tagSlug(course.category)}::${tagSlug(course.tag)}`,tagSlug(question.topic),level,'mycorpus'];return [html(question.prompt),answerHtml(question,course),[...new Set(tags)].join(' '),question.id]})
 ]
 const directives=['#separator:Comma','#html:true','#columns:Recto,Verso,Tags,NotionId','#tags column:3']
 return '\uFEFF'+[...directives,...rows.map(row=>row.map(csv).join(','))].join('\r\n')+'\r\n'
}

export function ankiFilename(course:Course,mode:AnkiExportMode){
 const prefix=mode==='course'?'':mode==='errors'?'mes-erreurs-':'notions-difficiles-'
 return `mycorpus-${prefix}${tagSlug(course.category)}-${tagSlug(course.title)}.csv`
}

export function documentAnkiFilename(title:string,mode:AnkiExportMode='course'){
 const prefix=mode==='course'?'':mode==='errors'?'mes-erreurs-':'notions-difficiles-'
 return `mycorpus-${prefix}${tagSlug(title)}.csv`
}

export function buildDocumentAnkiCsv(title:string,filename:string,items:Question[],mode:AnkiExportMode='course',records:ReviewRecords={},generatedAt=new Date()){
 const unique=selectAnkiQuestions(items,records,mode)
 const generated=new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'Europe/Paris'}).format(generatedAt)
 const rows=[
  [`À propos de cet export MyCorpus Study — ${html(title)}`,`<b>Document source :</b> ${html(filename)}<br><b>Généré le :</b> ${html(generated)}<br><br>${html(warning)}`,'mycorpus_study information',`mycorpus-doc-info-${tagSlug(title)}`],
  ...unique.map(question=>{
   const answers=question.correct.map(index=>`${String.fromCharCode(65+index)}. ${html(question.options[index]||'')}`).join('<br>')
   const explanations=question.options.map((option,index)=>`<b>${String.fromCharCode(65+index)}. ${html(option)}</b> — ${html(question.why[index]||'')}`).join('<br>')
   const sourceMeta=question.sourcePages?`<br><br><b>Passage source (p. ${question.sourcePages.join('–')}) :</b><br><i>« ${html(question.sourceExcerpt||'')} »</i>`:''
   const verso=`<b>Bonne${question.correct.length>1?'s':''} réponse${question.correct.length>1?'s':''}</b><br>${answers}<br><br><b>Explication</b><br>${explanations}${sourceMeta}`
   const tags=[tagSlug(title),'mes_cours',question.difficulty==='application'?'niveau_2':'niveau_1','mycorpus']
   return [html(question.prompt),verso,[...new Set(tags)].join(' '),question.id]
  })
 ]
 const directives=['#separator:Comma','#html:true','#columns:Recto,Verso,Tags,NotionId','#tags column:3']
 return '\uFEFF'+[...directives,...rows.map(row=>row.map(csv).join(','))].join('\r\n')+'\r\n'
}

export function downloadAnkiCsv(content:string,filename:string){
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0)
}

