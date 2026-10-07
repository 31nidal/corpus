import { test, expect } from '@playwright/test'
import { deflateSync } from 'node:zlib'

for (const width of [1440, 390]) {
  test(`navigation produit : ${width}px, sept espaces et compte`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#tab=cours')
    const navigation = page.getByRole('navigation', { name: width <= 700 ? 'Navigation pédagogique mobile' : 'Navigation principale', exact: true })
    await expect(navigation.locator('button, a')).toHaveCount(7)
    const today = navigation.getByRole('link', { name: 'Aujourd’hui', exact: true })
    await today.click()
    await expect(page.locator('main')).toHaveAttribute('data-workspace', 'dashboard')
    await expect(today).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('navigation', {name:width<=700?'Navigation principale':'Navigation pédagogique mobile',exact:true})).not.toBeVisible()
    for (const [label, workspace] of [['Flashcards', 'flashcards'], ['Mes cours', 'my-courses'], ['Entraînement', 'practice'], ['Cours', 'courses'], ['Atlas 3D', 'atlas']]) {
      const button = navigation.getByRole('button', { name: label, exact: true })
      await button.click()
      await expect(page.locator('main')).toHaveAttribute('data-workspace', workspace)
      await expect(button).toHaveAttribute('aria-current', 'page')
    }
    await navigation.getByRole('button', { name: 'Mon compte', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Mon compte' })).toBeVisible()
    await expect(navigation.getByRole('button', { name: 'Mon compte', exact: true })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('button', { name: 'Fermer le profil' }).click()
    await expect(page.locator('.account-panel')).toHaveCount(0)
  })
}

test('recherche Atlas : accents, mots inversés, français, classement et sélection détaillée', async ({ page }) => {
  const detailModels:string[]=[]
  page.on('request',request=>{if(/models\/detail-.*\.glb/.test(request.url()))detailModels.push(request.url())})
  await page.goto('/')
  const search = page.getByRole('combobox', { name: 'Rechercher une structure', exact: true })
  await search.fill('coeur')
  await expect(page.getByRole('option').first()).toContainText('Cœur')
  await expect(page.getByRole('status').filter({ hasText: 'Recherche dans l’atlas complet' })).toHaveCount(0)
  await search.fill('cœur')
  await expect(page.getByRole('option').first()).toContainText('Cœur')
  for (const query of ['rein', 'nerf lacrymal', 'ventricule gauche', 'carotide', 'hippocampe', 'gauche ventricule']) {
    await search.fill(query)
    await expect(page.getByRole('option').first(), query).toBeVisible()
  }
  await search.fill('nerf médian')
  await expect(page.getByRole('option')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Voir le cours :/ }).first()).toBeVisible()
  await search.fill('nerf lacrymal')
  const first = page.getByRole('option').first()
  const name = await first.textContent()
  expect(name).toMatch(/lacrymal/i)
  expect(detailModels).toEqual([])
  await first.click()
  await expect(page.getByTestId('structure-detail')).toBeVisible()
  await expect(page).toHaveURL(/mode=detail/)
  await expect(page.getByTestId('structure-detail').getByRole('button', { name: 'Voir le cours', exact: true })).toBeVisible()
})

