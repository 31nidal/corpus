import {useEffect, useRef, useState} from 'react'
import {GenerationNotice, useGenerationProvider} from '../ai/GenerationNotice'
import type {StudyDocument} from '../myCoursesTypes'
import {generateNote} from './api'
import type {PdfSelection, RevisionNote} from './types'

export function NoteGenerationForm({document, selection, onCreated}: {
  document: StudyDocument; selection: PdfSelection | null; onCreated: (note: RevisionNote) => void
}) {
  const [kind, setKind] = useState<RevisionNote['kind']>('structured')
  const [scope, setScope] = useState(selection ? 'selection' : 'all')
  const [sections, setSections] = useState((document.sections || []).map(section => section.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const lock = useRef(false), requestId = useRef('')
  const provider = useGenerationProvider()
  useEffect(() => {if (selection) {setScope('selection'); requestId.current = ''}}, [selection])
  async function generate(event: React.FormEvent) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setMessage('Enregistrement de la demande…')
    if (!requestId.current) requestId.current = crypto.randomUUID()
    try {
      const result = await generateNote(document.id, {requestId: requestId.current, kind, ...(scope === 'sections' ? {sectionIds: sections} : scope === 'selection' && selection ? {selection} : {})})
      requestId.current = ''; setMessage('Fiche créée en brouillon. La génération continue en arrière-plan.'); onCreated(result.note)
    } catch (problem) {setError((problem as Error).message); setMessage('La demande n’a pas été confirmée. Réessayer conserve son identifiant.')}
    finally {lock.current = false; setBusy(false)}
  }
  return <form className="sv2-note-generation" onSubmit={generate}>
    <h2>Créer une fiche</h2><GenerationNotice provider={provider}/>
    <label>Format de la fiche<select disabled={busy} value={kind} onChange={event => {setKind(event.target.value as RevisionNote['kind']); requestId.current = ''}}><option value="short">Résumé court</option><option value="structured">Fiche de révision structurée</option><option value="detailed">Fiche détaillée</option></select></label>
    <label>Source de la fiche<select disabled={busy} value={scope} onChange={event => {setScope(event.target.value); requestId.current = ''}}><option value="all">Document entier</option><option value="sections">Chapitres choisis</option>{selection && <option value="selection">Passage sélectionné · page {selection.page}</option>}</select></label>
    {scope === 'selection' && selection && <blockquote>{selection.text}</blockquote>}
    {scope === 'sections' && <fieldset disabled={busy}><legend>Chapitres à analyser</legend>{document.sections?.map(section => <label className="sv2-checkbox" key={section.id}><input type="checkbox" checked={sections.includes(section.id)} onChange={event => {setSections(ids => event.target.checked ? [...ids, section.id] : ids.filter(id => id !== section.id)); requestId.current = ''}}/>{section.title} · p. {section.startPage}–{section.endPage}</label>)}</fieldset>}
    <button className="sv2-primary" disabled={busy || !document.sections?.length || (scope === 'sections' && !sections.length)}>{busy ? 'Demande en cours…' : error ? 'Réessayer la génération' : 'Générer un brouillon de fiche'}</button>
    <p role="status">{message}</p>{error && <p role="alert">{error}</p>}
  </form>
}
