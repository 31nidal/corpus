import { useState } from 'react'
import type { NeuroFunctionalDomain } from './types'
import {
  Activity,
  MessageSquare,
  Sparkles,
  Eye,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
} from 'lucide-react'

interface Props {
  domains: NeuroFunctionalDomain[]
  onSelectStructure: (structureId: string) => void
  selectedStructureId: string | null
  onNavigateCourse?: (courseId: string) => void
}

const getDomainIcon = (id: string) => {
  switch (id) {
    case 'motor':
      return <Activity size={18} />
    case 'language':
      return <MessageSquare size={18} />
    case 'memory':
      return <Brain size={18} />
    case 'vision':
      return <Eye size={18} />
    default:
      return <Sparkles size={18} />
  }
}

export default function NeuroExplorer({
  domains,
  onSelectStructure,
  selectedStructureId,
}: Props) {
  const [activeDomainId, setActiveDomainId] = useState<string>(
    domains[0]?.id || 'motor'
  )

  const activeDomain = domains.find((d) => d.id === activeDomainId) || domains[0]

  if (!domains || domains.length === 0) {
    return (
      <div className="neuro-explorer-empty">
        <Brain size={32} />
        <p>Aucun domaine fonctionnel disponible pour cet atlas.</p>
      </div>
    )
  }

  return (
    <div className="neuro-explorer-container" data-testid="neuro-explorer">
      <div className="neuro-explorer-header">
        <div className="neuro-title-row">
          <Brain size={20} className="neuro-header-icon" />
          <h3>Cartographie Fonctionnelle Cérébrale</h3>
        </div>
        <p className="neuro-subtitle">
          Explorez les réseaux cognitifs, moteurs et sensoriels intégrés du cortex cérébral.
        </p>

        <div className="neuro-domain-tabs" role="tablist">
          {domains.map((domain) => {
            const isSelected = domain.id === activeDomain.id
            return (
              <button
                key={domain.id}
                role="tab"
                aria-selected={isSelected}
                className={`neuro-domain-tab ${isSelected ? 'is-active' : ''}`}
                onClick={() => setActiveDomainId(domain.id)}
              >
                {getDomainIcon(domain.id)}
                <span>{domain.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {activeDomain && (
        <div className="neuro-domain-content">
          <div className="domain-intro-card">
            <h4>{activeDomain.name}</h4>
            <p className="domain-desc">{activeDomain.description}</p>
          </div>

          <div className="domain-structures-section">
            <h5>
              <Sparkles size={16} /> Structures anatomiques du réseau :
            </h5>
            <div className="structure-tags-grid">
              {activeDomain.associatedStructureIds.map((structId) => {
                const isFocused = structId === selectedStructureId
                return (
                  <button
                    key={structId}
                    className={`structure-tag-btn ${isFocused ? 'is-focused' : ''}`}
                    onClick={() => onSelectStructure(structId)}
                  >
                    <span className="dot-indicator" />
                    <span>{structId.replace(/_/g, ' ')}</span>
                    <ArrowRight size={14} className="tag-arrow" />
                  </button>
                )
              })}
            </div>
          </div>

          {activeDomain.circuits && activeDomain.circuits.length > 0 && (
            <div className="domain-circuits-section">
              <h5>
                <Activity size={16} /> Circuit & Trajet physiologique :
              </h5>
              <div className="circuits-stepper">
                {activeDomain.circuits.map((circuit, idx) => (
                  <div key={idx} className="circuit-step-item">
                    <div className="circuit-step-number">{idx + 1}</div>
                    <div className="circuit-step-content">
                      <p className="circuit-name"><strong>{circuit.name}</strong></p>
                      <p className="circuit-mechanism">{circuit.mechanism}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="domain-lesions-card">
            <div className="lesions-card-header">
              <AlertTriangle size={18} className="lesion-icon" />
              <h5>Sémiologie Lésionnelle & Corrélations Cliniques</h5>
            </div>
            <ul className="lesions-list">
              {activeDomain.circuits.map((c, idx) => (
                <li key={idx} className="lesion-item">
                  <CheckCircle2 size={15} className="bullet-check" />
                  <span><strong>{c.name} :</strong> {c.pathologies}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
