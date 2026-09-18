import {test,expect} from '@playwright/test'
import {courses} from '../src/study/curriculum'
import {questions} from '../src/study/questions'

test('les 98 cours ont des prérequis, une durée et 15 à 30 questions valides',()=>{
 expect(courses).toHaveLength(98)
 expect(questions).toHaveLength(1492)
 expect(new Set(questions.map(question=>question.id)).size).toBe(questions.length)
 expect(new Set(questions.map(question=>question.prompt)).size).toBe(questions.length)
 for(const course of courses){
  expect(course.prerequisites?.length,course.id).toBeGreaterThanOrEqual(3)
  expect(course.readingMinutes,course.id).toBeGreaterThanOrEqual(2)
  expect(course.review?.status,course.id).toBe('unreviewed')
  expect(course.review?.updatedAt,course.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(course.review?.sourcesUpdatedAt,course.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  const bank=questions.filter(question=>question.course===course.id)
  expect(bank.length,course.id).toBeGreaterThanOrEqual(15)
  expect(bank.length,course.id).toBeLessThanOrEqual(30)
  for(const question of bank){
   expect(new Set(question.options).size,question.id).toBe(question.options.length)
   expect(question.why,question.id).toHaveLength(question.options.length)
   expect(question.correct.length,question.id).toBeGreaterThan(0)
   expect(question.correct.length,question.id).toBeLessThan(question.options.length)
  }
 }
})

test('un QCM à réponse unique empêche une double sélection et explique chaque option',async({page})=>{
 await page.goto('/#tab=entrainement&cours=chem-thermodynamics')
 await page.getByLabel('Niveau du quiz').selectOption('essentiel')
 await page.getByRole('button',{name:'Commencer la série'}).click()
 for(let attempt=0;attempt<10;attempt++){
  if(await page.getByText('Une seule réponse exacte. Sélectionnez la proposition la plus précise.').isVisible())break
  await page.locator('.answer-options button').first().click()
  await page.getByRole('button',{name:'Valider ma réponse'}).click()
  await page.getByRole('button',{name:'Question suivante',exact:true}).click()
 }
 await expect(page.getByText('Une seule réponse exacte. Sélectionnez la proposition la plus précise.')).toBeVisible()
 const options=page.locator('.answer-options button')
 await options.nth(0).click();await options.nth(1).click()
 await expect(page.locator('.answer-options button[aria-pressed=true]')).toHaveCount(1)
 const count=await options.count()
 await page.getByRole('button',{name:'Valider ma réponse'}).click()
 await expect(page.locator('.answer-correction>div')).toHaveCount(count)
})
