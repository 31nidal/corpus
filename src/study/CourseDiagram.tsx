import {useEffect, useId, useState, useCallback} from 'react'
import {ArrowRight, MousePointer2, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, X, Move} from 'lucide-react'
import {diagrams} from './diagrams'
import MedicalDiagram, {medicalPlates} from './MedicalDiagram'
import './diagrams.css'

export default function CourseDiagram({courseId}: {courseId: string}) {
  return medicalPlates[courseId] ? (
    <MedicalDiagram key={courseId} courseId={courseId} />
  ) : (
    <GenericDiagram key={courseId} courseId={courseId} />
  )
}

function getNodeDisplayLabel(label: string, isRoot: boolean, compact: boolean): string {
  const clean = label.replace(/^Carte des notions ·\s*/i, '').trim()
  if (isRoot) {
    const maxLen = compact ? 38 : 54
    if (clean.length > maxLen) {
      const sub = clean.slice(0, maxLen)
      const lastSpace = sub.lastIndexOf(' ')
      return (lastSpace > 18 ? sub.slice(0, lastSpace) : sub) + '…'
    }
    return clean
  }
  const maxLen = compact ? 28 : 42
  if (clean.length > maxLen) {
    const sub = clean.slice(0, maxLen)
    const lastSpace = sub.lastIndexOf(' ')
    return (lastSpace > 14 ? sub.slice(0, lastSpace) : sub) + '…'
  }
  return clean
}

