import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import crypto from 'node:crypto'
const manifest=JSON.parse(fs.readFileSync('public/models/manifest.json','utf8'))
const initialCount=manifest.groups.filter((g:any)=>['organs','skin','skeleton'].includes(g.id)).reduce((n:number,g:any)=>n+g.structures,0)
const total=manifest.groups.reduce((n:number,g:any)=>n+g.structures,0)
async function state(page:any){return page.evaluate(()=>(window as any).__CORPUS_TEST__.state())}
async function loaded(page:any){await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})}
async function ready(page:any){await page.goto('/');await loaded(page);await expect(page.getByRole('alert')).toHaveCount(0)}

test('intégrité des 1663 structures et des assemblages, sans duplication de géométrie',()=>{
  const names=new Set<string>()
  for(const group of manifest.groups){
    const file=fs.readFileSync(`public/${group.url}`)
    expect(file.subarray(0,4).toString()).toBe('glTF')
    expect(file.length).toBe(group.bytes)
    expect(crypto.createHash('sha256').update(file).digest('hex')).toBe(group.sha256)
    const gltf=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString())
    for(const node of gltf.nodes.filter((n:any)=>n.mesh!==undefined)){expect(names.has(node.name)).toBe(false);names.add(node.name)}
  }
  expect(names.size).toBe(1663)
  for(const s of manifest.structures){for(const mesh of s.meshNames)expect(names.has(mesh)).toBe(true);expect(s.name.length).toBeGreaterThan(0)}
  expect(manifest.groups).toHaveLength(8)
  expect(manifest.source.excludedUnidentifiedFiles.length).toBeGreaterThan(0)
})

test('fond blanc, chargement initial et couches lourdes chargées à la demande',async({page})=>{
  const requested:string[]=[];page.on('request',r=>{if(r.url().endsWith('.glb'))requested.push(r.url())})
  await ready(page)
  expect(await page.locator('.experience').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
  expect((await state(page)).visibleMeshes).toBe(initialCount)
  expect(requested.some(url=>url.includes('muscles'))).toBe(false)
  await page.getByRole('switch',{name:'Muscles',exact:true}).click();await loaded(page)
  expect(requested.some(url=>url.includes('detail-muscles.glb'))).toBe(true)
  expect((await state(page)).visibleMeshes).toBe(initialCount+manifest.groups.find((g:any)=>g.id==='muscles').structures)
  await page.screenshot({path:'tests/artifacts/white-muscles.png'})
})

test('survol et clic du maillage réel, zoom et réinitialisation',async({page})=>{
  await ready(page)
  const point=await page.evaluate(()=>(window as any).__CORPUS_TEST__.project('FMA24474'))
  await page.mouse.move(point.x,point.y);await expect(page.getByRole('tooltip')).toContainText('Fémur')
  const before=await state(page)
  await page.mouse.click(point.x,point.y)
  await expect(page.locator('.detail-content h2')).toContainText('Fémur')
  await page.waitForTimeout(1300);expect((await state(page)).camera).not.toEqual(before.camera)
  await page.getByRole('button',{name:'Réinitialiser la vue'}).click();await page.waitForTimeout(1200)
  expect((await state(page)).target.map((n:number)=>Math.round(n*100))).toEqual([0,0,0])
})

test('recherche française, isolation, masquage et restauration d’un muscle détaillé',async({page})=>{
  await ready(page)
  const search=page.getByRole('combobox');await search.fill('deltoide')
  await expect(page.getByRole('option').first()).toBeVisible()
  await search.press('Enter');await loaded(page)
  await expect(page.locator('.detail-content h2')).toContainText('deltoïde')
  await page.getByRole('button',{name:'Isoler',exact:true}).click()
  expect((await state(page)).visibleMeshes).toBe(1)
  await page.waitForTimeout(1300);await page.screenshot({path:'tests/artifacts/white-isolated.png'})
  await page.getByRole('button',{name:'Masquer',exact:true}).click()
  await expect(page.getByTestId('structure-detail')).toHaveCount(0)
  await expect(page.getByRole('button',{name:/Rétablir 1 structure/})).toBeVisible()
  await page.getByRole('button',{name:/Rétablir 1 structure/}).click()
  expect((await state(page)).visibleMeshes).toBe(initialCount+manifest.groups.find((g:any)=>g.id==='muscles').structures)
  await search.fill('zzzzzzzz');await expect(page.locator('.empty-search')).toBeVisible()
})

test('tous les systèmes, sélection d’ensemble puis état vide',async({page})=>{
  await ready(page)
  await page.getByRole('button',{name:'Tout afficher',exact:true}).click();await loaded(page)
  expect((await state(page)).ready).toHaveLength(8)
  expect((await state(page)).visibleMeshes).toBe(total)
  await page.getByRole('combobox').fill('coeur');await page.getByRole('option').first().click();await loaded(page)
  await expect(page.locator('.detail-content h2')).toHaveText('Cœur')
  await page.getByRole('button',{name:'Isoler',exact:true}).click()
  expect((await state(page)).visibleMeshes).toBe(manifest.structures.find((s:any)=>s.id==='FMA7088').meshNames.length)
  await page.getByRole('button',{name:'Fermer la fiche'}).click()
  await page.getByRole('button',{name:'Tout masquer',exact:true}).click()
  expect((await state(page)).visibleMeshes).toBe(0)
  await expect(page.locator('.empty-model')).toBeVisible()
})

test('index navigable et retour à la vue d’ensemble 48 structures',async({page})=>{
  await ready(page)
  await page.getByRole('button',{name:'Parcourir l’atlas'}).click()
  await page.getByLabel('Filtrer l’index par système').selectOption('nerves')
  await expect(page.locator('.catalog-filter small')).toContainText('34 entrées')
  await page.locator('.catalog-list>button').first().click();await loaded(page)
  await expect(page.getByTestId('structure-detail')).toBeVisible()
  await page.getByRole('button',{name:'Fermer la fiche'}).click()
  await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await loaded(page)
  await expect.poll(async () => (await state(page)).meshes, {timeout:90000}).toBe(48)
  await loaded(page)
  await expect(page.getByRole('switch',{name:'Muscles',exact:true})).toHaveCount(0)
  await page.waitForTimeout(400);await page.screenshot({path:'tests/artifacts/white-overview.png'})
})

test('mobile : couches, pincement à deux doigts et fiche isolée',async({browser})=>{
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2})
  const page=await context.newPage();await ready(page)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:'tests/artifacts/white-mobile.png'})
  const before=await state(page),cdp=await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:400,id:1},{x:230,y:400,id:2}]})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130,y:400,id:1},{x:260,y:400,id:2}]})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300)
  expect((await state(page)).camera[2]).toBeLessThan(before.camera[2])
  await page.getByRole('button',{name:/Couches anatomiques/}).tap()
  await page.getByRole('switch',{name:'Artères',exact:true}).tap();await loaded(page)
  await page.getByRole('button',{name:/Couches anatomiques/}).tap()
  await page.getByRole('combobox').fill('femur');await page.getByRole('option').first().tap()
  await page.getByRole('button',{name:'Isoler',exact:true}).tap()
  expect((await state(page)).visibleMeshes).toBe(1)
  await page.waitForTimeout(1400);await page.screenshot({path:'tests/artifacts/white-mobile-detail.png'})
  await context.close()
})

