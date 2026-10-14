import {createHash, randomUUID} from 'node:crypto'
import {summaryText} from '../../ai/quality.mjs'
import {AI_LIMITS} from '../../ai/gemini-client.mjs'
import {studyError} from './library.mjs'
import {canonicalSource,MAX_SOURCE_SELECTION_CHARACTERS,selectSourcePassage} from '../source-selection.mjs'
export {canonicalSource} from '../source-selection.mjs'

// Conservative check of written quantities, not unit conversion or medical truth.
// Common compound units are retained; unrecognized scientific notation still needs review.
export const NOTE_QUANTITY_PATTERN = /(?<![\p{N}])[-+−]?\d+(?:[.,]\d+)?(?:\s*(?:mm\s*Hg|mL\s*\/\s*min|L\s*\/\s*min|mg\s*\/\s*(?:kg|mL|min)|mmol\s*\/\s*L|%|µg|μg|mg|kg|mL|ml|mmol|mol|mV|ms|kPa|Pa|cm|mm|°\s*C|min|g|L|V|s|h)(?!\p{L}))?/gu
export const writtenQuantities = text => [...new Set((canonicalSource(text).match(NOTE_QUANTITY_PATTERN) || []).map(value => value.replace(/\s+/g, '').replace(',', '.').replace(/−/g, '-').replace(/^\+/, '').replace(/μ/g, 'µ')))]
// Quantitative omissions are restored as labelled literal source paragraphs,
// never by asking another model to calculate or infer missing values.
export const MAX_NOTE_QUANTITY_SUPPLEMENTS_PER_SECTION = 20
export const MAX_NOTE_ITEMS = 500
export const MAX_NOTE_SELECTION_CHARACTERS = MAX_SOURCE_SELECTION_CHARACTERS
export const NOTE_LEVELS = Object.freeze({short: {pointsPerSection: 2, label: 'Résumé court'}, structured: {pointsPerSection: 5, label: 'Fiche de révision'}, detailed: {pointsPerSection: 20, label: 'Fiche détaillée'}})
export const sourceHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export function selectNoteSources(db, userId, document, {sectionIds, selection} = {}) {
  let sections = db.prepare('SELECT id,title,content,start_page AS startPage,end_page AS endPage FROM study_sections WHERE document_id=? AND user_id=? ORDER BY section_order').all(document.id, userId)
  if (sectionIds !== undefined) {
    if (!Array.isArray(sectionIds) || !sectionIds.length || sectionIds.length > 500 || sectionIds.some(id => typeof id !== 'string') || new Set(sectionIds).size !== sectionIds.length) throw studyError(400, 'Sélection de sections invalide.')
    if (sectionIds.some(id => !sections.some(section => section.id === id))) throw studyError(404, 'Section introuvable.')
    sections = sections.filter(section => sectionIds.includes(section.id))
  }
  if (selection !== undefined) {
    sections = [selectSourcePassage(db,userId,document,sections,selection)]
  }
  if (!sections.length || sections.every(section => canonicalSource(section.content).length < 35)) throw studyError(422, 'Le cours contient trop peu de texte exploitable pour une fiche.')
  if (sections.reduce((total, section) => total + section.content.length, 0) > AI_LIMITS.inputCharacters) throw studyError(413, 'Ce contenu dépasse la limite IA. Choisissez une partie du cours.')
  const pages = db.prepare('SELECT page_number AS page,text FROM study_pdf_pages WHERE document_id=? AND user_id=? ORDER BY page_number').all(document.id, userId).filter(page => sections.some(section => page.page >= section.startPage && page.page <= section.endPage))
  const metadata = db.prepare('SELECT metadata_json FROM study_pdf_extractions WHERE document_id=? AND user_id=?').get(document.id,userId)
  const extraction = metadata ? JSON.parse(metadata.metadata_json) : {method:'unknown',warnings:[]}
  return {sections, pages, extraction, processingState:document.processingState || 'ready', pageCount:document.pageCount, selection: selection ? {page: selection.page, text: canonicalSource(selection.text)} : null}
}

