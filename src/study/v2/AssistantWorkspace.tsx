import {useEffect, useRef, useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import type {PdfSelection} from './types'
import {askDocument, createConversation, deleteConversation} from './assistantApi'
import {useAssistant} from './useAssistant'
import {AssistantResponse} from './AssistantResponse'
import './assistant.css'

export default function AssistantWorkspace({document, selection, onSource, onClose}: {
  document: StudyDocument; selection: PdfSelection | null; onSource: (page: number) => void; onClose: () => void
}) {
  const data = useAssistant(document.id)
  const [prompt, setPrompt] = useState(''), [scope, setScope] = useState<'course' | 'chapter' | 'selection'>('course')
  const [sectionId, setSectionId] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [deleting, setDeleting] = useState(false)
  const requestId = useRef(crypto.randomUUID()), newThreadId = useRef(crypto.randomUUID()), guard = useRef(false)
  const pendingThread = useRef<string | null>(null), input = useRef<HTMLTextAreaElement>(null)
  const retry = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => {if (selection) {setScope('selection'); setPrompt('Explique ce passage plus simplement, à partir du cours.'); requestId.current = crypto.randomUUID(); input.current?.focus()}}, [selection])
  async function act(action: () => Promise<void>) {
    if (guard.current) return
    guard.current = true; setBusy(true); setError(''); retry.current = action
    try {await action(); retry.current = null} catch (problem) {setError((problem as Error).message)}
    finally {guard.current = false; setBusy(false)}
  }
  async function send() {
    let threadId = pendingThread.current || data.thread?.id
    if (!threadId) {
      const {thread} = await createConversation(document.id, newThreadId.current)
      pendingThread.current = thread.id; threadId = thread.id; data.created(thread)
    }
    await askDocument(document.id, threadId, {requestId: requestId.current, prompt,
      ...(scope === 'chapter' ? {sectionIds: [sectionId]} : scope === 'selection' && selection ? {selection} : {})})
    requestId.current = crypto.randomUUID(); setPrompt(''); data.reload()
  }
  const processing = data.thread?.messages.some(message => ['queued', 'running'].includes(message.state)) || false
  return <section className="sv2-assistant" aria-label="Assistant documentaire">
    <div className="sv2-heading"><h2>Assistant documentaire</h2><button onClick={onClose}>Fermer l’assistant</button></div>
    <p>Réponses limitées à ce cours. Les citations permettent de vérifier les affirmations ; elles ne certifient pas la validité médicale.</p>
    <div className="sv2-row"><label>Conversation<select value={data.thread?.id || ''} disabled={busy} onChange={event => {data.choose(event.target.value || null); pendingThread.current = null; requestId.current = crypto.randomUUID()}}><option value="">Nouvelle conversation</option>{data.threads.map(thread => <option key={thread.id} value={thread.id}>{thread.title} · {new Date(thread.createdAt).toLocaleDateString('fr-FR')}</option>)}</select></label>
      <button disabled={busy} onClick={() => {data.choose(null); pendingThread.current = null; newThreadId.current = crypto.randomUUID(); requestId.current = crypto.randomUUID(); setDeleting(false)}}>Nouvelle conversation</button>
    </div>
    <p aria-live="polite" role="status">{data.loading ? 'Chargement des conversations…' : busy ? 'Enregistrement de la demande…' : processing ? 'Analyse du cours et vérification en cours…' : data.thread?.messages.length ? 'Conversation à jour.' : 'Posez une question sur le cours.'}</p>
    {(error || data.error) && <div role="alert"><p>{error || data.error}</p><button disabled={busy} onClick={() => retry.current ? void act(retry.current) : data.reload()}>Réessayer</button></div>}
    <div className="sv2-assistant-messages">{data.thread?.messages.map(message => <AssistantResponse key={message.id} message={message} onSource={onSource} onRepeat={value => {setPrompt(value); requestId.current = crypto.randomUUID(); input.current?.focus()}}/>)}</div>
    <form onSubmit={event => {event.preventDefault(); void act(send)}}>
      <fieldset disabled={busy || processing}>
        <label>Sources de la réponse<select value={scope} onChange={event => {setScope(event.target.value as typeof scope); requestId.current = crypto.randomUUID()}}><option value="course">Cours entier</option><option value="chapter">Un chapitre</option>{selection && <option value="selection">Passage sélectionné · page {selection.page}</option>}</select></label>
        {scope === 'chapter' && <label>Chapitre<select value={sectionId} onChange={event => {setSectionId(event.target.value); requestId.current = crypto.randomUUID()}}><option value="">Choisir un chapitre</option>{document.sections?.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>}
        {scope === 'selection' && selection && <details><summary>Passage sélectionné</summary><blockquote>{selection.text}</blockquote></details>}
        <label>Votre question<textarea ref={input} value={prompt} maxLength={2000} onChange={event => {setPrompt(event.target.value); requestId.current = crypto.randomUUID()}} placeholder="Quels sont les points essentiels de ce chapitre ?"/></label>
        <button disabled={prompt.trim().length < 3 || scope === 'chapter' && !sectionId}>Envoyer la question</button>
      </fieldset>
    </form>
    {data.thread && <button disabled={busy} onClick={() => setDeleting(true)}>Supprimer cette conversation</button>}
    {deleting && data.thread && <div role="alert"><p>Supprimer cette conversation et ses réponses ? Le cours et les supports seront conservés.</p><button disabled={busy} onClick={() => void act(async () => {await deleteConversation(document.id, data.thread!.id); data.choose(null); pendingThread.current = null; newThreadId.current = crypto.randomUUID(); setDeleting(false); data.reload()})}>Confirmer la suppression de la conversation</button><button disabled={busy} onClick={() => setDeleting(false)}>Annuler</button></div>}
  </section>
}
