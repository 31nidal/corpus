import {useEffect, useState} from 'react'
import {getNote, listNotes} from './api'
import type {RevisionNote, RevisionNoteHeader} from './types'

export function useNotes(documentId: string) {
  const [notes, setNotes] = useState<RevisionNoteHeader[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState<RevisionNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      try {
        const result = await listNotes(documentId, controller.signal)
        if (controller.signal.aborted) return
        setNotes(result.notes); setLoading(false); setError('')
        if (result.notes.some(note => ['queued', 'running'].includes(note.generationState))) timer = setTimeout(load, 2000)
      } catch (problem) {if (!controller.signal.aborted) {setError((problem as Error).message); setLoading(false)}}
    }
    void load()
    return () => {controller.abort(); clearTimeout(timer)}
  }, [documentId, revision])
  useEffect(() => {
    if (!selected) {setNote(null); return}
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      try {
        const result = await getNote(documentId, selected!, controller.signal)
        if (controller.signal.aborted) return
        setNote(result.note); setError('')
        if (['queued', 'running'].includes(result.note.generationState)) timer = setTimeout(load, 2000)
      } catch (problem) {if (!controller.signal.aborted) {setError((problem as Error).message); if ((problem as {status?: number}).status === 404) {setNote(null); setSelected(null)}}}
    }
    void load()
    return () => {controller.abort(); clearTimeout(timer)}
  }, [documentId, selected, revision])
  function choose(id: string | null) {setNote(null); setSelected(id); setError('')}
  return {notes, selected, choose, note, setNote, loading, error, reload: () => setRevision(value => value + 1)}
}