export function localNoteSummary(title, sections, kind, legacySummary) {
  const cleaned = sections.map(section => ({...section, content: section.content.split(/\n+/).filter(line => {
    const withoutPrefix = line.trim().replace(/^(?:chapitre|partie|section)\s+[\dIVXLCDM]+\s*[:.–-]?\s*/iu, '')
    return canonicalSource(withoutPrefix).toLocaleLowerCase('fr') !== canonicalSource(section.title).toLocaleLowerCase('fr')
  }).join('\n')}))
  const legacy = legacySummary(title, cleaned)
  return {title, chapters: cleaned.map(section => {
    const complete = sourcePassageGroups(section.content)
    const ranked = legacy.chapters.find(chapter => chapter.id === section.id)?.keyPoints || []
    // Keep a concise opening definition even when legacy's 35-character ranking
    // omitted it. Reject only the exact 220-character truncation fallback.
    const uncut = ranked.filter(text => !(canonicalSource(text).length === 220 && canonicalSource(section.content).startsWith(canonicalSource(text)) && !/[.!?]$/.test(text)))
      .map(text => complete.find(group => canonicalSource(group).includes(canonicalSource(text))) || text)
    const points = kind === 'detailed' ? complete : [complete[0], ...uncut, ...complete].filter(Boolean)
    const seen = new Set()
    return {id:section.id,title:section.title,keyPoints:points.filter(text => {const key=canonicalSource(text);if(seen.has(key))return false;seen.add(key);return true})}
  })}
}

/** Keep a pronoun with its preceding sentence in the same source paragraph.
 * Never infer an antecedent from a title or join separate bullet/source lines.
 * Existing quality guards remain unchanged; every group stays verbatim. */