for (const width of [1440, 390]) {
  test(`cours : sommaire actif et lecture à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#tab=cours&cours=membrane')
    const toc = page.locator('.course-toc')
    if (width <= 700) {
      await expect(toc).not.toHaveAttribute('open', '')
      await toc.getByText('Sommaire', { exact: false }).first().click()
    }
    const links = page.getByRole('navigation', { name: 'Sommaire du cours' }).getByRole('link')
    await expect(links).toHaveCount(6)
    await links.nth(2).click()
    await expect(page.locator('.course-section').nth(2)).toBeInViewport()
    if (width <= 700) {
      await expect(toc).not.toHaveAttribute('open', '')
      await toc.locator('summary').click()
    }
    await expect(links.nth(2)).toHaveAttribute('aria-current', 'location')
    await expect(page.getByRole('progressbar', { name: 'Progression de lecture' })).not.toHaveAttribute('aria-valuenow', '0')
    await page.locator('.courses-workspace').evaluate(element => element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }))
    await expect(links.last()).toHaveAttribute('aria-current', 'location')
  })
}

test('cours lié : accès immédiat à la structure Atlas existante', async ({ page }) => {
  await page.goto('/#tab=cours&cours=FMA7088')
  await page.getByRole('button', { name: 'Explorer dans l’Atlas 3D', exact: true }).click()
  await expect(page.getByTestId('structure-detail')).toContainText('Cœur')
  await expect(page).toHaveURL(/structure=FMA7088/)
})

const password = 'Mon-long-mot-de-passe-2026'
const headers = { 'x-mycorpus-request': '1' }
async function register(page: import('@playwright/test').Page) {
  const response = await page.request.post('/api/account/register', { headers, data: { name: 'Parcours', email: `ux-${crypto.randomUUID()}@example.test`, password } })
  expect(response.status()).toBe(201)
}

test('flashcards : état vide utile puis révision au clavier avec notation persistée', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await register(page)
  try {
    await page.goto('/#tab=flashcards')
    await expect(page.getByText('Aucune carte à réviser aujourd’hui. Vous êtes à jour.')).toBeVisible()
    await page.getByRole('button', { name: 'Explorer mes decks', exact: true }).click()
    await expect(page.getByLabel('Nom du nouveau deck')).toBeVisible()
    const deck = (await (await page.request.post('/api/flashcards/decks', { headers, data: { name: 'Révision UX' } })).json()).deck
    await page.request.post('/api/flashcards/cards', { headers, data: { deckId: deck.id, front: 'Question de révision UX', back: 'Réponse de révision UX' } })
    await page.reload()
    await page.getByRole('button', { name: 'Réviser maintenant', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Question de révision UX' })).toBeVisible()
    await page.locator('.review-face h1').click()
    await page.keyboard.press('3')
    await expect(page.locator('.review-answer')).toHaveCount(0)
    await page.keyboard.press('Space')
    await expect(page.locator('.review-answer')).toContainText('Réponse de révision UX')
    await expect(page.locator('.review-ratings button').nth(2)).toBeEnabled()
    const rated = page.waitForResponse(response => response.url().endsWith('/review') && response.request().method() === 'POST')
    await page.keyboard.press('3')
    expect((await rated).status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Session terminée' })).toBeVisible()
    const cards = await (await page.request.get('/api/flashcards/cards')).json()
    expect(cards.cards[0].review.repetitions).toBe(1)
  } finally {
    expect((await page.request.post('/api/account/delete', { headers, data: { password } })).status()).toBe(200)
  }
})

function samplePdf() {
  const text='Chapitre 1 : Innervation. Le nerf phrenique innerve le diaphragme. Le nerf vague innerve le pharynx. Le nerf facial innerve les muscles de la mimique.'
  const stream=deflateSync(Buffer.from(`BT /F1 12 Tf 72 712 Td (${text}) Tj ET`))
  return Buffer.concat([Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n4 0 obj << /Length '+stream.length+' /Filter /FlateDecode >> stream\n'),stream,Buffer.from('\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF')])
}

test('Mes cours : import identifié, erreur de génération lisible et document conservé', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await register(page)
  let releaseUpload=()=>{}
  try {
    await page.goto('/#tab=mes-cours')
    await expect(page.getByRole('button',{name:'Choisir un PDF',exact:true})).toBeInViewport()
    await expect(page.getByRole('button',{name:'Ajouter mon premier cours'})).toBeVisible()
    await expect(page.getByRole('list',{name:'De votre cours à la révision'}).getByRole('listitem')).toHaveCount(6)
    const gate=new Promise<void>(resolve=>{releaseUpload=resolve})
    await page.route('**/api/study/documents/upload',async route=>{
      const response=await route.fetch()
      await gate
      await route.fulfill({response})
    })
    await page.locator('input[type="file"]').setInputFiles({name:'cours-ux.pdf',mimeType:'application/pdf',buffer:samplePdf()})
    await expect(page.locator('.mycourses-upload-status')).toContainText('cours-ux.pdf')
    await expect(page.getByRole('progressbar',{name:'Extraction du PDF'})).toBeVisible()
    await expect(page.getByRole('progressbar',{name:'Extraction du PDF'})).not.toHaveAttribute('value',/\d/)
    releaseUpload()
    await expect(page.getByRole('heading',{name:'cours-ux',exact:true})).toBeVisible({timeout:20000})
    await page.route('**/summarize',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Error 500: internal provider failure'})}))
    let alerts=0
    page.on('dialog',dialog=>{alerts++;void dialog.dismiss()})
    await page.getByRole('button',{name:'Générer la synthèse',exact:true}).click()
    await expect(page.getByRole('alert')).toContainText('Votre cours reste disponible')
    await expect(page.getByRole('alert')).not.toContainText('Error 500')
    await expect(page.getByRole('heading',{name:'cours-ux',exact:true})).toBeVisible()
    expect(alerts).toBe(0)
    await page.getByRole('button',{name:'Fermer le message'}).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.unroute('**/summarize')
    await page.getByRole('button',{name:'Générer la synthèse',exact:true}).click()
    await expect(page.locator('.mycourses-summary-card')).toBeVisible({timeout:25000})
    await expect(page.getByRole('status').filter({hasText:'Synthèse générée'})).toBeVisible()
  } finally {
    releaseUpload()
    expect((await page.request.post('/api/account/delete',{headers,data:{password}})).status()).toBe(200)
  }
})


test('atlas spécialisé : ouverture directe sans charger les modèles 3D masqués',async({page})=>{
 const models:string[]=[]
 page.on('request',request=>{if(request.url().endsWith('.glb'))models.push(request.url())})
 await page.goto('/#tab=atlas&sub=brain&view=lateral&structure=frontal_lobe')
 await expect(page.getByTestId('atlas-info-panel')).toBeVisible()
 await expect(page.getByTestId('atlas-info-panel').getByRole('button',{name:'Créer une flashcard',exact:true})).toBeVisible()
 expect(models).toEqual([])
 await page.setViewportSize({width:390,height:900})
 for(const button of await page.locator('.atlas-viewer-controls button').all()) {
  expect(await button.evaluate(element=>{
   const rect=element.getBoundingClientRect()
   return rect.left>=0&&rect.right<=innerWidth&&element.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2))
  })).toBe(true)
 }
})

for (const mode of ['training', 'exam']) {
  test(`QCM mobile : le mode et la première question restent visibles en ${mode}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 667 })
    await page.goto('/#tab=entrainement&cours=membrane')
    if (mode === 'exam') await page.getByRole('button', { name: /Examen blanc/ }).click()
    await page.getByRole('button', { name: 'Commencer la série', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Quitter la série' })).toBeInViewport()
    await expect(page.locator('.question-topline')).toContainText(mode === 'exam' ? 'Temps restant' : 'correction immédiate')
    await expect(page.getByRole('button', { name: 'Question 1', exact: true })).toBeInViewport()
    await page.getByRole('button', { name: 'Question 2', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Quitter la série' })).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Question 2', exact: true })).toHaveAttribute('aria-current', 'step')
  })
}

