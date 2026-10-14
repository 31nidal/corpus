import {useEffect, useRef, useState} from 'react'
import type {TrainingAttempt, TrainingQuestion} from './questionTypes'
import {answerTraining, finishTraining, getTraining} from './questionApi'

function TrainingItem({question, busy, onAnswer, onSource}: {
  question: TrainingQuestion; busy: boolean; onAnswer: (selected: number[]) => void; onSource: (page: number) => void
}) {
  const [selected, setSelected] = useState<number[]>(question.answer || [])
  return <article className="sv2-question-card">
    <fieldset disabled={busy || question.answer !== null}>
      <legend>{question.prompt}</legend>
      {question.options.map((option, index) => <label className="sv2-training-option" key={index}>
        <input type={question.format === 'single' ? 'radio' : 'checkbox'} name={'answer-' + question.id}
          checked={selected.includes(index)} onChange={event => setSelected(value => question.format === 'single' ? [index] : event.target.checked ? [...value, index] : value.filter(i => i !== index))}/>
        {option.text}
      </label>)}
      {question.answer === null && <button disabled={!selected.length} onClick={() => onAnswer(selected)}>Enregistrer la réponse</button>}
    </fieldset>
    {question.answer !== null && <p>Réponse enregistrée.</p>}
    {question.isCorrect !== undefined && <div><p>{question.isCorrect ? 'Réponse correcte.' : 'Réponse incorrecte ou incomplète.'}</p>
      <ul>{question.options.map((option, index) => <li key={index}><strong>{option.correct ? 'Vrai' : 'Faux'} — {option.text}</strong><p>{option.explanation}</p>
        {option.sourceExcerpt && <details><summary>Preuve · page {option.page}</summary><blockquote>{option.sourceExcerpt}</blockquote><button onClick={() => onSource(option.page || 1)}>Voir dans le cours</button></details>}
      </li>)}</ul>
    </div>}
  </article>
}

export function QuestionTraining({documentId, attemptId, onBack, onFinished, onSource}: {
  documentId: string; attemptId: string; onBack: () => void; onFinished: () => void; onSource: (page: number) => void
}) {
  const [attempt, setAttempt] = useState<TrainingAttempt | null>(null)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retryLoad, setRetryLoad] = useState(0)
  const guard = useRef(false), mounted = useRef(true), retry = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    getTraining(documentId, attemptId, controller.signal).then(({attempt}) => {if (!controller.signal.aborted) {setAttempt(attempt); setError('')}}).catch(problem => {if (!controller.signal.aborted) setError(problem.message)})
    return () => {mounted.current = false; controller.abort()}
  }, [documentId, attemptId, retryLoad])
  async function act(action: () => Promise<void>) {
    if (guard.current) return
    guard.current = true; setBusy(true); setError(''); retry.current = action
    try {await action(); retry.current = null} catch (problem) {if (mounted.current) setError((problem as Error).message)}
    finally {guard.current = false; if (mounted.current) setBusy(false)}
  }
  return <section aria-label="Entraînement QCM">
    <button onClick={onBack} disabled={busy}>Retour aux séries et à l’historique</button>
    <h3>Entraînement QCM</h3>
    <p role="status">{busy ? 'Enregistrement…' : !attempt && !error ? 'Chargement de l’entraînement…' : attempt ? `${attempt.answered}/${attempt.total} réponses enregistrées` : ''}</p>
    {error && <div role="alert"><p>{error}</p><button disabled={busy} onClick={() => retry.current ? void act(retry.current) : setRetryLoad(value => value + 1)}>Réessayer</button></div>}
    {attempt && <>
      <p>Correction {attempt.mode === 'immediate' ? 'immédiate après chaque réponse' : 'différée à la fin de l’entraînement'}.</p>
      {attempt.finishedAt && <p>Score : {attempt.score}/{attempt.total}. Une réponse multiple n’est correcte que si toutes les bonnes propositions sont sélectionnées.</p>}
      {attempt.questions.map(question => <TrainingItem key={question.id + '-' + Boolean(question.answer)} question={question} busy={busy} onSource={onSource}
        onAnswer={selected => void act(async () => {const {attempt: updated} = await answerTraining(documentId, attemptId, question.id, selected); if (mounted.current) setAttempt(updated)})}/>)}
      {!attempt.finishedAt && <button disabled={busy} onClick={() => void act(async () => {
        const {attempt: finished} = await finishTraining(documentId, attemptId)
        if (mounted.current) {setAttempt(finished); onFinished()}
      })}>{attempt.answered < attempt.total ? 'Terminer avec les réponses manquantes' : 'Terminer et afficher la correction'}</button>}
    </>}
  </section>
}
