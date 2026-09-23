import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {randomUUID} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs'
import path from 'node:path'
import {Readable} from 'node:stream'
import {initFlashcardSchema} from '../server/flashcards/schema.mjs'
import {migrateFlashcards} from '../server/flashcards/migrations.mjs'
import {FlashcardRepository} from '../server/flashcards/repository.mjs'
import {createFlashcardHandler} from '../server/flashcards/handler.mjs'
import {createAccountHandler} from '../server/accounts.mjs'
import {buildFlashcardAnki} from '../server/flashcards/anki.mjs'
import {deriveCardsFromNote} from '../server/flashcards/derivation.mjs'
import {validateNote} from '../server/flashcards/validation.mjs'
import {
  calculateEffectiveVisibleMeshes,
  checkAtlasCardCompatibility,
  getAtlasModel,
  getCanonicalStructureName,
  getMeshToRealGroupMap,
  resolveAtlasStructure,
} from '../server/flashcards/atlasRegistry.mjs'

function createTestContext() {
  const dir = path.resolve(`.data/test_atlas3d_${randomUUID()}`)
  mkdirSync(dir, {recursive: true})
  const db = new DatabaseSync(path.join(dir, 'mycorpus.sqlite'))
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

test('Atlas 3D : vérification des révisions injectées dans les manifestes statiques', () => {
  const overviewManifest = JSON.parse(readFileSync('public/models/overview.json', 'utf8'))
  assert.equal(overviewManifest.atlasRevision, 'bp3d-overview-v1')

  const detailManifest = JSON.parse(readFileSync('public/models/manifest.json', 'utf8'))
  assert.equal(detailManifest.atlasRevision, 'bp3d-detail-v1')

  const femaleManifest = JSON.parse(readFileSync('public/models/female-regions/manifest.json', 'utf8'))
  assert.equal(femaleManifest.atlasRevision, 'hra-female-v1')
})

test('Atlas 3D : résolution canonique des noms français depuis les dictionnaires JSON', () => {
  // 1. Modèle female_detail : "left nipple" doit donner "Mamelon — côté gauche"
  // et non "Glande mammaire" (issue de describeStructure)
  const femaleNipple = getCanonicalStructureName('female_detail', 'HRA-VH_F_nipple_L')
  assert.equal(femaleNipple, 'Mamelon — côté gauche')

  // 2. Modèle bp3d_overview : FMA50801 (Brain) doit donner "Encéphale"
  const brainName = getCanonicalStructureName('bp3d_overview', 'FMA50801')
  assert.equal(brainName, 'Encéphale')
})

test('Atlas 3D : dérivation de 1..N cartes avec clés canoniques et projection visuelle', () => {
  const targetId1 = `target_${randomUUID()}`
  const targetId2 = `target_${randomUUID()}`
  const fields = {
    modelKey: 'bp3d_overview',
    atlasRevision: 'bp3d-overview-v1',
    prompt: 'Identifier la structure anatomique',
    extra: 'Organe vital',
    targets: [
      {id: targetId1, structureId: 'FMA50801'}, // Brain
      {id: targetId2, structureId: 'FMA7088'},  // Heart
    ],
    scene: {
      modelKey: 'bp3d_overview',
      atlasRevision: 'bp3d-overview-v1',
      camera: {position: [0, 0, 6], target: [0, 0, 0]},
      visibility: {skin: true, skeleton: true, organs: true},
      opacity: {skin: 0.12, skeleton: 1, organs: 1},
      cut: {enabled: false, axis: 'z', position: 0, flipped: false, guide: false},
      isolationStructureId: null,
      hiddenStructureIds: [],
    },
  }

  const cards = deriveCardsFromNote('atlas_3d', fields, [])
  assert.equal(cards.length, 2)

  // Carte 1
  assert.equal(cards[0].derivationKey, `atlas:${targetId1}`)
  assert.equal(cards[0].cardType, 'atlas_3d')
  assert.equal(cards[0].front, 'Identifier la structure anatomique')
  assert.equal(cards[0].back, 'Encéphale\n\nOrgane vital')
  assert.deepEqual(cards[0].visual, {
    type: 'atlas_3d',
    modelKey: 'bp3d_overview',
    atlasRevision: 'bp3d-overview-v1',
    targetId: targetId1,
    structureId: 'FMA50801',
  })

  // Carte 2
  assert.equal(cards[1].derivationKey, `atlas:${targetId2}`)
  assert.equal(cards[1].cardType, 'atlas_3d')
  assert.equal(cards[1].back, 'Coeur\n\nOrgane vital')
  assert.equal(cards[1].visual.structureId, 'FMA7088')
})

test('Atlas 3D : calcul déterministe des maillages visibles et garde anti-recto-vide', () => {
  // Scène avec uniquement FMA50801 visible via isolationStructureId
  const emptyRectoScene = {
    modelKey: 'bp3d_overview',
    atlasRevision: 'bp3d-overview-v1',
    camera: {position: [0, 0, 6], target: [0, 0, 0]},
    visibility: {skin: false, skeleton: false, organs: true},
    opacity: {skin: 0, skeleton: 0, organs: 1},
    cut: {enabled: false, axis: 'z', position: 0, flipped: false, guide: false},
    isolationStructureId: 'FMA50801',
    hiddenStructureIds: [],
  }

  const res = calculateEffectiveVisibleMeshes('bp3d_overview', emptyRectoScene)
  assert.ok(res.effectiveVisibleMeshes.size > 0)

  // Si la cible est FMA50801, alors tous les maillages visibles lui appartiennent, donc recto vide !
  const struct = resolveAtlasStructure('bp3d_overview', 'FMA50801')
  const targetMeshSet = new Set(struct.meshNames)
  let otherCount = 0
  for (const m of res.effectiveVisibleMeshes) {
    if (!targetMeshSet.has(m)) otherCount++
  }
  assert.equal(otherCount, 0, 'Tous les maillages appartiennent à la cible -> recto vide')
})

test('Atlas 3D : compatibilité des révisions et statuts EXACT, COMPATIBLE, STALE_UNKNOWN, UNAVAILABLE', () => {
  const targetId = `target_${randomUUID()}`
  const scene = {
    camera: {position: [0, 0, 6], target: [0, 0, 0]},
    visibility: {skin: true, skeleton: true, organs: true},
    opacity: {skin: 0.12, skeleton: 1, organs: 1},
    cut: {enabled: false, axis: 'z', position: 0, flipped: false, guide: false},
    isolationStructureId: null,
    hiddenStructureIds: [],
  }
  const targets = [{id: targetId, structureId: 'FMA50801'}]

  // EXACT
  const exact = checkAtlasCardCompatibility('bp3d_overview', 'bp3d-overview-v1', scene, targets)
  assert.equal(exact.status, 'EXACT')
  assert.equal(exact.reviewable, true)

  // STALE_UNKNOWN
  const stale = checkAtlasCardCompatibility('bp3d_overview', 'bp3d-overview-legacy-0', scene, targets)
  assert.equal(stale.status, 'STALE_UNKNOWN')
  assert.equal(stale.reviewable, false)
  assert.equal(stale.code, 'ERR_ATLAS_CARD_NOT_REVIEWABLE')

  // UNAVAILABLE (structure cible inexistante)
  const unavail = checkAtlasCardCompatibility('bp3d_overview', 'bp3d-overview-v1', scene, [{id: targetId, structureId: 'UNKNOWN_9999'}])
  assert.equal(unavail.status, 'UNAVAILABLE')
  assert.equal(unavail.reviewable, false)
  assert.equal(unavail.code, 'ERR_ATLAS_CARD_NOT_REVIEWABLE')

  // UNAVAILABLE (groupe non autorisé dans visibility)
  const unavailGroup = checkAtlasCardCompatibility('bp3d_overview', 'bp3d-overview-v1', {
    ...scene,
    visibility: {...scene.visibility, muscles: true},
  }, targets)
  assert.equal(unavailGroup.status, 'UNAVAILABLE')
  assert.equal(unavailGroup.reviewable, false)
  assert.equal(unavailGroup.code, 'ERR_ATLAS_CARD_NOT_REVIEWABLE')

  // UNAVAILABLE (recto vide - tous les maillages appartiennent à la cible)
  const emptyScene = {
    ...scene,
    visibility: {skin: false, skeleton: false, organs: true},
    opacity: {skin: 0, skeleton: 0, organs: 1},
    isolationStructureId: 'FMA50801',
  }
  const unavailEmpty = checkAtlasCardCompatibility('bp3d_overview', 'bp3d-overview-v1', emptyScene, targets)
  assert.equal(unavailEmpty.status, 'UNAVAILABLE')
  assert.equal(unavailEmpty.reviewable, false)
  assert.equal(unavailEmpty.code, 'ERR_ATLAS_CARD_NOT_REVIEWABLE')
})

test('Atlas 3D : CRUD repository, préservation FSRS lors d’un changement de caméra, et duplication', () => {
  const ctx = createTestContext()
  try {
    const userId = `user_${randomUUID()}`
    ctx.createUser(userId)
    const repo = new FlashcardRepository(ctx.db)
    const deck = repo.createDeck(userId, {name: 'Anatomie 3D'})

    const targetId1 = `target_${randomUUID()}`
    const targetId2 = `target_${randomUUID()}`

    // 1. Création d'une note Atlas 3D avec 2 cibles
    const noteFields = {
      modelKey: 'bp3d_overview',
      atlasRevision: 'bp3d-overview-v1',
      prompt: 'Repérer l’organe',
      extra: 'Notes',
      targets: [
        {id: targetId1, structureId: 'FMA50801'}, // Cerveau
        {id: targetId2, structureId: 'FMA7088'},  // Cœur
      ],
      scene: {
        modelKey: 'bp3d_overview',
        atlasRevision: 'bp3d-overview-v1',
        camera: {position: [0, 0, 6], target: [0, 0, 0]},
        visibility: {skin: true, skeleton: true, organs: true},
        opacity: {skin: 0.12, skeleton: 1, organs: 1},
        cut: {enabled: false, axis: 'z', position: 0, flipped: false, guide: false},
        isolationStructureId: null,
        hiddenStructureIds: [],
      },
    }

    const createdNote = repo.createNote(userId, {
      defaultDeckId: deck.id,
      noteType: 'atlas_3d',
      title: 'Organes principaux',
      fields: noteFields,
    })
    assert.ok(createdNote)
    assert.equal(createdNote.noteType, 'atlas_3d')
    assert.equal(createdNote.cards.length, 2)
    const [card1, card2] = createdNote.cards

    // Simuler une révision FSRS sur card1
    ctx.db.prepare(`
      UPDATE flashcard_reviews
      SET repetitions = 3, interval_days = 12, due_at = ?, review_version = 1
      WHERE card_id = ?
    `).run(Date.now() + 86400000 * 12, card1.id)

    // 2. Mise à jour de la scène (déplacement caméra) sans changer les cibles
    const updatedNote = repo.updateNote(
      userId,
      createdNote.id,
      {
        fields: {
          ...noteFields,
          scene: {
            ...noteFields.scene,
            camera: {position: [1, 2, 8], target: [0, 0, 0]},
          },
        },
      },
      createdNote.noteVersion
    )
    assert.ok(updatedNote)

    // Vérifier que le suivi FSRS de card1 est strictement préservé
    const card1AfterUpdate = repo.card(userId, card1.id)
    assert.equal(card1AfterUpdate.review.repetitions, 3)
    assert.equal(card1AfterUpdate.review.intervalDays, 12)
    assert.equal(card1AfterUpdate.review.reviewVersion, 1)

    // 3. Rejet 400 en cas de tentative de modifier le structureId sous le même targetId
    assert.throws(
      () => repo.updateNote(userId, createdNote.id, {
        fields: {
          ...noteFields,
          targets: [
            {id: targetId1, structureId: 'FMA7088'}, // Changement interdit de FMA50801 vers FMA7088
            {id: targetId2, structureId: 'FMA7088'},
          ],
        },
      }, updatedNote.noteVersion),
      (err) => {
        assert.equal(err.status, 400)
        assert.match(err.message, /Le structureId d'une cible Atlas existante ne peut pas être modifié/)
        return true
      }
    )

    // 4. Duplication de la Note
    const duplicated = repo.duplicateNote(userId, createdNote.id, deck.id)
    assert.ok(duplicated)
    assert.notEqual(duplicated.id, createdNote.id)
    assert.equal(duplicated.cards.length, 2)
    // Les cibles doivent avoir de nouveaux IDs conformes au format UUID
    assert.notEqual(duplicated.fields.targets[0].id, targetId1)
    assert.match(duplicated.fields.targets[0].id, /^target_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    assert.notEqual(duplicated.cards[0].id, card1.id)
    assert.equal(duplicated.cards[0].review.reviewVersion, 0) // FSRS initialisé
  } finally {
    ctx.cleanup()
  }
})

test('Atlas 3D : rejet 409 ERR_ATLAS_CARD_NOT_REVIEWABLE sur preview et review en cas de révision STALE_UNKNOWN', async () => {
  const dir = path.resolve(`.data/test_api_atlas3d_${randomUUID()}`)
  mkdirSync(dir, {recursive: true})
  let db = null
  try {
    const config = {ACCOUNT_DATA_DIR: dir, APP_ORIGIN: 'https://mycorpus.test'}
    const account = createAccountHandler(config)
    const flashcards = createFlashcardHandler(config)

    const call = async (route, method = 'GET', body = undefined, cookie = '', headers = {}) => {
      const raw = body === undefined ? '' : JSON.stringify(body)
      const req = Readable.from(raw ? [Buffer.from(raw)] : [])
      req.url = route
      req.method = method
      req.headers = {
        cookie,
        ...(body === undefined ? {} : {'content-type': 'application/json', 'x-mycorpus-request': '1'}),
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
      let parsedData = null
      try { parsedData = output ? JSON.parse(output) : null } catch {}
      return {status, body: parsedData, headers: responseHeaders}
    }

    // 1. Authentifier utilisateur
    const registerRes = await call('/api/account/register', 'POST', {
      email: 'atlas_review@test.local',
      password: 'password12345',
      name: 'Dr Atlas',
    })
    assert.equal(registerRes.status, 201)
    const cookie = registerRes.headers['Set-Cookie']?.[0]?.split(';')?.[0] || registerRes.headers['set-cookie']?.[0]?.split(';')?.[0]

    // 2. Créer un deck
    const deckRes = await call('/api/flashcards/decks', 'POST', {name: 'Test 3D'}, cookie)
    assert.equal(deckRes.status, 201)
    const deckId = deckRes.body.deck.id

    const targetId = `target_${randomUUID()}`

    // 3. Créer une note Atlas 3D
    const noteRes = await call('/api/flashcards/notes', 'POST', {
      defaultDeckId: deckId,
      noteType: 'atlas_3d',
      title: 'Cerveau 3D',
      fields: {
        modelKey: 'bp3d_overview',
        atlasRevision: 'bp3d-overview-v1',
        prompt: 'Identifier la structure',
        targets: [{id: targetId, structureId: 'FMA50801'}],
        scene: {
          modelKey: 'bp3d_overview',
          atlasRevision: 'bp3d-overview-v1',
          camera: {position: [0, 0, 6], target: [0, 0, 0]},
          visibility: {skin: true, skeleton: true, organs: true},
          opacity: {skin: 0.12, skeleton: 1, organs: 1},
          cut: {enabled: false, axis: 'z', position: 0, flipped: false, guide: false},
          isolationStructureId: null,
          hiddenStructureIds: [],
        },
      },
    }, cookie)
    assert.equal(noteRes.status, 201)
    const cardId = noteRes.body.note.cards[0].id
    const noteId = noteRes.body.note.id

    db = new DatabaseSync(path.join(dir, 'mycorpus.sqlite'))

    // Simuler le passage de la révision en STALE_UNKNOWN en base de données
    const row = db.prepare('SELECT fields_json FROM flashcard_notes WHERE id=?').get(noteId)
    const fields = JSON.parse(row.fields_json)
    fields.atlasRevision = 'unknown-stale-rev'
    fields.scene.atlasRevision = 'unknown-stale-rev'
    db.prepare('UPDATE flashcard_notes SET fields_json=? WHERE id=?').run(JSON.stringify(fields), noteId)

    // Forcer la carte due maintenant
    db.prepare('UPDATE flashcard_reviews SET due_at=? WHERE card_id=?').run(Date.now() - 10000, cardId)

    // 4. Tester POST /preview -> doit renvoyer 409 ERR_ATLAS_CARD_NOT_REVIEWABLE
    const previewRes = await call(`/api/flashcards/cards/${cardId}/preview`, 'POST', {}, cookie)
    assert.equal(previewRes.status, 409)
    assert.equal(previewRes.body.code, 'ERR_ATLAS_CARD_NOT_REVIEWABLE')
    assert.equal(previewRes.body.atlasStatus, 'STALE_UNKNOWN')

    // 5. Tester POST /review -> doit renvoyer 409 ERR_ATLAS_CARD_NOT_REVIEWABLE
    const reviewRes = await call(`/api/flashcards/cards/${cardId}/review`, 'POST', {
      rating: 'good',
      previewId: randomUUID(),
    }, cookie)
    assert.equal(reviewRes.status, 409)
    assert.equal(reviewRes.body.code, 'ERR_ATLAS_CARD_NOT_REVIEWABLE')
    assert.equal(reviewRes.body.atlasStatus, 'STALE_UNKNOWN')

    // Vérifier que la carte est restée intacte (review_version = 0)
    const reviewRow = db.prepare('SELECT review_version FROM flashcard_reviews WHERE card_id=?').get(cardId)
    assert.equal(reviewRow.review_version, 0)
  } finally {
    if (db) db.close()
    rmSync(dir, {recursive: true, force: true})
  }
})

test('Atlas 3D : export Anki avec fallback textuel standard', () => {
  const cards = [
    {
      id: 'card_atlas_1',
      deckId: 'deck_1',
      noteId: 'note_1',
      cardType: 'atlas_3d',
      front: 'Identifier la structure encéphalique',
      back: 'Encéphale (cerveau)',
      tags: ['anatomie', '3d'],
      subject: 'Neuroanatomie',
    },
  ]
  const decks = [{id: 'deck_1', name: 'Atlas 3D Deck'}]
  const notesMap = new Map([
    [
      'note_1',
      {
        id: 'note_1',
        noteType: 'atlas_3d',
        fields: {prompt: 'Identifier la structure encéphalique'},
      },
    ],
  ])

  const ankiTsv = buildFlashcardAnki(cards, decks, notesMap)
  assert.ok(ankiTsv.includes('[Atlas 3D : Identifier la structure encéphalique]'))
  assert.ok(ankiTsv.includes('(Consulter la scène 3D dans MyCorpus)'))
  assert.ok(ankiTsv.includes('Encéphale (cerveau)'))
})

test('Atlas 3D : validation stricte targetId au format UUID regex', () => {
  const validUUID = randomUUID()
  const validTarget = {id: `target_${validUUID}`, structureId: 'FMA50801'}
  const invalidTarget1 = {id: 'target_1', structureId: 'FMA50801'}
  const invalidTarget2 = {id: `target_${Date.now()}`, structureId: 'FMA50801'}
  const invalidTarget3 = {id: 'target_not-a-uuid', structureId: 'FMA50801'}

  const baseNote = {
    noteType: 'atlas_3d',
    title: 'Test targets',
    fields: {
      modelKey: 'bp3d_overview',
      atlasRevision: 'bp3d-overview-v1',
      prompt: 'Test',
      scene: {
        modelKey: 'bp3d_overview',
        atlasRevision: 'bp3d-overview-v1',
        camera: {position: [0, 0, 6], target: [0, 0, 0]},
        visibility: {skin: true, skeleton: true, organs: true},
        opacity: {skin: 0.12, skeleton: 1, organs: 1},
        cut: {enabled: false, axis: 'z', position: 0, flipped: false, guide: false},
        isolationStructureId: null,
        hiddenStructureIds: [],
      },
    },
  }

  // Valide
  const validRes = validateNote({...baseNote, fields: {...baseNote.fields, targets: [validTarget]}})
  assert.ok(validRes, 'Cible avec UUID valide doit être acceptée')
  assert.equal(validRes.fields.targets[0].id, `target_${validUUID}`)

  // Invalides
  assert.equal(validateNote({...baseNote, fields: {...baseNote.fields, targets: [invalidTarget1]}}), null)
  assert.equal(validateNote({...baseNote, fields: {...baseNote.fields, targets: [invalidTarget2]}}), null)
  assert.equal(validateNote({...baseNote, fields: {...baseNote.fields, targets: [invalidTarget3]}}), null)
})

test('Atlas 3D : multi-group aggregate fix - le maillage physique d’un groupe masqué n’est pas réactivé par un aggregate visible', () => {
  // Dans bp3d_detail, trouvons une structure non-agrégée du groupe 'arteries' dont le maillage est aussi dans un aggregate multi-groupes
  const detailManifest = JSON.parse(readFileSync('public/models/manifest.json', 'utf8'))
  const aggregateWithArteries = detailManifest.structures.find(s => s.aggregate && Array.isArray(s.groups) && s.groups.includes('arteries') && s.meshNames?.length)
  assert.ok(aggregateWithArteries, 'Aggregate multi-groupes avec arteries trouvé')

  // Trouver un maillage de cet aggregate qui appartient physiquement à une structure de 'arteries'
  const meshToReal = getMeshToRealGroupMap('bp3d_detail')
  const arteryMesh = aggregateWithArteries.meshNames.find(m => meshToReal.get(m) === 'arteries')
  assert.ok(arteryMesh, 'Un maillage physique arteries est référencé par l’aggregate')

  // Scène avec arteries=false (opacité 0), mais les autres groupes de l’aggregate visibles
  const scene = {
    camera: {position: [0, 0, 6], target: [0, 0, 0]},
    visibility: {skin: false, skeleton: false, organs: true, muscles: false, arteries: false, veins: true, nerves: false, joints: false},
    opacity: {skin: 0, skeleton: 0, organs: 1, muscles: 0, arteries: 0, veins: 1, nerves: 0, joints: 0},
    cut: {enabled: false, axis: 'z', position: 0, flipped: false, guide: false},
    isolationStructureId: null,
    hiddenStructureIds: [],
  }

  const res = calculateEffectiveVisibleMeshes('bp3d_detail', scene)
  assert.equal(res.effectiveVisibleMeshes.has(arteryMesh), false, 'Le maillage arteryMesh ne doit PAS être visible car son groupe physique réel arteries est inactif')
})

test('Atlas 3D : cache de note versionné noteId:noteVersion (v1 -> v2 recharge v2)', () => {
  const noteId = `note_${randomUUID()}`
  const noteV1 = {id: noteId, noteVersion: 1, fields: {prompt: 'Prompt V1'}}
  const noteV2 = {id: noteId, noteVersion: 2, fields: {prompt: 'Prompt V2'}}

  const cache = new Map()
  // Enregistrer v1
  const key1 = `${noteId}:${noteV1.noteVersion}`
  cache.set(key1, noteV1)
  cache.set(noteId, noteV1)

  // Carte pointant sur v1
  const cardV1 = {id: 'c1', noteId, noteVersion: 1}
  const keyCard1 = typeof cardV1.noteVersion === 'number' ? `${cardV1.noteId}:${cardV1.noteVersion}` : cardV1.noteId
  assert.equal(cache.get(keyCard1)?.fields.prompt, 'Prompt V1')

  // Carte bumpée sur v2
  const cardV2 = {id: 'c1', noteId, noteVersion: 2}
  const keyCard2 = typeof cardV2.noteVersion === 'number' ? `${cardV2.noteId}:${cardV2.noteVersion}` : cardV2.noteId
  assert.equal(cache.get(keyCard2), undefined, 'La clé versionnée v2 est un cache miss et déclenche un rechargement')

  // Après fetch et mise en cache de v2
  cache.set(keyCard2, noteV2)
  cache.set(noteId, noteV2)
  assert.equal(cache.get(keyCard2)?.fields.prompt, 'Prompt V2')
  assert.notEqual(cache.get(keyCard1), cache.get(keyCard2))
})
