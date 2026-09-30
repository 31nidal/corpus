import { test, expect } from '@playwright/test'

test.describe('Atlas anatomique - Cerveau & Cœur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('1. Les trois blocs sélectionnent une structure du modèle 3D et ouvrent sa fiche', async ({ page }) => {
    await page.getByRole('button', { name: 'Atlas 3D', exact: true }).click()
    const regions = page.locator('.region-blocks')
    await expect(regions.locator('.region-block')).toHaveCount(3)
    const detail = page.locator('[data-testid="structure-detail"]')

    await regions.getByRole('button', { name: 'Explorer Cœur en 3D' }).click()
    await expect(detail.locator('h2')).toHaveText('Cœur')
    await page.getByRole('button', { name: 'Fermer la fiche' }).click()

    await regions.getByRole('button', { name: 'Explorer Cerveau en 3D' }).click()
    await expect(detail.locator('h2')).toHaveText('Cerveau')
    await page.getByRole('button', { name: 'Fermer la fiche' }).click()

    await regions.getByRole('button', { name: 'Explorer Tête en 3D' }).click()
    await expect(detail.locator('h2')).toHaveText('Crâne')
  })

  test('2. Atlas Neuroanatomie & Cerveau : exploration et 5 vues', async ({ page }) => {
    await page.goto('/#tab=atlas&sub=brain&view=lateral')
    await page.waitForLoadState('domcontentloaded')

    const workspace = page.locator('[data-testid="atlas-workspace"]')
    await expect(workspace).toBeVisible()

    const viewSelect = page.getByRole('combobox', { name: 'Planche anatomique' })
    await expect(viewSelect.locator('option')).toHaveCount(5)
    await expect(viewSelect).toContainText('Vue latérale')
    await expect(page.locator('[data-testid="atlas-info-panel"]')).toHaveCount(0)

    await page.locator('.atlas-structure-menu > summary').click()
    await page.locator('.atlas-structure-menu-list button', { hasText: 'Lobe frontal' }).first().click()

    // Verify Info Panel appears with medical details
    const infoPanel = page.locator('[data-testid="atlas-info-panel"]')
    await expect(infoPanel).toBeVisible()
    await expect(infoPanel.locator('.atlas-more-details').first()).toBeVisible()
    await infoPanel.locator('.atlas-more-details').first().locator('summary').click()
    await expect(infoPanel).toContainText('Repère')
    await expect(infoPanel).toContainText('Rapports')
    await expect(infoPanel).toContainText('Vascularisation')
    await expect(infoPanel).toContainText('Rôle')
    await expect(infoPanel).toContainText('À retenir en clinique')
    await expect(infoPanel).toContainText('Point clé pour les examens')

    await viewSelect.selectOption('sagittal')
    await expect(page.locator('.viewer-title')).toContainText('Vue sagittale')

    await viewSelect.selectOption('base_cranial')
    await expect(page.locator('.viewer-title')).toContainText('Base du crâne')
  })

  test('3. Atlas Cerveau : Modes Trajets, Quiz, Clinique et Neuro-Explorer', async ({ page }) => {
    // Mode Trajets / Pathway
    await page.goto('/#tab=atlas&sub=brain&mode=pathway')
    await page.waitForLoadState('domcontentloaded')
    const pathwayViewer = page.locator('[data-testid="atlas-pathway-viewer"]')
    await expect(pathwayViewer).toBeVisible()
    await expect(pathwayViewer).toContainText('Voie cortico-spinale')

    // Mode Quiz
    await page.goto('/#tab=atlas&sub=brain&mode=test')
    await page.waitForLoadState('domcontentloaded')
    const quizPanel = page.locator('[data-testid="atlas-quiz-panel"]')
    await expect(quizPanel).toBeVisible()
    await expect(page.locator('.quiz-progress-badge')).toContainText('Question 1')

    // Mode Clinique
    await page.goto('/#tab=atlas&sub=brain&mode=clinical')
    await page.waitForLoadState('domcontentloaded')
    const clinicalOverlay = page.locator('[data-testid="atlas-clinical-overlay"]')
    await expect(clinicalOverlay).toBeVisible()
    await expect(clinicalOverlay).toContainText('AVC Ischémique')

    // Mode Neuro-Explorer fonctionnel
    await page.goto('/#tab=atlas&sub=brain&mode=neuro')
    await page.waitForLoadState('domcontentloaded')
    const neuroExplorer = page.locator('[data-testid="neuro-explorer"]')
    await expect(neuroExplorer).toBeVisible()
    await expect(neuroExplorer).toContainText('Cartographie Fonctionnelle Cérébrale')
    await expect(neuroExplorer).toContainText('Fonction Motrice')
    await expect(neuroExplorer).toContainText('Langage')
  })

  test('4. Atlas Cardiologie & Cœur : exploration et vues spécialisées', async ({ page }) => {
    await page.goto('/#tab=atlas&sub=heart&view=morphology')
    await page.waitForLoadState('domcontentloaded')

    const workspace = page.locator('[data-testid="atlas-workspace"]')
    await expect(workspace).toBeVisible()

    const viewSelect = page.getByRole('combobox', { name: 'Planche anatomique' })
    await expect(viewSelect.locator('option')).toHaveCount(5)
    await expect(viewSelect).toContainText('Vue antérieure externe')

    await page.locator('.atlas-structure-menu > summary').click()
    await page.locator('.atlas-structure-menu-list button', { hasText: 'Ventricule gauche' }).first().click()

    await viewSelect.selectOption('conduction_ecg')
    await expect(page.locator('.viewer-title')).toContainText('Tissu nodal & Conduction ECG')

    await viewSelect.selectOption('auscultation')
    await expect(page.locator('.viewer-title')).toContainText('Foyers d’Auscultation')
  })

  test('5. Modal de création Flashcard FSRS en 1 Clic', async ({ page }) => {
    await page.goto('/#tab=atlas&sub=brain&view=lateral')
    await page.waitForLoadState('domcontentloaded')

    await page.locator('.atlas-structure-menu > summary').click()
    await page.locator('.atlas-structure-menu-list button').first().click()
    await page.locator('[data-testid="atlas-info-panel"]').getByText('Actions d’apprentissage').click()

    const createFlashcardBtn = page.locator('button', { hasText: 'Créer une Flashcard FSRS' }).first()
    if (await createFlashcardBtn.isVisible()) {
      await createFlashcardBtn.click()

      // Modal should open
      const modal = page.locator('[data-testid="atlas-flashcard-modal"]')
      await expect(modal).toBeVisible()
      await expect(modal).toContainText('Créer une Flashcard FSRS')
      await expect(modal).toContainText('Recto de la carte')
      await expect(modal).toContainText('Verso de la carte')

      // Close modal
      await page.locator('.atlas-modal-close').click()
      await expect(modal).not.toBeVisible()
    }
  })

  test('6. Responsive mobile : navigation et affichage', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#tab=atlas&sub=brain')
    await page.waitForLoadState('domcontentloaded')

    const workspace = page.locator('[data-testid="atlas-workspace"]')
    await expect(workspace).toBeVisible()
    await expect(page.locator('.atlas-info-panel')).toHaveCount(0)
    const geometry = await page.locator('.atlas-viewer-container').boundingBox()
    expect(geometry?.height).toBeGreaterThan(450)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)

    // The specialized atlas returns directly to the 3D body.
    await page.locator('.atlas-nav-hub-btn').click()
    await expect(page.locator('.region-blocks .region-block')).toHaveCount(3)
  })

  test('7. Le shell des atlas respecte le thème sombre MyCorpus', async ({ page }) => {
    await page.goto('/#tab=atlas&sub=heart&view=morphology_anterior')
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await expect(page.locator('.atlas-workspace-container')).toBeVisible()
    const background = await page.locator('.atlas-workspace-container').evaluate(element => getComputedStyle(element).backgroundColor)
    expect(background).toBe('rgb(16, 29, 34)')
    await page.locator('.atlas-structure-menu > summary').click()
    await page.locator('.atlas-structure-menu-list button').first().click()
    const panelBackground = await page.locator('.atlas-context-panel').evaluate(element => getComputedStyle(element).backgroundColor)
    expect(panelBackground).toContain('23, 41, 46')
  })
})
