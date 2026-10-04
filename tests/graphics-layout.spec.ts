import { test, expect } from '@playwright/test'

async function theme(page: import('@playwright/test').Page, value: string) {
  if (await page.locator('html').getAttribute('data-theme') !== value) {
    await page.getByRole('button', { name: value === 'dark' ? 'Activer le thème sombre' : 'Activer le thème clair', exact: true }).click()
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', value)
  await page.evaluate(() => document.fonts.ready)
}
async function noHorizontalOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}
for (const color of ['light', 'dark']) {
  for (const [width, height] of [[1440,900],[1366,768],[1440,1080],[390,844]]) {
    test(`Atlas Systèmes : limites, scroll et actions ${width}x${height} ${color}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/#mode=detail')
      await expect(page.locator('main')).toHaveAttribute('data-loaded', 'true', { timeout: 90000 })
      await theme(page, color)
      if (width <= 700) await page.getByRole('button', { name: 'Couches anatomiques', exact: false }).click()
      await page.getByRole('button', { name: 'Systèmes', exact: true }).click()
      // Also exercise a reduced dynamic viewport without reloading the workspace.
      for (const currentHeight of [height, height - 100]) {
        await page.setViewportSize({ width, height: currentHeight })
        const mainBounds = await page.locator('main').boundingBox()
        expect(mainBounds!.height).toBe(currentHeight)
        const card = page.locator('.layers-content')
        const list = page.getByLabel('Liste des systèmes', { exact: true })
        const rows = list.getByRole('switch')
        expect(await rows.count()).toBeGreaterThan(2)
        await expect(card).toBeInViewport()
        for (const row of await rows.all()) {
          await row.scrollIntoViewIfNeeded()
          const bounds = await row.boundingBox()
          const listBounds = await list.boundingBox()
          const footer = await page.locator('.layer-footer').boundingBox()
          expect(bounds!.y).toBeGreaterThanOrEqual(listBounds!.y - 1)
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(listBounds!.y + listBounds!.height + 1)
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(footer!.y + 1)
        }
        const outside = await card.evaluate(element => {
          const box = element.getBoundingClientRect()
          return [...element.querySelectorAll('.layer-tabs,.layer-list,.layer-footer,.layer-actions button')].some(child => {
            const r = child.getBoundingClientRect()
            return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1
          })
        })
        expect(outside).toBe(false)
        const footer = await page.locator('.bottombar').boundingBox()
        const panel = await card.boundingBox()
        expect(panel!.y + panel!.height).toBeLessThanOrEqual(footer!.y)
        if (width > 700) {
          for (const controls of ['.chat-composer','.viewer-controls']) {
            const bounds = await page.locator(controls).boundingBox()
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(footer!.y)
          }
        }
        const geometry = await list.evaluate(el => ({ height: el.clientHeight, total: el.scrollHeight, scroll: el.scrollTop, overflow: getComputedStyle(el).overflowY }))
        expect(geometry.overflow).toBe('auto')
        if (geometry.total > geometry.height + 1) expect(geometry.scroll).toBeGreaterThan(0)
        await noHorizontalOverflow(page)
      }
    })
  }
  for (const width of [1440,1280,1024,768,390]) {
    test(`Matières : titres, contraste et contrôles ${width}px ${color}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : width <= 1024 ? 768 : 900 })
      await page.goto('/#tab=cours')
      await expect(page.locator('.subject-directory')).toBeVisible()
      await theme(page, color)
      const cards = page.locator('.subject-card')
      await expect(cards.first().getByRole('heading', { name: 'Anatomie', exact: true })).toBeVisible()
      for (const card of (await cards.all()).slice(0, 4)) {
        await card.scrollIntoViewIfNeeded()
        const title = card.getByRole('heading')
        await expect(title).toBeInViewport()
        for (const state of ['default','hover','focus','active']) {
          if (state === 'default') await page.mouse.move(0, 0)
          if (state === 'hover') await card.hover()
          if (state === 'focus') await card.focus()
          if (state === 'active') await page.mouse.down()
          const style = await title.evaluate(el => {
            const rgb = (value: string) => value.match(/[\d.]+/g)!.slice(0,3).map(Number)
            const luminance = (values: number[]) => values.map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 }).reduce((sum,c,i) => sum + c * [.2126,.7152,.0722][i],0)
            const text = luminance(rgb(getComputedStyle(el).color))
            const background = luminance(rgb(getComputedStyle(el.closest('.subject-card')!).backgroundColor))
            let opacity = 1
            for (let parent: Element | null = el; parent; parent = parent.parentElement) opacity *= Number(getComputedStyle(parent).opacity)
            return { contrast: (Math.max(text, background) + .05) / (Math.min(text, background) + .05), opacity }
          })
          expect(style.opacity).toBe(1)
          expect(style.contrast).toBeGreaterThanOrEqual(4.5)
          if (state === 'active') { await page.mouse.move(0,0); await page.mouse.up() }
        }
      }
      for (const card of await cards.all()) {
        const box = await card.boundingBox()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
        expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      }
      await page.locator('.catalog-tools').scrollIntoViewIfNeeded()
      const search = page.locator('.catalog-tools .course-search')
      const select = page.getByRole('combobox', { name: 'Afficher les cours' })
      for (const control of [search,select]) {
        await expect(control).toBeInViewport()
        const box = await control.boundingBox()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      }
      const s = await search.boundingBox(), f = await select.boundingBox()
      expect(Math.abs(s!.height - f!.height)).toBeLessThanOrEqual(1)
      await select.focus()
      expect(await select.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
      await select.selectOption('remaining')
      await expect(select).toHaveValue('remaining')
      await noHorizontalOverflow(page)
    })
  }
}
