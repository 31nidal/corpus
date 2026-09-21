import {randomUUID} from 'node:crypto'

const normalize = value => String(value).normalize('NFC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr')
const sentences = text => String(text).split(/\n+|(?<=[.!?])\s+/).map(value => value.replace(/^\s*[-•*]\s*/, '').replace(/\s+/g, ' ').trim()).filter(value => value.length >= 20 && value.length <= 600 && !value.endsWith('?'))
const maximumFor = (level, count) => Math.min(level === 'essential' ? 20 : level === 'complete' ? 60 : 35, Math.max(1, Math.floor(Number(count) || 12)))
const ambiguous = value => /^(?:il|elle|ils|elles|ce|cet|cette|ces|on|ceci|cela|celui|celle|ceux|celles|qui|que|c’est|c'est)\b/i.test(value)

// More specific relations must precede the general definition pattern.
const relations = [
  ['localisation', /(?:est situé(?:e)?|sont situé(?:e)?s|se situent?|se trouvent?|chemine(?:nt)?|traverse(?:nt)?|débouche(?:nt)?|s['’]étend(?:ent)?|passe(?:nt)? par)/i, 'Quelle localisation ou quel trajet est indiqué pour'],
  ['composition', /(?:se compose(?:nt)? de|comprend|comprennent|contient|contiennent|est constitué(?:e)? de|sont constitué(?:e)?s de|est formé(?:e)? de|se divise(?:nt)? en)/i, 'Quelle est la composition de'],
  ['anatomie', /(?:s['’]articule(?:nt)?(?: proximalement| distalement)? avec|s['’]insère(?:nt)? sur|innerve(?:nt)?|vascularise(?:nt)?|relie(?:nt)?|sépare(?:nt)?|entoure(?:nt)?|recouvre(?:nt)?|protège(?:nt)?)/i, 'Quelle relation anatomique est décrite pour'],
  ['fonction', /(?:permet|permettent|assure(?:nt)?|participe(?:nt)? à|joue(?:nt)? un rôle dans|fléchit|fléchissent|étend(?:ent)?|sécrète(?:nt)?|produit|produisent|transporte(?:nt)?|régule(?:nt)?|contrôle(?:nt)?|filtre(?:nt)?|draine(?:nt)?|favorise(?:nt)?|éjecte(?:nt)?)/i, 'Quel rôle est décrit pour'],
  ['cause', /(?:provoque(?:nt)?|entra[iî]ne(?:nt)?|cause(?:nt)?|induit|induisent|augmente(?:nt)?|diminue(?:nt)?)/i, 'Quel effet est décrit pour'],
  ['dépendance', /(?:dépend(?:ent)? de|varie(?:nt)? avec)/i, 'De quoi dépend'],
  ['valeur', /(?:vaut|valent|mesure(?:nt)?|atteint|atteignent|est égal(?:e)? à|sont égal(?:e)?s à)/i, 'Quelle valeur est indiquée pour'],
  ['définition', /(?:est|sont|correspond(?:ent)? à|désigne(?:nt)?|se définit comme|constitue(?:nt)?|représente(?:nt)?)/i, 'Que précise le cours à propos de'],
]

function questionFor(sentence) {
  for (const [kind, verb, prompt] of relations) {
    const match = sentence.match(new RegExp(`^(.{2,100}?)\\s+(${verb.source})\\s+(.{3,})[.!]?$`, 'i'))
    if (!match) continue
    const subject = match[1].trim()
    // Never invent the antecedent of a pronoun or discard a negation.
    if (ambiguous(subject) || /\b(?:ne|n['’])$/i.test(subject) || /[?!:]/.test(subject)) return null
    return {front: `${prompt} « ${subject} » ?`, back: sentence, kind}
  }
  // Explicit labelled notes and formulas are useful without a conjugated verb.
  const labelled = sentence.match(/^([^:?!]{3,90})\s*:\s*(.{8,})$/)
  if (labelled && !ambiguous(labelled[1]) && /[\p{L}]/u.test(labelled[2])) {
    return {front: `Que faut-il retenir à propos de « ${labelled[1].trim()} » ?`, back: sentence, kind: 'repère'}
  }
  const formula = sentence.match(/^([^=?!]{3,90})\s*=\s*(.{3,})$/)
  if (formula && !ambiguous(formula[1])) return {front: `Quelle formule exprime « ${formula[1].trim()} » ?`, back: sentence, kind: 'formule'}
  return null
}

export function generateLocalDrafts({text, level = 'standard', requestedCount = 12, source = {}, subject = '', chapter = '', tags = []}) {
  const seen = new Set()
  const candidates = sentences(text).flatMap((sentence, index) => {
    const card = questionFor(sentence), key = normalize(sentence)
    if (!card || seen.has(key)) return []
    seen.add(key)
    return [{...card, excerpt: sentence, index, priority: ['définition', 'fonction', 'composition'].includes(card.kind) ? 2 : 1}]
  })
  const selected = (level === 'essential' ? candidates.sort((a,b) => b.priority-a.priority || a.index-b.index) : candidates).slice(0, maximumFor(level, requestedCount))
  return selected.map(({front, back, excerpt}) => ({temporaryId: randomUUID(), front, back, subject, chapter, tags, selected: true, source: {...source, excerpt}}))
}

export function sanitizeGeneratedDrafts(items, fallback) {
  if (!Array.isArray(items)) return []
  const seen = new Set(), sourceSentences = new Set(sentences(fallback.text).map(normalize))
  return items.slice(0, 80).flatMap(item => {
    const front = typeof item?.front === 'string' ? item.front.trim() : ''
    const back = typeof item?.back === 'string' ? item.back.trim() : ''
    const excerpt = typeof item?.sourceExcerpt === 'string' ? item.sourceExcerpt.trim() : ''
    const key = normalize(front + ' ' + back)
    // Conservative extractive contract: the complete answer must be attested in
    // the supplied document. Paraphrases require a future semantic review layer.
    if (!front || !back || front.length > 2000 || back.length > 8000 || excerpt.length < 20 || excerpt.length > 1500 || !sourceSentences.has(normalize(excerpt)) || normalize(excerpt) !== normalize(back) || seen.has(key)) return []
    seen.add(key)
    return [{temporaryId: randomUUID(), front, back, subject: fallback.subject, chapter: fallback.chapter, tags: fallback.tags, selected: true, source: {...fallback.source, excerpt}}]
  }).slice(0, maximumFor(fallback.level, fallback.requestedCount))
}
