import {useNavigationInset} from './useNavigationInset'
import {useState, type ReactNode} from 'react'
import {Search} from 'lucide-react'
import {DocumentCard} from './DocumentCard'
import {FolderNavigation} from './FolderNavigation'
import {ImportPanel} from './ImportPanel'
import {useLibrary} from './useLibrary'

export function Library({onOpen, versionControl}: {onOpen: (id: string) => void; versionControl: ReactNode}) {
  useNavigationInset()
  const [q, setQ] = useState('')
  const [folderId, setFolderId] = useState<string | null | undefined>()
  const [archived, setArchived] = useState(false)
  const library = useLibrary(q, folderId, archived)
  const recent = library.data.documents.filter(doc => doc.lastOpenedAt).slice(0, 3)
  return <section className="study-workspace sv2-workspace" aria-label="Mes cours Study 2.0">
    <header className="sv2-heading"><div><p className="sv2-eyebrow">STUDY 2.0 · BÊTA</p><h1>Mes cours</h1><p>Lire, organiser et retrouver vos documents.</p></div>{versionControl}</header>
    <ImportPanel onImported={() => library.reload()}/>
    <div className="sv2-library-layout">
      <FolderNavigation folders={library.data.folders} selected={folderId} archived={archived} onSelect={setFolderId} onArchived={setArchived} onCreated={library.reload}/>
      <main className="sv2-library-main">
        <label className="sv2-search"><Search size={18}/><span className="sr-only">Rechercher dans les titres et le contenu</span><input type="search" value={q} maxLength={200} placeholder="Rechercher dans vos cours…" onChange={event => setQ(event.target.value)}/></label>
        <p role="status">{library.loading ? 'Chargement de la bibliothèque…' : `${library.data.documents.length} cours${archived ? ' archivés' : ''}`}</p>
        {library.error && <div role="alert"><p>{library.error}</p><button onClick={library.reload}>Réessayer</button></div>}
        {!library.loading && !library.error && !library.data.documents.length && <div className="sv2-empty"><h2>{q ? 'Aucun cours trouvé' : archived ? 'Aucun cours archivé' : 'Aucun cours ici'}</h2><p>{q ? 'Essayez un autre titre ou un passage du cours.' : archived ? 'Les cours archivés pourront être restaurés ici.' : 'Importez un PDF ou classez un cours dans ce dossier.'}</p></div>}
        {recent.length > 0 && !q && folderId === undefined && !archived && <nav className="sv2-recents" aria-label="Cours récemment consultés"><h2>Récemment consultés</h2>{recent.map(doc => <button key={doc.id} onClick={() => onOpen(doc.id)}>{doc.title}</button>)}</nav>}
        <div className="sv2-documents">{library.data.documents.map(doc => <DocumentCard key={doc.id} document={doc} folders={library.data.folders} onOpen={onOpen} onChanged={library.reload}/>)}</div>
      </main>
    </div>
  </section>
}
