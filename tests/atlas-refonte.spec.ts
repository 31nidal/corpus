import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
const frenchNames:Record<string,string>=JSON.parse(readFileSync(new URL('../src/data/french-labels.json',import.meta.url),'utf8'))
const state = (page: import('@playwright/test').Page) => page.evaluate(()=>(window as any).__CORPUS_TEST__?.state())
async function open(page:import('@playwright/test').Page, id='FMA7088') {
  await page.goto('/#mode=detail&structure='+id)
  await expect(page.getByTestId('structure-detail')).toBeVisible()
  await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
}

test('composants réels, navigation parent/enfant et recherche par numéro',async({page})=>{
  await open(page)
  const nav=page.getByRole('region',{name:'Navigation anatomique'})
  await expect(nav.getByText('Composants de l’ensemble 3D (40)',{exact:true})).toBeVisible()
  await nav.getByRole('button',{name:'Paroi de l’atrium droit 3D',exact:true}).click()
  await expect(page.locator('main')).toHaveAttribute('data-selected','FMA9457')
  await nav.getByRole('button',{name:'Coeur 3D',exact:true}).click()
  await expect(page.locator('main')).toHaveAttribute('data-selected','FMA7088')
  await page.goto('/#mode=detail&structure=FMA13478')
  await expect(nav.getByRole('button',{name:/C3 ·/})).toBeVisible()
  await nav.getByRole('button',{name:/C3 ·/}).click()
  await expect(page.locator('main')).toHaveAttribute('data-selected','FMA12521')
  await page.getByRole('combobox',{name:'Rechercher une structure'}).fill('C7')
  await expect(page.getByRole('option').filter({hasText:'Vertèbre cervicale n° 7'})).toBeVisible()
})

test('opacité individuelle, isolation, masquage et restauration réelle',async({page})=>{
  await open(page)
  const slider=page.getByRole('slider',{name:'Opacité de la structure',exact:true})
  await slider.fill('35')
  await expect.poll(async()=> (await state(page)).structureOpacities.FMA7088).toBe(.35)
  await expect.poll(async()=> (await state(page)).selectedMeshOpacities.every((value:number)=>value===.35)).toBe(true)
  const before=(await state(page)).visibleMeshes
  await page.getByRole('button',{name:'Isoler',exact:true}).click()
  await expect.poll(async()=> (await state(page)).visibleMeshes).toBeLessThan(before)
  await page.getByRole('button',{name:'Restaurer la scène précédente',exact:true}).click()
  await expect.poll(async()=> (await state(page)).visibleMeshes).toBe(before)
  await expect(slider).toHaveValue('35')
  await page.getByRole('button',{name:'Masquer',exact:true}).click()
  await expect(page.getByTestId('structure-detail')).toHaveCount(0)
  await page.getByRole('button',{name:'Restaurer la scène précédente',exact:true}).click()
  await expect(page.getByTestId('structure-detail')).toBeVisible()
  await expect(slider).toHaveValue('35')
})

test('estomac sans subdivisions fictives et erreurs des relations explicites',async({page})=>{
  await page.route('**/models/anatomical-relations.json',route=>route.fulfill({status:503,body:'unavailable'}))
  await open(page,'FMA7148')
  const nav=page.getByRole('region',{name:'Navigation anatomique'})
  await expect(nav.getByText('Aucune subdivision distincte',{exact:false})).toBeVisible()
  await expect(nav.getByRole('alert')).toContainText('indisponibles')
  await expect(nav.getByRole('button',{name:'Réessayer les relations'})).toBeVisible()
  await expect(nav.getByRole('button',{name:/pylor|fundus/i})).toHaveCount(0)
})

test('examen 3D : erreurs, historique persistant et reprise ciblée',async({page})=>{
  await open(page)
  await page.getByRole('button',{name:'Réviser ces structures en 3D'}).click()
  await page.getByLabel('Type d’exercice anatomique').selectOption('exam')
  await page.getByRole('button',{name:'Commencer la révision'}).click()
  const panel=page.getByRole('complementary',{name:'Révision anatomique 3D'})
  for(let i=0;i<10;i++) {
    await panel.getByLabel('Réponse anatomique').fill('réponse incorrecte')
    await panel.getByRole('button',{name:'Valider la réponse'}).click()
    await panel.getByRole('button',{name:i===9?'Voir le résultat':'Question suivante'}).click()
  }
  await expect(panel.getByRole('heading',{name:'Résultat : 0 / 10'})).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('corpus-anatomy-progress-v1')??'{}').attempts?.length)).toBe(1)
  await panel.getByRole('button',{name:'Recommencer les structures ratées'}).click()
  await expect(panel.getByText('Question 1 / 10',{exact:true})).toBeVisible()
  await page.reload()
  await page.getByRole('button',{name:'Réviser ces structures en 3D'}).click()
  await page.getByText('Historique récent',{exact:true}).click()
  await expect(page.getByRole('complementary',{name:'Révision anatomique 3D'})).toContainText('0/10')
})

