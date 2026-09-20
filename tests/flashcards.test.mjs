import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {DatabaseSync} from 'node:sqlite'
import {createAccountHandler} from '../server/accounts.mjs'
import {createFlashcardHandler} from '../server/flashcards/handler.mjs'

function api(directory, provider = null) {
  const config = {ACCOUNT_DATA_DIR: directory, APP_ORIGIN: 'https://mycorpus.test'}
  const account = createAccountHandler(config), flashcards = createFlashcardHandler(config, {provider})
  return async (route, method = 'GET', body, cookie = '', headers = {}) => {
    const raw = body === undefined ? '' : JSON.stringify(body), req = Readable.from(raw ? [Buffer.from(raw)] : [])
    req.url = route; req.method = method; req.headers = {cookie, ...(body === undefined ? {} : {'content-type': 'application/json', 'x-mycorpus-request': '1'}), ...headers}; req.socket = {remoteAddress: '127.0.0.1'}
    let status = 200, output = '', responseHeaders = {}
    const res = {writeHead(code, values = {}) { status = code; responseHeaders = {...responseHeaders, ...values} }, setHeader(name, value) { responseHeaders[name] = value }, end(value = '') { output += value }}
    await (route.startsWith('/api/account/') ? account : flashcards)(req, res)
    const cookies = responseHeaders['Set-Cookie'] || responseHeaders['set-cookie'] || [], list = Array.isArray(cookies) ? cookies : [cookies]
    return {status, data: responseHeaders['Content-Type']?.startsWith('text/csv') ? output : output ? JSON.parse(output) : null, cookie: list.map(value => value.split(';')[0]).find(value => value.startsWith('mycorpus_session='))}
  }
}

