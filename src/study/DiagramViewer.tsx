import {type ReactNode, useEffect, useRef, useState, useCallback} from 'react'
import {Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, X, Move} from 'lucide-react'

export interface DiagramViewerProps {
  title: string
  caption?: string
  children: ReactNode
  legend?: ReactNode
  details?: ReactNode
  toolbarExtra?: ReactNode
  aspectRatio?: string
  minContentWidth?: number
  className?: string
  onFullscreenChange?: (isFullscreen: boolean) => void
}

export default function DiagramViewer({
  title,
  caption,
  children,
  legend,
  details,
  toolbarExtra,
  aspectRatio = '640/410',
  minContentWidth = 560,
  className = '',
  onFullscreenChange,
}: DiagramViewerProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({x: 0, y: 0})
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dragStart, setDragStart] = useState({x: 0, y: 0})
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null)
  const [initialPinchScale, setInitialPinchScale] = useState(1)

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

  const handleZoomIn = useCallback(() => {
    setScale(prev => clamp(prev + 0.25, 0.75, 3.5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = clamp(prev - 0.25, 0.75, 3.5)
      if (next <= 1) setPosition({x: 0, y: 0})
      return next
    })
  }, [])

  const handleResetZoom = useCallback(() => {
    setScale(1)
    setPosition({x: 0, y: 0})
  }, [])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const next = !prev
      onFullscreenChange?.(next)
      return next
    })
    setScale(1)
    setPosition({x: 0, y: 0})
  }, [onFullscreenChange])

  // Keyboard navigation and ESC to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
        onFullscreenChange?.(false)
        setScale(1)
        setPosition({x: 0, y: 0})
      }
      if (isFullscreen || containerRef.current?.contains(document.activeElement)) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault()
          handleZoomIn()
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault()
          handleZoomOut()
        } else if (e.key === '0') {
          e.preventDefault()
          handleResetZoom()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, handleZoomIn, handleZoomOut, handleResetZoom, onFullscreenChange])

  // Lock body scroll when fullscreen modal is open
  useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isFullscreen])

  // Mouse drag to pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 || e.button !== 0) return
    setIsDragging(true)
    setDragStart({x: e.clientX - position.x, y: e.clientY - position.y})
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    const maxPanX = (minContentWidth * (scale - 1)) / 2 + 100
    const maxPanY = ((minContentWidth * (scale - 1)) / 2) * 0.7 + 100
    const nextX = clamp(e.clientX - dragStart.x, -maxPanX, maxPanX)
    const nextY = clamp(e.clientY - dragStart.y, -maxPanY, maxPanY)
    setPosition({x: nextX, y: nextY})
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch pinch-to-zoom and pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      setInitialPinchDistance(dist)
      setInitialPinchScale(scale)
    } else if (e.touches.length === 1 && scale > 1) {
      const t = e.touches[0]
      setIsDragging(true)
      setDragStart({x: t.clientX - position.x, y: t.clientY - position.y})
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const ratio = dist / initialPinchDistance
      const nextScale = clamp(initialPinchScale * ratio, 0.75, 3.5)
      setScale(nextScale)
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const t = e.touches[0]
      const maxPanX = (minContentWidth * (scale - 1)) / 2 + 120
      const maxPanY = ((minContentWidth * (scale - 1)) / 2) * 0.7 + 120
      const nextX = clamp(t.clientX - dragStart.x, -maxPanX, maxPanX)
      const nextY = clamp(t.clientY - dragStart.y, -maxPanY, maxPanY)
      setPosition({x: nextX, y: nextY})
    }
  }

  const handleTouchEnd = () => {
    setInitialPinchDistance(null)
    setIsDragging(false)
  }

  const zoomPercent = Math.round(scale * 100)

  const controlsBar = (
    <div className="diagram-view-controls" role="toolbar" aria-label="Contrôles d'affichage et de zoom">
      <div className="diagram-zoom-group">
        <button
          type="button"
          className="diagram-zoom-btn"
          onClick={handleZoomOut}
          disabled={scale <= 0.75}
          title="Zoom arrière (raccourci : -)"
          aria-label="Zoom arrière"
        >
          <ZoomOut size={15} />
        </button>
        <span className="diagram-zoom-level" title="Niveau de zoom actuel">
          {zoomPercent}%
        </span>
        <button
          type="button"
          className="diagram-zoom-btn"
          onClick={handleZoomIn}
          disabled={scale >= 3.5}
          title="Zoom avant (raccourci : +)"
          aria-label="Zoom avant"
        >
          <ZoomIn size={15} />
        </button>
        {scale !== 1 && (
          <button
            type="button"
            className="diagram-zoom-btn diagram-zoom-reset"
            onClick={handleResetZoom}
            title="Réinitialiser le zoom (raccourci : 0)"
            aria-label="Réinitialiser le zoom"
          >
            <RotateCcw size={13} />
            <span>100%</span>
          </button>
        )}
      </div>

      <div className="diagram-actions-group">
        {scale > 1 && (
          <span className="diagram-pan-hint">
            <Move size={12} /> Glisser pour déplacer
          </span>
        )}
        <button
          type="button"
          className="diagram-fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Agrandir en plein écran'}
          aria-label={isFullscreen ? 'Quitter le plein écran' : 'Agrandir en plein écran'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          <span>{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
        </button>
      </div>
    </div>
  )

  const canvasContent = (
    <div
      ref={containerRef}
      className={`diagram-viewport-container ${scale > 1 ? 'is-zoomed' : ''} ${isDragging ? 'is-dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{touchAction: scale > 1 ? 'none' : 'pan-y'}}
    >
      <div
        ref={contentRef}
        className="diagram-transform-layer"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          aspectRatio,
        }}
      >
        {children}
      </div>
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="diagram-modal-overlay" role="dialog" aria-modal="true" aria-label={`Vue plein écran : ${title}`}>
        <div className="diagram-modal-backdrop" onClick={toggleFullscreen} />
        <div className="diagram-modal-card">
          <header className="diagram-modal-header">
            <div>
              <span className="study-eyebrow">MODE PLEIN ÉCRAN</span>
              <h2>{title}</h2>
              {caption && <p>{caption}</p>}
            </div>
            <button
              type="button"
              className="diagram-modal-close"
              onClick={toggleFullscreen}
              aria-label="Fermer le plein écran (Échap)"
              title="Fermer (Échap)"
            >
              <X size={20} />
            </button>
          </header>

          <div className="diagram-modal-toolbar">
            {toolbarExtra}
            {controlsBar}
          </div>

          <div className="diagram-modal-body">
            {canvasContent}
          </div>

          {(legend || details) && (
            <footer className="diagram-modal-footer">
              {legend}
              {details}
            </footer>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`diagram-viewer-root ${className}`}>
      <div className="diagram-top-bar">
        {toolbarExtra}
        {controlsBar}
      </div>
      {canvasContent}
      {legend}
      {details}
    </div>
  )
}
