import { test, expect } from '@playwright/test'

const luminance = (hex: string) => {
  const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
}
const contrast = (a: string, b: string) => {
  const values = [luminance(a), luminance(b)]
  return (Math.max(...values) + .05) / (Math.min(...values) + .05)
}

for (const width of [1440, 1024, 768, 390]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`identité MyCorpus : ${width}px, thème ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      for (const [route, ready] of [
        ['', '.intro'],
        ['tab=cours&cours=membrane', '.course-article'],
        ['tab=flashcards', '.flash-hero'],
        ['tab=mes-cours', '.mycourses-workspace'],
        ['tab=atlas&sub=brain&view=lateral&structure=frontal_lobe', '[data-testid="atlas-info-panel"]'],
        ['tab=atlas&sub=heart&view=morphology_anterior', '[data-testid="atlas-workspace"]'],
      ]) {
        await page.goto('/#' + route)
        await expect(page.locator(ready)).toBeVisible()
        if (await page.locator('html').getAttribute('data-theme') !== theme) {
          await page.getByRole('button', { name: theme === 'dark' ? 'Activer le thème sombre' : 'Activer le thème clair', exact: true }).click()
        }
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        const headingStyle = await page.locator(ready).locator('h1,h2').first().evaluate(element => {
          const style = getComputedStyle(element)
          return { family: style.fontFamily, size: parseFloat(style.fontSize) }
        })
        expect(headingStyle.family).toContain('Manrope Variable')
        expect(headingStyle.size).toBeLessThanOrEqual(44)
        expect(await page.locator('body').evaluate(element => getComputedStyle(element).fontFamily)).toContain('DM Sans Variable')
        const tokens = await page.evaluate(() => {
          const style = getComputedStyle(document.documentElement)
          return Object.fromEntries(['text', 'text-secondary', 'bg', 'surface', 'brand', 'brand-soft', 'on-brand'].map(key => [key, style.getPropertyValue('--mc-' + key).trim()]))
        })
        expect(contrast(tokens.text, tokens.bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(tokens['text-secondary'], tokens.surface)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(tokens.brand, tokens['brand-soft'])).toBeGreaterThanOrEqual(4.5)
        expect(contrast(tokens['on-brand'], tokens.brand)).toBeGreaterThanOrEqual(4.5)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        for (const button of await page.getByRole('navigation', { name: width <= 700 ? 'Navigation pédagogique mobile' : 'Navigation principale', exact: true }).getByRole('button').all()) {
          expect(await button.evaluate(element => {
            const rect = element.getBoundingClientRect()
            return rect.height >= 38 && rect.left >= 0 && rect.right <= innerWidth &&
              element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
          })).toBe(true)
        }
        if (route.includes('sub=')) await expect(page.getByRole('tablist', { name: 'Modes de l’atlas' }).getByRole('tab')).toHaveCount(route.includes('sub=brain') ? 5 : 4)
        for (const tab of await page.getByRole('tablist', { name: 'Modes de l’atlas' }).getByRole('tab').all()) {
          expect(await tab.evaluate(element => {
            const rect = element.getBoundingClientRect()
            return rect.left >= 0 && rect.right <= innerWidth &&
              element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
          })).toBe(true)
        }
        const surface = page.locator('.course-article, .atlas-context-panel, .flash-hero-score').first()
        if (await surface.isVisible()) {
          expect(await surface.evaluate(element => {
            const rect = element.getBoundingClientRect()
            return rect.left >= 0 && rect.right <= innerWidth
          })).toBe(true)
        }
      }
      await page.emulateMedia({ reducedMotion: 'reduce' })
      expect(await page.getByRole('navigation', { name: width <= 700 ? 'Navigation pédagogique mobile' : 'Navigation principale', exact: true }).getByRole('button').first()
        .evaluate(element => parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(.01)
    })
  }
}
