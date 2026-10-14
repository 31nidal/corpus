import {useEffect, useRef, useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import type {PdfSelection} from './types'
import type {QuestionSet, QuestionSettings} from './questionTypes'
import {generateQuestions} from './questionApi'

export function QuestionGenerationForm({document, selection, onCreated}: {
  document: StudyDocument; selection: PdfSelection | null; onCreated: (set: QuestionSet) => void
}) {
  const [settings, setSettings] = useState<QuestionSettings>({count: 5, format: 'single', difficulty: 'standard', kind: 'recall'})
  const [scope, setScope] = useState<'course' | 'chapters' | 'selection'>(selection ? 'selection' : 'course')
  const [sections, setSections] = useState<string[]>([])
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const requestId = useRef(crypto.randomUUID()), inFlight = useRef(false)
  useEffect(() => {if (selection) {setScope('selection'); requestId.current = crypto.randomUUID()}}, [selection])
  function changeSettings(patch: Partial<QuestionSettings>) {setSettings(value => ({...value, ...patch})); requestId.current = crypto.randomUUID()}
  async function generate() {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError('')
    try {
      const {set} = await generateQuestions(document.id, {...settings, requestId: requestId.current,
        ...(scope === 'chapters' ? {sectionIds: sections} : scope === 'selection' && selection ? {selection} : {})})
      requestId.current = crypto.randomUUID(); onCreated(set)
    } catch (problem) {setError((problem as Error).message)}
    finally {inFlight.current = false; setBusy(false)}
  }
  return <form className="sv2-question-form" onSubmit={event => {event.preventDefault(); void generate()}}>
    <h3>Nouvelle série QCM</h3>
    <fieldset disabled={busy}>
      <label>Nombre de questions<input type="number" min={1} max={30} value={settings.count} onChange={event => changeSettings({count: Number(event.target.value)})}/></label>
      <label>Format<select value={settings.format} onChange={event => changeSettings({format: event.target.value as QuestionSettings['format']})}><option value="single">Réponse unique</option><option value="multiple">Réponses multiples</option></select></label>
      <label>Difficulté<select value={settings.difficulty} onChange={event => changeSettings({difficulty: event.target.value as QuestionSettings['difficulty']})}><option value="essential">Essentielle</option><option value="standard">Standard</option><option value="advanced">Avancée</option></select></label>
      <label>Objectif<select value={settings.kind} onChange={event => changeSettings({kind: event.target.value as QuestionSettings['kind']})}><option value="recall">Restitution</option><option value="understanding">Compréhension</option></select></label>
      <label>Contenu<select value={scope} onChange={event => {setScope(event.target.value as typeof scope); requestId.current = crypto.randomUUID()}}><option value="course">Cours entier</option><option value="chapters">Chapitres choisis</option>{selection && <option value="selection">Passage sélectionné · page {selection.page}</option>}</select></label>
      {scope === 'chapters' && <fieldset><legend>Chapitres concernés</legend>{document.sections?.map(section => <label key={section.id}><input type="checkbox" checked={sections.includes(section.id)} onChange={event => {setSections(value => event.target.checked ? [...value, section.id] : value.filter(id => id !== section.id)); requestId.current = crypto.randomUUID()}}/>{section.title}</label>)}</fieldset>}
      {scope === 'selection' && selection && <blockquote>{selection.text}</blockquote>}
      <p>Génération Gemini puis contrôle de cohérence. Les questions restent en brouillon avant votre relecture. Le nombre demandé peut être réduit si les preuves sont insuffisantes.</p>
      <button type="submit" disabled={scope === 'chapters' && !sections.length}>Générer les QCM</button>
    </fieldset>
    <p role="status">{busy ? 'Enregistrement de la demande…' : ''}</p>
    {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => void generate()}>Réessayer</button></div>}
  </form>
}
