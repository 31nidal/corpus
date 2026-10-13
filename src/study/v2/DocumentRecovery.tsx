import {useRef, useState} from 'react'
import {retryDocument} from './api'
import type {DocumentResult} from './types'

export function DocumentRecovery({data, onRetry}: {data: DocumentResult; onRetry: () => void}) {
  const [consentOcr, setConsentOcr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef('')
  if (!['partial', 'needs_attention', 'failed'].includes(data.document.processingState)) return null
  async function retry() {
    if (busy) return
    setBusy(true); setError('')
    if (!requestId.current) requestId.current = crypto.randomUUID()
    try {await retryDocument(data.document.id, requestId.current, consentOcr); requestId.current = ''; onRetry()}
    catch (problem) {setError((problem as Error).message)}
    finally {setBusy(false)}
  }
  return <section className="sv2-recovery" aria-label="Diagnostic et récupération">
    <h2>{data.document.processingState === 'partial' ? 'Des passages sont à vérifier' : 'Le traitement demande une intervention'}</h2>
    <p>{data.job?.errorMessage || data.document.errorMessage || 'Comparez les passages extraits au PDF original. L’OCR peut aider pour des pages manquantes ; il ne corrige pas les formules ni la justesse du cours.'}</p>
    <label className="sv2-checkbox"><input type="checkbox" checked={consentOcr} disabled={busy} onChange={event => {setConsentOcr(event.target.checked); requestId.current = ''}}/> Autoriser l’OCR Gemini pour cette reprise (transmission du PDF à Google, quota IA).</label>
    <button disabled={busy || (data.document.sectionCount > 0 && !consentOcr)} onClick={retry}>{busy ? 'Reprise demandée…' : 'Reprendre le traitement'}</button>
    <p>Le PDF original et les sources déjà utilisées restent conservés. Vous pouvez aussi importer un PDF corrigé comme nouveau document.</p>
    {error && <p role="alert">{error} <button disabled={busy} onClick={retry}>Réessayer</button></p>}
  </section>
}
