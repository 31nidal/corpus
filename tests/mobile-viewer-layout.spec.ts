import { test, expect } from '@playwright/test'

for (const width of [320,375,390,430]) {
  for (const color of ['light','dark']) {
    test(`Atlas mobile : CTA, footer et toolbar séparés ${width}px ${color}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{ timeout:90000 })
      if (await page.locator('html').getAttribute('data-theme') !== color) {
        await page.getByRole('button',{name:color==='dark'?'Activer le thème sombre':'Activer le thème clair',exact:true}).click()
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme',color)
      for (const height of [844,668]) {
        await page.setViewportSize({ width, height })
        // Simulate an iPhone bottom inset in addition to the browser's native env().
        for (const inset of [0,34]) {
          await page.locator('main').evaluate((element,value) => (element as HTMLElement).style.setProperty('--atlas-mobile-safe-bottom',`${value}px`),inset)
          const footer=page.locator('.atlas-workspace > .bottombar')
          // Reach the end of the scrollable content, including the dock reserve.
          await page.locator('.atlas-workspace').evaluate(element=>element.scrollTop=element.scrollHeight-element.clientHeight)
          const cta=page.getByRole('button',{name:'Parcourir toutes les structures',exact:true})
          await expect(cta).toBeVisible()
          const cb=(await cta.boundingBox())!,fb=(await footer.boundingBox())!
          const toolbar=page.locator('.atlas-workspace > .viewer-bottom')
          const tb=(await toolbar.boundingBox())!,nb=(await page.locator('.mobile-study-nav').boundingBox())!
          expect(cb.y).toBeGreaterThanOrEqual(118)
          expect(cb.y+cb.height).toBeLessThanOrEqual(fb.y)
          expect(fb.y+fb.height).toBeLessThanOrEqual(tb.y-7)
          expect(tb.y+tb.height).toBeLessThanOrEqual(nb.y-7)
          expect(nb.y+nb.height).toBeLessThanOrEqual(height-inset-7)
          expect(tb.x).toBeGreaterThanOrEqual(0)
          expect(tb.x+tb.width).toBeLessThanOrEqual(width)
          for (const control of await toolbar.getByRole('button').all()) {
            await expect(control).toBeVisible()
            const bounds=(await control.boundingBox())!
            expect(bounds.height).toBeGreaterThanOrEqual(44)
            expect(bounds.x).toBeGreaterThanOrEqual(0)
            expect(bounds.x+bounds.width).toBeLessThanOrEqual(width)
          }
          const card=(await page.locator('.stage').boundingBox())!
          expect(card.x).toBeGreaterThanOrEqual(0)
          expect(card.x+card.width).toBeLessThanOrEqual(width)
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
          expect(await cta.evaluate(element=>{
            const r=element.getBoundingClientRect()
            return element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))
          })).toBe(true)
        }
      }
      await ctaClick(page)
      await expect(page.locator('.catalog-panel')).toBeVisible()
    })
  }
}
async function ctaClick(page: import('@playwright/test').Page) {
  await page.getByRole('button',{name:'Parcourir toutes les structures',exact:true}).click()
}
