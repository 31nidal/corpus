import {expect,type Page} from '@playwright/test'
/** Read an actual composed screenshot: loaded geometry alone does not prove a visible WebGL frame. */
export async function expectWarmAnatomyRendered(page:Page) {
 await expect.poll(async()=>{
  const screenshot=await page.locator('.anatomy-canvas canvas').screenshot()
  return page.evaluate(async encoded=>{
   const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode()
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height
   const context=canvas.getContext('2d')!;context.drawImage(image,0,0)
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let warm=0
   for(let index=0;index<pixels.length;index+=16)if(pixels[index]>pixels[index+2]+12&&pixels[index+1]>pixels[index+2]+5)warm++
   return warm
  },screenshot.toString('base64'))
 },{timeout:20000,message:'A real warm-coloured anatomical surface must appear in the composed mobile frame'}).toBeGreaterThan(500)
}
