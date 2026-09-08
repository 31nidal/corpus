import {test,expect} from '@playwright/test'
import {questions} from '../src/study/questions'
import fs from 'node:fs'
import {chapters} from '../src/study/chapters'
const courseCount=4+chapters.length+JSON.parse(fs.readFileSync('src/data/learning.json','utf8')).length
async function answer(page:any,correct=true){const title=await page.locator('.question-layout h1').innerText();const q=questions.find(q=>q.prompt===title)!;const picks=correct?q.correct:[q.options.findIndex((_,i)=>!q.correct.includes(i))];for(const i of picks)await page.locator('.answer-options button').nth(i).click();return q}

test('cours dédiés : recherche, lien profond, rappel actif et retour au modèle',async({page})=>{
 const glbs:string[]=[];page.on('request',r=>{if(r.url().endsWith('.glb'))glbs.push(r.url())})
 await page.goto('/#tab=cours')
 await expect(page.locator('.course-tile')).toHaveCount(courseCount)
 expect(glbs).toHaveLength(0)
 await page.getByLabel('Rechercher un cours').fill('Les échanges membranaires');await expect(page.locator('.course-tile')).toHaveCount(1)
 await page.locator('.course-tile').click();await expect(page).toHaveURL(/cours=membrane/)
 await page.getByRole('button',{name:'Vérifier ma réponse'}).click();await expect(page.locator('.recall-answer')).toContainText('Non')
 await page.reload();await expect(page.locator('.course-article>h1')).toHaveText('Les échanges membranaires')
 await page.getByRole('button',{name:'Tous les cours',exact:true}).click()
 await page.getByRole('button',{name:/Se repérer dans le corps/}).click()
 await page.locator('.anatomy-link').click();await expect(page.locator('main')).toHaveAttribute('data-selected','FMA24474')
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await expect(page.locator('.stage')).toBeVisible()
})

test('QCM : correction complète, erreur mémorisée et révision ciblée',async({page})=>{
 await page.goto('/#tab=entrainement')
 await page.getByLabel('Matière du quiz').selectOption('Anatomie');await page.getByLabel('Nombre de questions').selectOption('5')
 await page.getByRole('button',{name:'Commencer la série'}).click()
 await expect(page.getByRole('button',{name:'Valider ma réponse'})).toBeDisabled()
 const failed=await answer(page,false)
 await page.getByRole('button',{name:'Valider ma réponse'}).click();await expect(page.locator('.answer-correction>div')).toHaveCount(4)
 await expect(page.locator('.question-feedback')).toContainText('Une notion à consolider')
 await page.getByRole('button',{name:'Question suivante',exact:true}).click();await answer(page)
 await page.getByRole('button',{name:'Valider ma réponse'}).click()
 await page.getByRole('button',{name:'Terminer et voir mon bilan'}).click()
 await expect(page.locator('.result-score strong')).toHaveText('1/2')
 await page.getByRole('button',{name:'Nouvelle série'}).click();await expect(page.locator('.mistake-card strong')).toHaveText('1')
 await page.getByRole('button',{name:'Revoir mes erreurs'}).click();await expect(page.locator('.question-layout h1')).toHaveText(failed.prompt)
 await answer(page);await page.getByRole('button',{name:'Valider ma réponse'}).click();await page.getByRole('button',{name:'Terminer et voir mon bilan'}).click()
 await page.reload();await expect(page.locator('.mistake-card strong')).toHaveText('0')
})

test('examen blanc : correction différée, navigation et score exact',async({page})=>{
 await page.goto('/#tab=entrainement')
 await page.getByRole('button',{name:/Examen blanc/}).click();await page.getByLabel('Nombre de questions').selectOption('5');await page.getByRole('button',{name:'Commencer la série'}).click()
 for(let i=0;i<5;i++){await answer(page);await expect(page.locator('.question-feedback')).toHaveCount(0);await page.getByRole('button',{name:i===4?'Terminer et voir mon bilan':'Question suivante',exact:true}).click()}
 await expect(page.locator('.result-score strong')).toHaveText('5/5');await expect(page.locator('.result-review details')).toHaveCount(5)
 await expect(page.getByRole('button',{name:'Reprendre les erreurs'})).toBeDisabled()
})

test('examen blanc : fin automatique du temps imparti',async({page})=>{
 await page.clock.install();await page.goto('/#tab=entrainement')
 await page.getByRole('button',{name:/Examen blanc/}).click();await page.getByLabel('Nombre de questions').selectOption('5');await page.getByRole('button',{name:'Commencer la série'}).click()
 await page.clock.fastForward(376000)
 await expect(page.locator('.result-score strong')).toHaveText('0/5')
})

test('mobile : onglets, cours lisible, réponses et thème sombre',async({page})=>{
 await page.setViewportSize({width:375,height:667});await page.goto('/#tab=cours')
 await page.getByRole('button',{name:'Activer le thème sombre'}).click()
 await page.getByRole('button',{name:/Les quatre familles de tissus/}).click();await expect(page.locator('.course-article')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(375)
 await page.getByRole('button',{name:'M’entraîner sur ce cours'}).click();await page.getByRole('button',{name:'Commencer la série'}).click();await answer(page)
 await page.getByRole('button',{name:'Valider ma réponse'}).click();await expect(page.locator('.question-feedback')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(375)
 await page.screenshot({path:'tests/artifacts/campus-mobile-dark-feedback.png'})
})
