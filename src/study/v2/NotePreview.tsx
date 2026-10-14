import type {RevisionNote, RevisionNoteItem} from './types'

export function NotePreview({note, title, items, id, onSource}: {
  note: RevisionNote; title: string; items: RevisionNoteItem[]; id: string; onSource: (page: number) => void
}) {
  const sections = [...new Set(items.map(item => item.sectionId))]
  return <article id={id} className="sv2-note-preview" aria-label="Aperçu de la fiche">
    <h1>{title}</h1><div className="course-meta"><span>{note.state === 'saved' ? 'Fiche enregistrée' : 'Brouillon à relire'}</span><span>Source : version {note.sourceVersion}</span></div>
    {note.sourceState === 'partial' && <p>Le document était partiellement extrait lors de la création de cette fiche. Des pages peuvent manquer.</p>}
    {note.extraction.warnings.length > 0 && <details><summary>Limites de l’extraction source</summary><ul>{note.extraction.warnings.map((warning,index) => <li key={index}>{warning}</li>)}</ul></details>}
    <p>Support issu du cours. Comparez les points à leurs sources avant de les apprendre.</p>
    {sections.map(sectionId => <section className="course-section" key={sectionId ?? 'legacy-overview'}>
      <h2>{items.find(item => item.sectionId === sectionId)?.sectionTitle || 'Repères du cours'}</h2>
      {items.filter(item => item.sectionId === sectionId).map(item => <div className="sv2-note-point" key={item.id}>
        {item.category && <h3>{item.category}</h3>}<p>{item.text}</p>
        {item.sourceTable && <div className="sv2-note-table"><table><caption>Tableau présent dans le cours</caption><thead><tr>{item.sourceTable[0].map((cell, index) => <th scope="col" key={index}>{cell}</th>)}</tr></thead><tbody>{item.sourceTable.slice(1).map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>}
        {item.edited && <small>Point modifié par vous · sa formulation n’a pas été revalidée automatiquement.</small>}
        <details><summary>Source · {item.exactPage ? `page ${item.page}` : `pages ${item.page}–${item.endPage}`}</summary>
          {item.sourceExcerpt ? <blockquote>{item.sourceExcerpt}</blockquote> : <p>Aucune preuve précise dans cette ancienne synthèse.</p>}
          {item.proofStatus === 'unverified' && <p>Preuve historique non retrouvée automatiquement. Vérifiez l’original.</p>}
          <button onClick={() => onSource(item.page)}>Voir la source · p. {item.page}</button>
        </details>
      </div>)}
    </section>)}
  </article>
}
