const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/'
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite'
export const AI_LIMITS = Object.freeze({chunkCharacters: 16000, inputCharacters: 500000, chunks: 32, outputTokens: 6144, responseBytes: 512000, concurrency: 2, queue: 8, retries: 1})
export const aiError = (code, message, status = 503) => Object.assign(new Error(message), {code, status})
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) && String(value ?? '').trim() ? Math.max(min, Math.min(max, Number(value))) : fallback

// Shared across clients in the single Node process. Queued calls are bounded too.
let active = 0
const waiting = []
async function acquire(signal, concurrency) {
  if (signal.aborted) throw aiError('AI_TIMEOUT', 'Le délai de génération IA est dépassé.')
  if (active < concurrency) {active++; return}
  if (waiting.length >= AI_LIMITS.queue) throw aiError('AI_BUSY', 'Le service IA est occupé. Réessayez dans un instant.', 429)
  await new Promise((resolve, reject) => {
    const item = {resolve: () => {signal.removeEventListener('abort', abort); resolve()}}
    const abort = () => {const index = waiting.indexOf(item); if (index >= 0) waiting.splice(index, 1); reject(aiError('AI_TIMEOUT', 'Le délai de génération IA est dépassé.'))}
    signal.addEventListener('abort', abort, {once: true})
    waiting.push(item)
  })
}
function release() {const next = waiting.shift(); if (next) next.resolve(); else active--}

async function limitedJson(response, signal) {
  if (Number(response.headers.get('content-length')) > AI_LIMITS.responseBytes) throw aiError('AI_RESPONSE_TOO_LARGE', 'La réponse IA dépasse la taille autorisée.')
  const reader = response.body?.getReader()
  if (!reader) throw aiError('AI_INVALID_JSON', 'La réponse IA est illisible.')
  let size = 0
  const chunks = []
  try {
    while (true) {
      signal.throwIfAborted()
      const {done, value} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > AI_LIMITS.responseBytes) throw aiError('AI_RESPONSE_TOO_LARGE', 'La réponse IA dépasse la taille autorisée.')
      chunks.push(Buffer.from(value))
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch (error) {
    await reader.cancel().catch(() => {})
    if (error.code?.startsWith('AI_')) throw error
    throw aiError('AI_INVALID_JSON', 'La réponse IA est illisible. Réessayez.')
  }
}

export class GeminiClient {
  constructor(config = {}, {fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))} = {}) {
    this.key = String(config.GEMINI_API_KEY || '').trim()
    this.model = String(config.GEMINI_MODEL || GEMINI_DEFAULT_MODEL).trim()
    if (!/^[a-zA-Z0-9._-]{1,100}$/.test(this.model)) throw aiError('AI_CONFIGURATION', 'Le nom du modèle Gemini est invalide.')
    this.fetch = fetchImpl
    this.sleep = sleep
    this.timeout = bounded(config.GEMINI_TIMEOUT_MS, 45000, 1000, 90000)
    this.concurrency = Math.floor(bounded(config.GEMINI_CONCURRENCY, 2, 1, 4))
    this.inputPrice = bounded(config.GEMINI_INPUT_USD_PER_MILLION, .10, 0, 100)
    this.outputPrice = bounded(config.GEMINI_OUTPUT_USD_PER_MILLION, .40, 0, 100)
  }
  async json({instruction, data, schema, signal: parentSignal, onUsage = () => {}, inlinePdf}) {
    if (!this.key) throw aiError('AI_CONFIGURATION', 'La clé Gemini n’est pas configurée sur le serveur.')
    const signal = parentSignal ? AbortSignal.any([parentSignal, AbortSignal.timeout(this.timeout)]) : AbortSignal.timeout(this.timeout)
    await acquire(signal, this.concurrency)
    try {
      for (let attempt = 0; attempt <= AI_LIMITS.retries; attempt++) {
        signal.throwIfAborted()
        onUsage({attempts: 1, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, usageKnown: false})
        let response
        try {
          response = await this.fetch(`${ENDPOINT}${this.model}:generateContent`, {
            method: 'POST', signal,
            headers: {'Content-Type': 'application/json', 'x-goog-api-key': this.key},
            body: JSON.stringify({
              systemInstruction: {parts: [{text: instruction}]},
              contents: [{role: 'user', parts: [{text: JSON.stringify(data)}, ...(inlinePdf ? [{inlineData: {mimeType: 'application/pdf', data: inlinePdf.toString('base64')}}] : [])]}],
              generationConfig: {temperature: .2, maxOutputTokens: AI_LIMITS.outputTokens, responseMimeType: 'application/json', responseJsonSchema: schema, thinkingConfig: {thinkingBudget: 0}},
            }),
          })
        } catch {
          // Network failures may have been billed: never blindly retry them.
          throw aiError(signal.aborted ? 'AI_TIMEOUT' : 'AI_NETWORK', 'Gemini n’a pas répondu. Réessayez dans un instant.')
        }
        if (!response.ok) {
          await response.body?.cancel().catch(() => {})
          if ([429, 500, 502, 503, 504].includes(response.status) && attempt < AI_LIMITS.retries && !signal.aborted) {
            const delay = Math.min(2000, Math.max(250, Number(response.headers.get('retry-after')) * 1000 || 500))
            await this.sleep(delay)
            continue
          }
          const code = response.status === 429 ? 'AI_RATE_LIMIT' : [401, 403].includes(response.status) ? 'AI_AUTH' : response.status === 404 ? 'AI_MODEL_UNAVAILABLE' : 'AI_UPSTREAM'
          throw aiError(code, response.status === 429 ? 'La limite temporaire de Gemini est atteinte. Réessayez plus tard.' : 'Gemini est indisponible ou mal configuré. Réessayez plus tard.')
        }
        const body = await limitedJson(response, signal)
        const usage = body.usageMetadata || {}
        const number = value => Number.isSafeInteger(value) && value >= 0 ? value : 0
        const inputTokens = number(usage.promptTokenCount)
        const outputTokens = number(usage.candidatesTokenCount) + number(usage.thoughtsTokenCount)
        onUsage({attempts: 0, inputTokens, outputTokens, estimatedUsd: (inputTokens * this.inputPrice + outputTokens * this.outputPrice) / 1e6, usageKnown: Boolean(body.usageMetadata)})
        const candidate = body.candidates?.[0]
        if (candidate?.finishReason !== 'STOP') throw aiError(candidate?.finishReason === 'MAX_TOKENS' ? 'AI_TRUNCATED' : 'AI_BLOCKED', 'La réponse IA est incomplète ou bloquée. Aucun résultat partiel n’a été enregistré.')
        const text = candidate.content?.parts?.filter(part => typeof part.text === 'string' && !part.thought).map(part => part.text).join('')
        try {return JSON.parse(text)} catch {throw aiError('AI_INVALID_JSON', 'La réponse IA n’est pas un JSON valide. Aucun résultat n’a été enregistré.')}
      }
    } catch (error) {
      if (error.code?.startsWith('AI_')) throw error
      throw aiError(signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE', 'La génération IA a échoué. Réessayez.')
    } finally {release()}
  }
}
