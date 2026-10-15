import {test, expect, type Page} from '@playwright/test'
import {referencePdf} from './helpers/study-v2-pdf'
import type {AssistantThread} from '../src/study/v2/assistantApi'
const headers = {'x-mycorpus-request': '1'}
async function prepare(page: Page) {
  expect((await page.request.post('/api/account/register', {headers, data: {name: 'Assistant', email: `assistant-${crypto.randomUUID()}@example.test`, password: 'Assistant-test-solide-2026'}})).status()).toBe(201)
  await page.goto('/#tab=mes-cours')
  await page.getByRole('button', {name: 'Essayer Study 2.0 · bêta', exact: true}).click()
  await page.getByLabel('Fichier PDF', {exact: true}).setInputFiles({name: 'rein.pdf', mimeType: 'application/pdf', buffer: referencePdf()})
  await page.getByRole('button', {name: 'Importer le PDF', exact: true}).click()
  await expect(page.locator('.sv2-document-card .sv2-state')).toHaveText('Prêt', {timeout: 30000})
  await page.locator('.sv2-document-open').click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  return new URLSearchParams(new URL(page.url()).hash.slice(1)).get('doc')!
}
// UI contract simulation. The real server and Gemini protocol are tested in
// study-v2-assistant.test.mjs, not replaced by this fixture in production.
async function mockAssistant(page: Page, doc: string) {
  let thread: AssistantThread | null = null, failed = false
  const requests: {requestId: string; prompt: string; selection?: {page: number; text: string}}[] = []
  await page.route(`**/api/study/v2/documents/${doc}/assistant**`, async route => {
    const method = route.request().method(), path = new URL(route.request().url()).pathname.split('/assistant')[1]
    const body = method === 'POST' ? route.request().postDataJSON() : {}
    if (method === 'GET' && !path) return route.fulfill({json: {threads: thread ? [thread] : []}})
    if (method === 'GET') return route.fulfill({json: {thread}})
    if (method === 'POST' && !path) {
      thread = {id: 'thread-1', title: 'Rein', documentId: doc, createdAt: Date.now(), updatedAt: Date.now(), messages: []}
      return route.fulfill({status: 201, json: {thread}})
    }
    if (method === 'POST' && path.endsWith('/messages') && thread) {
      requests.push(body)
      if (!failed && body.prompt.includes('panne')) {failed = true; return route.abort('failed')}
      const answered = !body.prompt.includes('bourse')
      const message = {id: 'message-' + thread.messages.length, prompt: body.prompt, sourceVersion: 1, state: 'succeeded' as const,
        source: {selection: body.selection || null, processingState: 'ready', sections: [{id: 's1', title: 'Rein'}]}, generation: {}, errorMessage: null,
        response: {answered, message: answered ? 'Réponse fondée sur le cours sélectionné.' : 'Le contenu sélectionné ne permet pas de répondre.',
          paragraphs: answered ? [{text: 'La filtration glomérulaire dépend de la pression sanguine.', citations: [{sourceSectionId: 's1', sourceExcerpt: 'La filtration glomerulaire depend de la pression sanguine.', page: 2, endPage: 2, exactPage: true}]}] : []}}
      thread.messages.push(message)
      return route.fulfill({status: 202, json: {message}})
    }
    return route.fulfill({status: 400, json: {error: 'Requête non prévue.'}})
  })
  return requests
}
const assistant = (page: Page) => page.getByRole('region', {name: 'Assistant documentaire', exact: true})
test('Assistant V2 contrat UI : source cliquable, PDF central, abstention et conversation conservée', async ({page}) => {
  const doc = await prepare(page); await mockAssistant(page, doc)
  await page.getByRole('button', {name: 'Assistant IA', exact: true}).click()
  await assistant(page).getByRole('textbox', {name: 'Votre question', exact: true}).fill('Quel est le rôle du rein ?')
  await assistant(page).getByRole('button', {name: 'Envoyer la question', exact: true}).click()
  await expect(assistant(page)).toContainText('La filtration glomérulaire dépend de la pression sanguine.')
  await assistant(page).getByText('Source · page 2', {exact: true}).click()
  await assistant(page).getByRole('button', {name: 'Voir le passage dans le PDF', exact: true}).click()
  await expect(page.getByLabel('Page du PDF', {exact: true})).toHaveValue('2')
  await expect(page.locator('.sv2-reader')).toBeVisible()
  await expect(assistant(page)).toBeVisible()
  await assistant(page).getByRole('textbox', {name: 'Votre question', exact: true}).fill('Quel est le cours de la bourse ?')
  await assistant(page).getByRole('button', {name: 'Envoyer la question', exact: true}).click()
  await expect(assistant(page)).toContainText('ne permet pas de répondre')
  await assistant(page).getByRole('button', {name: 'Fermer l’assistant', exact: true}).click()
  await expect(assistant(page)).not.toBeVisible()
  await page.getByRole('button', {name: 'Assistant IA', exact: true}).click()
  await expect(assistant(page)).toContainText('ne permet pas de répondre')
  await page.screenshot({path: 'tests/artifacts/design/study-v2-assistant-desktop.png', fullPage: true})
})
test('Assistant V2 contrat UI mobile : sélection page 2, panne et reprise de la même demande', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  const doc = await prepare(page), requests = await mockAssistant(page, doc)
  await page.getByRole('button', {name: 'Page suivante', exact: true}).click()
  await expect(page.locator('.sv2-text-layer')).toContainText('La filtration glomerulaire depend de la pression sanguine.')
  await page.locator('.sv2-pdf-sheet').evaluate(node => {
    const span = [...node.querySelectorAll('span')].find(item => item.textContent === 'La filtration glomerulaire depend de la pression sanguine.')!
    const range = document.createRange(); range.selectNodeContents(span)
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range)
    node.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}))
  })
  await page.getByRole('button', {name: 'Expliquer ce passage', exact: true}).click()
  await expect(assistant(page).getByRole('combobox', {name: 'Sources de la réponse', exact: true})).toHaveValue('selection')
  await assistant(page).getByRole('textbox', {name: 'Votre question', exact: true}).fill('Explique ce passage malgré la panne.')
  await assistant(page).getByRole('button', {name: 'Envoyer la question', exact: true}).click()
  await expect(assistant(page).getByRole('alert')).toContainText('Connexion au serveur impossible.')
  await expect(assistant(page).getByRole('textbox', {name: 'Votre question', exact: true})).toHaveValue('Explique ce passage malgré la panne.')
  await assistant(page).getByRole('button', {name: 'Réessayer', exact: true}).click()
  await expect(assistant(page)).toContainText('Réponse fondée sur le cours sélectionné.')
  expect(requests).toHaveLength(2); expect(requests[0].requestId).toBe(requests[1].requestId); expect(requests[1].selection?.page).toBe(2)
  expect(await page.locator('.sv2-workspace').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy()
  await page.screenshot({path: 'tests/artifacts/design/study-v2-assistant-mobile.png', fullPage: true})
})
test('Assistant V2 sans Gemini : erreur persistée, pas de réponse inventée', async ({page}) => {
  await prepare(page)
  await page.getByRole('button', {name: 'Assistant IA', exact: true}).click()
  await assistant(page).getByRole('textbox', {name: 'Votre question', exact: true}).fill('Quel est le rôle du rein ?')
  await assistant(page).getByRole('button', {name: 'Envoyer la question', exact: true}).click()
  await expect(assistant(page)).toContainText('nécessite Gemini', {timeout: 30000})
  await expect(assistant(page)).toContainText('Aucun appel payant supplémentaire')
})
