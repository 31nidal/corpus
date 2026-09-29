import React from 'react'
import type { AtlasStructure } from '../types'

interface BrainDrawingsProps {
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

export const BrainDrawings: React.FC<BrainDrawingsProps> = ({
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

  const getStrokeColor = (id: string, defaultColor = '#3b82f6') => {
    if (isClinical(id)) return '#ef4444'
    if (isSelected(id)) return '#0284c7'
    if (isPath(id)) return '#10b981'
    if (isHovered(id)) return '#60a5fa'
    return defaultColor
  }

  const getFillColor = (id: string, defaultColor: string) => {
    if (isClinical(id)) return 'rgba(239, 68, 68, 0.35)'
    if (isSelected(id)) return 'rgba(14, 165, 233, 0.3)'
    if (isPath(id)) return 'rgba(16, 185, 129, 0.28)'
    if (isHovered(id)) return 'rgba(96, 165, 250, 0.22)'
    return defaultColor
  }

  return (
    <div className="atlas-svg-container">
      <svg
        viewBox="0 0 800 600"
        className="atlas-svg"
        role="img"
        aria-label={`Schéma anatomique du cerveau - ${viewId}`}
      >
        <defs>
          <linearGradient id="brainCortexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--cortex-start, #fce7f3)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--cortex-end, #fbcfe8)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="cerebellumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--cerebellum-start, #fed7aa)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--cerebellum-end, #fdba74)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="brainstemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brainstem-start, #e2e8f0)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--brainstem-end, #cbd5e1)" stopOpacity="0.9" />
          </linearGradient>
          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ===================================================================
            VIEW 1: VUE LATÉRALE EXTERNE
           =================================================================== */}
        {viewId === 'lateral' && (
          <g id="view-lateral" className="brain-view-group">
            {/* Outline general */}
            <path
              d="M 180 320 C 140 250, 160 140, 260 90 C 370 40, 560 50, 660 140 C 730 210, 740 330, 680 400 C 640 450, 560 480, 500 440 C 450 410, 360 450, 280 440 C 200 430, 180 380, 180 320 Z"
              fill="var(--brain-bg, #f8fafc)"
              stroke="var(--brain-stroke, #94a3b8)"
              strokeWidth="2"
            />

            {/* Frontal Lobe */}
            <path
              id="brain-frontal-lobe"
              d="M 260 90 C 360 50, 430 80, 440 210 C 420 310, 340 360, 230 350 C 170 330, 160 180, 260 90 Z"
              fill={getFillColor('frontal_lobe', 'rgba(147, 197, 253, 0.35)')}
              stroke={getStrokeColor('frontal_lobe', '#3b82f6')}
              strokeWidth={isSelected('frontal_lobe') || isHovered('frontal_lobe') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('frontal_lobe')}
              onMouseEnter={() => onHoverStructure('frontal_lobe')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Parietal Lobe */}
            <path
              id="brain-parietal-lobe"
              d="M 440 80 C 560 70, 640 120, 640 230 C 590 260, 520 270, 450 220 C 430 150, 435 110, 440 80 Z"
              fill={getFillColor('parietal_lobe', 'rgba(196, 181, 253, 0.35)')}
              stroke={getStrokeColor('parietal_lobe', '#8b5cf6')}
              strokeWidth={isSelected('parietal_lobe') || isHovered('parietal_lobe') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('parietal_lobe')}
              onMouseEnter={() => onHoverStructure('parietal_lobe')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Occipital Lobe */}
            <path
              id="brain-occipital-lobe"
              d="M 640 230 C 720 260, 730 350, 670 410 C 620 400, 590 330, 600 270 C 615 250, 630 240, 640 230 Z"
              fill={getFillColor('occipital_lobe', 'rgba(253, 164, 175, 0.35)')}
              stroke={getStrokeColor('occipital_lobe', '#f43f5e')}
              strokeWidth={isSelected('occipital_lobe') || isHovered('occipital_lobe') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('occipital_lobe')}
              onMouseEnter={() => onHoverStructure('occipital_lobe')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Temporal Lobe */}
            <path
              id="brain-temporal-lobe"
              d="M 270 340 C 370 330, 480 320, 580 320 C 570 420, 460 440, 340 430 C 260 420, 240 370, 270 340 Z"
              fill={getFillColor('temporal_lobe', 'rgba(110, 231, 183, 0.35)')}
              stroke={getStrokeColor('temporal_lobe', '#10b981')}
              strokeWidth={isSelected('temporal_lobe') || isHovered('temporal_lobe') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('temporal_lobe')}
              onMouseEnter={() => onHoverStructure('temporal_lobe')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Cerebellum */}
            <path
              id="brain-cerebellum"
              d="M 540 420 C 660 410, 710 470, 660 530 C 600 570, 520 540, 500 480 C 490 450, 510 430, 540 420 Z"
              fill={getFillColor('cerebellum', 'url(#cerebellumGrad)')}
              stroke={getStrokeColor('cerebellum', '#f59e0b')}
              strokeWidth={isSelected('cerebellum') || isHovered('cerebellum') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('cerebellum')}
              onMouseEnter={() => onHoverStructure('cerebellum')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Brainstem */}
            <path
              id="brain-brainstem"
              d="M 440 420 L 480 420 L 460 550 L 420 550 Z"
              fill={getFillColor('brainstem', 'url(#brainstemGrad)')}
              stroke={getStrokeColor('brainstem', '#64748b')}
              strokeWidth={isSelected('brainstem') || isHovered('brainstem') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('brainstem')}
              onMouseEnter={() => onHoverStructure('brainstem')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Sulci details */}
            <path d="M 440 75 Q 430 180 435 250" fill="none" stroke="var(--sulcus, #64748b)" strokeWidth="2.5" strokeDasharray="4 2" />
            <path d="M 270 335 Q 420 330 570 300" fill="none" stroke="var(--sulcus, #64748b)" strokeWidth="2.5" strokeDasharray="4 2" />
          </g>
        )}

        {/* ===================================================================
            VIEW 2: VUE SAGITTALE MÉDIANE
           =================================================================== */}
        {viewId === 'sagittal' && (
          <g id="view-sagittal" className="brain-view-group">
            {/* Hemispheric medial contour */}
            <path
              d="M 220 380 C 150 260, 200 110, 340 70 C 500 30, 680 80, 700 240 C 710 350, 650 420, 580 420 L 480 420 L 440 560 L 390 560 L 420 420 C 320 430, 260 440, 220 380 Z"
              fill="var(--brain-bg, #f8fafc)"
              stroke="var(--brain-stroke, #94a3b8)"
              strokeWidth="2"
            />

            {/* Corpus Callosum (Arched band) */}
            <path
              id="brain-corpus-callosum"
              d="M 320 280 C 310 210, 360 170, 480 170 C 580 170, 610 220, 600 270 C 580 230, 540 210, 480 210 C 380 210, 340 240, 320 280 Z"
              fill={getFillColor('corpus_callosum', 'rgba(244, 114, 182, 0.4)')}
              stroke={getStrokeColor('corpus_callosum', '#ec4899')}
              strokeWidth={isSelected('corpus_callosum') || isHovered('corpus_callosum') ? 3.5 : 2.5}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('corpus_callosum')}
              onMouseEnter={() => onHoverStructure('corpus_callosum')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Thalamus (Egg shape) */}
            <ellipse
              id="brain-thalamus"
              cx="470"
              cy="280"
              rx="55"
              ry="40"
              fill={getFillColor('thalamus', 'rgba(147, 197, 253, 0.5)')}
              stroke={getStrokeColor('thalamus', '#3b82f6')}
              strokeWidth={isSelected('thalamus') || isHovered('thalamus') ? 3.5 : 2.5}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('thalamus')}
              onMouseEnter={() => onHoverStructure('thalamus')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Hypothalamus */}
            <polygon
              id="brain-hypothalamus"
              points="430,300 480,310 450,360 410,340"
              fill={getFillColor('hypothalamus', 'rgba(251, 191, 36, 0.5)')}
              stroke={getStrokeColor('hypothalamus', '#f59e0b')}
              strokeWidth={isSelected('hypothalamus') || isHovered('hypothalamus') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('hypothalamus')}
              onMouseEnter={() => onHoverStructure('hypothalamus')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Fourth Ventricle (V4) */}
            <polygon
              id="brain-fourth-ventricle"
              points="490,430 530,460 490,500 460,460"
              fill={getFillColor('fourth_ventricle', 'rgba(56, 189, 248, 0.6)')}
              stroke={getStrokeColor('fourth_ventricle', '#0284c7')}
              strokeWidth={isSelected('fourth_ventricle') || isHovered('fourth_ventricle') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('fourth_ventricle')}
              onMouseEnter={() => onHoverStructure('fourth_ventricle')}
              onMouseLeave={() => onHoverStructure(null)}
            />
          </g>
        )}

