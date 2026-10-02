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

    const workspace = page.getByTestId('atlas-workspace')
    await expect(workspace).toBeVisible()

    const viewSelect = page.getByRole('combobox', { name: 'Planche anatomique' })
    await expect(viewSelect.locator('option')).toHaveCount(5)
    await expect(viewSelect).toContainText('Vue latérale')
    await expect(page.getByTestId('atlas-info-panel')).toHaveCount(0)

    await page.locator('.atlas-structure-menu > summary').click()
    await page.locator('.atlas-structure-menu-list button', { hasText: 'Lobe frontal' }).first().click()

    // Verify Info Panel appears with medical details
    const infoPanel = page.getByTestId('atlas-info-panel')
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

    await viewSelect.selectOption('coronal_charcot')
    await expect(page.locator('.viewer-title')).toContainText('Coupe frontale de Charcot')
    await viewSelect.selectOption('vascular_willis')
    await expect(page.locator('.viewer-title')).toContainText('Polygone de Willis')
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

    const workspace = page.getByTestId('atlas-workspace')
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

    await viewSelect.selectOption('chambers_valves')
    await expect(page.locator('.viewer-title')).toContainText('Coupe 4 cavités')
    await viewSelect.selectOption('coronary_tree')
    await expect(page.locator('.viewer-title')).toContainText('Réseau coronaire')
  })

  test('5. Modal de création Flashcard FSRS en 1 Clic', async ({ page }) => {
    await page.goto('/#tab=atlas&sub=brain&view=lateral')
    await page.waitForLoadState('domcontentloaded')

    await page.locator('.atlas-structure-menu > summary').click()
    await page.locator('.atlas-structure-menu-list button').first().click()
    await page.getByTestId('atlas-info-panel').getByText('Actions d’apprentissage').click()

    const createFlashcardBtn = page.getByTestId('atlas-info-panel').getByRole('button', { name: 'Créer une flashcard', exact: true })
    await expect(createFlashcardBtn).toBeVisible()
    await createFlashcardBtn.click()

    const modal = page.getByTestId('atlas-flashcard-modal')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Créer une Flashcard FSRS')
    await expect(modal.getByLabel('Recto de la carte (Question / Invite) :')).not.toHaveValue('')
    await expect(modal.getByLabel('Verso de la carte (Réponse / Définition médicale) :')).not.toHaveValue('')

    await modal.getByRole('button', { name: 'Fermer la boîte de dialogue' }).click()
    await expect(modal).not.toBeVisible()
  })

  test('6. Responsive mobile : navigation et affichage', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#tab=atlas&sub=brain')
    await page.waitForLoadState('domcontentloaded')

    const workspace = page.getByTestId('atlas-workspace')
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

for (const width of [1440, 900, 390]) {
  test(`Atlas : fiches, routes et accès aux régions à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#tab=atlas&sub=brain&view=lateral&structure=frontal_lobe')
    const panel = page.getByTestId('atlas-info-panel')
    await expect(panel.getByRole('heading', { name: 'Lobe frontal', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    const modeBounds = await page.getByRole('tablist', { name: 'Modes de l’atlas' }).boundingBox()
    const viewBounds = await page.locator('.atlas-views-bar').boundingBox()
    expect(modeBounds!.y + modeBounds!.height).toBeLessThanOrEqual(viewBounds!.y)
    for (const button of await page.getByRole('navigation', { name: 'Navigation principale', exact: true }).getByRole('button').all()) {
      if (await button.isVisible()) {
        expect(await button.evaluate(element => {
          const bounds = element.getBoundingClientRect()
          const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
          return hit !== null && element.contains(hit)
        })).toBe(true)
      }
    }
    if (width <= 900) {
      const navigation = page.getByRole('navigation', { name: 'Navigation pédagogique mobile' })
      const panelBounds = await panel.boundingBox()
      const navigationBounds = await navigation.boundingBox()
      expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(navigationBounds!.y)
    }
    await page.screenshot({ path: `tests/artifacts/atlas-brain-${width}.png` })
    await panel.getByRole('button', { name: 'Fermer la fiche', exact: true }).click()
    await expect(panel).toHaveCount(0)
    await expect(page).not.toHaveURL(/structure=/)
    await page.reload()
    await expect(page.getByTestId('atlas-workspace')).toBeVisible()
    await expect(panel).toHaveCount(0)
    await page.getByRole('button', { name: 'Retour au corps humain en 3D', exact: true }).click()
    await page.getByRole('button', { name: 'Explorer Cœur en 3D', exact: true }).click()
    await expect(page.getByTestId('structure-detail').getByRole('heading', { name: 'Cœur', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Explorer l’atlas du cœur', exact: true }).click()
    await expect(page.getByTestId('atlas-workspace').getByRole('heading', { name: 'Cardio-anatomie', exact: true })).toBeVisible()
    await expect(page).toHaveURL(/tab=atlas&sub=heart/)
  })
}

test('Atlas 3D : une région ouvre sa fiche pendant le chargement puis cadre le modèle', async ({ page }) => {
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  await page.route('**/models/organs.glb', async route => {
    await blocked
    await route.continue()
  })
  try {
    await page.goto('/')
    await page.getByRole('button', { name: 'Explorer Cœur en 3D', exact: true }).click()
    await expect(page.getByTestId('structure-detail').getByRole('heading', { name: 'Cœur', exact: true })).toBeVisible()
    const state = () => page.evaluate(() => (window as any).__CORPUS_TEST__?.state())
    await expect.poll(async () => (await state())?.ready ?? []).toContain('skin')
    expect((await state()).ready).not.toContain('organs')
    const initialTarget = (await state()).target
    release()
    await expect(page.locator('main')).toHaveAttribute('data-loaded', 'true', { timeout: 90000 })
    await expect.poll(async () => (await state()).selectedId).toBe('FMA7088')
    await expect.poll(async () => (await state()).target).not.toEqual(initialTarget)
    expect((await state()).ready).toContain('organs')
  } finally {
    release()
  }
})

test('Atlas : création réelle d’une flashcard depuis la fiche médicale', async ({ page }) => {
  const headers = { 'x-mycorpus-request': '1' }
  const password = 'Atlas-flashcards-test-2026'
  const account = await page.request.post('/api/account/register', {
    headers,
    data: { name: 'Atlas Test', email: `atlas-${crypto.randomUUID()}@example.test`, password },
  })
  expect(account.status()).toBe(201)
  try {
    const deckResponse = await page.request.post('/api/flashcards/decks', { headers, data: { name: 'Atlas Neuro Test' } })
    expect(deckResponse.status()).toBe(201)
    const { deck } = await deckResponse.json()
    await page.goto('/#tab=atlas&sub=brain&view=lateral&structure=frontal_lobe')
    const panel = page.getByTestId('atlas-info-panel')
    await panel.getByText('Actions d’apprentissage', { exact: true }).click()
    await panel.getByRole('button', { name: 'Créer une flashcard', exact: true }).click()
    const modal = page.getByTestId('atlas-flashcard-modal')
    await modal.getByLabel('Paquet de destination :').selectOption(deck.id)
    const creation = page.waitForResponse(response => response.url().endsWith('/api/flashcards/cards') && response.request().method() === 'POST')
    await modal.getByRole('button', { name: 'Enregistrer la Flashcard', exact: true }).click()
    const response = await creation
    expect(response.status()).toBe(201)
    const { card } = await response.json()
    expect(card.deckId).toBe(deck.id)
    expect(card.front).toContain('Lobe frontal')
    expect(card.back).toContain('Vascularisation')
    expect(card.tags).toContain('brain')
    expect(card.source).toMatchObject({
      type: 'manual', courseId: 'physio-neuro',
      locator: { route: '#tab=atlas&sub=brain&view=lateral&structure=frontal_lobe', structureId: 'frontal_lobe' },
    })
    const saved = await page.request.get(`/api/flashcards/cards?deckId=${encodeURIComponent(deck.id)}`)
    expect(saved.status()).toBe(200)
    const persisted = (await saved.json()).cards.find((item: { id: string }) => item.id === card.id)
    expect(persisted).toBeTruthy()
    expect(persisted.source).toEqual(card.source)
  } finally {
    const removed = await page.request.post('/api/account/delete', { headers, data: { password } })
    expect(removed.status()).toBe(200)
  }
})
