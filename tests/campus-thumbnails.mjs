import {chromium} from '@playwright/test'
import fs from 'node:fs'
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:780,height:700}})
await page.goto('http://127.0.0.1:5173');await page.locator('main[data-loaded=true]').waitFor({timeout:90000})
await page.addStyleTag({content:'.topbar{visibility:hidden!important}.stage,.stage.has-selection{position:fixed!important;inset:0!important;width:780px!important;height:700px!important;border-radius:0!important;border:0!important;z-index:80!important;background:radial-gradient(ellipse,#dceaf1,#f2f7fa 72%)!important}.stage .view-corner,.stage .axis-label{display:none!important}.stage::after,.stage::before{display:none!important}'})
fs.mkdirSync('public/course-previews',{recursive:true})
for(const id of ['FMA7088','FMA7309','FMA7197','FMA7148','FMA7198','FMA7200','FMA7204','FMA50801','FMA24474']){
 await page.evaluate(id=>location.hash='structure='+id,id);await page.locator(`main[data-selected="${id}"][data-loaded=true]`).waitFor({timeout:90000})
 await page.getByRole('button',{name:'Isoler',exact:true}).evaluate(el=>el.click());await page.waitForTimeout(1800)
 await page.locator('.stage').screenshot({path:`public/course-previews/${id}.png`})
}
await browser.close();console.log('9 aperçus issus des maillages anatomiques réels.')
