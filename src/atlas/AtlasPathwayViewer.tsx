import React from 'react'
import { GitBranch, ChevronRight, ChevronLeft, CheckCircle2, Clock, Info } from 'lucide-react'
import type { AtlasPathway, PathwayStep } from './types'

interface AtlasPathwayViewerProps {
  pathways: AtlasPathway[]
  activePathwayId: string | null
  activeStepIndex: number
  onSelectPathway: (pathwayId: string) => void
  onSelectStep: (stepIndex: number) => void
  onFocusStructure: (structureId: string, viewId: string) => void
}

export const AtlasPathwayViewer: React.FC<AtlasPathwayViewerProps> = ({
  pathways,
  activePathwayId,
  activeStepIndex,
  onSelectPathway,
  onSelectStep,
  onFocusStructure
}) => {
  const currentPathway = pathways.find(p => p.id === activePathwayId) || pathways[0]

  if (!currentPathway) {
    return <div className="atlas-pathway-empty">Aucun parcours disponible.</div>
  }

  const currentStep: PathwayStep | undefined = currentPathway.steps[activeStepIndex] || currentPathway.steps[0]

  const handleStepClick = (idx: number) => {
    onSelectStep(idx)
    const step = currentPathway.steps[idx]
    if (step) {
      onFocusStructure(step.structureId, step.viewId)
    }
  }

  const handleNext = () => {
    if (activeStepIndex < currentPathway.steps.length - 1) {
      handleStepClick(activeStepIndex + 1)
    }
  }

  const handlePrev = () => {
    if (activeStepIndex > 0) {
      handleStepClick(activeStepIndex - 1)
    }
  }

  return (
    <div className="atlas-pathway-viewer" aria-label="Trajet anatomique et physiologique" data-testid="atlas-pathway-viewer">
      {/* Pathways List Pills */}
      <div className="pathway-selector-bar">
        <span className="selector-title">Circuits disponibles :</span>
        <div className="pathway-pills">
          {pathways.map(p => (
            <button
              key={p.id}
              type="button"
              className={`pathway-pill ${p.id === currentPathway.id ? 'active' : ''}`}
              onClick={() => {
                onSelectPathway(p.id)
                onSelectStep(0)
                if (p.steps[0]) {
                  onFocusStructure(p.steps[0].structureId, p.steps[0].viewId)
                }
              }}
            >
              <GitBranch size={14} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pathway Overview Header */}
      <div className="pathway-header-card">
        <div className="header-meta">
          <span className="category-tag">{currentPathway.category}</span>
          <span className="steps-count">
            <Clock size={13} />
            <span>{currentPathway.steps.length} étapes</span>
          </span>
        </div>
        <h3 className="pathway-title">{currentPathway.name}</h3>
        <p className="pathway-desc">{currentPathway.shortDescription}</p>
      </div>

      {/* Horizontal Step Indicator */}
      <div className="pathway-stepper-track">
        {currentPathway.steps.map((step, idx) => {
          const isCompleted = idx < activeStepIndex
          const isCurrent = idx === activeStepIndex
          return (
            <button
              key={step.index}
              type="button"
              className={`stepper-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => handleStepClick(idx)}
              title={step.title}
            >
              <div className="node-circle">
                {isCompleted ? <CheckCircle2 size={14} /> : step.index}
              </div>
              <span className="node-label">{step.title}</span>
            </button>
          )
        })}
      </div>

      {/* Active Step Detailed Card */}
      {currentStep && (
        <div className="active-step-card">
          <div className="step-badge">
            Étape {currentStep.index} / {currentPathway.steps.length}
          </div>
          <h4>{currentStep.title}</h4>
          <p className="step-desc">{currentStep.description}</p>

          {currentStep.physiologicalRole && (
            <div className="step-extra-box physio">
              <Info size={15} />
              <div>
                <strong>Rôle physiologique :</strong> {currentStep.physiologicalRole}
              </div>
            </div>
          )}

          {currentStep.clinicalNote && (
            <div className="step-extra-box clinical">
              <Info size={15} />
              <div>
                <strong>Note clinique :</strong> {currentStep.clinicalNote}
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="step-nav-footer">
            <button
              type="button"
              className="step-btn secondary"
              disabled={activeStepIndex === 0}
              onClick={handlePrev}
            >
              <ChevronLeft size={16} />
              <span>Précédent</span>
            </button>

            <button
              type="button"
              className="step-btn primary"
              disabled={activeStepIndex === currentPathway.steps.length - 1}
              onClick={handleNext}
            >
              <span>Suivant</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
