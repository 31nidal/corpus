import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {DatabaseSync} from 'node:sqlite'
import {createFlashcardHandler} from '../server/flashcards/handler.mjs'
import {createAccountHandler} from '../server/accounts.mjs'
import {initFlashcardSchema} from '../server/flashcards/schema.mjs'
import {migrateFlashcards} from '../server/flashcards/migrations.mjs'
import {FlashcardRepository} from '../server/flashcards/repository.mjs'
import {normalizeTypedAnswer, checkTypedAnswer} from '../server/flashcards/typedAnswer.mjs'
import {
  generateLocalNoteDrafts,
  sanitizeGeneratedNoteDrafts,
} from '../server/flashcards/generation.mjs'

const password = 'Password123!'

function api(directory, dependencies = {}) {
  const config = {ACCOUNT_DATA_DIR: directory, APP_ORIGIN: 'https://mycorpus.test'}
  const account = createAccountHandler(config)
  const flashcards = createFlashcardHandler(config, dependencies)
  return async (route, method = 'GET', body = undefined, cookie = '', headers = {}) => {
    const raw = body === undefined ? '' : JSON.stringify(body), req = Readable.from(raw ? [Buffer.from(raw)] : [])
    req.url = route
    req.method = method
    req.headers = {cookie, ...(body === undefined ? {} : {'content-type': 'application/json', 'x-mycorpus-request': '1'}), ...headers}
    req.socket = {remoteAddress: '127.0.0.1'}
    let status = 200, output = '', responseHeaders = {}
    const res = {
      writeHead(code, values = {}) { status = code; responseHeaders = {...responseHeaders, ...values} },
      setHeader(name, value) { responseHeaders[name] = value },
      end(value = '') { output += value },
    }
    await (route.startsWith('/api/account/') ? account : flashcards)(req, res)
    const cookies = responseHeaders['Set-Cookie'] || responseHeaders['set-cookie'] || [], list = Array.isArray(cookies) ? cookies : [cookies]
    return {
      status,
      data: responseHeaders['Content-Type']?.startsWith('text/csv') ? output : output ? JSON.parse(output) : null,
      cookie: list.map(value => value.split(';')[0]).find(value => value.startsWith('mycorpus_session=')),
    }
  }
}

test('Sanitizer : rejet si answer Typed ou back Basic absent du passage source', () => {
  const sourceText = 'La glycémie à jeun normale est comprise entre 0.70 et 1.10 g/L.'
  const fallback = {text: sourceText, level: 'standard', requestedCount: 5, source: {type: 'catalog_course'}}

  // 1. Typed valide
  const validTyped = sanitizeGeneratedNoteDrafts([
    {
      noteType: 'typed',
      fields: {front: 'Quelle est la glycémie normale ?', answer: '0.70 et 1.10 g/L'},
      sourceExcerpt: sourceText,
    },
  ], fallback, sourceText)
  assert.equal(validTyped.length, 1)
  assert.equal(validTyped[0].fields.answer, '0.70 et 1.10 g/L')

  // 2. Typed avec answer halluciné / absent du passage -> rejet
  const invalidTyped = sanitizeGeneratedNoteDrafts([
    {
      noteType: 'typed',
      fields: {front: 'Quelle est la glycémie normale ?', answer: '3.50 g/L'},
      sourceExcerpt: sourceText,
    },
  ], fallback, sourceText)
  assert.equal(invalidTyped.length, 0)

  // 3. Basic avec back non attesté -> rejet
  const invalidBasic = sanitizeGeneratedNoteDrafts([
    {
      noteType: 'basic',
      fields: {front: 'Glycémie ?', back: 'La glycémie vaut toujours 5 g/L.'},
      sourceExcerpt: sourceText,
    },
  ], fallback, sourceText)
  assert.equal(invalidBasic.length, 0)
})

