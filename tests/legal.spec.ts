import {test,expect} from '@playwright/test'
import {TERMS_VERSION} from '../shared/legal.mjs'
const pages=[['mentions-legales','Mentions légales'],['confidentialite','Politique de confidentialité'],['cgu','Conditions générales d’utilisation'],['cookies','Cookies et stockage local'],['propriete-intellectuelle','Propriété intellectuelle']]
for(const width of [320,375,768,1440])test(`documents juridiques publics et lisibles à ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900})
 for(const [slug,title] of pages){
  const response=await page.goto(`/${slug}.html`)
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Sommaire'})).toBeVisible()
  await expect(page.locator('time')).toHaveAttribute('datetime','2026-10-21')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  for(const link of await page.getByRole('navigation',{name:'Sommaire'}).getByRole('link').all()){
   const href=await link.getAttribute('href');expect(await page.locator(href!).count()).toBe(1)
  }
 }
 await page.screenshot({path:`/tmp/corpus-legal-${width}.png`,fullPage:true})
})
test('footer public : liens existants et aucune CGV de vente fictive',async({page})=>{
 await page.goto('/')
 const footer=page.getByRole('contentinfo',{name:'Informations juridiques'})
 await footer.scrollIntoViewIfNeeded()
 await expect(footer).toBeVisible()
 await expect(footer.getByRole('link')).toHaveCount(5)
 for(const link of await footer.getByRole('link').all()){
  const response=await page.request.get((await link.getAttribute('href'))!)
  expect(response.status()).toBe(200);expect(await response.text()).toContain('INFORMATIONS JURIDIQUES')
 }
 await expect(footer.getByText('CGV',{exact:true})).toHaveCount(0)
})
test('préférences : aucune acceptation fictive, effacement invité ciblé et annulable',async({page})=>{
 await page.goto('/cookies.html')
 await page.evaluate(()=>{localStorage.setItem('corpus-note-test','privé');localStorage.setItem('unrelated','gardé');sessionStorage.setItem('mycorpus-outbox-test','préservé')})
 await page.getByRole('button',{name:'Vérifier mes préférences'}).click()
 await expect(page.getByRole('status')).toContainText('Aucun consentement facultatif')
 page.once('dialog',dialog=>dialog.dismiss())
 await page.getByRole('button',{name:'Effacer mes données invitées de cet appareil'}).click()
 expect(await page.evaluate(()=>localStorage.getItem('corpus-note-test'))).toBe('privé')
 page.once('dialog',dialog=>dialog.accept())
 await page.getByRole('button',{name:'Effacer mes données invitées de cet appareil'}).click()
 expect(await page.evaluate(()=>localStorage.getItem('corpus-note-test'))).toBe(null)
 expect(await page.evaluate(()=>localStorage.getItem('unrelated'))).toBe('gardé')
 expect(await page.evaluate(()=>sessionStorage.getItem('mycorpus-outbox-test'))).toBe('préservé')
})
test('inscription : case non cochée, blocage natif et serveur, preuve versionnée exportable',async({page})=>{
 await page.setViewportSize({width:375,height:900})
 await page.goto('/')
 await page.getByRole('button',{name:'Mon compte',exact:true}).click()
 await page.getByRole('button',{name:'Créer un compte',exact:true}).click()
 await page.getByLabel('Prénom ou pseudonyme').fill('Juridique')
 const email=`legal-${crypto.randomUUID()}@example.test`,password='Legal-test-solide-2026'
 await page.getByLabel('Adresse e-mail').fill(email)
 await page.getByLabel('Mot de passe',{exact:true}).fill(password)
 const checkbox=page.getByRole('checkbox',{name:/J’accepte les/})
 await expect(checkbox).not.toBeChecked()
 await page.getByRole('button',{name:'Créer mon compte',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Bonjour, Juridique.'})).toHaveCount(0)
 const blocked=await page.request.post('/api/account/register',{headers:{'x-mycorpus-request':'1'},data:{name:'Juridique',email,password}})
 expect(blocked.status()).toBe(400)
 await checkbox.check()
 await page.getByRole('button',{name:'Créer mon compte',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Bonjour, Juridique.'})).toBeVisible()
 const exported=await (await page.request.get('/api/account/export')).json()
 expect(exported.data.account_terms_acceptances).toHaveLength(1)
 expect(exported.data.account_terms_acceptances[0].version).toBe(TERMS_VERSION)
 await page.request.post('/api/account/delete',{headers:{'x-mycorpus-request':'1'},data:{password}})
})
