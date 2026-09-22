export function normalizeTypedAnswer(str) {
  if (typeof str !== 'string') return ''
  return str
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr')
}

export function checkTypedAnswer(input, target, acceptedAnswers = []) {
  const normInput = normalizeTypedAnswer(input)
  const normTarget = normalizeTypedAnswer(target)
  if (!normInput) {
    return {matched: false, normalizedInput: '', normalizedTarget: normTarget, matchedAnswer: null}
  }
  if (normInput === normTarget && normTarget.length > 0) {
    return {matched: true, normalizedInput: normInput, normalizedTarget: normTarget, matchedAnswer: target}
  }
  if (Array.isArray(acceptedAnswers)) {
    for (const alt of acceptedAnswers) {
      if (typeof alt === 'string' && normalizeTypedAnswer(alt) === normInput) {
        return {matched: true, normalizedInput: normInput, normalizedTarget: normTarget, matchedAnswer: alt}
      }
    }
  }
  return {matched: false, normalizedInput: normInput, normalizedTarget: normTarget, matchedAnswer: null}
}

