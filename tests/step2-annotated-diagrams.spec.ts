import {test, expect} from '@playwright/test'
import {medicalPlates} from '../src/study/medicalPlates'

test.describe('Step 2: AnnotatedDiagram & High-Fidelity Medical Plates', () => {
  test('Mode Révision: masquage des structures, révélation et navigation séquentielle', async ({page}) => {
    await page.goto('/#tab=cours&cours=phys-cardiac-cycle')
    const plate = page.locator('.medical-plate')
    await expect(plate).toBeVisible()

    // 1. Activer le mode révision
    const reviewBtn = plate.getByRole('button', {name: 'Mode révision'})
    await reviewBtn.click()

    // Vérifier la présence du bandeau de révision
    const banner = plate.locator('.medical-review-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('Structure 1 sur 4')
    await expect(banner).toContainText('Identifiez la structure pointée par le repère #1')

    // Vérifier que la légende est masquée
    await expect(plate.locator('.medical-legend')).toContainText('Repère 1 : ???')

    // Vérifier le message dans la fiche descriptive masquée
    await expect(plate.locator('.medical-review-masked-card')).toContainText('Structure #1 masquée pour la révision')

    // 2. Révéler la réponse
    const revealBtn = plate.getByRole('button', {name: 'Révéler la réponse'})
    await revealBtn.click()

    // Vérifier que la réponse et l'explication sont dévoilées
    await expect(plate.locator('.medical-review-revealed-indicator')).toContainText('Ouverture de la mitrale')
    await expect(plate.locator('.medical-point-title h3')).toContainText('Ouverture de la mitrale')
    await expect(plate.locator('.medical-detail')).toContainText('remplissage commence au volume télésystolique')

    // 3. Passer à la structure suivante
    await plate.getByRole('button', {name: 'Structure suivante'}).click()
    await expect(banner).toContainText('Structure 2 sur 4')
    await expect(plate.locator('.medical-review-masked-card')).toBeVisible()

    // Révéler la structure 2
    await plate.getByRole('button', {name: 'Révéler la réponse'}).click()
    await expect(plate.locator('.medical-review-revealed-indicator')).toContainText('Fermeture de la mitrale')
    await expect(plate.locator('.medical-detail')).toContainText('contraction isovolumétrique commence')

    // 4. Structure précédente
    await plate.getByRole('button', {name: 'Structure précédente'}).click()
    await expect(banner).toContainText('Structure 1 sur 4')

    // 5. Quitter le mode révision
    await plate.getByRole('button', {name: 'Quitter le mode révision'}).click()
    await expect(banner).toHaveCount(0)
    await expect(plate.locator('.medical-legend')).toContainText('1. Ouverture de la mitrale')
  })

  test('Surbrillance bidirectionnelle: Légende ↔ SVG', async ({page}) => {
    await page.goto('/#tab=cours&cours=phys-renal')
    const plate = page.locator('.medical-plate')
    await expect(plate).toBeVisible()

    // 1. Clic sur le 2ème bouton de légende (Tubule proximal)
    const legendBtn2 = plate.locator('.medical-legend button').nth(1)
    await legendBtn2.click()

    // Vérifier que la légende est active
    await expect(legendBtn2).toHaveAttribute('aria-pressed', 'true')
    // Vérifier que la fiche détail affiche Tubule proximal
    await expect(plate.locator('.medical-detail')).toContainText('Tubule proximal')
    await expect(plate.locator('.medical-detail')).toContainText('gradient entretenu par la Na+/K+-ATPase')

    // 2. Clic sur le 4ème hotspot (Branche ascendante)
    const hotspot4 = plate.locator('.medical-hotspot').nth(3)
    await hotspot4.click()

    // Vérifier que le 4ème bouton de légende est sélectionné automatiquement
    const legendBtn4 = plate.locator('.medical-legend button').nth(3)
    await expect(legendBtn4).toHaveAttribute('aria-pressed', 'true')
    await expect(plate.locator('.medical-detail')).toContainText('Branche ascendante')
    await expect(plate.locator('.medical-detail')).toContainText('gradient médullaire')

    // 3. Survol de la légende
    await legendBtn2.hover()
    await expect(legendBtn2).toHaveClass(/is-hovered/)
  })

  test('Planches anatomiques phares enrichies: Cœur, Cerveau, Poumons, Œil, Estomac, Rachis, Nerfs crâniens', async ({page}) => {
    const anatomicalPlates = [
      {id: 'FMA7088', expectedHeading: 'Anatomie interne du cœur', keyPoint: 'Ventricule gauche', keyDetail: 'paroi myocardique très épaisse'},
      {id: 'FMA50801', expectedHeading: 'Hémisphère cérébral', keyPoint: 'Lobe frontal', keyDetail: 'gyrus précentral'},
      {id: 'FMA7309', expectedHeading: 'Anatomie des poumons', keyPoint: 'Trachée et carène', keyDetail: 'T4-T5'},
      {id: 'anat-eye', expectedHeading: 'Globe oculaire', keyPoint: 'Cornée', keyDetail: 'Calotte antérieure transparente'},
      {id: 'FMA7148', expectedHeading: 'Configuration de l’estomac', keyPoint: 'Fundus', keyDetail: 'poche à air gastrique'},
      {id: 'anat-spine', expectedHeading: 'Colonne vertébrale', keyPoint: 'Disque intervertébral', keyDetail: 'annulus fibrosus'},
      {id: 'anat-cranial-nerves', expectedHeading: 'Émergence des 12 paires de nerfs crâniens', keyPoint: 'trijumeau', keyDetail: 'racine sensitive'}
    ]

    for (const item of anatomicalPlates) {
      await page.goto(`/#tab=cours&cours=${item.id}`)
      const plate = page.getByRole('figure', {name: medicalPlates[item.id].title})
      await expect(plate).toBeVisible()

      // Vérifier le titre
      await expect(plate.getByRole('heading', {level: 2})).toContainText(item.expectedHeading)

      // Cliquer sur le point clé
      await plate.locator('.medical-legend').getByRole('button', {name: new RegExp(item.keyPoint)}).click()
      await expect(plate.locator('.medical-detail')).toContainText(item.keyDetail)

      // Plein écran fonctionnel sur chaque planche
      await plate.getByRole('button', {name: 'Agrandir en plein écran'}).click()
      const modal = page.locator('.diagram-modal-overlay')
      await expect(modal).toBeVisible()
      await expect(modal.getByRole('heading', {level: 2})).toContainText(item.expectedHeading)

      // Fermer plein écran
      await modal.getByRole('button', {name: 'Fermer le plein écran (Échap)'}).click()
      await expect(modal).toHaveCount(0)
    }
  })
})
