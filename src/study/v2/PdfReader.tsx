import {useEffect, useRef, useState} from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type {PdfSelection} from './types'
import './pdfTextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
const MAX_CANVAS_PIXELS = 4_000_000
export function PdfReader({documentId, title, page, onPage, onSelection}: {
  documentId: string; title: string; page: number; onPage: (page: number) => void; onSelection: (selection: PdfSelection | null) => void
}) {
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [width, setWidth] = useState(600)
  const [zoom, setZoom] = useState(1)
  const container = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = container.current
    if (!node) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(100, entries[0].contentRect.width - 24)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let task: pdfjs.PDFDocumentLoadingTask | undefined
    let responseError = ''
    setLoading(true); setError(''); setPdf(null)
    async function load() {
      try {
        const response = await fetch(`/api/study/documents/${encodeURIComponent(documentId)}/pdf`, {credentials: 'same-origin', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)])})
        if (!response.ok) {
          responseError = response.status === 404 ? 'Le PDF original est introuvable ou a été supprimé.' : 'Impossible de charger le PDF original. Vérifiez votre connexion.'
          throw new Error(responseError)
        }
        const data = await response.arrayBuffer()
        if (controller.signal.aborted) return
        task = pdfjs.getDocument({data})
        const document = await task.promise
        if (controller.signal.aborted) return
        setPdf(document)
      } catch {if (!controller.signal.aborted) {setError(responseError || 'Impossible de lire le PDF original. Vérifiez votre connexion et le format du fichier.'); setLoading(false)}}
    }
    void load()
    return () => {controller.abort(); void task?.destroy()}
  }, [documentId, revision])
  const currentPage = pdf ? Math.min(Math.max(1, page), pdf.numPages) : page
  useEffect(() => {
    if (!pdf || !sheet.current) return
    let cancelled = false
    let render: pdfjs.RenderTask | undefined
    let layer: pdfjs.TextLayer | undefined
    const node = sheet.current
    setLoading(true); setError(''); onSelection(null)
    async function draw() {
      try {
        const pdfPage = await pdf!.getPage(currentPage)
        if (cancelled) return
        const base = pdfPage.getViewport({scale: 1})
        if (![base.width, base.height].every(value => Number.isFinite(value) && value > 0 && value <= 14400)) throw new Error('Les dimensions de cette page ne permettent pas son affichage sécurisé.')
        const scale = Math.min(width / base.width * zoom, 2048 / Math.max(base.width, base.height))
        const viewport = pdfPage.getViewport({scale})
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)))
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width * pixelRatio); canvas.height = Math.floor(viewport.height * pixelRatio)
        canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`
        canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${title}, page ${currentPage}`)
        const text = document.createElement('div')
        text.className = 'sv2-text-layer'
        text.style.setProperty('--total-scale-factor', String(viewport.scale * viewport.userUnit))
        text.style.setProperty('--scale-round-x', '1px'); text.style.setProperty('--scale-round-y', '1px')
        node.style.width = `${viewport.width}px`; node.style.height = `${viewport.height}px`
        node.replaceChildren(canvas, text)
        render = pdfPage.render({canvas, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0]})
        await render.promise
        if (cancelled) return
        layer = new pdfjs.TextLayer({textContentSource: await pdfPage.getTextContent(), container: text, viewport})
        await layer.render()
        if (!cancelled) setLoading(false)
      } catch {if (!cancelled) {setError('Cette page ne peut pas être affichée. Vous pouvez télécharger le PDF original.'); setLoading(false)}}
    }
    void draw()
    return () => {cancelled = true; render?.cancel(); layer?.cancel()}
  }, [pdf, currentPage, width, zoom, title, onSelection])
  function selected() {
    const selection = window.getSelection()
    const root = sheet.current
    if (!root || !selection?.rangeCount || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return
    const text = selection.toString().trim().slice(0, 5000)
    onSelection(text ? {text, page: currentPage} : null)
  }
  return <section className="sv2-reader" aria-label="Lecteur du PDF original">
    <div className="sv2-reader-controls">
      <button disabled={!pdf || currentPage <= 1} onClick={() => onPage(currentPage - 1)}>Page précédente</button>
      <label>Page<input aria-label="Page du PDF" type="number" min={1} max={pdf?.numPages || 1} value={currentPage} disabled={!pdf} onChange={event => {const value = Number(event.target.value); if (Number.isSafeInteger(value) && value >= 1 && value <= pdf!.numPages) onPage(value)}}/></label>
      <span>/ {pdf?.numPages || '—'}</span><button disabled={!pdf || currentPage >= pdf.numPages} onClick={() => onPage(currentPage + 1)}>Page suivante</button>
      <label>Zoom<select value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={1}>Largeur adaptée</option><option value={1.25}>125 %</option><option value={1.5}>150 %</option></select></label>
    </div>
    <p role="status">{loading ? 'Chargement de la page…' : error ? '' : `Page ${currentPage} affichée · texte sélectionnable lorsqu’il est présent dans l’original.`}</p>
    {error && <div role="alert"><p>{error}</p><button onClick={() => setRevision(value => value + 1)}>Réessayer</button></div>}
    <div className="sv2-pdf-scroll" ref={container}><div className="sv2-pdf-sheet" ref={sheet} onPointerUp={selected} onKeyUp={selected}/></div>
  </section>
}
