import {readFileSync} from 'node:fs'
import {test,expect} from '@playwright/test'
import {extractStudyPdf} from '../server/study/pdf-layout.mjs'

test('Connexion depuis Mes cours : le moteur Gemini est rechargé après authentification',async({page})=>{
  await page.route('**/api/flashcards/generation-status',route=>route.fulfill(route.request().headers().cookie?.includes('mycorpus_session=')?{json:{mode:'gemini',model:'gemini-test'}}:{status:401,json:{error:'Connexion requise'}}))
  await page.goto('/#tab=mes-cours')
  await page.getByRole('button',{name:'Mon compte',exact:true}).click()
  await page.getByRole('button',{name:'Créer un compte',exact:true}).click()
  await page.getByLabel('Prénom ou pseudonyme').fill('Qualité après connexion')
  await page.getByLabel('Adresse e-mail').fill(`login-quality-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Mot de passe',{exact:true}).fill('Quality-test-solide-2026')
  await page.getByRole('button',{name:'Créer mon compte',exact:true}).click()
  await expect(page.getByRole('heading',{name:/Bonjour/})).toBeVisible()
  await page.getByRole('button',{name:'J’ai conservé mon code'}).click()
  await page.getByRole('button',{name:'Fermer le profil'}).click()
  await expect(page.getByRole('checkbox',{name:/Transcrire aussi les pages scannées/})).toBeVisible()
})

test('Téléchargement PDF direct : A4, texte sélectionnable, accents, formules et schéma en thème sombre',async({page})=>{
  await page.goto('/#tab=cours&cours=FMA7088')
  await expect(page.getByRole('button',{name:'Exporter en PDF',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Activer le thème sombre',exact:true}).click()
  const title=await page.locator('.course-article h1').innerText()
  const initialTitle=await page.title()
  await page.evaluate(()=>{
    window.print=()=>{throw new Error('Impression interdite')}
    const paragraph=document.createElement('p');paragraph.textContent='Éjection systolique : f(x) = x² ; f′(x) = 2x ; débit ≈ 5 L/min.'
    document.querySelector('.course-article')!.append(paragraph)
    const table=document.createElement('table')
    table.innerHTML='<tr><th>Paramètre</th><th>Valeur</th></tr><tr><td>Débit de référence</td><td>5 L/min</td></tr>'
    document.querySelector('.course-article')!.append(table)
  })
  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:'Exporter en PDF',exact:true}).click()
  const download=await downloadPromise
  expect(download.suggestedFilename()).toBe('mycorpus-le-coeur.pdf')
  const bytes=readFileSync((await download.path())!)
  expect(bytes.subarray(0,5).toString()).toBe('%PDF-')
  expect(bytes.toString('latin1')).toContain('/Subtype /Image')
  const extracted=await extractStudyPdf(bytes)
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loading=getDocument({data:new Uint8Array(bytes),isEvalSupported:false})
  const pdf=await loading.promise
  try {
    const first=await pdf.getPage(1)
    expect(first.view[2]-first.view[0]).toBeCloseTo(595.28,0)
    expect(first.view[3]-first.view[1]).toBeCloseTo(841.89,0)
  } finally {await loading.destroy()}
  expect(extracted.totalText).toContain(title)
  expect(extracted.totalText).toContain('Éjection systolique')
  expect(extracted.totalText).toContain('x²')
  expect(extracted.totalText).toContain('f′(x)')
  expect(extracted.totalText).toContain('Débit de référence')
  expect(extracted.totalText).not.toContain('Marquer ce cours terminé')
  expect(extracted.totalText.length).toBeGreaterThan(500)
  await expect(page).toHaveTitle(initialTitle)
  await expect(page.getByRole('button',{name:'Exporter en PDF',exact:true})).toBeEnabled()
  await expect(page.getByRole('button',{name:/Anki/})).toHaveCount(0)
})

test('Cours importé : section complète et synthèse Gemini prévisualisée avec preuve avant sauvegarde',async({page})=>{
  const registered=await page.request.post('/api/account/register',{headers:{'x-mycorpus-request':'1'},data:{name:'Qualité',email:`quality-${crypto.randomUUID()}@example.test`,password:'Quality-test-solide-2026'}})
  expect(registered.ok()).toBeTruthy()
  const text='La glycolyse se déroule dans le cytoplasme. '.repeat(20)+'La dernière notion du cours est entièrement accessible.'
  const document={id:'quality-document',title:'Cours de biochimie',filename:'cours.pdf',pageCount:2,fileSize:500,status:'ready',createdAt:'now',updatedAt:'now',sectionCount:1,questionCount:0,hasSummary:false,sections:[{id:'section',title:'Métabolisme',sectionOrder:1,startPage:1,endPage:2,content:text,tokenCount:200}],summary:null}
  await page.route('**/api/flashcards/generation-status',route=>route.fulfill({json:{mode:'gemini',model:'gemini-test'}}))
  await page.route('**/api/study/documents',route=>route.fulfill({json:{documents:[document]}}))
  await page.route('**/api/study/documents/quality-document',route=>route.fulfill({json:{document}}))
  await page.route('**/api/study/documents/quality-document/questions',route=>route.fulfill({json:{questions:[]}}))
  let saved=0
  await page.route('**/api/study/documents/quality-document/supports',async route=>{
    const body=route.request().postDataJSON()
    if(body.action==='save'){saved++;await route.fulfill({json:{persisted:true}});return}
    await route.fulfill({json:{previewId:'preview',task:'summary',overview:'La glycolyse transforme le glucose dans le cytoplasme.',persisted:false,generation:{mode:'gemini',model:'gemini-test',coverage:{sectionsTotal:2,sectionsAnalyzed:2,chunksTotal:1,chunksAnalyzed:1,sectionsSummarized:1,missingSections:[{id:'absent',title:'Limites du métabolisme'}]}},items:[{id:'point',text:'La glycolyse a lieu dans le cytoplasme.',sourceExcerpt:'La glycolyse se déroule dans le cytoplasme.',sectionId:'section',startPage:1,endPage:1,category:'Localisation'}]}})
  })
  await page.goto('/#tab=mes-cours&doc=quality-document')
  await expect(page.getByRole('heading',{name:document.title,exact:true})).toBeVisible()
  await page.setViewportSize({width:390,height:844})
  await page.getByRole('button',{name:/Découpage/}).click()
  await page.getByRole('button',{name:'Lire la section complète'}).click()
  await expect(page.getByText(/La dernière notion du cours est entièrement accessible/)).toBeVisible()
  await page.getByRole('button',{name:'Générer la synthèse',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Prévisualisation du support'})
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate(element=>getComputedStyle(element.parentElement!).position)).toBe('fixed')
  expect(await dialog.evaluate(element=>element.parentElement!.parentElement===window.document.body)).toBe(true)
  await dialog.getByRole('button',{name:'Générer la prévisualisation'}).click()
  await expect(dialog.getByRole('heading',{name:'Métabolisme',exact:true})).toBeVisible()
  await expect(dialog.getByRole('region',{name:'Résumé en bref'})).toContainText('La glycolyse transforme le glucose dans le cytoplasme.')
  await expect(dialog.getByRole('navigation',{name:'Plan du support'})).toContainText('Métabolisme')
  await expect(dialog.getByText(/1\/2 sections représentées/)).toBeVisible()
  await expect(dialog.getByText(/Sections sans point retenu : Limites du métabolisme/)).toBeVisible()
  await expect(dialog.getByLabel('Point 1')).toHaveValue('La glycolyse a lieu dans le cytoplasme.')
  await expect(dialog.getByText('La glycolyse se déroule dans le cytoplasme.',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({path:'tests/artifacts/design/pdf-quality/summary-mobile-390.png',fullPage:true})
  expect(saved).toBe(0)
  await dialog.getByLabel('Point 1').fill('La glycolyse cytoplasmique est à retenir.')
  await expect(dialog.getByRole('region',{name:'Résumé en bref'})).toHaveCount(0)
  await dialog.getByRole('button',{name:'Valider et enregistrer le support'}).click()
  await expect(dialog).toBeHidden()
  expect(saved).toBe(1)
  await page.request.delete('/api/account',{headers:{'x-mycorpus-request':'1'},data:{password:'Quality-test-solide-2026'}})
})

test('PDF : tableau multipage avec en-têtes répétés et aucun texte hors page',async({page})=>{
  await page.goto('/#tab=cours&cours=FMA7088')
  await expect(page.locator('.course-article h1')).toBeVisible()
  await page.evaluate(()=>{
    const article=document.querySelector('.course-article')!
    article.innerHTML='<h1>Validation de la pagination</h1><h2>Mesures de référence</h2><table><thead><tr><th>Repère</th><th>Observation</th></tr></thead><tbody>'+Array.from({length:75},(_,i)=>`<tr><td>Repère ${i}</td><td>Observation ${i} : une phrase assez longue pour occuper plusieurs lignes dans sa cellule, sans perdre son contenu.</td></tr>`).join('')+'</tbody></table><h2>Conclusion complète</h2><p>La dernière phrase du document est conservée.</p>'
  })
  const pending=page.waitForEvent('download')
  await page.getByRole('button',{name:'Exporter en PDF',exact:true}).click()
  const bytes=readFileSync((await(await pending).path())!)
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false}),pdf=await task.promise
  try{
    expect(pdf.numPages).toBeGreaterThan(2)
    let all=''
    for(let number=1;number<=pdf.numPages;number++){
      const sheet=await pdf.getPage(number),content=await sheet.getTextContent()
      const items=content.items.filter((item):item is typeof item & {str:string;transform:number[];width:number}=>'str' in item)
      const text=items.map(item=>item.str).join(' ');all+=text+' '
      if(text.includes('Observation '))expect(text).toContain('Repère')
      for(const item of items){expect(item.transform[4]).toBeGreaterThanOrEqual(45);expect(item.transform[4]+item.width).toBeLessThanOrEqual(sheet.view[2]-40);expect(item.transform[5]).toBeGreaterThan(15);expect(item.transform[5]).toBeLessThan(sheet.view[3]-20)}
    }
    for(let i=0;i<75;i++)expect(all).toContain(`Observation ${i} :`)
    expect(all).toContain('La dernière phrase du document est conservée.')
  }finally{await task.destroy()}
})
