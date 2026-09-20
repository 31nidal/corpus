// Provider contract:
// 1) respond(context) -> { message, actions, sources }.
// 2) generateStudySummary(context) -> structured summary object
// 3) generateStudyQuestions(context) -> array of grounded questions
// UI and study logic never depend on any vendor SDK (OpenAI, Anthropic, Gemini).
// Everything passes through the generic upstream HTTP provider contract.

export class HttpProvider {
  constructor(config) {
    this.url = config.CHAT_UPSTREAM_URL
    this.token = config.CHAT_UPSTREAM_TOKEN
  }

  async respond(context) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: JSON.stringify(context),
      signal: AbortSignal.timeout(25000)
    })
    if (!response.ok) throw new Error('provider_unavailable')
    const raw = await response.text()
    if (raw.length > 64000) throw new Error('provider_response_too_large')
    const result = JSON.parse(raw)
    if (typeof result.message !== 'string' || result.message.length > 16000) throw new Error('invalid_provider_response')
    return result
  }

  async generateStudySummary(context) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: JSON.stringify({ task: 'study_summary', ...context }),
      signal: AbortSignal.timeout(30000)
    })
    if (!response.ok) throw new Error('provider_unavailable')
    const raw = await response.text()
    if (raw.length > 128000) throw new Error('provider_response_too_large')
    const result = JSON.parse(raw)
    return result.summary || result
  }

  async generateStudyQuestions(context) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: JSON.stringify({ task: 'study_questions', ...context }),
      signal: AbortSignal.timeout(30000)
    })
    if (!response.ok) throw new Error('provider_unavailable')
    const raw = await response.text()
    if (raw.length > 128000) throw new Error('provider_response_too_large')
    const result = JSON.parse(raw)
    return result.questions || (Array.isArray(result) ? result : null)
  }

  async generateFlashcards(context) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...(this.token ? {Authorization: `Bearer ${this.token}`} : {})},
      body: JSON.stringify({task: 'flashcards', ...context}),
      signal: AbortSignal.timeout(30000)
    })
    if (!response.ok) throw new Error('provider_unavailable')
    const raw = await response.text()
    if (raw.length > 256000) throw new Error('provider_response_too_large')
    const result = JSON.parse(raw)
    return result.flashcards || result.cards || (Array.isArray(result) ? result : null)
  }
}

export function createProvider(config) {
  return config.CHAT_UPSTREAM_URL ? new HttpProvider(config) : null
}
