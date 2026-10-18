import {test,expect} from '@playwright/test'
import {expectWarmAnatomyRendered} from './atlas-render'
test('mobile : le maillage reste réellement visible après repli de la fiche',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/#mode=detail&structure=FMA7148')
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await page.getByRole('button',{name:'Réduire la fiche anatomique'}).click()
 await expectWarmAnatomyRendered(page)
 const canvas=await page.locator('.anatomy-canvas canvas').boundingBox()
 expect(canvas!.height).toBeGreaterThan(300)
 await expect(page.locator('main')).toHaveAttribute('data-selected','FMA7148')
 await page.screenshot({path:'/tmp/atlas-refonte-mobile-collapsed.png'})
})
