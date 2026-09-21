import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
  createFsrsScheduler,
  formatInterval,
  DAY,
} from '../server/flashcards/fsrsScheduler.mjs'

test('configuration FSRS : 21 paramètres W, configuration explicite et hash calculé', () => {
  const scheduler = createFsrsScheduler({enableFuzz: false})
  assert.equal(scheduler.rawParams.w.length, 21, 'FSRS-6.0 doit comporter exactement 21 paramètres W')
  assert.equal(scheduler.rawParams.request_retention, 0.90)
  assert.equal(scheduler.rawParams.enable_short_term, true)
  assert.deepEqual(scheduler.rawParams.learning_steps, ['1m', '10m'])
  assert.deepEqual(scheduler.rawParams.relearning_steps, ['10m'])
  assert.ok(scheduler.schedulerConfigHash.length >= 16)
})

test('formatInterval : affichage lisible et ordonné', () => {
  assert.equal(formatInterval(30000), '< 1 min')
  assert.equal(formatInterval(600000), '10 min')
  assert.equal(formatInterval(14400000), '4 h')
  assert.equal(formatInterval(2 * DAY), '2 j')
  assert.equal(formatInterval(60 * DAY), '2 mo')
  assert.equal(formatInterval(400 * DAY), '1.1 a')
})

test('nouvelle carte : preview et réponses avec date contrôlée', () => {
  const scheduler = createFsrsScheduler({enableFuzz: false})
  const now = Date.UTC(2026, 8, 20, 10, 0, 0)
  const newCard = {
    id: 'card-1',
    user_id: 'user-1',
    state: 'new',
    due_at: now,
    fsrs_stability: 0,
    fsrs_difficulty: 0,
    fsrs_reps: 0,
    lapses: 0,
    fsrs_learning_steps: 0,
    interval_days: 0,
    review_version: 0,
  }

  const snapshot = scheduler.createPreviewSnapshot(newCard, now)
  assert.equal(snapshot.reviewVersion, 0)
  assert.ok(snapshot.labels.again.includes('min'))
  assert.ok(snapshot.candidates.again.dueAt < snapshot.candidates.hard.dueAt)
  assert.ok(snapshot.candidates.hard.dueAt <= snapshot.candidates.good.dueAt)
  assert.ok(snapshot.candidates.good.dueAt < snapshot.candidates.easy.dueAt)

  // Vérification de la garantie : le candidat appliqué est strictement identique au snapshot
  const candidateGood = snapshot.candidates.good
  const applied = scheduler.applyReview(newCard, 'good', now, candidateGood)
  assert.equal(applied.dueAt, candidateGood.dueAt)
  assert.equal(applied.state, candidateGood.state)
  assert.equal(applied.difficulty, candidateGood.difficulty)
  assert.equal(applied.stability, candidateGood.stability)
  assert.equal(applied.reviewVersion, 1)
  assert.equal(applied.schedulerConfigHash, scheduler.schedulerConfigHash)
})

test('progression de révision : stabilité croissante après plusieurs Good', () => {
  const scheduler = createFsrsScheduler({enableFuzz: false})
  let now = Date.UTC(2026, 8, 20, 10, 0, 0)
  let card = {
    id: 'card-progression',
    user_id: 'user-1',
    state: 'new',
    due_at: now,
    fsrs_stability: 0,
    fsrs_difficulty: 0,
    fsrs_reps: 0,
    lapses: 0,
    fsrs_learning_steps: 0,
    interval_days: 0,
    review_version: 0,
  }

  // Étape 1 : Good (rentre dans learning step 1: 10m)
  const step1 = scheduler.applyReview(card, 'good', now)
  assert.equal(step1.state, 'learning')
  assert.equal(step1.learningSteps, 1)

  // 10 min plus tard : Good (diplômée vers review)
  now = step1.dueAt
  card = {
    ...card,
    ...step1,
    review_version: step1.reviewVersion,
    fsrs_stability: step1.stability,
    fsrs_difficulty: step1.difficulty,
    fsrs_reps: step1.fsrsReps,
    fsrs_learning_steps: step1.learningSteps,
  }
  const step2 = scheduler.applyReview(card, 'good', now)
  assert.equal(step2.state, 'review')
  assert.ok(step2.scheduledDays >= 1)

  // Prochaine révision à l'échéance : Good
  now = step2.dueAt
  card = {
    ...card,
    ...step2,
    review_version: step2.reviewVersion,
    fsrs_stability: step2.stability,
    fsrs_difficulty: step2.difficulty,
    fsrs_reps: step2.fsrsReps,
    fsrs_learning_steps: step2.learningSteps,
  }
  const step3 = scheduler.applyReview(card, 'good', now)
  assert.ok(step3.stability > step2.stability, 'La stabilité doit croître après un Good sur carte mature')
})

