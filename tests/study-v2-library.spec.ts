import {test, expect, type Page} from '@playwright/test'
import {deflateSync} from 'node:zlib'
const headers = {'x-mycorpus-request': '1'}

function referencePdf() {
  const objects: Buffer[] = []
  const put = (id: number, value: string | Buffer) => objects[id - 1] = Buffer.concat([Buffer.from(`${id} 0 obj\n`), Buffer.isBuffer(value) ? value : Buffer.from(value), Buffer.from('\nendobj\n')])
  put(1, '<< /Type /Catalog /Pages 2 0 R >>')
  put(2, '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>')
  put(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>')
  put(4, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>')
  put(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const pages = [
    ['Chapitre 1 : Anatomie renale', 'Le rein filtre le plasma sanguin.', 'Le cortex renal contient les glomerules.', 'Le rein assure la filtration glomerulaire.'],
    ['Chapitre 2 : Physiologie renale', 'La filtration glomerulaire depend de la pression sanguine.', 'Le rein maintient la composition du milieu interieur.', 'Le debit sanguin renal contribue a la fonction renale.'],
  ]
  pages.forEach((lines, index) => {
    const bytes = deflateSync(Buffer.from('BT /F1 12 Tf 18 TL 72 712 Td ' + lines.map((line, index) => `${index === 0 ? '/F1 18 Tf' : '/F1 12 Tf'} (${line}) Tj T*`).join(' ') + ' ET'))
    put(index + 6, Buffer.concat([Buffer.from(`<< /Length ${bytes.length} /Filter /FlateDecode >>\nstream\n`), bytes, Buffer.from('\nendstream')]))
  })
  const parts = [Buffer.from('%PDF-1.4\n')], offsets = [0]
  for (const object of objects) {offsets.push(parts.reduce((sum, part) => sum + part.length, 0)); parts.push(object)}
  const start = parts.reduce((sum, part) => sum + part.length, 0)
  parts.push(Buffer.from(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`))
  return Buffer.concat(parts)
}
async function register(page: Page, name = 'Study') {
  const registered = await page.request.post('/api/account/register', {headers, data: {name, email: `study-v2-${crypto.randomUUID()}@example.test`, password: 'Study-v2-solide-2026'}})
  expect(registered.status()).toBe(201)
}
async function enable(page: Page) {
  await page.goto('/#tab=mes-cours')
  await page.getByRole('button', {name: 'Essayer Study 2.0 · bêta', exact: true}).click()
  await expect(page.getByRole('region', {name: 'Mes cours Study 2.0', exact: true})).toBeVisible()
}
async function importReference(page: Page) {
  await page.getByLabel('Fichier PDF', {exact: true}).setInputFiles({name: 'rein.pdf', mimeType: 'application/pdf', buffer: referencePdf()})
  await page.getByRole('button', {name: 'Importer le PDF', exact: true}).click()
  const card = page.locator('.sv2-document-card').filter({hasText: 'rein'})
  await expect(card.locator('.sv2-state')).toHaveText('Prêt', {timeout: 30000})
  return card
}

test('Study 2.0 : import persisté, dossiers, contenu, PDF sélectionnable, position et retour classique', async ({page}) => {
  await register(page)
  await enable(page)
  const card = await importReference(page)
  await page.getByRole('button', {name: 'Nouveau dossier', exact: true}).click()
  await page.getByLabel('Nom du dossier').fill('Anatomie')
  await page.getByRole('button', {name: 'Créer le dossier', exact: true}).click()
  await expect(page.locator('.sv2-folders').getByRole('button', {name: 'Anatomie', exact: true})).toBeVisible()
  await card.getByRole('button', {name: 'Renommer / déplacer', exact: true}).click()
  await card.getByLabel('Titre du cours').fill('Physiologie du rein')
  await card.getByLabel('Dossier du cours').selectOption({label: 'Anatomie'})
  await card.getByRole('button', {name: 'Enregistrer', exact: true}).click()
  await expect(page.locator('.sv2-document-card')).toContainText('Physiologie du rein')
  await page.getByLabel('Rechercher dans les titres et le contenu').fill('milieu interieur')
  await expect(page.locator('.sv2-document-card')).toHaveCount(1)
  await page.locator('.sv2-document-open').click()
  await expect(page.getByRole('heading', {name: 'Physiologie du rein', exact: true})).toBeVisible()
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  await expect(page.getByRole('navigation', {name: 'Chapitres du PDF'}).getByRole('button')).toHaveCount(2)
  await page.locator('.sv2-pdf-sheet').evaluate(node => {
    const span = [...node.querySelectorAll('span')].find(item => item.textContent === 'Le rein filtre le plasma sanguin.')!
    const range = document.createRange(); range.selectNodeContents(span)
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range)
    node.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}))
  })
  await expect(page.getByRole('region', {name: 'Passage sélectionné'})).toContainText('Le rein filtre le plasma sanguin.')
  await page.getByRole('button', {name: 'Page suivante', exact: true}).click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Chapitre 2 : Physiologie renale')
  await expect(page.getByRole('region', {name: 'Passage sélectionné'})).toHaveCount(0)
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get('doc')!
  await expect.poll(async () => (await (await page.request.get(`/api/study/v2/documents/${id}`)).json()).document.readingPage).toBe(2)
  const download = page.waitForEvent('download')
  await page.getByRole('link', {name: 'PDF original', exact: true}).click()
  expect((await download).suggestedFilename()).toBe('rein.pdf')
  await page.screenshot({path: 'tests/artifacts/design/study-v2-reader-desktop.png', fullPage: true})
  await page.getByRole('button', {name: 'Bibliothèque', exact: true}).click()
  await page.screenshot({path: 'tests/artifacts/design/study-v2-library-desktop.png', fullPage: true})
  await page.locator('.sv2-document-open').click()
  await expect(page.getByLabel('Page du PDF', {exact: true})).toHaveValue('2')
  await expect(page.locator('.sv2-text-layer')).toContainText('Chapitre 2 : Physiologie renale')
  await page.getByRole('navigation', {name: 'Espaces du cours'}).getByRole('button', {name: 'Flashcards', exact: true}).click()
  await expect(page.getByRole('region', {name: 'Révision des brouillons', exact: true})).toBeVisible()
  await page.getByRole('button', {name: 'Document original', exact: true}).click()
  await expect(page.getByLabel('Page du PDF', {exact: true})).toHaveValue('2')
  await page.getByRole('button', {name: 'Revenir à l’interface actuelle', exact: true}).click()
  await expect(page.locator('.mycourses-detail')).toContainText('Physiologie du rein')
  await expect(page).toHaveURL(new RegExp('doc=' + id))
})

test('Study 2.0 mobile 390 px : archive/restauration, PDF et absence de débordement', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await register(page)
  await enable(page)
  await importReference(page)
  await page.getByRole('button', {name: 'Archiver', exact: true}).click()
  await expect(page.locator('.sv2-document-card')).toHaveCount(0)
  await page.locator('.sv2-folders').getByRole('button', {name: 'Archives', exact: true}).click()
  await expect(page.locator('.sv2-document-card')).toHaveCount(1)
  await page.getByRole('button', {name: 'Restaurer', exact: true}).click()
  await expect(page.locator('.sv2-document-card')).toHaveCount(0)
  await page.locator('.sv2-folders').getByRole('button', {name: 'Tous les cours', exact: true}).click()
  await expect(page.locator('.sv2-document-card')).toHaveCount(1)
  expect(await page.locator('.sv2-workspace').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy()
  await page.locator('.sv2-document-open').click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  await page.getByRole('button', {name: 'Page suivante', exact: true}).click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Chapitre 2 : Physiologie renale')
  expect(await page.locator('.sv2-workspace').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy()
  await page.locator('.sv2-reader').scrollIntoViewIfNeeded()
  await page.screenshot({path: 'tests/artifacts/design/study-v2-reader-mobile.png', fullPage: true})
})

test('Study 2.0 : changement de compte ne conserve aucun document précédent', async ({page}) => {
  await register(page, 'Premier')
  await enable(page)
  await importReference(page)
  await page.locator('.sv2-document-open').click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  const response = await page.request.post('/api/account/register', {headers, data: {name: 'Second', email: `study-v2-${crypto.randomUUID()}@example.test`, password: 'Study-v2-solide-2026'}})
  expect(response.status()).toBe(201)
  const second = await response.json()
  await page.evaluate(async data => {
    const {activate} = await import('/src/account/store.ts')
    activate({...data, showProfile: false})
  }, second)
  await expect(page.locator('.sv2-text-layer')).toHaveCount(0)
  await expect(page.locator('.mycourses-workspace')).not.toContainText('Le rein filtre le plasma sanguin.')
  await page.getByRole('button', {name: 'Essayer Study 2.0 · bêta', exact: true}).click()
  await expect(page.getByRole('region', {name: 'Mes cours Study 2.0', exact: true})).toBeVisible()
  await expect(page.locator('.sv2-document-card')).toHaveCount(0)
  await expect(page.locator('.sv2-empty')).toContainText('Aucun cours ici')
})


test('Study 2.0 : réponse d’import perdue, reprise idempotente et PDF manquant récupérable', async ({page}) => {
  await register(page)
  await enable(page)
  const requests: string[] = []
  await page.route('**/api/study/v2/documents/upload', async route => {
    requests.push(route.request().headers()['x-study-request-id'])
    if (requests.length === 1) {await route.fetch(); await route.abort('failed')}
    else await route.continue()
  })
  await page.getByLabel('Fichier PDF', {exact: true}).setInputFiles({name: 'rein.pdf', mimeType: 'application/pdf', buffer: referencePdf()})
  await page.getByRole('button', {name: 'Importer le PDF', exact: true}).click()
  await expect(page.getByRole('button', {name: 'Importer le PDF', exact: true})).toBeEnabled()
  await page.getByRole('button', {name: 'Importer le PDF', exact: true}).click()
  await expect(page.locator('.sv2-document-card')).toHaveCount(1)
  expect(requests).toHaveLength(2)
  expect(requests[1]).toBe(requests[0])
  expect((await (await page.request.get('/api/study/v2/documents')).json()).documents).toHaveLength(1)
  const id = (await (await page.request.get('/api/study/v2/documents')).json()).documents[0].id
  let missing = true
  await page.route(`**/api/study/documents/${id}/pdf`, async route => {
    if (missing) await route.fulfill({status: 404, body: 'PDF introuvable'})
    else await route.continue()
  })
  await page.locator('.sv2-document-open').click()
  const reader = page.getByRole('region', {name: 'Lecteur du PDF original'})
  await expect(reader.getByRole('alert')).toContainText('Le PDF original est introuvable ou a été supprimé.')
  missing = false
  await reader.getByRole('button', {name: 'Réessayer', exact: true}).click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  await page.getByRole('button', {name: 'Activer le thème sombre', exact: true}).click()
  await page.screenshot({path: 'tests/artifacts/design/study-v2-reader-dark.png', fullPage: true})
})

test('Study 2.0 : flashcards existantes, génération, édition, acceptation et révision FSRS', async ({page}) => {
  await register(page)
  const deck = await page.request.post('/api/flashcards/decks', {headers, data: {name: 'Révision du rein'}})
  expect(deck.status()).toBe(201)
  await enable(page)
  await importReference(page)
  await page.locator('.sv2-document-open').click()
  await page.getByRole('navigation', {name: 'Espaces du cours'}).getByRole('button', {name: 'Flashcards', exact: true}).click()
  const review = page.getByRole('region', {name: 'Révision des brouillons', exact: true})
  await review.getByRole('button', {name: 'Configurer la génération', exact: true}).click()
  await review.getByRole('button', {name: 'Générer les brouillons', exact: true}).click()
  const draft = review.locator('.draft-review-card').first()
  await expect(draft).toBeVisible()
  await draft.getByRole('button', {name: 'Modifier', exact: true}).click()
  await draft.getByLabel('Recto', {exact: true}).fill('Que filtre le rein ?')
  await draft.getByRole('button', {name: 'Enregistrer les modifications', exact: true}).click()
  await review.getByLabel('Filtrer les brouillons').selectOption('edited')
  await expect(draft).toContainText('Que filtre le rein ?')
  await draft.getByRole('button', {name: 'Accepter', exact: true}).click()
  const link = review.getByRole('link', {name: /Réviser la carte créée/})
  await expect(link).toBeVisible()
  const url = await link.getAttribute('href')
  await link.click()
  await expect(page.getByRole('button', {name: 'Afficher la réponse', exact: true})).toBeVisible()
  await expect(page.getByText('Que filtre le rein ?', {exact: true})).toBeVisible()
  const noteId = new URLSearchParams(url!.slice(1)).get('note')
  expect((await (await page.request.get('/api/flashcards/review')).json()).cards.some((card: {noteId: string}) => card.noteId === noteId)).toBeTruthy()
})
