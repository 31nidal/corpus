import {test,expect} from '@playwright/test'
const doc={id:'course-test',title:'Innervation du diaphragme',filename:'innervation.pdf',fileSize:1200,pageCount:1,status:'ready',createdAt:'2026-10-28',updatedAt:'2026-10-28',sectionCount:2,questionCount:3,hasSummary:false,sections:[{id:'s1',title:'Nerf phrénique',sectionOrder:0,startPage:1,endPage:1,content:'Le nerf phrénique innerve le diaphragme.',tokenCount:20},{id:'s2',title:'Autres nerfs',sectionOrder:1,startPage:1,endPage:1,content:'Le nerf facial innerve les muscles de la mimique.',tokenCount:20}]}
const qs=[0,1,2].map(i=>({id:'q'+i,course:'doc-course-test',documentId:doc.id,sourceSectionId:i===2?'s2':'s1',sourceSectionTitle:i===2?'Autres nerfs':'Nerf phrénique',prompt:'Question '+i+' : quelle innervation ?',options:['Diaphragme','Langue','Pharynx'],correct:i===1?[0,2]:[0],why:['Le nerf phrénique innerve le diaphragme.','La langue est innervée par le nerf hypoglosse.','Le pharynx relève du nerf vague.'],format:i===1?undefined:'single',sourcePages:[1,1],sourceExcerpt:'Le nerf phrénique innerve le diaphragme.',sourceEvidence:{verified:true,page:1}}))
async function setup(page:any){
 await page.request.get('/api/account/session')
 await page.route('**/api/account/sync',async(route:any)=>route.fulfill({json:{ok:true}}))
 let subject='',opened=false;const history:any[]=[],generations:any[]=[],attempts:any[]=[]
 await page.route('**/api/account/session',async(route:any)=>route.fulfill({json:{available:true,user:{id:'student-a',name:'Alex',email:'alex@example.test',hasPassword:true,googleLinked:false},state:{},google:{available:false}}}))
 await page.route('**/api/study/**',async(route:any)=>{
  const req=route.request(),path=new URL(req.url()).pathname,body=req.method()==='POST'?req.postDataJSON():null
  if(path==='/api/study/documents')return route.fulfill({json:{documents:[doc]}})
  if(path.endsWith('/quotas'))return route.fulfill({json:{quota:{maxDocuments:25,documentsUsed:1}}})
  if(path==='/api/study/learning')return route.fulfill({json:{metadata:subject||opened?[{documentId:doc.id,subject,lastOpenedAt:opened?'2026-10-28T10:00:00Z':null}]:[],questions:qs.map(q=>({id:q.id,documentId:doc.id,sectionId:q.sourceSectionId,sectionTitle:q.sourceSectionTitle})),history}})
  if(path.endsWith('/learning')){if(body.subject!==undefined)subject=body.subject;if(body.opened)opened=true;return route.fulfill({json:{ok:true}})}
  if(path.endsWith('/attempts')){attempts.push(body);const q=qs.find(q=>q.id===body.questionId)!;const correct=body.answers.length===q.correct.length&&q.correct.every(i=>body.answers.includes(i));history.unshift({...body,documentId:doc.id,sectionId:q.sourceSectionId,correct:Number(correct),createdAt:'2026-10-28T11:00:00Z'});return route.fulfill({json:{id:body.id,correct,createdAt:history[0].createdAt}})}
  if(path.endsWith('/pdf'))return route.fulfill({path:'tests/fixtures/pdf-compression/reportlab-raw.pdf',contentType:'application/pdf'})
  if(path.endsWith('/questions')){if(req.method()==='POST'){generations.push(body);return route.fulfill({status:503,json:{error:'Gemini temporairement indisponible. Votre cours reste disponible.'}})}return route.fulfill({json:{questions:qs}})}
  if(path.endsWith('/'+doc.id))return route.fulfill({json:{document:doc}})
  return route.continue()
 })
 await page.goto('/#tab=mes-cours');await expect(page.getByRole('heading',{name:'Mes matières et chapitres'})).toBeVisible({timeout:30000})
 return {generations,attempts}
}
test('révision active : matière, QCM multi-réponses, correction sourcée, erreurs et progression réelle',async({page})=>{
 const {generations,attempts}=await setup(page)
 await page.getByRole('button',{name:'Reprendre mes révisions',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Interroge-moi',exact:true})).toBeVisible()
 await page.getByLabel('Matière',{exact:true}).fill('Anatomie')
 await page.getByRole('button',{name:'Enregistrer la matière'}).click()
 await page.getByLabel('Nombre de questions').selectOption('3')
 await page.getByRole('button',{name:'Commencer l’interrogation'}).click()
 await expect(page.getByRole('heading',{name:'Question 0 : quelle innervation ?'})).toBeVisible()
 await page.getByRole('button',{name:'B Langue',exact:true}).click()
 await page.getByRole('button',{name:'Valider ma réponse',exact:true}).click()
 const correction=page.getByRole('region',{name:'Correction argumentée'})
 await expect(correction).toContainText('À retravailler');await expect(correction).toContainText('La langue est innervée par le nerf hypoglosse.')
 await page.getByRole('button',{name:'Voir le passage dans le PDF · p. 1'}).click()
 await expect(page.getByRole('dialog',{name:'Consultation du cours'}).locator('canvas')).toBeVisible()
 await page.getByRole('dialog',{name:'Consultation du cours'}).getByRole('button',{name:'Fermer',exact:true}).click()
 await page.getByRole('button',{name:'Question suivante',exact:true}).click()
 await page.getByRole('button',{name:'A Diaphragme',exact:true}).click();await page.getByRole('button',{name:'C Pharynx',exact:true}).click()
 await page.getByRole('button',{name:'Valider ma réponse',exact:true}).click();await expect(correction).toContainText('Bonne réponse')
 await page.getByRole('button',{name:'Question suivante',exact:true}).click()
 await page.getByRole('button',{name:'A Diaphragme',exact:true}).click();await page.getByRole('button',{name:'Valider ma réponse',exact:true}).click();await page.getByRole('button',{name:'Voir le bilan',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Séance terminée'})).toBeVisible();await expect(page.locator('.learning-session-result')).toContainText('2 / 3')
 expect(generations).toHaveLength(0);expect(attempts).toHaveLength(3)
 await page.getByRole('button',{name:'Maîtriser · Mes lacunes'}).click();await expect(page.locator('.learning-weak-list')).toContainText('Question 0')
 await page.getByRole('button',{name:'Réviser mes erreurs',exact:true}).click();await expect(page.getByLabel('Priorité')).toHaveValue('errors')
 await page.getByRole('button',{name:'Commencer l’interrogation'}).click();await expect(page.getByRole('heading',{name:'Question 0 : quelle innervation ?'})).toBeVisible()
 expect(generations).toHaveLength(0)
 await page.getByRole('button',{name:'Revenir à Mes cours'}).click();await expect(page.getByRole('heading',{name:'Anatomie',exact:true})).toBeVisible();await expect(page.locator('.learning-metrics')).toContainText('1');await expect(page.locator('.learning-metrics article').nth(2).locator('strong')).toHaveText('0')
})
test('génération manquante : chapitre transmis, erreur explicite et PDF toujours accessible',async({page})=>{
 const {generations}=await setup(page);await page.getByRole('button',{name:'Reprendre mes révisions'}).click()
 await page.getByRole('combobox',{name:'Chapitre',exact:true}).selectOption('s2');await page.getByRole('button',{name:'Commencer l’interrogation'}).click()
 await expect(page.getByRole('alert')).toContainText('Gemini temporairement indisponible')
 expect(generations).toEqual([{count:4,sectionId:'s2',replace:false}])
 await page.getByRole('button',{name:'Apprendre · PDF'}).click();await expect(page.getByRole('button',{name:'Lire le PDF original'})).toBeVisible()
})
test('responsive : tableau, organisation et interrogation à 320, 375, 768 et 1440 px',async({page})=>{
 await setup(page)
 for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);if(width===375||width===1440)await page.screenshot({path:`/tmp/corpus-active-learning-dashboard-${width}.png`,fullPage:true})}
 await page.getByRole('button',{name:'Reprendre mes révisions'}).click()
 for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:900});await expect(page.getByRole('button',{name:'Commencer l’interrogation'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)}
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/corpus-active-learning-course.png',fullPage:true})
})

test('progression : lecture sans effet, réussites espacées et priorité aux lacunes',async()=>{
 const {progressFor,prioritizeQuestions}=await import('../src/study/learningProgress')
 const questions=[{id:'a',sourceSectionId:'s1'},{id:'b',sourceSectionId:'s1'},{id:'c',sourceSectionId:'s2'}]
 expect(progressFor(questions,{}).percent).toBe(0)
 const records={a:{seen:5,correct:4,wrong:true,due:200},c:{seen:3,correct:3,wrong:false,streak:3,due:300}}
 expect(progressFor(questions,records,100)).toMatchObject({seen:2,weak:1,mastered:1,percent:33,due:0})
 expect(prioritizeQuestions(questions,records,100).map(q=>q.id)).toEqual(['a','b','c'])
 expect(progressFor(questions,records,400).due).toBe(2)
 const remaining=[{id:'a-new',sourceSectionId:'s2'},{id:'z-new',sourceSectionId:'s1'}]
 expect(prioritizeQuestions(remaining,{a:records.a},100,questions).map(q=>q.id)).toEqual(['z-new','a-new'])
})

test('réponse non enregistrée : correction différée et relance avec le même identifiant',async({page})=>{
 await setup(page);const ids:string[]=[]
 await page.route('**/api/study/documents/course-test/attempts',async route=>{const body=route.request().postDataJSON();ids.push(body.id);await route.fulfill(ids.length===1?{status:503,json:{error:'Enregistrement temporairement indisponible'}}:{json:{id:body.id,correct:true,createdAt:'2026-10-28T11:00:00Z'}})})
 await page.getByRole('button',{name:'Reprendre mes révisions'}).click();await page.getByLabel('Nombre de questions').selectOption('3');await page.getByRole('button',{name:'Commencer l’interrogation'}).click();await page.getByRole('button',{name:'A Diaphragme',exact:true}).click();await page.getByRole('button',{name:'Valider ma réponse',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Enregistrement temporairement indisponible')
 await expect(page.getByRole('region',{name:'Correction argumentée'})).toHaveCount(0)
 await page.getByRole('button',{name:'Réessayer l’enregistrement',exact:true}).click();await expect(page.getByRole('region',{name:'Correction argumentée'})).toContainText('Bonne réponse')
 expect(ids).toHaveLength(2);expect(ids[0]).toBe(ids[1])
})

test('génération : le moteur de secours annoncé correspond au résultat reçu',async({page})=>{
 await setup(page)
 await page.route('**/api/study/documents/course-test/questions',async route=>route.fulfill({json:route.request().method()==='POST'?{questions:[],generation:{mode:'local',message:'Gemini indisponible : questions locales vérifiées, quota restitué.'}}:{questions:qs}}))
 await page.getByRole('button',{name:'Reprendre mes révisions'}).click();await page.getByRole('button',{name:'Commencer l’interrogation'}).click()
 await expect(page.locator('.learning-trainer .generation-notice')).toContainText('Génération locale')
 await expect(page.locator('.learning-trainer .generation-notice')).toContainText('quota restitué')
 await expect(page.getByRole('heading',{name:'Question 0 : quelle innervation ?'})).toBeVisible()
})

test('génération tardive : changer de cours conserve les questions du nouveau document',async({page})=>{
 await setup(page)
 const second={...doc,id:'second-course',title:'Deuxième cours',filename:'second.pdf'}
 const secondQuestions=qs.map(q=>({...q,id:'second-'+q.id,documentId:second.id,prompt:'Deuxième cours · '+q.prompt}))
 await page.route('**/api/study/documents',route=>route.fulfill({json:{documents:[doc,second]}}))
 await page.route('**/api/study/documents/second-course',route=>route.fulfill({json:{document:second}}))
 await page.route('**/api/study/documents/second-course/questions',route=>route.fulfill({json:{questions:secondQuestions}}))
 let release=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/api/study/documents/course-test/questions',async route=>{if(route.request().method()==='POST')await gate;await route.fulfill({json:{questions:qs}})})
 try{
  await page.reload();await page.getByRole('button',{name:'Reprendre mes révisions'}).click();await page.getByRole('button',{name:'Commencer l’interrogation'}).click();await expect(page.getByRole('button',{name:'Préparation des questions…'})).toBeDisabled()
  await page.getByRole('button',{name:'Revenir à Mes cours'}).click();await page.getByRole('button',{name:'Ouvrir ce cours'}).nth(1).click();await expect(page.getByRole('heading',{name:'Deuxième cours',exact:true})).toBeVisible()
  const response=page.waitForResponse(r=>r.url().endsWith('/course-test/questions')&&r.request().method()==='POST');release();await response
  await page.getByLabel('Nombre de questions').selectOption('3');await page.getByRole('button',{name:'Commencer l’interrogation'}).click()
  await expect(page.getByRole('heading',{name:'Deuxième cours · Question 0 : quelle innervation ?'})).toBeVisible()
 }finally{release()}
})
