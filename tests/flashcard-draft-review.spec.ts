import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {deflateSync} from 'node:zlib'

const headers={'x-mycorpus-request':'1'}
function pdf() {
  const stream=deflateSync(Buffer.from('BT /F1 12 Tf 14 TL 72 712 Td (Chapitre 1 : Anatomie.) Tj T* (Le rein filtre le plasma sanguin.) Tj T* (Le nerf median innerve le muscle pronateur rond.) Tj T* (Le coeur est situe dans le mediastin thoracique.) Tj ET'))
  return Buffer.concat([Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length '+stream.length+' /Filter /FlateDecode >>\nstream\n'),stream,Buffer.from('\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF')])
}
async function prepare(page:Page) {
  const registered=await page.request.post('/api/account/register',{headers,data:{name:'Révision',email:`draft-${crypto.randomUUID()}@example.test`,password:'Revision-test-solide-2026'}})
  expect(registered.ok()).toBeTruthy()
  await page.request.post('/api/flashcards/decks',{headers,data:{name:'Anatomie révisée'}})
  await page.goto('/#tab=mes-cours')
  const chooser=page.waitForEvent('filechooser')
  await page.getByRole('button',{name:'Choisir un PDF'}).click()
  await (await chooser).setFiles({name:'revision.pdf',mimeType:'application/pdf',buffer:pdf()})
  await expect(page.getByRole('heading',{name:'revision',exact:true})).toBeVisible()
  const docs=(await (await page.request.get('/api/study/documents')).json()).documents
  return docs[0].id as string
}
const review=(page:Page)=>page.getByRole('region',{name:'Révision des brouillons',exact:true})

test('PDF → brouillons → édition sans raccourcis parasite → acceptation → carte FSRS ; consultation et focus',async({page})=>{
  const id=await prepare(page)
  await page.getByRole('button',{name:'Générer des flashcards',exact:true}).click()
  await review(page).getByRole('button',{name:'Générer les brouillons',exact:true}).click()
  const cards=review(page).locator('.draft-review-card')
  await expect(cards.first()).toBeVisible()
  const initial=(await (await page.request.get(`/api/flashcards/documents/${id}/drafts`)).json()).drafts
  expect(initial.every((d:any)=>d.status==='pending')).toBeTruthy()
  const sourceButton=cards.first().getByRole('button',{name:/Voir dans le cours/})
  await sourceButton.click()
  const viewer=page.getByRole('dialog',{name:'Consultation du cours'})
  await expect(viewer).toBeVisible()
  await expect(viewer.locator('canvas')).toBeVisible()
  await expect(viewer.getByRole('button',{name:/Valider|Utiliser la page/})).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(sourceButton).toBeFocused()
  const selectedId=await cards.first().getAttribute('data-draft-id')
  await cards.first().getByRole('button',{name:'Modifier',exact:true}).click()
  const field=cards.first().getByLabel('Recto',{exact:true})
  await field.fill('')
  await field.pressSequentially('rate')
  await expect(field).toHaveValue('rate')
  const unchanged=(await (await page.request.get(`/api/flashcards/documents/${id}/drafts`)).json()).drafts
  expect(unchanged.map((d:any)=>[d.id,d.status])).toEqual(initial.map((d:any)=>[d.id,d.status]))
  let failEdit=true
  await page.route(`**/api/flashcards/drafts/${selectedId}`,async route=>{if(failEdit){failEdit=false;await route.fulfill({status:503,json:{error:'Édition temporairement indisponible.'}})}else await route.continue()})
  await cards.first().getByRole('button',{name:'Enregistrer les modifications'}).click()
  await expect(review(page).getByRole('alert')).toContainText('Édition temporairement indisponible')
  await expect(field).toHaveValue('rate')
  await expect(cards.first()).toHaveAttribute('data-status','pending')
  await review(page).getByRole('button',{name:'Réessayer',exact:true}).click()
  await review(page).getByLabel('Filtrer les brouillons').selectOption('edited')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toHaveAttribute('data-draft-id',selectedId!)
  await cards.first().getByRole('button',{name:'Accepter',exact:true}).click()
  const link=review(page).getByRole('link',{name:/Réviser la carte créée/})
  await expect(link).toBeVisible()
  const after=(await (await page.request.get(`/api/flashcards/documents/${id}/drafts?status=accepted`)).json()).drafts
  const noteId=after[0].acceptedNoteId
  await expect(link).toHaveAttribute('href',`#tab=flashcards&revision=due&note=${noteId}`)
  await link.click()
  await expect(page.getByRole('button',{name:'Afficher la réponse',exact:true})).toBeVisible()
  await expect(page.getByText('rate',{exact:true})).toBeVisible()
  const queue=(await (await page.request.get('/api/flashcards/review')).json()).cards
  expect(queue.some((card:any)=>card.noteId===noteId)).toBeTruthy()
})

function drafts(documentId:string,total:number) {
  return Array.from({length:total},(_,i)=>({id:`draft-${String(i).padStart(3,'0')}`,documentId,sectionId:null,page:1,noteType:'basic',front:`Question ${i}`,back:`Réponse ${i}`,fields:{front:`Question ${i}`,back:`Réponse ${i}`},sourceExcerpt:`Preuve ${i}.`,subject:'Anatomie',chapter:'Cours',tags:[],confidence:0,verbatimProof:true,status:'pending',rejectedFrom:null,acceptedNoteId:null,createdAt:1,updatedAt:1,faithfulToCourse:false}))
}
async function mockList(page:Page,id:string,rows:ReturnType<typeof drafts>,requests:URL[]=[]) {
  await page.route(`**/api/flashcards/documents/${id}/drafts?*`,async route=>{
    const url=new URL(route.request().url());requests.push(url)
    const status=url.searchParams.get('status'),limit=Number(url.searchParams.get('limit')),offset=Number(url.searchParams.get('offset'))
    const filtered=rows.filter(d=>!status||d.status===status)
    const counts={total:rows.length,pending:0,edited:0,accepted:0,rejected:0,faithfulToCourse:0}
    for(const row of rows)counts[row.status as 'pending']++
    await route.fulfill({json:{drafts:filtered.slice(offset,offset+limit),counts,filteredTotal:filtered.length,limit,offset,nextOffset:offset+limit<filtered.length?offset+limit:null}})
  })
}

test('150 sélectionnés : lots séquentiels, double clic, panne réseau, reprise du reste et résultats par ID',async({page})=>{
  const id=await prepare(page),rows=drafts(id,150),calls:string[][]=[]
  await mockList(page,id,rows)
  await page.route(`**/api/flashcards/documents/${id}/drafts/accept`,async route=>{
    const ids=route.request().postDataJSON().ids as string[];calls.push(ids)
    if(calls.length===2){await route.abort('failed');return}
    await new Promise(resolve=>setTimeout(resolve,150))
    const results=ids.map(id=>{const row=rows.find(d=>d.id===id)!;row.status='accepted';row.acceptedNoteId=`note-${id}` as any;return {id,status:'accepted',noteId:row.acceptedNoteId,draft:row}})
    await route.fulfill({json:{results}})
  })
  await page.getByRole('button',{name:'Réviser les brouillons'}).click()
  await review(page).getByRole('button',{name:'Tout sélectionner sur la vue filtrée'}).click()
  await expect(review(page).locator('input[type=checkbox]:checked')).toHaveCount(151) // 150 cards + shortcuts.
  const accept=review(page).getByRole('button',{name:'Accepter la sélection',exact:true})
  await accept.evaluate((button:HTMLButtonElement)=>{button.click();button.click()})
  await expect(review(page).getByRole('alert')).toContainText('Erreur réseau')
  expect(calls.map(ids=>ids.length)).toEqual([100,50])
  await expect(review(page).getByText('Traitement : 100/150')).toBeVisible()
  await expect(review(page).locator('.draft-review-card')).toHaveCount(50)
  await review(page).getByRole('button',{name:'Réessayer',exact:true}).click()
  await expect(review(page).getByText('Traitement : 150/150')).toBeVisible()
  expect(calls.map(ids=>ids.length)).toEqual([100,50,50])
  expect(calls[2]).toEqual(calls[1])
  await expect(review(page).getByRole('link',{name:/Réviser la carte créée/})).toHaveCount(150)
})

test('pagination après rejet, annulation, Maj+clic, raccourcis désactivables et PDF manquant',async({page})=>{
  const id=await prepare(page),rows=drafts(id,120),requests:URL[]=[]
  await mockList(page,id,rows,requests)
  for(const action of ['reject','restore'])await page.route(`**/api/flashcards/documents/${id}/drafts/${action}`,async route=>{
    const results=route.request().postDataJSON().ids.map((id:string)=>{const row=rows.find(d=>d.id===id)!;row.status=action==='reject'?'rejected':'pending';return{id,status:action==='reject'?'rejected':'restored',draft:row}})
    await route.fulfill({json:{results}})
  })
  await page.getByRole('button',{name:'Réviser les brouillons'}).click()
  const cards=review(page).locator('.draft-review-card')
  await expect(cards).toHaveCount(50)
  await cards.nth(0).getByRole('checkbox').click()
  await cards.nth(2).getByRole('checkbox').click({modifiers:['Shift']})
  await expect(review(page).getByText(/3 sélectionnés/)).toBeVisible()
  await expect(cards.locator('input[type=checkbox]:checked')).toHaveCount(3)
  await review(page).getByLabel('Activer les raccourcis clavier').uncheck()
  await cards.first().focus();await page.keyboard.press('r')
  await expect(cards).toHaveCount(50)
  await cards.first().getByRole('button',{name:'Rejeter',exact:true}).click()
  await expect(cards).toHaveCount(49)
  await review(page).getByRole('button',{name:'Charger la suite'}).click()
  await expect(cards).toHaveCount(99)
  expect(requests.at(-1)?.searchParams.get('offset')).toBe('0')
  expect(requests.at(-1)?.searchParams.get('limit')).toBe('99')
  await review(page).locator('.draft-review-undo').getByRole('button',{name:'Annuler',exact:true}).click()
  await expect(cards).toHaveCount(100)
  await expect(review(page).getByText(/120 en attente/)).toBeVisible()
  await review(page).getByRole('button',{name:'Charger la suite'}).click()
  await expect(cards).toHaveCount(120)
  await page.route(`**/api/study/documents/${id}/pdf`,route=>route.fulfill({status:404}))
  const source=cards.first().getByRole('button',{name:/Voir dans le cours/})
  await source.click()
  await expect(page.getByRole('dialog').getByText('Le PDF source est introuvable ou a été supprimé.')).toBeVisible()
  await page.keyboard.press('Escape');await expect(source).toBeFocused()
  await page.setViewportSize({width:320,height:740})
  const box=await review(page).boundingBox()
  expect(box!.x+box!.width).toBeLessThanOrEqual(321)
})

test('régénération depuis le même bouton : doublons ignorés et état vide distinct',async({page})=>{
  const id=await prepare(page)
  await page.getByRole('button',{name:'Générer des flashcards',exact:true}).click()
  await review(page).getByRole('button',{name:'Générer les brouillons',exact:true}).click()
  await expect(review(page).locator('.draft-review-card').first()).toBeVisible()
  const count=await review(page).locator('.draft-review-card').count()
  await page.getByRole('button',{name:'Générer des flashcards',exact:true}).click()
  await review(page).getByRole('button',{name:'Générer les brouillons',exact:true}).click()
  await expect(review(page).getByText(`${count} brouillons ignorés car déjà générés.`,{exact:true})).toBeVisible()
  await expect(review(page).getByText('Aucun brouillon généré, ce cours contient peu de phrases exploitables.',{exact:true})).toHaveCount(0)
  await expect(review(page).locator('.draft-review-card')).toHaveCount(count)
  await page.route(`**/api/flashcards/documents/${id}/drafts/generate`,route=>route.fulfill({status:201,json:{generated:0,created:0,ignored:0,unattributed:0}}))
  await page.getByRole('button',{name:'Générer des flashcards',exact:true}).click()
  await review(page).getByRole('button',{name:'Générer les brouillons',exact:true}).click()
  await expect(review(page).getByText('Aucun brouillon généré, ce cours contient peu de phrases exploitables.',{exact:true})).toBeVisible()
  await expect(review(page).getByText(`${count} brouillons ignorés car déjà générés.`,{exact:true})).toHaveCount(0)
})

test('accessibilité : une seule région active annonce chargement, progression, résultat et annulation',async({page})=>{
  const id=await prepare(page),rows=drafts(id,2)
  let release:()=>void=()=>{}
  const initialRequest=new Promise<void>(resolve=>{release=resolve})
  await page.route(`**/api/flashcards/documents/${id}/drafts?*`,async route=>{
    await initialRequest
    await route.fulfill({json:{drafts:rows,counts:{total:2,pending:2,edited:0,accepted:0,rejected:0,faithfulToCourse:0},filteredTotal:2,limit:50,offset:0,nextOffset:null}})
  })
  await page.getByRole('button',{name:'Réviser les brouillons'}).click()
  const workspace=review(page)
  const activeLive=workspace.locator('[aria-live]:not([aria-live="off"])')
  const assertSingle=async()=>{
    await expect(activeLive).toHaveCount(1)
    await expect(workspace.locator('[role="status"]')).toHaveCount(1)
  }
  await assertSingle()
  await expect(activeLive).toContainText('Chargement…')
  release()
  await expect(workspace.locator('.draft-review-card')).toHaveCount(2)
  await assertSingle()
  let releaseReject:()=>void=()=>{}
  const rejecting=new Promise<void>(resolve=>{releaseReject=resolve})
  let fail=true
  await page.route(`**/api/flashcards/documents/${id}/drafts/reject`,async route=>{
    if(fail){fail=false;await route.fulfill({status:503,json:{error:'Service temporairement indisponible.'}});return}
    await rejecting
    const row={...rows[0],status:'rejected',rejectedFrom:'pending'}
    await route.fulfill({json:{results:[{id:row.id,status:'rejected',draft:row}]}})
  })
  await workspace.locator('.draft-review-card').first().getByRole('button',{name:'Rejeter',exact:true}).click()
  await expect(workspace.getByRole('alert')).toContainText('Service temporairement indisponible')
  await assertSingle()
  await expect(activeLive).toContainText('Service temporairement indisponible')
  await expect(workspace.getByRole('alert')).toHaveAttribute('aria-live','off')
  await workspace.getByRole('button',{name:'Réessayer',exact:true}).click()
  await expect(activeLive).toContainText('Chargement…')
  await expect(activeLive).toContainText('Progression : 0 sur 1')
  await assertSingle()
  releaseReject()
  await expect(workspace.locator('.draft-review-undo')).toBeVisible()
  await expect(activeLive).toContainText('Progression : 1 sur 1')
  await expect(activeLive).toContainText('Rejeté. Annuler.')
  await assertSingle()
  await expect(workspace.locator('.draft-review-undo')).not.toHaveAttribute('aria-live','polite')
})
