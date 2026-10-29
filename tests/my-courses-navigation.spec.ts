import {test,expect} from '@playwright/test'
const disabled=process.env.CORPUS_TEST_HIDDEN_COURSES==='1'
test('navigation : retrait temporaire de Mes cours et accès aux autres espaces',async({page})=>{
 await page.goto('/#tab=flashcards')
 await expect(page.locator('.flash-hero')).toBeVisible({timeout:30000})
 for(const width of [320,375,768,1440]){
  await page.setViewportSize({width,height:900})
  const links=page.getByRole('button',{name:'Mes cours',exact:true})
  if(disabled)await expect(links).toHaveCount(0)
  else expect(await links.count()).toBeGreaterThan(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
 }
 await page.goto('/#tab=mes-cours&doc=old-document')
 if(disabled){await expect(page).toHaveURL(/#tab=flashcards$/);await expect(page.locator('.flash-hero')).toBeVisible();await expect(page.locator('.mycourses-workspace')).toHaveCount(0)}
 else await expect(page.locator('.mycourses-workspace')).toBeVisible()
 await page.goto('/#tab=cours');await expect(page.locator('.catalog-layout')).toBeVisible({timeout:30000})
})

test('flashcards : le PDF source reste accessible après le retrait de Mes cours',async({page})=>{
 const {readFileSync}=await import('node:fs'),headers={'x-mycorpus-request':'1'}
 expect((await page.request.post('/api/account/register',{headers,data:{name:'Source PDF',email:`source-${crypto.randomUUID()}@example.test`,password:'Source-pdf-test-2026-solide'}})).ok()).toBeTruthy()
 const uploaded=await page.request.post('/api/study/documents/upload',{headers:{...headers,'content-type':'application/pdf','x-document-filename':'source.pdf','x-document-title':'Source'},data:readFileSync('tests/fixtures/pdf-compression/reportlab-raw.pdf')})
 expect(uploaded.ok()).toBeTruthy();const id=(await uploaded.json()).document.id
 const deck=(await(await page.request.post('/api/flashcards/decks',{headers,data:{name:'PDF conservé'}})).json()).deck
 const card=await page.request.post('/api/flashcards/cards',{headers,data:{deckId:deck.id,front:'Que filtre le rein ?',back:'Le plasma sanguin.',source:{type:'study_document',documentId:id}}})
 expect(card.ok()).toBeTruthy()
 await page.goto('/#tab=flashcards');await page.getByRole('button',{name:'Toutes mes cartes'}).click();await page.getByRole('button',{name:'Voir dans le PDF',exact:true}).click()
 if(disabled){const viewer=page.getByRole('dialog',{name:'Consultation du cours'});await expect(viewer.locator('canvas')).toBeVisible({timeout:15000});await viewer.getByRole('button',{name:'Fermer',exact:true}).click();await expect(page.locator('.flash-hero')).toBeVisible();await expect(page.locator('.mycourses-workspace')).toHaveCount(0)}
 else await expect(page.locator('.mycourses-workspace')).toBeVisible()
})
