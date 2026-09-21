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
    assert.equal((await call('/api/flashcards/cards?tag=form', 'GET', undefined, alice.cookie)).data.cards.length, 0)
    assert.equal((await call('/api/flashcards/cards?tag=formule', 'GET', undefined, alice.cookie)).data.cards.length, 1)
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
    const duplicate = await call(`/api/flashcards/cards/${card.id}/review`, 'POST', {rating: 'easy', expectedDueAt: card.review.dueAt}, user.cookie)
    assert.equal(duplicate.status, 409)
    const stats = (await call('/api/flashcards/stats', 'GET', undefined, user.cookie)).data.stats
    assert.equal(stats.total, 1); assert.equal(stats.reviews, 1); assert.equal(stats.successRate, 100)
    const exported = await call('/api/flashcards/export', 'POST', {deckId: deck.id}, user.cookie)
    assert.match(exported.data, /#separator:Comma/); assert.match(exported.data, /Recto/)
    assert.match((await call('/api/flashcards/export', 'POST', {deckIds: [deck.id]}, user.cookie)).data, /Recto/)
    assert.doesNotMatch((await call('/api/flashcards/export', 'POST', {deckIds: ['inconnu']}, user.cookie)).data, /"Recto"/)
    assert.equal((await call('/api/flashcards/export', 'POST', {deckIds: 'invalide'}, user.cookie)).status, 400)
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
    assert.equal((await call('/api/flashcards/generate/unknown', 'POST', {text}, user.cookie)).status, 404)
    assert.equal((await call('/api/flashcards/generate/text', 'POST', {text, count: 2.5}, user.cookie)).status, 400)
    const qcm = {front: 'Quel plan sépare la droite et la gauche ?', back: 'Plan sagittal — Il sépare les deux côtés.'}
    const correction = await call('/api/flashcards/generate/qcm-error', 'POST', {qcm, courseId: 'orientation'}, user.cookie)
    assert.equal(correction.status, 200)
    assert.equal(correction.data.drafts[0].front, qcm.front)
    assert.equal(correction.data.drafts[0].back, qcm.back)
    assert.equal(correction.data.generation.persisted, false)
    assert.equal((await call('/api/flashcards/cards', 'GET', undefined, user.cookie)).data.cards.length, 0)
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

test('la génération fournisseur respecte le quota et libère la réservation avant le repli local', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-flash-provider-'))
  try {
    const connected = api(directory, {async generateFlashcards() { return [{front: 'Quel est le rôle du rein ?', back: 'Le rein filtre le plasma et participe à l’homéostasie du milieu intérieur.', sourceExcerpt: 'Le rein filtre le plasma et participe à l’homéostasie du milieu intérieur.'}] }})
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
    const invented = api(directory, {async generateFlashcards() { return [{front: 'Quel est le rôle du rein ?', back: 'Le rein produit la bile.', sourceExcerpt: text}] }})
    const rejected = await invented('/api/flashcards/generate/text', 'POST', {text, count: 5}, user.cookie)
    assert.equal(rejected.data.generation.mode, 'local')
    assert.ok(rejected.data.drafts.every(card => !card.back.includes('bile')))
    const checked = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    assert.equal(checked.prepare('SELECT generations_used used FROM study_quotas WHERE user_id=?').get(user.data.user.id).used, 1)
    checked.close()
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
    assert.equal((await call('/api/flashcards/generate/study', 'POST', {documentId, startPage: 7, endPage: 2}, alice.cookie)).status, 400)
    assert.equal((await call('/api/flashcards/generate/study', 'POST', {documentId, startPage: 0}, alice.cookie)).status, 400)
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

test('enregistrement par lot : validation de chaque carte et aucun enregistrement partiel', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-flash-bulk-')), call = api(directory)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'bulk@example.test', name: 'Lot', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'Anatomie'}, user.cookie)).data.deck
    const card = {deckId: deck.id, front: 'Question complète', back: 'Réponse complète'}
    for (const invalid of [{deckId: deck.id}, {...card, deckId: 'inconnu'}, {...card, source: {type: 'study_document', documentId: 'inconnu'}}]) {
      const result = await call('/api/flashcards/cards/bulk', 'POST', {cards: [card, invalid]}, user.cookie)
      assert.equal(result.status, 400)
      assert.equal((await call('/api/flashcards/cards', 'GET', undefined, user.cookie)).data.cards.length, 0)
    }
    const result = await call('/api/flashcards/cards/bulk', 'POST', {cards: [card, {...card, front: 'Deuxième question'}]}, user.cookie)
    assert.equal(result.status, 201)
    assert.equal(result.data.cards.length, 2)
    const payload = {cards: [card], requestId: 'retry-after-network-loss'}
    const first = await call('/api/flashcards/cards/bulk', 'POST', payload, user.cookie)
    const retry = await call('/api/flashcards/cards/bulk', 'POST', payload, user.cookie)
    assert.equal(first.status, 201); assert.equal(retry.status, 200)
    assert.equal(first.data.cards[0].id, retry.data.cards[0].id)
    assert.equal((await call('/api/flashcards/cards', 'GET', undefined, user.cookie)).data.cards.length, 3)
    assert.equal((await call('/api/flashcards/cards/bulk', 'POST', {...payload, cards: [{...card, front: 'Autre contenu'}]}, user.cookie)).status, 409)
    for (const limit of ['1.5', 'Infinity', '-5']) assert.equal((await call('/api/flashcards/cards?limit='+limit, 'GET', undefined, user.cookie)).status, 200)
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

test('FSRS preview snapshot : exactitude des candidats, concurrence optimiste 409, persistance et restart', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-fsrs-preview-')), call = api(directory)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'fsrs-test@example.test', name: 'FsrsTester', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'Neurologie'}, user.cookie)).data.deck
    const card = (await call('/api/flashcards/cards', 'POST', {deckId: deck.id, front: 'Aire de Broca', back: 'Production du langage'}, user.cookie)).data.card

    // 1. GET /review produit la queue SANS preview snapshot (généré à la demande uniquement)
    const queue = await call('/api/flashcards/review', 'GET', undefined, user.cookie)
    assert.equal(queue.status, 200)
    assert.equal(queue.data.cards.length, 1)
    const reviewCard = queue.data.cards[0]
    assert.equal(reviewCard.preview, undefined)

    // 2. POST /api/flashcards/cards/:id/preview génère le preview à la demande (ex: clic « Afficher la réponse »)
    const previewRes = await call(`/api/flashcards/cards/${card.id}/preview`, 'POST', {}, user.cookie)
    assert.equal(previewRes.status, 200)
    assert.ok(previewRes.data.preview?.id)
    assert.ok(previewRes.data.preview?.labels?.good)
    assert.ok(previewRes.data.preview?.labels?.again)
    const previewId = previewRes.data.preview.id

    // 3. Simulation d'un restart du serveur : une nouvelle instance d'API doit retrouver le snapshot en DB
    const callAfterRestart = api(directory)

    // 4. Application du candidat avec previewId
    const resReview = await callAfterRestart(`/api/flashcards/cards/${card.id}/review`, 'POST', {
      rating: 'good',
      responseMs: 1500,
      expectedVersion: 0,
      previewId,
    }, user.cookie)
    assert.equal(resReview.status, 200)
    assert.equal(resReview.data.review.reviewVersion, 1)
    assert.ok(resReview.data.review.schedulerConfigHash)

    // 5. Tentative de réutilisation du même previewId ou soumission concurrente avec expectedVersion 0 -> 409 Conflict
    const concurrent = await callAfterRestart(`/api/flashcards/cards/${card.id}/review`, 'POST', {
      rating: 'easy',
      expectedVersion: 0,
      previewId,
    }, user.cookie)
    assert.equal(concurrent.status, 409)

    // 6. Vérifier que la table flashcard_review_previews n'a plus ce preview (consommé)
    const database = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    const previewInDb = database.prepare('SELECT 1 FROM flashcard_review_previews WHERE id=?').get(previewId)
    assert.equal(previewInDb, undefined)

    // 7. Vérifier que les logs contiennent scheduler_version et scheduler_config_hash
    const log = database.prepare('SELECT * FROM flashcard_review_logs WHERE card_id=?').get(card.id)
    assert.ok(log.scheduler_version.startsWith('ts-fsrs-'))
    assert.ok(log.scheduler_config_hash)
    assert.ok(log.scheduler_data_json)
    database.close()
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

test('Streak civil : décrémentation sécurisée IANA et transition DST', async () => {
  const {getPreviousIanaDayString} = await import('../server/flashcards/repository.mjs')
  // Vérification de la logique de décrémentation de date civile
  assert.equal(getPreviousIanaDayString('2026-03-29'), '2026-03-28') // Transition DST printemps
  assert.equal(getPreviousIanaDayString('2026-10-25'), '2026-10-24') // Transition DST automne
  assert.equal(getPreviousIanaDayString('2026-01-01'), '2025-12-31') // Changement d'année
  assert.equal(getPreviousIanaDayString('2024-03-01'), '2024-02-29') // Année bissextile

  // Test de calcul du streak en base avec logs franchissant une transition DST
  const directory = mkdtempSync(path.join(tmpdir(), 'mycorpus-dst-streak-')), call = api(directory)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'dst-tester@example.test', name: 'DstTester', password})
    const deckRes = await call('/api/flashcards/decks', 'POST', {name: 'Deck 1'}, user.cookie)
    const cardRes = await call('/api/flashcards/cards', 'POST', {deckId: deckRes.data.deck.id, front: 'Q', back: 'A'}, user.cookie)
    const cardId = cardRes.data.card.id

    // Insérer des logs de révision sur 4 jours consécutifs dans le fuseau Europe/Paris
    // 2026-03-27 14:00 CET = 1774616400000
    // 2026-03-28 14:00 CET = 1774702800000
    // 2026-03-29 14:00 CEST = 1774785600000 (jour DST de 23h)
    // 2026-03-30 01:30 CEST = 1774827000000 (juste après minuit)
    const t27 = new Date('2026-03-27T12:00:00Z').getTime()
    const t28 = new Date('2026-03-28T12:00:00Z').getTime()
    const t29 = new Date('2026-03-29T00:15:00Z').getTime() // 02:15 CEST le jour du changement d'heure
    const t30 = new Date('2026-03-30T00:30:00Z').getTime() // 02:30 CEST lendemain DST

    const database = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    const userRow = database.prepare('SELECT id FROM users WHERE email=?').get('dst-tester@example.test')

    const insertLog = database.prepare(`
      INSERT INTO flashcard_review_logs (id, user_id, card_id, rating, response_ms, previous_due_at, previous_interval_days, next_due_at, next_interval_days, reviewed_at)
      VALUES (?, ?, ?, 'good', 1000, 0, 1, 0, 1, ?)
    `)
    insertLog.run('log-1', userRow.id, cardId, t27)
    insertLog.run('log-2', userRow.id, cardId, t28)
    insertLog.run('log-3', userRow.id, cardId, t29)
    insertLog.run('log-4', userRow.id, cardId, t30)
    database.close()

    const {FlashcardRepository} = await import('../server/flashcards/repository.mjs')
    const db = new DatabaseSync(path.join(directory, 'mycorpus.sqlite'))
    const repo = new FlashcardRepository(db)

    // Calculer les stats au 30 mars 2026 à 08:00 UTC dans Europe/Paris
    const atTime = new Date('2026-03-30T08:00:00Z').getTime()
    const stats = repo.stats(userRow.id, 'Europe/Paris', atTime)
    // Le streak doit compter les 4 jours consécutifs : 27, 28, 29, 30 mars
    assert.equal(stats.streak, 4)
    db.close()
  } finally { rmSync(directory, {recursive: true, force: true}) }
})

