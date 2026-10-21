import {V1_POLICY} from '../shared/v1-policy.mjs'
import {DatabaseSync} from 'node:sqlite'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {runRetention,markNoticeDelivered,initRetention} from '../server/retention.mjs'
const directory=process.env.RAILWAY_VOLUME_MOUNT_PATH||process.env.ACCOUNT_DATA_DIR||path.resolve('.data')
const filename=path.join(directory,'mycorpus.sqlite')
if(!existsSync(filename))throw new Error('Base absente : aucune base vide créée')
const args=process.argv.slice(2),apply=args.includes('--apply')
if(apply&&!V1_POLICY.automaticRetention)throw new Error('Les purges de conservation sont désactivées dans cette V1, même avec un ancien indicateur d’activation.')
if(apply&&process.env.RETENTION_POLICY_APPROVED!=='1')throw new Error('RETENTION_POLICY_APPROVED=1 requis après validation de la politique et du préavis')
const db=new DatabaseSync(filename)
try{
 db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000')
 const close=args.indexOf('--close-report')
 if(close>=0){if(!apply||!args[close+1])throw new Error('--apply et identifiant du signalement requis');initRetention(db);db.prepare("UPDATE feedback_reports SET status='closed',closed_at=COALESCE(closed_at,?) WHERE id=?").run(new Date().toISOString(),args[close+1])}
 const index=args.indexOf('--notice-delivered')
 if(index>=0){if(!apply||!args[index+1])throw new Error('--apply et identifiant requis ; confirmer un préavis réellement remis');markNoticeDelivered(db,args[index+1])}
 console.log(JSON.stringify(runRetention(db,{apply,directory}),null,2))
}finally{db.close()}
