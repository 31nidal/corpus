import {test,expect} from '@playwright/test'
import fs from 'node:fs'
import crypto from 'node:crypto'

test('atlas principal et explorations féminines régionales avec cours et quiz',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/')
 await expect(page.locator('header').getByRole('link',{name:'MyCorpus, accueil'})).toBeVisible()
 await expect(page).toHaveTitle(/MyCorpus/)
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await expect(page.getByRole('button',{name:'Femme',exact:true})).toHaveCount(0)
 await page.locator('.female-specialty summary').click()
 await page.getByRole('button',{name:'Bassin féminin',exact:true}).click()
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await expect(page.locator('main')).toHaveAttribute('data-selected','HRA-region-pelvis')
 await expect(page.locator('.mode-explanation')).toContainText('74 structures')
 await expect(page.getByRole('button',{name:'Vue muscles',exact:true})).toHaveCount(0)
 await page.waitForTimeout(1500)
 await page.screenshot({path:'tests/artifacts/female-region-pelvis.png'})
 for(const [label,id] of [['Reproduction','reproductive'],['Sein','breast']]){
  await page.getByRole('button',{name:label,exact:true}).click()
  await expect(page.locator('main')).toHaveAttribute('data-selected','HRA-region-'+id)
 }
 await page.waitForTimeout(1500)
 await page.screenshot({path:'tests/artifacts/female-region-breast.png'})
 await page.reload();await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await expect(page.locator('main')).toHaveAttribute('data-selected','HRA-region-breast')
 await page.getByRole('button',{name:'Cours de la région'}).click()
 await expect(page).toHaveURL(/cours=anat-breast/)
 await expect(page.locator('.course-section')).toHaveCount(6)
 await page.getByRole('button',{name:'M’entraîner sur ce cours'}).click()
 await expect(page.getByLabel('Chapitre du quiz')).toHaveValue('anat-breast')
 await page.goto('/#body=female&structure=HRA-region-breast')
 await page.getByRole('button',{name:'Revenir au corps entier'}).click()
 await expect(page.locator('main')).toHaveAttribute('data-body','male')
 expect(errors).toEqual([])
})

test('régions féminines mobiles : accès direct, zoom et sélection d’un détail',async({page})=>{
 await page.setViewportSize({width:393,height:852})
 await page.goto('/#body=female&structure=HRA-region-reproductive')
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await page.waitForTimeout(1500)
 const distance=()=>page.evaluate(()=>{const s=(window as any).__CORPUS_TEST__.state();return Math.hypot(...s.camera.map((v:number,i:number)=>v-s.target[i]))})
 const before=await distance();await page.getByRole('button',{name:'Agrandir le modèle',exact:true}).click()
 await expect.poll(distance).toBeLessThan(before*.95)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.getByRole('button',{name:'Sein',exact:true}).click()
 await expect(page.locator('main')).toHaveAttribute('data-selected','HRA-region-breast')
 await page.waitForTimeout(1600)
 await page.screenshot({path:'tests/artifacts/female-region-mobile.png'})
 await page.getByRole('button',{name:'Reproduction',exact:true}).click()
 await page.getByLabel('Rechercher une structure',{exact:true}).fill('utérus')
 await page.locator('#search-results button').filter({hasText:/^Utérus/}).first().click()
 await expect(page.locator('.detail-content h2')).toHaveText('Utérus')
 await page.getByRole('button',{name:'Quiz de la région'}).click()
 await expect(page.getByLabel('Chapitre du quiz')).toHaveValue('anat-female-pelvis')
})

test('74 maillages régionaux féminins : géométrie réelle, empreintes, assemblages et traductions',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/models/female-regions/manifest.json','utf8'))
 const labels={...JSON.parse(fs.readFileSync('src/data/female-labels.json','utf8')),...JSON.parse(fs.readFileSync('src/data/french-labels.json','utf8'))}
 const names=new Set<string>()
 for(const group of manifest.groups){
  const file=fs.readFileSync('public/'+group.url)
  expect(file.subarray(0,4).toString()).toBe('glTF')
  expect(file.length).toBe(group.bytes)
  expect(crypto.createHash('sha256').update(file).digest('hex')).toBe(group.sha256)
  const gltf=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString())
  const nodes=gltf.nodes.filter((n:any)=>n.mesh!==undefined)
  expect(nodes).toHaveLength(group.structures)
  for(const node of nodes){expect(names.has(node.name)).toBe(false);names.add(node.name);expect(gltf.meshes[node.mesh].primitives.length).toBeGreaterThan(0)}
 }
 expect(names.size).toBe(74)
 for(const s of manifest.structures){
  for(const name of s.meshNames)expect(names.has(name),s.id).toBeTruthy()
  expect(labels[s.name],s.name).toBeTruthy()
  expect(labels[s.name]).not.toMatch(/\b(right|left|artery|vein|branch|tooth|upper|lower|of|with)\b/i)
 }
 expect(manifest.source.license).toBe('CC BY 4.0')
 expect(manifest.source.excludedSeparatePlacenta).toHaveLength(8)
})
