import { test, expect } from '@playwright/test'
import { deflateSync } from 'node:zlib'
import { questions } from '../src/study/questions'

const password = 'Flashcards-test-solide-2026'

async function register(page: any) {
  await page.goto('/#tab=flashcards')
  await page.getByRole('button', { name: 'Mon compte', exact: true }).click()
  await page.getByRole('button', { name: 'Créer un compte', exact: true }).click()
  await page.getByLabel('Prénom ou pseudonyme').fill('Lina')
  await page.getByLabel('Adresse e-mail').fill(`flash-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click()
  await page.getByRole('button', { name: 'J’ai conservé mon code' }).click()
  await page.getByRole('button', { name: 'Fermer le profil' }).click()
}

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

test('flashcards : deck, carte manuelle, génération en brouillon et révision persistante', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await register(page)
  await page.getByRole('button', { name: 'Mes decks' }).click()
  await page.getByLabel('Nom du nouveau deck').fill('Cardiologie')
  await page.getByRole('button', { name: 'Créer un deck' }).click()
  await expect(page.getByRole('heading', { name: 'Cardiologie' })).toBeVisible()

  await page.getByRole('button', { name: 'Toutes mes cartes' }).click()
  await page.getByRole('button', { name: 'Nouvelle carte' }).click()
  await page.getByLabel('Recto').fill('Quelle est la formule du débit cardiaque ?')
  await page.getByLabel('Verso').fill('DC = fréquence cardiaque × volume d’éjection systolique.')
  await page.getByLabel(/Matière/).fill('Physiologie')
  await page.getByLabel('Tags séparés par des virgules').fill('cœur, formule')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Quelle est la formule du débit cardiaque ?')).toBeVisible()

  await page.getByRole('button', { name: 'Aujourd’hui' }).click()
  const text = 'Le nœud sinusal assure normalement le rythme du cœur. Le débit cardiaque est le produit de la fréquence cardiaque par le volume d’éjection systolique. La pression artérielle dépend du débit cardiaque et des résistances périphériques.'
  await page.getByLabel('Texte à transformer en flashcards').fill(text)
  await page.getByRole('button', { name: 'Générer des flashcards' }).click()
  await page.getByRole('button', { name: 'Générer les brouillons' }).click()
  await expect(page.getByText(/carte\(s\) sélectionnée\(s\)/)).toBeVisible()
  await page.getByLabel('Deck de destination').selectOption({ label: 'Cardiologie' })
  await page.getByRole('button', { name: 'Enregistrer la sélection' }).click()

  await expect(page.locator('.flash-hero-score strong')).toHaveText(/[2-9]/)
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(page.getByText('RECTO')).toBeVisible()
  await page.getByRole('button', { name: 'Afficher la réponse' }).click()
  await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/review') && response.request().method() === 'POST' && response.ok()),
    page.getByRole('button', { name: /Correct/ }).click(),
  ])
  const restoredStats = page.waitForResponse(response => response.url().endsWith('/api/flashcards/stats') && response.ok())
  await page.reload()
  await restoredStats
  await expect(page.getByRole('region', { name: 'Flashcards', exact: true })).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('navigation', { name: 'Navigation principale', exact: true }).getByRole('button', { name: 'Flashcards', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.setViewportSize({ width: 393, height: 852 })
  await expect(page.getByText('Générer depuis un texte')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(393)
  expect(errors).toEqual([])
})

test('génération et persistance : texte libre (front/back non vides, dialogue et deck)', async ({ page }) => {
  await register(page)
  await page.getByRole('button', { name: 'Mes decks' }).click()
  await page.getByLabel('Nom du nouveau deck').fill('Physio')
  await page.getByRole('button', { name: 'Créer un deck' }).click()
  await expect(page.getByRole('heading', { name: 'Physio' })).toBeVisible()

  await page.getByRole('button', { name: 'Aujourd’hui' }).click()
  const text = "Le fémur s'articule proximalement avec l'os coxal. L'artère fémorale vascularise le membre inférieur. Le quadriceps permet l'extension du genou."
  await page.getByLabel('Texte à transformer en flashcards').fill(text)
  await page.getByRole('button', { name: 'Générer des flashcards' }).click()

  const dialog = page.getByRole('dialog', { name: 'Générer des flashcards' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Générer les brouillons' }).click()

  const articles = dialog.locator('.flash-draft-list article')
  await expect(articles.first()).toBeVisible()
  const count = await articles.count()
  expect(count).toBeGreaterThan(0)

  const capturedCards: { front: string; back: string }[] = []
  for (let i = 0; i < count; i++) {
    const art = articles.nth(i)
    const front = await art.getByLabel('Recto').inputValue()
    const back = await art.getByLabel('Verso').inputValue()
    expect(front.trim().length).toBeGreaterThan(0)
    expect(back.trim().length).toBeGreaterThan(0)
    capturedCards.push({ front, back })
  }

  await dialog.getByLabel('Deck de destination').selectOption({ label: 'Physio' })
  await dialog.getByRole('button', { name: 'Enregistrer la sélection' }).click()
  await expect(dialog).not.toBeVisible()

  await expect(page.locator('.flash-toast')).toContainText(new RegExp(`${count} carte.*Physio`))

  await page.getByRole('button', { name: 'Toutes mes cartes' }).click()
  await page.getByLabel('Filtrer par deck').selectOption({ label: 'Physio' })
  for (const card of capturedCards) {
    const cardItem = page.locator('.flash-card-list article').filter({ hasText: card.back })
    await expect(cardItem).toBeVisible()
    await expect(cardItem.locator('h3')).toContainText(card.front)
  }
})

test('génération et persistance : cours MyCorpus (front/back non vides, dialogue et deck)', async ({ page }) => {
  await register(page)
  await page.getByRole('button', { name: 'Mes decks' }).click()
  await page.getByLabel('Nom du nouveau deck').fill('Cœur')
  await page.getByRole('button', { name: 'Créer un deck' }).click()

  await page.goto('/#tab=cours&cours=FMA7088')
  await page.getByRole('button', { name: 'Générer des flashcards' }).click()

  const dialog = page.getByRole('dialog', { name: 'Générer des flashcards' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Générer les brouillons' }).click()

  const articles = dialog.locator('.flash-draft-list article')
  await expect(articles.first()).toBeVisible()
  const count = await articles.count()
  expect(count).toBeGreaterThan(0)

  const capturedCards: { front: string; back: string }[] = []
  for (let i = 0; i < count; i++) {
    const art = articles.nth(i)
    const front = await art.getByLabel('Recto').inputValue()
    const back = await art.getByLabel('Verso').inputValue()
    expect(front.trim().length).toBeGreaterThan(0)
    expect(back.trim().length).toBeGreaterThan(0)
    capturedCards.push({ front, back })
  }

  await dialog.getByLabel('Deck de destination').selectOption({ label: 'Cœur' })
  await dialog.getByRole('button', { name: 'Enregistrer la sélection' }).click()
  await expect(dialog).not.toBeVisible()

  await expect(page.locator('.flash-toast')).toContainText(new RegExp(`${count} carte.*Cœur`))

  await page.goto('/#tab=flashcards')
  await page.getByRole('button', { name: 'Toutes mes cartes' }).click()
  await page.getByLabel('Filtrer par deck').selectOption({ label: 'Cœur' })
  for (const card of capturedCards) {
    const cardItem = page.locator('.flash-card-list article').filter({ hasText: card.back })
    await expect(cardItem).toBeVisible()
    await expect(cardItem.locator('h3')).toContainText(card.front)
  }
})

test('génération et persistance : PDF Study (front/back non vides, dialogue et deck)', async ({ page }) => {
  await register(page)
  await page.getByRole('button', { name: 'Mes decks' }).click()
  await page.getByLabel('Nom du nouveau deck').fill('Poumons')
  await page.getByRole('button', { name: 'Créer un deck' }).click()

  await page.goto('/#tab=mes-cours')
  const pdfBuffer = makeTestPdf([
    'Chapitre 1 : Physiologie respiratoire et mecanique ventilatoire.',
    'Le diaphragme est le muscle principal de la respiration chez l etre humain.',
    'Lors de la contraction du diaphragme, la pression intra-thoracique diminue.',
    'L oxygene diffuse ensuite des alveoles vers le sang capillaire pulmonaire.'
  ])

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choisir un PDF' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'respiration.pdf',
    mimeType: 'application/pdf',
    buffer: pdfBuffer
  })

  await expect(page.getByRole('heading', { name: 'respiration' })).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Générer des flashcards' }).click()

  const dialog = page.getByRole('dialog', { name: 'Générer des flashcards' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Générer les brouillons' }).click()

  const articles = dialog.locator('.flash-draft-list article')
  await expect(articles.first()).toBeVisible()
  const count = await articles.count()
  expect(count).toBeGreaterThan(0)

  const capturedCards: { front: string; back: string }[] = []
  for (let i = 0; i < count; i++) {
    const art = articles.nth(i)
    const front = await art.getByLabel('Recto').inputValue()
    const back = await art.getByLabel('Verso').inputValue()
    expect(front.trim().length).toBeGreaterThan(0)
    expect(back.trim().length).toBeGreaterThan(0)
    capturedCards.push({ front, back })
  }

  await dialog.getByLabel('Deck de destination').selectOption({ label: 'Poumons' })
  await dialog.getByRole('button', { name: 'Enregistrer la sélection' }).click()
  await expect(dialog).not.toBeVisible()

  await expect(page.locator('.flash-toast')).toContainText(new RegExp(`${count} carte.*Poumons`))

  await page.goto('/#tab=flashcards')
  await page.getByRole('button', { name: 'Toutes mes cartes' }).click()
  await page.getByLabel('Filtrer par deck').selectOption({ label: 'Poumons' })
  for (const card of capturedCards) {
    const cardItem = page.locator('.flash-card-list article').filter({ hasText: card.back })
    await expect(cardItem).toBeVisible()
    await expect(cardItem.locator('h3')).toContainText(card.front)
  }
})

test('génération et persistance : erreur QCM (front/back non vides, dialogue et deck)', async ({ page }) => {
  await register(page)
  await page.getByRole('button', { name: 'Mes decks' }).click()
  await page.getByLabel('Nom du nouveau deck').fill('Erreurs')
  await page.getByRole('button', { name: 'Créer un deck' }).click()

  await page.goto('/#tab=entrainement&cours=orientation')
  await page.getByRole('button', { name: 'Commencer la série' }).click()

  const prompt = await page.locator('.question-layout h1').innerText()
  const question = questions.find(item => item.prompt === prompt)!
  expect(question).toBeTruthy()
  // The random question may have its correct answer in any position.
  const wrong = question.options.findIndex((_, index) => !question.correct.includes(index))
  await page.locator('.answer-options button').nth(wrong >= 0 ? wrong : 0).click()
  await page.getByRole('button', { name: 'Valider ma réponse' }).click()

  const addBtn = page.getByRole('button', { name: 'Ajouter aux flashcards' })
  await expect(addBtn).toBeVisible()
  await addBtn.click()

  const dialog = page.getByRole('dialog', { name: 'Générer des flashcards' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Générer les brouillons' }).click()

  const articles = dialog.locator('.flash-draft-list article')
  await expect(articles.first()).toBeVisible()
  const count = await articles.count()
  expect(count).toBeGreaterThan(0)

  const capturedCards: { front: string; back: string }[] = []
  for (let i = 0; i < count; i++) {
    const art = articles.nth(i)
    const front = await art.getByLabel('Recto').inputValue()
    const back = await art.getByLabel('Verso').inputValue()
    expect(front.trim().length).toBeGreaterThan(0)
    expect(back.trim().length).toBeGreaterThan(0)
    capturedCards.push({ front, back })
  }

  await dialog.getByLabel('Deck de destination').selectOption({ label: 'Erreurs' })
  await dialog.getByRole('button', { name: 'Enregistrer la sélection' }).click()
  await expect(dialog).not.toBeVisible()

  await expect(page.locator('.flash-toast')).toContainText(new RegExp(`${count} carte.*Erreurs`))

  await page.goto('/#tab=flashcards')
  await page.getByRole('button', { name: 'Toutes mes cartes' }).click()
  await page.getByLabel('Filtrer par deck').selectOption({ label: 'Erreurs' })
  for (const card of capturedCards) {
    const cardItem = page.locator('.flash-card-list article').filter({ hasText: card.back })
    await expect(cardItem).toBeVisible()
    await expect(cardItem.locator('h3')).toContainText(card.front)
  }
})

test('interface mobile 393x852 : dialogue plein écran et absence de double scroll', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await register(page)

  await page.getByRole('button', { name: 'Mes decks' }).click()
  await page.getByLabel('Nom du nouveau deck').fill('MobileDeck')
  await page.getByRole('button', { name: 'Créer un deck' }).click()

  await page.getByRole('button', { name: 'Aujourd’hui' }).click()
  const text = "Le fémur s'articule proximalement avec l'os coxal. L'artère fémorale vascularise le membre inférieur. Le quadriceps permet l'extension du genou."
  await page.getByLabel('Texte à transformer en flashcards').fill(text)
  await page.getByRole('button', { name: 'Générer des flashcards' }).click()

  const dialog = page.getByRole('dialog', { name: 'Générer des flashcards' })
  await expect(dialog).toBeVisible()

  const modalBox = await dialog.boundingBox()
  expect(modalBox?.width).toBe(393)
  expect(modalBox?.height).toBe(852)

  await dialog.getByRole('button', { name: 'Générer les brouillons' }).click()
  await expect(dialog.getByText(/carte\(s\) sélectionnée\(s\)/)).toBeVisible()

  const draftListOverflow = await dialog.locator('.flash-draft-list').evaluate(el => window.getComputedStyle(el).overflowY)
  expect(draftListOverflow).toBe('visible')

  const saveBtn = dialog.getByRole('button', { name: 'Enregistrer la sélection' })
  await saveBtn.scrollIntoViewIfNeeded()
  await expect(saveBtn).toBeVisible()

  await dialog.getByLabel('Deck de destination').selectOption({ label: 'MobileDeck' })
  await saveBtn.click()
  await expect(dialog).not.toBeVisible()

  const toast = page.locator('.flash-toast')
  await expect(toast).toBeVisible()
  const toastBox = await toast.boundingBox()
  expect(toastBox && toastBox.x >= 0 && (toastBox.x + toastBox.width) <= 393).toBe(true)
})

test('un cours MyCorpus ouvre toujours un aperçu avant enregistrement', async ({ page }) => {
  await register(page)
  await page.goto('/#tab=cours&cours=FMA7088')
  await page.getByRole('button', { name: 'Générer des flashcards' }).click()
  await expect(page.getByRole('dialog', { name: 'Générer des flashcards' })).toBeVisible()
  await expect(page.getByText('GÉNÉRATION EN BROUILLON')).toBeVisible()
  await expect(page.getByText('Tout sélectionner')).toBeVisible()
  await page.getByRole('button', { name: 'Fermer' }).click()
})

test('une erreur réseau de révision conserve la réponse et un double clic ne compte qu’une fois', async ({ page }) => {
  await register(page)
  const headers = { 'x-mycorpus-request': '1' }
  const deck = (await (await page.request.post('/api/flashcards/decks', { headers, data: { name: 'Révision fiable' } })).json()).deck
  await page.request.post('/api/flashcards/cards', { headers, data: { deckId: deck.id, front: 'Question réseau', back: 'Réponse conservée' } })
  await page.reload()
  await page.getByRole('button', { name: 'Commencer' }).click()
  await page.getByRole('button', { name: 'Afficher la réponse' }).click()
  await page.route('**/api/flashcards/cards/*/review', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Connexion interrompue. Réessayez.' }) }))
  await page.getByRole('button', { name: /Correct/ }).click()
  await expect(page.getByRole('alert')).toContainText('Connexion interrompue')
  await expect(page.getByText('Réponse conservée')).toBeVisible()
  let calls = 0
  await page.unroute('**/api/flashcards/cards/*/review')
  await page.route('**/api/flashcards/cards/*/review', async route => { calls++; await new Promise(resolve => setTimeout(resolve, 300)); await route.continue() })
  await page.getByRole('button', { name: /Correct/ }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.getByRole('heading', { name: 'Session terminée' })).toBeVisible()
  expect(calls).toBe(1)
  const stats = (await (await page.request.get('/api/flashcards/stats')).json()).stats
  expect(stats.reviews).toBe(1)
})

test('les brouillons incomplets ne disparaissent pas et la recherche garde le focus', async ({ page }) => {
  await register(page)
  await page.getByRole('button', { name: 'Mes decks' }).click()
  await page.getByLabel('Nom du nouveau deck').fill('Brouillons')
  await page.getByRole('button', { name: 'Créer un deck' }).click()
  await expect(page.getByRole('heading', { name: 'Brouillons' })).toBeVisible()
  await page.getByRole('button', { name: 'Aujourd’hui' }).click()
  await page.getByLabel('Texte à transformer en flashcards').fill('Le débit cardiaque est le produit de la fréquence cardiaque par le volume d’éjection systolique. Le nœud sinusal assure normalement le rythme du cœur.')
  await page.getByRole('button', { name: 'Générer des flashcards' }).click()
  await page.getByRole('button', { name: 'Générer les brouillons' }).click()
  await page.getByRole('button', { name: 'Ajouter une carte', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Générer des flashcards' })
  await dialog.getByRole('button', { name: 'Enregistrer la sélection' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Complétez le recto')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Recto', { exact: true }).last().fill('Question ajoutée')
  await dialog.getByLabel('Verso', { exact: true }).last().fill('Réponse ajoutée')
  await dialog.getByRole('button', { name: 'Enregistrer la sélection' }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Toutes mes cartes' }).click()
  const search = page.getByLabel('Rechercher dans les flashcards')
  await search.pressSequentially('Question ajoutée', { delay: 230 })
  await expect(search).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Question ajoutée' })).toBeVisible()
})

test('une réponse perdue après enregistrement ne duplique pas les brouillons', async ({page}) => {
 await register(page)
 await page.getByRole('button',{name:'Mes decks'}).click()
 await page.getByLabel('Nom du nouveau deck').fill('Réseau instable')
 await page.getByRole('button',{name:'Créer un deck'}).click()
 await expect(page.getByRole('heading',{name:'Réseau instable'})).toBeVisible()
 await page.getByRole('button',{name:'Aujourd’hui'}).click()
 await page.getByLabel('Texte à transformer en flashcards').fill('Le cœur est situé dans le médiastin. Le rein filtre le plasma sanguin.')
 await page.getByRole('button',{name:'Générer des flashcards'}).click()
 await page.getByRole('button',{name:'Générer les brouillons'}).click()
 const dialog=page.getByRole('dialog',{name:'Générer des flashcards'})
 await expect(dialog.locator('.flash-draft-list article')).toHaveCount(2)
 let fail=true
 await page.route('**/api/flashcards/cards/bulk',async route=>{
  if(fail){fail=false;await route.fetch();await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Réponse réseau perdue. Réessayez.'})})}
  else await route.continue()
 })
 await dialog.getByRole('button',{name:'Enregistrer la sélection'}).click()
 await expect(dialog.getByRole('alert')).toContainText('Réponse réseau perdue')
 await dialog.getByRole('button',{name:'Enregistrer la sélection'}).click()
 await expect(dialog).not.toBeVisible()
  const result=await (await page.request.get('/api/flashcards/cards')).json()
  expect(result.cards).toHaveLength(2)
})

test('FSRS : session de révision, affichage des 4 intervalles précalculés et persistance FSRS', async ({ page }) => {
  await register(page)
  await page.getByRole('button', { name: 'Mes decks' }).click()
  await page.getByLabel('Nom du nouveau deck').fill('FSRS Deck')
  await page.getByRole('button', { name: 'Créer un deck' }).click()
  await expect(page.getByRole('heading', { name: 'FSRS Deck' })).toBeVisible()

  await page.getByRole('button', { name: 'Toutes mes cartes' }).click()
  await page.getByRole('button', { name: 'Nouvelle carte' }).click()
  await page.getByLabel('Recto').fill('Qu’est-ce que le nœud sinusal ?')
  await page.getByLabel('Verso').fill('Le pacemaker physiologique naturel du cœur.')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Qu’est-ce que le nœud sinusal ?')).toBeVisible()

  await page.getByRole('button', { name: 'Aujourd’hui' }).click()
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(page.getByText('RECTO')).toBeVisible()
  await page.getByRole('button', { name: 'Afficher la réponse' }).click()
  await expect(page.getByText('VERSO')).toBeVisible()

  const againBtn = page.getByRole('button', { name: /À revoir/ })
  const hardBtn = page.getByRole('button', { name: /Difficile/ })
  const goodBtn = page.getByRole('button', { name: /Correct/ })
  const easyBtn = page.getByRole('button', { name: /Facile/ })

  await expect(againBtn).toBeVisible()
  await expect(hardBtn).toBeVisible()
  await expect(goodBtn).toBeVisible()
  await expect(easyBtn).toBeVisible()

  await expect(againBtn.locator('small')).toHaveText(/min|h|j/)
  await expect(goodBtn.locator('small')).toHaveText(/min|h|j/)

  const [reviewResponse] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/review') && response.request().method() === 'POST' && response.ok()),
    goodBtn.click(),
  ])

  const reviewPayload = await reviewResponse.json()
  expect(reviewPayload.review.state).toBe('learning')
  expect(reviewPayload.review.reviewVersion).toBe(1)
  expect(reviewPayload.review.schedulerVersion).toContain('ts-fsrs')

  await page.reload()
  await page.waitForResponse(response => response.url().endsWith('/api/flashcards/stats') && response.ok())
  await expect(page.locator('.flash-hero-score strong')).toHaveText('0')
})
