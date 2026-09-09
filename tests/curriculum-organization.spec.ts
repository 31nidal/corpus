import {test,expect} from '@playwright/test'
import {courses} from '../src/study/curriculum'
import {questions} from '../src/study/questions'
import {diagrams} from '../src/study/diagrams'
import {subjects,groupCourses} from '../src/study/subjects'
import fs from 'node:fs'

test('couverture organisée : cours, exercices, schémas et repères 3D valides',()=>{
 expect(courses).toHaveLength(67)
 expect(questions).toHaveLength(311)
 expect(new Set(courses.map(c=>c.id)).size).toBe(courses.length)
 expect(Object.keys(diagrams)).toHaveLength(courses.length)
 const ids=new Set(['public/models/manifest.json','public/models/female-regions/manifest.json'].flatMap(path=>JSON.parse(fs.readFileSync(path,'utf8')).structures.map((s:{id:string})=>s.id)))
 for(const c of courses){
  expect(subjects.some(s=>s.title===c.category),c.id).toBeTruthy()
  expect(c.sections.length,c.id).toBeGreaterThanOrEqual(6)
  expect(c.glossary?.length,c.id).toBeGreaterThanOrEqual(2)
  expect(c.source,c.id).toMatch(/^https:\/\//)
  expect(questions.filter(q=>q.course===c.id).length,c.id).toBeGreaterThanOrEqual(4)
  expect(questions.filter(q=>q.course===c.id).every(q=>q.topic===c.category)).toBeTruthy()
  if(c.structure)expect(ids.has(c.structure),c.id+' → '+c.structure).toBeTruthy()
 }
 expect(groupCourses(courses).flatMap(s=>s.groups.flatMap(g=>g.courses.map(c=>c.id)))).toEqual(courses.map(c=>c.id))
 const hand=JSON.stringify(courses.find(c=>c.id==='anat-hand')).toLowerCase()
 for(const bone of ['scaphoïde','lunatum','triquetrum','pisiforme','trapèze','trapézoïde','capitatum','hamatum'])expect(hand).toContain(bone)
 const foot=JSON.stringify(courses.find(c=>c.id==='anat-foot')).toLowerCase()
 for(const bone of ['talus','calcanéus','naviculaire','cuboïde','cunéiformes'])expect(foot).toContain(bone)
})

test('matière → région → chapitre, recherche sans accents et retour navigateur',async({page})=>{
 await page.goto('/#tab=cours')
 await expect(page.locator('.subject-card')).toHaveCount(13)
 await expect(page.locator('.course-tile')).toHaveCount(0)
 await page.screenshot({path:'tests/artifacts/catalog-directory.png'})
 await page.locator('.subject-card').filter({hasText:'Anatomie'}).click()
 await page.getByRole('navigation',{name:'Régions et thèmes'}).getByRole('button',{name:/Membre supérieur/}).click()
 await expect(page.locator('.module-section')).toHaveCount(1)
 await expect(page.locator('.catalog-heading h1')).toHaveText('Anatomie')
 await page.reload()
 await expect(page.getByRole('button',{name:/Membre supérieur/})).toHaveAttribute('aria-pressed','true')
 await page.getByLabel('Rechercher un cours').fill('scaphoide')
 await expect(page.locator('.course-tile')).toHaveCount(2)
 await page.locator('.course-tile').filter({hasText:'Main : les huit os du carpe'}).click()
 await expect(page).toHaveURL(/cours=anat-hand/)
 await expect(page.locator('.course-section')).toHaveCount(6)
 await expect(page.locator('.anatomy-link')).toBeVisible()
 await page.locator('.next-chapter').click()
 await expect(page).toHaveURL(/cours=anat-upper-muscles/)
 await page.goBack()
 await expect(page).toHaveURL(/cours=anat-hand/)
 await page.getByRole('button',{name:'Anatomie',exact:true}).click()
 await expect(page.locator('.catalog-heading h1')).toHaveText('Anatomie')
 await page.screenshot({path:'tests/artifacts/catalog-anatomy.png'})
})

test('mobile : matières séparées et quiz filtré, sans chargement 3D',async({page})=>{
 await page.setViewportSize({width:393,height:852})
 const glbs:string[]=[],errors:string[]=[]
 page.on('request',r=>{if(r.url().endsWith('.glb'))glbs.push(r.url())});page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/#tab=cours&matiere=chimie')
 await expect(page.locator('.course-tile')).toHaveCount(2)
 await page.getByRole('button',{name:'Activer le thème sombre'}).click()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 await page.screenshot({path:'tests/artifacts/catalog-mobile-chemistry.png'})
 await page.locator('.course-tile').first().click()
 await page.getByRole('button',{name:'M’entraîner sur ce cours'}).click()
 await page.getByLabel('Matière du quiz').selectOption('Histologie')
 await expect(page.getByLabel('Chapitre du quiz')).toHaveValue('all')
 const available=await page.getByLabel('Chapitre du quiz').locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value).filter(v=>v!=='all'))
 expect(available).toEqual(courses.filter(c=>c.category==='Histologie').map(c=>c.id))
 await page.getByRole('button',{name:'Commencer la série'}).click()
 const prompt=await page.locator('.question-layout h1').innerText()
 expect(questions.find(q=>q.prompt===prompt)?.topic).toBe('Histologie')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393)
 expect(glbs).toEqual([]);expect(errors).toEqual([])
})