test('Sanitizer : Cloze strict (spans attestés, texte sans balises identique, max 3 trous, disjoints valides)', () => {
  const sourceText = 'Le foramen magnum est situé dans l’os occipital à la base du crâne.'
  const fallback = {text: sourceText, level: 'standard', requestedCount: 5, source: {type: 'catalog_course'}}

  // 1. Cloze avec c1 et c3 disjoints (valide)
  const validCloze = sanitizeGeneratedNoteDrafts([
    {
      noteType: 'cloze',
      fields: {text: 'Le {{c1::foramen magnum}} est situé dans l’os occipital à la base du {{c3::crâne}}.'},
      sourceExcerpt: sourceText,
    },
  ], fallback, sourceText)
  assert.equal(validCloze.length, 1)
  assert.equal(validCloze[0].noteType, 'cloze')

  // 2. Cloze dont le texte débalisé ne correspond pas à la source -> rejet
  const modifiedCloze = sanitizeGeneratedNoteDrafts([
    {
      noteType: 'cloze',
      fields: {text: 'Le {{c1::trou occipital}} est placé dans l’os occipital.'},
      sourceExcerpt: sourceText,
    },
  ], fallback, sourceText)
  assert.equal(modifiedCloze.length, 0)

  // 3. Cloze avec > 3 trous distincts -> rejet
  const tooManyClozes = sanitizeGeneratedNoteDrafts([
    {
      noteType: 'cloze',
      fields: {text: '{{c1::Le}} {{c2::foramen}} {{c3::magnum}} {{c4::est}} situé dans l’os occipital à la base du crâne.'},
      sourceExcerpt: sourceText,
    },
  ], fallback, sourceText)
  assert.equal(tooManyClozes.length, 0)
})

test('Sanitizer : Bidirectional conservateur (rejet sans équivalence explicite)', () => {
  const textWithEquivalence = 'Le nerf fibulaire commun est aussi appelé nerf sciatique poplité externe.'
  const textWithoutEquivalence = 'L’insuline régule le glucose tandis que le glucagon l’augmente.'
  const fallback = {level: 'standard', requestedCount: 5, source: {type: 'catalog_course'}}

  // 1. Équivalence explicite "aussi appelé" -> accepté
  const validBidi = sanitizeGeneratedNoteDrafts([
    {
      noteType: 'bidirectional',
      fields: {front: 'nerf fibulaire commun', back: 'nerf sciatique poplité externe'},
      sourceExcerpt: textWithEquivalence,
    },
  ], {...fallback, text: textWithEquivalence}, textWithEquivalence)
  assert.equal(validBidi.length, 1)

  // 2. Sans marqueur d'équivalence explicite (ex: Insuline/Glucagon) -> rejet
  const invalidBidi = sanitizeGeneratedNoteDrafts([
    {
      noteType: 'bidirectional',
      fields: {front: 'L’insuline', back: 'le glucagon'},
      sourceExcerpt: textWithoutEquivalence,
    },
  ], {...fallback, text: textWithoutEquivalence}, textWithoutEquivalence)
  assert.equal(invalidBidi.length, 0)
})

