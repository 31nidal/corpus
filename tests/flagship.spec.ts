import {test,expect} from '@playwright/test'
import {courses} from '../src/study/curriculum'
import {questions} from '../src/study/questions'
import {flagshipChapters} from '../src/study/flagshipCourses'
import {medicalPlates} from '../src/study/medicalPlates'
import {DAY,isDue,nextReview,validReview} from '../src/study/reviewSchedule'

test('un rappel anticipé ne débloque pas le palier suivant',()=>{
 const now=1700000000000,first=nextReview(undefined,true,now)
 expect(first.due).toBe(now+DAY)
 const early=nextReview(first,true,now+60000)
 expect(early.due).toBe(first.due);expect(early.streak).toBe(1);expect(early.seen).toBe(2)
 const onTime=nextReview(early,true,first.due!)
 expect(onTime.streak).toBe(2);expect(onTime.due).toBe(first.due!+3*DAY)
 const failed=nextReview(onTime,false,first.due!+60000)
 expect(failed.streak).toBe(0);expect(failed.due).toBe(first.due!+60000+DAY/4)
 const retried=nextReview(failed,true,failed.lastReviewed!+60000)
 expect(retried.due).toBe(failed.due);expect(retried.streak).toBe(0)
 expect(isDue(retried,failed.due!)).toBe(true)
 expect(validReview({...retried,due:NaN})).toBe(false)
 expect(validReview({seen:1,correct:1,wrong:false})).toBe(true)
})

test('catalogue : cinq chapitres, sources, dessins et QCM cohérents',()=>{
 expect(new Set(questions.map(q=>q.id)).size).toBe(questions.length)
 for(const id of Object.keys(flagshipChapters)){
  const course=courses.find(c=>c.id===id)!,items=questions.filter(q=>q.course===id)
  expect(course.sections.length).toBeGreaterThanOrEqual(5)
  expect(course.sections.length).toBeLessThanOrEqual(8)
  expect(course.sections.map(s=>s.text).join(' ').split(/\s+/).length).toBeGreaterThan(200)
  expect(course.readingMinutes).toBeGreaterThanOrEqual(2)
  expect(course.sources!.length).toBeGreaterThanOrEqual(1)
  for(const source of course.sources!)expect(source.url).toMatch(/^https:\/\//)
  expect(medicalPlates[id]).toBeTruthy()
  expect(items.length).toBeGreaterThanOrEqual(5);expect(items.length).toBeLessThanOrEqual(30)
  for(const q of items){expect(q.correct.length).toBeGreaterThan(0);expect(q.options.length).toBe(q.why.length);expect(q.correct.every(n=>n>=0&&n<q.options.length)).toBe(true)}
 }
})

test('les cinq dessins permettent légendes et repérage au clavier',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const id of Object.keys(flagshipChapters)){
  await page.goto('/#tab=cours&cours='+id)
  const plate=page.getByRole('figure',{name:medicalPlates[id].title})
  await expect(plate).toBeVisible()
  await plate.screenshot({path:'/tmp/mycorpus-plate-'+id+'.png'})
  await plate.getByRole('button',{name:'Masquer les légendes'}).click()
  await expect(plate.locator('.medical-legend')).toHaveCount(0)
  await plate.getByRole('button',{name:'Exercice de repérage',exact:true}).click()
  await expect(plate.locator('.medical-hotspot[aria-pressed=true]')).toHaveCount(0)
  await plate.getByRole('button',{name:'Repère 2',exact:true}).click()
  await expect(plate.locator('.medical-detail')).toContainText('ne correspond pas')
  await plate.getByRole('button',{name:'Repère 1',exact:true}).focus();await page.keyboard.press('Enter')
  await expect(plate.locator('.medical-detail')).toContainText('Bien repéré')
  await plate.getByRole('button',{name:'Repère suivant'}).click()
  await expect(plate.locator('.medical-target')).toContainText(medicalPlates[id].points[1].name)
 }
 expect(errors).toEqual([])
})

test('dessin en thème sombre sur téléphone : repères accessibles après défilement',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/#tab=cours&cours=phys-gas-exchange')
 await page.getByRole('button',{name:'Activer le thème sombre'}).click()
 const plate=page.locator('.medical-plate')
 await plate.getByRole('button',{name:'Sang capillaire',exact:true}).click()
 await expect(plate.locator('.medical-detail')).toContainText('La perfusion apporte le sang')
 expect(await page.locator('.medical-scroll').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390)
 await plate.screenshot({path:'/tmp/mycorpus-plate-mobile-dark.png'})
})

test('mobile : cours, tableau, dessin et lien de signalement',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/#tab=cours&cours=phys-renal')
 await expect(page.getByText('Avant de commencer',{exact:true})).toBeVisible()
 const plate=page.locator('.medical-plate');await plate.scrollIntoViewIfNeeded()
 expect(await plate.evaluate(el=>el.getBoundingClientRect().width)).toBeLessThan(390)
 expect(await page.locator('.medical-scroll').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true)
 const tools=page.getByRole('region',{name:'Outils de raisonnement du cours'});await tools.scrollIntoViewIfNeeded()
 expect(await tools.evaluate(el=>el.getBoundingClientRect().width)).toBeLessThan(390)
 const table=page.locator('.course-table-scroll');expect(await table.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true)
 const feedbackBtn=page.getByRole('button',{name:'Signaler une erreur dans ce cours'});await feedbackBtn.click()
 const link=page.getByRole('link',{name:/ouvrir un ticket GitHub/});await expect(link).toHaveAttribute('href',/github.com\/31nidal\/corpus\/issues\/new/)
 await page.screenshot({path:'/tmp/mycorpus-flagship-mobile.png'})
})

test('révision ciblée : réponse, rechargement et entraînement anticipé',async({page})=>{
 const now=Date.now(),q=questions.find(q=>q.id==='revision2-phys-renal-7')!
 await page.addInitScript(({id,due})=>{if(!localStorage.getItem('review-seeded')){localStorage.setItem('corpus-practice-v1',JSON.stringify({[id]:{seen:1,correct:0,wrong:true,streak:0,interval:.25,due}}));localStorage.setItem('review-seeded','1')}},{id:q.id,due:now-1})
 await page.goto('/#tab=entrainement&cours=phys-renal')
 await page.getByRole('button',{name:'Lancer la révision'}).click()
 await expect(page.locator('.question-layout h1')).toHaveText(q.prompt)
 for(const i of q.correct)await page.getByRole('button').filter({hasText:q.options[i]}).click()
 await page.getByRole('button',{name:'Valider ma réponse'}).click()
 await expect(page.locator('.question-feedback')).toContainText('Exact')
 const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('corpus-practice-v1')!)[id],q.id)
 expect(saved.streak).toBe(1);expect(saved.due).toBeGreaterThan(now+DAY-1000)
 await page.reload()
 await expect(page.getByRole('button',{name:'Lancer la révision'})).toBeDisabled()
 await expect(page.getByLabel('Répétition espacée')).toContainText('0 question')
})
