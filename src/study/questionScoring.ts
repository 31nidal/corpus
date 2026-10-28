import type {Question} from './questions'
/** Shared by the question bank and imported-PDF training, without loading the catalog. */
export function isCorrect(q:Pick<Question,'correct'>,answer:number[]){return answer.length===q.correct.length&&q.correct.every(i=>answer.includes(i))}
