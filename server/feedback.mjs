import {mkdirSync} from 'node:fs'
import path from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {randomUUID} from 'node:crypto'

const attempts=new Map()
const clean=(value,maximum)=>typeof value==='string'?value.trim().slice(0,maximum):''

export function createFeedbackHandler(config=process.env){
 let db
 const available=!config.RAILWAY_ENVIRONMENT_ID||Boolean(config.RAILWAY_VOLUME_MOUNT_PATH)
 const database=()=>{
  if(db)return db
  const directory=config.RAILWAY_VOLUME_MOUNT_PATH||config.ACCOUNT_DATA_DIR||path.resolve('.data')
  mkdirSync(directory,{recursive:true,mode:0o700})
  db=new DatabaseSync(path.join(directory,'mycorpus.sqlite'))
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS feedback_reports(id TEXT PRIMARY KEY,course TEXT NOT NULL,course_title TEXT NOT NULL,passage TEXT NOT NULL,correction TEXT NOT NULL,source TEXT,email TEXT,created TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new')`)
  return db
 }
 return async(req,res)=>{
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
  if(req.method!=='POST')return send(405,{error:'Méthode non autorisée.'})
  if(!available)return send(503,{error:'Le stockage des signalements n’est pas configuré.'})
  if(req.headers['x-mycorpus-request']!=='feedback')return send(403,{error:'Requête refusée.'})
  const key=req.socket.remoteAddress||'unknown',now=Date.now(),recent=(attempts.get(key)||[]).filter(time=>now-time<3600000)
  if(recent.length>=8)return send(429,{error:'Trop de signalements. Réessayez plus tard.'})
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000)return send(413,{error:'Signalement trop volumineux.'})}
   let body;try{body=JSON.parse(raw)}catch{return send(400,{error:'Requête JSON invalide.'})}
   const course=clean(body?.course,100),courseTitle=clean(body?.courseTitle,200),passage=clean(body?.passage,1500),correction=clean(body?.correction,3000),source=clean(body?.source,1000),email=clean(body?.email,254)
   if(!course||!courseTitle||!passage||!correction)return send(400,{error:'Le cours, le passage et la correction sont obligatoires.'})
   if(source&&!/^https:\/\//i.test(source))return send(400,{error:'La source doit utiliser HTTPS.'})
   if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return send(400,{error:'Adresse e-mail invalide.'})
   database().prepare('INSERT INTO feedback_reports(id,course,course_title,passage,correction,source,email,created) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),course,courseTitle,passage,correction,source,email,new Date().toISOString())
   attempts.set(key,[...recent,now]);return send(201,{received:true})
  }catch{return send(503,{error:'Le signalement n’a pas pu être enregistré.'})}
 }
}
