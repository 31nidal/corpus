import {isDue,type ReviewRecord} from './reviewSchedule'
export type LearningQuestionRef={id:string;sectionId?:string;sourceSectionId?:string}
export function progressFor(questions:LearningQuestionRef[],records:Record<string,ReviewRecord>,now=Date.now()){
 const unique=[...new Map(questions.map(q=>[q.id,q])).values()]
 const seen=unique.filter(q=>records[q.id]?.seen>0),weak=seen.filter(q=>records[q.id].wrong)
 // A notion is consolidated only after three spaced successes; reading never changes this metric.
 const mastered=seen.filter(q=>!records[q.id].wrong&&(records[q.id].streak??0)>=3)
 return {total:unique.length,seen:seen.length,weak:weak.length,mastered:mastered.length,due:seen.filter(q=>isDue(records[q.id],now)).length,percent:unique.length?Math.round(mastered.length/unique.length*100):0}
}
export function prioritizeQuestions<T extends LearningQuestionRef>(questions:T[],records:Record<string,ReviewRecord>,now=Date.now(),context:LearningQuestionRef[]=questions):T[]{
 const chapter=(q:LearningQuestionRef)=>q.sourceSectionId||q.sectionId
 const weakChapters=new Set(context.filter(q=>records[q.id]?.wrong).map(chapter).filter(Boolean))
 const rank=(q:T)=>{const r=records[q.id];return r?.wrong?0:isDue(r,now)?1:!r?.seen?(weakChapters.has(chapter(q))?2:3):4}
 return [...questions].sort((a,b)=>rank(a)-rank(b)||(records[a.id]?.due??0)-(records[b.id]?.due??0)||a.id.localeCompare(b.id))
}
