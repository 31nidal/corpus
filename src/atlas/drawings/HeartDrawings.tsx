import React from 'react'
import type { AtlasStructure } from '../types'

interface HeartDrawingsProps {
  viewId: string
  structures: AtlasStructure[]
  activeStructureId: string | null
  hoveredStructureId: string | null
  onSelectStructure: (id: string) => void
  onHoverStructure: (id: string | null) => void
  showLabels?: boolean
  highlightedPathStructureIds?: string[]
  clinicalAffectedIds?: string[]
  isTestMode?: boolean
}

export const HeartDrawings: React.FC<HeartDrawingsProps> = ({
  viewId,
  structures,
  activeStructureId,
  hoveredStructureId,
  onSelectStructure,
  onHoverStructure,
  showLabels = true,
  highlightedPathStructureIds = [],
  clinicalAffectedIds = [],
  isTestMode = false
}) => {
  const isSelected = (id: string) => activeStructureId === id
  const isHovered = (id: string) => hoveredStructureId === id
  const isPath = (id: string) => highlightedPathStructureIds.includes(id)
  const isClinical = (id: string) => clinicalAffectedIds.includes(id)

  const getStrokeColor = (id: string, defaultColor = '#dc2626') => {
    if (isClinical(id)) return '#ef4444'
    if (isSelected(id)) return '#0284c7'
    if (isPath(id)) return '#10b981'
    if (isHovered(id)) return '#f87171'
    return defaultColor
  }

  const getFillColor = (id: string, defaultColor: string) => {
    if (isClinical(id)) return 'rgba(239, 68, 68, 0.45)'
    if (isSelected(id)) return 'rgba(14, 165, 233, 0.35)'
    if (isPath(id)) return 'rgba(16, 185, 129, 0.35)'
    if (isHovered(id)) return 'rgba(248, 113, 113, 0.3)'
    return defaultColor
  }

  return (
    <div className="atlas-svg-container">
      <svg
        viewBox="0 0 800 600"
        className="atlas-svg"
        role="img"
        aria-label={`Schéma anatomique du cœur - ${viewId}`}
      >
        <defs>
          <linearGradient id="lvWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="rvWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="aortaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="pulmonaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="heartGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ===================================================================
            VIEW 1: MORPHOLOGIE ANTÉRIEURE EXTERNE
           =================================================================== */}
        {viewId === 'morphology_anterior' && (
          <g id="view-anterior" className="heart-view-group">
            {/* Superior Vena Cava (VCS) */}
            <path d="M 280 80 L 280 220 L 320 220 L 320 80 Z" fill="url(#pulmonaryGrad)" stroke="#1e40af" strokeWidth="2" />

            {/* Ascending Aorta & Arch */}
            <path
              id="heart-aorta"
              d="M 360 220 C 360 110, 420 80, 500 90 C 530 95, 540 120, 540 160 L 510 160 C 510 130, 480 120, 430 130 C 400 140, 390 180, 390 220 Z"
              fill={getFillColor('aorta_ascending', 'url(#aortaGrad)')}
              stroke={getStrokeColor('aorta_ascending', '#991b1b')}
              strokeWidth={isSelected('aorta_ascending') || isHovered('aorta_ascending') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('aorta_ascending')}
              onMouseEnter={() => onHoverStructure('aorta_ascending')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Pulmonary Trunk */}
            <path
              id="heart-pulmonary-trunk"
              d="M 430 200 C 470 180, 530 190, 560 170 L 580 200 C 530 230, 470 230, 430 240 Z"
              fill={getFillColor('pulmonary_trunk', 'url(#pulmonaryGrad)')}
              stroke={getStrokeColor('pulmonary_trunk', '#1e40af')}
              strokeWidth={isSelected('pulmonary_trunk') || isHovered('pulmonary_trunk') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('pulmonary_trunk')}
              onMouseEnter={() => onHoverStructure('pulmonary_trunk')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Right Atrium */}
            <path
              id="heart-ra-ext"
              d="M 260 230 C 220 270, 230 380, 310 400 L 330 280 C 310 240, 280 230, 260 230 Z"
              fill={getFillColor('right_atrium_ext', 'rgba(147, 197, 253, 0.4)')}
              stroke={getStrokeColor('right_atrium_ext', '#2563eb')}
              strokeWidth={isSelected('right_atrium_ext') || isHovered('right_atrium_ext') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('right_atrium_ext')}
              onMouseEnter={() => onHoverStructure('right_atrium_ext')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Left Ventricle & Apex */}
            <path
              id="heart-lv-ext"
              d="M 420 310 L 580 340 C 640 420, 590 530, 480 550 C 420 540, 400 480, 400 400 Z"
              fill={getFillColor('left_ventricle_ext', 'rgba(248, 113, 113, 0.4)')}
              stroke={getStrokeColor('left_ventricle_ext', '#dc2626')}
              strokeWidth={isSelected('left_ventricle_ext') || isHovered('left_ventricle_ext') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('left_ventricle_ext')}
              onMouseEnter={() => onHoverStructure('left_ventricle_ext')}
              onMouseLeave={() => onHoverStructure(null)}
            />
          </g>
        )}

        {/* ===================================================================
            VIEW 2: COUPE 4 CAVITÉS & VALVES
           =================================================================== */}
        {viewId === 'chambers_valves' && (
          <g id="view-chambers" className="heart-view-group">
            {/* Myocardial background / contour */}
            <path
              d="M 220 260 C 200 420, 300 560, 480 570 C 660 550, 680 380, 640 250 C 580 180, 300 180, 220 260 Z"
              fill="var(--heart-bg, #fff1f2)"
              stroke="var(--heart-stroke, #e11d48)"
              strokeWidth="2.5"
            />

            {/* Left Ventricular thick wall (8-11mm) */}
            <path
              id="heart-lv-thick"
              d="M 500 350 C 580 350, 650 410, 630 520 C 580 550, 520 540, 480 540 L 480 490 C 510 490, 560 480, 570 430 C 570 390, 530 380, 490 380 Z"
              fill={getFillColor('left_ventricle', 'url(#lvWallGrad)')}
              stroke={getStrokeColor('left_ventricle', '#991b1b')}
              strokeWidth={isSelected('left_ventricle') || isHovered('left_ventricle') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('left_ventricle')}
              onMouseEnter={() => onHoverStructure('left_ventricle')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Right Ventricle thin wall */}
            <path
              id="heart-rv-thin"
              d="M 330 350 C 280 370, 250 420, 260 490 C 310 520, 370 520, 410 510 L 400 470 C 360 480, 310 470, 290 440 C 280 410, 300 380, 340 370 Z"
              fill={getFillColor('right_ventricle', 'url(#rvWallGrad)')}
              stroke={getStrokeColor('right_ventricle', '#1e40af')}
              strokeWidth={isSelected('right_ventricle') || isHovered('right_ventricle') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('right_ventricle')}
              onMouseEnter={() => onHoverStructure('right_ventricle')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Interventricular Septum */}
            <path
              id="heart-ivs"
              d="M 420 330 L 460 330 L 470 540 L 430 540 Z"
              fill={getFillColor('interventricular_septum', '#fda4af')}
              stroke={getStrokeColor('interventricular_septum', '#e11d48')}
              strokeWidth={isSelected('interventricular_septum') || isHovered('interventricular_septum') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('interventricular_septum')}
              onMouseEnter={() => onHoverStructure('interventricular_septum')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Aortic Valve */}
            <ellipse
              id="heart-valve-aortic"
              cx="440"
              cy="280"
              rx="22"
              ry="12"
              fill={getFillColor('aortic_valve', '#fef08a')}
              stroke={getStrokeColor('aortic_valve', '#ca8a04')}
              strokeWidth={isSelected('aortic_valve') || isHovered('aortic_valve') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('aortic_valve')}
              onMouseEnter={() => onHoverStructure('aortic_valve')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Mitral Valve (Bicuspid) */}
            <path
              id="heart-valve-mitral"
              d="M 490 320 C 530 310, 560 330, 570 350 M 500 335 L 530 420 M 550 335 L 540 420"
              fill="none"
              stroke={getStrokeColor('mitral_valve', '#d97706')}
              strokeWidth={isSelected('mitral_valve') || isHovered('mitral_valve') ? 4 : 2.5}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('mitral_valve')}
              onMouseEnter={() => onHoverStructure('mitral_valve')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Tricuspid Valve */}
            <path
              id="heart-valve-tricuspid"
              d="M 310 320 C 340 310, 380 320, 390 350 M 330 330 L 350 420 M 370 330 L 360 420"
              fill="none"
              stroke={getStrokeColor('tricuspid_valve', '#2563eb')}
              strokeWidth={isSelected('tricuspid_valve') || isHovered('tricuspid_valve') ? 4 : 2.5}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('tricuspid_valve')}
              onMouseEnter={() => onHoverStructure('tricuspid_valve')}
              onMouseLeave={() => onHoverStructure(null)}
            />
          </g>
        )}

        {/* ===================================================================
            VIEW 3: RÉSEAU CORONAIRE
           =================================================================== */}
        {viewId === 'coronary_tree' && (
          <g id="view-coronary" className="heart-view-group">
            {/* Heart shadow outline */}
            <path d="M 280 200 C 220 340, 300 520, 480 550 C 640 520, 680 320, 580 200 Z" fill="var(--heart-bg, #fff1f2)" stroke="#e2e8f0" strokeWidth="2" />

            {/* Left Anterior Descending (LAD / IVA) */}
            <path
              id="heart-lad"
              d="M 450 240 Q 440 350 460 430 T 480 540 M 448 320 L 400 370 M 455 380 L 420 440 M 452 290 L 510 330"
              fill="none"
              stroke={getStrokeColor('lad_artery', '#dc2626')}
              strokeWidth={isSelected('lad_artery') || isHovered('lad_artery') ? 8 : 5.5}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('lad_artery')}
              onMouseEnter={() => onHoverStructure('lad_artery')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Circumflex Artery (Cx) */}
            <path
              id="heart-cx"
              d="M 450 240 Q 540 260 590 310 T 620 420 M 560 280 L 610 340"
              fill="none"
              stroke={getStrokeColor('cx_artery', '#e11d48')}
              strokeWidth={isSelected('cx_artery') || isHovered('cx_artery') ? 8 : 5}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('cx_artery')}
              onMouseEnter={() => onHoverStructure('cx_artery')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Right Coronary Artery (RCA / CD) */}
            <path
              id="heart-rca"
              d="M 390 240 Q 320 280 310 380 T 360 480 M 315 340 L 260 380"
              fill="none"
              stroke={getStrokeColor('rca_artery', '#ea580c')}
              strokeWidth={isSelected('rca_artery') || isHovered('rca_artery') ? 8 : 5}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('rca_artery')}
              onMouseEnter={() => onHoverStructure('rca_artery')}
              onMouseLeave={() => onHoverStructure(null)}
            />
          </g>
        )}

        {/* ===================================================================
            VIEW 4: TISSU NODAL & CONDUCTION ECG
           =================================================================== */}
        {viewId === 'conduction_ecg' && (
          <g id="view-conduction" className="heart-view-group">
            {/* Heart frame */}
            <path d="M 280 200 C 220 340, 300 520, 480 550 C 640 520, 680 320, 580 200 Z" fill="var(--heart-bg, #f8fafc)" stroke="#94a3b8" strokeWidth="2" />

            {/* Sinoatrial Node (SA Node) */}
            <ellipse
              id="heart-sa-node"
              cx="310"
              cy="230"
              rx="16"
              ry="10"
              fill={getFillColor('sa_node', '#facc15')}
              stroke={getStrokeColor('sa_node', '#ca8a04')}
              strokeWidth={isSelected('sa_node') || isHovered('sa_node') ? 4 : 2.5}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('sa_node')}
              onMouseEnter={() => onHoverStructure('sa_node')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Internodal pathways */}
            <path d="M 310 240 Q 350 280 400 310" fill="none" stroke="#eab308" strokeWidth="3" strokeDasharray="4 3" />

            {/* Atrioventricular Node (AV Node) */}
            <ellipse
              id="heart-av-node"
              cx="405"
              cy="315"
              rx="14"
              ry="10"
              fill={getFillColor('av_node', '#fb923c')}
              stroke={getStrokeColor('av_node', '#ea580c')}
              strokeWidth={isSelected('av_node') || isHovered('av_node') ? 4 : 2.5}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('av_node')}
              onMouseEnter={() => onHoverStructure('av_node')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Bundle of His & Purkinje fibers */}
            <path
              id="heart-his-purkinje"
              d="M 410 325 L 430 370 M 430 370 Q 420 440 380 490 M 430 370 Q 460 440 520 490 M 380 490 Q 340 460 310 410 M 520 490 Q 560 460 600 400"
              fill="none"
              stroke={getStrokeColor('his_purkinje', '#10b981')}
              strokeWidth={isSelected('his_purkinje') || isHovered('his_purkinje') ? 6 : 4}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('his_purkinje')}
              onMouseEnter={() => onHoverStructure('his_purkinje')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Mini ECG Correlate Panel (Bottom Right) */}
            <g transform="translate(520, 420)" className="ecg-correlate-box">
              <rect x="0" y="0" width="240" height="130" rx="8" fill="var(--ecg-bg, #0f172a)" stroke="#334155" strokeWidth="1.5" />
              {/* Grid lines */}
              <path d="M 0 32.5 L 240 32.5 M 0 65 L 240 65 M 0 97.5 L 240 97.5 M 60 0 L 60 130 M 120 0 L 120 130 M 180 0 L 180 130" fill="none" stroke="rgba(51, 65, 85, 0.4)" strokeWidth="1" />
              {/* ECG trace */}
              <path
                d="M 15 65 L 40 65 Q 50 48 60 65 L 80 65 L 85 75 L 95 15 L 105 85 L 112 65 L 135 65 Q 155 35 175 65 L 225 65"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x="50" y="42" fill="#eab308" fontSize="11" fontWeight="bold">P</text>
              <text x="92" y="12" fill="#38bdf8" fontSize="11" fontWeight="bold">R</text>
              <text x="155" y="32" fill="#ec4899" fontSize="11" fontWeight="bold">T</text>
            </g>
          </g>
        )}

        {/* ===================================================================
            VIEW 5: FOYERS D’AUSCULTATION
           =================================================================== */}
        {viewId === 'auscultation' && (
          <g id="view-auscultation" className="heart-view-group">
            {/* Sternum and ribs schematic silhouette */}
            <path d="M 370 120 L 430 120 L 415 450 L 385 450 Z" fill="rgba(203, 213, 225, 0.4)" stroke="#94a3b8" strokeWidth="2" />
            <path d="M 400 450 L 400 490" stroke="#94a3b8" strokeWidth="3" /> {/* Xiphoïde */}
            <path d="M 280 180 Q 370 200 400 200 Q 430 200 520 180 M 260 250 Q 370 270 400 270 Q 430 270 540 250 M 240 330 Q 370 350 400 350 Q 430 350 560 330 M 220 420 Q 370 440 400 440 Q 430 440 580 420" fill="none" stroke="#cbd5e1" strokeWidth="3.5" />

            {/* Aortic Focus (2e EIC droit) */}
            <circle
              id="focus-aortic"
              cx="350"
              cy="230"
              r="24"
              fill={getFillColor('aortic_focus', 'rgba(239, 68, 68, 0.35)')}
              stroke={getStrokeColor('aortic_focus', '#dc2626')}
              strokeWidth={isSelected('aortic_focus') || isHovered('aortic_focus') ? 4 : 2.5}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('aortic_focus')}
              onMouseEnter={() => onHoverStructure('aortic_focus')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Pulmonary Focus (2e EIC gauche) */}
            <circle
              id="focus-pulmonary"
              cx="450"
              cy="230"
              r="24"
              fill={getFillColor('pulmonary_focus', 'rgba(59, 130, 246, 0.35)')}
              stroke={getStrokeColor('pulmonary_focus', '#2563eb')}
              strokeWidth={isSelected('pulmonary_focus') || isHovered('pulmonary_focus') ? 4 : 2.5}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('pulmonary_focus')}
              onMouseEnter={() => onHoverStructure('pulmonary_focus')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Tricuspid Focus (4e/5e EIC gauche / xiphoïde) */}
            <circle
              id="focus-tricuspid"
              cx="370"
              cy="385"
              r="24"
              fill={getFillColor('tricuspid_focus', 'rgba(245, 158, 11, 0.35)')}
              stroke={getStrokeColor('tricuspid_focus', '#d97706')}
              strokeWidth={isSelected('tricuspid_focus') || isHovered('tricuspid_focus') ? 4 : 2.5}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('tricuspid_focus')}
              onMouseEnter={() => onHoverStructure('tricuspid_focus')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Mitral Focus (Apexien / 5e EIC gauche médiolaviculaire) */}
            <circle
              id="focus-mitral"
              cx="520"
              cy="435"
              r="24"
              fill={getFillColor('mitral_focus', 'rgba(236, 72, 153, 0.35)')}
              stroke={getStrokeColor('mitral_focus', '#db2777')}
              strokeWidth={isSelected('mitral_focus') || isHovered('mitral_focus') ? 4 : 2.5}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('mitral_focus')}
              onMouseEnter={() => onHoverStructure('mitral_focus')}
              onMouseLeave={() => onHoverStructure(null)}
            />
          </g>
        )}

        {/* Hotspots & Pins for the active view structures */}
        {structures.map((s) => {
          const posX = (s.coordinates.x / 100) * 800
          const posY = (s.coordinates.y / 100) * 600
          const selected = isSelected(s.id)
          const hovered = isHovered(s.id)
          const path = isPath(s.id)
          const clinical = isClinical(s.id)

          return (
            <g
              key={s.id}
              className={`atlas-hotspot-pin ${selected ? 'is-selected' : ''} ${hovered ? 'is-hovered' : ''}`}
              transform={`translate(${posX}, ${posY})`}
              onClick={(e) => {
                e.stopPropagation()
                onSelectStructure(s.id)
              }}
              onMouseEnter={() => onHoverStructure(s.id)}
              onMouseLeave={() => onHoverStructure(null)}
              style={{ cursor: 'pointer' }}
            >
              {(selected || path || clinical) && (
                <circle
                  r="18"
                  fill={clinical ? 'rgba(239, 68, 68, 0.4)' : path ? 'rgba(16, 185, 129, 0.4)' : 'rgba(2, 132, 199, 0.4)'}
                  className="atlas-pulse-ring"
                />
              )}

              <circle
                r={selected || hovered ? 11 : 8}
                fill={clinical ? '#ef4444' : path ? '#10b981' : selected ? '#0284c7' : hovered ? '#38bdf8' : '#ffffff'}
                stroke={clinical ? '#b91c1c' : selected ? '#0369a1' : '#475569'}
                strokeWidth="2.5"
                filter="url(#heartGlow)"
              />

              {showLabels && !isTestMode && (
                <text
                  x={posX > 400 ? -16 : 16}
                  y="5"
                  textAnchor={posX > 400 ? 'end' : 'start'}
                  className={`atlas-pin-label ${selected ? 'font-bold' : ''}`}
                  fill="var(--pin-text, #1e293b)"
                  fontSize={selected ? '14' : '12'}
                >
                  {s.name}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
