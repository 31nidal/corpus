import {test,expect} from '@playwright/test'
import {TERMS_VERSION} from '../shared/legal.mjs'
test('Cloze : source et ancien HTML malveillants restent du texte en révision',async({page})=>{
 await page.goto('/')
 const headers={'x-mycorpus-request':'1'},password='Local-security-test-solide-2026'
 const registered=await page.request.post('/api/account/register',{headers,data:{name:'Sécurité locale',email:`local-security-${crypto.randomUUID()}@example.test`,password,acceptTerms:true,termsVersion:TERMS_VERSION}})
 expect(registered.status()).toBe(201)
 try{
  const deck=(await(await page.request.post('/api/flashcards/decks',{headers,data:{name:'Cloze sécurité'}})).json()).deck
  const note=await page.request.post('/api/flashcards/notes',{headers,data:{defaultDeckId:deck.id,noteType:'cloze',fields:{text:'Le texte {{c1::<img src=x onerror="window.__clozeXss=1">}} reste du texte.'}}})
  expect(note.status()).toBe(201)
  const created=await note.json();expect(JSON.stringify(created)).toContain('&lt;img')
  // Simulate an existing row saved before server-side escaping was introduced.
  await page.route(/\/api\/flashcards\/review(?:\?|$)/,async route=>{
   const response=await route.fetch(),data=await response.json()
   if(data.cards?.[0])data.cards[0].back='<span class="cloze-revealed" data-cloze="c1"><img src=x onerror="window.__clozeXss=1"></span><script>window.__clozeXss=2</script>'
   await route.fulfill({response,json:data})
  })
  await page.goto('/#tab=flashcards')
  await page.reload()
  await page.getByRole('button',{name:'Réviser maintenant',exact:true}).click()
  await page.getByRole('button',{name:'Afficher la réponse',exact:true}).click()
  await expect(page.locator('.cloze-revealed')).toContainText('<img')
  await expect(page.locator('.review-answer img,.review-answer script')).toHaveCount(0)
  expect(await page.evaluate(()=>(window as any).__clozeXss)).toBeUndefined()
 }finally{await page.request.post('/api/account/delete',{headers,data:{password}})}
})
