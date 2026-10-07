import {storageScope} from '../account/store'
import {readJson,type Reading} from './progress'
export function saveReading(id:string,percent:number,section?:string) {
  const scope=storageScope(),reading=readJson<Reading>(scope,'corpus-reading-v1',{})
  const prior=reading[id]
  const next={percent:Math.max(prior?.percent??0,Math.min(100,Math.max(0,Math.round(percent)))),updatedAt:Date.now(),section:section??prior?.section}
  if(prior&&prior.percent===next.percent&&prior.section===section&&next.updatedAt-prior.updatedAt<30000)return
  reading[id]=next
  const bounded=Object.fromEntries(Object.entries(reading).sort((a,b)=>b[1].updatedAt-a[1].updatedAt).slice(0,500))
  try{scope.setItem('corpus-reading-v1',JSON.stringify(bounded))}catch{/* Existing progress remains available when storage is full. */}
}
