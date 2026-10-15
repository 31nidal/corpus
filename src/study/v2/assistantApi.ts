import {request,json} from './api'
import type {PdfSelection} from './types'
export type AssistantMessage = {
  id: string; prompt: string; sourceVersion: number; state: 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted'
  source: {selection: PdfSelection | null; processingState: string; sections: {id: string; title: string}[]; extraction?: {warnings?: string[]}}
  response: {answered: boolean; message: string; paragraphs: {text: string; citations: {sourceSectionId: string; sourceExcerpt: string; page: number; endPage: number; exactPage: boolean}[]}[]} | null
  generation: {coverage?: {evidenceLimited?: boolean; chunksAnalyzed: number; chunksTotal: number}}
  errorMessage: string | null
}
export type AssistantThread = {id: string; title: string; documentId: string; createdAt: number; updatedAt: number; messages: AssistantMessage[]}
export type AssistantThreadHeader = Omit<AssistantThread, 'messages'>
const root = (doc: string) => `documents/${encodeURIComponent(doc)}/assistant`
export const listConversations = (doc: string, signal?: AbortSignal) => request<{threads: AssistantThreadHeader[]}>(root(doc), {signal})
export const getConversation = (doc: string, thread: string, signal?: AbortSignal) => request<{thread: AssistantThread}>(root(doc) + '/' + encodeURIComponent(thread), {signal})
export const createConversation = (doc: string, requestId: string) => request<{thread: AssistantThread}>(root(doc), json('POST', {requestId}))
export const askDocument = (doc: string, thread: string, body: {requestId: string; prompt: string; sectionIds?: string[]; selection?: PdfSelection}) => request<{message: AssistantMessage}>(root(doc) + '/' + encodeURIComponent(thread) + '/messages', json('POST', body))
export const deleteConversation = (doc: string, thread: string) => request(root(doc) + '/' + encodeURIComponent(thread), {method: 'DELETE'})
