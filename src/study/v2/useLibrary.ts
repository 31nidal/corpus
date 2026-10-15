import {useEffect, useRef, useState} from 'react'
import {listLibrary} from './api'
import type {LibraryResult} from './types'

export function useLibrary(q: string, folderId: string | null | undefined, archived: boolean) {
  const [data, setData] = useState<LibraryResult>({documents: [], folders: [], nextOffset: null})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const version = useRef(0), moreRequest = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    version.current++
    moreRequest.current?.abort(); moreRequest.current = null; setLoadingMore(false)
    let timer: ReturnType<typeof setTimeout>
    setLoading(true)
    setError('')
    setData(current => ({...current, documents: []}))
    async function load() {
      try {
        const result = await listLibrary({q, folderId, archived}, controller.signal)
        if (controller.signal.aborted) return
        setData(current => current.documents.length <= 100 ? result : {...result, documents:[...result.documents,...current.documents.slice(100).filter(doc => !result.documents.some(fresh => fresh.id === doc.id))], nextOffset:current.nextOffset})
        setLoading(false)
        setError('')
        if (result.documents.some(doc => ['imported', 'processing'].includes(doc.processingState))) timer = setTimeout(load, 2000)
      } catch (problem) {
        if (!controller.signal.aborted) {setLoading(false); setError((problem as Error).message || 'Connexion au serveur impossible.')}
      }
    }
    timer = setTimeout(load, q ? 250 : 0)
    return () => {controller.abort(); moreRequest.current?.abort(); version.current++; clearTimeout(timer)}
  }, [q, folderId, archived, revision])
  async function loadMore() {
    if (moreRequest.current || loading || data.nextOffset === null) return
    const controller = new AbortController(), currentVersion = version.current
    moreRequest.current = controller; setLoadingMore(true); setError('')
    try {
      const result = await listLibrary({q, folderId, archived, offset:data.nextOffset}, controller.signal)
      if (controller.signal.aborted || currentVersion !== version.current) return
      setData(current => ({...result, documents:[...current.documents,...result.documents.filter(doc => !current.documents.some(old => old.id === doc.id))]}))
    } catch (problem) {if (!controller.signal.aborted) setError((problem as Error).message)}
    finally {if (currentVersion === version.current) {moreRequest.current = null; setLoadingMore(false)}}
  }
  return {data, loading, loadingMore, loadMore, error, reload: () => setRevision(value => value + 1)}
}
