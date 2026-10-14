import {test, expect, type Page} from '@playwright/test'
import {referencePdf} from './helpers/study-v2-pdf'
import type {QuestionSet, TrainingAttempt} from '../src/study/v2/questionTypes'
const headers = {'x-mycorpus-request': '1'}

async function prepare(page: Page) {
  expect((await page.request.post('/api/account/register', {headers, data: {name: 'QCM', email: `qcm-${crypto.randomUUID()}@example.test`, password: 'QCM-test-solide-2026'}})).status()).toBe(201)
  await page.goto('/#tab=mes-cours')
  await page.getByRole('button', {name: 'Essayer Study 2.0 · bêta', exact: true}).click()
  await page.getByLabel('Fichier PDF', {exact: true}).setInputFiles({name: 'rein.pdf', mimeType: 'application/pdf', buffer: referencePdf()})
  await page.getByRole('button', {name: 'Importer le PDF', exact: true}).click()
  await expect(page.locator('.sv2-document-card .sv2-state')).toHaveText('Prêt', {timeout: 30000})
  await page.locator('.sv2-document-open').click()
  await expect(page.locator('.sv2-text-layer')).toContainText('Le rein filtre le plasma sanguin.')
  return new URLSearchParams(new URL(page.url()).hash.slice(1)).get('doc')!
}

// Browser contract fixture only. Real generation, ownership, verification and
// training routes are exercised independently in study-v2-questions.test.mjs.
async function mockQuestions(page: Page, doc: string) {
  let set: QuestionSet | null = null, attempt: TrainingAttempt | null = null, failAnswer = false
  const posts: Record<string, unknown>[] = []
  await page.route(`**/api/study/v2/documents/${doc}/**`, async route => {
    const path = new URL(route.request().url()).pathname.split(`/documents/${doc}/`)[1], method = route.request().method()
    if (!/^(question-sets|training)/.test(path)) return route.continue()
    const body = method === 'POST' || method === 'PATCH' ? route.request().postDataJSON() : {}
    const reply = (value: unknown, status = 200) => route.fulfill({status, json: value})
    if (method === 'POST' && path === 'question-sets') {
      posts.push(body)
      const option = (text: string, correct: boolean) => ({text, correct, relation: correct ? 'supports' as const : 'contradicts' as const, explanation: correct ? 'Le cours décrit explicitement cette fonction du rein.' : 'Le cours contredit cette négation de la fonction rénale.', sourceSectionId: 's1', sourceExcerpt: 'Le rein filtre le plasma sanguin.', page: 1, endPage: 1, exactPage: true})
      set = {id: 'set-1', documentId: doc, title: 'QCM du rein', sourceVersion: 1, settings: body, sections: [], createdAt: Date.now(), updatedAt: Date.now(),
        jobs: [], questions: [{...body, id: 'q-1', prompt: 'Quelles propositions décrivent la fonction du rein ?', options: [option('Le rein filtre le plasma sanguin.', true), option('Le rein ne filtre pas le plasma sanguin.', false), option(body.format === 'multiple' ? 'Le rein assure la filtration glomérulaire.' : 'Le rein n’assure pas la filtration glomérulaire.', body.format === 'multiple')], status: 'draft', version: 1, validation: {passed: true}}]}
      return reply({set, job: {id: 'job-1', state: 'succeeded'}}, 202)
    }
    if (method === 'GET' && path === 'question-sets') return reply({sets: set ? [{...set, count: 1, validated: set.questions.filter(q => q.status === 'validated').length}] : []})
    if (method === 'GET' && path === 'question-sets/set-1') return reply({set})
    if (method === 'PATCH' && path === 'question-sets/set-1/questions/q-1' && set) {
      const old = set.questions[0]
      set.questions[0] = {...old, ...body.content, status: body.status || (body.content ? 'draft' : old.status), version: old.version + 1, validation: body.content ? {passed: false, edited: true} : old.validation}
      return reply({question: set.questions[0]})
    }
    const showAttempt = () => attempt && ({...attempt, questions: attempt.questions.map(q => ({...q, options: attempt!.finishedAt || attempt!.mode === 'immediate' && q.answer ? q.options : q.options.map(option => ({text: option.text})), isCorrect: attempt!.finishedAt || attempt!.mode === 'immediate' && q.answer ? JSON.stringify(q.answer) === JSON.stringify(q.correct) : undefined, correct: attempt!.finishedAt || attempt!.mode === 'immediate' && q.answer ? q.correct : undefined}))})
    if (method === 'POST' && path === 'question-sets/set-1/train' && set) {
      attempt = {id: 'attempt-1', setId: set.id, documentId: doc, mode: body.mode, createdAt: Date.now(), finishedAt: null, score: null, answered: 0, total: 1, questions: set.questions.map(q => ({id: q.id, prompt: q.prompt, format: q.format, options: q.options, answer: null, correct: q.options.flatMap((o, i) => o.correct ? [i] : [])}))}
      return reply({attempt: showAttempt()}, 201)
    }
    if (method === 'GET' && path === 'training') return reply({attempts: attempt ? [attempt] : []})
    if (method === 'GET' && path === 'training/attempt-1') return reply({attempt: showAttempt()})
    if (method === 'POST' && path === 'training/attempt-1/answer' && attempt) {
      if (failAnswer) {failAnswer = false; return route.abort('failed')}
      attempt.questions[0].answer = body.selected; attempt.answered = 1
      return reply({attempt: showAttempt()})
    }
    if (method === 'POST' && path === 'training/attempt-1/finish' && attempt) {
      attempt.finishedAt = Date.now(); attempt.score = JSON.stringify(attempt.questions[0].answer) === JSON.stringify(attempt.questions[0].correct) ? 1 : 0
      return reply({attempt: showAttempt()})
    }
    return reply({error: 'Route non prévue dans la fixture navigateur.'}, 400)
  })
  return {posts, failNextAnswer() {failAnswer = true}}
}

