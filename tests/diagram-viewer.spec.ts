import {test, expect} from '@playwright/test'

test.describe('DiagramViewer engine (Step 1)', () => {
  test('MedicalDiagram: zoom avant, arrière, reset et plein écran', async ({page}) => {
    await page.goto('/#tab=cours&cours=phys-renal')
    const plate = page.locator('.medical-plate')
    await expect(plate).toBeVisible()

    // Verify initial zoom level is 100%
    await expect(plate.locator('.diagram-zoom-level')).toHaveText('100%')

    // Click Zoom In (+)
    await plate.getByRole('button', {name: 'Zoom avant'}).click()
    await expect(plate.locator('.diagram-zoom-level')).toHaveText('125%')
    await expect(plate.locator('.diagram-zoom-reset')).toBeVisible()

    // Click Zoom In (+) again
    await plate.getByRole('button', {name: 'Zoom avant'}).click()
    await expect(plate.locator('.diagram-zoom-level')).toHaveText('150%')

    // Click Zoom Out (-)
    await plate.getByRole('button', {name: 'Zoom arrière'}).click()
    await expect(plate.locator('.diagram-zoom-level')).toHaveText('125%')

    // Reset zoom
    await plate.locator('.diagram-zoom-reset').click()
    await expect(plate.locator('.diagram-zoom-level')).toHaveText('100%')
    await expect(plate.locator('.diagram-zoom-reset')).toHaveCount(0)

    // Fullscreen open
    await plate.getByRole('button', {name: 'Agrandir en plein écran'}).click()
    const modal = page.locator('.diagram-modal-overlay')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', {level: 2})).toContainText('Néphron')

    // Zoom inside fullscreen modal
    await modal.getByRole('button', {name: 'Zoom avant'}).click()
    await expect(modal.locator('.diagram-zoom-level')).toHaveText('125%')

    // Hotspot interaction inside modal (exact hotspot match)
    await modal.getByRole('button', {name: 'Glomérule et capsule', exact: true}).click()
    await expect(modal.locator('.medical-detail')).toContainText('barrière glomérulaire')

    // Legend interaction inside modal
    await modal.locator('.medical-legend').getByRole('button', {name: /Tubule proximal/}).click()
    await expect(modal.locator('.medical-detail')).toContainText('sodium')

    // Close modal via Escape key
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)

    // Open fullscreen again and close via close button
    await plate.getByRole('button', {name: 'Agrandir en plein écran'}).click()
    await expect(modal).toBeVisible()
    await modal.getByRole('button', {name: 'Fermer le plein écran (Échap)'}).click()
    await expect(modal).toHaveCount(0)
  })

  test('GenericDiagram: zoom et plein écran fonctionnels sur schéma interactif', async ({page}) => {
    await page.goto('/#tab=cours&cours=cell-cycle-phases-control')
    const diagram = page.locator('.interactive-diagram')
    await expect(diagram).toBeVisible()

    // Zoom in
    await diagram.getByRole('button', {name: 'Zoom avant'}).click()
    await expect(diagram.locator('.diagram-zoom-level')).toHaveText('125%')
    await expect(diagram.locator('.diagram-pan-hint')).toBeVisible()

    // Reset zoom
    await diagram.locator('.diagram-zoom-reset').click()
    await expect(diagram.locator('.diagram-zoom-level')).toHaveText('100%')

    // Fullscreen modal
    await diagram.getByRole('button', {name: 'Agrandir en plein écran'}).click()
    const modal = page.locator('.diagram-modal-overlay')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', {level: 2})).toContainText('Carte des notions')

    // Click a node inside fullscreen
    await modal.locator('.diagram-canvas button').nth(1).click()
    await expect(modal.locator('.diagram-explanation h3')).toHaveText('Interphase et phase M')

    // Close via close button
    await modal.getByRole('button', {name: 'Fermer le plein écran (Échap)'}).click()
    await expect(modal).toHaveCount(0)
  })

  test('Mobile responsive & dark mode: aucun débordement et lisibilité parfaite', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844})
    await page.goto('/#tab=cours&cours=phys-cardiac-cycle')

    // Dark mode
    await page.getByRole('button', {name: 'Activer le thème sombre'}).click()

    const plate = page.locator('.medical-plate')
    await expect(plate).toBeVisible()

    // Verify page has zero horizontal overflow
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)

    // Verify pastilles / hotspots are accessible and visible
    const hotspot1 = plate.getByRole('button', {name: 'Ouverture de la mitrale', exact: true})
    await expect(hotspot1).toBeVisible()
    await hotspot1.click()
    await expect(plate.locator('.medical-detail')).toContainText('remplissage commence')

    // Open fullscreen modal on mobile
    await plate.getByRole('button', {name: 'Agrandir en plein écran'}).click()
    const modal = page.locator('.diagram-modal-overlay')
    await expect(modal).toBeVisible()

    // Verify modal does not overflow screen
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)

    // Close modal
    await modal.getByRole('button', {name: 'Fermer le plein écran (Échap)'}).click()
    await expect(modal).toHaveCount(0)
  })
})
