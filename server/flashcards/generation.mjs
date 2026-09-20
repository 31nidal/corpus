import {randomUUID} from 'node:crypto'

const sentenceSplit = text => String(text).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map(value => value.trim()).filter(value => value.length >= 35 && value.length <= 600)
const normalize = value => value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

function questionFor(sentence) {
  const definition = sentence.match(/^(.{2,90}?)\s+(?:est|correspond à|désigne|se définit comme)\s+(.{12,})[.!]?$/i)
  if (definition) return {front: `Qu’est-ce que ${definition[1].trim()} ?`, back: definition[2].trim().replace(/[.]$/, '') + '.'}
  const colon = sentence.match(/^(.{2,90}?)\s*:\s*(.{12,})$/)
  if (colon) return {front: `Que faut-il retenir à propos de « ${colon[1].trim()} » ?`, back: colon[2].trim()}
  const subject = sentence.match(/^(.{3,80}?)\s+(permet|participe|assure|comprend|contient|produit|relie|régule|contrôle)\s+(.{10,})/i)
  if (subject) return {front: `Quel est le rôle ou la caractéristique de ${subject[1].trim()} ?`, back: `${subject[1].trim()} ${subject[2]} ${subject[3]}`}
  return {front: 'Quelle notion essentielle faut-il restituer ?', back: sentence}
}

export function generateLocalDrafts({text, level = 'standard', requestedCount = 12, source = {}, subject = '', chapter = '', tags = []}) {
  const maximum = Math.min(level === 'essential' ? 20 : level === 'complete' ? 60 : 35, Math.max(1, Number(requestedCount) || 12))
  const sentences = sentenceSplit(text)
  const ranked = sentences.map((sentence, index) => ({sentence, index, score: (/[0-9%]/.test(sentence) ? 2 : 0) + (/(est|sont|permet|assure|comprend|régule|cause|entraîne|augmente|diminue)/i.test(sentence) ? 3 : 0) + Math.min(sentence.length / 100, 2)})).sort((a, b) => b.score - a.score || a.index - b.index)
  const selected = (level === 'complete' ? ranked : ranked.filter(item => item.score >= (level === 'essential' ? 3.5 : 2.5))).slice(0, maximum)
  const seen = new Set()
  return selected.map(({sentence}) => ({...questionFor(sentence), excerpt: sentence})).filter(card => {
    const key = normalize(card.front + ' ' + card.back)
    if (!key || seen.has(key)) return false
    seen.add(key); return true
  }).map(card => ({temporaryId: randomUUID(), ...card, subject, chapter, tags, selected: true, source: {...source, excerpt: card.excerpt}}))
}

export function sanitizeGeneratedDrafts(items, fallback) {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  return items.slice(0, 80).flatMap(item => {
    const front = typeof item?.front === 'string' ? item.front.trim().slice(0, 2000) : ''
    const back = typeof item?.back === 'string' ? item.back.trim().slice(0, 8000) : ''
    const key = normalize(front + ' ' + back)
    if (!front || !back || seen.has(key)) return []
    seen.add(key)
    return [{temporaryId: randomUUID(), front, back, subject: fallback.subject, chapter: fallback.chapter, tags: fallback.tags, selected: true, source: {...fallback.source, excerpt: typeof item.sourceExcerpt === 'string' ? item.sourceExcerpt.slice(0, 1500) : fallback.source.excerpt}}]
  })
}
