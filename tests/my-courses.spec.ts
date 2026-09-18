import { test, expect } from '@playwright/test'
import { deflateSync } from 'node:zlib'

const password = 'Mon-long-mot-de-passe-2026'
const randomEmail = () => `test-study-${crypto.randomUUID()}@fac.test`

function makeTestPdf(textLines: string[]) {
  const streamContent = 'BT /F1 12 Tf 72 712 Td ' +
    textLines.map(l => `(${l.replace(/[()]/g, '')}) Tj T*`).join(' ') +
    ' ET'
  const deflated = deflateSync(Buffer.from(streamContent))
  const pdfParts = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n',
    '4 0 obj\n<< /Length ' + deflated.length + ' /Filter /FlateDecode >>\nstream\n'
  ]
  return Buffer.concat([
    Buffer.from(pdfParts.join(''), 'latin1'),
    deflated,
    Buffer.from('\nendstream\nendobj\nxref\n0 5\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'latin1')
  ])
}

test('parcours complet Mes cours : connexion → upload PDF → extraction → synthèse → QCM → export Anki → suppression', async ({ page }) => {
  page.setDefaultTimeout(30000)
  page.on('dialog', dialog => dialog.accept())

  const email = randomEmail()

  // 1. Accès à l'application
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-loaded', 'true', { timeout: 90000 })

  // 2. Connexion / Inscription
  await page.getByRole('button', { name: 'Mon compte', exact: true }).click()
  await page.getByRole('button', { name: 'Créer un compte', exact: true }).click()
  await page.getByLabel('Prénom ou pseudonyme').fill('Alex')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bonjour, Alex.' })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'J’ai conservé mon code' }).click()
  await page.getByRole('button', { name: 'Fermer le profil' }).click()

  // 3. Navigation vers « Mes cours »
  await page.getByRole('button', { name: 'Mes cours', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Mes cours/ })).toBeVisible()
  await expect(page.locator('.mycourses-quota-badge')).toContainText('0 / 25 cours enregistrés')

  // 4. Upload du fichier PDF de cours
  const pdfBuffer = makeTestPdf([
    'Chapitre 1 : Pharmacologie cardiovasculaire et antiarythmiques.',
    'Les betabloquants ralentissent la frequence cardiaque et diminuent la contractilite.',
    'L amiodarone est un antiarythmique de classe III qui prolonge la periode refractaire.',
    'La surveillance de l intervalle QT permet de prevenir le risque de torsades de pointes.'
  ])

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choisir un PDF' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'pharmacologie.pdf',
    mimeType: 'application/pdf',
    buffer: pdfBuffer
  })

  // 5. Vérification de l'extraction et affichage du détail
  await expect(page.getByRole('heading', { name: 'pharmacologie' })).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.mycourses-detail-meta')).toContainText('1 pages')
  await expect(page.locator('.mycourses-detail-meta')).toContainText('chapitres détectés')

  // 6. Génération de la synthèse
  await page.getByRole('button', { name: /Générer la synthèse/ }).click()
  await expect(page.locator('.mycourses-summary-card')).toBeVisible({ timeout: 25000 })
  await expect(page.locator('.mycourses-workspace .intro-text')).toContainText('Fiche de synthèse')
  await expect(page.locator('.mycourses-summary-card h3')).toBeVisible()

  // 7. Génération de QCM
  await page.getByRole('button', { name: /Générer QCM/ }).click()
  await expect(page.locator('.mycourses-question-item').first()).toBeVisible({ timeout: 25000 })

  // 8. Export vers Anki
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Anki \(\.csv\)/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('mycorpus-')
  expect(download.suggestedFilename()).toContain('.csv')

  // 9. Suppression du document
  await page.getByRole('button', { name: 'Supprimer ce cours' }).click()

  // Vérification du retour à la liste vide et du compteur de cours
  await expect(page.getByRole('heading', { name: /Mes cours/ })).toBeVisible()
  await expect(page.locator('.mycourses-quota-badge')).toContainText('0 / 25 cours enregistrés')
})
