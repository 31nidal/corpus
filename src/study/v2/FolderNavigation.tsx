import {useState} from 'react'
import {FolderPlus} from 'lucide-react'
import {createFolder} from './api'
import type {StudyFolder} from './types'

export function FolderNavigation({folders, selected, archived, onSelect, onArchived, onCreated}: {
  folders: StudyFolder[]; selected: string | null | undefined; archived: boolean
  onSelect: (id: string | null | undefined) => void; onArchived: (value: boolean) => void; onCreated: () => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {await createFolder(name, parent || null); setName(''); setCreating(false); onCreated()}
    catch (problem) {setError((problem as Error).message)}
    finally {setBusy(false)}
  }
  const choose = (id: string | null | undefined) => {onArchived(false); onSelect(id)}
  return <aside className="sv2-folders" aria-label="Matières et chapitres">
    <h2>Bibliothèque</h2>
    <button aria-pressed={!archived && selected === undefined} onClick={() => choose(undefined)}>Tous les cours</button>
    <button aria-pressed={!archived && selected === null} onClick={() => choose(null)}>Non classés</button>
    {folders.filter(folder => folder.kind === 'subject').map(subject => <div key={subject.id}>
      <button aria-pressed={!archived && selected === subject.id} onClick={() => choose(subject.id)}>{subject.name}</button>
      {folders.filter(folder => folder.parentId === subject.id).map(chapter => <button key={chapter.id} className="sv2-chapter" aria-pressed={!archived && selected === chapter.id} onClick={() => choose(chapter.id)}>{chapter.name}</button>)}
    </div>)}
    <button aria-pressed={archived} onClick={() => {onSelect(undefined); onArchived(true)}}>Archives</button>
    <button onClick={() => setCreating(value => !value)} aria-expanded={creating}><FolderPlus size={16}/> Nouveau dossier</button>
    {creating && <form onSubmit={save}>
      <label>Nom du dossier<input required maxLength={120} value={name} onChange={event => setName(event.target.value)}/></label>
      <label>Emplacement du dossier<select value={parent} onChange={event => setParent(event.target.value)}>
        <option value="">Nouvelle matière</option>{folders.filter(folder => folder.kind === 'subject').map(folder => <option key={folder.id} value={folder.id}>{folder.name} · nouveau chapitre</option>)}
      </select></label>
      <button disabled={busy}>{busy ? 'Création…' : 'Créer le dossier'}</button><button type="button" disabled={busy} onClick={() => setCreating(false)}>Annuler</button>
      {error && <p role="alert">{error}</p>}
    </form>}
  </aside>
}
