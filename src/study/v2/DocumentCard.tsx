import {useRef, useState} from 'react'
import {FileText} from 'lucide-react'
import {deleteStudyDocument} from '../myCoursesApi'
import {patchDocument} from './api'
import {processingLabels, type DocumentMeta, type StudyFolder} from './types'

export function DocumentCard({document, folders, onOpen, onChanged}: {
  document: DocumentMeta; folders: StudyFolder[]; onOpen: (id: string) => void; onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(document.title)
  const [folder, setFolder] = useState(document.folderId ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function mutate(action: () => Promise<unknown>) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {await action(); setEditing(false); onChanged()}
    catch (problem) {setError(problem instanceof TypeError ? 'Connexion au serveur impossible. Réessayez.' : (problem as Error).message)}
    finally {lock.current = false; setBusy(false)}
  }
  return <article className="sv2-document-card">
    <button className="sv2-document-open" onClick={() => onOpen(document.id)}>
      <FileText size={22}/><span><strong>{document.title}</strong><small>{document.pageCount || '—'} page{document.pageCount === 1 ? '' : 's'} · {document.sectionCount} section{document.sectionCount === 1 ? '' : 's'}</small></span>
    </button>
    <span className="sv2-state" data-state={document.processingState}>{processingLabels[document.processingState]}</span>
    {document.lastOpenedAt && <small>Consulté le {new Date(document.lastOpenedAt).toLocaleDateString('fr-FR')}</small>}
    {document.errorMessage && <p className="sv2-diagnostic">{document.errorMessage}</p>}
    <div className="sv2-row"><button disabled={busy} aria-expanded={editing} onClick={() => {setTitle(document.title); setFolder(document.folderId ?? ''); setEditing(value => !value)}}>Renommer / déplacer</button>
      <button disabled={busy} onClick={() => mutate(() => patchDocument(document.id, {archived: !document.archivedAt, expectedUpdatedAt: document.metadataUpdatedAt}))}>{document.archivedAt ? 'Restaurer' : 'Archiver'}</button></div>
    {editing && <form onSubmit={event => {event.preventDefault(); void mutate(() => patchDocument(document.id, {title, folderId: folder || null, expectedUpdatedAt: document.metadataUpdatedAt}))}}>
      <label>Titre du cours<input required maxLength={150} value={title} onChange={event => setTitle(event.target.value)}/></label>
      <label>Dossier du cours<select value={folder} onChange={event => setFolder(event.target.value)}><option value="">Non classés</option>
        {folders.map(item => <option key={item.id} value={item.id}>{item.parentId ? (folders.find(parent => parent.id === item.parentId)?.name ?? '') + ' / ' : ''}{item.name}</option>)}</select></label>
      <div className="sv2-row"><button disabled={busy}>Enregistrer</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Annuler</button></div>
    </form>}
    <details className="sv2-delete"><summary>Suppression définitive</summary>
      <p>Le PDF et les supports associés seront supprimés. L’archive permet de les conserver.</p>
      {confirmDelete ? <div className="sv2-row"><button disabled={busy} onClick={() => mutate(() => deleteStudyDocument(document.id))}>Confirmer la suppression</button><button disabled={busy} onClick={() => setConfirmDelete(false)}>Annuler</button></div>
        : <button disabled={busy} onClick={() => setConfirmDelete(true)}>Supprimer ce cours</button>}
    </details>
    {error && <p role="alert">{error} <button disabled={busy} onClick={onChanged}>Recharger</button></p>}
  </article>
}
