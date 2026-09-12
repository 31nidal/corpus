import {test,expect} from '@playwright/test'
const password='Mon-long-mot-de-passe-2026'
const email=()=>`browser-${crypto.randomUUID()}@example.test`
async function openAccount(page:any){if(!await page.getByRole('complementary',{name:'Mon compte',exact:true}).isVisible())await page.getByRole('button',{name:'Mon compte',exact:true}).click()}
async function register(page:any,address:string){await openAccount(page);await page.getByRole('button',{name:'Créer un compte',exact:true}).click();await page.getByLabel('Prénom ou pseudonyme').fill('Camille');await page.getByLabel('Adresse e-mail').fill(address);await page.getByLabel('Mot de passe',{exact:true}).fill(password);await page.getByRole('button',{name:'Créer mon compte',exact:true}).click();await expect(page.getByRole('heading',{name:'Bonjour, Camille.'})).toBeVisible();await expect(page.locator('.recovery-code code')).toHaveText(/[a-f0-9]{40}/);await page.getByRole('button',{name:'J’ai conservé mon code'}).click()}
async function login(page:any,address:string){await openAccount(page);await page.getByLabel('Adresse e-mail').fill(address);await page.getByLabel('Mot de passe',{exact:true}).fill(password);await page.getByRole('button',{name:'Me connecter',exact:true}).click();await expect(page.getByRole('heading',{name:'Bonjour, Camille.'})).toBeVisible()}
async function remove(page:any){await openAccount(page);await page.getByRole('button',{name:'Supprimer mon compte',exact:true}).click();await page.getByLabel('Mot de passe actuel').fill(password);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Supprimer définitivement',exact:true}).click();await expect(page.getByRole('button',{name:'Me connecter',exact:true})).toBeVisible()}
test('comptes : inscription, notes et cours synchronisés, export, isolation et mobile',async({page,browser})=>{
 page.setDefaultTimeout(15000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const first=email(),second=email()
 await page.goto('/#tab=cours&cours=FMA7088');await register(page,first)
 await page.getByRole('button',{name:'Fermer le profil'}).click()
 await page.getByLabel('Mes notes de cours').fill('Le ventricule gauche alimente la circulation systémique.')
 await page.getByRole('button',{name:'Marquer ce cours terminé',exact:true}).click()
 await page.getByRole('button',{name:'Garder pour plus tard',exact:true}).click()
 await expect(page.locator('.course-notebook small')).toHaveText('Tout est enregistré')
 await page.reload();await expect(page.getByLabel('Mes notes de cours')).toHaveValue('Le ventricule gauche alimente la circulation systémique.')
 await expect(page.getByRole('button',{name:'Cours terminé',exact:true})).toBeDisabled()
 const device=await browser.newContext({viewport:{width:393,height:852}}),mobile=await device.newPage()
 await mobile.goto('/#tab=cours&cours=FMA7088');
 // On mobile the profile shortcut is part of the atlas intro; navigation account must remain accessible from courses.
 await login(mobile,first)
 await expect(mobile.locator('.account-history')).toContainText('Notes')
 expect(await mobile.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await mobile.screenshot({path:'tests/artifacts/account-mobile.png'})
 await mobile.getByRole('button',{name:'Fermer le profil'}).click();await expect(mobile.getByLabel('Mes notes de cours')).toHaveValue('Le ventricule gauche alimente la circulation systémique.')
 await device.close()
 await openAccount(page);const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données'}).click();expect((await downloadPromise).suggestedFilename()).toBe('mycorpus-mon-historique.json')
 await page.getByRole('button',{name:'Me déconnecter',exact:true}).click();await register(page,second)
 await page.getByRole('button',{name:'Fermer le profil'}).click();await expect(page.getByLabel('Mes notes de cours')).toHaveValue('')
 await expect(page.getByRole('button',{name:'Marquer ce cours terminé',exact:true})).toBeEnabled()
 await remove(page);await login(page,first);await page.screenshot({path:'tests/artifacts/account-desktop.png'});await remove(page)
 expect(errors).toEqual([])
})

test('Google : bouton français et politique de confidentialité accessibles',async({page})=>{
 await page.route('**/api/account/session',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({available:true,user:null,state:{},google:{available:true,linked:false}})}))
 await page.goto('/')
 await page.getByRole('button',{name:'Mon compte',exact:true}).click()
 const google=page.getByRole('link',{name:'Continuer avec Google',exact:true})
 await expect(google).toBeVisible()
 await expect(google).toHaveAttribute('href','/api/account/google/start')
 await page.setViewportSize({width:393,height:852})
 await expect(google).toBeVisible()
 await page.goto('/confidentialite.html')
 await expect(page.getByRole('heading',{name:'Politique de confidentialité.'})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Connexion avec Google'})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
})
