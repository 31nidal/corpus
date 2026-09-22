const CLOZE_REGEX = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g

export function extractClozeKeys(text) {
  if (typeof text !== 'string') return []
  const matches = [...text.matchAll(CLOZE_REGEX)]
  const numSet = new Set()
  for (const m of matches) {
    const num = parseInt(m[1], 10)
    if (Number.isSafeInteger(num) && num > 0) {
      numSet.add(num)
    }
  }
  return Array.from(numSet).sort((a, b) => a - b).map(n => `c${n}`)
}

export function validateClozeText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return {valid: false, error: 'Le texte cloze ne peut pas être vide.'}
  }
  const keys = extractClozeKeys(text)
  if (!keys.length) {
    return {valid: false, error: 'Le texte doit contenir au moins un trou de type {{c1::mot}} ou {{c1::mot::indice}}.'}
  }
  // Check for unclosed {{c...
  const stripped = text.replace(CLOZE_REGEX, '')
  if (/\{\{c\d+/i.test(stripped)) {
    return {valid: false, error: 'Syntaxe cloze mal formée : une accolade {{c... n’est pas correctement fermée.'}
  }
  return {valid: true, keys}
}

export function renderClozeCard(text, targetKey) {
  if (typeof text !== 'string') return {front: '', back: ''}
  const targetNum = parseInt(String(targetKey).replace(/^c/, ''), 10)

  let front = text.replace(CLOZE_REGEX, (match, numStr, body, hint) => {
    const num = parseInt(numStr, 10)
    if (num === targetNum) {
      const cleanHint = hint ? hint.trim() : ''
      return cleanHint ? `[... ${cleanHint}]` : '[...]'
    }
    return body
  })

  let back = text.replace(CLOZE_REGEX, (match, numStr, body) => {
    const num = parseInt(numStr, 10)
    if (num === targetNum) {
      return `<span class="cloze-revealed" data-cloze="c${num}">${body}</span>`
    }
    return body
  })

  return {front, back}
}

