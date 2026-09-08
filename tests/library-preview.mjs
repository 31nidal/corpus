import {chromium} from '@playwright/test'
const base=process.env.CORPUS_URL||'http://127.0.0.1:4180'
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[]
page.on('pageerror',e=>errors.push(e.message))
page.on('response',r=>{if(r.status()>=400)failed.push(r.url())})
async function shot(name){await page.waitForTimeout(350);await page.screenshot({path:'tests/artifacts/'+name+'.png'});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Débordement : '+name)}
try{
 await page.goto(base+'/#tab=cours');await page.locator('.course-tile').first().waitFor();await shot('library-desktop')
 await page.getByRole('button',{name:/La cellule : organites/}).click();await shot('library-chapter')
 await page.locator('.interactive-diagram').scrollIntoViewIfNeeded();await shot('library-diagram-desktop')
 await page.locator('.course-flow').scrollIntoViewIfNeeded();await page.locator('.course-case summary').click();await shot('library-chapter-application')
 await page.getByRole('button',{name:'Entraînement',exact:true}).click();await shot('library-practice')
 await page.locator('.chapter-bank').scrollIntoViewIfNeeded();await shot('library-question-bank')
 await page.setViewportSize({width:393,height:852});await page.goto(base+'/#tab=cours&cours=organelles');await page.locator('.course-article').waitFor();await shot('library-mobile-chapter')
 await page.getByRole('button',{name:'Activer le thème sombre'}).click();await page.locator('.course-case').scrollIntoViewIfNeeded();await shot('library-mobile-dark')
 console.log(JSON.stringify({errors,failed}));if(errors.length||failed.length)throw Error('Erreurs de chargement')
}finally{await browser.close()}
