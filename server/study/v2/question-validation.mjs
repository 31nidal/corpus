import {studyError} from './library.mjs'
import {canonicalSource} from './note-sources.mjs'

export const MAX_QUESTIONS_PER_SET = 30
export const QUESTION_FORMATS = Object.freeze(['single','multiple'])
export const QUESTION_DIFFICULTIES = Object.freeze(['essential','standard','advanced'])
export const QUESTION_KINDS = Object.freeze(['recall','understanding'])

export function questionSettings(body) {
  const {count = 5, format = 'single', difficulty = 'standard', kind = 'recall'} = body
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_QUESTIONS_PER_SET || !QUESTION_FORMATS.includes(format) || !QUESTION_DIFFICULTIES.includes(difficulty) || !QUESTION_KINDS.includes(kind)) throw studyError(400, 'Paramètres QCM invalides : 1 à 30 questions, format, difficulté et objectif requis.')
  return {count,format,difficulty,kind}
}
const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.length <= max
/** Literal references and shape are necessary, never sufficient for medical truth. */
export function validateQuestion(raw, scope, settings) {
  if (!raw || typeof raw !== 'object' || !text(raw.prompt,20,2000) || !Array.isArray(raw.options) || raw.options.length < 3 || raw.options.length > 5) throw studyError(422, 'Énoncé ou propositions du QCM invalides.')
  const correct = raw.options.filter(option => option?.correct === true).length
  if (correct < 1 || correct >= raw.options.length || settings.format === 'single' && correct !== 1) throw studyError(422, 'Les réponses ne correspondent pas au format du QCM.')
  const unique = new Set()
  const options = raw.options.map(option => {
    if (!option || !text(option.text,1,1000) || !text(option.explanation,20,2000) || typeof option.correct !== 'boolean' || !['supports','contradicts'].includes(option.relation) || option.correct !== (option.relation === 'supports') || !text(option.sourceExcerpt,15,2000)) throw studyError(422, 'Chaque proposition exige une explication, une relation cohérente et une preuve source.')
    const key=canonicalSource(option.text).toLocaleLowerCase('fr')
    if(unique.has(key))throw studyError(422,'Les propositions doivent être distinctes.')
    unique.add(key)
    const section=scope.sections.find(section=>section.id===option.sourceSectionId)
    if(!section || !canonicalSource(section.content).includes(canonicalSource(option.sourceExcerpt)))throw studyError(422,'Une preuve du QCM est absente du cours sélectionné.')
    const page=scope.pages.find(page=>page.page>=section.startPage&&page.page<=section.endPage&&canonicalSource(page.text).includes(canonicalSource(option.sourceExcerpt)))
    return {text:option.text.trim(),correct:option.correct,explanation:option.explanation.trim(),relation:option.relation,sourceSectionId:section.id,sourceExcerpt:option.sourceExcerpt.trim(),page:page?.page??section.startPage,endPage:section.endPage,exactPage:Boolean(page)}
  })
  return {prompt:raw.prompt.trim(),options,...settings}
}

export function verificationResult(raw, question) {
  if (!raw || raw.coherent !== true || !text(raw.reason,20,2000) || !Array.isArray(raw.options) || raw.options.length !== question.options.length) return {passed:false,reason:'Cohérence non démontrée par la vérification indépendante.'}
  const seen=new Set()
  const passed=raw.options.every(option=>{
    if(!Number.isSafeInteger(option.index)||option.index<0||option.index>=question.options.length||seen.has(option.index))return false
    seen.add(option.index)
    return option.adequate===true && option.relation===question.options[option.index].relation && text(option.reason,20,2000)
  })
  return {passed,reason:raw.reason,options:raw.options,message:'Contrôle IA de cohérence avec le cours, sans certification médicale. Relecture humaine requise.'}
}
