import {useId, useRef, useState} from 'react'
import {Upload} from 'lucide-react'
import {importPdf} from './api'
import type {DocumentMeta} from './types'

export function ImportPanel({onImported}: {onImported: (document: DocumentMeta) => void}) {
  const [file, setFile] = useState<File | null>(null)
  const [consentOcr, setConsentOcr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const requestId = useRef('')
  const locked = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()
  async function upload() {
    if (!file || locked.current) return
    locked.current = true
    setBusy(true)
    setMessage('Enregistrement du PDF original…')
    try {
      const result = await importPdf(file, requestId.current, consentOcr)
      setMessage('PDF conservé. Le traitement continue en arrière-plan.')
      onImported(result.document)
      setFile(null)
      if (input.current) input.current.value = ''
    } catch (problem) {setMessage((problem as Error).message || 'Import interrompu. Réessayez avec le même fichier.')}
    finally {locked.current = false; setBusy(false)}
  }
  return <section className="sv2-import" aria-label="Importer un cours">
    <div><Upload size={20}/><h2>Importer un cours</h2><p>PDF original conservé · 25 Mo maximum</p></div>
    <div className="sv2-file"><label htmlFor={inputId}>Fichier PDF</label><input id={inputId} className="sr-only" tabIndex={-1} ref={input} type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event => {
      setFile(event.target.files?.[0] ?? null); requestId.current = crypto.randomUUID(); setMessage('')
    }}/><div className="sv2-row"><button type="button" disabled={busy} onClick={() => input.current?.click()}>Choisir un PDF</button><span>{file?.name || "Aucun fichier sélectionné"}</span></div></div>
    <label className="sv2-checkbox"><input type="checkbox" checked={consentOcr} disabled={busy} onChange={event => setConsentOcr(event.target.checked)}/>
      Autoriser l’OCR Gemini si des pages sont scannées (PDF transmis à Google, quota IA utilisé).</label>
    <button className="sv2-primary" disabled={!file || busy} onClick={upload}>{busy ? 'Enregistrement…' : 'Importer le PDF'}</button>
    <p role="status">{message}</p>
  </section>
}
