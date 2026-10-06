import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const phase = process.argv[2] || 'after'
if (!['before', 'after'].includes(phase)) throw new Error('Phase: before ou after')
const baseUrl = process.argv[3] || 'http://127.0.0.1:5173'
if (!['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname)) throw new Error('Serveur local requis')
const output = new URL('../tests/artifacts/design/graphics/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage()
  for (const [screen, width, height] of [['atlas',1440,900],['atlas',1366,768],['matieres',1440,900],['matieres',1024,768],['matieres',390,844]]) {
    for (const theme of ['light','dark']) {
      await page.setViewportSize({ width, height })
      await page.goto(`${baseUrl}/${screen==='matieres'?'#tab=cours':'#mode=detail'}`)
      await page.locator(screen==='atlas'?'main[data-loaded="true"]':'.subject-directory').waitFor({ timeout:90000 })
      if (screen==='atlas') await page.getByRole('button',{name:'Systèmes',exact:true}).click()
      if (await page.locator('html').getAttribute('data-theme')!==theme) await page.getByRole('button',{name:theme==='dark'?'Activer le thème sombre':'Activer le thème clair',exact:true}).click()
      await page.waitForFunction(value => document.documentElement.dataset.theme === value, theme)
      await page.evaluate(async()=>{
        await document.fonts.ready
        for (const font of ['DM Sans Variable','Manrope Variable']) {
          if (!document.fonts.check(`16px "${font}"`)) throw new Error(`Police non chargée: ${font}`)
        }
      })
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
      await page.screenshot({ animations: 'disabled', path:new URL(`${phase}-${screen}-${width}x${height}-${theme}.png`,output).pathname })
    }
  }
} finally { await browser.close() }
