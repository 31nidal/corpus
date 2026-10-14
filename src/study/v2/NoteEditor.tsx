import {useState} from 'react'
import DownloadPdfButton from '../DownloadPdfButton'
import {GenerationNotice} from '../ai/GenerationNotice'
import {NotePreview} from './NotePreview'
import {useNoteEditor} from './useNoteEditor'
import type {RevisionNote} from './types'

export function NoteEditor({note, onSaved, onSource}: {
  note: RevisionNote; onSaved: (note: RevisionNote) => void; onSource: (page: number) => void
}) {
  const editor = useNoteEditor(note, onSaved)
  const [mode, setMode] = useState<'edit' | 'preview'>(note.state === 'draft' ? 'edit' : 'preview')
  const {draft, setDraft} = editor
  const previewId = 'note-preview-' + note.id
  const previewItems = draft.items.map(item => {
    const source = note.items.find(source => source.id === item.id)!
    return {...source, ...item, edited: item.text !== source.originalText || item.category !== (source.originalCategory ?? source.category)}
  })
  async function save(state: 'draft' | 'saved') {if (await editor.save(state) && state === 'saved') setMode('preview')}
  return <section className="sv2-note-editor" aria-label="Édition de la fiche">
    <header><h2>{note.title}</h2><p>{note.origin === 'legacy' ? 'Synthèse historique conservée' : note.state === 'saved' ? 'Fiche enregistrée' : 'Brouillon à relire'} · {editor.dirty ? 'Modifications non enregistrées' : 'À jour'}</p></header>
    {note.origin === 'legacy' ? <p>{note.generation.message}</p> : <GenerationNotice generation={note.generation}/>}
    <details className="sv2-note-coverage"><summary>{note.coverage.sectionsRepresented}/{note.coverage.sectionsTotal} sections représentées · contrôles de couverture</summary>
      <p>{note.coverage.message}</p>
      {note.sourceState === 'partial' && <p>La source était partiellement extraite. Le compteur porte uniquement sur les sections disponibles.</p>}
      {note.coverage.missingSections.length > 0 && <p>Sections sans point : {note.coverage.missingSections.map(section => section.title).join(' · ')}.</p>}
      {note.coverage.missingQuantities.length > 0 && <p>Valeurs du cours absentes de la fiche enregistrée (à vérifier) : {note.coverage.missingQuantities.map(item => `${item.value} (${item.sectionTitle})`).join(' · ')}.</p>}
      {editor.dirty && <p>Les contrôles seront recalculés après enregistrement de vos modifications.</p>}
    </details>
    <div className="sv2-row"><button aria-pressed={mode === 'edit'} disabled={editor.busy} onClick={() => setMode('edit')}>Modifier la fiche</button><button aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Aperçu de la fiche</button>
      {mode === 'preview' && <DownloadPdfButton title={draft.title} selector={'#' + CSS.escape(previewId)} label="Exporter la fiche en PDF"/>}
    </div>
    {mode === 'edit' && <div className="sv2-note-fields">
      <label>Titre de la fiche<input maxLength={150} disabled={editor.busy} value={draft.title} onChange={event => setDraft({...draft, title: event.target.value})}/></label>
      {draft.items.map((item, index) => {
        const source = note.items.find(source => source.id === item.id)!
        return <article className="sv2-note-edit-point" key={item.id}>
          <h3>{source.sectionTitle}</h3>
          <label>Point {index + 1}<textarea disabled={editor.busy} maxLength={2000} rows={4} value={item.text} onChange={event => setDraft({...draft, items: draft.items.map(point => point.id === item.id ? {...point, text: event.target.value} : point)})}/></label>
          <label>Rubrique du point {index + 1}<input disabled={editor.busy} maxLength={100} value={item.category} onChange={event => setDraft({...draft, items: draft.items.map(point => point.id === item.id ? {...point, category: event.target.value} : point)})}/></label>
          {source.sourceSupplement && <p>Passage chiffré conservé mot pour mot depuis le cours.</p>}
          <blockquote>{source.sourceExcerpt || 'Ancienne synthèse sans extrait source précis.'}</blockquote>
          {source.proofStatus === 'unverified' && <p>Preuve historique à vérifier dans le PDF.</p>}
          <div className="sv2-row"><button disabled={editor.busy} onClick={() => onSource(source.page)}>Voir la source · p. {source.page}</button><button disabled={editor.busy} onClick={() => setDraft({...draft, items: draft.items.filter(point => point.id !== item.id)})}>Retirer le point {index + 1}</button></div>
        </article>
      })}
      {!draft.items.length && <p>Tous les points ont été retirés. Rechargez la version serveur pour les récupérer.</p>}
    </div>}
    <div className="sv2-row"><button disabled={editor.busy || !draft.title.trim() || !draft.items.length || draft.items.some(item => !item.text.trim())} onClick={() => save('draft')}>Enregistrer le brouillon</button>
      <button className="sv2-primary" disabled={editor.busy || !draft.title.trim() || !draft.items.length || draft.items.some(item => !item.text.trim())} onClick={() => save('saved')}>Enregistrer la fiche relue</button>
      <button disabled={editor.busy} onClick={() => {if (!editor.dirty || window.confirm('Abandonner les modifications locales et recharger la fiche enregistrée ?')) {void editor.reset()}}}>Recharger la version serveur</button></div>
    <p role="status">{editor.message}</p>{editor.error && <p role="alert">{editor.error} <button disabled={editor.busy} onClick={editor.retry}>Réessayer l’enregistrement</button></p>}
    <p>Les modifications locales non enregistrées sont conservées dans cette session quand le navigateur le permet. Pour les retrouver après reconnexion sur un autre appareil, enregistrez la fiche.</p>
    {mode === 'preview' && <NotePreview note={note} title={draft.title} items={previewItems} id={previewId} onSource={onSource}/>}
  </section>
}
