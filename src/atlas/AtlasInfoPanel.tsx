import React from 'react'
import {
  X,
  BookOpen,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  Brain,
  Layers,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react'
import type { AtlasStructure } from './types'

interface AtlasInfoPanelProps {
  structure: AtlasStructure | null
  siblingStructures: AtlasStructure[]
  onSelectStructure: (id: string) => void
  onClose: () => void
  onNavigateCourse: (courseId: string) => void
  onNavigatePractice: (courseId: string) => void
  onCreateFlashcard: (structure: AtlasStructure) => void
  onCreateImageOcclusion: (structure: AtlasStructure) => void
}

export const AtlasInfoPanel: React.FC<AtlasInfoPanelProps> = ({
  structure,
  siblingStructures,
  onSelectStructure,
  onClose,
  onNavigateCourse,
  onNavigatePractice,
  onCreateFlashcard,
  onCreateImageOcclusion
}) => {
  if (!structure) {
    return (
      <aside className="atlas-info-sheet empty" aria-label="Fiche anatomique">
        <div className="atlas-empty-prompt">
          <div className="empty-icon-wrap">
            <Layers size={32} />
          </div>
          <h3>Sélectionnez une structure</h3>
          <p>
            Cliquez sur un repère ou une zone colorée du schéma pour explorer ses détails
            anatomiques, sa vascularisation et ses implications cliniques.
          </p>
        </div>
      </aside>
    )
  }

  const currentIndex = siblingStructures.findIndex(s => s.id === structure.id)
  const prevStructure = currentIndex > 0 ? siblingStructures[currentIndex - 1] : null
  const nextStructure = currentIndex < siblingStructures.length - 1 ? siblingStructures[currentIndex + 1] : null

  return (
    <aside className="atlas-info-sheet" aria-label={`Fiche médicale : ${structure.name}`} data-testid="atlas-info-panel">
      {/* Header */}
      <header className="atlas-structure-header">
        <div className="header-top">
          <span className="atlas-category-tag">{structure.category}</span>
          <button
            type="button"
            className="icon-close-btn"
            onClick={onClose}
            aria-label="Fermer la fiche"
          >
            <X size={18} />
          </button>
        </div>
        <h2>{structure.name}</h2>
        {structure.latinName && <p className="atlas-latin">{structure.latinName}</p>}
      </header>

      {/* Main Content */}
      <div className="atlas-sheet-scrollable">
        {/* Core Description */}
        <section className="atlas-section">
          <p className="atlas-description-text">{structure.description}</p>
        </section>

        {/* Anatomical Details Specs */}
        <section className="atlas-section specs-grid">
          {structure.location && (
            <div className="spec-item">
              <span className="spec-label">Localisation</span>
              <span className="spec-value">{structure.location}</span>
            </div>
          )}
          {structure.anatomicalRelations && (
            <div className="spec-item">
              <span className="spec-label">Rapports</span>
              <span className="spec-value">{structure.anatomicalRelations}</span>
            </div>
          )}
          {structure.vascularization && (
            <div className="spec-item">
              <span className="spec-label">Vascularisation</span>
              <span className="spec-value">{structure.vascularization}</span>
            </div>
          )}
          {structure.function && (
            <div className="spec-item">
              <span className="spec-label">Fonction</span>
              <span className="spec-value">{structure.function}</span>
            </div>
          )}
        </section>

        {/* Clinical Pearl Callout */}
        {structure.clinicalPearl && (
          <div className="atlas-section-callout clinical">
            <div className="callout-title">
              <ShieldAlert size={16} />
              <span>Perle clinique & Sémiologie</span>
            </div>
            <p>{structure.clinicalPearl}</p>
          </div>
        )}

        {/* Exam High Yield Callout */}
        {structure.examHighYield && (
          <div className="atlas-section-callout exam">
            <div className="callout-title">
              <Sparkles size={16} />
              <span>Point clé pour les examens (EDN / PASS)</span>
            </div>
            <p>{structure.examHighYield}</p>
          </div>
        )}

        {/* Learning Actions & Interconnections */}
        <section className="atlas-section action-section">
          <h4>Intégration pédagogique MyCorpus</h4>
          <div className="action-buttons-grid">
            {structure.relatedCourseId && (
              <button
                type="button"
                className="action-pill primary"
                onClick={() => onNavigateCourse(structure.relatedCourseId!)}
              >
                <BookOpen size={15} />
                <span>Consulter le cours</span>
              </button>
            )}
            {structure.relatedCourseId && (
              <button
                type="button"
                className="action-pill secondary"
                onClick={() => onNavigatePractice(structure.relatedCourseId!)}
              >
                <GraduationCap size={15} />
                <span>S’entraîner (QCM)</span>
              </button>
            )}
            <button
              type="button"
              className="action-pill flashcard"
              onClick={() => onCreateFlashcard(structure)}
            >
              <Brain size={15} />
              <span>Créer une Flashcard FSRS</span>
            </button>
            <button
              type="button"
              className="action-pill occlusion"
              onClick={() => onCreateImageOcclusion(structure)}
            >
              <Activity size={15} />
              <span>Générer un masque d’occlusion</span>
            </button>
          </div>
        </section>
      </div>

      {/* Footer / Sibling structure switcher */}
      <footer className="atlas-sheet-footer">
        <button
          type="button"
          className="sibling-btn"
          disabled={!prevStructure}
          onClick={() => prevStructure && onSelectStructure(prevStructure.id)}
          title={prevStructure ? prevStructure.name : undefined}
        >
          <ChevronLeft size={16} />
          <span>Précédent</span>
        </button>

        <span className="sibling-counter">
          {currentIndex + 1} / {siblingStructures.length}
        </span>

        <button
          type="button"
          className="sibling-btn"
          disabled={!nextStructure}
          onClick={() => nextStructure && onSelectStructure(nextStructure.id)}
          title={nextStructure ? nextStructure.name : undefined}
        >
          <span>Suivant</span>
          <ChevronRight size={16} />
        </button>
      </footer>
    </aside>
  )
}
