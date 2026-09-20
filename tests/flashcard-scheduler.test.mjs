import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DAY, scheduleReview} from '../server/flashcards/scheduler.mjs'

test('les quatre réponses produisent des échéances ordonnées', () => {
  const now = Date.UTC(2026, 8, 20, 10)
  const before = {interval_days: 3, ease_factor: 2.5, repetitions: 2, lapses: 0}
  const again = scheduleReview(before, 'again', now)
  const hard = scheduleReview(before, 'hard', now)
  const good = scheduleReview(before, 'good', now)
  const easy = scheduleReview(before, 'easy', now)
  assert.ok(again.dueAt < hard.dueAt)
  assert.ok(hard.dueAt < good.dueAt)
  assert.ok(good.dueAt < easy.dueAt)
  assert.equal(again.lapses, 1)
  assert.equal(good.dueAt, now + 7.5 * DAY)
})

test('une nouvelle carte reçoit des intervalles utiles sans dépasser les bornes', () => {
  const now = 1_800_000_000_000
  assert.equal(scheduleReview({}, 'again', now).state, 'relearning')
  assert.equal(scheduleReview({}, 'hard', now).intervalDays, 1)
  assert.equal(scheduleReview({}, 'good', now).intervalDays, 1)
  assert.equal(scheduleReview({}, 'easy', now).intervalDays, 4)
  assert.equal(scheduleReview({interval_days: 30000, ease_factor: 3.2, repetitions: 50, lapses: 0}, 'easy', now).intervalDays, 36500)
})
