import React, { useState } from 'react'
import { Stethoscope, AlertTriangle, Activity, CheckCircle, XCircle, FileText } from 'lucide-react'
import type { ClinicalScenario } from './types'

interface AtlasClinicalOverlayProps {
  scenarios: ClinicalScenario[]
  activeScenarioId: string | null
  onSelectScenario: (scenarioId: string) => void
  onFocusViewAndStructures: (viewId: string, structureIds: string[]) => void
}

export const AtlasClinicalOverlay: React.FC<AtlasClinicalOverlayProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onFocusViewAndStructures
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({})

  const currentScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0]

  if (!currentScenario) {
    return <div className="atlas-clinical-empty">Aucun cas clinique disponible.</div>
  }

  const handleScenarioChange = (scenario: ClinicalScenario) => {
    onSelectScenario(scenario.id)
    onFocusViewAndStructures(scenario.primaryViewId, scenario.affectedStructureIds)
    setSelectedAnswers({})
    setRevealedAnswers({})
  }

  const handleOptionClick = (qIndex: number, optionIdx: number) => {
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: optionIdx }))
    setRevealedAnswers(prev => ({ ...prev, [qIndex]: true }))
  }

  return (
    <div className="atlas-clinical-overlay" aria-label="Cas cliniques et corrélations pathologiques" data-testid="atlas-clinical-overlay">
      {/* Scenario Pills Switcher */}
      <div className="scenario-selector-bar">
        <span className="selector-title">Cas d’urgence & Pathologies :</span>
        <div className="scenario-pills">
          {scenarios.map(s => (
            <button
              key={s.id}
              type="button"
              className={`scenario-pill ${s.id === currentScenario.id ? 'active' : ''}`}
              onClick={() => handleScenarioChange(s)}
            >
              <Stethoscope size={14} />
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Header Card */}
      <div className="clinical-header-card">
        <div className="header-meta">
          <span className={`clinical-badge ${currentScenario.severity}`}>
            {currentScenario.badge}
          </span>
          <span className="scenario-sub">{currentScenario.subtitle}</span>
        </div>
        <h3 className="clinical-title-badge">{currentScenario.title}</h3>
      </div>

      {/* Clinical Vignette Box */}
      <div className="clinical-vignette-box">
        <div className="vignette-title">
          <FileText size={16} />
          <strong>Présentation clinique & Anamnèse</strong>
        </div>
        <p className="vignette-text">{currentScenario.vignette}</p>
      </div>

      {/* Pathophysiology & Signs Grid */}
      <div className="clinical-grid">
        <div className="clinical-col">
          <h4>
            <Activity size={16} />
            <span>Physiopathologie</span>
          </h4>
          <p>{currentScenario.pathophysiology}</p>
        </div>

        <div className="clinical-col">
          <h4>
            <AlertTriangle size={16} />
            <span>Signes cardinaux & Sémiologie</span>
          </h4>
          <ul className="clinical-signs-list">
            {currentScenario.clinicalSigns.map((sign, idx) => (
              <li key={idx}>{sign}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ECG or Imaging Findings */}
      {currentScenario.ecgOrImagingFindings && (
        <div className="clinical-findings-box">
          <strong>Imagerie / ECG :</strong> {currentScenario.ecgOrImagingFindings}
        </div>
      )}

      {/* Therapeutic Management Key */}
      <div className="clinical-management-box">
        <strong>Prise en charge & Traitement :</strong> {currentScenario.managementKey}
      </div>

      {/* Integrated Clinical Mini-Quiz */}
      {currentScenario.quizQuestion && (
        <div className="clinical-quiz-card">
          <h4>Question d’évaluation clinique</h4>
          <p className="quiz-question-prompt">{currentScenario.quizQuestion.question}</p>

          <div className="quiz-options-list">
            {currentScenario.quizQuestion.options.map((opt, optIdx) => {
              const isChosen = selectedAnswers[0] === optIdx
              const isCorrect = optIdx === currentScenario.quizQuestion!.correctIndex
              const isRevealed = revealedAnswers[0]

              let btnClass = 'quiz-option-btn'
              if (isRevealed) {
                if (isCorrect) btnClass += ' correct'
                else if (isChosen) btnClass += ' incorrect'
              } else if (isChosen) {
                btnClass += ' selected'
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  className={btnClass}
                  onClick={() => handleOptionClick(0, optIdx)}
                >
                  <span className="opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                  <span className="opt-text">{opt}</span>
                  {isRevealed && isCorrect && <CheckCircle size={16} className="opt-icon success" />}
                  {isRevealed && isChosen && !isCorrect && <XCircle size={16} className="opt-icon error" />}
                </button>
              )
            })}
          </div>

          {revealedAnswers[0] && (
            <div className="quiz-feedback">
              <strong>Explication :</strong> {currentScenario.quizQuestion.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
