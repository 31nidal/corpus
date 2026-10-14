import {test, expect, type Page} from '@playwright/test'
import {referencePdf} from './helpers/study-v2-pdf'
const headers = {'x-mycorpus-request': '1'}

async function prepare(page: Page) {
  const registered = await page.request.post('/api/account/register', {headers, data: {name: 'Fiches', email: `notes-${crypto.randomUUID()}@example.test`, password: 'Fiches-test-solide-2026'}})
  expect(registered.status()).toBe(201)
  await page.goto('/#tab=mes-cours')
  await page.getByRole('button', {name: 'Essayer Study 2.0 · bêta', exact: true}).click()
  await page.getByLabel('Fichier PDF', {exact: true}).setInputFiles({name: 'rein.pdf', mimeType: 'application/pdf', buffer: referencePdf()})
  await page.getByRole('button', {name: 'Importer le PDF', exact: true}).click()
  await expect(page.locator('.sv2-document-card .sv2-state')).toHaveText('Prêt', {timeout: 30000})
  await page.locator('.sv2-document-open').click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  return new URLSearchParams(new URL(page.url()).hash.slice(1)).get('doc')!
}
const notes = (page: Page) => page.getByRole('region', {name: 'Fiches de révision du cours', exact: true})
const openNotes = (page: Page) => page.getByRole('navigation', {name: 'Espaces du cours'}).getByRole('button', {name: 'Fiches de révision', exact: true}).click()
async function generate(page: Page, kind = 'structured') {
  await notes(page).getByRole('combobox', {name: 'Format de la fiche', exact: true}).selectOption(kind)
  await notes(page).getByRole('button', {name: 'Générer un brouillon de fiche', exact: true}).click()
  await expect(notes(page).getByRole('region', {name: 'Édition de la fiche'})).toBeVisible({timeout: 30000})
}

test('Fiches V2 : édition, source centrale, PDF téléchargé, sauvegarde et plusieurs supports', async ({page}) => {
  const id = await prepare(page)
  await openNotes(page)
  await generate(page)
  await notes(page).getByLabel('Titre de la fiche', {exact: true}).fill('Révision du rein')
  const point = notes(page).getByRole('textbox', {name: 'Point 1', exact: true})
  await point.fill('Le rein filtre le plasma sanguin. Point relu par moi.')
  await notes(page).getByRole('button', {name: /Voir la source · p./}).first().click()
  await expect(page.locator('.sv2-reader')).toBeVisible()
  await openNotes(page)
  await expect(point).toHaveValue('Le rein filtre le plasma sanguin. Point relu par moi.')
  await notes(page).getByRole('button', {name: 'Enregistrer la fiche relue', exact: true}).click()
  await expect(notes(page)).toContainText('Fiche enregistrée. Elle reste modifiable.')
  await expect(notes(page).getByRole('article', {name: 'Aperçu de la fiche'})).toContainText('Point relu par moi.')
  await page.evaluate(() => {window.print = () => {throw new Error('Le dialogue d’impression ne doit pas s’ouvrir')}})
  const download = page.waitForEvent('download')
  await notes(page).getByRole('button', {name: 'Exporter la fiche en PDF', exact: true}).click()
  expect((await download).suggestedFilename()).toBe('mycorpus-revision-du-rein.pdf')
  const server = (await (await page.request.get(`/api/study/v2/documents/${id}/notes`)).json()).notes
  expect(server).toHaveLength(1); expect(server[0].state).toBe('saved')
  const detail = (await (await page.request.get(`/api/study/v2/documents/${id}/notes/${server[0].id}`)).json()).note
  expect(detail.items[0].edited).toBeTruthy()
  expect((await (await page.request.get(`/api/study/documents/${id}`)).json()).document.summary).toBeNull()
  await notes(page).getByRole('button', {name: 'Nouvelle fiche', exact: true}).click()
  await generate(page, 'short')
  await expect(notes(page).getByRole('navigation', {name: 'Fiches disponibles'}).getByRole('button')).toHaveCount(2)
  await page.reload()
  await openNotes(page)
  await notes(page).getByRole('navigation', {name: 'Fiches disponibles'}).getByRole('button', {name: /Révision du rein/}).click()
  await expect(notes(page).getByRole('article', {name: 'Aperçu de la fiche'})).toContainText('Point relu par moi.')
  await page.screenshot({path: 'tests/artifacts/design/study-v2-notes-desktop.png', fullPage: true})
})

