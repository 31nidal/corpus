import {test,expect} from '@playwright/test'
import {deepCourses} from '../src/study/deepCourses'
import {questions} from '../src/study/questions'

test('chaque cours possède des développements et des exercices associés',async({page})=>{
 await page.goto('/#tab=cours')
 await expect(page.locator('.subject-card')).toHaveCount(13)
 expect(Object.keys(deepCourses)).toHaveLength(25)
 for(const [id,content]of Object.entries(deepCourses)){
  expect(content.sections).toHaveLength(3)
  expect(questions.filter(q=>q.course===id).length).toBeGreaterThanOrEqual(4)
  await page.goto('/#tab=cours&cours='+id)
  await expect(page.locator('.course-section')).toHaveCount(['orientation','homeostasis','membrane','tissues'].includes(id)?6:id.startsWith('FMA')?8:7)
  expect(await page.locator('.course-section p').count()).toBeGreaterThanOrEqual(9)
 }
})

test('vrai/faux : une seule sélection et un raisonnement corrigé',async({page})=>{
 await page.goto('/#tab=entrainement&cours=orientation')
 await page.getByLabel('Niveau du quiz').selectOption('application')
 await page.getByRole('button',{name:'Commencer la série'}).click()
 await expect(page.locator('.question-instruction')).toContainText('Une seule réponse')
 await page.locator('.answer-options button').first().click()
 await page.locator('.answer-options button').last().click()
 await expect(page.locator('.answer-options button[aria-pressed=true]')).toHaveCount(1)
 await expect(page.locator('.answer-options button').last()).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'Valider ma réponse'}).click()
 await expect(page.locator('.answer-correction')).toBeVisible()
})

test('cerveau : accès direct, vrai maillage isolé et zoom utilisable sur mobile',async({page})=>{
 await page.setViewportSize({width:393,height:852})
 await page.goto('/')
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await page.getByRole('button',{name:'Vue cerveau',exact:true}).click()
 await expect(page.locator('main')).toHaveAttribute('data-selected','FMA50801')
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await expect(page.locator('.detail-content h2')).toHaveText('Cerveau')
 await expect(page.getByRole('button',{name:'Voir le contexte',exact:true})).toBeVisible()
 await page.waitForTimeout(1600)
 const distance=()=>page.evaluate(()=>{const state=(window as any).__CORPUS_TEST__.state();return Math.hypot(...state.camera.map((v:number,i:number)=>v-state.target[i]))})
 const before=await distance()
 await page.getByRole('button',{name:'Agrandir le modèle',exact:true}).click()
 await expect.poll(distance,{timeout:10000}).toBeLessThan(before*.95)
 await page.getByRole('button',{name:'Recadrer la structure',exact:true}).click()
 await expect.poll(distance,{timeout:10000}).toBeGreaterThan(before*.95)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.screenshot({path:'tests/artifacts/brain-mobile-zoom.png'})
})
