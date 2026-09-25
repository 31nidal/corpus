import React, {useId, useState, useEffect, useRef, useCallback} from 'react'
import {
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Move
} from 'lucide-react'
import type {MedicalPlate} from './medicalPlates'
import './medicalDiagram.css'

export interface AnnotatedDiagramProps {
  plate: MedicalPlate
  courseId: string
  renderSvg: (props: {
    courseId: string
    arrowId: string
    activeIndex: number
    hoveredIndex: number | null
    onSelectPoint: (index: number) => void
    onHoverPoint: (index: number | null) => void
    isReviewMode: boolean
    isRevealed: boolean
  }) => React.ReactNode
}

export default function AnnotatedDiagram({plate, courseId, renderSvg}: AnnotatedDiagramProps) {
  const uid = useId().replace(/:/g, '')
  const arrowId = `med-arrow-${uid}`

  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)
  const [hiddenLabels, setHiddenLabels] = useState(false)

  // Exercice de repérage (Quiz mode)
  const [isQuiz, setIsQuiz] = useState(false)
  const [quizTarget, setQuizTarget] = useState(0)
  const [quizResult, setQuizResult] = useState<boolean | null>(null)
  const [quizSelection, setQuizSelection] = useState<number | null>(null)

  // Mode Révision (Flashcard mode)
  const [isReview, setIsReview] = useState(false)
  const [reviewRevealed, setReviewRevealed] = useState(false)

  // Zoom & Pan state
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({x: 0, y: 0})
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({x: 0, y: 0})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null)
  const [initialPinchScale, setInitialPinchScale] = useState(1)

  const scrollRef = useRef<HTMLDivElement>(null)
  const modalScrollRef = useRef<HTMLDivElement>(null)
  const hotspotRefs = useRef<(HTMLButtonElement | null)[]>([])

  const points = plate.points

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

  const handleZoomIn = useCallback(() => {
    setScale(prev => clamp(Number((prev + 0.25).toFixed(2)), 0.75, 3.5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = clamp(Number((prev - 0.25).toFixed(2)), 0.75, 3.5)
      if (next <= 1) setPosition({x: 0, y: 0})
      return next
    })
  }, [])

  const handleResetZoom = useCallback(() => {
    setScale(1)
    setPosition({x: 0, y: 0})
  }, [])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
    setScale(1)
    setPosition({x: 0, y: 0})
  }, [])

  // Keyboard navigation for Fullscreen & Zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
        setScale(1)
        setPosition({x: 0, y: 0})
      }
      if (isFullscreen) {
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
  }, [isFullscreen, handleZoomIn, handleZoomOut, handleResetZoom])

  // Prevent background scroll when modal open
  useEffect(() => {
    if (isFullscreen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [isFullscreen])

  // Pan via mouse drag when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 || e.button !== 0) return
    setIsDragging(true)
    setDragStart({x: e.clientX - position.x, y: e.clientY - position.y})
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    const maxPanX = (560 * (scale - 1)) / 2 + 100
    const maxPanY = ((560 * (scale - 1)) / 2) * 0.7 + 100
    const nextX = clamp(e.clientX - dragStart.x, -maxPanX, maxPanX)
    const nextY = clamp(e.clientY - dragStart.y, -maxPanY, maxPanY)
    setPosition({x: nextX, y: nextY})
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch pinch and pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setInitialPinchDist(dist)
      setInitialPinchScale(scale)
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true)
      setDragStart({x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y})
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const ratio = dist / initialPinchDist
      setScale(clamp(Number((initialPinchScale * ratio).toFixed(2)), 0.75, 3.5))
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const maxPanX = (560 * (scale - 1)) / 2 + 120
      const maxPanY = ((560 * (scale - 1)) / 2) * 0.7 + 120
      const nextX = clamp(e.touches[0].clientX - dragStart.x, -maxPanX, maxPanX)
      const nextY = clamp(e.touches[0].clientY - dragStart.y, -maxPanY, maxPanY)
      setPosition({x: nextX, y: nextY})
    }
  }

  const handleTouchEnd = () => {
    setInitialPinchDist(null)
    setIsDragging(false)
  }

  // Select a point / structure
  const handleSelectPoint = useCallback(
    (index: number) => {
      setActive(index)
      if (isQuiz) {
        setQuizSelection(index)
        const correct = index === quizTarget
        setQuizResult(correct)
      } else if (isReview) {
        setReviewRevealed(false)
      }

      // Auto-scroll on mobile to bring the point in view
      const targetEl = hotspotRefs.current[index]
      const container = isFullscreen ? modalScrollRef.current : scrollRef.current
      if (targetEl && container) {
        const containerRect = container.getBoundingClientRect()
        const targetRect = targetEl.getBoundingClientRect()
        const scrollLeft =
          container.scrollLeft + (targetRect.left - containerRect.left) - containerRect.width / 2
        container.scrollTo({left: Math.max(0, scrollLeft), behavior: 'smooth'})
      }
    },
    [isQuiz, quizTarget, isReview, isFullscreen]
  )

  // Quiz next target
  const handleNextQuizTarget = () => {
    setQuizResult(null)
    setQuizSelection(null)
    setQuizTarget(prev => (prev + 1) % points.length)
  }

  // Toggle quiz mode
  const handleToggleQuiz = () => {
    if (isReview) setIsReview(false)
    setIsQuiz(prev => {
      const next = !prev
      if (next) {
        setQuizTarget(0)
        setQuizResult(null)
        setQuizSelection(null)
      }
      return next
    })
  }

  // Toggle review mode
  const handleToggleReview = () => {
    if (isQuiz) setIsQuiz(false)
    setIsReview(prev => {
      const next = !prev
      if (next) {
        setReviewRevealed(false)
      }
      return next
    })
  }

  // Review navigation
  const handlePrevReview = () => {
    setReviewRevealed(false)
    setActive(prev => (prev > 0 ? prev - 1 : points.length - 1))
  }

  const handleNextReview = () => {
    setReviewRevealed(false)
    setActive(prev => (prev + 1) % points.length)
  }

  const zoomPercent = Math.round(scale * 100)

  // Render Controls Bar
  const renderControlsBar = () => (
    <div className="diagram-view-controls">
      <div className="diagram-zoom-group" role="group" aria-label="Contrôles de zoom">
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

  // Render Drawing Content (SVG + Hotspots)
  const renderDrawing = (isModal = false) => (
    <div
      ref={isModal ? modalScrollRef : scrollRef}
      className="medical-scroll"
      style={{touchAction: scale > 1 ? 'none' : 'pan-x pan-y'}}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`medical-drawing ${scale > 1 ? 'is-zoomed' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
      >
        <svg
          viewBox="0 0 640 410"
          role="img"
          aria-label={plate.title}
          className="medical-svg-root"
        >
          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" />
            </marker>
          </defs>

          {renderSvg({
            courseId,
            arrowId,
            activeIndex: active,
            hoveredIndex: hovered,
            onSelectPoint: handleSelectPoint,
            onHoverPoint: setHovered,
            isReviewMode: isReview,
            isRevealed: reviewRevealed
          })}
        </svg>

        {/* Hotspots */}
        {points.map((p, i) => {
          const isHotspotPressed = isQuiz ? quizSelection === i : active === i
          const isPointHovered = hovered === i
          const label = isQuiz
            ? `Repère ${i + 1}`
            : isReview && !reviewRevealed
            ? `Repère ${i + 1} (masqué)`
            : p.name

          return (
            <button
              key={p.name + i}
              ref={el => {
                if (!isModal) hotspotRefs.current[i] = el
              }}
              type="button"
              aria-label={label}
              aria-pressed={isHotspotPressed}
              className={`medical-hotspot ${isHotspotPressed ? 'is-selected' : ''} ${isPointHovered ? 'is-hovered' : ''}`}
              style={{left: `${(p.x / 640) * 100}%`, top: `${(p.y / 410) * 100}%`}}
              onClick={() => handleSelectPoint(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )

  // Render Legend + Details
  const renderFooterContent = () => (
    <div className="medical-viewer-footer">
      {!hiddenLabels && (
        <div className="medical-legend" role="group" aria-label="Légende des repères anatomiques">
          {points.map((p, i) => {
            const isSelected = active === i
            const isPointHovered = hovered === i
            const displayName = isReview && !reviewRevealed ? `Repère ${i + 1} : ???` : `${i + 1}. ${p.name}`

            return (
              <button
                key={p.name + i}
                type="button"
                data-legend-index={i}
                aria-pressed={isSelected}
                className={`medical-legend-btn ${isSelected ? 'is-active' : ''} ${isPointHovered ? 'is-hovered' : ''}`}
                onClick={() => handleSelectPoint(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {displayName}
              </button>
            )
          })}
        </div>
      )}

      <div className="medical-detail" role="region" aria-live="polite">
        {isQuiz ? (
          quizResult === null ? (
            <p>Cliquez sur le numéro qui correspond au repère demandé ci-dessus.</p>
          ) : quizResult ? (
            <div className="medical-quiz-feedback is-success">
              <p>
                <strong>Bien repéré !</strong> {points[quizTarget].name} : {points[quizTarget].detail}
              </p>
              <button type="button" onClick={handleNextQuizTarget}>
                Repère suivant
              </button>
            </div>
          ) : (
            <p className="medical-quiz-feedback is-error">
              Ce repère ({points[active].name}) ne correspond pas à la structure demandée (
              <strong>{points[quizTarget].name}</strong>). Réessayez !
            </p>
          )
        ) : isReview && !reviewRevealed ? (
          <div className="medical-review-masked-card">
            <p>
              Structure <strong>#{active + 1}</strong> masquée pour la révision.
            </p>
            <p className="medical-review-hint">
              Essayez de vous rappeler son nom exact, sa fonction anatomique et ses rapports avant de cliquer sur <em>Révéler la réponse</em>.
            </p>
          </div>
        ) : (
          <div className="medical-point-card">
            <div className="medical-point-title">
              <h3>
                <span className="medical-point-num">#{active + 1}</span>
                {points[active].name}
              </h3>
              {points[active].category && (
                <span className="medical-point-category">{points[active].category}</span>
              )}
            </div>
            <p>{points[active].detail}</p>
            {points[active].clinicalNote && (
              <div className="medical-clinical-note">
                <strong>💡 Rôle clinique :</strong> {points[active].clinicalNote}
              </div>
            )}
          </div>
        )}
      </div>

      {plate.attribution && (
        <div className="medical-attribution" role="contentinfo" aria-label="Attribution et crédits de l'illustration">
          <p>
            Illustration adaptée de <strong>{plate.attribution.author}</strong> ({plate.attribution.title}) —{' '}
            <a href={plate.attribution.licenseUrl} target="_blank" rel="noopener noreferrer">
              {plate.attribution.license}
            </a>
            . Modifications et annotations : {plate.attribution.modifications}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <figure className="medical-plate" aria-label={plate.title}>
      {/* Plate Header */}
      <div className="medical-header">
        {plate.category && <span className="medical-category-tag">{plate.category}</span>}
        <h2>{plate.title}</h2>
      </div>

      <figcaption>
        <p>{plate.caption}</p>
      </figcaption>

      {/* Main Toolbar */}
      <div className="medical-toolbar">
        <div className="medical-toolbar-actions">
          {/* Mode Révision */}
          <button
            type="button"
            className="medical-action-btn"
            aria-pressed={isReview}
            onClick={handleToggleReview}
          >
            <BookOpen size={14} style={{marginRight: 6, verticalAlign: -2}} />
            {isReview ? 'Quitter le mode révision' : 'Mode révision'}
          </button>

          {/* Exercice de repérage */}
          <button
            type="button"
            className="medical-action-btn"
            aria-pressed={isQuiz}
            onClick={handleToggleQuiz}
          >
            <HelpCircle size={14} style={{marginRight: 6, verticalAlign: -2}} />
            {isQuiz ? 'Arrêter l’exercice' : 'Exercice de repérage'}
          </button>

          {/* Masquer les légendes */}
          {!isReview && (
            <button
              type="button"
              className="medical-action-btn"
              aria-pressed={hiddenLabels}
              onClick={() => setHiddenLabels(v => !v)}
            >
              {hiddenLabels ? (
                <>
                  <Eye size={14} style={{marginRight: 6, verticalAlign: -2}} />
                  Afficher les légendes
                </>
              ) : (
                <>
                  <EyeOff size={14} style={{marginRight: 6, verticalAlign: -2}} />
                  Masquer les légendes
                </>
              )}
            </button>
          )}
        </div>

        {renderControlsBar()}
      </div>

      {/* Quiz Prompt */}
      {isQuiz && (
        <div className="medical-target" role="status">
          Repérez : <strong>{points[quizTarget].name}</strong>
        </div>
      )}

      {/* Mode Révision Banner */}
      {isReview && (
        <div className="medical-review-banner" role="region" aria-label="Mode révision actif">
          <div className="medical-review-header">
            <span className="medical-review-badge">
              Structure {active + 1} sur {points.length}
            </span>
            <span className="medical-review-instruction">
              Identifiez la structure pointée par le repère <strong>#{active + 1}</strong>, puis vérifiez votre réponse.
            </span>
          </div>

          <div className="medical-review-actions">
            {!reviewRevealed ? (
              <button
                type="button"
                className="medical-reveal-btn"
                onClick={() => setReviewRevealed(true)}
              >
                <Eye size={15} style={{marginRight: 6, verticalAlign: -2}} />
                Révéler la réponse
              </button>
            ) : (
              <div className="medical-review-revealed-indicator">
                <CheckCircle2 size={16} color="var(--med-green)" style={{marginRight: 6, verticalAlign: -3}} />
                Réponse révélée : <strong>{points[active].name}</strong>
              </div>
            )}

            <div className="medical-review-nav">
              <button
                type="button"
                className="medical-review-nav-btn"
                onClick={handlePrevReview}
                aria-label="Structure précédente"
              >
                <ChevronLeft size={16} />
                Précédent
              </button>
              <button
                type="button"
                className="medical-review-nav-btn"
                onClick={handleNextReview}
                aria-label="Structure suivante"
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Drawing */}
      {renderDrawing(false)}

      <div className="medical-scroll-bar-hint">
        <span className="medical-scroll-hint">
          {scale > 1
            ? 'Glissez avec la souris ou au doigt pour explorer le schéma zoomé'
            : 'Faites défiler horizontalement pour afficher l’ensemble du dessin'}
        </span>
      </div>

      {/* Footer Content (Legend + Detail) */}
      {renderFooterContent()}

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="diagram-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Vue plein écran : ${plate.title}`}
        >
          <div className="diagram-modal-backdrop" onClick={toggleFullscreen} />
          <div className="diagram-modal-card">
            <header className="diagram-modal-header">
              <div>
                <span className="medical-category-tag">MODE PLEIN ÉCRAN</span>
                <h2>{plate.title}</h2>
                <p>{plate.caption}</p>
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
              {renderControlsBar()}
            </div>

            <div className="diagram-modal-body">
              {renderDrawing(true)}
            </div>

            <footer className="diagram-modal-footer">
              {renderFooterContent()}
            </footer>
          </div>
        </div>
      )}
    </figure>
  )
}
