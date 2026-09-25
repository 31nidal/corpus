import type {Question} from './questions'

// A view is built once per attempt; the source question and its indices stay intact.
export type QuestionView = Question & {sourceIndices: number[]}
export function questionView(question: Question, attemptSeed: string): QuestionView {
 let state = 2166136261
 for (const char of JSON.stringify([attemptSeed, question.id])) {
  state = Math.imul(state ^ char.charCodeAt(0), 16777619)
 }
 const random = () => {
  state = (state + 0x6D2B79F5) | 0
  let value = Math.imul(state ^ (state >>> 15), 1 | state)
  value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
 }
 const sourceIndices = question.options.map((_, index) => index)
 if (question.format !== 'boolean') {
  for (let i = sourceIndices.length - 1; i > 0; i--) {
   const j = Math.floor(random() * (i + 1))
   ;[sourceIndices[i], sourceIndices[j]] = [sourceIndices[j], sourceIndices[i]]
  }
 }
 return {...question, sourceIndices,
  options: sourceIndices.map(index => question.options[index]),
  why: sourceIndices.map(index => question.why[index]),
  correct: sourceIndices.flatMap((index, displayed) => question.correct.includes(index) ? [displayed] : []),
 }
}

// Account history retains canonical indices, independent of the presentation order.
export function sourceAnswers(items: QuestionView[], answers: Record<string, number[]>) {
 return Object.fromEntries(items.map(q => [q.id, (answers[q.id] ?? []).map(index => q.sourceIndices[index])]))
}
