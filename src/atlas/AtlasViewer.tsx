import React, { useState, useRef } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react'
import type { AtlasDefinition } from './types'
import { BrainDrawings } from './drawings/BrainDrawings'
import { HeartDrawings } from './drawings/HeartDrawings'

interface AtlasViewerProps {
  atlas: AtlasDefinition
  currentViewId: string
  activeStructureId: string | null
  hoveredStructureId: string | null
  onSelectStructure: (id: string) => void
  onHoverStructure: (id: string | null) => void
  highlightedPathStructureIds?: string[]
  clinicalAffectedIds?: string[]
  isTestMode?: boolean
  isRevealed?: boolean
}

export const AtlasViewer: React.FC<AtlasViewerProps> = ({
  atlas,
  currentViewId,
  activeStructureId,
  hoveredStructureId,
  onSelectStructure,
  onHoverStructure,
  highlightedPathStructureIds = [],
  clinicalAffectedIds = [],
  isTestMode = false,
  isRevealed = false
}) => {
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [showLabels, setShowLabels] = useState<boolean>(true)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const currentView = atlas.views.find(v => v.id === currentViewId) || atlas.views[0]

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.75))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  return (
    <div
      ref={containerRef}
      className={`atlas-viewer-container ${isFullscreen ? 'is-fullscreen' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Floating Controls */}
      <div className="atlas-viewer-controls" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-title-box">
          <span className="viewer-title">{currentView.name}</span>
        </div>
        <div className="control-group">
          <button
            type="button"
            className="control-btn"
            onClick={handleZoomIn}
            title="Zoom avant (+)"
            aria-label="Zoom avant"
          >
            <ZoomIn size={18} />
          </button>
          <span className="zoom-badge">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="control-btn"
            onClick={handleZoomOut}
            title="Zoom arrière (-)"
            aria-label="Zoom arrière"
          >
            <ZoomOut size={18} />
          </button>
        </div>

        <div className="control-group">
          <button
            type="button"
            className="control-btn"
            onClick={handleReset}
            title="Réinitialiser le zoom"
            aria-label="Réinitialiser"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className={`control-btn ${showLabels ? 'active' : ''}`}
            onClick={() => setShowLabels(v => !v)}
            title={showLabels ? "Masquer les étiquettes" : "Afficher les étiquettes"}
            aria-label="Étiquettes"
          >
            {showLabels ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
          <button
            type="button"
            className="control-btn"
            onClick={toggleFullscreen}
            title="Plein écran"
            aria-label="Plein écran"
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>

      {/* View Header Badge */}
      <div className="atlas-view-badge">
        <span className="badge-dot" />
        <span className="view-name">{currentView.name}</span>
      </div>

      {/* SVG Canvas with Zoom & Pan transform */}
      <div
        className="atlas-canvas-viewport"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
      >
        {atlas.id === 'brain' ? (
          <BrainDrawings
            viewId={currentViewId}
            structures={currentView.structures}
            activeStructureId={activeStructureId}
            hoveredStructureId={hoveredStructureId}
            onSelectStructure={onSelectStructure}
            onHoverStructure={onHoverStructure}
            showLabels={showLabels}
            highlightedPathStructureIds={highlightedPathStructureIds}
            clinicalAffectedIds={clinicalAffectedIds}
            isTestMode={isTestMode && !isRevealed}
          />
        ) : (
          <HeartDrawings
            viewId={currentViewId}
            structures={currentView.structures}
            activeStructureId={activeStructureId}
            hoveredStructureId={hoveredStructureId}
            onSelectStructure={onSelectStructure}
            onHoverStructure={onHoverStructure}
            showLabels={showLabels}
            highlightedPathStructureIds={highlightedPathStructureIds}
            clinicalAffectedIds={clinicalAffectedIds}
            isTestMode={isTestMode && !isRevealed}
          />
        )}
      </div>

      {/* Bottom hint */}
      <div className="atlas-viewer-hint">
        <span>Glisser pour déplacer · Clic sur une structure pour afficher sa fiche</span>
      </div>
    </div>
  )
}
