import type {RevisionStep} from './progress'
import {storageScope} from '../account/store'
export const sessionKey='mycorpus-daily-session'
type Plan={owner:string|null;steps:RevisionStep[];index:number;started:number}
export function dailyPlan():Plan|null {
  try{const plan=JSON.parse(sessionStorage.getItem(sessionKey)||'null');return plan&&plan.owner===storageScope().identity&&Array.isArray(plan.steps)&&Number.isInteger(plan.index)?plan:null}catch{return null}
}
export function stepRoute(step:RevisionStep) {
  const params=new URLSearchParams()
  params.set('tab',step.kind==='flashcards'?'flashcards':step.kind==='course'?'cours':'entrainement')
  if(step.course)params.set('cours',step.course)
  if(step.kind==='flashcards')params.set('revision','due')
  if(step.kind==='errors')params.set('revision','errors-due')
  if(step.kind==='quiz')params.set('revision',step.course?'chapter':'due')
  if(step.count)params.set('count',String(step.count))
  return '#'+params.toString()
}
export function beginDailySession(steps:RevisionStep[]) {
  if(!steps.length)return
  sessionStorage.setItem(sessionKey,JSON.stringify({owner:storageScope().identity,steps,index:0,started:Date.now()}))
  location.hash=stepRoute(steps[0])
}
export function advanceDailySession() {
  const plan=dailyPlan();if(!plan)return
  plan.index++
  sessionStorage.setItem(sessionKey,JSON.stringify(plan))
  location.hash=plan.steps[plan.index]?stepRoute(plan.steps[plan.index]):'#tab=aujourdhui'
}