const password = 'flashcards-solides-2026'
test('decks et cartes : CRUD, recherche, déplacement, duplication et isolation', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-flashcards-')), call = api(directory)
  try {
    const alice = await call('/api/account/register', 'POST', {email: 'alice-flash@example.test', name: 'Alice', password})
    const bob = await call('/api/account/register', 'POST', {email: 'bob-flash@example.test', name: 'Bob', password})
    const deckA = (await call('/api/flashcards/decks', 'POST', {name: 'Cardiologie', subject: 'Physiologie'}, alice.cookie)).data.deck
    const deckB = (await call('/api/flashcards/decks', 'POST', {name: 'À revoir'}, alice.cookie)).data.deck
    assert.equal((await call('/api/flashcards/decks', 'POST', {name: ' cardiologie '}, alice.cookie)).status, 409)
    const created = await call('/api/flashcards/cards', 'POST', {deckId: deckA.id, front: 'Quel est le débit cardiaque ?', back: 'DC = FC × VES', subject: 'Physiologie', chapter: 'Cœur', tags: ['formule'], visual: {type: 'diagram', resourceId: 'heart-flow'}, source: {type: 'catalog_course', courseId: 'FMA7088', sectionId: 'debit-cardiaque', locator: {route: '#tab=cours&cours=FMA7088'}}}, alice.cookie)
    assert.equal(created.status, 201); assert.equal(created.data.card.visual.resourceId, 'heart-flow')
    const id = created.data.card.id
    assert.equal((await call('/api/flashcards/cards?query=débit', 'GET', undefined, alice.cookie)).data.cards.length, 1)
    assert.equal((await call(`/api/flashcards/cards/${id}`, 'PATCH', {front: 'Définir le débit cardiaque.'}, alice.cookie)).data.card.front, 'Définir le débit cardiaque.')
    assert.equal((await call(`/api/flashcards/cards/${id}/move`, 'POST', {deckId: deckB.id}, alice.cookie)).data.card.deckId, deckB.id)
    const copy = await call(`/api/flashcards/cards/${id}/duplicate`, 'POST', {}, alice.cookie)
    assert.equal(copy.status, 201); assert.notEqual(copy.data.card.id, id)
    assert.equal((await call('/api/flashcards/cards', 'GET', undefined, bob.cookie)).data.cards.length, 0)
    assert.equal((await call(`/api/flashcards/cards/${id}`, 'DELETE', {}, bob.cookie)).status, 404)
    assert.equal((await call(`/api/flashcards/cards/${id}`, 'DELETE', {}, alice.cookie)).status, 200)
    assert.equal((await call(`/api/flashcards/decks/${deckB.id}`, 'DELETE', {destinationDeckId: deckA.id}, alice.cookie)).status, 200)
    assert.equal((await call('/api/account/delete', 'POST', {email: 'alice-flash@example.test', password}, alice.cookie)).status, 200)
    const database = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    assert.equal(database.prepare('SELECT COUNT(*) count FROM flashcards WHERE user_id=?').get(alice.data.user.id).count, 0)
    assert.equal(database.prepare('SELECT COUNT(*) count FROM flashcard_decks WHERE user_id=?').get(alice.data.user.id).count, 0)
    database.close()
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

test('révision, statistiques et export Anki restent isolés par compte', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-flash-review-')), call = api(directory)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'review-flash@example.test', name: 'Révision', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'UE 3'}, user.cookie)).data.deck
    const card = (await call('/api/flashcards/cards', 'POST', {deckId: deck.id, front: 'Recto', back: 'Verso', tags: []}, user.cookie)).data.card
    assert.equal((await call('/api/flashcards/review', 'GET', undefined, user.cookie)).data.cards.length, 1)
    const review = await call(`/api/flashcards/cards/${card.id}/review`, 'POST', {rating: 'good', responseMs: 2300}, user.cookie)
    assert.equal(review.status, 200); assert.equal(review.data.review.lastRating, 'good')
    const stats = (await call('/api/flashcards/stats', 'GET', undefined, user.cookie)).data.stats
    assert.equal(stats.total, 1); assert.equal(stats.reviews, 1); assert.equal(stats.successRate, 100)
    const exported = await call('/api/flashcards/export', 'POST', {deckId: deck.id}, user.cookie)
    assert.match(exported.data, /#separator:Comma/); assert.match(exported.data, /Recto/)
    assert.equal((await call('/api/flashcards/cards', 'POST', {deckId: deck.id, front: '', back: 'x'}, user.cookie)).status, 400)
    assert.equal((await call('/api/flashcards/cards', 'POST', {deckId: deck.id, front: 'x', back: 'y'}, user.cookie, {origin: 'https://evil.test'})).status, 403)
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

test('toute génération produit des brouillons non persistés, y compris le texte libre', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-flash-generation-')), call = api(directory)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'generate-flash@example.test', name: 'Génération', password})
    const text = 'Le débit cardiaque est le produit de la fréquence cardiaque par le volume d’éjection systolique. La pression artérielle dépend du débit cardiaque et des résistances périphériques. Le nœud sinusal assure normalement le rythme du cœur.'
    const generated = await call('/api/flashcards/generate/text', 'POST', {text, level: 'standard', count: 8, subject: 'Physiologie'}, user.cookie)
    assert.equal(generated.status, 200); assert.ok(generated.data.drafts.length >= 1); assert.equal(generated.data.generation.persisted, false)
    assert.equal((await call('/api/flashcards/cards', 'GET', undefined, user.cookie)).data.cards.length, 0)
    assert.equal((await call('/api/flashcards/generate/text', 'POST', {text: 'trop court'}, user.cookie)).status, 400)
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

test('la génération fournisseur respecte le quota et libère la réservation avant le repli local', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-flash-provider-'))
  try {
    const connected = api(directory, {async generateFlashcards() { return [{front: 'Quel est le rôle du rein ?', back: 'Le rein filtre le plasma et participe à l’homéostasie. Espace extracellulaire et pression.'}] }})
    const user = await connected('/api/account/register', 'POST', {email: 'provider-flash@example.test', name: 'Provider', password})
    const text = 'Le rein filtre le plasma et participe à l’homéostasie du milieu intérieur. Il ajuste les quantités d’eau et de solutés éliminées dans les urines.'
    const generated = await connected('/api/flashcards/generate/text', 'POST', {text, level: 'essential', count: 5}, user.cookie)
    assert.equal(generated.data.generation.mode, 'provider')
    const database = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    assert.equal(database.prepare('SELECT generations_used used FROM study_quotas WHERE user_id=?').get(user.data.user.id).used, 1)
    database.close()
    const failing = api(directory, {async generateFlashcards() { throw new Error('provider timeout') }})
    const fallback = await failing('/api/flashcards/generate/text', 'POST', {text, level: 'standard', count: 5}, user.cookie)
    assert.equal(fallback.data.generation.mode, 'local')
    const after = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    assert.equal(after.prepare('SELECT generations_used used FROM study_quotas WHERE user_id=?').get(user.data.user.id).used, 1)
    after.close()
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

test('la génération Study reste limitée au document, aux sections et aux pages du propriétaire', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-flash-study-')), call = api(directory)
  try {
    const alice = await call('/api/account/register', 'POST', {email: 'study-flash@example.test', name: 'Study', password})
    const bob = await call('/api/account/register', 'POST', {email: 'study-bob@example.test', name: 'Bob', password})
    await call('/api/flashcards/stats', 'GET', undefined, alice.cookie)
    const database = new DatabaseSync(path.join(directory, 'mycorpus.sqlite')), now = new Date().toISOString(), documentId = 'document-study-flash'
    database.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,status,created_at,updated_at) VALUES(?,?,?,?,?,?,'ready',?,?)").run(documentId, alice.data.user.id, 'Cours rénal', 'renal.pdf', 1000, 8, now, now)
    database.prepare('INSERT INTO study_sections(id,document_id,user_id,title,section_order,start_page,end_page,content,token_count) VALUES(?,?,?,?,?,?,?,?,?)').run('renal-filtration', documentId, alice.data.user.id, 'Filtration glomérulaire', 1, 2, 3, 'La filtration glomérulaire est le passage d’une fraction du plasma vers la capsule de Bowman. La barrière de filtration retient normalement les cellules sanguines et la majorité des protéines.', 30)
    database.prepare('INSERT INTO study_sections(id,document_id,user_id,title,section_order,start_page,end_page,content,token_count) VALUES(?,?,?,?,?,?,?,?,?)').run('renal-tubule', documentId, alice.data.user.id, 'Tubule rénal', 2, 5, 7, 'Le tubule rénal assure la réabsorption sélective de nombreux solutés filtrés. La sécrétion tubulaire ajoute certaines substances au fluide tubulaire.', 26)
    database.close()
    const generated = await call('/api/flashcards/generate/study', 'POST', {documentId, sectionIds: ['renal-tubule'], startPage: 5, endPage: 6, level: 'complete', count: 8}, alice.cookie)
    assert.equal(generated.status, 200); assert.ok(generated.data.drafts.length); assert.ok(generated.data.drafts.every(draft => draft.source.documentId === documentId && draft.source.sectionId === 'renal-tubule'))
    assert.equal((await call('/api/flashcards/generate/study', 'POST', {documentId, sectionIds: ['renal-tubule'], level: 'standard'}, bob.cookie)).status, 404)
  } finally { rmSync(directory, {recursive: true, force: true}) }
})