test('mobile : composants accessibles et référence féminine indépendante',async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await open(page,'FMA13478')
  await expect(page.getByRole('button',{name:/C1 · Atlas/})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390)
  await page.goto('/#body=female&mode=detail&structure=HRA-region-reproductive')
  await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
  await expect(page.getByTestId('structure-detail')).toBeVisible()
  await expect(page.getByRole('region',{name:'Navigation anatomique'})).toContainText('Composants de l’ensemble 3D')
  await expect(page.getByRole('region',{name:'Navigation anatomique'}).getByRole('button',{name:'Coeur 3D',exact:true})).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({path:'/tmp/atlas-refonte-mobile.png'})
})

for (const mode of ['mcq','label','free']) test(`identification ${mode} : cible réelle et correction immédiate`,async({page})=>{
  await open(page)
  await page.getByRole('button',{name:'Réviser ces structures en 3D'}).click()
  await page.getByLabel('Type d’exercice anatomique').selectOption(mode)
  await page.getByRole('button',{name:'Commencer la révision'}).click()
  const panel=page.getByRole('complementary',{name:'Révision anatomique 3D'})
  await expect.poll(async()=> (await state(page)).selectedId).not.toBe('FMA7088')
  const id=(await state(page)).selectedId
  if(mode==='free') {
    await panel.getByLabel('Réponse anatomique').fill(id)
    await panel.getByRole('button',{name:'Valider la réponse'}).click()
  } else {
    const manifest=await page.request.get('/models/manifest.json').then(r=>r.json())
    const sourceName=manifest.structures.find((s:{id:string})=>s.id===id).name
    const name=frenchNames[sourceName]??sourceName
    await panel.getByRole('button',{name,exact:true}).click()
  }
  await expect(page.locator('.assistant-dock')).toHaveCount(0)
  await expect(panel.getByRole('status')).toContainText('Réponse correcte.')
  await panel.getByRole('button',{name:'Question suivante'}).click()
  await expect(panel.getByText('Question 2 / 10',{exact:true})).toBeVisible()
  await panel.getByRole('button',{name:'Fermer la révision 3D'}).click()
  await expect(page.locator('main')).toHaveAttribute('data-selected','FMA7088')
})

test('arbre global : recherche, sélection et synchronisation de la fiche',async({page})=>{
  await open(page,'FMA13478')
  await page.getByRole('button',{name:'Arbre',exact:true}).click()
  const tree=page.getByRole('navigation',{name:'Arbre des structures 3D'})
  await tree.getByLabel('Rechercher dans l’arbre').fill('T12')
  await tree.getByRole('button',{name:/T12 ·/}).click()
  await expect(page.locator('main')).toHaveAttribute('data-selected','FMA10081')
  await expect(tree.getByRole('button',{name:/T12 ·/})).toHaveAttribute('aria-current','true')
  await page.screenshot({path:'/tmp/atlas-refonte-desktop.png'})
})

test('clic d’identification : un vrai raycast et un clic sur le maillage donnent le score',async({page})=>{
  await open(page,'FMA7163')
  await page.getByRole('button',{name:'Réviser ces structures en 3D'}).click()
  await page.getByLabel('Type d’exercice anatomique').selectOption('click')
  await page.getByRole('button',{name:'Commencer la révision'}).click()
  const panel=page.getByRole('complementary',{name:'Révision anatomique 3D'})
  await expect.poll(async()=> (await state(page)).selectedId).toBe(null)
  const point=await page.evaluate(()=>{
    const api=(window as any).__CORPUS_TEST__,center=api.project('FMA7163')
    if(!center)return null
    for(const dx of [0,-20,20,-40,40])for(const dy of [0,-20,20,-40,40]){
      const x=center.x+dx,y=center.y+dy
      if(api.pick(x,y)==='FMA7163')return {x,y}
    }
    return null
  })
  expect(point).not.toBe(null)
  await page.mouse.click(point!.x,point!.y)
  await expect(panel.getByRole('status')).toContainText('Réponse correcte.')
  await panel.getByRole('button',{name:'Voir le résultat'}).click()
  await expect(panel.getByRole('heading',{name:'Résultat : 1 / 1'})).toBeVisible()
})

test('examen chronométré : échéance, score et progression des questions sans réponse',async({page})=>{
  await open(page)
  await page.clock.install()
  await page.getByRole('button',{name:'Réviser ces structures en 3D'}).click()
  await page.getByLabel('Type d’exercice anatomique').selectOption('exam')
  await page.getByRole('checkbox',{name:'Chronomètre · 30 secondes par question'}).check()
  await page.getByRole('button',{name:'Commencer la révision'}).click()
  const panel=page.getByRole('complementary',{name:'Révision anatomique 3D'})
  await expect(panel.getByRole('timer')).toContainText('300 s')
  await page.clock.fastForward(301000)
  await expect(panel.getByRole('heading',{name:'Résultat : 0 / 10'})).toBeVisible()
  await expect(panel).toContainText('Temps écoulé')
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('corpus-anatomy-progress-v1')??'{}').attempts?.[0]?.answers.length)).toBe(10)
})
