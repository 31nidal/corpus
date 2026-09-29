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
  const modes: { id: AtlasMode; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: 'explore', label: 'Exploration libre', icon: Compass },
    { id: 'pathway', label: 'Voies & Circuits', icon: GitBranch },
    { id: 'test', label: 'Test & Quiz', icon: HelpCircle },
    { id: 'clinical', label: 'Cas Cliniques', icon: Stethoscope },
    ...(atlasId === 'brain' ? [{ id: 'neuro' as AtlasMode, label: 'Neuro Explorer', icon: Sparkles }] : [])
  ]

  return (
    <nav className="atlas-mode-selector" aria-label="Modes de l’atlas">
      <div className="atlas-mode-tabs">
        {modes.map(mode => {
          const Icon = mode.icon
          const isActive = activeMode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              className={`atlas-mode-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectMode(mode.id)}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              <span>{mode.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
