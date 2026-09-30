import React from 'react'
import { Compass, GitBranch, HelpCircle, Stethoscope, Sparkles } from 'lucide-react'
import type { AtlasId, AtlasMode } from './types'

interface AtlasModeSelectorProps {
  atlasId: AtlasId
  activeMode: AtlasMode
  onSelectMode: (mode: AtlasMode) => void
}

export const AtlasModeSelector: React.FC<AtlasModeSelectorProps> = ({
  atlasId,
  activeMode,
  onSelectMode
}) => {
  const modes: { id: AtlasMode; label: string; shortLabel: string; icon: React.FC<{ size?: number }> }[] = [
    { id: 'explore', label: 'Explorer', shortLabel: 'Explorer', icon: Compass },
    { id: 'pathway', label: 'Parcours anatomiques', shortLabel: 'Parcours', icon: GitBranch },
    { id: 'test', label: 'Quiz anatomique', shortLabel: 'Quiz', icon: HelpCircle },
    { id: 'clinical', label: 'Cas cliniques', shortLabel: 'Clinique', icon: Stethoscope },
    ...(atlasId === 'brain' ? [{ id: 'neuro' as AtlasMode, label: 'Fonctions cérébrales', shortLabel: 'Fonctions', icon: Sparkles }] : [])
  ]

  return (
    <nav className="atlas-mode-selector" aria-label="Modes de l’atlas" role="tablist">
      <div className="atlas-mode-tabs">
        {modes.map(mode => {
          const Icon = mode.icon
          const isActive = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              className={`atlas-mode-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectMode(mode.id)}
              aria-pressed={isActive}
              aria-selected={isActive}
              title={mode.label}
            >
              <Icon size={16} />
              <span>{mode.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
