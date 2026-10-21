import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {initRetention,touchAccount,touchValue,retentionPlan,runRetention,markNoticeDelivered,monthsBefore} from '../server/retention.mjs'
const now=Date.parse('2026-10-21T12:00:00Z'),old=Date.parse('2023-10-20T12:00:00Z')
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(`PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);
 INSERT INTO users VALUES('alice'),('bob');
 CREATE TABLE entries(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,key TEXT,value TEXT,PRIMARY KEY(user_id,key));
 CREATE TABLE history(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,created TEXT,payload TEXT);
 CREATE TABLE feedback_reports(id TEXT PRIMARY KEY,status TEXT,created TEXT,closed_at TEXT,email TEXT);
 CREATE TABLE flashcard_review_logs(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,reviewed_at INTEGER);
 CREATE TABLE flashcard_reviews(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,fsrs_stability REAL);
 CREATE TABLE flashcard_retired_content(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,retired_at INTEGER);`)
 return db
}
test('legacy observation never invents old activity; calendar months handle leap years',()=>{
 const db=fixture();initRetention(db,now)
 db.prepare('UPDATE account_retention SET last_activity=?').run(old)
 assert.deepEqual(retentionPlan(db,now).deletions,[])
 assert.deepEqual(retentionPlan(db,now).notices,[])
 assert.equal(new Date(monthsBefore(Date.parse('2024-03-31T12:00:00Z'),1)).toISOString(),'2024-02-29T12:00:00.000Z')
 db.close()
})
test('preview never deletes content; account deletion needs proven notice, elapsed 30 days, and 24 months inactivity',()=>{
 const db=fixture(),dir=mkdtempSync(path.join(tmpdir(),'corpus-retention-'))
 try{
  touchAccount(db,'alice',old);touchAccount(db,'bob',now)
  for(const id of ['alice','bob']){mkdirSync(path.join(dir,'uploads',id),{recursive:true});writeFileSync(path.join(dir,'uploads',id,'cours.pdf'),'privé')}
  assert.deepEqual(runRetention(db,{now}).deletions,[])
  assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,2)
  assert.throws(()=>markNoticeDelivered(db,'bob',now),/non éligible/)
  markNoticeDelivered(db,'alice',now-29*86400000)
  assert.deepEqual(retentionPlan(db,now).deletions,[])
  markNoticeDelivered(db,'alice',now-30*86400000)
  assert.deepEqual(runRetention(db,{now}).deletions,['alice'])
  assert.equal(existsSync(path.join(dir,'uploads','alice')),true)
  const result=runRetention(db,{now,apply:true,directory:dir})
  assert.equal(result.counts.accounts,1)
  assert.equal(existsSync(path.join(dir,'uploads','alice')),false)
  assert.equal(existsSync(path.join(dir,'uploads','bob')),true)
  assert.equal(db.prepare('SELECT id FROM users').get().id,'bob')
  assert.equal(runRetention(db,{now,apply:true,directory:dir}).counts.accounts,0)
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
})
test('returning user cancels prior notice and prevents inactivity deletion',()=>{
 const db=fixture();touchAccount(db,'alice',old);markNoticeDelivered(db,'alice',now-40*86400000);touchAccount(db,'alice',now)
 assert.deepEqual(retentionPlan(db,now).deletions,[])
 assert.equal(db.prepare("SELECT notice_delivered_at FROM account_retention WHERE user_id='alice'").get().notice_delivered_at,null)
 db.close()
})
test('12 month purge removes old history/chat/logs and closed reports; preserves current notes, FSRS state, recent rows and unknown closure dates',()=>{
 const db=fixture(),dir=mkdtempSync(path.join(tmpdir(),'corpus-retention-'))
 try{
  initRetention(db,old)
  db.prepare('INSERT INTO entries VALUES(?,?,?)').run('alice','corpus-chat-v1','ancien chat')
  db.prepare('INSERT INTO entries VALUES(?,?,?)').run('alice','corpus-note-test','note actuelle')
  touchValue(db,'alice','corpus-chat-v1',old)
  db.prepare('INSERT INTO entries VALUES(?,?,?)').run('bob','corpus-chat-v1','récent');touchValue(db,'bob','corpus-chat-v1',now)
  for(const at of [old,now]){
   db.prepare('INSERT INTO history VALUES(?,?,?)').run('alice',new Date(at).toISOString(),'message')
   db.prepare('INSERT INTO flashcard_review_logs VALUES(?,?)').run('alice',at)
   db.prepare('INSERT INTO flashcard_retired_content VALUES(?,?)').run('alice',at)
  }
  db.prepare('INSERT INTO flashcard_reviews VALUES(?,?)').run('alice',123)
  db.prepare('INSERT INTO feedback_reports VALUES(?,?,?,?,?)').run('old','closed',new Date(old).toISOString(),new Date(old).toISOString(),'privé')
  db.prepare('INSERT INTO feedback_reports VALUES(?,?,?,?,?)').run('unknown','closed',new Date(old).toISOString(),null,'privé')
  db.prepare('INSERT INTO feedback_reports VALUES(?,?,?,?,?)').run('open','new',new Date(old).toISOString(),null,'privé')
  const result=runRetention(db,{now,apply:true,directory:dir})
  assert.deepEqual(result.counts,{history:1,reviewLogs:1,retiredScenes:1,chats:1,feedback:1,accounts:0})
  assert.equal(db.prepare("SELECT value FROM entries WHERE key='corpus-note-test'").get().value,'note actuelle')
  assert.equal(db.prepare('SELECT fsrs_stability FROM flashcard_reviews').get().fsrs_stability,123)
  assert.equal(db.prepare("SELECT value FROM entries WHERE user_id='bob'").get().value,'récent')
  assert.equal(db.prepare("SELECT closed_at FROM feedback_reports WHERE id='unknown'").get().closed_at,new Date(now).toISOString())
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok')
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
})
test('maintenance stays disabled until explicitly approved and never creates a database',async()=>{
 const {startRetentionMaintenance}=await import('../server/retention-startup.mjs')
 const dir=mkdtempSync(path.join(tmpdir(),'corpus-no-purge-'))
 try{assert.equal(startRetentionMaintenance({ACCOUNT_DATA_DIR:dir}),null);assert.equal(existsSync(path.join(dir,'mycorpus.sqlite')),false)}finally{rmSync(dir,{recursive:true,force:true})}
})
test('anonymous-feedback-only database can purge closed reports before any account exists',()=>{
 const db=new DatabaseSync(':memory:')
 db.exec("CREATE TABLE feedback_reports(id TEXT PRIMARY KEY,status TEXT,closed_at TEXT); INSERT INTO feedback_reports VALUES('closed','closed','2020-01-01T00:00:00.000Z')")
 const dir=mkdtempSync(path.join(tmpdir(),'corpus-feedback-only-'))
 try{assert.equal(runRetention(db,{now,apply:true,directory:dir}).counts.feedback,1)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
})
