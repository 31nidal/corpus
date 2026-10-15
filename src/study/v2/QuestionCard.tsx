import {useRef, useState} from 'react'
import type {StudyQuestion, QuestionContent} from './questionTypes'
import {patchQuestion, regenerateQuestion} from './questionApi'

export function QuestionCard({documentId, setId, question, onChanged, onSource, onRegenerated}: {
  documentId: string; setId: string; question: StudyQuestion; onChanged: (question: StudyQuestion) => void
  onSource: (page: number) => void; onRegenerated: () => void
}) {
  const [editing, setEditing] = useState(false), [content, setContent] = useState<QuestionContent>(question)
  const [reviewed, setReviewed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const guard = useRef(false), requestId = useRef(crypto.randomUUID())
  const retry = useRef<(() => Promise<void>) | null>(null)
  async function act(action: () => Promise<void>) {
    if (guard.current) return
    guard.current = true; setBusy(true); setError(''); retry.current = action
    try {await action(); retry.current = null} catch (problem) {setError((problem as Error).message)}
    finally {guard.current = false; setBusy(false)}
  }
  async function save(status?: StudyQuestion['status']) {
    const {question: changed} = await patchQuestion(documentId, setId, question.id, {
      expectedVersion: question.version, ...(editing ? {content} : {}), ...(status ? {status} : {}), reviewConfirmed: reviewed,
    })
    setEditing(false); setReviewed(false); onChanged(changed)
  }
  return <article className="sv2-question-card" aria-label={`Question : ${question.prompt}`}>
    <p>{question.status === 'draft' ? 'Brouillon' : question.status === 'validated' ? 'Validé après relecture' : 'Rejeté'} · {question.format === 'single' ? 'Réponse unique' : 'Réponses multiples'}</p>
    {question.validation.edited ? <p>Formulation modifiée : contrôle IA précédent invalidé.</p> : <p>Contrôle de cohérence IA effectué ; il ne certifie pas l’exactitude médicale du cours.</p>}
    <fieldset disabled={busy}>
      {editing ? <label>Énoncé<textarea value={content.prompt} onChange={event => setContent(value => ({...value, prompt: event.target.value}))}/></label> : <h3>{question.prompt}</h3>}
      <ol type="A">{content.options.map((option, index) => <li key={index}>
        {editing ? <>
          <label>Proposition {index + 1}<textarea value={option.text} onChange={event => setContent(value => ({...value, options: value.options.map((old, i) => i === index ? {...old, text: event.target.value} : old)}))}/></label>
          <label><input type="checkbox" checked={option.correct} onChange={event => setContent(value => ({...value, options: value.options.map((old, i) => i === index ? {...old, correct: event.target.checked, relation: event.target.checked ? 'supports' : 'contradicts'} : old)}))}/>Bonne réponse</label>
          <label>Explication {index + 1}<textarea value={option.explanation} onChange={event => setContent(value => ({...value, options: value.options.map((old, i) => i === index ? {...old, explanation: event.target.value} : old)}))}/></label>
        </> : <><strong>{option.text}</strong><p>{option.correct ? 'Vrai' : 'Faux'} — {option.explanation}</p></>}
        <details><summary>Source · page {option.page}</summary><blockquote>{option.sourceExcerpt}</blockquote><button type="button" onClick={() => onSource(option.page)}>Voir dans le cours</button></details>
      </li>)}</ol>
      <label className="sv2-question-review"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)}/>J’ai relu les propositions, leurs explications et les sources.</label>
      <div className="sv2-row">
        {editing ? <><button onClick={() => void act(() => save())}>Enregistrer les modifications</button><button onClick={() => {setEditing(false); setContent(question)}}>Annuler les modifications</button></> : <button onClick={() => {setEditing(true); setContent(question); setReviewed(false)}}>Modifier la question</button>}
        <button disabled={!reviewed} onClick={() => void act(() => save('validated'))}>Valider après relecture</button>
        <button onClick={() => void act(() => save('rejected'))}>Rejeter la question</button>
        {!editing && <button onClick={() => void act(async () => {await regenerateQuestion(documentId, setId, question.id, requestId.current, question.version); requestId.current = crypto.randomUUID(); onRegenerated()})}>Régénérer cette question</button>}
      </div>
    </fieldset>
    {error && <div role="alert"><p>{error} Vos modifications restent affichées.</p><button disabled={busy} onClick={() => retry.current && void act(retry.current)}>Réessayer l’action</button></div>}
  </article>
}
