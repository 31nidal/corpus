import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
const pages=['mentions-legales','confidentialite','cgu','cookies','propriete-intellectuelle']
test('Les liens internes des cinq pages pointent vers des ressources et ancres existantes',()=>{
 for(const slug of pages){
  const html=readFileSync(`public/${slug}.html`,'utf8')
  for(const [,href] of html.matchAll(/href="([^"]+)"/g)){
   if(href.startsWith('#'))assert.ok(html.includes(`id="${href.slice(1)}"`),`${slug}: ${href}`)
   else if(href.startsWith('/')&&href!=='/')assert.ok(existsSync('public'+href.split('#')[0]),`${slug}: ${href}`)
  }
 }
})
test('Le contrôle de publication refuse les documents et faits encore incomplets',()=>{
 const result=spawnSync(process.execPath,['scripts/check-legal-publication.mjs'],{encoding:'utf8'})
 assert.equal(result.status,1)
 assert.match(result.stderr,/minors_and_gemini_contract/)
 assert.match(result.stderr,/Documents préparatoires/)
})
