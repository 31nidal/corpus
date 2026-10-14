import {request, json} from './api'
import type {PdfSelection} from './types'
import type {QuestionSet, QuestionSetHeader, QuestionSettings, StudyQuestion, QuestionContent, QuestionJob, TrainingAttempt, TrainingHeader} from './questionTypes'
const root = (doc: string) => `documents/${encodeURIComponent(doc)}/`
const series = (doc: string, set: string) => root(doc) + `question-sets/${encodeURIComponent(set)}`
const question = (doc: string, set: string, id: string) => series(doc, set) + `/questions/${encodeURIComponent(id)}`
export const listQuestionSets = (doc: string, signal?: AbortSignal) => request<{sets: QuestionSetHeader[]}>(root(doc) + 'question-sets', {signal})
export const getQuestionSet = (doc: string, set: string, signal?: AbortSignal) => request<{set: QuestionSet}>(series(doc, set), {signal})
export const generateQuestions = (doc: string, body: QuestionSettings & {requestId: string; sectionIds?: string[]; selection?: PdfSelection}) => request<{set: QuestionSet; job: QuestionJob}>(root(doc) + 'question-sets', json('POST', body))
export const patchQuestion = (doc: string, set: string, id: string, body: {expectedVersion: number; content?: QuestionContent; status?: StudyQuestion['status']; reviewConfirmed?: boolean}) => request<{question: StudyQuestion}>(question(doc, set, id), json('PATCH', body))
export const regenerateQuestion = (doc: string, set: string, id: string, requestId: string, expectedVersion: number) => request<{set: QuestionSet; job: QuestionJob}>(question(doc, set, id) + '/regenerate', json('POST', {requestId, expectedVersion}))
export const deleteQuestionSet = (doc: string, set: string) => request(series(doc, set), {method: 'DELETE'})
export const startTraining = (doc: string, set: string, requestId: string, mode: TrainingAttempt['mode']) => request<{attempt: TrainingAttempt}>(series(doc, set) + '/train', json('POST', {requestId, mode}))
export const listTraining = (doc: string, signal?: AbortSignal) => request<{attempts: TrainingHeader[]}>(root(doc) + 'training', {signal})
export const getTraining = (doc: string, id: string, signal?: AbortSignal) => request<{attempt: TrainingAttempt}>(root(doc) + 'training/' + encodeURIComponent(id), {signal})
export const answerTraining = (doc: string, id: string, questionId: string, selected: number[]) => request<{attempt: TrainingAttempt}>(root(doc) + `training/${encodeURIComponent(id)}/answer`, json('POST', {questionId, selected}))
export const finishTraining = (doc: string, id: string) => request<{attempt: TrainingAttempt}>(root(doc) + `training/${encodeURIComponent(id)}/finish`, json('POST', {}))
