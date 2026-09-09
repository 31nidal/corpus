import {test,expect} from '@playwright/test'
import {chapters} from '../src/study/chapters'
import {questions} from '../src/study/questions'

test('banque pédagogique : identifiants, corrections et couverture des nouveaux chapitres',()=>{
 expect(chapters).toHaveLength(12)
 expect(questions).toHaveLength(311)
 expect(new Set(questions.map(q=>q.id)).size).toBe(questions.length)
 expect(new Set(questions.map(q=>q.prompt)).size).toBe(questions.length)
 for(const q of questions){
  expect([2,4]).toContain(q.options.length);expect(q.why).toHaveLength(q.options.length)
  expect(q.correct.length).toBeGreaterThan(0);expect(q.correct.length).toBeLessThan(q.options.length)
  expect(new Set(q.correct).size).toBe(q.correct.length)
  for(const index of q.correct)expect(index>=0&&index<q.options.length).toBeTruthy()
  for(const explanation of q.why)expect(explanation.trim().length).toBeGreaterThan(0)
 }
 for(const c of chapters){
  expect(c.sections.length).toBeGreaterThanOrEqual(4);expect(c.caseStudy?.answer).toBeTruthy()
  expect(c.sources!.length).toBeGreaterThanOrEqual(2)
  expect(questions.filter(q=>q.course===c.id)).toHaveLength(7)
 }
})

test('chapitre complet : schéma, raisonnement, favoris et notes conservées séparément',async({page})=>{
 await page.goto('/#tab=cours&cours=organelles')
 await expect(page.locator('.course-article>h1')).toHaveText('La cellule : organites et trafic des protéines')
 await expect(page.locator('.course-flow li')).toHaveCount(5)
 await page.locator('.course-case summary').click();await expect(page.locator('.course-case details')).toContainText('Non.')
 await page.getByLabel('Mes notes de cours').fill('Le Golgi trie les protéines. À revoir demain.')
 await page.getByRole('button',{name:'Garder pour plus tard'}).click()
 await page.reload();await expect(page.getByLabel('Mes notes de cours')).toHaveValue('Le Golgi trie les protéines. À revoir demain.')
 await expect(page.getByRole('button',{name:'Enregistré',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.locator('.next-chapter').click();await expect(page).toHaveURL(/cours=cell-junctions/)
 await expect(page.getByLabel('Mes notes de cours')).toHaveValue('')
 await page.getByRole('button',{name:'Tous les cours',exact:true}).click()
 await page.getByLabel('Afficher les cours', {exact:true}).selectOption('saved')
 await expect(page.locator('.course-tile')).toHaveCount(1)
 await page.locator('.course-tile').click();await expect(page).toHaveURL(/cours=organelles/)
})

test('quiz par chapitre : URL, difficulté, navigation examen et bilan',async({page})=>{
 await page.goto('/#tab=entrainement')
 await page.getByLabel('Rechercher un chapitre de quiz').fill('Débit, pression et résistance')
 await expect(page.locator('.chapter-bank-grid article')).toHaveCount(1)
 await page.getByRole('button',{name:'Choisir ce chapitre'}).click()
 await expect(page).toHaveURL(/cours=hemodynamics/)
 await page.reload();await expect(page.getByLabel('Chapitre du quiz')).toHaveValue('hemodynamics')
 await page.getByLabel('Niveau du quiz').selectOption('application')
 await page.getByRole('button',{name:/Examen blanc/}).click()
 await page.getByRole('button',{name:'Commencer la série'}).click()
 await expect(page.locator('.exam-navigation button')).toHaveCount(5)
 const first=await page.locator('.question-layout h1').innerText()
 await page.locator('.answer-options button').first().click()
 await page.getByRole('button',{name:'Question 2',exact:true}).click()
 await page.getByRole('button',{name:'Question 1',exact:true}).click()
 await expect(page.locator('.question-layout h1')).toHaveText(first)
 await expect(page.locator('.answer-options button').first()).toHaveAttribute('aria-pressed','true')
 await expect(page.locator('.answer-correction')).toHaveCount(0)
 await page.getByRole('button',{name:'Question 2',exact:true}).click()
 await page.getByRole('button',{name:'Question 5',exact:true}).click()
 await page.getByRole('button',{name:'Terminer et voir mon bilan'}).click()
 await expect(page.locator('.result-review details')).toHaveCount(5)
 await page.screenshot({path:'tests/artifacts/library-results.png'})
})

test('bibliothèque et cours longs sur téléphone, sans requête modèle inutile',async({page})=>{
 await page.setViewportSize({width:393,height:852})
 const errors:string[]=[],glbs:string[]=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.glb'))glbs.push(r.url())})
 await page.goto('/#tab=cours&cours=ventilation')
 await page.locator('.course-case summary').click()
 await expect(page.locator('.course-case details')).toContainText('4,2 L/min')
 await page.getByLabel('Mes notes de cours').fill('Ventilation alvéolaire ≠ ventilation minute.')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.screenshot({path:'tests/artifacts/library-mobile-reading.png'})
 await page.getByRole('button',{name:'M’entraîner sur ce cours'}).click()
 await expect(page.getByLabel('Chapitre du quiz')).toHaveValue('ventilation')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.screenshot({path:'tests/artifacts/library-mobile-practice.png'})
 expect(errors).toEqual([]);expect(glbs).toEqual([])
})