        {/* ===================================================================
            VIEW 3: COUPE FRONTALE DE CHARCOT
           =================================================================== */}
        {viewId === 'coronal_charcot' && (
          <g id="view-charcot" className="brain-view-group">
            {/* Coronal bilateral hemispheres */}
            <path
              d="M 400 80 C 260 80, 160 180, 160 340 C 160 480, 280 540, 400 540 C 520 540, 640 480, 640 340 C 640 180, 540 80, 400 80 Z"
              fill="var(--brain-bg, #f8fafc)"
              stroke="var(--brain-stroke, #94a3b8)"
              strokeWidth="2"
            />

            {/* Ventricules latéraux */}
            <path d="M 370 240 Q 330 200 380 170 Q 400 210 370 240 Z" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
            <path d="M 430 240 Q 470 200 420 170 Q 400 210 430 240 Z" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />

            {/* Caudate Nucleus (Left & Right) */}
            <ellipse
              id="brain-caudate-left"
              cx="330"
              cy="230"
              rx="30"
              ry="22"
              fill={getFillColor('caudate_nucleus', 'rgba(167, 139, 250, 0.45)')}
              stroke={getStrokeColor('caudate_nucleus', '#8b5cf6')}
              strokeWidth={isSelected('caudate_nucleus') || isHovered('caudate_nucleus') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('caudate_nucleus')}
              onMouseEnter={() => onHoverStructure('caudate_nucleus')}
              onMouseLeave={() => onHoverStructure(null)}
            />
            <ellipse
              id="brain-caudate-right"
              cx="470"
              cy="230"
              rx="30"
              ry="22"
              fill={getFillColor('caudate_nucleus', 'rgba(167, 139, 250, 0.45)')}
              stroke={getStrokeColor('caudate_nucleus', '#8b5cf6')}
              strokeWidth={isSelected('caudate_nucleus') || isHovered('caudate_nucleus') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('caudate_nucleus')}
              onMouseEnter={() => onHoverStructure('caudate_nucleus')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Putamen & Globus Pallidus */}
            <polygon
              id="brain-lenticular-left"
              points="240,280 300,260 290,360 230,340"
              fill={getFillColor('putamen_globus', 'rgba(251, 146, 60, 0.45)')}
              stroke={getStrokeColor('putamen_globus', '#ea580c')}
              strokeWidth={isSelected('putamen_globus') || isHovered('putamen_globus') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('putamen_globus')}
              onMouseEnter={() => onHoverStructure('putamen_globus')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Internal Capsule (V-shaped white matter band) */}
            <path
              id="brain-internal-capsule"
              d="M 305 230 L 330 310 L 300 370"
              fill="none"
              stroke={getStrokeColor('internal_capsule', '#f59e0b')}
              strokeWidth={isSelected('internal_capsule') || isHovered('internal_capsule') ? 14 : 10}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('internal_capsule')}
              onMouseEnter={() => onHoverStructure('internal_capsule')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Hippocampus */}
            <path
              id="brain-hippocampus-left"
              d="M 280 430 C 260 410, 320 390, 330 430 C 335 450, 300 460, 280 430 Z"
              fill={getFillColor('hippocampus', 'rgba(16, 185, 129, 0.5)')}
              stroke={getStrokeColor('hippocampus', '#059669')}
              strokeWidth={isSelected('hippocampus') || isHovered('hippocampus') ? 3.5 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('hippocampus')}
              onMouseEnter={() => onHoverStructure('hippocampus')}
              onMouseLeave={() => onHoverStructure(null)}
            />
          </g>
        )}

        {/* ===================================================================
            VIEW 4: BASE DU CRÂNE & NERFS CRÂNIENS
           =================================================================== */}
        {viewId === 'base_cranial' && (
          <g id="view-cranial-nerves" className="brain-view-group">
            <path
              d="M 240 180 C 200 280, 220 460, 400 520 C 580 460, 600 280, 560 180 C 500 120, 300 120, 240 180 Z"
              fill="var(--brain-bg, #f8fafc)"
              stroke="var(--brain-stroke, #94a3b8)"
              strokeWidth="2"
            />

            {/* Optic Nerves & Chiasma (NC II) */}
            <g
              id="brain-cn2-optic"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('cn_2_optic')}
              onMouseEnter={() => onHoverStructure('cn_2_optic')}
              onMouseLeave={() => onHoverStructure(null)}
            >
              <path
                d="M 340 170 L 400 220 L 460 170 M 400 220 L 370 260 M 400 220 L 430 260"
                fill="none"
                stroke={getStrokeColor('cn_2_optic', '#0284c7')}
                strokeWidth={isSelected('cn_2_optic') || isHovered('cn_2_optic') ? 8 : 5}
                strokeLinecap="round"
              />
              <circle cx="400" cy="220" r="10" fill={getStrokeColor('cn_2_optic', '#0284c7')} />
            </g>

            {/* Trigeminal Nerve (NC V) */}
            <circle
              id="brain-cn5-trigeminal"
              cx="310"
              cy="340"
              r="14"
              fill={getFillColor('cn_5_trigeminal', 'rgba(245, 158, 11, 0.6)')}
              stroke={getStrokeColor('cn_5_trigeminal', '#d97706')}
              strokeWidth={isSelected('cn_5_trigeminal') || isHovered('cn_5_trigeminal') ? 4 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('cn_5_trigeminal')}
              onMouseEnter={() => onHoverStructure('cn_5_trigeminal')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Facial Nerve (NC VII) */}
            <circle
              id="brain-cn7-facial"
              cx="320"
              cy="400"
              r="12"
              fill={getFillColor('cn_7_facial', 'rgba(236, 72, 153, 0.6)')}
              stroke={getStrokeColor('cn_7_facial', '#db2777')}
              strokeWidth={isSelected('cn_7_facial') || isHovered('cn_7_facial') ? 4 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('cn_7_facial')}
              onMouseEnter={() => onHoverStructure('cn_7_facial')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Vagus Nerve (NC X) */}
            <circle
              id="brain-cn10-vagus"
              cx="350"
              cy="470"
              r="12"
              fill={getFillColor('cn_10_vagus', 'rgba(16, 185, 129, 0.6)')}
              stroke={getStrokeColor('cn_10_vagus', '#059669')}
              strokeWidth={isSelected('cn_10_vagus') || isHovered('cn_10_vagus') ? 4 : 2}
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('cn_10_vagus')}
              onMouseEnter={() => onHoverStructure('cn_10_vagus')}
              onMouseLeave={() => onHoverStructure(null)}
            />
          </g>
        )}

        {/* ===================================================================
            VIEW 5: POLYGONE DE WILLIS
           =================================================================== */}
        {viewId === 'vascular_willis' && (
          <g id="view-willis" className="brain-view-group">
            {/* Background circle guideline */}
            <ellipse cx="400" cy="300" rx="140" ry="120" fill="none" stroke="var(--brain-stroke, #e2e8f0)" strokeWidth="1" strokeDasharray="5 5" />

            {/* Basilar Artery */}
            <path
              id="brain-basilar-artery"
              d="M 400 480 L 400 340"
              fill="none"
              stroke={getStrokeColor('basilar_artery', '#dc2626')}
              strokeWidth={isSelected('basilar_artery') || isHovered('basilar_artery') ? 10 : 7}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('basilar_artery')}
              onMouseEnter={() => onHoverStructure('basilar_artery')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Posterior Cerebral Arteries (PCA) */}
            <path d="M 400 340 L 330 310 M 400 340 L 470 310" fill="none" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />

            {/* Middle Cerebral Arteries (MCA / Sylvienne) */}
            <path
              id="brain-mca-left"
              d="M 330 260 L 210 240"
              fill="none"
              stroke={getStrokeColor('mca_artery', '#dc2626')}
              strokeWidth={isSelected('mca_artery') || isHovered('mca_artery') ? 11 : 7}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('mca_artery')}
              onMouseEnter={() => onHoverStructure('mca_artery')}
              onMouseLeave={() => onHoverStructure(null)}
            />
            <path
              id="brain-mca-right"
              d="M 470 260 L 590 240"
              fill="none"
              stroke={getStrokeColor('mca_artery', '#dc2626')}
              strokeWidth={isSelected('mca_artery') || isHovered('mca_artery') ? 11 : 7}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('mca_artery')}
              onMouseEnter={() => onHoverStructure('mca_artery')}
              onMouseLeave={() => onHoverStructure(null)}
            />

            {/* Anterior Cerebral Arteries (ACA) & AComA */}
            <path
              id="brain-aca-artery"
              d="M 340 250 L 380 160 L 420 160 L 460 250"
              fill="none"
              stroke={getStrokeColor('aca_artery', '#dc2626')}
              strokeWidth={isSelected('aca_artery') || isHovered('aca_artery') ? 9 : 6}
              strokeLinecap="round"
              className="atlas-interactive-shape"
              onClick={() => onSelectStructure('aca_artery')}
              onMouseEnter={() => onHoverStructure('aca_artery')}
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
              {/* Pulse ripple if active/path */}
              {(selected || path || clinical) && (
                <circle
                  r="18"
                  fill={clinical ? 'rgba(239, 68, 68, 0.4)' : path ? 'rgba(16, 185, 129, 0.4)' : 'rgba(2, 132, 199, 0.4)'}
                  className="atlas-pulse-ring"
                />
              )}

              {/* Pin circle */}
              <circle
                r={selected || hovered ? 11 : 8}
                fill={clinical ? '#ef4444' : path ? '#10b981' : selected ? '#0284c7' : hovered ? '#38bdf8' : '#ffffff'}
                stroke={clinical ? '#b91c1c' : selected ? '#0369a1' : '#475569'}
                strokeWidth="2.5"
                filter="url(#glowEffect)"
              />

              {/* Text label */}
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
