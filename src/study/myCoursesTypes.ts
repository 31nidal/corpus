import type { Question } from './questions'

export type StudyDocument = {
  id: string
  title: string
  filename: string
  fileSize: number
  pageCount: number
  status: 'ready' | 'processing' | 'error'
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
  sectionCount: number
  questionCount: number
  hasSummary: boolean
  sections?: StudySection[]
  summary?: StudySummary | null
  extraction?: {method:string;warnings:string[]} | null
}

export type StudySection = {
  id: string
  title: string
  sectionOrder: number
  startPage: number
  endPage: number
  content: string
  tokenCount: number
}

export type StudySummaryChapter = {
  id: string
  title: string
  pages: string
  keyPoints: string[]
  excerpt: string
  categories?: StudySummaryCategory[]
}

export type StudySummaryCategory = {
  id: string
  label: string
  items: string[]
}

export type StudySummary = {
  kind?: 'summary' | 'revision'
  generation?: import('./ai/GenerationNotice').GenerationInfo
  title: string
  overview: string
  sectionCount: number
  chapters: StudySummaryChapter[]
}

export type StudyQuestion = Question & {
  sourceEvidence?: {verified:boolean;page:number|null}
  documentId: string
  sourceSectionId: string
  sourceSectionTitle?: string
  sourcePages: number[]
  sourceExcerpt: string
  createdAt?: string
}

export type StudyQuota = {
  maxDocuments: number
  documentsUsed: number
  maxFileSizeBytes: number
  monthlyGenerations: number
  generationsUsed: number
}

export type LearningOverview = {
 metadata: {documentId:string;subject:string;lastOpenedAt:string|null}[]
 questions: {id:string;documentId:string;sectionId:string;sectionTitle:string|null}[]
 history: {id:string;documentId:string;questionId:string;sectionId:string;correct:number;createdAt:string}[]
}
