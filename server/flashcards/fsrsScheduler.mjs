import {createHash, randomUUID} from 'node:crypto'
import {createEmptyCard, fsrs, FSRSVersion, Rating, State} from 'ts-fsrs'

export const DAY = 86400000

export const RATING = Object.freeze({
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
})

export const STATES = Object.freeze({
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
})

const STATE_NAMES = Object.freeze({
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
})

export const DEFAULT_FSRS_CONFIG = Object.freeze({
  requestRetention: 0.90,
  maximumInterval: 36500,
  enableShortTerm: true,
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
  enableFuzz: true,
})

export function formatInterval(intervalMs) {
  const ms = Math.max(0, Number(intervalMs) || 0)
  if (ms < 60000) return '< 1 min'
  if (ms < 3600000) return `${Math.round(ms / 60000)} min`
  if (ms < 86400000) return `${Math.round(ms / 3600000)} h`
  if (ms < 30 * DAY) return `${Math.max(1, Math.round(ms / DAY))} j`
  if (ms < 365 * DAY) return `${Math.max(1, Math.round(ms / (30 * DAY)))} mo`
  const years = ms / (365 * DAY)
  return `${years.toFixed(1).replace(/\.0$/, '')} a`
}

export function createFsrsScheduler(customConfig = {}) {
  const config = {
    ...DEFAULT_FSRS_CONFIG,
    ...customConfig,
  }

  if (!Number.isFinite(config.requestRetention) || config.requestRetention <= 0 || config.requestRetention >= 1) {
    throw new Error('Rétention FSRS invalide (doit être comprise strictement entre 0 et 1).')
  }

  const engine = fsrs({
    request_retention: config.requestRetention,
    maximum_interval: config.maximumInterval,
    enable_short_term: config.enableShortTerm,
    learning_steps: config.learningSteps,
    relearning_steps: config.relearningSteps,
    enable_fuzz: config.enableFuzz,
  })

  // Extract raw parameters safely without Proxy cloning issues
  const rawParams = {
    request_retention: engine.parameters.request_retention,
    maximum_interval: engine.parameters.maximum_interval,
    enable_short_term: engine.parameters.enable_short_term,
    learning_steps: [...engine.parameters.learning_steps],
    relearning_steps: [...engine.parameters.relearning_steps],
    enable_fuzz: engine.parameters.enable_fuzz,
    w: [...engine.parameters.w], // 21 parameters in FSRS-6.0
  }

  const schedulerVersion = `ts-fsrs-${FSRSVersion}`
  const schedulerConfigHash = createHash('sha256')
    .update(JSON.stringify({version: schedulerVersion, params: rawParams}))
    .digest('hex')
    .slice(0, 16)

  function toCard(row) {
    const rawLastReview = row.last_reviewed_at ?? row.lastReviewedAt
    const lastReview = Number.isFinite(rawLastReview) ? new Date(rawLastReview) : undefined
    const rawDueAt = row.due_at ?? row.dueAt
    const rawState = row.state
    return {
      due: new Date(Number.isFinite(rawDueAt) ? rawDueAt : Date.now()),
      stability: Number(row.fsrs_stability ?? row.stability ?? 0),
      difficulty: Number(row.fsrs_difficulty ?? row.difficulty ?? 0),
      elapsed_days: 0,
      scheduled_days: Math.max(0, Math.floor(row.fsrs_scheduled_days ?? row.scheduledDays ?? row.interval_days ?? row.intervalDays ?? 0)),
      reps: Number(row.fsrs_reps ?? row.fsrsReps ?? row.reps ?? 0),
      lapses: Number(row.lapses ?? 0),
      learning_steps: Number(row.fsrs_learning_steps ?? row.learningSteps ?? 0),
      state: lastReview ? (STATES[rawState] ?? State.New) : State.New,
      last_review: lastReview,
    }
  }

  function computeCandidates(row, now = Date.now()) {
    if (!Number.isFinite(now)) throw new Error('Timestamp now invalide.')
    const cardBefore = toCard(row)
    const repeatResult = engine.repeat(cardBefore, new Date(now))

    const candidates = {}
    for (const [ratingKey, ratingVal] of Object.entries(RATING)) {
      const outcome = repeatResult[ratingVal]
      const nextCard = outcome.card
      const nextLog = outcome.log
      const dueAt = nextCard.due.getTime()
      const intervalMs = Math.max(0, dueAt - now)
      const intervalDays = nextCard.scheduled_days > 0 ? nextCard.scheduled_days : intervalMs / DAY

      candidates[ratingKey] = {
        rating: ratingKey,
        state: STATE_NAMES[nextCard.state] || 'review',
        dueAt,
        intervalDays,
        scheduledDays: nextCard.scheduled_days,
        difficulty: nextCard.difficulty,
        stability: nextCard.stability,
        fsrsReps: nextCard.reps,
        lapses: nextCard.lapses,
        learningSteps: nextCard.learning_steps,
        elapsedDays: nextLog.elapsed_days,
        label: formatInterval(intervalMs),
        legacyRepetitions: ratingKey === 'again' ? 0 : (Number(row.repetitions || 0) + 1),
        legacyEaseFactor: Number(row.ease_factor || 2.5),
        audit: {
          before: {
            state: STATE_NAMES[cardBefore.state] || 'new',
            stability: cardBefore.stability,
            difficulty: cardBefore.difficulty,
            reps: cardBefore.reps,
            lapses: cardBefore.lapses,
          },
          after: {
            state: STATE_NAMES[nextCard.state] || 'review',
            stability: nextCard.stability,
            difficulty: nextCard.difficulty,
            reps: nextCard.reps,
            lapses: nextCard.lapses,
          },
          log: {
            rating: ratingKey,
            elapsed_days: nextLog.elapsed_days,
            scheduled_days: nextCard.scheduled_days,
            review: now,
          },
          scheduler_version: schedulerVersion,
          scheduler_config_hash: schedulerConfigHash,
        },
      }
    }
    return candidates
  }

  function createPreviewSnapshot(row, now = Date.now(), {ttlMs = 7200000} = {}) {
    const candidates = computeCandidates(row, now)
    const previewId = randomUUID()
    const expiresAt = now + ttlMs
    const reviewVersion = Number(row.review_version || 0)

    const labels = {
      again: candidates.again.label,
      hard: candidates.hard.label,
      good: candidates.good.label,
      easy: candidates.easy.label,
    }

    return {
      id: previewId,
      cardId: row.card_id || row.id,
      userId: row.user_id,
      reviewVersion,
      previewAt: now,
      expiresAt,
      labels,
      candidates,
      schedulerVersion,
      schedulerConfigHash,
    }
  }

  function applyReview(row, rating, now = Date.now(), candidateFromSnapshot = null) {
    if (!RATING[rating] || !Number.isFinite(now)) throw new Error('Révision FSRS invalide.')

    let next
    if (candidateFromSnapshot && candidateFromSnapshot.rating === rating) {
      next = candidateFromSnapshot
    } else {
      const candidates = computeCandidates(row, now)
      next = candidates[rating]
    }

    const nextVersion = Number(row.review_version || 0) + 1

    return {
      state: next.state,
      dueAt: next.dueAt,
      intervalDays: next.intervalDays,
      scheduledDays: next.scheduledDays,
      difficulty: next.difficulty,
      stability: next.stability,
      fsrsReps: next.fsrsReps,
      lapses: next.lapses,
      learningSteps: next.learningSteps,
      elapsedDays: next.elapsedDays,
      lastRating: rating,
      lastReviewedAt: now,
      easeFactor: next.legacyEaseFactor,
      repetitions: next.legacyRepetitions,
      reviewVersion: nextVersion,
      schedulerVersion,
      schedulerConfigHash,
      auditJson: JSON.stringify(next.audit),
    }
  }

  function reconstructMemory(row, logs = []) {
    // 1. Nouvelle carte sans interaction
    if (row.state === 'new' && !row.last_reviewed_at && !logs.length) {
      return {
        stability: 0,
        difficulty: 0,
        fsrsReps: 0,
        lapses: 0,
        learningSteps: 0,
        origin: 'new',
      }
    }

    // 2. Rejeu complet depuis l'historique de logs existant
    const validLogs = logs.filter(log => RATING[log.rating] && Number.isFinite(log.reviewed_at))
    if (validLogs.length) {
      let card = createEmptyCard(new Date(validLogs[0].reviewed_at))
      for (const log of validLogs) {
        card = engine.next(card, new Date(log.reviewed_at), RATING[log.rating]).card
      }
      return {
        stability: card.stability,
        difficulty: card.difficulty,
        fsrsReps: Math.max(validLogs.length, (row.repetitions || 0) + (row.lapses || 0)),
        lapses: card.lapses,
        learningSteps: 0,
        origin: 'replayed_available_history',
      }
    }

    // 3. Pas de logs exploitables : utilisation stricte des primitives FSRS + heuristique déclarée
    const lastRating = RATING[row.last_rating] ? row.last_rating : 'good'
    const ratingCode = RATING[lastRating]

    // Primitive FSRS pour initialiser la difficulté
    const primitiveDifficulty = engine.init_difficulty(ratingCode)
    const primitiveStability = engine.init_stability(ratingCode)

    if (row.state === 'relearning') {
      const againCode = Rating.Again
      return {
        stability: engine.init_stability(againCode),
        difficulty: engine.init_difficulty(againCode),
        fsrsReps: Math.max(1, (row.repetitions || 0) + (row.lapses || 0)),
        lapses: Math.max(1, row.lapses || 0),
        learningSteps: 0,
        origin: 'bootstrap_primitive_relearning',
      }
    }

    if (row.state === 'learning' || (row.interval_days || 0) < 1) {
      return {
        stability: primitiveStability,
        difficulty: primitiveDifficulty,
        fsrsReps: Math.max(1, (row.repetitions || 0) + (row.lapses || 0)),
        lapses: row.lapses || 0,
        learningSteps: 0,
        origin: 'bootstrap_primitive_learning',
      }
    }

    if (row.lapses && row.lapses >= 2) {
      const againCode = Rating.Again
      return {
        stability: Math.max(1.0, engine.init_stability(againCode)),
        difficulty: engine.init_difficulty(againCode),
        fsrsReps: Math.max(row.repetitions || 0, row.lapses),
        lapses: row.lapses,
        learningSteps: 0,
        origin: 'bootstrap_heuristic_lapsed',
      }
    }

    // Carte mature (interval_days >= 1): heuristique de migration déclarée
    return {
      stability: Math.max(1.0, Number(row.interval_days || 1.0)),
      difficulty: primitiveDifficulty,
      fsrsReps: Math.max(1, (row.repetitions || 0) + (row.lapses || 0)),
      lapses: row.lapses || 0,
      learningSteps: 0,
      origin: 'bootstrap_heuristic_mature',
    }
  }

  function retrievability(row, now = Date.now()) {
    if (row.state === 'new' || row.last_reviewed_at == null || !row.fsrs_stability) return null
    return engine.get_retrievability(toCard(row), new Date(now), false)
  }

  return {
    engine,
    config,
    rawParams,
    schedulerVersion,
    schedulerConfigHash,
    toCard,
    computeCandidates,
    createPreviewSnapshot,
    applyReview,
    reconstructMemory,
    retrievability,
  }
}

export const defaultFsrsScheduler = createFsrsScheduler()
