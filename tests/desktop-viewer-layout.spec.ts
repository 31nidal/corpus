import { test, expect } from '@playwright/test'

for (const width of [1280,1440,1600,1920]) {
  test(`Atlas desktop : toolbar attachée au viewer ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900})
    await page.goto('/#mode=detail')
    await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
    for (const color of ['light','dark']) {
      if (await page.locator('html').getAttribute('data-theme')!==color) {
        await page.getByRole('button',{name:color==='dark'?'Activer le thème sombre':'Activer le thème clair',exact:true}).click()
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme',color)
      for (const height of [900,768,1080]) {
        await page.setViewportSize({width,height})
        const stage=page.getByRole('region',{name:'Corps humain en trois dimensions'})
        const toolbar=stage.locator(':scope > .viewer-bottom')
        await expect(toolbar).toBeVisible()
        const sb=(await stage.boundingBox())!,tb=(await toolbar.boundingBox())!
        const footer=(await page.locator('.bottombar').boundingBox())!
        const gap=await stage.evaluate(e=>parseFloat(getComputedStyle(e).getPropertyValue('--atlas-gap')))
        expect(tb.x).toBeGreaterThanOrEqual(sb.x)
        expect(tb.y).toBeGreaterThanOrEqual(sb.y)
        expect(sb.x+sb.width-tb.x-tb.width).toBeCloseTo(gap+1,0)
        expect(sb.y+sb.height-tb.y-tb.height).toBeCloseTo(gap+1,0)
        expect(tb.y+tb.height).toBeLessThan(footer.y)
        expect(await toolbar.evaluate(e=>e.offsetParent?.classList.contains('stage'))).toBe(true)
        const panel=page.locator('.discovery')
        const pb=(await panel.boundingBox())!
        expect(tb.x+tb.width).toBeLessThan(pb.x)
        expect(pb.y+pb.height).toBeLessThan(footer.y)
        const finalAction=panel.getByRole('button',{name:/Visite guidée/})
        await finalAction.scrollIntoViewIfNeeded()
        const ab=(await finalAction.boundingBox())!
        // The panel ends shortly after its last control rather than stretching.
        expect(pb.y+pb.height-ab.y-ab.height).toBeLessThanOrEqual(22)
        expect(pb.y+pb.height-ab.y-ab.height).toBeGreaterThanOrEqual(0)
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
        for (const button of await toolbar.getByRole('button').all()) {
          await expect(button).toBeVisible()
          expect(await button.evaluate(e=>{
            const r=e.getBoundingClientRect()
            return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))
          })).toBe(true)
        }
      }
      await page.setViewportSize({width,height:900})
      await page.evaluate(()=>document.fonts.ready)
      await page.screenshot({path:`tests/artifacts/design/desktop-toolbar/after-${width}-${color}.png`,animations:'disabled'})
    }
    const toolbar=page.locator('.stage > .viewer-bottom')
    await toolbar.getByRole('button',{name:'Face',exact:true}).click()
    await expect(page.locator('.coordinate')).toContainText('VUE POSTÉRIEURE')
    await toolbar.getByRole('button',{name:'Réinitialiser la vue',exact:true}).click()
    await expect(page.locator('.coordinate')).toContainText('VUE ANTÉRIEURE')
    await toolbar.getByRole('button',{name:'Outils d’exploration',exact:true}).click()
    await expect(page.locator('.tools-panel')).toBeVisible()
    await toolbar.getByRole('button',{name:'Outils d’exploration',exact:true}).click()
    await expect(page.locator('.tools-panel')).toHaveCount(0)
  })
}
