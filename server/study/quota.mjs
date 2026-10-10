const MAX_STUDY_FILE_SIZE_BYTES = 25 * 1024 * 1024

export function computeNextMonthlyReset(from = new Date()) {
  const date = new Date(from)
  date.setMonth(date.getMonth() + 1)
  return date.toISOString()
}

export function getOrResetStudyQuota(userId, d) {
  let quota = d.prepare('SELECT * FROM study_quotas WHERE user_id = ?').get(userId)
  const now = new Date()

  if (!quota) {
    const resetsAt = computeNextMonthlyReset(now)
    d.prepare(`
      INSERT INTO study_quotas(user_id, max_documents, max_file_size_bytes, monthly_generations, generations_used, quota_resets_at)
      VALUES(?, 25, 26214400, 100, 0, ?)
    `).run(userId, resetsAt)
    return d.prepare('SELECT * FROM study_quotas WHERE user_id = ?').get(userId)
  }

  if (quota.max_file_size_bytes > MAX_STUDY_FILE_SIZE_BYTES) {
    d.prepare('UPDATE study_quotas SET max_file_size_bytes=? WHERE user_id=?').run(MAX_STUDY_FILE_SIZE_BYTES, userId)
    quota.max_file_size_bytes = MAX_STUDY_FILE_SIZE_BYTES
  }
  // Si quota_resets_at est manquant, initialiser
  if (!quota.quota_resets_at) {
    const resetsAt = computeNextMonthlyReset(now)
    d.prepare('UPDATE study_quotas SET quota_resets_at = ? WHERE user_id = ?').run(resetsAt, userId)
    quota.quota_resets_at = resetsAt
  }

  // Vérifier si la date de renouvellement mensuel est échue
  const resetDate = new Date(quota.quota_resets_at)
  if (!isNaN(resetDate.getTime()) && now >= resetDate) {
    let nextReset = new Date(resetDate)
    while (nextReset <= now) {
      nextReset.setMonth(nextReset.getMonth() + 1)
    }
    const nextResetIso = nextReset.toISOString()
    d.prepare(`
      UPDATE study_quotas 
      SET generations_used = 0, quota_resets_at = ?
      WHERE user_id = ?
    `).run(nextResetIso, userId)
    quota.generations_used = 0
    quota.quota_resets_at = nextResetIso
  }

  return quota
}

export function checkGenerationQuota(userId, d) {
  const quota = getOrResetStudyQuota(userId, d)
  if (quota.generations_used >= quota.monthly_generations) {
    let resetDateFormatted = ''
    try {
      resetDateFormatted = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date(quota.quota_resets_at))
    } catch {
      resetDateFormatted = quota.quota_resets_at
    }
    const err = new Error(`Quota mensuel de générations IA atteint (${quota.generations_used}/${quota.monthly_generations}). Votre quota sera réinitialisé le ${resetDateFormatted}.`)
    err.status = 403
    err.code = 'ERR_GENERATION_QUOTA_EXCEEDED'
    throw err
  }
  return quota
}

export function reserveGenerationQuota(userId, d) {
  getOrResetStudyQuota(userId, d)
  const res = d.prepare(`
    UPDATE study_quotas
    SET generations_used = generations_used + 1
    WHERE user_id = ? AND generations_used < monthly_generations
  `).run(userId)

  if (res.changes === 0) {
    return checkGenerationQuota(userId, d)
  }

  return getOrResetStudyQuota(userId, d)
}

export function releaseGenerationQuota(userId, d) {
  d.prepare(`
    UPDATE study_quotas
    SET generations_used = MAX(0, generations_used - 1)
    WHERE user_id = ?
  `).run(userId)
}


