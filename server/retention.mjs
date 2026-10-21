import {removeAccountFiles} from './account-data.mjs'
const DAY=86400000
export const monthsBefore=(now,count)=>{const date=new Date(now),day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()-count);const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,end));return date.getTime()}
const initialized=new WeakSet()
export function initRetention(db,now=Date.now()){
 if(initialized.has(db))return
 db.exec(`CREATE TABLE IF NOT EXISTS account_retention (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 observed_from INTEGER NOT NULL,last_activity INTEGER,notice_delivered_at INTEGER);
 CREATE TABLE IF NOT EXISTS account_value_activity (
 user_id TEXT REFERENCES users(id) ON DELETE CASCADE,key TEXT,changed_at INTEGER NOT NULL,PRIMARY KEY(user_id,key));`)
 // Unknown legacy activity never becomes an invented old last-login date.
 if(exists(db,'users'))db.prepare('INSERT OR IGNORE INTO account_retention(user_id,observed_from) SELECT id,? FROM users').run(now)
 if(exists(db,'entries'))db.prepare('INSERT OR IGNORE INTO account_value_activity SELECT user_id,key,? FROM entries').run(now)
 if(exists(db,'feedback_reports')&&!db.prepare('PRAGMA table_info(feedback_reports)').all().some(c=>c.name==='closed_at'))db.exec('ALTER TABLE feedback_reports ADD COLUMN closed_at TEXT')
 initialized.add(db)
}
const exists=(db,table)=>Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))
export function touchAccount(db,id,now=Date.now()){
 initRetention(db,now)
 db.prepare('INSERT INTO account_retention(user_id,observed_from,last_activity) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_activity=MAX(COALESCE(last_activity,0),excluded.last_activity),notice_delivered_at=NULL').run(id,now,now)
}
export function touchValue(db,id,key,now=Date.now()){
 initRetention(db,now)
 db.prepare('INSERT INTO account_value_activity VALUES(?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET changed_at=excluded.changed_at').run(id,key,now)
}
export function markNoticeDelivered(db,id,now=Date.now()){
 initRetention(db,now)
 const row=db.prepare('SELECT * FROM account_retention WHERE user_id=?').get(id)
 if(!row||Math.max(row.observed_from,row.last_activity||0)>monthsBefore(now,23))throw new Error('Compte non éligible au préavis')
 // Operator must confirm an actual delivery, not merely a queued message.
 db.prepare('UPDATE account_retention SET notice_delivered_at=? WHERE user_id=?').run(now,id)
}
export function retentionPlan(db,now=Date.now()){
 initRetention(db,now)
 if(exists(db,'feedback_reports')&&!db.prepare('PRAGMA table_info(feedback_reports)').all().some(c=>c.name==='closed_at'))db.exec('ALTER TABLE feedback_reports ADD COLUMN closed_at TEXT')
 const rows=db.prepare('SELECT * FROM account_retention').all()
 const inactive=rows.filter(r=>Math.max(r.observed_from,r.last_activity||0)<=monthsBefore(now,24))
 const notices=rows.filter(r=>Math.max(r.observed_from,r.last_activity||0)<=monthsBefore(now,23)&&!r.notice_delivered_at).map(r=>r.user_id)
 const deletions=inactive.filter(r=>r.notice_delivered_at&&r.notice_delivered_at<=now-30*DAY).map(r=>r.user_id)
 const cutoff=new Date(monthsBefore(now,12)).toISOString()
 return {notices,deletions,blockedWithoutNotice:inactive.filter(r=>!deletions.includes(r.user_id)).map(r=>r.user_id),cutoff}
}
export function runRetention(db,{now=Date.now(),apply=false,directory}={}){
 db.exec('PRAGMA foreign_keys=ON')
 // SQLite schema/observation baseline can be created in preview; never content deletion.
 const plan=retentionPlan(db,now),counts={history:0,reviewLogs:0,retiredScenes:0,chats:0,feedback:0,accounts:0}
 if(!apply)return {mode:'preview',...plan}
 if(!directory)throw new Error('Répertoire persistant requis')
 db.exec('BEGIN IMMEDIATE')
 try{
  const current=retentionPlan(db,now)
  if(exists(db,'history'))counts.history=db.prepare('DELETE FROM history WHERE created<?').run(current.cutoff).changes
  if(exists(db,'flashcard_review_logs'))counts.reviewLogs=db.prepare('DELETE FROM flashcard_review_logs WHERE reviewed_at<?').run(Date.parse(current.cutoff)).changes
  if(exists(db,'flashcard_retired_content'))counts.retiredScenes=db.prepare('DELETE FROM flashcard_retired_content WHERE retired_at<?').run(Date.parse(current.cutoff)).changes
  if(exists(db,'entries')){
   counts.chats=db.prepare("DELETE FROM entries WHERE key='corpus-chat-v1' AND EXISTS(SELECT 1 FROM account_value_activity v WHERE v.user_id=entries.user_id AND v.key=entries.key AND v.changed_at<?)").run(Date.parse(current.cutoff)).changes
   db.exec('DELETE FROM account_value_activity WHERE NOT EXISTS(SELECT 1 FROM entries e WHERE e.user_id=account_value_activity.user_id AND e.key=account_value_activity.key)')
  }
  if(exists(db,'feedback_reports')){
   // Existing closed reports with unknown closure date get an observation baseline.
   db.prepare("UPDATE feedback_reports SET closed_at=? WHERE status='closed' AND closed_at IS NULL").run(new Date(now).toISOString())
   counts.feedback=db.prepare("DELETE FROM feedback_reports WHERE status='closed' AND closed_at<?").run(current.cutoff).changes
  }
  for(const id of current.deletions){removeAccountFiles(db,directory,id);counts.accounts+=db.prepare('DELETE FROM users WHERE id=?').run(id).changes}
  db.exec('COMMIT');return {mode:'applied',...current,counts}
 }catch(error){db.exec('ROLLBACK');throw error}
}