test('Générateur local : sélection intelligente des 4 types (Basic, Bidirectional, Cloze, Typed)', () => {
  const corpus = [
    'Le nerf fibulaire commun est aussi appelé nerf sciatique poplité externe.',
    'Le pH artériel vaut 7.40 au repos.',
    'Le fémur s’articule proximalement avec l’os coxal.',
    'Le foie sécrète la bile nécessaire à la digestion des lipides.',
  ].join('\n')

  const notes = generateLocalNoteDrafts({text: corpus, level: 'complete', requestedCount: 10, source: {type: 'catalog_course'}})
  assert.ok(notes.length >= 3)

  const bidi = notes.find(n => n.noteType === 'bidirectional')
  assert.ok(bidi, 'Doit générer une note Bidirectional pour l’équivalence explicite')
  assert.match(bidi.fields.front, /fibulaire/i)
  assert.match(bidi.fields.back, /sciatique/i)

  const typed = notes.find(n => n.noteType === 'typed')
  assert.ok(typed, 'Doit générer une note Typed pour la valeur chiffrée')
  assert.equal(typed.fields.answer, '7.40 au repos')

  const cloze = notes.find(n => n.noteType === 'cloze')
  assert.ok(cloze, 'Doit générer une note Cloze pour l’articulation anatomique')
  assert.match(cloze.fields.text, /\{\{c1::/)

  const basic = notes.find(n => n.noteType === 'basic')
  assert.ok(basic, 'Doit générer une note Basic pour le rôle physiologique')
  assert.match(basic.fields.front, /Quel rôle/i)
})

test('API POST /generate/text et POST /notes/bulk avec génération receipt et revalidation au save', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-gen-notes-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'bulk-notes@example.test', name: 'BulkNotes', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckPrincipal'}, user.cookie)).data.deck

    const text = 'Le débit cardiaque est le produit de la fréquence cardiaque par le volume d’éjection systolique. Le nœud sinusal assure le rythme normal du cœur.'
    const genRes = await call('/api/flashcards/generate/text', 'POST', {text, count: 5}, user.cookie)
    assert.equal(genRes.status, 200)
    assert.ok(genRes.data.generationId)
    assert.ok(genRes.data.drafts.length >= 1)

    const draft = genRes.data.drafts[0]

    // 1. Sauvegarde valide avec generationId
    const saveRes = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: draft.noteType,
        defaultDeckId: deck.id,
        title: 'Débit cardiaque',
        fields: draft.fields,
        subject: 'Physiologie',
        chapter: 'Cardiovasculaire',
        tags: ['hemodynamique'],
        source: draft.source,
      }],
      generationId: genRes.data.generationId,
      requestId: 'req-valid-1',
    }, user.cookie)
    assert.equal(saveRes.status, 201)
    assert.equal(saveRes.data.totalNotes, 1)
    assert.ok(saveRes.data.totalCards >= 1)

    // Vérifier que pour free_text, source_excerpt est null en base
    const savedNote = saveRes.data.notes[0]
    assert.equal(savedNote.source.excerpt, null)

    // 2. Falsification du contenu médical (back altéré non présent dans la source d'origine) -> rejet 400
    const fakeSave = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Débit ?', back: 'Affirmation inventée jamais écrite dans la source.'},
        source: draft.source,
      }],
      generationId: genRes.data.generationId,
      requestId: 'req-fake-back',
    }, user.cookie)
    assert.equal(fakeSave.status, 400)
    assert.match(fakeSave.data.error, /n’est pas attestée/)

    // 3. Faux generationId inexistant -> rejet 400
    const badGenId = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: draft.fields,
        source: draft.source,
      }],
      generationId: 'gen_inexistant_123',
      requestId: 'req-bad-gen',
    }, user.cookie)
    assert.equal(badGenId.status, 400)
    assert.match(badGenId.data.error, /invalide ou expiré/)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('POST /notes/bulk : atomicité totale (une note invalide annule tout) et pas de transactions imbriquées', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-bulk-atomic-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'atomic@example.test', name: 'Atomic', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckA'}, user.cookie)).data.deck

    // Lot avec 1 note valide et 1 note invalide (deck inexistant)
    const res = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [
        {
          noteType: 'basic',
          defaultDeckId: deck.id,
          fields: {front: 'Q1', back: 'R1'},
        },
        {
          noteType: 'basic',
          defaultDeckId: 'bad-deck-uuid',
          fields: {front: 'Q2', back: 'R2'},
        },
      ],
      requestId: 'req-atomic-test',
    }, user.cookie)

    assert.equal(res.status, 400)

    // Vérifier que la note 1 N'A PAS été insérée (zéro insertion)
    const cards = (await call('/api/flashcards/cards', 'GET', undefined, user.cookie)).data.cards
    assert.equal(cards.length, 0)
    const notes = (await call('/api/flashcards/notes', 'GET', undefined, user.cookie)).data.notes
    assert.equal(notes.length, 0)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('POST /notes/bulk : idempotence concurrente et rejet si payload altéré', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-bulk-idemp-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'idemp@example.test', name: 'Idemp', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckIdemp'}, user.cookie)).data.deck

    const payload = {
      notes: [
        {
          noteType: 'bidirectional',
          defaultDeckId: deck.id,
          fields: {front: 'Epistaxis', back: 'Saignement de nez'},
        },
      ],
      requestId: 'req-same-id-123',
    }

    // Premier appel
    const res1 = await call('/api/flashcards/notes/bulk', 'POST', payload, user.cookie)
    assert.equal(res1.status, 201)
    assert.equal(res1.data.totalNotes, 1)
    assert.equal(res1.data.totalCards, 2)

    // Deuxième appel identique (même requestId + même payload) -> retour en cache (status 200 ou 201), zéro duplication
    const res2 = await call('/api/flashcards/notes/bulk', 'POST', payload, user.cookie)
    assert.ok(res2.status === 200 || res2.status === 201)
    assert.equal(res2.data.notes[0].id, res1.data.notes[0].id)

    // Vérifier en base : 1 seule note, 2 cartes au total
    const notesInDb = (await call('/api/flashcards/notes', 'GET', undefined, user.cookie)).data.notes
    assert.equal(notesInDb.length, 1)

    // Troisième appel avec même requestId mais payload différent -> 409 Conflict
    const conflictingPayload = {
      notes: [
        {
          noteType: 'basic',
          defaultDeckId: deck.id,
          fields: {front: 'Autre question', back: 'Autre reponse'},
        },
      ],
      requestId: 'req-same-id-123',
    }
    const resConflict = await call('/api/flashcards/notes/bulk', 'POST', conflictingPayload, user.cookie)
    assert.equal(resConflict.status, 409)

    // Test de deux appels concurrents simultanés (Promise.all) avec même requestId
    const concurrentPayload = {
      notes: [
        {
          noteType: 'typed',
          defaultDeckId: deck.id,
          fields: {front: 'Fréquence cardiaque normale', answer: '60 à 100 bpm'},
        },
      ],
      requestId: 'req-concurrent-456',
    }

    const [c1, c2] = await Promise.all([
      call('/api/flashcards/notes/bulk', 'POST', concurrentPayload, user.cookie),
      call('/api/flashcards/notes/bulk', 'POST', concurrentPayload, user.cookie),
    ])

    // L'un crée (201), l'autre renvoie le résultat créé (200 ou 201)
    assert.ok([200, 201].includes(c1.status))
    assert.ok([200, 201].includes(c2.status))
    assert.equal(c1.data.notes[0].id, c2.data.notes[0].id)

    // Vérifier le compte total de notes
    const finalNotes = (await call('/api/flashcards/notes', 'GET', undefined, user.cookie)).data.notes
    assert.equal(finalNotes.length, 2) // 1 de req-same-id-123 + 1 de req-concurrent-456
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('Génération depuis erreur QCM : création d’une Note structurée et validation du grounding', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-qcm-note-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'qcm-note@example.test', name: 'QCMNote', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckQCM'}, user.cookie)).data.deck

    // QCM avec seuil chiffré -> doit générer Typed
    const qcmTyped = {
      front: 'Quel est le seuil de diagnostic du diabète gestationnel à jeun ?',
      back: 'La glycémie à jeun seuil de 0.92 g/L permet d’établir le diagnostic.',
    }
    const resTyped = await call('/api/flashcards/generate/qcm-error', 'POST', {qcm: qcmTyped, courseId: 'endocrino'}, user.cookie)
    assert.equal(resTyped.status, 200)
    assert.equal(resTyped.data.drafts[0].noteType, 'typed')
    assert.equal(resTyped.data.drafts[0].fields.answer, '0.92 g/L')

    // QCM général -> doit générer Basic
    const qcmBasic = {
      front: 'Quelle est la vascularisation du nœud sinusal ?',
      back: 'L’artère du nœud sinusal naît dans 60% des cas de l’artère coronaire droite.',
    }
    const resBasic = await call('/api/flashcards/generate/qcm-error', 'POST', {qcm: qcmBasic, courseId: 'cardio'}, user.cookie)
    assert.equal(resBasic.status, 200)
    assert.equal(resBasic.data.drafts[0].noteType, 'basic')
    assert.equal(resBasic.data.drafts[0].fields.front, qcmBasic.front)

    // Sauvegarde de la note QCM via notes/bulk
    const save = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: resBasic.data.drafts[0].noteType,
        defaultDeckId: deck.id,
        fields: resBasic.data.drafts[0].fields,
        source: resBasic.data.drafts[0].source,
      }],
      generationId: resBasic.data.generationId,
      requestId: 'qcm-save-1',
    }, user.cookie)
    assert.equal(save.status, 201)
    assert.equal(save.data.totalNotes, 1)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('Binding strict reçu ↔ source : refus si générationId fourni mais source.type rétrogradé vers manual', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-tamper-manual-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'tamper-manual@example.test', name: 'Tamper', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckTamper'}, user.cookie)).data.deck

    const genRes = await call('/api/flashcards/generate/catalog', 'POST', {
      text: 'Le muscle deltoïde est abducteur principal du bras. Il est innervé par le nerf axillaire.',
      courseId: 'anat-bras',
    }, user.cookie)
    assert.equal(genRes.status, 200)
    const genId = genRes.data.generationId

    // Tentative de bypass : on fournit le generationId mais avec source.type = 'manual'
    const res = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Question', back: 'Réponse inventée non attestée'},
        source: {type: 'manual'},
      }],
      generationId: genId,
      requestId: 'bypass-manual-1',
    }, user.cookie)
    assert.equal(res.status, 400)
    assert.match(res.data.error, /Type de source incompatible/)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('Provenance stricte : refus si source générée sans generationId', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-missing-gen-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'missing-gen@example.test', name: 'NoGen', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckNoGen'}, user.cookie)).data.deck

    const res = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Question', back: 'Réponse'},
        source: {type: 'catalog_course', courseId: 'cardio'},
      }],
      requestId: 'no-gen-req-1',
    }, user.cookie)
    assert.equal(res.status, 400)
    assert.match(res.data.error, /generationId/)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('Binding strict reçu ↔ source : refus en cas d’altération de courseId ou documentId', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-tamper-id-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'tamper-id@example.test', name: 'TamperId', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckTamperId'}, user.cookie)).data.deck

    const text = 'Le nœud sinusal est le pacemaker physiologique du cœur humain.'
    const genRes = await call('/api/flashcards/generate/catalog', 'POST', {text, courseId: 'cardio-101'}, user.cookie)
    assert.equal(genRes.status, 200)

    // Altération de courseId : 'pneumo-202' au lieu de 'cardio-101'
    const resAltered = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Nœud sinusal ?', back: 'Le nœud sinusal est le pacemaker physiologique du cœur humain.'},
        source: {type: 'catalog_course', courseId: 'pneumo-202'},
      }],
      generationId: genRes.data.generationId,
      requestId: 'altered-id-1',
    }, user.cookie)
    assert.equal(resAltered.status, 400)
    assert.match(resAltered.data.error, /Incohérence de provenance/)

    // Suppression silencieuse de courseId (tentative de bypass)
    const resRemoved = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Nœud sinusal ?', back: 'Le nœud sinusal est le pacemaker physiologique du cœur humain.'},
        source: {type: 'catalog_course', courseId: null},
      }],
      generationId: genRes.data.generationId,
      requestId: 'altered-id-2',
    }, user.cookie)
    assert.equal(resRemoved.status, 400)
    assert.match(resRemoved.data.error, /Incohérence de provenance/)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('Validation stricte sourceExcerpt : rejet si citation inventée ou non attestée', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-excerpt-valid-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'excerpt-val@example.test', name: 'ExcerptVal', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckExcerpt'}, user.cookie)).data.deck

    const text = 'L’artère méningée moyenne pénètre dans le crâne par le foramen épineux.'
    const genRes = await call('/api/flashcards/generate/catalog', 'POST', {text, courseId: 'neuro-anat'}, user.cookie)
    assert.equal(genRes.status, 200)

    // sourceExcerpt halluciné/inventé
    const resInvalid = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Artère méningée moyenne ?', back: text},
        source: {type: 'catalog_course', courseId: 'neuro-anat', excerpt: 'Cette phrase n’existe nulle part dans la source.'},
      }],
      generationId: genRes.data.generationId,
      requestId: 'invalid-excerpt-1',
    }, user.cookie)
    assert.equal(resInvalid.status, 400)
    assert.match(resInvalid.data.error, /Citation source non attestée/)

    // sourceExcerpt valide (extrait exact du texte)
    const resValid = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Artère méningée moyenne ?', back: text},
        source: {type: 'catalog_course', courseId: 'neuro-anat', excerpt: text},
      }],
      generationId: genRes.data.generationId,
      requestId: 'valid-excerpt-1',
    }, user.cookie)
    assert.equal(resValid.status, 201)
    assert.equal(resValid.data.totalNotes, 1)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('Source free_text : excerpt forcé à null en base même si envoyé dans le payload', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-freetext-null-')), call = api(dir)
  try {
    const user = await call('/api/account/register', 'POST', {email: 'freetext-null@example.test', name: 'FreeTextNull', password})
    const deck = (await call('/api/flashcards/decks', 'POST', {name: 'DeckFreeText'}, user.cookie)).data.deck

    const text = 'La rate est située dans l’hypochondre gauche sous la coupole diaphragmatique.'
    const genRes = await call('/api/flashcards/generate/text', 'POST', {text}, user.cookie)
    assert.equal(genRes.status, 200)

    const save = await call('/api/flashcards/notes/bulk', 'POST', {
      notes: [{
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Où est située la rate ?', back: text},
        source: {type: 'free_text', excerpt: text},
      }],
      generationId: genRes.data.generationId,
      requestId: 'freetext-req-1',
    }, user.cookie)
    assert.equal(save.status, 201)

    // Vérifier la note enregistrée en base
    const note = (await call('/api/flashcards/notes', 'GET', undefined, user.cookie)).data.notes[0]
    assert.equal(note.source.type, 'free_text')
    assert.equal(note.source.excerpt, null)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('Purge automatique des reçus de génération expirés', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys=ON;')
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT);
  `)
  initFlashcardSchema(db)

  const userId = 'user-purge-receipt'
  db.prepare('INSERT INTO users VALUES(?, ?, ?)').run(userId, 'purge@test.com', 'Purge')
  const repo = new FlashcardRepository(db)

  // Créer un reçu expiré (ttlMs négatif) et un reçu valide (ttlMs standard)
  repo.saveGenerationReceipt(userId, 'gen_expired', 'catalog', {courseId: 'c1'}, 'source expirée', -10000)
  repo.saveGenerationReceipt(userId, 'gen_valid', 'catalog', {courseId: 'c1'}, 'source valide', 3600000)

  // Vérifier la purge
  repo.purgeExpiredGenerationReceipts()
  assert.equal(repo.getGenerationReceipt(userId, 'gen_expired'), null)
  assert.notEqual(repo.getGenerationReceipt(userId, 'gen_valid'), null)
  assert.equal(repo.getGenerationReceipt(userId, 'gen_valid').sourceText, 'source valide')
})

test('Typed answer : préservation stricte des accents (pas de suppression diacritique)', () => {
  assert.equal(normalizeTypedAnswer('  Hémoglobine Glyquée  '), 'hémoglobine glyquée')
  assert.notEqual(normalizeTypedAnswer('hémoglobine'), 'hemoglobine')

  const resExact = checkTypedAnswer('hémoglobine', 'hémoglobine')
  assert.equal(resExact.matched, true)

  // Une saisie sans accent ne doit pas matcher la cible accentuée si non dans acceptedAnswers
  const resNoAccent = checkTypedAnswer('hemoglobine', 'hémoglobine')
  assert.equal(resNoAccent.matched, false)

  // Avec acceptedAnswers incluant la version sans accent
  const resWithAlt = checkTypedAnswer('hemoglobine', 'hémoglobine', ['hemoglobine'])
  assert.equal(resWithAlt.matched, true)
})

test('Concurrence réelle SQLite (deux connexions DatabaseSync distinctes) : idempotence createNotesBulk sous contention', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mycorpus-sqlite-concurrency-'))
  const dbPath = path.join(dir, 'test_concurrency.sqlite')
  try {
    const db1 = new DatabaseSync(dbPath)
    db1.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
    db1.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT);
      CREATE TABLE study_documents (id TEXT PRIMARY KEY, user_id TEXT);
    `)
    initFlashcardSchema(db1)
    migrateFlashcards(db1)

    const db2 = new DatabaseSync(dbPath)
    db2.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')

    const userId = 'user-concurrent-1'
    db1.prepare('INSERT INTO users VALUES(?, ?, ?)').run(userId, 'concurrent@test.com', 'Concurrent')

    const repo1 = new FlashcardRepository(db1)
    const repo2 = new FlashcardRepository(db2)

    const deck = repo1.createDeck(userId, {name: 'Deck Concurrency'})

    const notesPayload = [
      {
        noteType: 'basic',
        defaultDeckId: deck.id,
        fields: {front: 'Qu’est-ce que le nœud sino-auriculaire ?', back: 'Le pacemaker naturel du cœur.'},
        source: {type: 'manual'},
      },
    ]
    const requestId = 'req-sqlite-dual-conn-999'
    const payloadHash = 'hash-dual-conn-123'

    // Lancer createNotesBulk simultanément sur deux connexions SQLite réelles distinctes
    const [res1, res2] = await Promise.all([
      Promise.resolve().then(() => repo1.createNotesBulk(userId, notesPayload, requestId, payloadHash)),
      Promise.resolve().then(() => repo2.createNotesBulk(userId, notesPayload, requestId, payloadHash)),
    ])

    // Les deux doivent réussir sans SQLITE_BUSY
    assert.ok(res1 && res2)
    assert.equal(res1.notes.length, 1)
    assert.equal(res2.notes.length, 1)
    assert.equal(res1.notes[0].id, res2.notes[0].id)
    assert.equal(res1.totalCards, 1)
    assert.equal(res2.totalCards, 1)

    // Vérifier en base : une seule note a été créée
    const countRow = db1.prepare('SELECT COUNT(*) as count FROM flashcard_notes WHERE user_id=?').get(userId)
    assert.equal(countRow.count, 1)

    // Vérifier les cartes dérivées : exactement 1 carte en base
    const cardCountRow = db2.prepare('SELECT COUNT(*) as count FROM flashcards WHERE user_id=?').get(userId)
    assert.equal(cardCountRow.count, 1)

    // Vérifier la table flashcard_save_requests
    const saveReq = db1.prepare('SELECT request_id, payload_hash FROM flashcard_save_requests WHERE user_id=?').get(userId)
    assert.equal(saveReq.request_id, `notes:${requestId}`)
    assert.equal(saveReq.payload_hash, payloadHash)

    db1.close()
    db2.close()
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

