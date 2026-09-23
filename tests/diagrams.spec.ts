import {test,expect} from '@playwright/test'
import {diagrams} from '../src/study/diagrams'
import {courses} from '../src/study/curriculum'
import {medicalPlates} from '../src/study/medicalPlates'

test('chaque cours dispose d’un schéma cohérent et interactif',async({page})=>{
 expect(Object.keys(diagrams)).toHaveLength(courses.length)
 expect(new Set(Object.keys(diagrams))).toEqual(new Set(courses.map(course=>course.id)))
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const diagram of Object.values(diagrams)){
  for(const edge of diagram.links??[]){expect(diagram.nodes[edge.from]).toBeDefined();expect(diagram.nodes[edge.to]).toBeDefined()}
  expect(diagram.nodes.length).toBeGreaterThanOrEqual(2)
  expect(diagram.nodes.every(node=>node.label.trim()&&node.detail.trim())).toBeTruthy()
 }
 for(const id of ['orientation','anat-hand','phys-cardiac-cycle','cell-endoplasmic-reticulum','public-health-prevention-strategies']){
  const diagram=diagrams[id]
  await page.goto('/#tab=cours&cours='+id)
  if(medicalPlates[id]){
   await expect(page.getByRole('figure',{name:medicalPlates[id].title})).toBeVisible()
   continue
  }
  await expect(page.locator('.interactive-diagram')).toHaveCount(1)
  await expect(page.locator('.diagram-canvas button')).toHaveCount(diagram.nodes.length)
  await page.locator('.diagram-canvas button').last().click()
  await expect(page.locator('.diagram-explanation h3')).toHaveText(diagram.nodes.at(-1)!.label)
  await expect(page.locator('.diagram-explanation p')).toHaveText(diagram.nodes.at(-1)!.detail)
  await page.getByRole('button',{name:'Élément suivant'}).click()
  await expect(page.locator('.diagram-canvas button').first()).toHaveAttribute('aria-pressed','true')
 }
 expect(errors).toEqual([])
})

test('schémas mobiles : clavier, branches et cycle lisibles en thème sombre',async({page})=>{
 await page.setViewportSize({width:393,height:852})
 await page.goto('/#tab=cours&cours=FMA7198')
 await page.getByRole('button',{name:'Activer le thème sombre'}).click()
 await page.locator('.interactive-diagram').scrollIntoViewIfNeeded()
 await page.locator('.diagram-canvas button').nth(2).focus();await page.keyboard.press('Enter')
 await expect(page.locator('.diagram-explanation h3')).toHaveText('Endocrine')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.screenshot({path:'tests/artifacts/diagram-mobile-pancreas.png'})
 await page.goto('/#tab=cours&cours=cell-cycle-phases-control')
 await page.locator('.interactive-diagram').scrollIntoViewIfNeeded()
 await expect(page.locator('.diagram-edge')).toHaveCount(5)
 await page.screenshot({path:'tests/artifacts/diagram-mobile-cycle.png'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
})
