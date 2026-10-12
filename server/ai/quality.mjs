import {normalize} from '../flashcards/generation.mjs'

export function literalCardAnswer(card) {
  const key=card.noteType==='typed'?'answer':'back'
  if(!['basic','reverse','typed'].includes(card.noteType)||typeof card.fields?.[key]!=='string')return card
  const answer=card.fields[key]
  if(normalize(card.sourceExcerpt).includes(normalize(answer)))return card
  // A leading article can differ solely because the source uses a contraction
  // ("au produit" vs "le produit"). Keep only an exact source substring.
  const tail=answer.replace(/^(?:le|la|les|un|une)\s+/i,'').trim()
  if(tail===answer||tail.length<20)return card
  const pattern=tail.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/['’‘]/g,"['’‘]").replace(/\s+/g,'\\s+')
  const match=card.sourceExcerpt.match(new RegExp(pattern,'iu'))
  return match?{...card,fields:{...card.fields,[key]:match[0]}}:card
}

export function summaryText(point) {
  const text = typeof point.text === 'string' ? point.text.trim() : point.sourceExcerpt
  if (!text || text.length > 2000) return null
  if (/^(?:ce processus|cela|ceci|ils|elles|il|elle)\b/i.test(text)) return null
  const strengthened = text.match(/\b(?:formelle|formellement|toujours|jamais|obligatoirement|exclusivement)\b/gi) || []
  if (strengthened.some(word => !normalize(point.sourceExcerpt).includes(normalize(word)))) return null
  // New quantities are refused; this guard does not certify semantic correctness.
  const quantities = value => value.match(/\d+(?:[.,]\d+)?/g) || []
  const sourceQuantities = new Set(quantities(point.sourceExcerpt))
  if (quantities(text).some(value => !sourceQuantities.has(value))) return null
  return text
}

export function cardQuality(card) {
  const fields = card.fields
  if (card.noteType === 'cloze') {
    const text = fields.text || ''
    const holes = [...text.matchAll(/\{\{c\d+::([^}]+)\}\}/g)]
    const plain = text.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1')
    if (!holes.length || holes.reduce((n, hole) => n + hole[1].length, 0) > plain.length * .8) return 'cloze_without_context'
    return null
  }
  if (card.noteType === 'bidirectional') return null
  const question = fields.front?.trim() || ''
  const answer = (fields.back || fields.answer || '').trim()
  if (question.length < 15 || /^(?:quel(?:le)? est (?:son|sa|leur)|quels sont (?:ses|leurs)|que (?:fait|signifie) (?:cela|ceci))\b/i.test(question)) return 'ambiguous_question'
  if (/\b(?:et|ou|au|aux|du|des|de|la|le|les|un|une)\s*[.,;:]?$/i.test(answer)) return 'incomplete_answer'
  return null
}

export function uniqueCards(queues, generation) {
  const questions = new Map()
  const facts = new Set()
  return queues.map(queue => queue.filter(card => {
    const answer=card.noteType==='cloze'?[...card.fields.text.matchAll(/\{\{c\d+::([^}]+)\}\}/g)].map(match=>match[1]).join(' / '):card.fields.back||card.fields.answer||''
    const identity=normalize(answer).replace(/^(?:dans|sur|au|aux|de|du|des)\s+/,'').replace(/^(?:le|la|les|un|une)\s+/,'')
    const factKey=normalize(card.sourceExcerpt)+'|'+identity
    if(card.noteType!=='bidirectional'&&facts.has(factKey)){
      generation.rejected++;generation.rejectionReasons.duplicate_fact=(generation.rejectionReasons.duplicate_fact||0)+1;return false
    }
    const key = normalize(card.fields.front || card.fields.text)
    const previous = questions.get(key)
    if (!previous) {questions.set(key, card);facts.add(factKey); return true}
    generation.rejected++
    const reason = normalize(previous.fields.back || previous.fields.answer || previous.fields.text) === normalize(card.fields.back || card.fields.answer || card.fields.text) ? 'duplicate' : 'conflicting_question'
    generation.rejectionReasons[reason] = (generation.rejectionReasons[reason] || 0) + 1
    return false
  }))
}
