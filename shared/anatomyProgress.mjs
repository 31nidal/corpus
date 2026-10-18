const revisions = new Set(['bp3d-overview-v1','bp3d-detail-v1','hra-female-v1','hra-vhf-detail-v1'])
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
const date = value => typeof value === 'string' && value.length <= 30 && Number.isFinite(Date.parse(value))
export function validAnatomyAttempt(value) {
  return Boolean(value && id(value.id) && revisions.has(value.revision) && ['free','mcq','click','label','exam'].includes(value.mode) && date(value.startedAt) && date(value.completedAt) && Number.isSafeInteger(value.durationSeconds) && value.durationSeconds >= 0 && value.durationSeconds <= 864000 && Array.isArray(value.answers) && value.answers.length > 0 && value.answers.length <= 10 && value.answers.every(answer => answer && id(answer.structureId) && typeof answer.given === 'string' && answer.given.length <= 200 && typeof answer.correct === 'boolean'))
}
export function validAnatomyProgress(value) {
  return Boolean(value && value.version === 1 && Array.isArray(value.attempts) && value.attempts.length <= 100 && value.attempts.every(validAnatomyAttempt) && new Set(value.attempts.map(a=>a.id)).size === value.attempts.length)
}
/** Attempts are immutable events: late devices can add attempts but cannot erase newer ones. */
export function mergeAnatomyProgress(incoming, current) {
  const attempts = new Map(current.attempts.map(attempt=>[attempt.id,attempt]))
  for (const attempt of incoming.attempts) if (!attempts.has(attempt.id)) attempts.set(attempt.id,attempt)
  return {version:1, attempts:[...attempts.values()].sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt)||a.id.localeCompare(b.id)).slice(-100)}
}
