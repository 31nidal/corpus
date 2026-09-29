import { test, expect } from '@playwright/test'

test.describe('Atlas Médicaux Haute Fidélité - Cerveau & Cœur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#tab=atlas')
    await page.waitForLoadState('domcontentloaded')
  })

  test('1. Hub principal des atlas : affichage et recherche', async ({ page }) => {
    // Check Hub Hero and Cards
    const hub = page.locator('[data-testid="atlas-hub"]')
    await expect(hub).toBeVisible()

    await expect(page.locator('h1.hero-title')).toContainText('Atlas Médicaux Haute Fidélité')
    await expect(page.locator('[data-testid="card-atlas-brain"]')).toBeVisible()
    await expect(page.locator('[data-testid="card-atlas-heart"]')).toBeVisible()
    await expect(page.locator('[data-testid="card-atlas-3d"]')).toBeVisible()

    // Test search filter
    const searchInput = page.locator('.atlas-hub-search-input')
    await searchInput.fill('Lobe frontal')
    const searchResults = page.locator('[data-testid="atlas-search-results"]')
    await expect(searchResults).toBeVisible()
    await expect(searchResults).toContainText('Lobe frontal')

    // Click search result to navigate directly
    await searchResults.locator('button.search-result-item').first().click()
    await expect(page.locator('[data-testid="atlas-workspace"]')).toBeVisible()
  })

  test('2. Atlas Neuroanatomie & Cerveau : exploration et 5 vues', async ({ page }) => {
    await page.goto('/#tab=atlas&sub=brain&view=lateral')
    await page.waitForLoadState('domcontentloaded')

    const workspace = page.locator('[data-testid="atlas-workspace"]')
    await expect(workspace).toBeVisible()

    // Verify 5 view tabs exist
    const viewsRow = page.locator('.views-pills-row')
    await expect(viewsRow).toContainText('Vue latérale')
    await expect(viewsRow).toContainText('Vue sagittale')
    await expect(viewsRow).toContainText('Coupe frontale de Charcot')
    await expect(viewsRow).toContainText('Base du crâne')
    await expect(viewsRow).toContainText('Polygone de Willis')

    // Click on a structure (e.g. Lobe frontal chip)
    const structureChip = page.locator('.strip-chip', { hasText: 'Lobe frontal' }).first()
    if (await structureChip.isVisible()) {
      await structureChip.click()
    }

    // Verify Info Panel appears with medical details
    const infoPanel = page.locator('[data-testid="atlas-info-panel"]')
    await expect(infoPanel).toBeVisible()
    await expect(infoPanel).toContainText('Localisation')
    await expect(infoPanel).toContainText('Vascularisation')
    await expect(infoPanel).toContainText('Fonction')
    await expect(infoPanel).toContainText('Perle clinique')
    await expect(infoPanel).toContainText('Point clé pour les examens')

    // Switch to Sagittal view
    await page.locator('.view-pill-btn', { hasText: 'Vue sagittale' }).click()
    await expect(page.locator('.viewer-title')).toContainText('Vue sagittale')

    // Switch to Cranial Nerves view
    await page.locator('.view-pill-btn', { hasText: 'Base du crâne' }).click()
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

    // Verify Heart Views
    const viewsRow = page.locator('.views-pills-row')
    await expect(viewsRow).toContainText('Vue antérieure externe')
    await expect(viewsRow).toContainText('Coupe 4 cavités')
    await expect(viewsRow).toContainText('Réseau coronaire')
    await expect(viewsRow).toContainText('Tissu nodal & Conduction ECG')
    await expect(viewsRow).toContainText('Foyers d’Auscultation')

    // Select structure
    const leftVentricleChip = page.locator('.strip-chip', { hasText: 'Ventricule gauche' }).first()
    if (await leftVentricleChip.isVisible()) {
      await leftVentricleChip.click()
    }

    // Switch to Conduction & ECG view
    await page.locator('.view-pill-btn', { hasText: 'Tissu nodal & Conduction ECG' }).click()
    await expect(page.locator('.viewer-title')).toContainText('Tissu nodal & Conduction ECG')

    // Switch to Auscultation view
    await page.locator('.view-pill-btn', { hasText: 'Foyers d’Auscultation' }).click()
    await expect(page.locator('.viewer-title')).toContainText('Foyers d’Auscultation')
  })

  test('5. Modal de création Flashcard FSRS en 1 Clic', async ({ page }) => {
    await page.goto('/#tab=atlas&sub=brain&view=lateral')
    await page.waitForLoadState('domcontentloaded')

    // Select a structure to open Info Panel
    const chip = page.locator('.strip-chip').first()
    if (await chip.isVisible()) {
      await chip.click()
    }

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

    // Hub button works
    await page.locator('.atlas-nav-hub-btn').click()
    await expect(page.locator('[data-testid="atlas-hub"]')).toBeVisible()
  })
})
