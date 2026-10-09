import {DatabaseSync} from 'node:sqlite'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {REJECTED_DRAFT_RETENTION_MS} from './policy.mjs'

// Called once at server startup, never by a read or mutation route.
export function purgeRejectedDraftsOnStartup(config=process.env,{db,now=Date.now}={}) {
  const filename=path.join(config.RAILWAY_VOLUME_MOUNT_PATH||config.ACCOUNT_DATA_DIR||path.resolve('.data'),'mycorpus.sqlite')
  if(!db&&!existsSync(filename))return 0
  const connection=db||new DatabaseSync(filename)
  try {
    if(!db)connection.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
    if(!connection.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='flashcard_drafts'").get())return 0
    return connection.prepare("DELETE FROM flashcard_drafts WHERE status='rejected' AND rejected_at<?")
      .run(now()-REJECTED_DRAFT_RETENTION_MS).changes
  }finally{if(!db)connection.close()}
}
