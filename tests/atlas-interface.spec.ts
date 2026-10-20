import {test,expect} from '@playwright/test'

for(const width of [320,375,768,1440]){
 test(`fiche anatomique ${width}px : actions lisibles, contenues et fonctionnelles`,async({page})=>{
  await page.setViewportSize({width,height:width<701?900:1000})
  await page.goto('/#mode=detail&structure=FMA49055')
  const panel=page.getByTestId('structure-detail')
  await expect(panel).toBeVisible()
  await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
  await page.evaluate(()=>document.fonts.ready)
  const actions=panel.locator('.learning-actions')
  await actions.scrollIntoViewIfNeeded()
  await expect(panel.getByRole('button',{name:'Créer une flashcard 3D'})).toHaveCount(0)
  const buttons=actions.locator('button')
  expect(await buttons.count()).toBeGreaterThanOrEqual(3)
  const geometry=await actions.evaluate(element=>({bounds:element.getBoundingClientRect().toJSON(),buttons:[...element.querySelectorAll('button')].map(button=>({rect:button.getBoundingClientRect().toJSON(),contained:button.scrollWidth<=button.clientWidth+1}))}))
  let previousBottom=-Infinity
  for(const {rect,contained} of geometry.buttons){
   expect(rect.x).toBeGreaterThanOrEqual(geometry.bounds.x-1)
   expect(rect.x+rect.width).toBeLessThanOrEqual(geometry.bounds.x+geometry.bounds.width+1)
   expect(rect.y).toBeGreaterThanOrEqual(previousBottom+5)
   expect(rect.height).toBeGreaterThanOrEqual(44)
   expect(contained).toBe(true)
   previousBottom=rect.y+rect.height
  }
  expect(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  await page.screenshot({path:`/tmp/mycorpus-structure-${width}.png`})
  await panel.getByRole('button',{name:'Réviser ces structures en 3D',exact:true}).click()
  await expect(page.getByLabel('Type d’exercice anatomique')).toBeVisible()
 })
 test(`icônes anatomiques ${width}px : quatre vrais SVG distincts et accès sélectionnables`,async({page})=>{
  await page.setViewportSize({width,height:width<701?900:1000})
  await page.goto('/')
  const regions=page.getByRole('complementary',{name:'Choisir une région anatomique'})
  await expect(regions.locator('svg[data-anatomy-icon]')).toHaveCount(4)
  const colors=await regions.locator('.region-block-icon').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).color))
  expect(new Set(colors).size).toBe(1)
  expect(await regions.locator('svg[data-anatomy-icon]').evaluateAll(elements=>elements.map(element=>element.getAttribute('data-anatomy-icon')))).toEqual(['heart','brain','skull','spine'])
  for(const icon of await regions.locator('svg[data-anatomy-icon]').all()){
   await expect(icon).toHaveAttribute('viewBox','0 0 48 48')
   await expect(icon).toHaveAttribute('aria-hidden','true')
   expect((await icon.locator('path').count())).toBeGreaterThan(0)
  }
  await page.screenshot({path:`/tmp/mycorpus-anatomical-icons-${width}.png`})
  await regions.getByRole('button',{name:'Explorer Colonne en 3D',exact:true}).click()
  await expect(page.locator('main')).toHaveAttribute('data-selected','FMA13478',{timeout:90000})
 })
}
test('API : le format supprimé est refusé, la carte manuelle classique reste disponible',async({page})=>{
 await page.goto('/#tab=flashcards')
 await page.getByRole('button',{name:'Mon compte',exact:true}).click()
 await page.getByRole('button',{name:'Créer un compte',exact:true}).click()
 await page.getByLabel('Prénom ou pseudonyme').fill('Atlas interface')
 await page.getByLabel('Adresse e-mail').fill(`atlas-ui-${crypto.randomUUID()}@example.test`)
 await page.getByLabel('Mot de passe',{exact:true}).fill('Atlas-ui-test-solide-2026')
 await page.getByRole('checkbox',{name:/J’accepte les/}).check();await page.getByRole('button',{name:'Créer mon compte',exact:true}).click()
 await page.getByRole('button',{name:'J’ai conservé mon code'}).click()
 await page.getByRole('button',{name:'Fermer le profil'}).click()
 const headers={'x-mycorpus-request':'1'}
 const deck=(await(await page.request.post('/api/flashcards/decks',{headers,data:{name:'Mes cartes'}})).json()).deck
 const removed=await page.request.post('/api/flashcards/notes',{headers,data:{defaultDeckId:deck.id,noteType:'atlas_3d',title:'Supprimée',fields:{}}})
 expect(removed.ok()).toBe(false)
 const classic=await page.request.post('/api/flashcards/notes',{headers,data:{defaultDeckId:deck.id,noteType:'basic',title:'Une notion',fields:{front:'Question',back:'Réponse'}}})
 expect(classic.ok()).toBe(true)
 await page.goto('/#tab=flashcards&flashView=create')
 const guide=page.getByRole('region',{name:'Choisir un type de flashcard'})
 await expect(guide.getByRole('article')).toHaveCount(6)
 await expect(guide.getByText('Repérage en 3D',{exact:true})).toHaveCount(0)
})
