import {randomUUID} from 'node:crypto'
import {extractClozeKeys} from './cloze.mjs'

export const normalize = value =>
  String(value || '')
    .normalize('NFC')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr')

export const sentences = text =>
  String(text || '')
    .split(/\n+|(?<=[.!?])\s+/)
    .map(value => value.replace(/^\s*[-•*]\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(value => value.length >= 20 && value.length <= 600 && !value.endsWith('?'))

const maximumFor = (level, count) =>
  Math.min(level === 'essential' ? 20 : level === 'complete' ? 60 : 35, Math.max(1, Math.floor(Number(count) || 12)))

const ambiguous = value =>
  /^(?:il|elle|ils|elles|ce|cet|cette|ces|on|ceci|cela|celui|celle|ceux|celles|qui|que|c’est|c'est)\b/i.test(value)

const EQUIVALENCE_REGEX = /(?:est aussi appelé(?:e)?|sont aussi appelé(?:e)?s|aussi appelé(?:e)?|synonyme de|anciennement nommé(?:e)?|autrement désigné(?:e)? sous le nom de)\s+([^.!?]+)/i
const PAREN_ALIAS_REGEX = /^([A-ZÀ-ÖØ-ßa-zà-öø-ÿ\s'-]{2,60})\s+\((?:ou\s+)?([A-ZÀ-ÖØ-ßa-zà-öø-ÿ\s'-]{2,60})\)/

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

export function questionFor(sentence) {
  for (const [kind, verb, prompt] of relations) {
    const match = sentence.match(new RegExp(`^(.{2,100}?)\\s+(${verb.source})\\s+(.{3,})[.!]?$`, 'i'))
    if (!match) continue
    const subject = match[1].trim()
    if (ambiguous(subject) || /\b(?:ne|n['’])$/i.test(subject) || /[?!:]/.test(subject)) return null
    return {front: `${prompt} « ${subject} » ?`, back: sentence, kind}
  }
  const labelled = sentence.match(/^([^:?!]{3,90})\s*:\s*(.{8,})$/)
  if (labelled && !ambiguous(labelled[1]) && /[\p{L}]/u.test(labelled[2])) {
    return {front: `Que faut-il retenir à propos de « ${labelled[1].trim()} » ?`, back: sentence, kind: 'repère'}
  }
  const formula = sentence.match(/^([^=?!]{3,90})\s*=\s*(.{3,})$/)
  if (formula && !ambiguous(formula[1])) {
    return {front: `Quelle formule exprime « ${formula[1].trim()} » ?`, back: sentence, kind: 'formule'}
  }
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
  const selected = (level === 'essential' ? candidates.sort((a, b) => b.priority - a.priority || a.index - b.index) : candidates).slice(0, maximumFor(level, requestedCount))
  return selected.map(({front, back, excerpt}) => ({
    temporaryId: randomUUID(),
    front,
    back,
    subject,
    chapter,
    tags,
    selected: true,
    source: {...source, excerpt: source.type === 'free_text' ? null : excerpt},
  }))
}

export function generateLocalNoteDrafts({text, level = 'standard', requestedCount = 12, source = {}, subject = '', chapter = '', tags = []}) {
  const seen = new Set()
  const candidates = sentences(text).flatMap((sentence, index) => {
    // 1. Equivalence check (Bidirectional)
    const eqMatch = sentence.match(new RegExp(`^(.{2,60}?)\\s+${EQUIVALENCE_REGEX.source}[.!]?$`, 'i'))
    if (eqMatch) {
      const termA = eqMatch[1].trim(), termB = eqMatch[2].trim()
      if (!ambiguous(termA) && termB.length >= 2 && termB.length <= 80 && !ambiguous(termB)) {
        const sig = `bidirectional|${[normalize(termA), normalize(termB)].sort().join('<->')}`
        if (!seen.has(sig)) {
          seen.add(sig)
          return [{
            noteType: 'bidirectional',
            front: termA,
            back: termB,
            fields: {front: termA, back: termB},
            rationale: 'Équivalence terminologique explicite',
            excerpt: sentence,
            index,
            priority: 3,
          }]
        }
      }
    }

    const parenMatch = sentence.match(PAREN_ALIAS_REGEX)
    if (parenMatch) {
      const termA = parenMatch[1].trim(), termB = parenMatch[2].trim()
      if (!ambiguous(termA) && !ambiguous(termB) && termA.length <= 60 && termB.length <= 60) {
        const sig = `bidirectional|${[normalize(termA), normalize(termB)].sort().join('<->')}`
        if (!seen.has(sig)) {
          seen.add(sig)
          return [{
            noteType: 'bidirectional',
            front: termA,
            back: termB,
            fields: {front: termA, back: termB},
            rationale: 'Équivalence / nomenclature alternative',
            excerpt: sentence,
            index,
            priority: 3,
          }]
        }
      }
    }

    // 2. Base question extraction
    const card = questionFor(sentence)
    if (!card) return []

    // 3. Typed check (for values and formulas)
    if (card.kind === 'valeur') {
      const valMatch = sentence.match(/(?:vaut|valent|mesure(?:nt)?|atteint|atteignent|est égal(?:e)? à|sont égal(?:e)?s à)\s+(.+?)[.!]?$/i)
      if (valMatch && valMatch[1].trim().length <= 60 && /\d/.test(valMatch[1])) {
        const answer = valMatch[1].trim()
        const sig = `typed|${normalize(card.front)}|${normalize(answer)}`
        if (!seen.has(sig)) {
          seen.add(sig)
          return [{
            noteType: 'typed',
            front: card.front,
            back: answer,
            fields: {front: card.front, answer, acceptedAnswers: []},
            rationale: 'Valeur numérique / seuil médical exact',
            excerpt: sentence,
            index,
            priority: 3,
          }]
        }
      }
    }

    if (card.kind === 'formule') {
      const formulaMatch = sentence.match(/^([^=?!]{3,90})\s*=\s*(.{3,})$/)
      if (formulaMatch) {
        const formula = formulaMatch[2].trim()
        const sig = `typed|${normalize(card.front)}|${normalize(formula)}`
        if (!seen.has(sig)) {
          seen.add(sig)
          return [{
            noteType: 'typed',
            front: card.front,
            back: formula,
            fields: {front: card.front, answer: formula, acceptedAnswers: []},
            rationale: 'Formule médicale exacte',
            excerpt: sentence,
            index,
            priority: 3,
          }]
        }
      }
    }

    // 4. Cloze check (for anatomical insertion / trajectory / specific structure)
    if (card.kind === 'anatomie' || card.kind === 'localisation') {
      const clozeMatch = sentence.match(/(?:s['’]insère(?:nt)? sur|s['’]articule(?:nt)?(?: proximalement| distalement)? avec|chemine(?:nt)? dans|traverse(?:nt)?|débouche(?:nt)? dans)\s+([^.!,;?]{4,60})([,;.!].*)?$/i)
      if (clozeMatch) {
        const target = clozeMatch[1].trim()
        if (!ambiguous(target) && !/[?!:]/.test(target)) {
          const clozeText = sentence.replace(target, `{{c1::${target}}}`)
          if (clozeText !== sentence) {
            const sig = `cloze|${normalize(sentence)}|c1`
            if (!seen.has(sig)) {
              seen.add(sig)
              return [{
                noteType: 'cloze',
                front: clozeText.replace(/\{\{c1::(.*?)\}\}/g, '[...]'),
                back: sentence,
                fields: {text: clozeText, extra: ''},
                rationale: 'Structure dans son contexte anatomique',
                excerpt: sentence,
                index,
                priority: 2,
              }]
            }
          }
        }
      }
    }

    // 5. Fallback Basic note
    const sig = `basic|${normalize(card.back)}`
    if (!seen.has(sig)) {
      seen.add(sig)
      return [{
        noteType: 'basic',
        front: card.front,
        back: card.back,
        fields: {front: card.front, back: card.back},
        rationale: card.kind === 'définition' ? 'Définition essentielle' : 'Rôle / mécanisme physiologique',
        excerpt: sentence,
        index,
        priority: 1,
      }]
    }

    return []
  })

  const selected = (level === 'essential'
    ? candidates.sort((a, b) => b.priority - a.priority || a.index - b.index)
    : candidates
  ).slice(0, maximumFor(level, requestedCount))

  return selected.map(({noteType, front, back, fields, rationale, excerpt}) => ({
    temporaryId: randomUUID(),
    noteType,
    front,
    back,
    fields,
    subject,
    chapter,
    tags,
    selected: true,
    source: {...source, excerpt: source.type === 'free_text' ? null : excerpt},
    rationale,
  }))
}

function structuredSignature(noteType, fields, sourceExcerpt) {
  const normExcerpt = normalize(sourceExcerpt)
  switch (noteType) {
    case 'typed':
      return `typed|${normExcerpt}|${normalize(fields.answer)}`
    case 'bidirectional': {
      const pair = [normalize(fields.front), normalize(fields.back)].sort().join('<->')
      return `bidirectional|${pair}`
    }
    case 'cloze': {
      const clean = String(fields.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '$1')
      const keys = extractClozeKeys(fields.text || '')
      return `cloze|${normalize(clean)}|${keys.join(',')}`
    }
    case 'basic':
    case 'reverse':
    default:
      return `basic|${normExcerpt}|${normalize(fields.back)}`
  }
}

function hasDeterministicDecimalVariant(answer) {
  const val = String(answer || '').trim()
  if (val.includes(',')) {
    return [val.replace(',', '.')]
  }
  if (val.includes('.')) {
    return [val.replace('.', ',')]
  }
  return []
}

export function sanitizeGeneratedNoteDrafts(items, fallback, sourceText) {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  const rawSource = sourceText || fallback.text || ''
  const normSource = normalize(rawSource)
  const isFreeText = fallback.source?.type === 'free_text'

  return items.slice(0, 100).flatMap(item => {
    const noteType = String(item?.noteType || 'basic').toLowerCase()
    if (!['basic', 'reverse', 'bidirectional', 'cloze', 'typed'].includes(noteType)) return []

    const excerpt = typeof item?.sourceExcerpt === 'string' ? item.sourceExcerpt.trim() : ''
    const normExcerpt = normalize(excerpt)

    if (excerpt.length < 15 || excerpt.length > 2000) return []
    if (normSource && !normSource.includes(normExcerpt)) return []

    const rawFields = item?.fields && typeof item.fields === 'object'
      ? item.fields
      : {front: item?.front, back: item?.back, answer: item?.answer, text: item?.text}

    let sanitizedFields = null

    switch (noteType) {
      case 'typed': {
        const front = typeof rawFields.front === 'string' ? rawFields.front.trim() : ''
        const answer = typeof rawFields.answer === 'string' ? rawFields.answer.trim() : ''
        if (!front || !answer || front.length > 2000 || answer.length > 200) return []
        const normAns = normalize(answer)
        if (!normExcerpt.includes(normAns)) return []
        const accepted = hasDeterministicDecimalVariant(answer)
        sanitizedFields = {
          front,
          answer,
          acceptedAnswers: accepted,
          ...(rawFields.extra && typeof rawFields.extra === 'string' ? {extra: rawFields.extra.trim().slice(0, 2000)} : {}),
        }
        break
      }

      case 'cloze': {
        const text = typeof rawFields.text === 'string' ? rawFields.text.trim() : ''
        if (!text || text.length > 4000) return []
        const keys = extractClozeKeys(text)
        if (keys.length < 1 || keys.length > 3) return []
        const stripped = text.replace(/\{\{c\d+::(.*?)\}\}/g, '$1')
        const normStripped = normalize(stripped)
        if (!normExcerpt.includes(normStripped) && !normSource.includes(normStripped)) return []
        const clozeContents = [...text.matchAll(/\{\{c\d+::(.*?)\}\}/g)].map(m => normalize(m[1]))
        if (clozeContents.some(c => !c || !normExcerpt.includes(c))) return []

        sanitizedFields = {
          text,
          ...(rawFields.extra && typeof rawFields.extra === 'string' ? {extra: rawFields.extra.trim().slice(0, 2000)} : {}),
        }
        break
      }

      case 'bidirectional': {
        const front = typeof rawFields.front === 'string' ? rawFields.front.trim() : ''
        const back = typeof rawFields.back === 'string' ? rawFields.back.trim() : ''
        if (!front || !back || front.length > 2000 || back.length > 2000) return []
        const normFront = normalize(front), normBack = normalize(back)
        if (!normExcerpt.includes(normFront) || !normExcerpt.includes(normBack)) return []
        const hasEqMarker =
          EQUIVALENCE_REGEX.test(excerpt) ||
          PAREN_ALIAS_REGEX.test(excerpt) ||
          /\b(?:synonyme|autrement appelé|désigné sous le nom|équivalent à)\b/i.test(excerpt)
        if (!hasEqMarker) return []

        sanitizedFields = {front, back}
        break
      }

      case 'basic':
      case 'reverse': {
        const front = typeof rawFields.front === 'string' ? rawFields.front.trim() : ''
        const back = typeof rawFields.back === 'string' ? rawFields.back.trim() : ''
        if (!front || !back || front.length > 2000 || back.length > 8000) return []
        const normBack = normalize(back)
        if (!normExcerpt.includes(normBack)) return []
        sanitizedFields = {front, back}
        break
      }
    }

    if (!sanitizedFields) return []

    const sig = structuredSignature(noteType, sanitizedFields, excerpt)
    if (seen.has(sig)) return []
    seen.add(sig)

    const rationale =
      typeof item?.rationale === 'string' && item.rationale.trim()
        ? item.rationale.trim().slice(0, 200)
        : noteType === 'typed'
        ? 'Valeur numérique / seuil médical exact'
        : noteType === 'cloze'
        ? 'Structure dans son contexte anatomique'
        : noteType === 'bidirectional'
        ? 'Équivalence terminologique explicite'
        : 'Définition ou rôle physiologique'

    const frontPreview = sanitizedFields.front || (sanitizedFields.text ? sanitizedFields.text.replace(/\{\{c\d+::(.*?)\}\}/g, '$1') : '')
    const backPreview = sanitizedFields.back || sanitizedFields.answer || ''

    return [{
      temporaryId: randomUUID(),
      noteType,
      front: frontPreview,
      back: backPreview,
      title: typeof item?.title === 'string' ? item.title.trim().slice(0, 200) : undefined,
      fields: sanitizedFields,
      subject: fallback.subject || '',
      chapter: fallback.chapter || '',
      tags: Array.isArray(fallback.tags) ? fallback.tags : [],
      selected: true,
      source: {
        ...fallback.source,
        excerpt: isFreeText ? null : excerpt,
      },
      rationale,
    }]
  }).slice(0, maximumFor(fallback.level, fallback.requestedCount))
}

export function sanitizeGeneratedDrafts(items, fallback) {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  const sourceSentences = new Set(sentences(fallback.text).map(normalize))
  return items.slice(0, 80).flatMap(item => {
    const front = typeof item?.front === 'string' ? item.front.trim() : ''
    const back = typeof item?.back === 'string' ? item.back.trim() : ''
    const excerpt = typeof item?.sourceExcerpt === 'string' ? item.sourceExcerpt.trim() : ''
    const key = normalize(front + ' ' + back)
    if (!front || !back || front.length > 2000 || back.length > 8000 || excerpt.length < 15 || excerpt.length > 1500 || !sourceSentences.has(normalize(excerpt)) || normalize(excerpt) !== normalize(back) || seen.has(key)) return []
    seen.add(key)
    return [{
      temporaryId: randomUUID(),
      front,
      back,
      subject: fallback.subject,
      chapter: fallback.chapter,
      tags: fallback.tags,
      selected: true,
      source: {...fallback.source, excerpt},
    }]
  }).slice(0, maximumFor(fallback.level, fallback.requestedCount))
}
