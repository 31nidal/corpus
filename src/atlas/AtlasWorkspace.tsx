import { useState, useEffect, useMemo, useCallback } from 'react'
import type { AtlasDefinition, AtlasId, AtlasMode, AtlasStructure } from './types'
import { getAllAtlases, getAtlasDefinition } from './data'
import AtlasHub from './AtlasHub'
import { AtlasViewer } from './AtlasViewer'
import { AtlasModeSelector } from './AtlasModeSelector'
import { AtlasInfoPanel } from './AtlasInfoPanel'
import { AtlasPathwayViewer } from './AtlasPathwayViewer'
import AtlasQuizMode from './AtlasQuizMode'
import { AtlasClinicalOverlay } from './AtlasClinicalOverlay'
import NeuroExplorer from './NeuroExplorer'
import AtlasFlashcardModal from './AtlasFlashcardModal'
import './atlas.css'
import {
  Brain,
  Heart,
  Rotate3D,
  Home,
  Layers,
  ChevronRight,
} from 'lucide-react'

interface Props {
  initialAtlasId?: string | null
  initialMode?: string | null
  initialViewId?: string | null
  initialStructureId?: string | null
  onOpen3DAtlas: () => void
  onNavigateCourse?: (courseId: string) => void
  onNavigatePractice?: (courseId: string) => void
}

