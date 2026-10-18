import { validAnatomyAttempt } from '../../shared/anatomyProgress.mjs'
import type { Structure } from '../types'
import { vertebraCode } from './anatomicalGraph'
export type AnatomyExerciseMode = 'free' | 'mcq' | 'click' | 'label' | 'exam'
export type AnatomyQuestion = { id: string; name: string; aliases: string[]; options: {id:string;name:string}[] }
export type AnatomyAnswer = { structureId: string; given: string; correct: boolean }
export type AnatomyQuizAttempt = { id: string; revision: string; mode: AnatomyExerciseMode; startedAt: string; completedAt: string; answers: AnatomyAnswer[]; durationSeconds: number }
export type AnatomyProgress = { version: 1; attempts: AnatomyQuizAttempt[] }
export const normalizeAnatomicalAnswer = (text: string) => text.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g,'oe').replace(/æ/g,'ae').replace(/[^a-z0-9]+/g,' ').trim()
export function acceptsAnatomicalAnswer(question: AnatomyQuestion, answer: string): boolean {
  const normalized = normalizeAnatomicalAnswer(answer)
  return Boolean(normalized) && question.aliases.some(alias => normalizeAnatomicalAnswer(alias) === normalized)
}
export function eligibleAnatomyTargets(structures: Structure[], mode: AnatomyExerciseMode, name: (s: Structure) => string = s => s.name): Structure[] {
  const counts = new Map<string,number>()
  for (const structure of structures.filter(s=>!s.aggregate&&s.meshNames.length>0&&!s.detailOnly)) { const key=normalizeAnatomicalAnswer(name(structure));counts.set(key,(counts.get(key)??0)+1) }
  return structures.filter(s => !s.aggregate && s.meshNames.length > 0 && (mode !== 'click' || (!s.detailOnly && counts.get(normalizeAnatomicalAnswer(name(s)))===1)))
}
export function makeAnatomyQuestions(structures: Structure[], name: (s: Structure) => string, limit = 10, random = Math.random): AnatomyQuestion[] {
  const candidates = structures.filter(s => !s.aggregate && s.meshNames.length > 0)
  const shuffle = <T,>(items: T[]) => {
    const result = [...items]
    for (let i=result.length-1;i>0;i--) { const j = Math.floor(random() * (i+1)); [result[i],result[j]]=[result[j],result[i]] }
    return result
  }
  return shuffle(candidates).slice(0, limit).map(structure => {
    const label = name(structure), seenNames = new Set([normalizeAnatomicalAnswer(label)])
    const distractors = shuffle(candidates.filter(s => s.id !== structure.id)).filter(s => {
      const key = normalizeAnatomicalAnswer(name(s))
      if (seenNames.has(key)) return false
      seenNames.add(key); return true
    }).slice(0, 3)
    return { id: structure.id, name: label, aliases: [label, structure.name, structure.id, vertebraCode(structure.name) ?? ''].filter(Boolean),
      options: shuffle([structure,...distractors]).map(s => ({id:s.id,name:name(s)})) }
  })
}
export function readAnatomyProgress(raw: string | null): AnatomyProgress {
  try {
    const value = JSON.parse(raw ?? 'null')
    if (value?.version === 1 && Array.isArray(value.attempts)) return {version:1, attempts:value.attempts.filter(validAnatomyAttempt).slice(-100)}
  } catch { /* A corrupt local history must not prevent revision. */ }
  return {version:1, attempts:[]}
}
