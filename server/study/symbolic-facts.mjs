import { createHash } from 'node:crypto'

const MIN_CONFIDENCE = 0.9
const entityNoun = String.raw`nerf|art[eè]re|vaisseau|veine|muscle|organe|glande|os|ligament|tendon|articulation|vert[eè]bre|cavit[eè]|canal|conduit|bronche|valve|coeur|cœur|foie|rein|pancr[eé]as|estomac|poumon|intestin|diaphragme|cerveau|moelle|rate`
const articles = /^(?:(?:les|le|la)\b|l['’])\s*/i
const negativePattern = /\bne\b.{0,100}\bpas\b|\bn['’][\p{L}]+\s+pas\b|\b(?:jamais|aucun|aucune|ni)\b/iu
const ambiguousPattern = /\b(?:peut|peuvent|pourrait|pourraient|semble|semblerait|probablement|possiblement|parfois|parait|paraît|éventuellement|possible|potentiel(?:le)?)\b|\bselon certaines hypoth[eè]ses\b|\b(?:ou|et|ainsi que)\b/iu

const normalize = value => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim()
const comparable = value => normalize(value).toLocaleLowerCase('fr-FR').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

function cleanEntity(value) {
  return normalize(value).replace(articles, '').replace(/[\s,;:.!?]+$/g, '').trim()
}

function classifyEntity(value) {
  const text = comparable(value)
  if (/^(?:nerf|nerfs)\b/.test(text)) return 'nerve'
  if (/^(?:artere|arteres)\b/.test(text)) return 'artery'
  if (/^(?:veine|veines)\b/.test(text)) return 'vein'
  if (/^(?:vaisseau|vaisseaux)\b/.test(text)) return 'blood_vessel'
  if (/^(?:muscle|muscles)\b/.test(text) || /\b(?:diaphragme|myocarde|biceps|triceps|quadriceps|deltoide)\b/.test(text)) return 'muscle'
  if (/^(?:os|ligament|tendon|articulation|vertebre|cavite|canal|conduit|bronche|valve|glande)\b/.test(text)) return 'anatomical_structure'
  if (/^(?:organe|coeur|foie|rein|pancreas|estomac|poumon|intestin|cerveau|moelle|rate)\b/.test(text)) return 'organ'
  return 'anatomical_structure'
}

function classifyRegion(value) {
  const text = comparable(value)
  return /\b(?:region|cavite|fosse|loge|triangle|mediastin|thorax|thoracique|abdomen|abdominale|abdominal|pelvis|pelvien|pelvienne|crane|cranien|cervical|cervicale|cou|face|orbite|orbitaire|inguinal|inguinale|axillaire|axille|dorsal|dorsale|lombaire|perinee|perineal|perineale)\b/.test(text)
}

function factId({ relation, subject, object, sectionId, evidence }) {
  return `sf-${createHash('sha256').update([relation, comparable(subject), comparable(object), sectionId, comparable(evidence)].join('|')).digest('hex').slice(0, 20)}`
}

function createFact({ relation, subject, object, section, evidence, confidence }) {
  const cleanSubject = cleanEntity(subject)
  const cleanObject = cleanEntity(object)
  if (!cleanSubject || !cleanObject || comparable(cleanSubject) === comparable(cleanObject)) return null
  if (/^(?:il|elle|ils|elles|cela|ceci|ce|cette|ces|on|nous|vous)\b/i.test(cleanSubject)) return null
  if (cleanSubject.split(/\s+/).length > 10 || cleanObject.split(/\s+/).length > 12) return null
  const sectionId = String(section.id || '')
  if (!sectionId || !evidence || confidence < MIN_CONFIDENCE) return null
  const subjectType = classifyEntity(cleanSubject)
  const objectType = relation === 'localisation'
    ? (classifyRegion(cleanObject) ? 'anatomical_region' : null)
    : classifyEntity(cleanObject)
  if (!objectType) return null
  const pages = [Number(section.startPage) || 1, Number(section.endPage) || Number(section.startPage) || 1]
  return {
    id: factId({ relation, subject: cleanSubject, object: cleanObject, sectionId, evidence }),
    relation,
    subject: cleanSubject,
    object: cleanObject,
    subjectType,
    objectType,
    sectionId,
    sectionTitle: String(section.title || ''),
    pages,
    evidence,
    confidence,
    confidenceLevel: confidence >= 0.95 ? 'high' : 'medium'
  }
}

function validSentence(sentence) {
  return sentence.length >= 35 && sentence.length <= 360 &&
    !negativePattern.test(sentence) && !ambiguousPattern.test(sentence) &&
    !/\b(?:sauf|excepté|exception|ni l'un ni l'autre)\b/i.test(sentence)
}

function splitSentences(content) {
  return String(content || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(validSentence)
}

function parseActiveFact(sentence, section) {
  const entity = String.raw`((?:(?:le|la|les|l['’])\s*)?(?:${entityNoun})\s+[^,;.!?]{2,90}?)`
  const active = new RegExp(`^${entity}\\s+(innerve|innervent|vascularise|vascularisent|irrigue|irriguent|alimente|alimentent)\\s+(.+)$`, 'iu')
  const match = sentence.match(active)
  if (!match) return null
  const subject = cleanEntity(match[1])
  const verb = comparable(match[2])
  const object = cleanEntity(match[3])
  const subjectType = classifyEntity(subject)
  let relation
  if (/^innerv/.test(verb) && subjectType === 'nerve') relation = 'innervation'
  else if (/^(?:vascularis|irrig|aliment)/.test(verb) && ['artery', 'vein', 'blood_vessel'].includes(subjectType)) relation = 'vascularisation'
  if (!relation) return null
  return createFact({ relation, subject, object, section, evidence: sentence, confidence: 0.97 })
}

function parsePassiveInnervation(sentence, section) {
  const match = sentence.match(/^(.{2,100}?)\s+(?:est|sont)\s+innerv[eé](?:e|es|s)?\s+par\s+((?:(?:le|la|les|l['’])\s*)?nerf\s+[^,;.!?]{2,70})[.!?]?$/iu)
  if (!match || classifyEntity(match[2]) !== 'nerve') return null
  return createFact({ relation: 'innervation', subject: match[2], object: match[1], section, evidence: sentence, confidence: 0.95 })
}

function parseLocation(sentence, section) {
  const match = sentence.match(/^(.{2,100}?)\s+(?:(?:est|sont)\s+(?:situ[eé](?:e|es|s)?|localis[eé](?:e|es|s)?|plac[eé](?:e|es|s)?)|se situe|se trouvent?|se trouve)\s+(?:dans|au niveau de|à proximité de|au sein de|sous|sur|devant|derrière)\s+(.+?)[.!?]?$/iu)
  if (!match) return null
  return createFact({ relation: 'localisation', subject: match[1], object: match[2], section, evidence: sentence, confidence: 0.93 })
}

/** Extract conservative, typed facts for the first symbolic POC: innervation, vascularisation and localization. */
export function extractTypedStudyFacts(sections = []) {
  const facts = []
  const seen = new Set()
  for (const section of sections) {
    const content = typeof section.content === 'string' ? section.content : (section.content?.text || section.text || '')
    for (const sentence of splitSentences(content)) {
      const fact = parseActiveFact(sentence, section) || parsePassiveInnervation(sentence, section) || parseLocation(sentence, section)
      if (!fact) continue
      const signature = [fact.relation, comparable(fact.subject), comparable(fact.object)].join('|')
      if (seen.has(signature)) continue
      seen.add(signature)
      facts.push(fact)
    }
  }
  return facts
}

export const symbolicFactRules = Object.freeze({ minConfidence: MIN_CONFIDENCE })
