import {useEffect, useRef, useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import type {PdfSelection} from './types'
import type {TrainingAttempt} from './questionTypes'
import {QuestionGenerationForm} from './QuestionGenerationForm'
import {QuestionCard} from './QuestionCard'
import {QuestionTraining} from './QuestionTraining'
import {useQuestionSets} from './useQuestionSets'
import {deleteQuestionSet, startTraining} from './questionApi'
import './questions.css'

export default function QuestionsWorkspace({document, selection, onSource}: {
  document: StudyDocument; selection: PdfSelection | null; onSource: (page: number) => void
}) {
  const data = useQuestionSets(document.id)
  const [creating, setCreating] = useState(false), [attemptId, setAttemptId] = useState<string | null>(null)
  const [mode, setMode] = useState<TrainingAttempt['mode']>('immediate'), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [deleting, setDeleting] = useState(false)
  const guard = useRef(false), requestId = useRef(crypto.randomUUID()), retry = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => {if (selection) {setCreating(true); setAttemptId(null)}}, [selection])
  async function act(action: () => Promise<void>) {
    if (guard.current) return
    guard.current = true; setBusy(true); setError(''); retry.current = action
    try {await action(); retry.current = null} catch (problem) {setError((problem as Error).message)}
    finally {guard.current = false; setBusy(false)}
  }
  const set = data.selected
  if (attemptId) return <QuestionTraining documentId={document.id} attemptId={attemptId} onSource={onSource} onBack={() => {setAttemptId(null); data.reload()}} onFinished={data.reload}/>
  return <section className="sv2-questions" aria-label="QCM et entraînements">
    <div className="sv2-heading"><div><h2>QCM et entraînements</h2><p>Relisez chaque question et ses preuves avant de l’utiliser en entraînement.</p></div><button onClick={() => setCreating(value => !value)}>{creating ? 'Fermer la génération' : 'Nouvelle série QCM'}</button></div>
    <p role="status">{data.loading ? 'Chargement des séries…' : busy ? 'Enregistrement…' : `${data.sets.length} série${data.sets.length > 1 ? 's' : ''}`}</p>
    {(data.error || error) && <div role="alert"><p>{data.error || error}</p><button disabled={busy} onClick={() => retry.current ? void act(retry.current) : data.reload()}>Réessayer</button></div>}
    {creating && <QuestionGenerationForm document={document} selection={selection} onCreated={set => {data.created(set); setCreating(false)}}/>}
    {!data.loading && !data.sets.length && !creating && <p>Aucune série QCM. Générez une série à partir du cours ou d’un passage du PDF.</p>}
    <div className="sv2-questions-layout">
      <nav aria-label="Séries QCM">{data.sets.map(header => <button key={header.id} aria-current={set?.id === header.id ? 'true' : undefined} onClick={() => {data.choose(header.id); setDeleting(false)}}><strong>{header.title}</strong><small>{header.count} question{header.count > 1 ? 's' : ''} · {header.validated} validée{header.validated > 1 ? 's' : ''}</small></button>)}</nav>
      {set && <section aria-label="Série sélectionnée"><h3>{set.title}</h3><p>Sources : version {set.sourceVersion}</p>
        {set.sourceState === 'partial' && <p>L’extraction du cours était partielle : comparez les questions au PDF original.</p>}
        {set.extraction?.warnings?.map((warning, index) => <p key={index}>{warning}</p>)}
        {set.jobs.map(job => ['queued', 'running'].includes(job.state) ? <p role="status" key={job.id}>Génération et vérification en cours…</p> : ['failed', 'interrupted'].includes(job.state) ? <p role="alert" key={job.id}>{job.errorMessage} La demande n’est pas relancée automatiquement.</p> : job.result.generation?.rejected ? <p key={job.id}>{job.result.generation.rejected} propositions de questions refusées lors des contrôles.</p> : null)}
        {set.jobs.filter(job => job.state === 'succeeded' && job.result.coverage).map(job => <details key={job.id}><summary>Couverture de cette génération : {job.targetQuestionId ? job.result.replaced : job.result.created}/{job.result.requested} questions · {job.result.coverage!.sectionsRepresented}/{job.result.coverage!.sectionsTotal} sections représentées</summary><p>La présence des sections ne garantit pas l’exhaustivité du cours.</p>{job.result.coverage!.missingSections.map(section => <p key={section.id}>Section non représentée : {section.title}</p>)}</details>)}
        <fieldset disabled={busy}><label>Correction<select value={mode} onChange={event => {setMode(event.target.value as TrainingAttempt['mode']); requestId.current = crypto.randomUUID()}}><option value="immediate">Immédiate</option><option value="deferred">Différée</option></select></label>
          <button disabled={!set.questions.some(question => question.status === 'validated')} onClick={() => void act(async () => {
            const {attempt} = await startTraining(document.id, set.id, requestId.current, mode)
            requestId.current = crypto.randomUUID(); setAttemptId(attempt.id)
          })}>S’entraîner sur les questions validées</button>
        </fieldset>
        {set.questions.map(question => <QuestionCard key={question.id + '-' + question.version} documentId={document.id} setId={set.id} question={question} onSource={onSource}
          onRegenerated={data.reload} onChanged={changed => {data.setSelected(current => current && current.id === set.id ? {...current, questions: current.questions.map(old => old.id === changed.id ? changed : old)} : current); data.reload()}}/>)}
        <button disabled={busy} onClick={() => setDeleting(true)}>Supprimer cette série</button>
        {deleting && <div role="alert"><p>Supprimer cette série et son historique d’entraînement ? Le cours et les flashcards seront conservés.</p><button disabled={busy} onClick={() => void act(async () => {await deleteQuestionSet(document.id, set.id); data.setSelected(null); data.choose(''); setDeleting(false); data.reload()})}>Confirmer la suppression de la série</button><button disabled={busy} onClick={() => setDeleting(false)}>Annuler</button></div>}
      </section>}
    </div>
    <section aria-label="Historique QCM"><h3>Historique des entraînements</h3>{!data.history.length && <p>Aucun entraînement enregistré.</p>}
      <ul>{data.history.map(attempt => <li key={attempt.id}><button onClick={() => setAttemptId(attempt.id)}>{new Date(attempt.createdAt).toLocaleString('fr-FR')} · {attempt.finishedAt ? `${attempt.score}/${attempt.total}` : `${attempt.answered}/${attempt.total} réponses · Reprendre`}</button></li>)}</ul>
    </section>
  </section>
}
