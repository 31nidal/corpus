import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OllamaProvider, createStudyProvider, HttpProvider } from '../server/providers.mjs'

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

function ollamaResponse(content, status = 200) {
  return jsonResponse({ message: { content } }, status)
}

test('Ollama accepte JSON strict, fences et blocs de réflexion sans exposer le prompt', async () => {
  const requests = []
  const provider = new OllamaProvider({ OLLAMA_MODEL: 'qwen3:8b' }, {
    fetchImpl: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) })
      return ollamaResponse('<think>raisonnement privé</think>\n```json\n{"summary":{"overview":"Une synthèse structurée et précise."}}\n```')
    }
  })
  const result = await provider.generateStudySummary({
    documentTitle: 'Neuroanatomie',
    sections: [{ id: 's1', title: 'Innervation', content: 'TEXTE_PDF_COMPLET_SECRET' }],
    facts: [{ sectionId: 's1', sectionTitle: 'Innervation', kind: 'innervation', subject: 'le diaphragme', answer: 'Le nerf phrénique', relation: 'innerve', evidence: 'Le nerf phrénique innerve le diaphragme.' }]
  })
  assert.equal(result.overview, 'Une synthèse structurée et précise.')
  assert.equal(requests[0].url, 'http://127.0.0.1:11434/api/chat')
  assert.equal(requests[0].body.model, 'qwen3:8b')
  assert.equal(requests[0].body.format, 'json')
  assert.equal(requests[0].body.think, false)
  assert.equal(JSON.stringify(requests[0].body).includes('TEXTE_PDF_COMPLET_SECRET'), false)
  assert.match(JSON.stringify(requests[0].body), /Le nerf phrénique innerve le diaphragme/)
})

test('Ollama retourne les QCM JSON et utilise le modèle configurable', async () => {
  let requestBody
  const provider = new OllamaProvider({ OLLAMA_MODEL: 'modele-test:4b' }, {
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body)
      return ollamaResponse(JSON.stringify({ questions: [{ prompt: 'Question anatomique suffisamment précise ?', options: ['A', 'B', 'C', 'D'], correct: [0], why: ['raison correcte', 'raison incorrecte', 'raison incorrecte', 'raison incorrecte'] }] }))
    }
  })
  const questions = await provider.generateStudyQuestions({ count: 4, facts: [{ answer: 'Le nerf vague' }] })
  assert.equal(requestBody.model, 'modele-test:4b')
  assert.equal(requestBody.think, false)
  assert.equal(questions.length, 1)
})

test('healthCheck indique disponibilité et présence du modèle demandé', async () => {
  const provider = new OllamaProvider({}, { fetchImpl: async () => jsonResponse({ models: [{ name: 'qwen3:8b' }] }) })
  assert.deepEqual(await provider.healthCheck(), { reachable: true, modelAvailable: true, model: 'qwen3:8b' })
  const missing = new OllamaProvider({}, { fetchImpl: async () => jsonResponse({ models: [{ name: 'qwen3:4b' }] }) })
  assert.deepEqual(await missing.healthCheck(), { reachable: true, modelAvailable: false, model: 'qwen3:8b' })
  const offline = new OllamaProvider({}, { fetchImpl: async () => { throw new Error('connection refused') } })
  assert.deepEqual(await offline.healthCheck(), { reachable: false, modelAvailable: false })
})

test('Ollama indisponible est normalisé sans propager de contenu utilisateur', async () => {
  const provider = new OllamaProvider({}, { fetchImpl: async () => { throw new Error('private prompt data') } })
  await assert.rejects(provider.generateStudySummary({}), { message: 'ollama_unavailable' })
})

test('Ollama respecte le timeout configuré', async () => {
  const provider = new OllamaProvider({ OLLAMA_TIMEOUT_MS: '1000' }, { fetchImpl: async (_url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true })
  }) })
  await assert.rejects(provider.generateStudySummary({}), { message: 'ollama_timeout' })
})

test('Ollama signale un modèle absent et refuse une réponse JSON invalide', async () => {
  const absent = new OllamaProvider({}, { fetchImpl: async () => jsonResponse({ error: 'model not found' }, 404) })
  await assert.rejects(absent.generateStudyQuestions({}), { message: 'ollama_model_not_found' })
  const invalid = new OllamaProvider({}, { fetchImpl: async () => ollamaResponse('Voici du texte sans objet exploitable.') })
  await assert.rejects(invalid.generateStudyQuestions({}), { message: 'ollama_invalid_json' })
})

test('Study est local par défaut ; le distant et Ollama nécessitent un choix explicite', () => {
  const remote = new HttpProvider({ CHAT_UPSTREAM_URL: 'http://provider.test' })
  let ollamaCalls = 0
  assert.equal(createStudyProvider({}, { remoteProvider: remote, fetchImpl: async () => { ollamaCalls++; throw new Error('unexpected ollama request') } }), null)
  assert.equal(createStudyProvider({ STUDY_AI_PROVIDER: '' }, { remoteProvider: remote }), null)
  assert.equal(createStudyProvider({ STUDY_AI_PROVIDER: 'remote' }, { remoteProvider: remote }), remote)
  assert.equal(createStudyProvider({ STUDY_AI_PROVIDER: 'local' }, { remoteProvider: remote }), null)
  const ollama = createStudyProvider({ STUDY_AI_PROVIDER: 'ollama', OLLAMA_MODEL: 'qwen3:8b' }, { remoteProvider: remote })
  assert.ok(ollama instanceof OllamaProvider)
  assert.equal(ollama.usesPaidQuota, false)
  assert.equal(createStudyProvider({ STUDY_AI_PROVIDER: 'unsupported' }, { remoteProvider: remote }), null)
  assert.equal(ollamaCalls, 0, 'la sélection locale ne doit instancier ni appeler Ollama')
})
