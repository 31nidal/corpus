export type ReviewRecord={seen:number;correct:number;wrong:boolean;streak?:number;interval?:number;due?:number;lastReviewed?:number}
export const DAY=86400000
const intervals=[1,3,7,14,30,60]
export function validReview(value:unknown):value is ReviewRecord {
 if(!value||typeof value!=='object')return false
 const r=value as ReviewRecord
 return Number.isSafeInteger(r.seen)&&r.seen>=0&&r.seen<=1000000&&Number.isSafeInteger(r.correct)&&r.correct>=0&&r.correct<=r.seen&&typeof r.wrong==='boolean'
  &&(r.streak===undefined||Number.isSafeInteger(r.streak)&&r.streak>=0&&r.streak<=10000)
  &&(r.interval===undefined||Number.isFinite(r.interval)&&r.interval>=0&&r.interval<=365)
  &&[r.due,r.lastReviewed].every(v=>v===undefined||Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000)
}
export function isDue(record:ReviewRecord|undefined,now:number){return !!record&&(record.due??0)<=now}
export function nextReview(before:ReviewRecord|undefined,correct:boolean,now:number):ReviewRecord {
 const base={seen:(before?.seen??0)+1,correct:(before?.correct??0)+Number(correct),wrong:!correct,lastReviewed:now}
 // Immediate practice records an attempt but cannot advance a future recall.
 if(correct&&before?.due&&before.due>now)return {...before,...base}
 const streak=correct?Math.min((before?.streak??0)+1,intervals.length):0
 const interval=correct?intervals[streak-1]:.25
 const due=!correct&&before?.due&&before.due>now?Math.min(before.due,now+interval*DAY):now+interval*DAY
 return {...base,streak,interval,due}
}
