import type { AnatomyQuizAttempt, AnatomyProgress } from '../src/atlas/anatomyLearning'
export function validAnatomyAttempt(value: unknown): value is AnatomyQuizAttempt
export function validAnatomyProgress(value: unknown): value is AnatomyProgress
export function mergeAnatomyProgress(incoming: AnatomyProgress, current: AnatomyProgress): AnatomyProgress
