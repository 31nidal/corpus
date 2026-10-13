import {useNavigationInset} from './useNavigationInset'
import {lazy, Suspense, useState, type ReactNode} from 'react'
import {ArrowLeft, Download} from 'lucide-react'
import {PdfReader} from './PdfReader'
import {DocumentRecovery} from './DocumentRecovery'
import {processingLabels, type PdfSelection} from './types'
import {useDocument} from './useDocument'
const ReviewWorkspace = lazy(() => import('../review/ReviewWorkspace'))

export function DocumentWorkspace({id, initialSectionId, onBack, onClassic, versionControl}: {
  id: string; initialSectionId?: string | null; onBack: () => void; onClassic: () => void; versionControl: ReactNode
}) {
  useNavigationInset(id)
  const course = useDocument(id, initialSectionId)
  const [space, setSpace] = useState<'original' | 'flashcards'>('original')
  const [selection, setSelection] = useState<PdfSelection | null>(null)
  const [copied, setCopied] = useState('')
  const [outlineOpen, setOutlineOpen] = useState(() => window.matchMedia('(min-width: 901px)').matches)
  const data = course.data
  async function copy() {
    try {await navigator.clipboard.writeText(selection!.text); setCopied('Passage copié.')}
    catch {setCopied('Copie indisponible. Utilisez la sélection du PDF et le raccourci de copie de votre appareil.')}
  }
  return <section className="study-workspace sv2-workspace sv2-document-workspace" aria-label="Espace documentaire Study 2.0">
    <div className="sv2-row sv2-document-top"><button onClick={onBack}><ArrowLeft size={16}/> Bibliothèque</button>{versionControl}</div>
    {course.error && <div role="alert"><p>{course.error}</p><button onClick={course.reload}>Réessayer</button></div>}
    {!data && !course.error && <p role="status">Chargement du cours…</p>}
    {data && <>
      <header className="sv2-heading"><div><h1>{data.document.title}</h1><p>{data.document.filename} · {data.document.pageCount || '—'} pages · <span className="sv2-state" data-state={data.document.processingState}>{processingLabels[data.document.processingState]}</span></p></div>
        <a href={`/api/study/documents/${encodeURIComponent(id)}/pdf`} download={data.document.filename}><Download size={16}/> PDF original</a></header>
      <DocumentRecovery data={data} onRetry={course.reload}/>
      {course.document?.extraction?.warnings?.length ? <details className="sv2-warnings"><summary>Vérifications de l’extraction ({course.document.extraction.warnings.length})</summary><ul>{course.document.extraction.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details> : null}
      <nav className="sv2-spaces" aria-label="Espaces du cours">
        <button aria-pressed={space === 'original'} onClick={() => setSpace('original')}>Document original</button>
        <button aria-pressed={space === 'flashcards'} onClick={() => setSpace('flashcards')}>Flashcards</button>
        <button onClick={onClassic}>Fiches et QCM · interface actuelle</button>
      </nav>
      <div hidden={space !== 'original'} className="sv2-reading-layout">
        <aside className="sv2-outline"><details open={outlineOpen} onToggle={event => setOutlineOpen(event.currentTarget.open)}><summary>Sommaire du cours</summary>
          {course.document?.sections?.length ? <nav aria-label="Chapitres du PDF">{course.document.sections.map(section => <button key={section.id} aria-current={course.page >= section.startPage && course.page <= section.endPage ? 'location' : undefined} onClick={() => course.setPage(section.startPage)}><span>{section.title}</span><small>p. {section.startPage}{section.endPage !== section.startPage ? `–${section.endPage}` : ''}</small></button>)}</nav>
            : <p>Le PDF reste consultable. Le sommaire apparaîtra après extraction des passages lisibles.</p>}
        </details></aside>
        <div className="sv2-reading-main">
          <PdfReader documentId={id} title={data.document.title} page={course.page} onPage={course.setPage} onSelection={setSelection}/>
          {selection && <section className="sv2-selection" aria-label="Passage sélectionné"><h2>Sélection · page {selection.page}</h2><blockquote>{selection.text}</blockquote><button onClick={copy}>Copier le passage</button><button onClick={() => setSelection(null)}>Fermer la sélection</button><p role="status">{copied}</p></section>}
          <p role="status">{course.positionMessage}</p>
        </div>
      </div>
      {space === 'flashcards' && course.document && <Suspense fallback={<p role="status">Chargement des brouillons de flashcards…</p>}><ReviewWorkspace document={course.document} onClose={() => setSpace('original')}/></Suspense>}
    </>}
  </section>
}
