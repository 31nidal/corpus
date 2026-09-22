import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {createAccountHandler} from '../server/accounts.mjs'
import {createFlashcardHandler} from '../server/flashcards/handler.mjs'

function api(directory) {
  const config = {ACCOUNT_DATA_DIR: directory, APP_ORIGIN: 'https://mycorpus.test'}
  const account = createAccountHandler(config)
  const flashcards = createFlashcardHandler(config)
  return async (route, method = 'GET', body = undefined, cookie = '', headers = {}) => {
    const raw = body === undefined ? '' : JSON.stringify(body), req = Readable.from(raw ? [Buffer.from(raw)] : [])
    req.url = route; req.method = method; req.headers = {cookie, ...(body === undefined ? {} : {'content-type': 'application/json', 'x-mycorpus-request': '1'}), ...headers}; req.socket = {remoteAddress: '127.0.0.1'}
    let status = 200, output = '', responseHeaders = {}
    const res = {writeHead(code, values = {}) { status = code; responseHeaders = {...responseHeaders, ...values} }, setHeader(name, value) { responseHeaders[name] = value }, end(value = '') { output += value }}
    await (route.startsWith('/api/account/') ? account : flashcards)(req, res)
    const cookies = responseHeaders['Set-Cookie'] || responseHeaders['set-cookie'] || [], list = Array.isArray(cookies) ? cookies : [cookies]
    return {status, data: responseHeaders['Content-Type']?.startsWith('text/csv') ? output : output ? JSON.parse(output) : null, cookie: list.map(value => value.split(';')[0]).find(value => value.startsWith('mycorpus_session='))}
  }
}

const password = 'notes-solid-test-2026'

