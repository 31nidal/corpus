import {test,expect} from '@playwright/test'
import {diagrams} from '../src/study/diagrams'
import {courses} from '../src/study/curriculum'
import {medicalPlates} from '../src/study/medicalPlates'
import {isLegacyHubId} from '../src/study/taxonomy'

test('chaque cours dispose d’un schéma cohérent et interactif',async({page})=>{
 test.setTimeout(240000)
 expect(Object.keys(diagrams)).toHaveLength(courses.length)
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const [id,diagram]of Object.entries(diagrams)){
  for(const edge of diagram.links??[]){expect(diagram.nodes[edge.from]).toBeDefined();expect(diagram.nodes[edge.to]).toBeDefined()}
  if(isLegacyHubId(id))continue
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

test('schémas mobiles : clavier et branches lisibles en thème sombre',async({page})=>{
 await page.setViewportSize({width:393,height:852})
 await page.goto('/#tab=cours&cours=FMA7198')
 await page.getByRole('button',{name:'Activer le thème sombre'}).click()
 await page.locator('.interactive-diagram').scrollIntoViewIfNeeded()
 await page.locator('.diagram-canvas button').nth(2).focus();await page.keyboard.press('Enter')
 await expect(page.locator('.diagram-explanation h3')).toHaveText('Endocrine')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.screenshot({path:'tests/artifacts/diagram-mobile-pancreas.png'})
 expect(diagrams['cell-cycle'].links).toHaveLength(5)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
})
