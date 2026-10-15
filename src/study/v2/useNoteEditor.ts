import {useEffect, useRef, useState} from 'react'
import {useAccount} from '../../account/store'
import {editNote, getNote} from './api'
import type {RevisionNote, NoteEdit} from './types'

const editable = (note: RevisionNote) => ({title: note.title, items: note.items.map(({id, text, category}) => ({id, text, category}))})
function checkpoint(note: RevisionNote, key: string): {version: number; draft: ReturnType<typeof editable>} | null {
  try {
    const cache = JSON.parse(sessionStorage.getItem(key) || 'null')
    const draft = cache?.draft
    if (!Number.isSafeInteger(cache?.version) || cache.version < 1 || typeof draft?.title !== 'string' || draft.title.length > 150 || !Array.isArray(draft.items) || draft.items.length > 500 || new Set(draft.items.map((item: {id: string}) => item?.id)).size !== draft.items.length) return null
    if (draft.items.some((item: {id: string; text: string; category: string}) => !item || !note.items.some(source => source.id === item.id) || typeof item.text !== 'string' || item.text.length > 2000 || typeof item.category !== 'string' || item.category.length > 100)) return null
    return {version: cache.version as number, draft: {title: draft.title as string, items: draft.items.map(({id, text, category}: {id: string; text: string; category: string}) => ({id, text, category}))}}
  } catch {return null}
}

export function useNoteEditor(note: RevisionNote, onSaved: (note: RevisionNote) => void) {
  const account = useAccount()
  const cacheKey = `study-v2-note-edit:${account.user?.id}:${note.id}`
  const [draft, setDraft] = useState<ReturnType<typeof editable>>(() => checkpoint(note, cacheKey)?.draft ?? editable(note))
  const [baseVersion, setBaseVersion] = useState(() => checkpoint(note, cacheKey)?.version ?? note.editVersion)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const lock = useRef(false)
  const lastIntent = useRef<NoteEdit['state']>(note.state)
  const dirty = JSON.stringify(draft) !== JSON.stringify(editable(note))
  useEffect(() => {
    try {if (dirty) sessionStorage.setItem(cacheKey, JSON.stringify({draft, version: baseVersion})); else sessionStorage.removeItem(cacheKey)}
    catch {setMessage('La copie locale n’a pas pu être conservée. Enregistrez avant de quitter.')}
  }, [cacheKey, draft, dirty, baseVersion])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {if (dirty) {event.preventDefault(); event.returnValue = ''}}
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  async function reset() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await getNote(note.documentId, note.id)
      setDraft(editable(result.note)); setBaseVersion(result.note.editVersion); onSaved(result.note)
      setMessage('Version serveur rechargée.')
      try {sessionStorage.removeItem(cacheKey)} catch {/* Optional checkpoint. */}
    } catch (problem) {setError((problem as Error).message)}
    finally {lock.current = false; setBusy(false)}
  }
  async function save(state: NoteEdit['state']) {
    if (lock.current) return
    lock.current = true; lastIntent.current = state; setBusy(true); setError(''); setMessage('Enregistrement de la fiche…')
    try {
      const result = await editNote(note.documentId, note.id, {...draft, expectedEditVersion: baseVersion, state})
      setDraft(editable(result.note)); setBaseVersion(result.note.editVersion); onSaved(result.note)
      try {sessionStorage.removeItem(cacheKey)} catch {/* Server save already succeeded. */}
      setMessage(state === 'saved' ? 'Fiche enregistrée. Elle reste modifiable.' : 'Brouillon enregistré.')
      return true
    } catch (problem) {setError((problem as Error).message); setMessage('Vos modifications restent affichées et conservées localement lorsque le stockage est disponible.'); return false}
    finally {lock.current = false; setBusy(false)}
  }
  return {draft, setDraft, busy, error, message, dirty, save, reset, retry: () => save(lastIntent.current)}
}
