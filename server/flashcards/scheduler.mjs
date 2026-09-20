export const DAY = 86400000

export function scheduleReview(before, rating, now = Date.now()) {
  const ease = Number(before?.ease_factor ?? 2.5)
  const interval = Number(before?.interval_days ?? 0)
  const repetitions = Number(before?.repetitions ?? 0)
  const lapses = Number(before?.lapses ?? 0)
  let next
  if (rating === 'again') next = {state: 'relearning', intervalDays: 10 / 1440, easeFactor: Math.max(1.3, ease - 0.2), repetitions: 0, lapses: lapses + 1}
  else if (rating === 'hard') next = {state: 'review', intervalDays: Math.max(1, interval ? interval * 1.2 : 1), easeFactor: Math.max(1.3, ease - 0.15), repetitions: repetitions + 1, lapses}
  else if (rating === 'easy') next = {state: 'review', intervalDays: Math.max(4, interval ? interval * ease * 1.3 : 4), easeFactor: Math.min(3.2, ease + 0.15), repetitions: repetitions + 1, lapses}
  else next = {state: 'review', intervalDays: Math.max(repetitions ? interval * ease : 1, 1), easeFactor: ease, repetitions: repetitions + 1, lapses}
  next.intervalDays = Math.min(36500, Math.round(next.intervalDays * 1000) / 1000)
  return {...next, dueAt: Math.round(now + next.intervalDays * DAY), lastRating: rating, lastReviewedAt: now}
}
