import {test,expect,type Page} from '@playwright/test'
import {questions} from '../src/study/questions'
import {courses} from '../src/study/curriculum'
import {nextReview} from '../src/study/reviewSchedule'
const q=questions.find(q=>q.course==='orientation')!,course=courses.find(c=>c.id===q.course)!
async function seed(page:Page) {
 await page.addInitScript(({id,course})=>{
  const now=Date.now()
  localStorage.setItem('corpus-practice-v1',JSON.stringify({[id]:{seen:2,correct:0,wrong:true,due:now-1000,lastReviewed:now-86400000,streak:0,interval:.25}}))
  localStorage.setItem('corpus-reading-v1',JSON.stringify({[course]:{percent:62,updatedAt:now,section:'0'}}))
 },{id:q.id,course:course.id})
}
async function answerCorrect(page:Page) {
 const prompt=await page.locator('.question-layout h1').innerText()
 const question=questions.find(q=>q.prompt===prompt)!
 for(const index of question.correct)await page.locator('.answer-options button').filter({hasText:question.options[index]}).click()
}
for(const width of [1440,390])for(const theme of ['light','dark']) {
 test(`dashboard : nouvel utilisateur, navigation, thème ${theme}, ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844})
  await page.addInitScript(theme=>localStorage.setItem('corpus-theme',theme),theme)
  const requests:string[]=[];page.on('request',r=>requests.push(r.url()))
  await page.goto('/#tab=aujourdhui')
  await expect(page.getByRole('heading',{name:'À faire aujourd’hui'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Commencer ma session'})).toBeDisabled()
  await expect(page.getByRole('heading',{name:'Votre première étape commence ici.'})).toBeVisible()
  expect(requests.some(url=>/models\/.*(glb|manifest)|PracticeWorkspace|AtlasWorkspace|study\/curriculum\.ts|study\/questions\.ts|account\/AccountPanel\.tsx|AnatomyViewer|three\/build/.test(url))).toBe(false)
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const nav=page.getByRole('navigation',{name:width<700?'Navigation pédagogique mobile':'Navigation principale'})
  const today=nav.getByRole('link',{name:'Aujourd’hui',exact:true})
  await expect(today).toHaveAttribute('aria-current','page')
  expect(await today.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true)
  await page.screenshot({path:`tests/artifacts/design/dashboard/empty-${width}-${theme}.png`})
  await page.getByRole('button',{name:'Maîtrise',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Votre carte de maîtrise'})).toBeVisible()
  await page.getByRole('button',{name:'Mes faiblesses',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Aucune erreur à retravailler.'})).toBeVisible()
 })
}
test('dashboard : erreurs dues, cours commencé, session cohérente et amélioration du carnet',async({page})=>{
 await seed(page);await page.goto('/#tab=aujourdhui')
 await expect(page.getByRole('button',{name:/Continuer .*62% lu/})).toBeVisible()
 await expect(page.getByRole('button',{name:/Revoir 1 erreur due/})).toBeEnabled()
 await page.getByRole('button',{name:'Commencer ma session'}).click()
 await expect(page).toHaveURL(/revision=errors-due/)
 await expect(page.locator('.question-layout h1')).toHaveText(q.prompt)
 await answerCorrect(page);await page.getByRole('button',{name:'Valider ma réponse'}).click()
 await page.getByRole('button',{name:'Terminer et voir mon bilan'}).click()
 await expect.poll(()=>page.evaluate(id=>JSON.parse(localStorage.getItem('corpus-practice-v1')!)[id].wrong,q.id)).toBe(false)
 await page.getByRole('button',{name:'Continuer ma session'}).click()
 await expect(page).toHaveURL(/revision=chapter/)
 await page.goto('/#tab=aujourdhui');await page.getByRole('button',{name:'Mes faiblesses',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Aucune erreur à retravailler.'})).toBeVisible()
})
test('maîtrise et carnet : chapitre faible, actions cours et QCM',async({page})=>{
 await seed(page);await page.goto('/#tab=aujourdhui')
 await page.getByRole('button',{name:'Maîtrise',exact:true}).click()
 const chapter=page.locator('.dashboard-chapter').filter({hasText:course.title}).first()
 await chapter.getByRole('button',{name:'Réviser',exact:true}).click()
 await expect(page).toHaveURL(new RegExp('cours='+q.course))
 await expect(page.locator('.question-layout')).toBeVisible()
 await page.goto('/#tab=aujourdhui');await page.getByRole('button',{name:'Mes faiblesses',exact:true}).click()
 await expect(page.locator('.dashboard-mastery-grid')).toContainText('1 erreurs actuelles')
 await expect(page.locator('.dashboard-mastery-grid')).toContainText('2 tentatives')
 await page.getByRole('button',{name:'Voir le cours',exact:true}).click()
 await expect(page).toHaveURL(/tab=cours/)
 await expect(page.locator('.course-section').first()).toBeVisible()
})
test('dashboard connecté : flashcards dues, progression FSRS et lancement prioritaire',async({page})=>{
 await seed(page)
 const state={'corpus-practice-v1':JSON.stringify({[q.id]:nextReview(undefined,false,Date.now()-86400000)})}
 await page.route('**/api/account/session',r=>r.fulfill({json:{available:true,user:{id:'student',name:'Étudiant',email:'student@example.test'},state}}))
 await page.route('**/api/account/history',r=>r.fulfill({json:{items:[]}}))
 await page.route('**/api/flashcards/**',r=>{const path=new URL(r.request().url()).pathname;return r.fulfill({json:path.endsWith('/stats')?{stats:{total:30,eligibleDue:23,dueToday:25,mastered:7,reviewedToday:4,subjects:[],courses:[],decks:[]}}:path.endsWith('/decks')?{decks:[]}:{cards:[],nextCursor:null}})})
 await page.goto('/#tab=aujourdhui')
 await expect(page.getByRole('button',{name:/Réviser 23 flashcards/})).toBeEnabled()
 await expect(page.getByText(/4 réponses flashcards enregistrées/)).toBeVisible()
 await page.getByRole('button',{name:'Commencer ma session'}).click()
 await expect(page).toHaveURL(/tab=flashcards&revision=due/)
 await expect(page.getByRole('heading',{name:'Session terminée'})).toBeVisible()
 await page.getByRole('button',{name:'Continuer ma session'}).click()
 await expect(page).toHaveURL(/revision=errors-due/)
})
test('dashboard : données flashcards indisponibles sans fausses statistiques',async({page})=>{
 await page.route('**/api/account/session',r=>r.fulfill({json:{available:true,user:{id:'student',name:'Étudiant'},state:{}}}))
 await page.route('**/api/flashcards/stats',r=>r.fulfill({status:503,json:{error:'Unavailable'}}))
 await page.goto('/#tab=aujourdhui')
 await expect(page.getByRole('status')).toContainText('statistiques flashcards sont indisponibles')
 await expect(page.getByRole('button',{name:'Commencer ma session'})).toBeDisabled()
})
test('lecture : progression conservée et cours proposé au dashboard',async({page})=>{
 await page.goto('/#tab=cours&cours=orientation')
 await expect(page.locator('.course-section').first()).toBeVisible()
 await page.locator('.courses-workspace').evaluate(e=>e.scrollTo(0,e.scrollHeight*.5))
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('corpus-reading-v1')||'{}').orientation?.percent??0)).toBeGreaterThan(0)
 await page.goto('/#tab=aujourdhui')
 await expect(page.getByRole('button',{name:/Continuer .*% lu/})).toBeVisible()
})