test('orientation, boutons de zoom et aide',async({page})=>{
  await ready(page)
  const before=await state(page)
  await page.getByRole('button',{name:'Zoom avant',exact:true}).click();await page.waitForTimeout(600)
  expect((await state(page)).camera).not.toEqual(before.camera)
  await page.getByRole('button',{name:'Face',exact:true}).click();await page.waitForTimeout(900)
  expect((await state(page)).camera[2]).toBeLessThan(0)
  await page.getByRole('button',{name:'Sources & crédits'}).click()
  await expect(page.getByRole('dialog')).toContainText('CC BY-SA 4.0')
  await expect(page.getByRole('dialog')).toContainText('CC BY-SA 2.1 Japon')
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('erreur de chargement d’une couche explicite',async({page})=>{
  await page.route('**/detail-muscles.glb',route=>route.abort('failed'))
  await ready(page);await page.getByRole('switch',{name:'Muscles',exact:true}).click();await loaded(page)
  await expect(page.getByRole('alert')).toContainText('Muscles')
  expect((await state(page)).ready).toContain('skeleton')
})

test('libellés français présents pour tous les modèles distribués',()=>{
  const labels=JSON.parse(fs.readFileSync('src/data/french-labels.json','utf8'))
  const overview=JSON.parse(fs.readFileSync('public/models/overview.json','utf8'))
  for(const s of [...manifest.structures,...overview.structures]){
    expect(labels[s.name],s.name).toBeTruthy()
    expect(labels[s.name]).not.toMatch(/\b(right|left|artery|vein|branch|tooth|upper|lower|of|with)\b/i)
  }
})

test('vues rapides et présentation française sur petit écran',async({page})=>{
  await ready(page)
  await page.getByRole('button',{name:'Vue muscles',exact:true}).click();await loaded(page)
  expect((await state(page)).visibleMeshes).toBe(399)
  await page.getByRole('button',{name:'Vue squelette',exact:true}).click();await loaded(page)
  expect((await state(page)).visibleMeshes).toBe(232)
  await page.getByRole('button',{name:'Vue organes',exact:true}).click();await loaded(page)
  await page.screenshot({path:'tests/artifacts/modern-desktop.png'})
  await page.setViewportSize({width:375,height:667})
  await page.screenshot({path:'tests/artifacts/modern-small.png'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.getByRole('combobox').fill('veine porte')
  await page.getByRole('option').first().click();await loaded(page)
  await expect(page.locator('.original-name')).not.toContainText('portal')
  await expect(page.locator('.detail-content h2')).toContainText('Veine porte')
  await page.waitForTimeout(1400)
  await page.screenshot({path:'tests/artifacts/modern-small-detail.png'})
})
