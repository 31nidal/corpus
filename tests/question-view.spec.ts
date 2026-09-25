import {test,expect} from '@playwright/test'
import {questions,isCorrect} from '../src/study/questions'
import {questionView,sourceAnswers} from '../src/study/questionView'

test('1 000 réponses uniques : positions approximativement uniformes',()=>{
 const sample=questions.filter(q=>q.correct.length===1&&q.options.length===4&&q.format!=='boolean').slice(0,1000)
 expect(sample).toHaveLength(1000)
 const bins=[0,0,0,0]
 for(const q of sample)bins[questionView(q,'distribution-2026').correct[0]]++
 for(const n of bins){expect(n).toBeGreaterThan(200);expect(n).toBeLessThan(300)}
})

test('remappage : explications, réponses multiples, stabilité, historique et sources intactes',()=>{
 for(const q of questions){
  const before=JSON.stringify(q),view=questionView(q,'attempt-1')
  expect(questionView(q,'attempt-1')).toEqual(view)
  expect(new Set(view.sourceIndices).size).toBe(q.options.length)
  view.sourceIndices.forEach((original,index)=>{
   expect(view.options[index]).toBe(q.options[original])
   expect(view.why[index]).toBe(q.why[original])
   expect(view.correct.includes(index)).toBe(q.correct.includes(original))
  })
  expect(isCorrect(view,view.correct)).toBe(true)
  expect(sourceAnswers([view],{[view.id]:view.correct})[q.id].sort()).toEqual([...q.correct].sort())
  if(q.format==='boolean')expect(view.sourceIndices).toEqual(q.options.map((_,i)=>i))
  expect(JSON.stringify(q)).toBe(before)
 }
 const q=questions.find(q=>q.options.length===4&&q.format!=='boolean')!
 expect(new Set(Array.from({length:30},(_,i)=>questionView(q,`attempt-${i}`).sourceIndices.join(','))).size).toBeGreaterThan(10)
})

test('examen : ordre déterministe conservé après navigation, correction et note exactes',async({page})=>{
 await page.goto('/#tab=entrainement&cours=orientation')
 await page.getByRole('button',{name:/Examen blanc/}).click()
 await page.getByLabel('Nombre de questions').selectOption('5')
 await page.getByRole('button',{name:'Commencer la série'}).click()
 let firstOptions:string[]=[]
 for(let n=0;n<5;n++){
  const prompt=await page.locator('.question-layout h1').innerText()
  const source=questions.find(q=>q.prompt===prompt)!
  const view=questionView(source,'playwright-qcm:1')
  const options=page.locator('.answer-options button > span:nth-child(2)')
  await expect(options).toHaveText(view.options)
  if(n===0)firstOptions=await options.allTextContents()
  for(const i of view.correct)await page.locator('.answer-options button').nth(i).click()
  if(n===1){
   await page.getByRole('button',{name:'Question 1',exact:true}).click()
   await expect(options).toHaveText(firstOptions)
   await page.getByRole('button',{name:'Question 2',exact:true}).click()
  }
  await page.getByRole('button',{name:n===4?'Terminer et voir mon bilan':'Question suivante',exact:true}).click()
 }
 await expect(page.locator('.result-score strong')).toHaveText('5/5')
})