test('Fiches V2 : sélection PDF vérifiée, une seule section et retour à la page de preuve', async ({page}) => {
  const id = await prepare(page)
  await page.getByRole('button', {name: 'Page suivante', exact: true}).click()
  await expect(page.locator('.sv2-text-layer')).toContainText('La filtration glomerulaire depend de la pression sanguine.')
  await page.locator('.sv2-pdf-sheet').evaluate(node => {
    const span = [...node.querySelectorAll('span')].find(item => item.textContent === 'La filtration glomerulaire depend de la pression sanguine.')!
    const range = document.createRange(); range.selectNodeContents(span)
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range)
    node.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}))
  })
  await page.getByRole('button', {name: 'Résumer ce passage', exact: true}).click()
  await expect(notes(page).getByRole('combobox', {name: 'Source de la fiche', exact: true})).toHaveValue('selection')
  await generate(page, 'short')
  const result = (await (await page.request.get(`/api/study/v2/documents/${id}/notes`)).json()).notes[0]
  const detail = (await (await page.request.get(`/api/study/v2/documents/${id}/notes/${result.id}`)).json()).note
  expect(detail.selection.page).toBe(2); expect(detail.sections).toHaveLength(1)
  expect(detail.items.every((item: {page: number}) => item.page === 2)).toBeTruthy()
  await notes(page).getByRole('button', {name: 'Voir la source · p. 2', exact: true}).first().click()
  await expect(page.getByLabel('Page du PDF', {exact: true})).toHaveValue('2')
  await expect(page.locator('.sv2-text-layer')).toContainText('La filtration glomerulaire depend de la pression sanguine.')
})

test('Fiches V2 : erreur réseau garde les modifications et Réessayer conserve l’intention de sauvegarde', async ({page}) => {
  const id = await prepare(page)
  await openNotes(page); await generate(page)
  await notes(page).getByLabel('Titre de la fiche', {exact: true}).fill('Fiche conservée malgré la panne')
  let failed = false
  await page.route('**/api/study/v2/documents/*/notes/*', async route => {
    if (route.request().method() === 'PATCH' && !failed) {failed = true; await route.abort('failed')}
    else await route.continue()
  })
  await notes(page).getByRole('button', {name: 'Enregistrer la fiche relue', exact: true}).click()
  await expect(notes(page).getByRole('alert')).toContainText('Connexion au serveur impossible.')
  await expect(notes(page).getByLabel('Titre de la fiche', {exact: true})).toHaveValue('Fiche conservée malgré la panne')
  await notes(page).getByRole('button', {name: 'Réessayer l’enregistrement', exact: true}).click()
  await expect(notes(page)).toContainText('Fiche enregistrée. Elle reste modifiable.')
  const saved = (await (await page.request.get(`/api/study/v2/documents/${id}/notes`)).json()).notes[0]
  expect(saved.title).toBe('Fiche conservée malgré la panne'); expect(saved.state).toBe('saved')
})

test('Fiches V2 mobile 390 px : édition au clavier, aperçu et absence de débordement', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await prepare(page); await openNotes(page); await generate(page, 'detailed')
  const field = notes(page).getByRole('textbox', {name: 'Point 1', exact: true})
  await field.focus(); await page.keyboard.press('End'); await page.keyboard.type(' Texte relu.')
  await expect(field).toHaveValue(/Texte relu\./)
  await notes(page).getByRole('button', {name: 'Enregistrer la fiche relue', exact: true}).click()
  await expect(notes(page).getByRole('article', {name: 'Aperçu de la fiche'})).toContainText('Texte relu.')
  expect(await page.locator('.sv2-workspace').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy()
  await notes(page).getByRole('article', {name: 'Aperçu de la fiche'}).scrollIntoViewIfNeeded()
  await page.screenshot({path: 'tests/artifacts/design/study-v2-notes-mobile.png', fullPage: true})
})
