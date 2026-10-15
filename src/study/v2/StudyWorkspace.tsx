import {lazy, Suspense, type ReactNode} from 'react'
import {Library} from './Library'
const DocumentWorkspace = lazy(() => import('./DocumentWorkspace').then(module => ({default: module.DocumentWorkspace})))
import './studyV2.css'

export default function StudyWorkspace({initialDocumentId, initialSectionId, onOpenDocument, onClassic, versionControl}: {
  initialDocumentId?: string | null; initialSectionId?: string | null
  onOpenDocument?: (id: string | null) => void; onClassic: () => void; versionControl: ReactNode
}) {
  if (initialDocumentId) return <Suspense fallback={<section className="study-workspace sv2-workspace" role="status">Chargement du lecteur…</section>}><DocumentWorkspace key={initialDocumentId} id={initialDocumentId} initialSectionId={initialSectionId} onBack={() => onOpenDocument?.(null)} onClassic={onClassic} versionControl={versionControl}/></Suspense>
  return <Library onOpen={id => onOpenDocument?.(id)} versionControl={versionControl}/>
}
