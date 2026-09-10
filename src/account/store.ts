import {useSyncExternalStore} from 'react'
export type User={id:string;name:string;email:string}
type Operation={id:string;kind:string;payload:unknown}
type Snapshot={ready:boolean;available:boolean;user:User|null;status:string;revision:number;recovery:string;showProfile:boolean}
let snapshot:Snapshot={ready:false,available:true,user:null,status:'',revision:0,recovery:'',showProfile:false},values:Record<string,string>={},queue:Operation[]=[],timer:ReturnType<typeof setTimeout>|undefined,running:Promise<void>|null=null
const listeners=new Set<()=>void>()
const recentEvents=new Map<string,number>()
function emit(p:Partial<Snapshot>={}){snapshot={...snapshot,...p};listeners.forEach(f=>f())}
export function useAccount(){return useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f)},()=>snapshot)}
export async function request(route:string,body?:unknown){
 try{
  const response=await fetch('/api/account/'+route,{credentials:'same-origin',signal:AbortSignal.timeout(15000),...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-MyCorpus-Request':'1'},body:JSON.stringify(body)})})
  const data=await response.json()
  if(!response.ok){const problem=Object.assign(new Error(data.error||'Connexion indisponible.'),{status:response.status,available:data.available});throw problem}
  return data
 }catch(problem){
  if(problem instanceof Error&&'status' in problem)throw problem
  throw new Error('Connexion au serveur impossible. Vos données locales restent disponibles.')
 }
}
function persist(){if(snapshot.user)try{sessionStorage.setItem('mycorpus-outbox-'+snapshot.user.id,JSON.stringify(queue))}catch{emit({status:'Stockage temporaire plein : gardez cette page ouverte jusqu’à la synchronisation.'})}}
export async function flush():Promise<void>{
 if(running){await running;if(queue.length)await flush();return}
 if(!snapshot.user||!queue.length)return
 const id=snapshot.user.id,batch=queue.slice(0,100);emit({status:'Enregistrement…'})
 running=(async()=>{try{await request('sync',{userId:id,operations:batch});if(snapshot.user?.id!==id)return;queue=queue.filter(o=>!batch.some(b=>b.id===o.id));persist();emit({status:queue.length?'Enregistrement…':'Tout est enregistré'})}catch(e){emit({status:(e as Error).message});throw e}finally{running=null}})()
 await running;if(queue.length)await flush()
}
function append(kind:string,payload:unknown){if(!running&&kind==='value'){const p=payload as {key:string;value:string;before:string|null},last=queue.at(-1);if(last?.kind==='value'&&(last.payload as typeof p).key===p.key){p.before=(last.payload as typeof p).before;queue.pop()}}queue.push({id:crypto.randomUUID(),kind,payload});persist();emit({status:'Modifications en attente…'});clearTimeout(timer);timer=setTimeout(()=>void flush().catch(()=>{}),800)}
export function storageScope(){const id=snapshot.user?.id??null;return {
 getItem(key:string){return id===null?localStorage.getItem(key):values[key]??null},
 setItem(key:string,value:string){if((snapshot.user?.id??null)!==id)return;if(!id){localStorage.setItem(key,value);return}if(values[key]===value)return;const before=values[key]??null;values[key]=value;append('value',{key,value,before})},
 removeItem(key:string){if((snapshot.user?.id??null)!==id)return;if(!id){localStorage.removeItem(key);return}const before=values[key]??null;delete values[key];append('value',{key,value:null,before})},
 event(kind:string,payload:unknown){
  if(!id||snapshot.user?.id!==id)return
  const signature=id+':'+kind+':'+JSON.stringify(payload),now=Date.now()
  if((recentEvents.get(signature)??0)>now-1000)return
  recentEvents.set(signature,now)
  if(recentEvents.size>500)for(const [key,time] of recentEvents)if(time<now-60000)recentEvents.delete(key)
  append(kind,payload)
 },
 authenticated:Boolean(id)
}}
export function activate(data:{user:User|null;state?:Record<string,string>;available?:boolean;recovery?:string}){values=data.state||{};queue=[];if(data.user)try{queue=JSON.parse(sessionStorage.getItem('mycorpus-outbox-'+data.user.id)||'[]');for(const o of queue)if(o.kind==='value'){const p=o.payload as {key:string;value:string|null};if(p.value===null)delete values[p.key];else values[p.key]=p.value}}catch{queue=[]}emit({recovery:data.recovery||'',showProfile:snapshot.ready,ready:true,available:data.available!==false,user:data.user,status:queue.length?'Modifications en attente…':data.user?'Tout est enregistré':'Mode invité',revision:snapshot.revision+1});if(queue.length)void flush().catch(()=>{})}
export const profileRequested=()=>snapshot.showProfile
export function clearRecovery(){emit({recovery:''})}
export async function logout(){await flush();await request('logout',{});activate({user:null})}
export function importGuest(){const storage=storageScope();for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)!;if(/^corpus-(completed|saved-courses|practice-v1|note-)/.test(key)&&!storage.getItem(key))storage.setItem(key,localStorage.getItem(key)!)}emit({revision:snapshot.revision+1})}
let boot:Promise<void>|undefined
export function initialize(){return boot??=(async()=>{try{activate(await request('session'))}catch(problem){activate({user:null,available:(problem as {available?:boolean}).available!==false});emit({status:(problem as Error).message})}})()}
window.addEventListener('online',()=>void flush().catch(()=>{}))
window.addEventListener('beforeunload',e=>{if(queue.length){e.preventDefault();e.returnValue=''}})
setInterval(()=>{if(queue.length)void flush().catch(()=>{})},15000)
