import {chromium} from '@playwright/test'
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.goto(process.env.CORPUS_URL||'http://127.0.0.1:5173');await page.locator('main[data-loaded=true]').waitFor({timeout:90000});await page.waitForTimeout(1800)
await page.screenshot({path:'tests/artifacts/campus-atlas.png'})
await page.getByRole('button',{name:'Cours',exact:true}).click();await page.screenshot({path:'tests/artifacts/campus-courses.png'})
await page.getByRole('button',{name:/Se repérer dans le corps/}).click();await page.screenshot({path:'tests/artifacts/campus-reading.png'})
await page.getByRole('button',{name:'Entraînement',exact:true}).click();await page.screenshot({path:'tests/artifacts/campus-practice.png'})
await page.getByRole('button',{name:'Commencer la série'}).click();await page.screenshot({path:'tests/artifacts/campus-question.png'})
await page.setViewportSize({width:393,height:852});await page.screenshot({path:'tests/artifacts/campus-mobile-question.png'})
await page.getByRole('button',{name:'Cours',exact:true}).click();await page.screenshot({path:'tests/artifacts/campus-mobile-courses.png'})
await page.getByRole('button',{name:'Atlas 3D',exact:true}).click();await page.waitForTimeout(1800);await page.screenshot({path:'tests/artifacts/campus-mobile-atlas.png'})
console.log(JSON.stringify({errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));await browser.close()