test('performance : espaces chargés à la demande et navigation visible pendant le chargement du cours', async ({ page }) => {
  const modules = new Set<string>()
  page.on('request', request => modules.add(new URL(request.url()).pathname))
  await page.goto('/')
  await expect(page.locator('main')).toHaveAttribute('data-loaded', 'true', { timeout: 60000 })
  for (const path of ['study/CoursesWorkspace', 'study/PracticeWorkspace', 'atlas/AtlasWorkspace']) {
    expect([...modules].some(url => url.includes('/src/' + path + '.tsx')), path).toBe(false)
  }
  let release = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/src/study/CoursesWorkspace.tsx*', async route => {
    await gate
    await route.continue()
  })
  try {
    const navigation = page.getByRole('navigation', { name: 'Navigation principale', exact: true })
    await navigation.getByRole('button', { name: 'Cours', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Chargement du cours' })).toBeVisible()
    await expect(navigation.getByRole('button', { name: 'Cours', exact: true })).toHaveAttribute('aria-current', 'page')
  } finally {
    release()
  }
  await expect(page.locator('.courses-workspace')).toBeVisible()
  await page.getByRole('navigation', { name: 'Navigation principale', exact: true }).getByRole('button', { name: 'Entraînement', exact: true }).click()
  await expect(page.locator('.practice-workspace')).toBeVisible()
  await page.goto('/#tab=atlas&sub=brain&view=lateral')
  await expect(page.getByTestId('atlas-workspace')).toBeVisible()
  for (const path of ['study/CoursesWorkspace', 'study/PracticeWorkspace', 'atlas/AtlasWorkspace']) {
    expect([...modules].some(url => url.includes('/src/' + path + '.tsx')), path).toBe(true)
  }
})
