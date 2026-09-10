import {DatabaseSync} from 'node:sqlite'
import {randomBytes, randomUUID, createHash, scrypt, timingSafeEqual} from 'node:crypto'
import {promisify} from 'node:util'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
const derive=promisify(scrypt), digest=s=>createHash('sha256').update(s).digest('hex')
async function hash(password,salt=randomBytes(16).toString('hex')){return salt+':'+(await derive(password,salt,64,{N:131072,r:8,p:1,maxmem:192*1024*1024})).toString('hex')}
async function verify(password,stored){const actual=await hash(password,stored.split(':')[0]);return timingSafeEqual(Buffer.from(actual),Buffer.from(stored))}
const validKey=k=>typeof k==='string'&&/^(corpus-(theme|completed|saved-courses|practice-v1|chat-v1)|corpus-note-[a-zA-Z0-9_-]{1,100})$/.test(k)
function validValue(key,value){
 if(value===null)return true
 if(typeof value!=='string')return false
 if(key.startsWith('corpus-note-'))return value.length<=8000
 if(key==='corpus-theme')return ['light','dark'].includes(value)
 try{const v=JSON.parse(value)
 if(['corpus-completed','corpus-saved-courses'].includes(key))return Array.isArray(v)&&v.length<=1000&&v.every(id=>typeof id==='string'&&id.length<=100)
 if(key==='corpus-practice-v1')return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<=2000&&Object.entries(v).every(([id,r])=>id.length<=100&&r&&Number.isSafeInteger(r.seen)&&r.seen>=0&&r.seen<=1000000&&Number.isSafeInteger(r.correct)&&r.correct>=0&&r.correct<=r.seen&&typeof r.wrong==='boolean')
 if(key==='corpus-chat-v1')return Array.isArray(v)&&v.length<=20&&v.every(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.length<=5000&&typeof m.context==='string'&&m.context.length<=500&&(!m.sources||(Array.isArray(m.sources)&&m.sources.length<=2&&m.sources.every(t=>t&&typeof t.url==='string'&&/^https:\/\//.test(t.url)&&t.url.length<=1000&&typeof t.label==='string'&&t.label.length<=150))))
 }catch{return false}return false
}
function mergeValue(key,value,before,current){
 if(value===null||!current)return value
 if(['corpus-completed','corpus-saved-courses'].includes(key)){const v=JSON.parse(value),old=JSON.parse(before||'[]'),now=JSON.parse(current);return JSON.stringify([...new Set([...now.filter(id=>!old.includes(id)||v.includes(id)),...v.filter(id=>!old.includes(id))])])}
 if(key==='corpus-practice-v1'){const v=JSON.parse(value),old=JSON.parse(before||'{}'),now=JSON.parse(current);for(const [id,r] of Object.entries(v)){const prev=old[id]||{seen:0,correct:0},delta=r.seen-prev.seen;if(delta>0)now[id]={seen:(now[id]?.seen||0)+delta,correct:(now[id]?.correct||0)+Math.max(0,r.correct-prev.correct),wrong:r.wrong}}return JSON.stringify(now)}
 return value
}
export function createAccountHandler(config=process.env){
 let db,active=0
 const available=!config.RAILWAY_ENVIRONMENT_ID||Boolean(config.RAILWAY_VOLUME_MOUNT_PATH)
 const database=()=>{if(db)return db;const dir=config.RAILWAY_VOLUME_MOUNT_PATH||config.ACCOUNT_DATA_DIR||path.resolve('.data');mkdirSync(dir,{recursive:true,mode:0o700});db=new DatabaseSync(path.join(dir,'mycorpus.sqlite'));db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,recovery TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER);
 CREATE TABLE IF NOT EXISTS entries(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,key TEXT,value TEXT,PRIMARY KEY(user_id,key));
 CREATE TABLE IF NOT EXISTS history(seq INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,id TEXT,kind TEXT,payload TEXT,created TEXT,UNIQUE(user_id,id));
 CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER,until INTEGER);
 CREATE INDEX IF NOT EXISTS history_by_account ON history(user_id,seq);
 CREATE INDEX IF NOT EXISTS sessions_by_account ON sessions(user_id);`);return db}
 return async(req,res)=>{
 const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
 if(!available)return send(503,{available:false,error:'Les comptes seront disponibles après la configuration du stockage persistant.'})
 try{
 const d=database(),url=new URL(req.url,'http://localhost'),route=url.pathname.replace('/api/account/','')
 const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('mycorpus_session='))?.slice(17)||''
 const user=d.prepare('SELECT u.id,u.email,u.name FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now())
 const state=id=>Object.fromEntries(d.prepare('SELECT key,value FROM entries WHERE user_id=?').all(id).map(r=>[r.key,r.value]))
 if(req.method==='GET'){
 if(route==='session')return send(200,{available:true,user:user||null,state:user?state(user.id):{}})
 if(!user)return send(401,{error:'Connectez-vous pour accéder à votre compte.'})
 if(route==='history')return send(200,{items:d.prepare('SELECT seq,kind,payload,created FROM history WHERE user_id=? AND seq<? ORDER BY seq DESC LIMIT 40').all(user.id,Number(url.searchParams.get('before'))||Number.MAX_SAFE_INTEGER).map(r=>({...r,payload:JSON.parse(r.payload)}))})
 if(route==='export')return send(200,{user,state:state(user.id),history:d.prepare('SELECT kind,payload,created FROM history WHERE user_id=? ORDER BY seq').all(user.id).map(r=>({...r,payload:JSON.parse(r.payload)}))})
 return send(404,{error:'Route inconnue.'})
 }
 if(req.method!=='POST')return send(405,{error:'Méthode non autorisée.'})
 const origin=config.APP_ORIGIN||`${config.RAILWAY_ENVIRONMENT_ID?'https':'http'}://${req.headers.host}`
 if(req.headers['x-mycorpus-request']!=='1'||!req.headers['content-type']?.startsWith('application/json')||(req.headers.origin&&req.headers.origin!==origin))return send(403,{error:'Origine de la requête refusée.'})
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1024*1024)return send(413,{error:'Données trop volumineuses.'})}
 let b;try{b=JSON.parse(raw)}catch{return send(400,{error:'Requête invalide.'})}if(!b||typeof b!=='object')return send(400,{error:'Requête invalide.'})
 const cookie=value=>res.setHeader('Set-Cookie',`mycorpus_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value?2592000:0}${origin.startsWith('https:')?'; Secure':''}`)
 const session=u=>{const t=randomBytes(32).toString('base64url');d.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(t),u.id,Date.now()+2592000000);cookie(t);return {available:true,user:{id:u.id,email:u.email,name:u.name},state:state(u.id)}}
 if(['register','login','recover','password','delete'].includes(route)){
 const ipKey=digest('ip:'+req.socket.remoteAddress),stamp=Date.now();d.prepare('DELETE FROM limits WHERE until<?').run(stamp);const ip=d.prepare('SELECT * FROM limits WHERE key=?').get(ipKey);if(ip&&ip.until>stamp&&ip.count>=120)return send(429,{error:'Trop de tentatives. Réessayez plus tard.'});d.prepare('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END').run(ipKey,stamp+900000,stamp,stamp)
 const email=typeof b.email==='string'?b.email.trim().toLowerCase():user?.email||''
 const key=digest(route+':'+email),now=Date.now(),limit=d.prepare('SELECT * FROM limits WHERE key=?').get(key)
 if(limit&&limit.until>now&&limit.count>=10)return send(429,{error:'Trop de tentatives. Réessayez dans quinze minutes.'})
 d.prepare('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END').run(key,now+900000,now,now)
 if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)return send(400,{error:'Le mot de passe doit contenir entre 12 et 128 caractères.'})
 if(active>=2)return send(429,{error:'Réessayez dans quelques secondes.'});active++
 try{
 const account=d.prepare('SELECT * FROM users WHERE email=?').get(email)
 if(route==='register'){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof b.name!=='string'||b.name.trim().length<2||b.name.length>60)return send(400,{error:'Vérifiez votre nom et votre adresse e-mail.'})
 if(account)return send(409,{error:'Inscription impossible avec cette adresse. Essayez de vous connecter.'})
 const recovery=randomBytes(20).toString('hex'),u={id:randomUUID(),email,name:b.name.trim()};const password=await hash(b.password)
 d.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(u.id,email,u.name,password,digest(recovery));return send(201,{...session(u),recovery})
 }
 if(route==='recover'){
 if(!account||typeof b.recovery!=='string'||digest(b.recovery.trim())!==account.recovery)return send(400,{error:'Adresse ou code de récupération incorrect.'})
 const recovery=randomBytes(20).toString('hex'),password=await hash(b.password);const changed=d.prepare('UPDATE users SET password=?,recovery=? WHERE id=? AND recovery=?').run(password,digest(recovery),account.id,account.recovery);if(!changed.changes)return send(400,{error:'Ce code a déjà été utilisé.'});d.prepare('DELETE FROM sessions WHERE user_id=?').run(account.id);return send(200,{...session(account),recovery})
 }
 if(!account){await hash(b.password,'00000000000000000000000000000000');return send(401,{error:'Adresse ou mot de passe incorrect.'})}
 if(!await verify(b.password,account.password)||d.prepare('SELECT password FROM users WHERE id=?').get(account.id)?.password!==account.password)return send(401,{error:'Adresse ou mot de passe incorrect.'})
 if(route==='login'){d.prepare('DELETE FROM limits WHERE key=?').run(key);return send(200,session(account))}
 if(!user||user.id!==account.id)return send(401,{error:'Connexion requise.'})
 if(route==='delete'){d.prepare('DELETE FROM users WHERE id=?').run(user.id);cookie('');return send(200,{ok:true})}
 if(typeof b.newPassword!=='string'||b.newPassword.length<12||b.newPassword.length>128)return send(400,{error:'Le nouveau mot de passe doit contenir entre 12 et 128 caractères.'})
 const password=await hash(b.newPassword);d.prepare('UPDATE users SET password=? WHERE id=?').run(password,user.id);d.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);return send(200,session(account))
 }finally{active--}
 }
 if(!user)return send(401,{error:'Votre session a expiré. Reconnectez-vous.'})
 if(route==='logout'){d.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));cookie('');return send(200,{ok:true})}
 if(route==='sync'){
 if(b.userId!==user.id)return send(409,{error:'Le compte connecté a changé. Rechargez votre compte avant de poursuivre.'})
 if(!Array.isArray(b.operations)||b.operations.length>100)return send(400,{error:'Synchronisation invalide.'})
 for(const o of b.operations)if(!o||!o.payload||typeof o.payload!=='object'||Array.isArray(o.payload)||typeof o.id!=='string'||o.id.length>100||!['value','exploration','course','quiz','chat'].includes(o.kind)||JSON.stringify(o.payload??null).length>100000||(o.kind==='value'&&(!validKey(o.payload?.key)||!validValue(o.payload.key,o.payload.value)||!validValue(o.payload.key,o.payload.before??null))))return send(400,{error:'Données invalides.'})
 d.exec('BEGIN IMMEDIATE');try{for(const o of b.operations){const inserted=d.prepare('INSERT OR IGNORE INTO history(user_id,id,kind,payload,created) VALUES(?,?,?,?,?)').run(user.id,o.id,o.kind,JSON.stringify(o.payload),new Date().toISOString());if(inserted.changes&&o.kind==='value'){if(o.payload.value===null)d.prepare('DELETE FROM entries WHERE user_id=? AND key=?').run(user.id,o.payload.key);else d.prepare('INSERT INTO entries VALUES(?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value').run(user.id,o.payload.key,mergeValue(o.payload.key,o.payload.value,o.payload.before,d.prepare('SELECT value FROM entries WHERE user_id=? AND key=?').get(user.id,o.payload.key)?.value))}}d.exec('COMMIT')}catch(e){d.exec('ROLLBACK');throw e}return send(200,{ok:true})
 }
 return send(404,{error:'Route inconnue.'})
 }catch(e){console.error('Account request failed:',e.code||e.name);return send(500,{error:'Le compte est momentanément indisponible. Vos modifications restent en attente.'})}
 }
}
