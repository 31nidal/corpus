import {useEffect, useRef, useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import {deleteNote} from './api'
import {NoteEditor} from './NoteEditor'
import {NoteGenerationForm} from './NoteGenerationForm'
import {useNotes} from './useNotes'
import type {PdfSelection} from './types'
import './notes.css'

export default function NotesWorkspace({document, selection, onSource}: {
  document: StudyDocument; selection: PdfSelection | null; onSource: (page: number) => void
}) {
  const notes = useNotes(document.id)
  const [creating, setCreating] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const lock = useRef(false)
  useEffect(() => {if (selection) {setCreating(true); notes.choose(null)}}, [selection])
  async function remove() {
    if (!notes.note || lock.current) return
    lock.current = true; setDeleting(true); setError('')
    try {await deleteNote(document.id, notes.note.id); notes.choose(null); setConfirmDelete(false); notes.reload()}
    catch (problem) {setError((problem as Error).message)}
    finally {lock.current = false; setDeleting(false)}
  }
  return <section className="sv2-notes" aria-label="Fiches de révision du cours">
    <header className="sv2-heading"><div><h2>Fiches de révision</h2><p>Plusieurs supports par cours, avec preuves et édition avant ou après sauvegarde.</p></div><button onClick={() => {setCreating(true); notes.choose(null)}}>Nouvelle fiche</button></header>
    <p role="status">{notes.loading ? 'Chargement des fiches…' : `${notes.notes.length} fiche${notes.notes.length === 1 ? '' : 's'}`}</p>
    {(notes.error || error) && <p role="alert">{notes.error || error} <button onClick={notes.reload}>Réessayer</button></p>}
    <div className="sv2-notes-layout">
      <nav aria-label="Fiches disponibles" className="sv2-notes-list">{notes.notes.map(note => <button key={note.id} aria-current={notes.selected === note.id ? 'page' : undefined} onClick={() => {notes.choose(note.id); setCreating(false); setConfirmDelete(false)}}>
        <strong>{note.title}</strong><small>{['queued', 'running'].includes(note.generationState) ? 'Génération en cours' : note.generationState === 'failed' || note.generationState === 'interrupted' ? 'Génération à reprendre' : note.state === 'saved' ? 'Enregistrée' : 'Brouillon'} · {note.itemCount} points</small>
      </button>)}{!notes.loading && !notes.notes.length && <p>Aucune fiche. Créez un brouillon depuis le cours ou une sélection.</p>}</nav>
      <div className="sv2-note-main">
        {creating && <NoteGenerationForm document={document} selection={selection} onCreated={note => {notes.setNote(note); notes.choose(note.id); setCreating(false); notes.reload()}}/>}
        {!creating && notes.selected && !notes.note && !notes.error && <p role="status">Chargement de la fiche…</p>}
        {!creating && notes.note && <>
          {['queued','running'].includes(notes.note.generationState) && <p role="status">Analyse des sections et préparation de la fiche… La demande est conservée ; vous pouvez revenir plus tard.</p>}
          {['failed','interrupted'].includes(notes.note.generationState) && <div role="alert"><p>{notes.note.errorMessage}</p><button onClick={() => setCreating(true)}>Préparer une nouvelle demande</button><p>Aucune relance payante automatique. Le cours original reste disponible.</p></div>}
          {notes.note.generationState === 'succeeded' && <NoteEditor key={notes.note.id} note={notes.note} onSaved={note => {notes.setNote(note); notes.reload()}} onSource={onSource}/>}
          <details className="sv2-delete"><summary>Supprimer cette fiche</summary><p>Le document et ses flashcards restent conservés. Une génération IA déjà démarrée peut continuer.</p>
            {confirmDelete ? <div className="sv2-row"><button disabled={deleting} onClick={remove}>Confirmer la suppression de la fiche</button><button disabled={deleting} onClick={() => setConfirmDelete(false)}>Annuler</button></div> : <button onClick={() => setConfirmDelete(true)}>Supprimer définitivement la fiche</button>}
          </details>
        </>}
      </div>
    </div>
  </section>
}
