import {isDue,validReview,type ReviewRecord} from '../study/reviewSchedule'
export type Catalog={courses:{id:string;title:string;subject:string}[];questions:{id:string;course:string}[]}
export type Reading=Record<string,{percent:number;updatedAt:number;section?:string}>
export type Records=Record<string,ReviewRecord>
export function readJson<T>(storage:{getItem:(key:string)=>string|null},key:string,fallback:T):T {
  try{return JSON.parse(storage.getItem(key)||'null')??fallback}catch{return fallback}
}
export function summarize(catalog:Catalog,records:Records,reading:Reading,completed:string[],now=Date.now()) {
  const known=new Map(catalog.questions.map(q=>[q.id,q.course]))
  const entries=Object.entries(records).filter(([id,r])=>known.has(id)&&validReview(r))
  const recent=entries.filter(([,r])=>r.lastReviewed!==undefined&&r.lastReviewed>=now-30*86400000)
  const score=(items:typeof entries)=>items.length?Math.round(100*items.filter(([,r])=>!r.wrong).length/items.length):null
  const chapters=catalog.courses.map(c=>{
    const all=entries.filter(([id])=>known.get(id)===c.id),current=recent.filter(([id])=>known.get(id)===c.id)
    return {...c,score:score(current),observed:current.length,attempts:all.reduce((n,[,r])=>n+r.seen,0),correct:all.reduce((n,[,r])=>n+r.correct,0),errors:all.filter(([,r])=>r.wrong).length,lastError:Math.max(0,...all.filter(([,r])=>r.wrong).map(([,r])=>r.lastReviewed??0)),nextDue:Math.min(...all.filter(([,r])=>r.wrong&&r.due!==undefined).map(([,r])=>r.due!)),completed:completed.includes(c.id),reading:reading[c.id]}
  })
  const subjects=[...new Set(catalog.courses.map(c=>c.subject))].map(name=>{
    const ids=new Set(chapters.filter(c=>c.subject===name).map(c=>c.id))
    const items=recent.filter(([id])=>ids.has(known.get(id)!))
    return {name,score:score(items),observed:items.length,chapters:chapters.filter(c=>ids.has(c.id))}
  })
  const due=entries.filter(([,r])=>isDue(r,now)),errorsDue=due.filter(([,r])=>r.wrong)
  const started=chapters.filter(c=>c.reading&&!c.completed).sort((a,b)=>b.reading!.updatedAt-a.reading!.updatedAt)
  const today=new Date(now).toDateString()
  const reviewedToday=entries.filter(([,r])=>r.lastReviewed!==undefined&&new Date(r.lastReviewed).toDateString()===today).length
  const weak=chapters.filter(c=>c.score!==null&&c.score<70).sort((a,b)=>a.score!-b.score!)
  const lastQuiz=entries.sort((a,b)=>(b[1].lastReviewed??0)-(a[1].lastReviewed??0))[0]
  const lastChapter=lastQuiz?chapters.find(c=>c.id===known.get(lastQuiz[0])):null
  const last=started[0]&&started[0].reading!.updatedAt>(lastQuiz?.[1].lastReviewed??0)?{chapter:started[0],kind:'course' as const}:lastChapter?{chapter:lastChapter,kind:'quiz' as const}:null
  return {chapters,subjects,due:due.length,errorsDue:errorsDue.length,started,reviewedToday,weak,last}
}
export type RevisionStep={kind:'flashcards'|'errors'|'quiz'|'course';title:string;course?:string;count?:number}
export function buildDailySession(summary:ReturnType<typeof summarize>,flashDue:number):RevisionStep[] {
  const steps:RevisionStep[]=[]
  if(flashDue>0)steps.push({kind:'flashcards',title:`Réviser ${flashDue} flashcards`})
  if(summary.errorsDue)steps.push({kind:'errors',title:`Revoir ${summary.errorsDue} erreurs`,count:Math.min(20,summary.errorsDue)})
  else if(summary.due)steps.push({kind:'quiz',title:`Revoir ${summary.due} QCM dus`,count:Math.min(20,summary.due)})
  if(summary.weak[0])steps.push({kind:'quiz',title:summary.weak[0].title,course:summary.weak[0].id,count:10})
  if(summary.started[0])steps.push({kind:'course',title:summary.started[0].title,course:summary.started[0].id})
  return steps
}
