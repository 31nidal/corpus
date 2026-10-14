import {test,expect,type Page} from '@playwright/test'
import {referencePdf} from './helpers/study-v2-pdf'
const headers={'x-mycorpus-request':'1'}
async function prepare(page:Page){
  expect((await page.request.post('/api/account/register',{headers,data:{name:'Sources',email:`sources-${crypto.randomUUID()}@example.test`,password:'Sources-test-solide-2026'}})).status()).toBe(201)
  const deck=(await (await page.request.post('/api/flashcards/decks',{headers,data:{name:'Sources PDF'}})).json()).deck
  await page.goto('/#tab=mes-cours')
  await page.getByRole('button',{name:'Essayer Study 2.0 · bêta',exact:true}).click()
  await page.getByLabel('Fichier PDF',{exact:true}).setInputFiles({name:'rein.pdf',mimeType:'application/pdf',buffer:referencePdf()})
  await page.getByRole('button',{name:'Importer le PDF',exact:true}).click()
  await expect(page.locator('.sv2-document-card .sv2-state')).toHaveText('Prêt',{timeout:30000})
  await page.locator('.sv2-document-open').click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  return {doc:new URLSearchParams(new URL(page.url()).hash.slice(1)).get('doc')!,deck}
}
test('Flashcards V2 : passage exact → brouillon → édition → acceptation → FSRS, aucune phrase extérieure',async({page})=>{
  const {doc}=await prepare(page)
  await page.getByRole('button',{name:'Page suivante',exact:true}).click()
  await expect(page.locator('.sv2-text-layer')).toContainText('La filtration glomerulaire depend de la pression sanguine.')
  await page.locator('.sv2-pdf-sheet').evaluate(node=>{
    const span=[...node.querySelectorAll('span')].find(item=>item.textContent==='La filtration glomerulaire depend de la pression sanguine.')!
    const range=document.createRange();range.selectNodeContents(span)
    window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range)
    node.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))
  })
  await page.getByRole('button',{name:'Créer des flashcards sur ce passage',exact:true}).click()
  const review=page.getByRole('region',{name:'Révision des brouillons',exact:true})
  await expect(review.getByRole('checkbox',{name:'Utiliser uniquement le passage sélectionné · page 2',exact:true})).toBeChecked()
  await review.getByRole('button',{name:'Générer les brouillons',exact:true}).click()
  await expect(review.locator('.draft-review-card')).not.toHaveCount(0)
  const drafts=(await (await page.request.get(`/api/flashcards/documents/${doc}/drafts`)).json()).drafts
  expect(drafts.every((draft:{page:number;sourceExcerpt:string})=>draft.page===2&&draft.sourceExcerpt==='La filtration glomerulaire depend de la pression sanguine.')).toBeTruthy()
  await review.getByRole('button',{name:'Modifier',exact:true}).first().click()
  const editor=review.locator('.draft-review-card').first().getByRole('textbox').first()
  await editor.fill((await editor.inputValue())+' Relu.')
  await review.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click()
  await review.getByRole('combobox',{name:'Filtrer les brouillons',exact:true}).selectOption('edited')
  await expect(review.locator('.draft-review-card').first()).toContainText('Relu.')
  await review.getByRole('button',{name:'Accepter',exact:true}).first().click()
  await expect(review.getByRole('link',{name:/Réviser la carte créée/})).toHaveCount(1)
  await review.getByRole('link',{name:/Réviser la carte créée/}).click()
  await expect(page.getByRole('button', {name: 'Afficher la réponse', exact: true})).toBeVisible()
})
test('Flashcards visuelles V2 : page exacte, masque au clavier, source conservée et URL libérée',async({page})=>{
  const {doc}=await prepare(page)
  await page.evaluate(()=>{
    const stats={created:[] as string[],revoked:[] as string[]}
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL)
    URL.createObjectURL=blob=>{const url=create(blob);if(blob instanceof Blob&&blob.type==='image/png')stats.created.push(url);return url}
    URL.revokeObjectURL=url=>{stats.revoked.push(url);revoke(url)}
    Object.assign(window,{visualUrlStats:stats})
  })
  await page.getByRole('button',{name:'Page suivante',exact:true}).click()
  await page.getByRole('navigation',{name:'Espaces du cours'}).getByRole('button',{name:'Flashcards',exact:true}).click()
  await page.getByRole('button',{name:'Créer une carte visuelle depuis le PDF',exact:true}).click()
  const crop=page.getByRole('dialog',{name:'Sélection du PDF',exact:true})
  await expect(crop).toContainText('Page 2 / 2')
  await crop.getByRole('button',{name:'Utiliser la page entière',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Éditeur de carte visuelle',exact:true})
  await expect(editor.getByAltText('Source à masquer')).toBeVisible()
  await editor.getByRole('button',{name:'Ajouter un masque au clavier',exact:true}).click()
  await editor.getByLabel('Position verticale (%)',{exact:true}).fill('34')
  await editor.getByPlaceholder('Ex: Artère coronaire droite',{exact:true}).fill('Filtration glomérulaire')
  await editor.getByRole('button',{name:'Créer la Note et 1 carte',exact:true}).click()
  await expect(editor).not.toBeVisible({timeout:30000})
  const notes=(await (await page.request.get('/api/flashcards/notes')).json()).notes
  const note=notes.find((note:{noteType:string})=>note.noteType==='image_occlusion')
  expect(note).toBeTruthy();expect(note.source.documentId).toBe(doc);expect(note.source.locator.page).toBe(2)
  expect(note.fields.masks[0].label).toBe('Filtration glomérulaire')
  const stats=await page.evaluate(()=> (window as unknown as {visualUrlStats:{created:string[];revoked:string[]}}).visualUrlStats)
  expect(stats.created.length).toBeGreaterThan(0);expect(stats.created.every(url=>stats.revoked.includes(url))).toBeTruthy()
})

test('Flashcards visuelles mobile et interface actuelle : masque au clavier, Échap et retour du focus',async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await prepare(page)
  await page.getByRole('navigation',{name:'Espaces du cours'}).getByRole('button',{name:'Flashcards',exact:true}).click()
  const opener=page.getByRole('button',{name:'Créer une carte visuelle depuis le PDF',exact:true})
  await opener.click()
  await page.getByRole('dialog',{name:'Sélection du PDF',exact:true}).getByRole('button',{name:'Utiliser la page entière',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Éditeur de carte visuelle',exact:true})
  await editor.getByRole('button',{name:'Ajouter un masque au clavier',exact:true}).click()
  await editor.getByLabel('Largeur du masque (%)',{exact:true}).fill('25')
  expect(await editor.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBeTruthy()
  await page.screenshot({path:'tests/artifacts/design/study-v2-visual-card-mobile.png',fullPage:true})
  await page.keyboard.press('Escape')
  await expect(editor).not.toBeVisible();await expect(opener).toBeFocused()
  await page.getByRole('button',{name:'Revenir à l’interface actuelle',exact:true}).click()
  await page.getByRole('button',{name:'Flashcard visuelle',exact:true}).click()
  await expect(page.getByRole('dialog',{name:'Sélection du PDF',exact:true})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button',{name:'Flashcard visuelle',exact:true})).toBeFocused()
})
