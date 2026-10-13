import {useEffect, useRef, useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import {getDocumentMeta, getLegacyDocument, patchDocument} from './api'
import type {DocumentResult} from './types'

export function useDocument(id: string, initialSectionId?: string | null) {
  const [data, setData] = useState<DocumentResult | null>(null)
  const [document, setDocument] = useState<StudyDocument | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [positionMessage, setPositionMessage] = useState('')
  const [revision, setRevision] = useState(0)
  const initialized = useRef(false)
  const lastSection = useRef<string | null | undefined>(undefined)
  const savedPage = useRef(1)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    setError('')
    async function load() {
      try {
        const [result, legacy] = await Promise.all([getDocumentMeta(id, controller.signal), getLegacyDocument(id, controller.signal)])
        if (controller.signal.aborted) return
        setData(result); setDocument(legacy)
        if (!initialized.current) {
          initialized.current = true
          savedPage.current = result.document.readingPage
          setPage(result.document.readingPage)
          void patchDocument(id, {opened: true}).catch(() => {if (!controller.signal.aborted) setPositionMessage('La dernière consultation n’a pas pu être enregistrée.')})
        }
        if (['imported', 'processing'].includes(result.document.processingState)) timer = setTimeout(load, 2000)
      } catch (problem) {if (!controller.signal.aborted) setError((problem as Error).message)}
    }
    void load()
    return () => {controller.abort(); clearTimeout(timer)}
  }, [id, revision])
  useEffect(() => {
    if (!document || lastSection.current === initialSectionId) return
    lastSection.current = initialSectionId
    const section = document.sections?.find(item => item.id === initialSectionId)
    if (section) setPage(section.startPage)
  }, [document, initialSectionId])
  useEffect(() => {
    if (!data || !initialized.current || savedPage.current === page || page > data.document.pageCount) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {await patchDocument(id, {readingPage: page}); if (!cancelled) {savedPage.current = page; setPositionMessage('Position de lecture enregistrée.')}}
      catch {if (!cancelled) setPositionMessage('Position non enregistrée. Vérifiez votre connexion puis changez de page pour réessayer.')}
    }, 600)
    return () => {cancelled = true; clearTimeout(timer)}
  }, [id, page, data])
  return {data, document, page, setPage, error, positionMessage, reload: () => setRevision(value => value + 1)}
}
