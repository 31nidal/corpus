import type {AssistantMessage} from './assistantApi'
export function AssistantResponse({message, onSource, onRepeat}: {
  message: AssistantMessage; onSource: (page: number) => void; onRepeat: (prompt: string) => void
}) {
  return <article className="sv2-assistant-message" aria-label={`Question : ${message.prompt}`}>
    <h3>{message.prompt}</h3><p>Sources : version {message.sourceVersion} · {message.source.selection ? `passage page ${message.source.selection.page}` : `${message.source.sections.length} section${message.source.sections.length > 1 ? 's' : ''}`}</p>
    {['queued', 'running'].includes(message.state) && <p>Analyse du cours et vérification des citations en cours…</p>}
    {message.source.processingState === 'partial' && <p>L’extraction était partielle. Une information manquante peut exister dans les pages illisibles du PDF.</p>}
    {message.source.extraction?.warnings?.map((warning, index) => <p key={index}>{warning}</p>)}
    {message.generation.coverage?.evidenceLimited && <p>Réponse limitée à une sélection de preuves réparties dans le cours. Elle ne couvre pas toutes les notions.</p>}
    {message.response && <>
      <p>{message.response.message}</p>
      {message.response.paragraphs.map((paragraph, index) => <div key={index}><p>{paragraph.text}</p>
        {paragraph.citations.map((citation, i) => <details key={i}><summary>Source · page {citation.page}{!citation.exactPage && citation.endPage !== citation.page ? `–${citation.endPage}` : ''}</summary>
          <blockquote>{citation.sourceExcerpt}</blockquote><button onClick={() => onSource(citation.page)}>Voir le passage dans le PDF</button>
        </details>)}
      </div>)}
    </>}
    {['failed', 'interrupted'].includes(message.state) && <div role="alert"><p>{message.errorMessage}</p><p>Aucun appel payant supplémentaire n’est lancé automatiquement.</p><button onClick={() => onRepeat(message.prompt)}>Reprendre cette question</button></div>}
  </article>
}
