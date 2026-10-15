import {test, expect, type Page, type TestInfo} from '@playwright/test'
import {referencePdf} from './helpers/study-v2-pdf'

// Optional external audit runner; axe is kept outside the application bundle.
async function audit(page: Page, info: TestInfo, state: string) {
  if (!process.env.STUDY_AXE_SCRIPT) return
  // Audit settled colors, not interpolated frames during the theme transition.
  await page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all(document.getAnimations().filter(animation =>
      animation.playState === 'running' && animation.playbackRate !== 0 &&
      animation.effect?.getTiming().iterations !== Infinity,
    ).map(animation => animation.finished.catch(() => {})))
  })
  await page.addScriptTag({path: process.env.STUDY_AXE_SCRIPT})
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as {axe: {
      run: (context: unknown, options: unknown) => Promise<{violations: {
        id: string; impact: string; description: string; nodes: {target: string[]; failureSummary: string}[]
      }[]}>
    }}).axe
    return axe.run({include: [['.sv2-workspace']]}, {
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']},
    })
  })
  await info.attach(`accessibility-${state}`, {
    body: JSON.stringify(result.violations, null, 2), contentType: 'application/json',
  })
  expect(result.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([])
}

for (const theme of ['light', 'dark']) test(`Study 2.0 accessibilité ${theme} : noms, texte PDF exposé, parcours clavier et fiches`, async ({page}, info) => {
  await page.emulateMedia({reducedMotion: 'reduce'})
  const registered = await page.request.post('/api/account/register', {
    headers: {'x-mycorpus-request': '1'},
    data: {name: 'Accessibilité', email: `a11y-${crypto.randomUUID()}@example.test`, password: 'Accessibilite-test-2026'},
  })
  expect(registered.status()).toBe(201)
  await page.goto('/#tab=mes-cours')
  await page.getByRole('button', {name: 'Essayer Study 2.0 · bêta', exact: true}).click()
  if (theme === 'dark') {
    await page.getByRole('button', {name: 'Activer le thème sombre', exact: true}).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    // Separate stable page state from the transient theme-switch rendering.
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  }
  const library = page.getByRole('region', {name: 'Mes cours Study 2.0', exact: true})
  await expect(library.getByRole('status').last()).toContainText('0 cours')
  expect(await library.ariaSnapshot()).toContain('button "Choisir un PDF"')
  await audit(page, info, `library-${theme}`)
  const chooser = page.getByRole('button', {name: 'Choisir un PDF', exact: true})
  await chooser.focus()
  const chosen = page.waitForEvent('filechooser')
  await chooser.press('Enter')
  await (await chosen).setFiles({name: 'clavier.pdf', mimeType: 'application/pdf', buffer: referencePdf()})
  await expect(library.getByRole('checkbox')).not.toBeChecked()
  const submit = page.getByRole('button', {name: 'Importer le PDF', exact: true})
  await submit.focus(); await submit.press('Enter')
  await expect(page.locator('.sv2-document-card .sv2-state')).toHaveText('Prêt', {timeout: 30000})
  const open = page.locator('.sv2-document-open')
  await open.focus(); await open.press('Enter')
  const reader = page.getByRole('region', {name: 'Lecteur du PDF original', exact: true})
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  const tree = await reader.ariaSnapshot()
  expect(tree).toContain('Le rein filtre le plasma sanguin.')
  expect(tree).toContain('spinbutton "Page du PDF"')
  const scroll = reader.getByRole('group', {name: 'Page PDF à faire défiler', exact: true})
  await scroll.focus()
  await expect(scroll).toBeFocused()
  await expect(scroll).toHaveAttribute('tabindex', '0')
  await audit(page, info, `reader-${theme}`)
  const next = reader.getByRole('button', {name: 'Page suivante', exact: true})
  await next.focus(); await next.press('Enter')
  await expect(reader.getByRole('status')).toContainText('Page 2 affichée')
  const notes = page.getByRole('navigation', {name: 'Espaces du cours'}).getByRole('button', {name: 'Fiches de révision', exact: true})
  await notes.focus(); await notes.press('Enter')
  await expect(notes).toHaveAttribute('aria-pressed', 'true')
  const generate = page.getByRole('button', {name: 'Générer un brouillon de fiche', exact: true})
  await generate.focus(); await generate.press('Enter')
  const editor = page.getByRole('region', {name: 'Édition de la fiche', exact: true})
  await expect(editor).toBeVisible({timeout: 30000})
  await expect(editor.getByRole('textbox', {name: 'Titre de la fiche', exact: true})).toBeVisible()
  await audit(page, info, `note-editor-${theme}`)
})
