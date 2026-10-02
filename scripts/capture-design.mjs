import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const phase = process.argv[2] || 'after'
const baseUrl = process.argv[3] || 'http://127.0.0.1:5173'
if (!['before', 'after'].includes(phase)) throw new Error('Phase attendue : before ou after')
if (!['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname)) throw new Error('Les captures utilisent un serveur local de test.')
const output = new URL('../tests/artifacts/design/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const context = await browser.newContext()
const page = await context.newPage()
const headers = { 'x-mycorpus-request': '1' }
const password = `Design-${randomUUID()}-2026`
let registered = false
const observations = []
const routes = [
  ['atlas3d', '', 'main[data-loaded="true"]'],
  ['cours', 'tab=cours&cours=membrane', '.course-article'],
  ['flashcards', 'tab=flashcards', '.flash-hero'],
  ['cerveau', 'tab=atlas&sub=brain&view=lateral&structure=frontal_lobe', '[data-testid="atlas-info-panel"]'],
  ['coeur', 'tab=atlas&sub=heart&view=morphology', '[data-testid="atlas-workspace"]'],
  ['mes-cours', 'tab=mes-cours', '.mycourses-workspace'],
  ['decks', 'tab=flashcards', '.flash-hero'],
  ['revision', 'tab=flashcards', '.flash-hero'],
]
try {
  const account = await context.request.post(`${baseUrl}/api/account/register`, { headers, data: { name: 'Audit visuel', email: `design-${randomUUID()}@example.test`, password } })
  if (account.status() !== 201) throw new Error(`Création du compte de test : ${account.status()}`)
  registered = true
  const deckResponse = await context.request.post(`${baseUrl}/api/flashcards/decks`, { headers, data: { name: 'Repères anatomiques', description: 'Structures et fonctions essentielles', subject: 'Anatomie' } })
  if (deckResponse.status() !== 201) throw new Error(`Création du deck de test : ${deckResponse.status()}`)
  const { deck } = await deckResponse.json()
  const card = await context.request.post(`${baseUrl}/api/flashcards/cards`, { headers, data: { deckId: deck.id, front: 'Quel est le rôle du ventricule gauche ?', back: 'Il éjecte le sang dans la circulation systémique.' } })
  if (card.status() !== 201) throw new Error(`Création de la carte de test : ${card.status()}`)
  for (const width of phase === 'before' ? [1440, 390] : [1440, 1024, 768, 390]) {
    for (const theme of ['light', 'dark']) {
      for (const [name, hash, ready] of routes) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`${baseUrl}/#${hash}`)
        await page.locator(ready).waitFor({ timeout: 90000 })
        if (await page.locator('html').getAttribute('data-theme') !== theme) {
          await page.getByRole('button', { name: theme === 'dark' ? 'Activer le thème sombre' : 'Activer le thème clair', exact: true }).click()
        }
        await page.waitForFunction(value => document.documentElement.dataset.theme === value, theme)
        await page.evaluate(() => document.fonts.ready)
        if (['flashcards', 'decks', 'revision'].includes(name)) {
          await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Commencer' && !button.disabled))
        }
        if (name === 'decks') {
          await page.getByRole('button', { name: 'Mes decks', exact: true }).click()
          await page.locator('.deck-grid article').waitFor()
        }
        if (name === 'revision') {
          await page.getByRole('button', { name: 'Commencer', exact: true }).click()
          await page.locator('.review-card').waitFor()
        }
        await page.screenshot({ animations: 'disabled', path: new URL(`${phase}-${name}-${width}-${theme}.png`, output).pathname })
        observations.push({ name, width, theme, ...await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, bodyFont: getComputedStyle(document.body).fontFamily })) })
      }
    }
  }
  await writeFile(new URL(`${phase}.json`, output), JSON.stringify(observations, null, 2))
  console.log(`${phase} : ${observations.length} captures dans ${output.pathname}`)
} finally {
  try {
    if (registered) {
      const deleted = await context.request.post(`${baseUrl}/api/account/delete`, { headers, data: { password } })
      if (deleted.status() !== 200) throw new Error(`Suppression du compte de test : ${deleted.status()}`)
    }
  } finally {
    await browser.close()
  }
}
