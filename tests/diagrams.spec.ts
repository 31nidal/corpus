import {test,expect} from '@playwright/test'
import {diagrams} from '../src/study/diagrams'

test('les 67 cours disposent d’un schéma cohérent et interactif',async({page})=>{
 test.setTimeout(240000)
 expect(Object.keys(diagrams)).toHaveLength(67)
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const [id,diagram]of Object.entries(diagrams)){
  for(const edge of diagram.links??[]){expect(diagram.nodes[edge.from]).toBeDefined();expect(diagram.nodes[edge.to]).toBeDefined()}
  await page.goto('/#tab=cours&cours='+id)
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
 await page.goto('/#tab=cours&cours=cell-cycle')
 await page.locator('.interactive-diagram').scrollIntoViewIfNeeded()
 await expect(page.locator('.diagram-edge')).toHaveCount(5)
 await page.screenshot({path:'tests/artifacts/diagram-mobile-cycle.png'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
})
