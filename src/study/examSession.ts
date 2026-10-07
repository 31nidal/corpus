import {isCorrect,type Question} from './questions'
import {questionView,type QuestionView} from './questionView'
export type Session={items:QuestionView[];seed:string;index:number;answers:Record<string,number[]>;validated:string[];done:boolean;mode:'training'|'exam';started:number;seconds:number;endedAt?:number}
export function examBreakdown(items:Question[],answers:Record<string,number[]>,chapterTitles:Record<string,string>) {
  const group=(key:(q:Question)=>string)=>[...new Set(items.map(key))].map(name=>{const selected=items.filter(q=>key(q)===name);return {name,total:selected.length,correct:selected.filter(q=>isCorrect(q,answers[q.id]??[])).length,unanswered:selected.filter(q=>!answers[q.id]?.length).length}})
  return {subjects:group(q=>q.topic),chapters:group(q=>chapterTitles[q.course]??q.course)}
}
export function restoreExam(raw:string|null,bank:Question[]):Session|null {
  try {
    const s=JSON.parse(raw||'null')
    if(!s||s.mode!=='exam'||typeof s.seed!=='string'||s.seed.length>200||!Array.isArray(s.ids)||s.ids.length<1||s.ids.length>40||new Set(s.ids).size!==s.ids.length||!Number.isInteger(s.index)||s.index<0||s.index>=s.ids.length||typeof s.done!=='boolean'||!Number.isSafeInteger(s.started)||s.started<0||s.started>Date.now()||!Number.isFinite(s.seconds)||s.seconds<1||s.seconds>10800)return null
    const items:QuestionView[]=s.ids.map((id:string)=>{const q=bank.find(q=>q.id===id);if(!q)throw new Error('Unknown question');return questionView(q,s.seed)})
    const answers:Record<string,number[]>={}
    for(const q of items){const a=s.answers?.[q.id]??[];if(!Array.isArray(a)||a.some((i:unknown)=>!Number.isInteger(i)||Number(i)<0||Number(i)>=q.options.length)||new Set(a).size!==a.length)return null;answers[q.id]=a}
    return {items,seed:s.seed,index:s.index,answers,validated:[],done:s.done,mode:'exam',started:s.started,seconds:s.seconds,endedAt:Number.isSafeInteger(s.endedAt)&&s.endedAt>=s.started&&s.endedAt<=Date.now()?s.endedAt:undefined}
  }catch{return null}
}
export function serializeExam(s:Session) {return JSON.stringify({...s,ids:s.items.map(q=>q.id),items:undefined})}
