import React, {useEffect, useRef, useState} from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {ChevronLeft, ChevronRight, Crop, Check, Loader2, AlertCircle} from 'lucide-react'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PdfCropSelectorProps {
  documentId: string
  documentTitle?: string
  initialPage?: number
  onSelectCrop: (data: {
    blob: Blob
    pageNumber: number
    crop: {x: number; y: number; width: number; height: number} | null
  }) => void
  onCancel: () => void
}

export const PdfCropSelector: React.FC<PdfCropSelectorProps> = ({
  documentId,
  documentTitle,
  initialPage = 1,
  onSelectCrop,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)
  const [scale] = useState(1.5)

  // Crop selection in normalized coordinates (0..1)
  const [cropRect, setCropRect] = useState<{x: number; y: number; width: number; height: number} | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{x: number; y: number} | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // 1. Load PDF document
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function loadPdf() {
      try {
        const response = await fetch(`/api/study/documents/${encodeURIComponent(documentId)}/pdf`, {
          credentials: 'same-origin',
        })
        if (!response.ok) {
          throw new Error('Impossible de charger le document PDF source.')
        }
        const data = await response.arrayBuffer()
        if (cancelled) return

        const doc = await pdfjsLib.getDocument({data}).promise
        if (cancelled) return

        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(Math.min(Math.max(1, initialPage), doc.numPages))
        setLoading(false)
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Erreur lors du chargement du PDF.')
          setLoading(false)
        }
      }
    }

    loadPdf()
    return () => {
      cancelled = true
    }
  }, [documentId, initialPage])

  // 2. Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let renderTask: any = null
    let cancelled = false

    async function renderPage() {
      try {
        if (!pdfDoc) return
        const page = await pdfDoc.getPage(currentPage)
        if (cancelled) return

        const viewport = page.getViewport({scale})
        const canvas = canvasRef.current!
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        renderTask = (page as any).render({canvasContext: ctx, viewport, canvas})
        await renderTask.promise
      } catch (err: any) {
        if (!cancelled && err.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err)
        }
      }
    }

    renderPage()
    setCropRect(null)

    return () => {
      cancelled = true
      if (renderTask) {
        renderTask.cancel()
      }
    }
  }, [pdfDoc, currentPage, scale])

  // Mouse drag handlers for crop rectangle
  const getNormalizedPoint = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return {x: 0, y: 0}
    const rect = canvasRef.current.getBoundingClientRect()
    const rawX = (e.clientX - rect.left) / rect.width
    const rawY = (e.clientY - rect.top) / rect.height
    return {
      x: Math.max(0, Math.min(1, rawX)),
      y: Math.max(0, Math.min(1, rawY)),
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const pt = getNormalizedPoint(e)
    setIsDrawing(true)
    setStartPoint(pt)
    setCropRect(null)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return
    const pt = getNormalizedPoint(e)
    const x = Math.min(startPoint.x, pt.x)
    const y = Math.min(startPoint.y, pt.y)
    const width = Math.abs(pt.x - startPoint.x)
    const height = Math.abs(pt.y - startPoint.y)

    if (width > 0.01 && height > 0.01) {
      setCropRect({x, y, width, height})
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setStartPoint(null)
  }

  // Handle final selection
  const handleValidate = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current

    if (!cropRect) {
      // Full page export
      canvas.toBlob(blob => {
        if (blob) {
          onSelectCrop({blob, pageNumber: currentPage, crop: null})
        }
      }, 'image/png')
      return
    }

    // Cropped sub-canvas export
    const cropCanvas = document.createElement('canvas')
    const sx = Math.floor(cropRect.x * canvas.width)
    const sy = Math.floor(cropRect.y * canvas.height)
    const sw = Math.floor(cropRect.width * canvas.width)
    const sh = Math.floor(cropRect.height * canvas.height)

    cropCanvas.width = sw
    cropCanvas.height = sh
    const ctx = cropCanvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
    cropCanvas.toBlob(blob => {
      if (blob) {
        onSelectCrop({
          blob,
          pageNumber: currentPage,
          crop: {
            x: Math.round(cropRect.x * 10000) / 10000,
            y: Math.round(cropRect.y * 10000) / 10000,
            width: Math.round(cropRect.width * 10000) / 10000,
            height: Math.round(cropRect.height * 10000) / 10000,
          },
        })
      }
    }, 'image/png')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm text-slate-100">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Crop className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Sélectionner la zone à masquer (Image Occlusion)
            </h2>
            <p className="text-xs text-slate-400">
              {documentTitle ? `${documentTitle} — ` : ''}Page {currentPage} sur {totalPages}
            </p>
          </div>
        </div>

        {/* Page navigation controls */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded transition text-slate-300"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium px-2 text-slate-200">
            Page {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded transition text-slate-300"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={loading || !!error}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            {cropRect ? 'Valider le recadrage' : 'Utiliser la page entière'}
          </button>
        </div>
      </header>

      {/* Main viewer & crop area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-6 flex items-center justify-center relative select-none"
      >
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm">Chargement de la page...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 max-w-md p-6 bg-red-950/40 border border-red-800/60 rounded-xl text-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={onCancel}
              className="mt-2 px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
            >
              Fermer
            </button>
          </div>
        )}

        {!loading && !error && (
          <div
            className="relative inline-block shadow-2xl rounded border border-slate-700 overflow-hidden cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <canvas ref={canvasRef} className="block max-h-[78vh] w-auto h-auto" />

            {/* Crop Overlay */}
            {cropRect && (
              <div
                className="absolute border-2 border-indigo-400 bg-indigo-500/20 pointer-events-none transition-all"
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
              >
                <span className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow">
                  Zone sélectionnée
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom hint bar */}
      <footer className="px-6 py-2.5 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400 flex items-center justify-between">
        <p>
          Glissez avec la souris pour recadrer un schéma ou diagramme spécifique, ou cliquez directement sur « Utiliser la page entière ».
        </p>
        {cropRect && (
          <button
            type="button"
            onClick={() => setCropRect(null)}
            className="text-indigo-400 hover:text-indigo-300 underline font-medium"
          >
            Réinitialiser la sélection
          </button>
        )}
      </footer>
    </div>
  )
}