export function AtlasWorkspace({
  initialAtlasId = null,
  initialMode = null,
  initialViewId = null,
  initialStructureId = null,
  onOpen3DAtlas,
  onNavigateCourse = () => {},
  onNavigatePractice = () => {},
}: Props) {
  const allAtlases = useMemo(() => getAllAtlases(), [])

  const [activeAtlasId, setActiveAtlasId] = useState<AtlasId | null>(
    (initialAtlasId as AtlasId) || null
  )
  const [activeMode, setActiveMode] = useState<AtlasMode>((initialMode as AtlasMode) || 'explore')
  const [activeViewId, setActiveViewId] = useState<string>(initialViewId || '')
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(initialStructureId || null)
  const [hoveredStructureId, setHoveredStructureId] = useState<string | null>(null)

  // Pathway viewer state
  const [activePathwayId, setActivePathwayId] = useState<string | null>(null)
  const [activePathwayStepIndex, setActivePathwayStepIndex] = useState<number>(0)
  const [pathwayHighlightedIds, setPathwayHighlightedIds] = useState<string[]>([])

  // Clinical scenario state
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [clinicalAffectedIds, setClinicalAffectedIds] = useState<string[]>([])

  // Flashcard modal state
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false)
  const [flashcardStructure, setFlashcardStructure] = useState<AtlasStructure | null>(null)
  const [flashcardMode, setFlashcardMode] = useState<'basic' | 'occlusion'>('basic')

  // Current active atlas
  const activeAtlas: AtlasDefinition | null = useMemo(() => {
    if (!activeAtlasId) return null
    return getAtlasDefinition(activeAtlasId)
  }, [activeAtlasId])

  // Sync props when URL/route changes externally
  useEffect(() => {
    setActiveAtlasId((initialAtlasId as AtlasId) || null)
  }, [initialAtlasId])

  useEffect(() => {
    if (initialMode) {
      setActiveMode(initialMode as AtlasMode)
    }
  }, [initialMode])

  useEffect(() => {
    if (initialViewId) {
      setActiveViewId(initialViewId)
    }
  }, [initialViewId])

  useEffect(() => {
    if (initialStructureId !== undefined) {
      setSelectedStructureId(initialStructureId)
    }
  }, [initialStructureId])

  // Sync active view when atlas changes
  useEffect(() => {
    if (activeAtlas) {
      if (!activeViewId || !activeAtlas.views.some((v) => v.id === activeViewId)) {
        setActiveViewId(activeAtlas.defaultViewId || activeAtlas.views[0]?.id || '')
      }
      if (!activePathwayId && activeAtlas.pathways.length > 0) {
        setActivePathwayId(activeAtlas.pathways[0].id)
      }
      if (!activeScenarioId && activeAtlas.clinicalScenarios.length > 0) {
        setActiveScenarioId(activeAtlas.clinicalScenarios[0].id)
      }
    }
  }, [activeAtlas, activeViewId, activePathwayId, activeScenarioId])

  // URL hash sync
  const updateHash = useCallback(
    (atlasId: string | null, viewId?: string, mode?: AtlasMode, structureId?: string | null) => {
      const params = new URLSearchParams(window.location.hash.slice(1))
      params.set('tab', 'atlas')

      if (atlasId) {
        params.set('sub', atlasId)
        if (viewId) params.set('view', viewId)
        else params.delete('view')
        if (mode && mode !== 'explore') params.set('mode', mode)
        else params.delete('mode')
        if (structureId) params.set('structure', structureId)
        else params.delete('structure')
      } else {
        params.delete('sub')
        params.delete('view')
        params.delete('mode')
        params.delete('structure')
      }

      window.history.replaceState(null, '', '#' + params.toString())
    },
    []
  )

  const handleSelectAtlas = (atlasId: string, viewId?: string, mode?: string) => {
    if (!atlasId) {
      setActiveAtlasId(null)
      updateHash(null)
      return
    }
    const targetAtlasId = atlasId as AtlasId
    setActiveAtlasId(targetAtlasId)
    const targetAtlas = getAtlasDefinition(targetAtlasId)
    const targetView = viewId || targetAtlas?.defaultViewId || targetAtlas?.views[0]?.id || ''
    const targetMode = (mode as AtlasMode) || 'explore'
    setActiveViewId(targetView)
    setActiveMode(targetMode)
    setSelectedStructureId(null)
    setPathwayHighlightedIds([])
    setClinicalAffectedIds([])
    updateHash(targetAtlasId, targetView, targetMode, null)
  }

  const handleSelectView = (viewId: string) => {
    setActiveViewId(viewId)
    setSelectedStructureId(null)
    updateHash(activeAtlasId, viewId, activeMode, null)
  }

  const handleSelectMode = (mode: AtlasMode) => {
    setActiveMode(mode)
    setPathwayHighlightedIds([])
    setClinicalAffectedIds([])
    updateHash(activeAtlasId, activeViewId, mode, selectedStructureId)
  }

  const handleSelectStructure = (structureId: string) => {
    setSelectedStructureId(structureId)
    updateHash(activeAtlasId, activeViewId, activeMode, structureId)
  }

  const handleOpenFlashcard = (structure: AtlasStructure, mode: 'basic' | 'occlusion') => {
    setFlashcardStructure(structure)
    setFlashcardMode(mode)
    setFlashcardModalOpen(true)
  }

  const allStructures = useMemo(() => {
    if (!activeAtlas) return []
    return activeAtlas.views.flatMap((v) => v.structures)
  }, [activeAtlas])

  const activeStructure = useMemo(() => {
    if (!selectedStructureId) return null
    return allStructures.find((s) => s.id === selectedStructureId) || null
  }, [allStructures, selectedStructureId])

  const structuresForCurrentView = useMemo(() => {
    if (!activeAtlas) return []
    const view = activeAtlas.views.find((v) => v.id === activeViewId)
    return view?.structures || []
  }, [activeAtlas, activeViewId])

  // If Hub is active
  if (!activeAtlasId || !activeAtlas) {
    return (
      <div className="atlas-workspace-container" data-testid="atlas-workspace-hub">
        <AtlasHub
          atlases={allAtlases}
          onSelectAtlas={handleSelectAtlas}
          onOpen3DAtlas={onOpen3DAtlas}
          onNavigateCourse={onNavigateCourse}
        />
      </div>
    )
  }

  const currentView = activeAtlas.views.find((v) => v.id === activeViewId) || activeAtlas.views[0]

  return (
    <div className="atlas-workspace-container" data-testid="atlas-workspace">
      {/* Top Header Bar */}
      <header className="atlas-topbar">
        <div className="atlas-topbar-left">
          <button
            className="atlas-nav-hub-btn"
            onClick={() => handleSelectAtlas('')}
            title="Retour au portail des atlas"
          >
            <Home size={16} />
            <span>Atlas Hub</span>
          </button>
          <ChevronRight size={16} className="breadcrumbs-separator" />
          <div className="atlas-pills-selector" role="tablist">
            <button
              role="tab"
              aria-selected={activeAtlasId === 'brain'}
              className={`atlas-switch-pill ${activeAtlasId === 'brain' ? 'is-active' : ''}`}
              onClick={() => handleSelectAtlas('brain')}
            >
              <Brain size={16} />
              <span>Cerveau & Neuro</span>
            </button>
            <button
              role="tab"
              aria-selected={activeAtlasId === 'heart'}
              className={`atlas-switch-pill ${activeAtlasId === 'heart' ? 'is-active' : ''}`}
              onClick={() => handleSelectAtlas('heart')}
            >
              <Heart size={16} />
              <span>Cœur & Cardio</span>
            </button>
            <button
              role="tab"
              aria-selected={false}
              className="atlas-switch-pill tag-3d"
              onClick={onOpen3DAtlas}
              title="Passer au modèle 3D temps réel"
            >
              <Rotate3D size={16} />
              <span>Atlas 3D</span>
            </button>
          </div>
        </div>

        <div className="atlas-topbar-right">
          {/* Mode selector tab pills */}
          <AtlasModeSelector
            atlasId={activeAtlasId}
            activeMode={activeMode}
            onSelectMode={handleSelectMode}
          />
        </div>
      </header>

      {/* Subheader: View Switcher */}
      <div className="atlas-views-bar">
        <div className="views-label">
          <Layers size={14} />
          <span>Planches & Vues :</span>
        </div>
        <div className="views-pills-row" role="tablist">
          {activeAtlas.views.map((view) => {
            const isCurrent = view.id === currentView.id
            return (
              <button
                key={view.id}
                role="tab"
                aria-selected={isCurrent}
                className={`view-pill-btn ${isCurrent ? 'is-active' : ''}`}
                onClick={() => handleSelectView(view.id)}
              >
                <span>{view.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Canvas & Side Panel Split */}
      <div className="atlas-main-content">
        {/* Left / Center: Interactive SVG Canvas */}
        <div className="atlas-canvas-column">
          <AtlasViewer
            atlas={activeAtlas}
            currentViewId={currentView.id}
            activeStructureId={selectedStructureId}
            hoveredStructureId={hoveredStructureId}
            onSelectStructure={handleSelectStructure}
            onHoverStructure={setHoveredStructureId}
            highlightedPathStructureIds={pathwayHighlightedIds}
            clinicalAffectedIds={clinicalAffectedIds}
            isTestMode={activeMode === 'test'}
          />

          {/* Quick interactive structure strip below diagram */}
          {structuresForCurrentView.length > 0 && activeMode === 'explore' && (
            <div className="atlas-structures-strip" aria-label="Structures de la vue actuelle">
              <span className="strip-title">Repères de la vue :</span>
              <div className="strip-chips">
                {structuresForCurrentView.map((st) => {
                  const isSel = st.id === selectedStructureId
                  const isHov = st.id === hoveredStructureId
                  return (
                    <button
                      key={st.id}
                      className={`strip-chip ${isSel ? 'is-selected' : ''} ${isHov ? 'is-hovered' : ''}`}
                      onClick={() => handleSelectStructure(st.id)}
                      onMouseEnter={() => setHoveredStructureId(st.id)}
                      onMouseLeave={() => setHoveredStructureId(null)}
                    >
                      {st.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Contextual Medical Panels */}
        <aside className="atlas-sidebar-column">
          {activeMode === 'explore' && (
            <AtlasInfoPanel
              structure={activeStructure}
              siblingStructures={structuresForCurrentView}
              onSelectStructure={handleSelectStructure}
              onClose={() => setSelectedStructureId(null)}
              onNavigateCourse={onNavigateCourse}
              onNavigatePractice={onNavigatePractice}
              onCreateFlashcard={(s) => handleOpenFlashcard(s, 'basic')}
              onCreateImageOcclusion={(s) => handleOpenFlashcard(s, 'occlusion')}
            />
          )}

          {activeMode === 'pathway' && (
            <AtlasPathwayViewer
              pathways={activeAtlas.pathways || []}
              activePathwayId={activePathwayId}
              activeStepIndex={activePathwayStepIndex}
              onSelectPathway={(pId) => {
                setActivePathwayId(pId)
                setActivePathwayStepIndex(0)
                const path = activeAtlas.pathways.find((p) => p.id === pId)
                if (path && path.steps.length > 0) {
                  setPathwayHighlightedIds(path.steps.map((s) => s.structureId))
                  const step0 = path.steps[0]
                  if (step0.viewId !== activeViewId) {
                    setActiveViewId(step0.viewId)
                  }
                  handleSelectStructure(step0.structureId)
                }
              }}
              onSelectStep={(idx) => {
                setActivePathwayStepIndex(idx)
              }}
              onFocusStructure={(id, vId) => {
                if (vId && vId !== activeViewId) {
                  setActiveViewId(vId)
                }
                handleSelectStructure(id)
              }}
            />
          )}

          {activeMode === 'test' && (
            <AtlasQuizMode
              atlas={activeAtlas}
              onSelectStructure={(s) => {
                handleSelectStructure(s.id)
                if (s.viewId !== activeViewId) {
                  setActiveViewId(s.viewId)
                }
              }}
              onNavigateCourse={onNavigateCourse}
            />
          )}

          {activeMode === 'clinical' && (
            <AtlasClinicalOverlay
              scenarios={activeAtlas.clinicalScenarios || []}
              activeScenarioId={activeScenarioId}
              onSelectScenario={(sId) => {
                setActiveScenarioId(sId)
              }}
              onFocusViewAndStructures={(viewId, structureIds) => {
                if (viewId && viewId !== activeViewId) {
                  setActiveViewId(viewId)
                }
                setClinicalAffectedIds(structureIds)
                if (structureIds.length > 0) {
                  handleSelectStructure(structureIds[0])
                }
              }}
            />
          )}

          {activeMode === 'neuro' && activeAtlas.neuroDomains && (
            <NeuroExplorer
              domains={activeAtlas.neuroDomains}
              onSelectStructure={(id) => {
                handleSelectStructure(id)
                const target = allStructures.find((s) => s.id === id)
                if (target && target.viewId !== activeViewId) {
                  setActiveViewId(target.viewId)
                }
              }}
              selectedStructureId={selectedStructureId}
              onNavigateCourse={onNavigateCourse}
            />
          )}
        </aside>
      </div>

      {/* 1-Click Flashcard Modal */}
      {flashcardModalOpen && flashcardStructure && (
        <AtlasFlashcardModal
          isOpen={flashcardModalOpen}
          onClose={() => setFlashcardModalOpen(false)}
          structure={flashcardStructure}
          atlas={activeAtlas}
          currentViewId={currentView.id}
          mode={flashcardMode}
        />
      )}
    </div>
  )
}

export default AtlasWorkspace
