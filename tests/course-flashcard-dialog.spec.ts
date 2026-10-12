import {expect, test} from '@playwright/test'

for (const width of [1440, 390]) {
  for (const entry of ['cours', 'section', 'passage'] as const) {
    test(`Flashcards depuis un cours directement : ${entry}, ${width} px`, async ({page}) => {
      await page.setViewportSize({width, height: 900})
      await page.route('**/api/flashcards/decks', route => route.fulfill({json: {decks: []}}))
      await page.goto('/#tab=cours&cours=phys-cardiac-cycle')

      if (entry === 'cours') {
        await page.getByRole('button', {name: 'Générer des flashcards', exact: true}).click()
      } else if (entry === 'section') {
        await page.getByRole('button', {name: '+ Flashcards', exact: true}).first().click()
      } else {
        const paragraph = page.locator('.course-section p').first()
        await paragraph.scrollIntoViewIfNeeded()
        await paragraph.evaluate(element => {
          const range = document.createRange()
          range.selectNodeContents(element)
          const selection = window.getSelection()!
          selection.removeAllRanges()
          selection.addRange(range)
          element.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}))
        })
        await page.getByRole('button', {name: 'Ajouter aux flashcards', exact: true}).click()
      }

      const dialog = page.getByRole('dialog', {name: 'Générer des flashcards'})
      await expect(dialog).toBeInViewport()
      await expect(dialog.getByRole('button', {name: 'Générer les brouillons'})).toBeInViewport()
      await expect(page.locator('.flash-modal-backdrop')).toHaveCSS('position', 'fixed')
      const box = await dialog.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      await dialog.getByRole('button', {name: 'Fermer', exact: true}).click()
      await expect(dialog).not.toBeVisible()
    })
  }
}
