import {test,expect} from '@playwright/test'
test('rotation et déplacement : aucun survol coûteux pendant le geste, qualité rétablie au repos',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1100,height:850},deviceScaleFactor:2})
 const page=await context.newPage();await page.goto('/')
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 const state=()=>page.evaluate(()=>(window as any).__CORPUS_TEST__.state())
 await expect.poll(async()=>(await state()).pixelRatio).toBe(2)
 const box=(await page.locator('canvas').boundingBox())!,x=box.x+box.width*.5,y=box.y+box.height*.5
 for(const button of ['left','right'] as const){
  await page.mouse.move(x,y);await page.mouse.down({button})
  const before=await state()
  await page.mouse.move(x+110,y+45,{steps:16})
  expect((await state()).pickCount).toBe(before.pickCount)
  expect((await state()).camera).not.toEqual(before.camera)
  await expect.poll(async()=>(await state()).pixelRatio).toBe(1.25)
  await page.mouse.move(x,y,{steps:16});await page.mouse.up({button})
  expect((await state()).selectedId).toBeNull()
  await expect.poll(async()=>(await state()).pixelRatio,{timeout:15000}).toBe(2)
 }
 await context.close()
})
