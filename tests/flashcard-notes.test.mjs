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
      expectedVersion: 0,
      fields: {text: 'Le {{c1::poumon}} respire par la {{c2::trachée}}.'},
    }, user.cookie)
    assert.equal(addC2Res.status, 400)
    assert.match(addC2Res.data.error, /deck par défaut valide/)

    // Fournir un nouveau defaultDeckId lors du PATCH pour permettre la création de c2
    const fixDeckRes = await call(`/api/flashcards/notes/${note.id}`, 'PATCH', {
      expectedVersion: 0,
      defaultDeckId: deck2.id,
      fields: {text: 'Le {{c1::poumon}} respire par la {{c2::trachée}}.'},
    }, user.cookie)
    assert.equal(fixDeckRes.status, 200)
    assert.equal(fixDeckRes.data.note.cards.length, 2)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('mutations Note sans expectedVersion => 422', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-422-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'v422@example.test', name: 'V422', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'Deck422'}, user.cookie)).data.deck

    const noteRes = await call('/api/flashcards/notes', 'POST', {
      noteType: 'basic',
      defaultDeckId: deck.id,
      fields: {front: 'Question', back: 'Réponse'},
    }, user.cookie)
    const note = noteRes.data.note
    const card = note.cards[0]

    // 1. PATCH /notes/:id sans expectedVersion -> 422
    const patchNoVer = await call(`/api/flashcards/notes/${note.id}`, 'PATCH', {
      fields: {front: 'Q modifiée', back: 'Réponse'},
    }, user.cookie)
    assert.equal(patchNoVer.status, 422)

    // 2. DELETE /notes/:id sans expectedVersion -> 422
    const delNoVer = await call(`/api/flashcards/notes/${note.id}`, 'DELETE', {}, user.cookie)
    assert.equal(delNoVer.status, 422)

    // 3. DELETE /cards/:id (carte dérivée) sans expectedVersion -> 422
    const delCardNoVer = await call(`/api/flashcards/cards/${card.id}`, 'DELETE', {}, user.cookie)
    assert.equal(delCardNoVer.status, 422)

    // 4. POST /notes/:id/derivations/:key/restore sans expectedVersion -> 422
    const restoreNoVer = await call(`/api/flashcards/notes/${note.id}/derivations/forward/restore`, 'POST', {}, user.cookie)
    assert.equal(restoreNoVer.status, 422)

    // 5. Carte legacy sans note_id : DELETE sans expectedVersion reste autorisé (200)
    const legacyCard = (await call('/api/flashcards/cards', 'POST', {
      deckId: deck.id,
      front: 'Legacy Q',
      back: 'Legacy A',
    }, user.cookie)).data.card
    const delLegacy = await call(`/api/flashcards/cards/${legacyCard.id}`, 'DELETE', {}, user.cookie)
    assert.equal(delLegacy.status, 200)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('derived card PATCH rejeté mais moveCard autorisé', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-derived-patch-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'derived@example.test', name: 'Derived', password})
    const deck1 = (await call('/api/flashcards/decks', 'POST', {name: 'DeckA'}, user.cookie)).data.deck
    const deck2 = (await call('/api/flashcards/decks', 'POST', {name: 'DeckB'}, user.cookie)).data.deck

    const note = (await call('/api/flashcards/notes', 'POST', {
      noteType: 'bidirectional',
      defaultDeckId: deck1.id,
      fields: {front: 'Cranium', back: 'Crâne'},
    }, user.cookie)).data.note
    const forwardCard = note.cards.find(c => c.derivationKey === 'forward')

    // PATCH direct de la carte dérivée -> 422 rejeté avec message explicite
    const patchRes = await call(`/api/flashcards/cards/${forwardCard.id}`, 'PATCH', {
      front: 'Nouveau titre non autorisé',
    }, user.cookie)
    assert.equal(patchRes.status, 422)
    assert.match(patchRes.data.error, /dérivée d’une Note/)

    // Vérifier que la carte est intacte
    const cardCheck = (await call(`/api/flashcards/cards?deck=${deck1.id}`, 'GET', undefined, user.cookie)).data.cards[0]
    assert.equal(cardCheck.front, 'Cranium')

    // Déplacement de la carte dérivée vers deck2 -> autorisé (200)
    const moveRes = await call(`/api/flashcards/cards/${forwardCard.id}/move`, 'POST', {deckId: deck2.id}, user.cookie)
    assert.equal(moveRes.status, 200)
    assert.equal(moveRes.data.card.deckId, deck2.id)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('duplication de Note : nouveaux note/card IDs, FSRS new, originaux inchangés', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-dup-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'dup@example.test', name: 'Dup', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckDup'}, user.cookie)).data.deck

    const note = (await call('/api/flashcards/notes', 'POST', {
      noteType: 'cloze',
      defaultDeckId: deck.id,
      fields: {text: 'Le {{c1::cœur}} pompe le {{c2::sang}}.'},
    }, user.cookie)).data.note
    const c1Card = note.cards.find(c => c.derivationKey === 'c1')
    const c2Card = note.cards.find(c => c.derivationKey === 'c2')

    // Réviser c1
    const preview = (await call(`/api/flashcards/cards/${c1Card.id}/preview`, 'POST', {}, user.cookie)).data.preview
    await call(`/api/flashcards/cards/${c1Card.id}/review`, 'POST', {
      rating: 'good',
      responseMs: 1200,
      previewId: preview.id,
    }, user.cookie)

    // Dupliquer via POST /cards/:id/duplicate sur une carte dérivée
    const dupRes = await call(`/api/flashcards/cards/${c1Card.id}/duplicate`, 'POST', {}, user.cookie)
    assert.equal(dupRes.status, 201)
    const newCard = dupRes.data.card
    const newNote = dupRes.data.note

    // Nouveaux identifiants
    assert.notEqual(newNote.id, note.id)
    assert.notEqual(newCard.id, c1Card.id)
    assert.equal(newCard.noteId, newNote.id)

    // Toutes les cartes de la nouvelle note doivent avoir FSRS réinitialisé à 'new'
    assert.equal(newNote.cards.length, 2)
    for (const c of newNote.cards) {
      assert.notEqual(c.id, c1Card.id)
      assert.notEqual(c.id, c2Card.id)
      assert.equal(c.review.state, 'new')
      assert.equal(c.review.repetitions, 0)
      assert.equal(c.review.fsrsReps, 0)
    }

    // L'original c1 doit conserver son état révisé
    const originalAfter = (await call(`/api/flashcards/cards?query=cœur`, 'GET', undefined, user.cookie)).data.cards.find(c => c.id === c1Card.id)
    assert.equal(originalAfter.review.repetitions, 1)
    assert.equal(originalAfter.review.lastRating, 'good')

    // Duplication d'une carte legacy
    const legacy = (await call('/api/flashcards/cards', 'POST', {deckId: deck.id, front: 'LegQ', back: 'LegA'}, user.cookie)).data.card
    const dupLegacy = (await call(`/api/flashcards/cards/${legacy.id}/duplicate`, 'POST', {}, user.cookie)).data.card
    assert.notEqual(dupLegacy.id, legacy.id)
    assert.equal(dupLegacy.noteId, null)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('validation stricte des changements de note_type : rejet atomique et intégrité DB', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-switch-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'switch@example.test', name: 'Switch', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckSwitch'}, user.cookie)).data.deck

    // Note Cloze initiale
    const note = (await call('/api/flashcards/notes', 'POST', {
      noteType: 'cloze',
      defaultDeckId: deck.id,
      fields: {text: 'Le {{c1::rein}} filtre le {{c2::sang}}.'},
    }, user.cookie)).data.note
    assert.equal(note.cards.length, 2)

    // 1. cloze -> basic sans fields => 400
    const fail1 = await call(`/api/flashcards/notes/${note.id}`, 'PATCH', {
      noteType: 'basic',
      expectedVersion: 0,
    }, user.cookie)
    assert.equal(fail1.status, 400)

    // 2. cloze -> basic avec fields incomplets => 400
    const fail2 = await call(`/api/flashcards/notes/${note.id}`, 'PATCH', {
      noteType: 'basic',
      fields: {front: 'Seulement le recto'},
      expectedVersion: 0,
    }, user.cookie)
    assert.equal(fail2.status, 400)

    // Vérifier l'état de la note : strictement inchangé
    const noteAfterFails = (await call(`/api/flashcards/notes/${note.id}`, 'GET', undefined, user.cookie)).data.note
    assert.equal(noteAfterFails.noteType, 'cloze')
    assert.equal(noteAfterFails.noteVersion, 0)
    assert.equal(noteAfterFails.cards.length, 2)

    // 3. basic -> cloze sans text => 400
    const basicNote = (await call('/api/flashcards/notes', 'POST', {
      noteType: 'basic',
      defaultDeckId: deck.id,
      fields: {front: 'Os coxal', back: 'Bassin'},
    }, user.cookie)).data.note

    const fail3 = await call(`/api/flashcards/notes/${basicNote.id}`, 'PATCH', {
      noteType: 'cloze',
      expectedVersion: 0,
    }, user.cookie)
    assert.equal(fail3.status, 400)

    // 4. typed -> basic sans front/back => 400
    const typedNote = (await call('/api/flashcards/notes', 'POST', {
      noteType: 'typed',
      defaultDeckId: deck.id,
      fields: {front: 'Capitale ?', answer: 'Paris'},
    }, user.cookie)).data.note

    const fail4 = await call(`/api/flashcards/notes/${typedNote.id}`, 'PATCH', {
      noteType: 'basic',
      expectedVersion: 0,
    }, user.cookie)
    assert.equal(fail4.status, 400)

    // Vérifier que typedNote est intacte
    const typedAfter = (await call(`/api/flashcards/notes/${typedNote.id}`, 'GET', undefined, user.cookie)).data.note
    assert.equal(typedAfter.noteType, 'typed')
    assert.equal(typedAfter.cards.length, 1)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('export filtré vs export complet : sibling-safe et format canonique', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-export-safe-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'exp@example.test', name: 'Exp', password})
    const deckA = (await call('/api/flashcards/decks', 'POST', {name: 'Deck A'}, user.cookie)).data.deck
    const deckB = (await call('/api/flashcards/decks', 'POST', {name: 'Deck B'}, user.cookie)).data.deck

    // 1. Note Bidirectionnelle : forward dans Deck A, reverse déplacée dans Deck B
    const biNote = (await call('/api/flashcards/notes', 'POST', {
      noteType: 'bidirectional',
      defaultDeckId: deckA.id,
      fields: {front: 'Céphale', back: 'Tête'},
    }, user.cookie)).data.note
    const reverseCard = biNote.cards.find(c => c.derivationKey === 'reverse')
    await call(`/api/flashcards/cards/${reverseCard.id}/move`, 'POST', {deckId: deckB.id}, user.cookie)

    // 2. Note Cloze : c1 dans Deck A, c2 déplacée dans Deck B
    const clozeNote = (await call('/api/flashcards/notes', 'POST', {
      noteType: 'cloze',
      defaultDeckId: deckA.id,
      fields: {text: 'La {{c1::plèvre}} protège les {{c2::poumons}}.'},
    }, user.cookie)).data.note
    const c2Card = clozeNote.cards.find(c => c.derivationKey === 'c2')
    await call(`/api/flashcards/cards/${c2Card.id}/move`, 'POST', {deckId: deckB.id}, user.cookie)

    // 3. Export filtré sur Deck A
    const expDeckA = await call('/api/flashcards/export', 'POST', {deckId: deckA.id}, user.cookie)
    assert.equal(expDeckA.status, 200)
    assert.match(expDeckA.data, /#separator:Tab/)
    // Contient le forward (Céphale) et c1 (plèvre masquée)
    assert.match(expDeckA.data, /Céphale/)
    assert.match(expDeckA.data, /\[\.\.\.\] protège les poumons/)
    // NE DOIT PAS contenir reverse (Tête -> Céphale) ni c2 (poumons)
    assert.doesNotMatch(expDeckA.data, /Basic \(and reversed card\)/)
    assert.doesNotMatch(expDeckA.data, /Cloze/)
    assert.doesNotMatch(expDeckA.data, /La plèvre protège les \[\.\.\.\]/)

    // 4. Export filtré sur Deck B
    const expDeckB = await call('/api/flashcards/export', 'POST', {deckId: deckB.id}, user.cookie)
    assert.equal(expDeckB.status, 200)
    assert.match(expDeckB.data, /La plèvre protège les \[\.\.\.\]/)
    assert.doesNotMatch(expDeckB.data, /\[\.\.\.\] protège les poumons/)

    // 5. Export complet ("Tout")
    const expAll = await call('/api/flashcards/export', 'POST', {}, user.cookie)
    assert.equal(expAll.status, 200)
    // Contient les notetypes canoniques Anki
    assert.match(expAll.data, /Basic \(and reversed card\)/)
    assert.match(expAll.data, /Cloze/)
    assert.match(expAll.data, /La \{\{c1::plèvre\}\} protège les \{\{c2::poumons\}\}\./)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})
