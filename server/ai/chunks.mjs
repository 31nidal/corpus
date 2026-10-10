import {AI_LIMITS, aiError} from './gemini-client.mjs'

// No slice(0, n): either every character is planned, or reject before any API call.
export function planChunks(sections, {chunkCharacters = AI_LIMITS.chunkCharacters, maxCharacters = AI_LIMITS.inputCharacters, maxChunks = AI_LIMITS.chunks} = {}) {
  const total = sections.reduce((sum, section) => sum + String(section.content || '').length, 0)
  if (total > maxCharacters) throw aiError('AI_DOCUMENT_TOO_LARGE', 'Ce contenu dépasse la limite IA. Sélectionnez des sections ou une plage de pages.', 413)
  const fragments = []
  for (const section of sections) {
    const content = String(section.content || '')
    for (let offset = 0; offset < content.length;) {
      let end = Math.min(content.length, offset + chunkCharacters)
      if (end < content.length) {
        const boundary = Math.max(content.lastIndexOf('\n', end), content.lastIndexOf('. ', end))
        if (boundary > offset + chunkCharacters / 2) end = boundary + 1
      }
      fragments.push({sectionId: section.id, title: section.title || '', startPage: section.startPage ?? null, endPage: section.endPage ?? null, offset, content: content.slice(offset, end)})
      offset = end
    }
  }
  const chunks = []
  for (const fragment of fragments) {
    const current = chunks.at(-1)
    if (!current || current.characters + fragment.content.length > chunkCharacters) chunks.push({fragments: [fragment], characters: fragment.content.length})
    else {current.fragments.push(fragment); current.characters += fragment.content.length}
  }
  if (chunks.length > maxChunks) throw aiError('AI_TOO_MANY_CHUNKS', 'Le document nécessite trop d’appels IA. Sélectionnez une partie du cours.', 413)
  return {chunks, totalCharacters: total, sectionCount: sections.length}
}

export function evenlySelect(queues, maximum) {
  queues = queues.filter(queue => queue.length)
  if (maximum < queues.length && maximum > 0) {
    return Array.from({length: maximum}, (_, i) => queues[maximum === 1 ? Math.floor(queues.length / 2) : Math.round(i * (queues.length - 1) / (maximum - 1))][0])
  }
  const result = []
  for (let index = 0; result.length < maximum && queues.some(queue => queue.length > index); index++) {
    for (const queue of queues) if (queue[index] && result.length < maximum) result.push(queue[index])
  }
  return result
}
