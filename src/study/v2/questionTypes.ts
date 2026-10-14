export type QuestionSettings = {
  count: number; format: 'single' | 'multiple'; difficulty: 'essential' | 'standard' | 'advanced'; kind: 'recall' | 'understanding'
}
export type QuestionOption = {
  text: string; correct: boolean; explanation: string; relation: 'supports' | 'contradicts'
  sourceSectionId: string; sourceExcerpt: string; page: number; endPage: number; exactPage: boolean
}
export type QuestionContent = QuestionSettings & {prompt: string; options: QuestionOption[]}
export type StudyQuestion = QuestionContent & {
  id: string; status: 'draft' | 'validated' | 'rejected'; version: number
  validation: {passed: boolean; edited?: boolean; humanReviewed?: boolean; reason?: string; message?: string}
}
export type QuestionJob = {
  id: string; setId: string; targetQuestionId: string | null
  state: 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted'
  errorCode: string | null; errorMessage: string | null
  result: {created?: number; replaced?: number; requested?: number; coverage?: {sectionsTotal: number; sectionsRepresented: number; missingSections: {id: string; title: string}[]}; generation?: {rejected?: number; rejectionReasons?: Record<string, number>}}
}
export type QuestionSet = {
  id: string; documentId: string; title: string; sourceVersion: number; settings: QuestionSettings
  sections: {id: string; title: string; startPage: number; endPage: number}[]
  questions: StudyQuestion[]; jobs: QuestionJob[]; createdAt: number; updatedAt: number
  sourceState?: string; extraction?: {warnings?: string[]}
}
export type QuestionSetHeader = Omit<QuestionSet, 'questions'> & {count: number; validated: number}
export type TrainingQuestion = {
  id: string; prompt: string; format: 'single' | 'multiple'; options: (Partial<QuestionOption> & {text: string})[]
  answer: number[] | null; correct?: number[]; isCorrect?: boolean
}
export type TrainingAttempt = {
  id: string; setId: string; documentId: string; mode: 'immediate' | 'deferred'; questions: TrainingQuestion[]
  answered: number; total: number; finishedAt: number | null; score: number | null; createdAt: number
}
export type TrainingHeader = Omit<TrainingAttempt, 'questions'>