test('lapse sur carte mature : chute de stabilité et passage en relearning', () => {
  const scheduler = createFsrsScheduler({enableFuzz: false})
  const now = Date.UTC(2026, 8, 20, 10, 0, 0)
  const matureCard = {
    id: 'card-mature',
    user_id: 'user-1',
    state: 'review',
    due_at: now,
    last_reviewed_at: now - 30 * DAY,
    fsrs_stability: 30,
    fsrs_difficulty: 4.5,
    fsrs_reps: 8,
    lapses: 0,
    fsrs_learning_steps: 0,
    interval_days: 30,
    review_version: 5,
  }

  const result = scheduler.applyReview(matureCard, 'again', now)
  assert.equal(result.state, 'relearning')
  assert.equal(result.lapses, 1)
  assert.ok(result.stability < matureCard.fsrs_stability, 'La stabilité doit chuter après un lapse')
  assert.equal(result.repetitions, 0, 'La répétition consécutive legacy doit être remise à 0 sur Again')
  assert.equal(result.fsrsReps, 9, 'fsrs_reps doit être incrémenté même sur Again')
})

test('reconstruction mémoire migration : déterministe et conforme aux primitives', () => {
  const scheduler = createFsrsScheduler({enableFuzz: false})

  // Carte neuve
  const newRow = {state: 'new', last_reviewed_at: null, interval_days: 0}
  const memNew = scheduler.reconstructMemory(newRow, [])
  assert.equal(memNew.origin, 'new')
  assert.equal(memNew.stability, 0)
  assert.equal(memNew.difficulty, 0)

  // Carte mature avec historique de logs complet
  const logDate1 = Date.UTC(2026, 7, 1, 10)
  const logDate2 = Date.UTC(2026, 7, 1, 10, 10)
  const logDate3 = Date.UTC(2026, 7, 3, 10)
  const logs = [
    {rating: 'good', reviewed_at: logDate1},
    {rating: 'good', reviewed_at: logDate2},
    {rating: 'good', reviewed_at: logDate3},
  ]
  const rowWithLogs = {
    state: 'review',
    last_reviewed_at: logDate3,
    interval_days: 5,
    repetitions: 3,
    lapses: 0,
  }
  const memReplayed = scheduler.reconstructMemory(rowWithLogs, logs)
  assert.equal(memReplayed.origin, 'replayed_available_history')
  assert.ok(memReplayed.stability > 0)
  assert.ok(memReplayed.difficulty > 0)

  // Carte mature sans logs (bootstrap heuristique déclaré)
  const matureWithoutLogs = {
    state: 'review',
    last_reviewed_at: Date.UTC(2026, 8, 1, 10),
    interval_days: 28,
    repetitions: 4,
    lapses: 0,
    last_rating: 'good',
  }
  const memMature = scheduler.reconstructMemory(matureWithoutLogs, [])
  assert.equal(memMature.origin, 'bootstrap_heuristic_mature')
  assert.equal(memMature.stability, 28)
  assert.ok(memMature.difficulty > 0)
})

