import {useEffect, useState} from 'react'
import {listLibrary} from './api'
import type {LibraryResult} from './types'

export function useLibrary(q: string, folderId: string | null | undefined, archived: boolean) {
  const [data, setData] = useState<LibraryResult>({documents: [], folders: [], nextOffset: null})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    setLoading(true)
    setError('')
    setData(current => ({...current, documents: []}))
    async function load() {
      try {
        const result = await listLibrary({q, folderId, archived}, controller.signal)
        if (controller.signal.aborted) return
        setData(result)
        setLoading(false)
        setError('')
        if (result.documents.some(doc => ['imported', 'processing'].includes(doc.processingState))) timer = setTimeout(load, 2000)
      } catch (problem) {
        if (!controller.signal.aborted) {setLoading(false); setError((problem as Error).message || 'Connexion au serveur impossible.')}
      }
    }
    timer = setTimeout(load, q ? 250 : 0)
    return () => {controller.abort(); clearTimeout(timer)}
  }, [q, folderId, archived, revision])
  return {data, loading, error, reload: () => setRevision(value => value + 1)}
}