test('notes CRUD : création, dérivations automatiques, transition Basic -> Bidirectional', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-notes-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'notes@example.test', name: 'Notes', password})
    const deckRes = await call('/api/flashcards/decks', 'POST', {name: 'Anatomie'}, user.cookie)
    const deckId = deckRes.data.deck.id

    // 1. Créer une note Basic
    const createRes = await call('/api/flashcards/notes', 'POST', {
      noteType: 'basic',
      defaultDeckId: deckId,
      title: 'Artère coronaire',
      fields: {front: 'Origine de l’artère coronaire gauche ?', back: 'Sinus aortique gauche'},
      subject: 'Cardiovasculaire',
    }, user.cookie)
    assert.equal(createRes.status, 201)
    const note = createRes.data.note
    assert.equal(note.noteType, 'basic')
    assert.equal(note.noteVersion, 0)
    assert.equal(note.cards.length, 1)
    const forwardCard = note.cards[0]
    assert.equal(forwardCard.derivationKey, 'forward')
    assert.equal(forwardCard.front, 'Origine de l’artère coronaire gauche ?')
    assert.equal(forwardCard.back, 'Sinus aortique gauche')

    // 2. Simuler une révision de cette carte forward
    const previewRes = await call(`/api/flashcards/cards/${forwardCard.id}/preview`, 'POST', {}, user.cookie)
    assert.equal(previewRes.status, 200)
    const reviewRes = await call(`/api/flashcards/cards/${forwardCard.id}/review`, 'POST', {
      rating: 'good',
      responseMs: 1500,
      previewId: previewRes.data.preview.id,
    }, user.cookie)
    assert.equal(reviewRes.status, 200)

    // 3. Transitionner la note de Basic vers Bidirectional
    // Doit conserver la carte forward (et son état de révision FSRS) et créer la carte reverse
    const patchRes = await call(`/api/flashcards/notes/${note.id}`, 'PATCH', {
      noteType: 'bidirectional',
      expectedVersion: 0,
    }, user.cookie)
    assert.equal(patchRes.status, 200)
    const updatedNote = patchRes.data.note
    assert.equal(updatedNote.noteVersion, 1)
    assert.equal(updatedNote.cards.length, 2)

    const preservedForward = updatedNote.cards.find(c => c.derivationKey === 'forward')
    const newReverse = updatedNote.cards.find(c => c.derivationKey === 'reverse')
    assert.ok(preservedForward)
    assert.ok(newReverse)
    assert.equal(preservedForward.id, forwardCard.id)
    assert.equal(preservedForward.review.lastRating, 'good') // FSRS préservé !
    assert.equal(newReverse.review.state, 'new') // Nouvelle dérivation à l'état new
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('optimistic locking sur les mutations de Note (PATCH, DELETE, restore, suppression de carte)', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-lock-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'lock@example.test', name: 'Lock', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'LockDeck'}, user.cookie)).data.deck

    const noteRes = await call('/api/flashcards/notes', 'POST', {
      noteType: 'bidirectional',
      defaultDeckId: deck.id,
      fields: {front: 'A', back: 'B'},
    }, user.cookie)
    const note = noteRes.data.note
    assert.equal(note.noteVersion, 0)
    const reverseCard = note.cards.find(c => c.derivationKey === 'reverse')

    // 1. PATCH avec mauvaise version attendue -> 409
    const conflictPatch = await call(`/api/flashcards/notes/${note.id}`, 'PATCH', {
      fields: {front: 'A modifié', back: 'B'},
      expectedVersion: 99,
    }, user.cookie)
    assert.equal(conflictPatch.status, 409)

    // 2. Suppression d'une carte dérivée avec mauvaise version -> 409
    const conflictCardDel = await call(`/api/flashcards/cards/${reverseCard.id}`, 'DELETE', {
      expectedVersion: 99,
    }, user.cookie)
    assert.equal(conflictCardDel.status, 409)

    // 3. Suppression valide de la carte dérivée
    const validCardDel = await call(`/api/flashcards/cards/${reverseCard.id}`, 'DELETE', {
      expectedVersion: 0,
    }, user.cookie)
    assert.equal(validCardDel.status, 200)

    // La note doit avoir incrémenté sa version et enregistré 'reverse' dans suppressed_derivations
    const noteAfterDel = (await call(`/api/flashcards/notes/${note.id}`, 'GET', undefined, user.cookie)).data.note
    assert.equal(noteAfterDel.noteVersion, 1)
    assert.deepEqual(noteAfterDel.suppressedDerivations, ['reverse'])
    assert.equal(noteAfterDel.cards.length, 1)

    // 4. Restauration avec mauvaise version -> 409
    const conflictRestore = await call(`/api/flashcards/notes/${note.id}/derivations/reverse/restore`, 'POST', {
      expectedVersion: 0, // ancienne version périmée
    }, user.cookie)
    assert.equal(conflictRestore.status, 409)

    // 5. Restauration valide avec expectedVersion = 1
    const validRestore = await call(`/api/flashcards/notes/${note.id}/derivations/reverse/restore`, 'POST', {
      expectedVersion: 1,
    }, user.cookie)
    assert.equal(validRestore.status, 200)
    assert.equal(validRestore.data.note.noteVersion, 2)
    assert.deepEqual(validRestore.data.note.suppressedDerivations, [])
    assert.equal(validRestore.data.note.cards.length, 2)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('destination des nouvelles dérivations : rejet propre si default_deck_id manquant', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-deck-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'deck@example.test', name: 'Deck', password})
    const deck1 = (await call('/api/flashcards/decks', 'POST', {name: 'Deck 1'}, user.cookie)).data.deck
    const deck2 = (await call('/api/flashcards/decks', 'POST', {name: 'Deck 2'}, user.cookie)).data.deck

    // Créer une note cloze avec c1
    const noteRes = await call('/api/flashcards/notes', 'POST', {
      noteType: 'cloze',
      defaultDeckId: deck1.id,
      fields: {text: 'Le {{c1::poumon}} respire.'},
    }, user.cookie)
    assert.equal(noteRes.status, 201)
    const note = noteRes.data.note
    const c1Card = note.cards[0]

    // Déplacer c1 vers deck2 (flashcards.deck_id est autoritaire)
    const moveRes = await call(`/api/flashcards/cards/${c1Card.id}/move`, 'POST', {deckId: deck2.id}, user.cookie)
    assert.equal(moveRes.status, 200)

    // Supprimer deck1 (qui était le default_deck_id de la note)
    const delDeckRes = await call(`/api/flashcards/decks/${deck1.id}`, 'DELETE', {}, user.cookie)
    assert.equal(delDeckRes.status, 200)

    // Vérifier que la note existe toujours et que son default_deck_id est devenu null (ON DELETE SET NULL)
    const noteAfterDeckDel = (await call(`/api/flashcards/notes/${note.id}`, 'GET', undefined, user.cookie)).data.note
    assert.ok(noteAfterDeckDel)
    assert.equal(noteAfterDeckDel.defaultDeckId, null)
    // La carte c1 déplacée dans deck2 existe toujours
    assert.equal(noteAfterDeckDel.cards.length, 1)
    assert.equal(noteAfterDeckDel.cards[0].deckId, deck2.id)

    // Maintenant, tenter de modifier le texte pour ajouter un nouveau trou c2
    // Comme default_deck_id est null, cela doit être rejeté avec une erreur explicite
    const addC2Res = await call(`/api/flashcards/notes/${note.id}`, 'PATCH', {
      fields: {text: 'Le {{c1::poumon}} respire par la {{c2::trachée}}.'},
    }, user.cookie)
    assert.equal(addC2Res.status, 400)
    assert.match(addC2Res.data.error, /deck par défaut valide/)

    // Fournir un nouveau defaultDeckId lors du PATCH pour permettre la création de c2
    const fixDeckRes = await call(`/api/flashcards/notes/${note.id}`, 'PATCH', {
      defaultDeckId: deck2.id,
      fields: {text: 'Le {{c1::poumon}} respire par la {{c2::trachée}}.'},
    }, user.cookie)
    assert.equal(fixDeckRes.status, 200)
    assert.equal(fixDeckRes.data.note.cards.length, 2)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})