function sourcePassageGroups(content) {
  const pronoun = /^(?:ce processus|cela|ceci|ils|elles|il|elle)\b/i
  return content.split(/\n\n+/).flatMap(paragraph => {
    if (/```/.test(paragraph) || paragraph.split('\n').filter(line => line.includes('|')).length >= 2) return [paragraph.trim()]
    return paragraph.split(/\n+/).flatMap(line => {
      const groups = []
      for (const sentence of line.split(/(?<=[.!?])\s+/).map(text => text.trim()).filter(Boolean)) {
        const prior = groups.at(-1)
        if (pronoun.test(sentence) && prior && !pronoun.test(prior) && prior.length + sentence.length + 1 <= 2000) groups[groups.length - 1] = prior + ' ' + sentence
        else groups.push(sentence)
      }
      return groups
    })
  }).filter(text => text.length >= 15 && text.length <= 2000)
}

function rawProof(source, proof) {
  const pattern = canonicalSource(proof).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’‘]").replace(/ /g, '\\s+')
  return String(source).normalize('NFC').match(new RegExp(pattern, 'u'))?.[0] || proof
}
function sourceTable(proof) {
  const rows = proof.split(/\n+/).map(row => row.split('|').map(cell => cell.trim()))
  return rows.length >= 2 && rows[0].length >= 2 && rows.every(row => row.length === rows[0].length) ? rows : undefined
}

export function noteItems(summary, scope, kind, {preserveQuantities = false} = {}) {
  if (!summary || !Array.isArray(summary.chapters)) throw studyError(422, 'Format de fiche invalide. Aucun contenu enregistré.')
  let refused = 0
  const rejectionReasons = {}
  const items = scope.sections.flatMap(section => {
    const chapter = summary.chapters.find(chapter => chapter?.id === section.id)
    const candidates = Array.isArray(chapter?.proofs) && chapter.proofs.length ? chapter.proofs : (Array.isArray(chapter?.keyPoints) ? chapter.keyPoints : []).map(text => ({text, sourceExcerpt: text, category: ''}))
    const unique = new Set()
    const valid = []
    for (const point of candidates) {
      const proof = canonicalSource(point?.sourceExcerpt)
      const reason = typeof point?.text !== 'string' || typeof point?.sourceExcerpt !== 'string' ? 'invalid_point'
        : proof.length < 15 || proof.length > 2000 || !canonicalSource(section.content).includes(proof) ? 'source_not_found'
        : !summaryText(point) ? 'summary_quality'
        : writtenQuantities(point.text).some(value => !writtenQuantities(point.sourceExcerpt).includes(value)) ? 'quantity_or_unit_not_attested' : null
      if (reason) {refused++; rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1; continue}
      const text = point.text.trim(), key = canonicalSource(text)
      if (unique.has(key)) continue
      unique.add(key)
      const matchedPage = scope.pages.find(page => page.page >= section.startPage && page.page <= section.endPage && canonicalSource(page.text).includes(proof))
      const page = matchedPage?.page ?? section.startPage
      valid.push({id: randomUUID(), sectionId: section.id, sectionTitle: section.title, text, category: typeof point.category === 'string' ? point.category.slice(0, 100) : '', sourceExcerpt: rawProof(section.content, point.sourceExcerpt), sourceTable: sourceTable(rawProof(section.content, point.sourceExcerpt)), page, endPage: section.endPage, exactPage: Boolean(matchedPage), edited: false, proofStatus: 'matched'})
    }
    const retained = valid.slice(0, NOTE_LEVELS[kind].pointsPerSection)
    if (preserveQuantities && kind !== 'short' && retained.length) {
      for (const paragraph of section.content.split(/\n\n+/).map(text => text.trim())) {
        if (retained.filter(item => item.sourceSupplement).length >= MAX_NOTE_QUANTITY_SUPPLEMENTS_PER_SECTION) break
        const represented = new Set(writtenQuantities(retained.map(item => item.text).join(' ')))
        if (!writtenQuantities(paragraph).some(value => !represented.has(value))) continue
        if (paragraph.length < 15 || paragraph.length > 2000 || /```|^(?:chapitre|figure|tableau|schéma)\s+\d/iu.test(paragraph) || !summaryText({text:paragraph,sourceExcerpt:paragraph})) continue
        const matchedPage = scope.pages.find(page => page.page >= section.startPage && page.page <= section.endPage && canonicalSource(page.text).includes(canonicalSource(paragraph)))
        retained.push({id:randomUUID(),sectionId:section.id,sectionTitle:section.title,text:paragraph,category:'Données et calculs du cours',sourceExcerpt:paragraph,sourceTable:sourceTable(paragraph),
          sourceSupplement:true,page:matchedPage?.page ?? section.startPage,endPage:section.endPage,exactPage:Boolean(matchedPage),edited:false,proofStatus:'matched'})
      }
    }
    return retained
  })
  if (items.length > MAX_NOTE_ITEMS) throw studyError(422, 'Trop de points pour une seule fiche. Sélectionnez moins de sections.')
  if (!items.length) throw Object.assign(studyError(422, 'Aucun point suffisamment étayé n’a été généré.'), {generation: {refusedPoints: refused, rejectionReasons}})
  return {items, refused, rejectionReasons}
}

/** Presence/quantity coverage is a review aid, never a semantic or medical certificate. */
export function noteCoverage(scope, items) {
  const missingSections = scope.sections.filter(section => !items.some(item => item.sectionId === section.id)).map(({id, title}) => ({id, title}))
  const quantities = writtenQuantities
  const missingQuantities = scope.sections.flatMap(section => {
    const output = items.filter(item => item.sectionId === section.id).map(item => item.text).join(' ')
    const represented = new Set(quantities(output))
    return [...new Set(canonicalSource(section.content).match(NOTE_QUANTITY_PATTERN) || [])].filter(value => !represented.has(writtenQuantities(value)[0])).map(value => ({sectionId: section.id, sectionTitle: section.title, value}))
  }).slice(0, 100)
  return {sectionsTotal: scope.sections.length, sectionsRepresented: scope.sections.length - missingSections.length, missingSections, missingQuantities, edited: items.some(item => item.edited), message: 'Présence des sections et valeurs contrôlée ; fidélité sémantique et validité médicale à relire dans les sources.'}
}
