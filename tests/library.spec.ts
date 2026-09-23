import {test,expect} from '@playwright/test'
import {chapters} from '../src/study/chapters'
import {questions} from '../src/study/questions'
import {courses} from '../src/study/curriculum'

test('banque pédagogique : identifiants, corrections et couverture des nouveaux chapitres',()=>{
 expect(chapters).toHaveLength(12)
 expect(questions).toHaveLength(1492)
 expect(new Set(questions.map(q=>q.id)).size).toBe(questions.length)
 expect(new Set(questions.map(q=>q.prompt)).size).toBe(questions.length)
 for(const q of questions){
  expect([2,3,4]).toContain(q.options.length);expect(q.why).toHaveLength(q.options.length)
  expect(q.correct.length).toBeGreaterThan(0);expect(q.correct.length).toBeLessThan(q.options.length)
  expect(new Set(q.correct).size).toBe(q.correct.length)
  for(const index of q.correct)expect(index>=0&&index<q.options.length).toBeTruthy()
  for(const explanation of q.why)expect(explanation.trim().length).toBeGreaterThan(0)
 }
 for(const c of chapters){
  expect(c.sections.length).toBeGreaterThanOrEqual(4);expect(c.caseStudy?.answer).toBeTruthy()
  expect(c.sources!.length).toBeGreaterThanOrEqual(2)
  expect(questions.filter(q=>q.course===c.id).length).toBeGreaterThanOrEqual(7)
 }
})

test('legacy hub : ancienne URL, favori et carnet historique restent accessibles',async({page})=>{
 await page.goto('/#tab=cours&cours=organelles')
 await expect(page.locator('.course-article>h1')).toHaveText('La cellule : organites et trafic des protéines')
 await expect(page.getByText('Ancien cours restructuré',{exact:true})).toBeVisible()
 await expect(page.locator('.legacy-child-row')).toHaveCount(3)
 await expect(page).toHaveURL(/cours=organelles/)

 await page.getByLabel('Mes notes de cours').fill('Ancienne note sur le trafic des protéines.')
 await page.getByRole('button',{name:'Garder pour plus tard'}).click()
 await page.reload()
 await expect(page.getByLabel('Mes notes de cours')).toHaveValue('Ancienne note sur le trafic des protéines.')
 await expect(page.getByRole('button',{name:'Enregistré',exact:true})).toHaveAttribute('aria-pressed','true')

 await page.locator('.legacy-child-row').first().getByRole('button',{name:/Accéder au cours/}).click()
 await expect(page).toHaveURL(/cours=cell-membrane-trafficking/)
 await expect(page.getByRole('heading',{name:'Nouveau chapitre au programme canonique'})).toBeVisible()
})

test('chapitre complet préservé : schéma, raisonnement, favoris et notes conservées séparément',async({page})=>{
 const course=courses.find(c=>c.id==='phys-renal')!
 await page.goto('/#tab=cours&cours=phys-renal')
 await expect(page.locator('.course-article>h1')).toHaveText(course.title)
 await expect(page.getByLabel('Transparence éditoriale')).toContainText('Non relu par un professionnel de santé')
 await expect(page.getByRole('button',{name:'Exporter en PDF'})).toBeVisible()
 await page.evaluate(()=>{Object.defineProperty(window,'print',{configurable:true,value:()=>document.body.dataset.printRequested='yes'})})
 await page.getByRole('button',{name:'Exporter en PDF'}).click()
 await expect.poll(()=>page.evaluate(()=>document.body.dataset.printRequested)).toBe('yes')
 await expect(page).toHaveTitle('MyCorpus - '+course.title)
 await expect(page.locator('.medical-plate')).toBeVisible()
 await expect(page.getByRole('region',{name:'Outils de raisonnement du cours'})).toBeVisible()
 await page.getByLabel('Mes notes de cours').fill('Le DFG et la clairance sont à revoir demain.')
 await page.getByRole('button',{name:'Garder pour plus tard'}).click()
 await page.reload();await expect(page.getByLabel('Mes notes de cours')).toHaveValue('Le DFG et la clairance sont à revoir demain.')
 await expect(page.getByRole('button',{name:'Enregistré',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.goto('/#tab=cours&cours=phys-cardiac-cycle')
 await expect(page.getByLabel('Mes notes de cours')).toHaveValue('')
 await page.getByRole('button',{name:'Tous les cours',exact:true}).click()
 await page.getByLabel('Afficher les cours',{exact:true}).selectOption('saved')
 await expect(page.locator('.course-tile')).toHaveCount(1)
 await page.locator('.course-tile').click();await expect(page).toHaveURL(/cours=phys-renal/)
})

test('un étudiant peut signaler une erreur sans compte GitHub',async({page})=>{
 await page.route('**/api/feedback',async route=>route.fulfill({status:201,contentType:'application/json',body:'{"received":true}'}))
 await page.goto('/#tab=cours&cours=phys-renal')
 await page.getByRole('button',{name:'Signaler une erreur dans ce cours'}).click()
 await page.getByLabel('Passage concerné').fill('Le passage sur la filtration glomérulaire.')
 await page.getByLabel('Correction proposée').fill('Préciser la différence entre filtration, réabsorption et sécrétion.')
 await page.getByRole('button',{name:'Envoyer le signalement'}).click()
 await expect(page.locator('.feedback-success')).toContainText('bien été transmis')
})

test('quiz par chapitre : URL, difficulté, navigation examen et bilan',async({page})=>{
 await page.goto('/#tab=entrainement')
 await page.getByLabel('Rechercher un chapitre de quiz').fill('Débit, pression et résistance')
 await expect(page.locator('.chapter-bank-grid article')).toHaveCount(1)
 await page.getByRole('button',{name:'Choisir ce chapitre'}).click()
 await expect(page).toHaveURL(/cours=hemodynamics/)
 await page.reload();await expect(page.getByLabel('Chapitre du quiz')).toHaveValue('hemodynamics')
 await page.getByLabel('Niveau du quiz').selectOption('application')
 await page.getByLabel('Nombre de questions').selectOption('5')
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
 await page.goto('/#tab=cours&cours=phys-renal')
 await expect(page.getByText('Avant de commencer',{exact:true})).toBeVisible()
 await expect(page.locator('.medical-plate')).toBeVisible()
 await page.getByLabel('Mes notes de cours').fill('Filtration ≠ réabsorption ≠ sécrétion.')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.screenshot({path:'tests/artifacts/library-mobile-reading.png'})
 await page.getByRole('button',{name:'M’entraîner sur ce cours'}).click()
 await expect(page.getByLabel('Chapitre du quiz')).toHaveValue('phys-renal')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.screenshot({path:'tests/artifacts/library-mobile-practice.png'})
 expect(errors).toEqual([]);expect(glbs).toEqual([])
})
