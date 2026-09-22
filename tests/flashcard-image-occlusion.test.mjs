import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {randomUUID} from 'node:crypto'
import {existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {initFlashcardSchema} from '../server/flashcards/schema.mjs'
import {migrateFlashcards} from '../server/flashcards/migrations.mjs'
import {FlashcardRepository} from '../server/flashcards/repository.mjs'
import {createFlashcardHandler} from '../server/flashcards/handler.mjs'
import {buildFlashcardAnki} from '../server/flashcards/anki.mjs'
import {deriveCardsFromNote} from '../server/flashcards/derivation.mjs'

// 1x1 transparent PNG buffer
const PNG_1X1_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
// 1x1 JPEG buffer
const JPEG_1X1_BUFFER = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')

function createTestContext() {
  const dir = path.resolve(`.data/test_io_${randomUUID()}`)
  mkdirSync(dir, {recursive: true})
  const db = new DatabaseSync(path.join(dir, 'test.sqlite'))
  db.exec('PRAGMA foreign_keys=ON;')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      page_count INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_sections (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      page_start INTEGER NOT NULL,
      page_end INTEGER NOT NULL,
      order_index INTEGER NOT NULL
    );
  `)
  initFlashcardSchema(db)
  migrateFlashcards(db)

  const createUser = (id, email = `${id}@test.local`, name = id) => {
    db.prepare('INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?)').run(id, email, name, new Date().toISOString())
  }

  const cleanup = () => {
    try { db.close() } catch {}
    try { rmSync(dir, {recursive: true, force: true}) } catch {}
  }

  return {dir, db, createUser, cleanup}
}

test('image_occlusion derivation : génération exacte d’une carte par masque', () => {
  const mask1Id = `mask_${randomUUID()}`
  const mask2Id = `mask_${randomUUID()}`
  const assetId = `asset_${randomUUID()}`

  const fields = {
    prompt: 'Identifier l’artère',
    extra: 'Branche de l’aorte',
    occlusionMode: 'hide_one',
    masks: [
      {id: mask1Id, x: 0.1, y: 0.2, width: 0.3, height: 0.4, label: 'Artère coronaire droite'},
      {id: mask2Id, x: 0.5, y: 0.6, width: 0.2, height: 0.2, label: 'Artère coronaire gauche'},
    ],
  }

  assert.throws(
    () => deriveCardsFromNote('image_occlusion', fields, []),
    /assetId obligatoire dans le contexte/
  )

  const cards = deriveCardsFromNote('image_occlusion', fields, [], {assetId})
  assert.equal(cards.length, 2)

  assert.equal(cards[0].derivationKey, `occlusion:${mask1Id}`)
  assert.equal(cards[0].cardType, 'image_occlusion')
  assert.equal(cards[0].front, 'Identifier l’artère')
  assert.equal(cards[0].back, 'Artère coronaire droite\n\nBranche de l’aorte')
  assert.deepEqual(cards[0].visual, {
    type: 'image_occlusion',
    assetId,
    targetMaskId: mask1Id,
    targetRect: {x: 0.1, y: 0.2, width: 0.3, height: 0.4},
  })

  // Test suppressed mask
  const cardsSuppressed = deriveCardsFromNote('image_occlusion', fields, [`occlusion:${mask1Id}`], {assetId})
  assert.equal(cardsSuppressed.length, 1)
  assert.equal(cardsSuppressed[0].derivationKey, `occlusion:${mask2Id}`)
})

test('image_occlusion CRUD : création, unicité de l’asset primary, synchronisation et suppression de masque', () => {
  const {db, dir, createUser, cleanup} = createTestContext()
  try {
    const repo = new FlashcardRepository(db)
    const userId = 'user_1'
    createUser(userId)
    const deck = repo.createDeck(userId, {name: 'Anatomie Cardiaque'})

    // Create an asset
    const assetId = `asset_${randomUUID()}`
    const asset = repo.createAsset(userId, {
      id: assetId,
      mimeType: 'image/png',
      width: 800,
      height: 600,
      byteSize: 1024,
      sha256: 'abc123hash',
      storageKey: `${assetId}.png`,
      sourceKind: 'upload',
    })
    assert.equal(asset.id, assetId)

    const mask1Id = `mask_${randomUUID()}`
    const mask2Id = `mask_${randomUUID()}`

    // 1. Rejet si pas d'assetId
    assert.throws(() => {
      repo.createNote(userId, {
        defaultDeckId: deck.id,
        noteType: 'image_occlusion',
        fields: {
          prompt: 'Identifier',
          occlusionMode: 'hide_one',
          masks: [{id: mask1Id, x: 0.1, y: 0.1, width: 0.2, height: 0.2, label: 'Masque 1'}],
        },
      })
    }, /Un assetId est requis/)

    // 2. Rejet si assetId d'un autre utilisateur
    assert.throws(() => {
      repo.createNote(userId, {
        defaultDeckId: deck.id,
        noteType: 'image_occlusion',
        assetId: `asset_${randomUUID()}`,
        fields: {
          prompt: 'Identifier',
          occlusionMode: 'hide_one',
          masks: [{id: mask1Id, x: 0.1, y: 0.1, width: 0.2, height: 0.2, label: 'Masque 1'}],
        },
      })
    }, /Asset introuvable ou non autorisé/)

    // 3. Création réussie
    const note = repo.createNote(userId, {
      defaultDeckId: deck.id,
      noteType: 'image_occlusion',
      assetId,
      fields: {
        prompt: 'Identifier les valves',
        extra: 'Vue supérieure',
        occlusionMode: 'hide_one',
        masks: [
          {id: mask1Id, x: 0.1, y: 0.1, width: 0.2, height: 0.2, label: 'Valve mitrale'},
          {id: mask2Id, x: 0.4, y: 0.4, width: 0.2, height: 0.2, label: 'Valve tricuspide'},
        ],
      },
    })

    assert.equal(note.assetId, assetId)
    const card1 = note.cards.find(c => c.visual?.targetMaskId === mask1Id)
    const card2 = note.cards.find(c => c.visual?.targetMaskId === mask2Id)
    assert.ok(card1)
    assert.ok(card2)
    assert.equal(card1.cardType, 'image_occlusion')
    assert.equal(card1.visual.assetId, assetId)
    assert.equal(card2.visual.assetId, assetId)

    // Vérifier l'autorité relationnelle dans flashcard_note_assets
    const relRows = db.prepare('SELECT * FROM flashcard_note_assets WHERE note_id=?').all(note.id)
    assert.equal(relRows.length, 1)
    assert.equal(relRows[0].asset_id, assetId)
    assert.equal(relRows[0].role, 'primary')

    // 4. Update de la note : suppression d'un masque
    const updatedNote = repo.updateNote(userId, note.id, {
      fields: {
        prompt: 'Identifier les valves',
        extra: 'Vue supérieure',
        occlusionMode: 'hide_one',
        masks: [
          {id: mask1Id, x: 0.1, y: 0.1, width: 0.2, height: 0.2, label: 'Valve mitrale (modifié)'},
        ],
      },
    }, note.noteVersion)

    assert.equal(updatedNote.cards.length, 1)
    assert.equal(updatedNote.cards[0].derivationKey, `occlusion:${mask1Id}`)
    assert.match(updatedNote.cards[0].back, /modifié/)

    // 5. Suppression de la carte dérivée restante -> suppression enregistrée dans suppressed_derivations
    const cardId = updatedNote.cards[0].id
    const deleteOk = repo.deleteCard(userId, cardId, updatedNote.noteVersion)
    assert.equal(deleteOk, true)

    const reloaded = repo.note(userId, note.id)
    assert.equal(reloaded.cards.length, 0)
    assert.deepEqual(reloaded.suppressedDerivations, [`occlusion:${mask1Id}`])

    // 6. Restauration de la dérivation
    const restored = repo.restoreDerivation(userId, note.id, `occlusion:${mask1Id}`, reloaded.noteVersion)
    assert.equal(restored.cards.length, 1)
    assert.deepEqual(restored.suppressedDerivations, [])

    // 7. Duplication de la note -> conserve assetId mais régénère les mask IDs
    const duplicate = repo.duplicateNote(userId, note.id)
    assert.equal(duplicate.assetId, assetId)
    assert.equal(duplicate.cards.length, 1)
    assert.notEqual(duplicate.fields.masks[0].id, mask1Id)
    assert.match(duplicate.fields.masks[0].id, /^mask_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  } finally {
    cleanup()
  }
})

test('image_occlusion purge orpheline : asset > 24h non lié est purgé, asset < 24h ou lié est conservé', () => {
  const {db, dir, createUser, cleanup} = createTestContext()
  try {
    const repo = new FlashcardRepository(db)
    const userId = 'user_purge'
    createUser(userId)
    const deck = repo.createDeck(userId, {name: 'Test Purge'})
    const assetsDir = path.join(dir, 'flashcard_assets')
    mkdirSync(assetsDir, {recursive: true})

    // 1. Asset lié à une note
    const linkedAssetId = `asset_${randomUUID()}`
    const linkedFile = `${linkedAssetId}.png`
    writeFileSync(path.join(assetsDir, linkedFile), PNG_1X1_BUFFER)
    repo.createAsset(userId, {
      id: linkedAssetId,
      mimeType: 'image/png',
      width: 1,
      height: 1,
      byteSize: PNG_1X1_BUFFER.length,
      sha256: 'h1',
      storageKey: linkedFile,
      sourceKind: 'upload',
    })
    repo.createNote(userId, {
      defaultDeckId: deck.id,
      noteType: 'image_occlusion',
      assetId: linkedAssetId,
      fields: {
        prompt: 'P',
        occlusionMode: 'hide_one',
        masks: [{id: `mask_${randomUUID()}`, x: 0, y: 0, width: 0.1, height: 0.1, label: 'L'}],
      },
    })

    // 2. Asset orphelin récent (< 24h)
    const recentOrphanId = `asset_${randomUUID()}`
    const recentFile = `${recentOrphanId}.png`
    writeFileSync(path.join(assetsDir, recentFile), PNG_1X1_BUFFER)
    repo.createAsset(userId, {
      id: recentOrphanId,
      mimeType: 'image/png',
      width: 1,
      height: 1,
      byteSize: PNG_1X1_BUFFER.length,
      sha256: 'h2',
      storageKey: recentFile,
      sourceKind: 'upload',
    })

    // 3. Asset orphelin vieux (> 24h)
    const oldOrphanId = `asset_${randomUUID()}`
    const oldFile = `${oldOrphanId}.png`
    writeFileSync(path.join(assetsDir, oldFile), PNG_1X1_BUFFER)
    repo.createAsset(userId, {
      id: oldOrphanId,
      mimeType: 'image/png',
      width: 1,
      height: 1,
      byteSize: PNG_1X1_BUFFER.length,
      sha256: 'h3',
      storageKey: oldFile,
      sourceKind: 'upload',
    })
    // Backdate the created_at in DB to 48 hours ago
    db.prepare('UPDATE flashcard_assets SET created_at=? WHERE id=?').run(Date.now() - 48 * 3600 * 1000, oldOrphanId)

    // Run purge
    const purged = repo.purgeOrphanAssets(assetsDir)
    assert.equal(purged, 1)

    // Assertions
    assert.equal(existsSync(path.join(assetsDir, oldFile)), false)
    assert.equal(repo.getAsset(userId, oldOrphanId), null)

    assert.equal(existsSync(path.join(assetsDir, recentFile)), true)
    assert.notEqual(repo.getAsset(userId, recentOrphanId), null)

    assert.equal(existsSync(path.join(assetsDir, linkedFile)), true)
    assert.notEqual(repo.getAsset(userId, linkedAssetId), null)
  } finally {
    cleanup()
  }
})

test('Anki TSV export fallback pour image_occlusion', () => {
  const assetId = `asset_${randomUUID()}`
  const maskId = `mask_${randomUUID()}`
  const cards = [
    {
      id: 'c1',
      deckId: 'd1',
      cardType: 'image_occlusion',
      front: 'Identifier l’organe',
      back: 'Cœur',
      subject: 'Anatomie',
      tags: ['visuel'],
    },
  ]
  const decks = [{id: 'd1', name: 'Cardio'}]

  const tsv = buildFlashcardAnki(cards, decks)
  assert.match(tsv, /\[Image Occlusion : Identifier l’organe\]/)
  assert.match(tsv, /Consulter l’image dans MyCorpus/)
  assert.match(tsv, /Cœur/)
})

test('API HTTP flashcards/assets : upload binaire, vérifications sécurité, headers GET et création de note', async () => {
  const {createAccountHandler} = await import('../server/accounts.mjs')
  const {Readable} = await import('node:stream')
  const dir = path.resolve(`.data/test_api_io_${randomUUID()}`)
  mkdirSync(dir, {recursive: true})

  const config = {ACCOUNT_DATA_DIR: dir, APP_ORIGIN: 'https://mycorpus.test'}
  const account = createAccountHandler(config)
  const flashcards = createFlashcardHandler(config)

  const call = async (route, method = 'GET', body = undefined, cookie = '', headers = {}) => {
    let req
    const isBuffer = Buffer.isBuffer(body)
    if (isBuffer) {
      req = Readable.from([body])
    } else {
      const raw = body === undefined ? '' : JSON.stringify(body)
      req = Readable.from(raw ? [Buffer.from(raw)] : [])
    }
    req.url = route
    req.method = method
    req.headers = {
      cookie,
      ...(isBuffer
        ? {'x-mycorpus-request': '1'}
        : body === undefined ? {} : {'content-type': 'application/json', 'x-mycorpus-request': '1'}),
      ...headers,
    }
    req.socket = {remoteAddress: '127.0.0.1'}

    let status = 200, output = '', responseHeaders = {}
    const res = {
      writeHead(code, values = {}) {
        status = code
        responseHeaders = {...responseHeaders, ...values}
      },
      setHeader(name, value) { responseHeaders[name] = value },
      write(chunk) { output += chunk },
      end(value = '') { output += value },
    }

    await (route.startsWith('/api/account/') ? account : flashcards)(req, res)
    const cookies = responseHeaders['Set-Cookie'] || responseHeaders['set-cookie'] || []
    const list = Array.isArray(cookies) ? cookies : [cookies]
    let parsedData = null
    try {
      parsedData = JSON.parse(output)
    } catch {
      parsedData = output
    }
    return {
      status,
      data: parsedData,
      headers: responseHeaders,
      cookie: list.map(v => v.split(';')[0]).find(v => v.startsWith('mycorpus_session=')),
    }
  }

  try {
    // Inscrire utilisateur
    const user = await call('/api/account/register', 'POST', {
      email: 'io@example.test',
      name: 'IO Tester',
      password: 'valid-password-2026',
    })
    const cookie = user.cookie

    // 1. Upload rejeté si SVG
    const svgRes = await call(
      '/api/flashcards/assets/upload',
      'POST',
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>'),
      cookie,
      {'content-type': 'image/svg+xml'}
    )
    assert.equal(svgRes.status, 415)
    assert.match(svgRes.data.error, /Format SVG interdit/)

    // 2. Upload PNG réussi
    const uploadRes = await call(
      '/api/flashcards/assets/upload',
      'POST',
      PNG_1X1_BUFFER,
      cookie,
      {'content-type': 'image/png'}
    )
    assert.equal(uploadRes.status, 201)
    assert(uploadRes.data.asset.id.startsWith('asset_'))
    assert.equal(uploadRes.data.asset.width, 1)
    assert.equal(uploadRes.data.asset.height, 1)
    const assetId = uploadRes.data.asset.id

    // 3. GET asset avec cookie valide
    const getAssetRes = await call(`/api/flashcards/assets/${assetId}`, 'GET', undefined, cookie)
    assert.equal(getAssetRes.status, 200)
    assert.equal(getAssetRes.headers['Content-Type'], 'image/png')
    assert.equal(getAssetRes.headers['X-Content-Type-Options'], 'nosniff')
    assert.match(getAssetRes.headers['Cache-Control'], /immutable/)

    // 4. GET asset pour utilisateur non authentifié ou autre compte -> 401 ou 404
    const unauthRes = await call(`/api/flashcards/assets/${assetId}`, 'GET', undefined, '')
    assert.equal(unauthRes.status, 401)

    const otherUser = await call('/api/account/register', 'POST', {
      email: 'other_io@example.test',
      name: 'Other',
      password: 'valid-password-2026',
    })
    const otherGetRes = await call(`/api/flashcards/assets/${assetId}`, 'GET', undefined, otherUser.cookie)
    assert.equal(otherGetRes.status, 404)

    // 5. Créer un deck et une note Image Occlusion via l'API
    const deckRes = await call('/api/flashcards/decks', 'POST', {name: 'Deck IO'}, cookie)
    const deckId = deckRes.data.deck.id

    const maskId = `mask_${randomUUID()}`
    const noteRes = await call('/api/flashcards/notes', 'POST', {
      defaultDeckId: deckId,
      noteType: 'image_occlusion',
      assetId,
      title: 'Note Cardio IO',
      fields: {
        prompt: 'Identifier la cavité',
        occlusionMode: 'hide_one',
        masks: [
          {id: maskId, x: 0.1, y: 0.2, width: 0.3, height: 0.4, label: 'Ventricule gauche'},
        ],
      },
    }, cookie)

    assert.equal(noteRes.status, 201)
    assert.equal(noteRes.data.note.cards.length, 1)
    assert.equal(noteRes.data.note.cards[0].cardType, 'image_occlusion')
    assert.equal(noteRes.data.note.cards[0].visual.targetMaskId, maskId)
  } finally {
    try { rmSync(dir, {recursive: true, force: true}) } catch {}
  }
})
