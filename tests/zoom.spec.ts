import {test,expect} from '@playwright/test'

test('le zoom suit la zone pointée en haut et en bas du corps, et le déplacement reste libre',async({page})=>{
 await page.goto('/')
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 const canvas=page.locator('canvas').first()
 const rect=(await canvas.boundingBox())!
 const state=()=>page.evaluate(()=>(window as any).__CORPUS_TEST__.state())
 for(const fraction of [.25,.75]){
  await page.getByRole('button',{name:'Réinitialiser la vue',exact:true}).click()
  await page.waitForTimeout(1300)
  const before=await state()
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height*fraction)
  await page.mouse.wheel(0,-450)
  await page.waitForTimeout(700)
  const after=await state()
  expect(Math.abs(after.target[1]-before.target[1])).toBeGreaterThan(.01)
  expect(Math.sign(after.target[1]-before.target[1])).toBe(fraction<.5?1:-1)
  expect(Math.hypot(...after.camera.map((v:number,i:number)=>v-after.target[i]))).toBeLessThan(Math.hypot(...before.camera.map((v:number,i:number)=>v-before.target[i])))
 }
 const before=await state()
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2)
 await page.mouse.down({button:'right'})
 await page.mouse.move(rect.x+rect.width/2+90,rect.y+rect.height/2,{steps:10})
 await page.mouse.up({button:'right'})
 await page.waitForTimeout(500)
 const after=await state()
 expect(Math.abs(after.target[0]-before.target[0])).toBeGreaterThan(.01)
 expect(after.selectedId).toBe(before.selectedId)
})
