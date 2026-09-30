import React from 'react'
import {
  X,
  BookOpen,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  Brain,
  ChevronLeft,
  ChevronRight,
  Activity,
  ChevronDown
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
  if (!structure) return null

  const currentIndex = siblingStructures.findIndex(s => s.id === structure.id)
  const prevStructure = currentIndex > 0 ? siblingStructures[currentIndex - 1] : null
  const nextStructure = currentIndex < siblingStructures.length - 1 ? siblingStructures[currentIndex + 1] : null

  return (
    <aside className="atlas-info-sheet" aria-label={`Fiche médicale : ${structure.name}`} data-testid="atlas-info-panel">
      <header className="atlas-structure-header">
        <div className="header-top">
          <span className="atlas-category-tag"><span className="atlas-info-dot" />{structure.category}</span>
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

      <div className="atlas-sheet-scrollable">
        <p className="atlas-description-text">{structure.description}</p>
        {structure.function && <p className="atlas-function-text"><span>Rôle</span>{structure.function}</p>}
        {structure.location && <p className="atlas-location-line"><span>Repère</span>{structure.location}</p>}
        {structure.clinicalPearl && <div className="atlas-section-callout clinical"><div className="callout-title"><ShieldAlert size={15} /><span>À retenir en clinique</span></div><p>{structure.clinicalPearl}</p></div>}
        <details className="atlas-more-details">
          <summary>Voir les détails anatomiques <ChevronDown size={15} /></summary>
          <div className="atlas-details-content">
            {structure.anatomicalRelations && <div className="spec-item"><span className="spec-label">Rapports</span><span className="spec-value">{structure.anatomicalRelations}</span></div>}
            {structure.vascularization && <div className="spec-item"><span className="spec-label">Vascularisation</span><span className="spec-value">{structure.vascularization}</span></div>}
            {structure.examHighYield && <div className="atlas-section-callout exam"><div className="callout-title"><Sparkles size={15} /><span>Point clé pour les examens</span></div><p>{structure.examHighYield}</p></div>}
          </div>
        </details>
        <details className="atlas-more-details atlas-learning-actions">
          <summary>Actions d’apprentissage <ChevronDown size={15} /></summary>
          <div className="atlas-details-content action-buttons-grid">
            {structure.relatedCourseId && <button type="button" className="action-pill primary" onClick={() => onNavigateCourse(structure.relatedCourseId!)}><BookOpen size={15} /><span>Voir le cours</span></button>}
            {structure.relatedCourseId && <button type="button" className="action-pill secondary" onClick={() => onNavigatePractice(structure.relatedCourseId!)}><GraduationCap size={15} /><span>S’entraîner</span></button>}
            <button type="button" className="action-pill flashcard" onClick={() => onCreateFlashcard(structure)}><Brain size={15} /><span>Créer une flashcard</span></button>
            <button type="button" className="action-pill occlusion" onClick={() => onCreateImageOcclusion(structure)}><Activity size={15} /><span>Masque d’occlusion</span></button>
          </div>
        </details>
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
