import {existsSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
import path from 'node:path'
import {runRetention} from './retention.mjs'
export function startRetentionMaintenance(config=process.env){
 if(config.RETENTION_POLICY_APPROVED!=='1')return null
 const directory=config.RAILWAY_VOLUME_MOUNT_PATH||config.ACCOUNT_DATA_DIR||path.resolve('.data')
 const filename=path.join(directory,'mycorpus.sqlite')
 const run=()=>{
  if(!existsSync(filename))return
  const db=new DatabaseSync(filename)
  try{db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');const result=runRetention(db,{apply:true,directory});console.log('Retention maintenance',JSON.stringify(result.counts))}
  catch{console.error('Retention maintenance failed; inspect storage and database before retrying')}
  finally{db.close()}
 }
 run();const timer=setInterval(run,24*60*60*1000);timer.unref();return timer
}
