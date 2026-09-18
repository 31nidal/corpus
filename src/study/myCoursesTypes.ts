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
}

export type StudySummary = {
  title: string
  overview: string
  sectionCount: number
  chapters: StudySummaryChapter[]
}

export type StudyQuestion = Question & {
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