function GenericDiagram({courseId}: {courseId: string}) {
  const graph = diagrams[courseId]
  const uid = useId().replace(/:/g, '')
  const [active, setActive] = useState(0)
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width:700px)').matches : false
  )

  // Zoom & Pan state
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({x: 0, y: 0})
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({x: 0, y: 0})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null)
  const [initialPinchScale, setInitialPinchScale] = useState(1)

  useEffect(() => {
    setActive(0)
    setScale(1)
    setPosition({x: 0, y: 0})
  }, [courseId])

  useEffect(() => {
    const media = window.matchMedia('(max-width:700px)')
    const update = () => setCompact(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

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

  // Keyboard navigation for fullscreen & zoom
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

  // Body scroll locking
  useEffect(() => {
    if (isFullscreen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [isFullscreen])

  // Mouse pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 || e.button !== 0) return
    setIsDragging(true)
    setDragStart({x: e.clientX - position.x, y: e.clientY - position.y})
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    const maxPanX = (360 * (scale - 1)) / 2 + 100
    const maxPanY = (360 * (scale - 1)) / 2 + 100
    const nextX = clamp(e.clientX - dragStart.x, -maxPanX, maxPanX)
    const nextY = clamp(e.clientY - dragStart.y, -maxPanY, maxPanY)
    setPosition({x: nextX, y: nextY})
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch pinch & pan
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
      const maxPanX = (360 * (scale - 1)) / 2 + 120
      const maxPanY = (360 * (scale - 1)) / 2 + 120
      const nextX = clamp(e.touches[0].clientX - dragStart.x, -maxPanX, maxPanX)
      const nextY = clamp(e.touches[0].clientY - dragStart.y, -maxPanY, maxPanY)
      setPosition({x: nextX, y: nextY})
    }
  }

  const handleTouchEnd = () => {
    setInitialPinchDist(null)
    setIsDragging(false)
  }

  if (!graph) return null

  const width = compact ? 360 : 740
  const n = graph.nodes.length

  // Dimensions par nœud
  const getNodeDim = (i: number) => {
    const isRoot = graph.kind === 'branch' && i === 0
    if (compact) {
      if (graph.kind === 'branch') {
        return isRoot
          ? {w: 280, h: 58, isRoot: true}
          : {w: 150, h: 56, isRoot: false}
      }
      if (graph.kind === 'flow') {
        return {w: 260, h: 52, isRoot: i === 0}
      }
      if (graph.kind === 'compare') {
        return n <= 2 ? {w: 154, h: 60, isRoot: false} : {w: 270, h: 52, isRoot: false}
      }
      // cycle
      return {w: 126, h: 50, isRoot: false}
    } else {
      // Desktop
      if (graph.kind === 'branch') {
        const branchW = Math.min(170, Math.max(124, (740 - 50) / Math.max(1, n - 1) - 14))
        return isRoot
          ? {w: 270, h: 64, isRoot: true}
          : {w: branchW, h: 60, isRoot: false}
      }
      if (graph.kind === 'flow') {
        return {w: 180, h: 62, isRoot: i === 0}
      }
      if (graph.kind === 'cycle') {
        return {w: 154, h: 56, isRoot: false}
      }
      // compare
      const cols = Math.min(4, n)
      return {w: Math.min(180, (740 - 40) / cols - 16), h: 62, isRoot: false}
    }
  }

  const ranks = Array<number>(n).fill(Infinity)
  ranks[0] = 0
  if (graph.links)
    for (let pass = 0; pass < n; pass++)
      for (const edge of graph.links)
        ranks[edge.to] = Math.min(ranks[edge.to], ranks[edge.from] + 1)

  const positions = graph.nodes.map((_, i) => {
    // 1. Cycle
    if (graph.kind === 'cycle') {
      if (!compact) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
        return {x: 370 + 245 * Math.cos(angle), y: 185 + 130 * Math.sin(angle)}
      } else {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
        return {x: 180 + 115 * Math.cos(angle), y: 160 + 105 * Math.sin(angle)}
      }
    }

    // 2. Branch (Cartes de notions)
    if (graph.kind === 'branch') {
      if (i === 0) {
        // Nœud central / racine en haut
        return {x: width / 2, y: 44}
      }
      const childIndex = i - 1
      const totalChildren = n - 1
      if (!compact) {
        if (totalChildren <= 4) {
          const step = (740 - 60) / totalChildren
          const x = 30 + step * (childIndex + 0.5)
          return {x, y: 155}
        } else {
          const row1Count = Math.ceil(totalChildren / 2)
          const row2Count = totalChildren - row1Count
          if (childIndex < row1Count) {
            const step = (740 - 60) / row1Count
            return {x: 30 + step * (childIndex + 0.5), y: 145}
          } else {
            const r2Idx = childIndex - row1Count
            const step = (740 - 60) / row2Count
            return {x: 30 + step * (r2Idx + 0.5), y: 235}
          }
        }
      } else {
        // Mobile : 2 colonnes équilibrées
        const row = Math.floor(childIndex / 2)
        const col = childIndex % 2
        const x = col === 0 ? 94 : 266
        const y = 138 + row * 76
        return {x, y}
      }
    }

    // 3. Flow (Étapes séquentielles)
    if (graph.kind === 'flow') {
      if (!compact) {
        const columns = 3
        const row = Math.floor(i / columns)
        const col = row % 2 === 0 ? i % columns : columns - 1 - (i % columns)
        return {x: (740 / columns) * (col + 0.5), y: 45 + row * 115}
      } else {
        // Mobile : colonne verticale unique
        return {x: 180, y: 42 + i * 78}
      }
    }

    // 4. Compare
    if (graph.kind === 'compare') {
      if (!compact) {
        const columns = Math.min(4, n)
        const row = Math.floor(i / columns)
        const col = i % columns
        return {x: (740 / columns) * (col + 0.5), y: 45 + row * 110}
      } else {
        if (n <= 2) {
          const col = i % 2
          return {x: col === 0 ? 94 : 266, y: 48}
        } else {
          return {x: 180, y: 42 + i * 76}
        }
      }
    }

    return {x: width / 2, y: 50 + i * 80}
  })

  const height = Math.max(...positions.map((p, idx) => p.y + getNodeDim(idx).h / 2)) + 28
  const links =
    graph.links ??
    (graph.kind === 'compare'
      ? []
      : graph.kind === 'branch'
        ? graph.nodes.slice(1).map((_, i) => ({from: 0, to: i + 1}))
        : graph.nodes.slice(1).map((_, i) => ({from: i, to: i + 1})))
  const edges = graph.kind === 'cycle' ? [...links, {from: n - 1, to: 0}] : links

  const path = (from: number, to: number) => {
    const a = positions[from]
    const b = positions[to]
    if (!a || !b) return ''
    const dimA = getNodeDim(from)
    const dimB = getNodeDim(to)

    if (graph.kind === 'cycle' && compact && to === 0) {
      return `M ${a.x - dimA.w / 2} ${a.y} H 18 V ${b.y} H ${b.x - dimB.w / 2 - 6}`
    }

    // Lien vertical direct
    if (Math.abs(a.x - b.x) < 12 && b.y > a.y) {
      const startY = a.y + dimA.h / 2
      const endY = b.y - dimB.h / 2 - 6
      return `M ${a.x} ${startY} V ${endY}`
    }

    // Lien horizontal direct
    if (Math.abs(a.y - b.y) < 12) {
      const dir = b.x > a.x ? 1 : -1
      const startX = a.x + dir * (dimA.w / 2)
      const endX = b.x - dir * (dimB.w / 2 + 6)
      return `M ${startX} ${a.y} H ${endX}`
    }

    // Ramification orthogonale
    const startY = a.y + dimA.h / 2
    const endY = b.y - dimB.h / 2 - 6
    const midY = (startY + endY) / 2
    return `M ${a.x} ${startY} V ${midY} H ${b.x} V ${endY}`
  }

  const zoomPercent = Math.round(scale * 100)

  const zoomControls = (
    <div className="diagram-view-controls" role="toolbar" aria-label="Contrôles de zoom et affichage">
      <div className="diagram-zoom-group">
        <button
          type="button"
          className="diagram-zoom-btn"
          onClick={handleZoomOut}
          disabled={scale <= 0.75}
          title="Zoom arrière (-)"
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
          title="Zoom avant (+)"
          aria-label="Zoom avant"
        >
          <ZoomIn size={15} />
        </button>
        {scale !== 1 && (
          <button
            type="button"
            className="diagram-zoom-btn diagram-zoom-reset"
            onClick={handleResetZoom}
            title="Réinitialiser le zoom (0)"
            aria-label="Réinitialiser le zoom"
          >
            <RotateCcw size={13} />
            <span>100%</span>
          </button>
        )}
      </div>

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
  )

  const canvas = (
    <div
      className={'diagram-canvas diagram-' + graph.kind + (scale > 1 ? ' is-zoomed' : '') + (isDragging ? ' is-dragging' : '')}
      style={{
        aspectRatio: width + '/' + height,
        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        transformOrigin: 'center center',
        touchAction: scale > 1 ? 'none' : 'pan-x pan-y',
      }}
      role="group"
      aria-label="Éléments du schéma"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg viewBox={'0 0 ' + width + ' ' + height} aria-hidden="true">
        <defs>
          <marker id={uid + '-arrow'} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
          </marker>
        </defs>
        {edges.map((edge, i) => (
          <path
            key={i}
            d={path(edge.from, edge.to)}
            className={edge.from === active || edge.to === active ? 'diagram-edge active' : 'diagram-edge'}
            markerEnd={'url(#' + uid + '-arrow)'}
          />
        ))}
      </svg>
      {graph.nodes.map((node, i) => {
        const dim = getNodeDim(i)
        const isRoot = dim.isRoot
        const displayLabel = getNodeDisplayLabel(node.label, isRoot, compact)
        const badgeText = isRoot ? 'NOTION CENTRALE' : String(i + 1).padStart(2, '0')

        return (
          <button
            key={node.label + i}
            aria-pressed={active === i}
            className={isRoot ? 'is-root-node' : undefined}
            onClick={() => setActive(i)}
            style={{
              left: ((positions[i].x - dim.w / 2) / width) * 100 + '%',
              top: ((positions[i].y - dim.h / 2) / height) * 100 + '%',
              width: (dim.w / width) * 100 + '%',
              height: (dim.h / height) * 100 + '%',
            }}
          >
            <span>{badgeText}</span>
            <strong title={node.label}>{displayLabel}</strong>
          </button>
        )
      })}
    </div>
  )

  const explanation = (
    <div className="diagram-explanation" aria-live="polite">
      <span className={getNodeDim(active).isRoot ? 'is-root-badge' : undefined}>
        {getNodeDim(active).isRoot ? 'NOTION' : String(active + 1).padStart(2, '0')}
      </span>
      <div>
        <h3>{graph.nodes[active].label}</h3>
        <p>{graph.nodes[active].detail}</p>
      </div>
    </div>
  )

  const navigation = (
    <div className="diagram-navigation">
      <span>
        {active + 1} / {n} éléments
      </span>
      <button onClick={() => setActive((active + 1) % n)}>
        Élément suivant
        <ArrowRight size={15} />
      </button>
    </div>
  )

  return (
    <>
      <figure className="interactive-diagram" aria-labelledby={uid + '-title'}>
        <figcaption>
          <span className="study-eyebrow">SCHÉMA EXPLICATIF INTERACTIF</span>
          <h2 id={uid + '-title'}>{graph.title}</h2>
          <p>{graph.caption}</p>
        </figcaption>

        <div className="diagram-header-controls">
          <div className="diagram-hint">
            <MousePointer2 size={14} />
            Sélectionnez un élément pour comprendre son rôle.
          </div>
          {zoomControls}
        </div>

        <div className="diagram-viewport-wrapper">
          {canvas}
        </div>

        {scale > 1 && (
          <span className="diagram-pan-hint" style={{display: 'inline-flex', marginTop: '6px'}}>
            <Move size={12} /> Glissez pour déplacer
          </span>
        )}

        {explanation}
        {navigation}
        <ul className="sr-only">
          {edges.map((edge, i) => (
            <li key={i}>
              {graph.nodes[edge.from].label} vers {graph.nodes[edge.to].label}
            </li>
          ))}
        </ul>
      </figure>

      {isFullscreen && (
        <div
          className="diagram-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Vue plein écran : ${graph.title}`}
        >
          <div className="diagram-modal-backdrop" onClick={toggleFullscreen} />
          <div className="diagram-modal-card">
            <header className="diagram-modal-header">
              <div>
                <span className="study-eyebrow">MODE PLEIN ÉCRAN</span>
                <h2>{graph.title}</h2>
                <p>{graph.caption}</p>
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
              <div className="diagram-hint">
                <MousePointer2 size={14} />
                Sélectionnez un élément pour comprendre son rôle.
              </div>
              {zoomControls}
            </div>

            <div className="diagram-modal-body">
              {canvas}
            </div>

            <footer className="diagram-modal-footer">
              {explanation}
              {navigation}
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
