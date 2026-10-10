import {randomUUID} from 'node:crypto'
import {aiError} from './gemini-client.mjs'

export function initAiUsageSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS ai_generation_usage (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task TEXT NOT NULL, model TEXT NOT NULL, outcome TEXT NOT NULL,
    attempts INTEGER NOT NULL, input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL,
    estimated_usd REAL NOT NULL, usage_known INTEGER NOT NULL, created_at INTEGER NOT NULL
  ); CREATE INDEX IF NOT EXISTS ai_usage_user_time ON ai_generation_usage(user_id,created_at);`)
}
export function emptyUsage() {return {attempts: 0, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, usageKnown: true}}
export function collectUsage(target, item) {
  for (const key of ['attempts','inputTokens','outputTokens','estimatedUsd']) target[key] += item[key] || 0
  // Attempt markers carry no billing metadata. A completed response determines usage.
  if (!item.attempts) target.usageKnown &&= item.usageKnown !== false
}
export function recordAiUsage(db, userId, task, generation, outcome) {
  if (!generation?.usage || !generation.model) return
  initAiUsageSchema(db)
  const u = generation.usage
  db.prepare('INSERT INTO ai_generation_usage VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),userId,task,generation.model,outcome,u.attempts,u.inputTokens,u.outputTokens,u.estimatedUsd,Number(u.usageKnown),Date.now())
}
export function aiUsage(db, userId, since = Date.now() - 30 * 86400000) {
  initAiUsageSchema(db)
  return db.prepare('SELECT COALESCE(SUM(attempts),0) AS requests, COALESCE(SUM(input_tokens),0) AS inputTokens, COALESCE(SUM(output_tokens),0) AS outputTokens, COALESCE(SUM(estimated_usd),0) AS estimatedUsd FROM ai_generation_usage WHERE user_id=? AND created_at>=?').get(userId,since)
}
export function checkAiBudget(db, userId, config = {}) {
  const used = aiUsage(db,userId,Date.now()-86400000)
  const requests = Math.max(1,Math.min(2000,Number(config.AI_DAILY_REQUEST_LIMIT)||200))
  const budget = Math.max(.01,Math.min(100,Number(config.AI_DAILY_BUDGET_USD)||1))
  if (used.requests >= requests || used.estimatedUsd >= budget) throw aiError('AI_DAILY_BUDGET', 'Le plafond quotidien de consommation IA est atteint. Réessayez demain.',429)
}
