import {chromium} from '@playwright/test'
import {readFileSync,mkdirSync} from 'node:fs'
const base=process.env.CAPTURE_BASE_URL||'http://127.0.0.1:5173'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Use a local preview for seeded captures.')
const output='tests/artifacts/design/student-dashboard'
mkdirSync(output,{recursive:true})
const catalog=JSON.parse(readFileSync(new URL('../src/dashboard/catalog.json',import.meta.url))),q=catalog.questions.find(q=>q.course==='orientation')
const browser=await chromium.launch({headless:true})
try {
 for(const width of [1440,390])for(const theme of ['light','dark']) {
  const page=await browser.newPage({viewport:{width,height:900}})
  await page.addInitScript(({q,theme})=>{const now=Date.now();localStorage.setItem('corpus-theme',theme);localStorage.setItem('corpus-practice-v1',JSON.stringify({[q.id]:{seen:4,correct:1,wrong:true,lastReviewed:now-86400000,due:now-1}}));localStorage.setItem('corpus-reading-v1',JSON.stringify({orientation:{percent:62,updatedAt:now}}))},{q,theme})
  await page.goto(base+'/#tab=aujourdhui')
  await page.getByRole('heading',{name:'À faire aujourd’hui'}).waitFor()
  for(const [view,label] of [['today',null],['mastery','Maîtrise'],['errors','Mes faiblesses']]) {
   if(label)await page.getByRole('button',{name:label,exact:true}).click()
   await page.waitForTimeout(250)
   await page.screenshot({path:`${output}/${view}-${width}-${theme}.png`,animations:'disabled'})
  }
  await page.getByRole('button',{name:'Examen blanc',exact:true}).click()
  await page.getByRole('button',{name:'Commencer la série',exact:true}).waitFor()
  if(width<700)await page.locator('.session-builder').scrollIntoViewIfNeeded()
  await page.screenshot({path:`${output}/exam-${width}-${theme}.png`,animations:'disabled'})
  await page.close()
 }
} finally {await browser.close()}
console.log(`16 captures in ${output}`)