const workspace = (page: Page) => page.getByRole('region', {name: 'QCM et entraînements', exact: true})
async function generate(page: Page, format = 'multiple') {
  await page.getByRole('navigation', {name: 'Espaces du cours'}).getByRole('button', {name: 'QCM et entraînements', exact: true}).click()
  await workspace(page).getByRole('button', {name: 'Nouvelle série QCM', exact: true}).click()
  await workspace(page).getByRole('combobox', {name: 'Format', exact: true}).selectOption(format)
  await workspace(page).getByRole('button', {name: 'Générer les QCM', exact: true}).click()
  await expect(workspace(page).getByRole('article')).toHaveCount(1)
}
async function validate(page: Page) {
  await workspace(page).getByRole('checkbox', {name: 'J’ai relu les propositions, leurs explications et les sources.', exact: true}).check()
  await workspace(page).getByRole('button', {name: 'Valider après relecture', exact: true}).click()
  await expect(workspace(page)).toContainText('Validé après relecture')
}
test('QCM V2 contrat UI : édition, preuve, validation humaine, multi, correction différée et historique', async ({page}) => {
  const doc = await prepare(page); await mockQuestions(page, doc); await generate(page)
  await expect(workspace(page).getByRole('button', {name: 'S’entraîner sur les questions validées'})).toBeDisabled()
  await workspace(page).getByRole('button', {name: 'Modifier la question', exact: true}).click()
  await workspace(page).getByRole('textbox', {name: 'Énoncé', exact: true}).fill('Quelles propositions décrivent précisément la fonction du rein ?')
  await workspace(page).getByRole('button', {name: 'Enregistrer les modifications', exact: true}).click()
  await expect(workspace(page)).toContainText('Formulation modifiée')
  await validate(page)
  await workspace(page).getByRole('combobox', {name: 'Correction', exact: true}).selectOption('deferred')
  await workspace(page).getByRole('button', {name: 'S’entraîner sur les questions validées'}).click()
  const training = page.getByRole('region', {name: 'Entraînement QCM', exact: true})
  await training.getByRole('checkbox', {name: 'Le rein filtre le plasma sanguin.', exact: true}).check()
  await training.getByRole('checkbox', {name: 'Le rein assure la filtration glomérulaire.', exact: true}).check()
  await training.getByRole('button', {name: 'Enregistrer la réponse', exact: true}).click()
  await expect(training).not.toContainText('Réponse correcte.')
  await training.getByRole('button', {name: 'Terminer et afficher la correction', exact: true}).click()
  await expect(training).toContainText('Score : 1/1')
  await training.getByText('Preuve · page 1', {exact: true}).first().click()
  await training.getByRole('button', {name: 'Voir dans le cours', exact: true}).first().click()
  await expect(page.locator('.sv2-reader')).toBeVisible()
  await page.getByRole('navigation', {name: 'Espaces du cours'}).getByRole('button', {name: 'QCM et entraînements', exact: true}).click()
  await expect(training).toContainText('Score : 1/1')
  await training.getByRole('button', {name: 'Retour aux séries et à l’historique'}).click()
  await expect(page.getByRole('region', {name: 'Historique QCM'})).toContainText('1/1')
  await page.screenshot({path: 'tests/artifacts/design/study-v2-qcm-desktop.png', fullPage: true})
})
test('QCM V2 contrat UI mobile : réponse unique, erreur réseau, Réessayer et aucune perte de sélection', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  const doc = await prepare(page), mock = await mockQuestions(page, doc)
  await generate(page, 'single'); await validate(page)
  await workspace(page).getByRole('button', {name: 'S’entraîner sur les questions validées'}).click()
  const training = page.getByRole('region', {name: 'Entraînement QCM', exact: true})
  await training.getByRole('radio', {name: 'Le rein filtre le plasma sanguin.', exact: true}).check()
  mock.failNextAnswer()
  await training.getByRole('button', {name: 'Enregistrer la réponse', exact: true}).click()
  await expect(training.getByRole('alert')).toContainText('Connexion au serveur impossible.')
  await expect(training.getByRole('radio', {name: 'Le rein filtre le plasma sanguin.', exact: true})).toBeChecked()
  await training.getByRole('button', {name: 'Réessayer', exact: true}).click()
  await expect(training).toContainText('Réponse correcte.')
  expect(await page.locator('.sv2-workspace').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy()
  await page.screenshot({path: 'tests/artifacts/design/study-v2-qcm-mobile.png', fullPage: true})
})
test('QCM V2 sans Gemini : erreur explicite, pas de faux QCM local', async ({page}) => {
  await prepare(page)
  await page.getByRole('navigation', {name: 'Espaces du cours'}).getByRole('button', {name: 'QCM et entraînements', exact: true}).click()
  await workspace(page).getByRole('button', {name: 'Nouvelle série QCM', exact: true}).click()
  await workspace(page).getByRole('button', {name: 'Générer les QCM', exact: true}).click()
  await expect(workspace(page)).toContainText('nécessite Gemini', {timeout: 30000})
  await expect(workspace(page).getByRole('article')).toHaveCount(0)
})
