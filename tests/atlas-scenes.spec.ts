import {test,expect} from '@playwright/test'
const state=(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).__CORPUS_TEST__?.state())
async function open(page:import('@playwright/test').Page) {
 await page.goto('/#mode=detail&structure=FMA7148')
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await expect(page.getByTestId('structure-detail')).toBeVisible()
}

test('opacité individuelle conservée dans un lien partagé après rechargement',async({page})=>{
 await open(page)
 await page.getByRole('slider',{name:'Opacité de la structure',exact:true}).fill('42')
 await page.getByRole('button',{name:'Copier le lien de cette structure'}).click()
 await expect(page).toHaveURL(/view=/)
 await page.reload()
 await expect(page.locator('main')).toHaveAttribute('data-loaded','true',{timeout:90000})
 await expect(page.getByRole('slider',{name:'Opacité de la structure',exact:true})).toHaveValue('42')
 await expect.poll(async()=>(await state(page)).selectedMeshOpacities.every((opacity:number)=>opacity===.42)).toBe(true)
})

test('six orientations anatomiques placent réellement la caméra sur les axes',async({page})=>{
 await open(page)
 await page.getByRole('button',{name:'Outils d’exploration',exact:true}).click()
 for(const [name,axis,sign] of [['Antérieure',2,1],['Postérieure',2,-1],['Latérale gauche',0,1],['Latérale droite',0,-1],['Supérieure',1,1],['Inférieure',1,-1]] as [string,number,number][]) {
  await page.getByRole('button',{name,exact:true}).click()
  await expect.poll(async()=>{
   const s=await state(page),direction=s.camera.map((value:number,index:number)=>value-s.target[index])
   return sign*direction[axis]/Math.hypot(...direction)
  },{timeout:10000}).toBeGreaterThan(.9999)
 }
})

test('mobile : fiche et révision repliables libèrent la scène sans perdre la sélection',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await open(page)
 const height=async()=> (await page.locator('.stage').boundingBox())!.height
 const before=await height()
 await page.getByRole('button',{name:'Réduire la fiche anatomique'}).click()
 await expect(page.getByTestId('structure-detail').locator('.detail-content')).not.toBeVisible()
 await expect.poll(height).toBeGreaterThan(before+150)
 await expect(page.locator('main')).toHaveAttribute('data-selected','FMA7148')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390)
 await page.screenshot({path:'/tmp/atlas-refonte-mobile-collapsed.png'})
 await page.getByRole('button',{name:'Développer la fiche anatomique'}).click()
 await page.getByRole('button',{name:'Réviser ces structures en 3D'}).click()
 const panel=page.getByRole('complementary',{name:'Révision anatomique 3D'})
 await panel.getByRole('button',{name:'Réduire la révision 3D'}).click()
 await expect(panel.locator('.detail-content')).not.toBeVisible()
 await expect.poll(height).toBeGreaterThan(before+150)
 await panel.getByRole('button',{name:'Développer la révision 3D'}).click()
 await expect(panel.getByLabel('Type d’exercice anatomique')).toBeVisible()
})
