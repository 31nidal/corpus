import React from 'react'

export interface DrawingRenderProps {
  courseId: string
  arrowId: string
  activeIndex: number
  hoveredIndex: number | null
  onSelectPoint: (index: number) => void
  onHoverPoint: (index: number | null) => void
  isReviewMode?: boolean
  isRevealed?: boolean
}

export default function MedicalDrawingContent({
  courseId,
  arrowId,
  activeIndex,
  hoveredIndex,
  onSelectPoint,
  onHoverPoint,
  isReviewMode = false,
  isRevealed = false
}: DrawingRenderProps) {
  const head = {markerEnd: `url(#${arrowId})`}

  // Helper for interactive structure wrapper
  const structProps = (idx: number, label: string) => {
    const isActive = activeIndex === idx
    const isHovered = hoveredIndex === idx
    const isDimmed = hoveredIndex !== null && hoveredIndex !== idx && !isActive
    const effectiveLabel = isReviewMode && !isRevealed && !isActive ? 'Structure masquée' : label
    return {
      role: 'group',
      tabIndex: 0,
      'aria-label': `Zone anatomique : ${effectiveLabel}`,
      'aria-selected': isActive,
      className: `med-structure ${isActive ? 'is-active' : ''} ${isHovered ? 'is-hovered' : ''} ${isDimmed ? 'is-dimmed' : ''}`,
      onClick: () => onSelectPoint(idx),
      onMouseEnter: () => onHoverPoint(idx),
      onMouseLeave: () => onHoverPoint(null),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectPoint(idx)
        }
      }
    }
  }

  // 1. Cycle cardiaque / Boucle P-V Wiggers
  if (courseId === 'phys-cardiac-cycle') {
    return (
      <g className="drawing-cardiac-cycle">
        {/* Grille et axes */}
        {[80, 160, 240, 320].map(y => (
          <path key={y} className="med-grid" d={`M80 ${y}H580`} />
        ))}
        <path className="med-axis" d="M80 40V355H585" />
        <text x="87" y="28">Pression (mmHg)</text>
        <text x="410" y="389">Volume (mL)</text>
        <text x="38" y="85">120</text>
        <text x="48" y="165">80</text>
        <text x="48" y="245">40</text>
        <text x="55" y="325">0</text>
        <text x="163" y="378">50 (VTS)</text>
        <text x="454" y="378">120 (VTD)</text>

        {/* Aire de la boucle (VES) */}
        <path d="M180 320Q350 323 470 300L470 140Q360 32 180 100Z" fill="var(--med-wash)" />

        {/* 1. Remplissage diastolique */}
        <g {...structProps(0, 'Ouverture de la mitrale')}>
          <path className="med-flow" d="M210 320Q350 321 440 306" {...head} />
          <circle cx="180" cy="320" r="8" fill="var(--med-teal)" className="med-point-marker" />
          <text x="275" y="347" className="med-label">Remplissage diastolique</text>
        </g>

        {/* 2. Contraction isovolumétrique */}
        <g {...structProps(1, 'Fermeture de la mitrale')}>
          <path className="med-flow" d="M470 273V169" {...head} />
          <circle cx="470" cy="300" r="8" fill="var(--med-red)" className="med-point-marker" />
          <text x="485" y="215" className="med-label">Contraction isovolumétrique</text>
        </g>

        {/* 3. Éjection systolique */}
        <g {...structProps(2, 'Ouverture de la valve aortique')}>
          <path className="med-flow med-red" d="M448 118Q330 46 210 93" {...head} />
          <circle cx="470" cy="140" r="8" fill="var(--med-red)" className="med-point-marker" />
          <text x="280" y="60" className="med-label">Éjection systolique</text>
        </g>

        {/* 4. Relaxation isovolumétrique */}
        <g {...structProps(3, 'Fermeture de la valve aortique')}>
          <path className="med-flow" d="M180 127V290" {...head} />
          <circle cx="180" cy="100" r="8" fill="var(--med-teal)" className="med-point-marker" />
          <text x="88" y="205" className="med-label">Relaxation isovolumétrique</text>
        </g>

        {/* Indication VES */}
        <text x="252" y="205" className="med-annotation">VES = VTD − VTS</text>
        <text x="282" y="228" className="med-annotation-bold">70 mL</text>
      </g>
    )
  }

  // 2. Anatomie interne et cavités du cœur (FMA7088 / anat-heart-chambers-valves)
  if (courseId === 'FMA7088' || courseId === 'anat-heart-chambers-valves') {
    return (
      <g className="drawing-heart-anatomy">
        {/* Silhouette myocardique externe et péricarde */}
        <path
          d="M130 180 C110 240 160 360 310 395 C460 360 520 240 490 170 C480 130 430 120 400 130 C360 90 280 85 240 125 C190 120 145 140 130 180 Z"
          fill="var(--med-wash)"
          stroke="#933b47"
          strokeWidth="14"
          strokeLinejoin="round"
        />

        {/* Veine cave supérieure et inférieure */}
        <path d="M165 30 V135 M165 330 V390" stroke="#376d97" strokeWidth="22" strokeLinecap="round" />
        <text x="110" y="45" className="med-annotation">VCS ↑</text>
        <text x="110" y="380" className="med-annotation">VCI ↓</text>

        {/* Aorte ascendante & crosse aortique avec 3 troncs supra-aortiques */}
        <g {...structProps(7, 'Aorte ascendante et crosse')}>
          <path d="M315 140 C315 48 385 42 420 78 L420 130" fill="none" stroke="#ba3244" strokeWidth="24" strokeLinecap="round" />
          {/* Troncs supra-aortiques : TABC, Carotide commune G, Sous-clavière G */}
          <path d="M340 50 V20 M370 48 V20 M395 56 V20" stroke="#ba3244" strokeWidth="7" strokeLinecap="round" />
          <text x="345" y="42" className="med-label-white">Crosse Aorte</text>
        </g>

        {/* Tronc pulmonaire et bifurcation */}
        <g {...structProps(3, 'Tronc pulmonaire')}>
          <path d="M280 150 C270 88 240 68 195 65 M275 98 C300 84 330 78 355 82" fill="none" stroke="#25627a" strokeWidth="20" strokeLinecap="round" />
          <text x="215" y="78" className="med-label">Tronc pulm.</text>
        </g>

        {/* 1. Atrium droit */}
        <g {...structProps(0, 'Atrium droit')}>
          <path d="M145 140 C140 180 160 210 210 210 C210 160 195 140 145 140 Z" fill="#d2e3ee" stroke="#376d97" strokeWidth="3" />
          <text x="155" y="175" className="med-label">Atrium D.</text>
          <text x="150" y="195" className="med-annotation">Sang veineux</text>
        </g>

        {/* 2. Ventricule droit (paroi 3-5 mm) */}
        <g {...structProps(1, 'Ventricule droit')}>
          <path d="M170 225 C170 300 220 355 295 365 C290 300 270 235 220 225 Z" fill="#e5eff5" stroke="#376d97" strokeWidth="3" />
          {/* Trabécules charnues */}
          <path d="M190 290 Q210 320 230 310 M230 330 Q250 350 270 340" stroke="#b4cad7" strokeWidth="2.5" fill="none" />
          <text x="200" y="295" className="med-label">Ventricule D.</text>
        </g>

        {/* 3. Valve tricuspide & Cordages tendineux */}
        <g {...structProps(2, 'Valve tricuspide')}>
          <path d="M175 215 L225 215" stroke="#376d97" strokeWidth="6" strokeDasharray="5 3" />
          {/* Cordages tendineux & muscle papillaire */}
          <path d="M185 220 L195 255 M215 220 L210 255" stroke="#7194ab" strokeWidth="2" />
          <polygon points="190,255 215,255 202,275" fill="#7194ab" />
        </g>

        {/* 5. Atrium gauche */}
        <g {...structProps(4, 'Atrium gauche')}>
          <path d="M395 140 C445 140 470 165 470 205 C420 205 400 180 395 140 Z" fill="#fad7dc" stroke="#ba3244" strokeWidth="3" />
          <text x="415" y="175" className="med-label">Atrium G.</text>
          <text x="405" y="195" className="med-annotation">Veines pulm.</text>
        </g>

        {/* 6. Ventricule gauche (paroi épaisse 8-12 mm) */}
        <g {...structProps(5, 'Ventricule gauche')}>
          <path d="M335 225 C335 300 345 355 315 375 C380 365 470 310 460 225 Z" fill="#fcebed" stroke="#ba3244" strokeWidth="5" />
          {/* Trabécules et piliers massifs */}
          <path d="M360 290 Q380 330 410 320 M400 330 Q420 350 440 310" stroke="#e3a4ad" strokeWidth="3" fill="none" />
          <text x="385" y="295" className="med-label">Ventricule G.</text>
          <text x="375" y="315" className="med-annotation">Haute pression</text>
        </g>

        {/* 7. Valve mitrale & Cordages tendineux */}
        <g {...structProps(6, 'Valve mitrale')}>
          <path d="M380 215 L435 215" stroke="#ba3244" strokeWidth="6" strokeDasharray="5 3" />
          {/* Cordages tendineux & muscle papillaire gauche */}
          <path d="M395 220 L400 260 M420 220 L415 260" stroke="#d58691" strokeWidth="2.5" />
          <polygon points="395,260 420,260 408,280" fill="#d58691" />
        </g>

        {/* 9. Septum interventriculaire */}
        <g {...structProps(8, 'Septum interventriculaire')}>
          <path d="M295 220 C290 280 295 340 315 385 C335 340 330 280 325 220 Z" fill="#be4d5c" opacity="0.9" />
          <text x="285" y="260" className="med-label-white">Septum</text>
        </g>
      </g>
    )
  }

  // 3. Néphron & Filtration rénale (phys-renal)
  if (courseId === 'phys-renal') {
    return (
      <g className="drawing-nephron">
        {/* Ligne de séparation Cortex / Médullaire */}
        <path d="M40 185H590V385H40Z" fill="var(--med-wash)" />
        <path className="med-grid" d="M40 185H590" />
        <text x="45" y="170" className="med-label-faint">CORTEX</text>
        <text x="45" y="210" className="med-label-faint">MÉDULLAIRE</text>

        {/* Vaisseaux sanguins (Artériole afférente -> Glomérule -> Artériole efférente -> Vasa recta) */}
        <path
          className="med-blood"
          d="M45 60H105C150 60 170 120 125 130C70 140 75 65 130 65C175 65 152 140 105 110C70 75 165 70 148 112L184 58H580"
        />

        {/* Tubule rénal complet */}
        <path
          className="med-tube"
          d="M100 53C55 65 63 147 118 150C165 154 160 128 177 118C194 91 192 153 217 152C249 155 220 79 250 77C282 76 254 143 285 150V320Q285 355 325 355Q365 355 365 320V110C365 60 400 60 400 110C400 155 438 155 440 110C442 77 478 87 493 107H520V365"
        />

        {/* 1. Glomérule et capsule */}
        <g {...structProps(0, 'Glomérule et capsule')}>
          <circle cx="125" cy="100" r="32" fill="none" stroke="var(--med-teal)" strokeWidth="3" strokeDasharray="4 2" />
          <text x="95" y="42" className="med-label">Glomérule</text>
        </g>

        {/* 2. Tubule proximal */}
        <g {...structProps(1, 'Tubule proximal')}>
          <rect x="210" y="70" width="60" height="90" rx="10" fill="rgba(91, 173, 208, 0.2)" />
          <text x="215" y="60" className="med-label">Tubule prox.</text>
        </g>

        {/* 3. Anse de Henle descendante */}
        <g {...structProps(2, 'Branche descendante')}>
          <path className="med-flow med-green" d="M286 250H239" {...head} />
          <text x="205" y="254" className="med-annotation-bold">H₂O</text>
          <text x="235" y="300" className="med-label">Branche desc.</text>
        </g>

        {/* 4. Anse de Henle ascendante */}
        <g {...structProps(3, 'Branche ascendante')}>
          <path className="med-flow med-green" d="M370 300H425" {...head} />
          <text x="435" y="304" className="med-annotation-bold">Na⁺ / Cl⁻</text>
          <text x="375" y="240" className="med-label">Branche asc.</text>
        </g>

        {/* 5. Tube collecteur */}
        <g {...structProps(4, 'Tube collecteur')}>
          <path className="med-flow med-green" d="M525 313H581" {...head} />
          <text x="555" y="300" className="med-annotation-bold">H₂O</text>
          <text x="535" y="340" className="med-annotation">(ADH)</text>
          <text x="480" y="392" className="med-label">Urine finale ↓</text>
        </g>

        <path className="med-flow" d="M310 355H345" {...head} />
        <text x="37" y="33" className="med-annotation">Sang afférent</text>
        <text x="450" y="42" className="med-annotation">Sang efférent →</text>
      </g>
    )
  }

  // 4. Anatomie macroscopique du rein (FMA7204)
  if (courseId === 'FMA7204') {
    return (
      <g className="drawing-kidney-gross">
        {/* Silhouette rénale en haricot & Capsule fibreuse */}
        <path
          d="M200 45 C350 35 480 80 490 200 C490 270 450 300 410 240 C390 190 350 180 350 250 C360 320 440 330 400 375 C310 405 170 365 140 250 C120 150 150 55 200 45 Z"
          fill="var(--med-wash)"
          stroke="#7a363f"
          strokeWidth="6"
        />

        {/* 1. Cortex rénal périphérique et arcs sous-capsulaires */}
        <g {...structProps(0, 'Cortex rénal')}>
          <path
            d="M195 65 C320 55 450 95 465 190 C420 160 380 140 330 180 C260 140 180 180 160 240 C145 160 165 75 195 65 Z"
            fill="rgba(196, 122, 134, 0.25)"
            stroke="#9f4a58"
            strokeWidth="2.5"
            strokeDasharray="4 3"
          />
          <text x="195" y="88" className="med-label">Cortex rénal</text>
        </g>

        {/* 2. Pyramides médullaires de Malpighi & Colonnes de Bertin */}
        <g {...structProps(1, 'Pyramides médullaires de Malpighi')}>
          {/* Pyramides striées orientées vers les papilles */}
          <path d="M220 105 L280 135 L230 160 Z" fill="#9e394b" />
          <path d="M185 175 L255 195 L195 230 Z" fill="#9e394b" />
          <path d="M195 250 L265 255 L215 298 Z" fill="#9e394b" />
          <path d="M235 315 L285 295 L260 350 Z" fill="#9e394b" />
          <path d="M280 100 L325 145 L290 155 Z" fill="#9e394b" opacity="0.8" />
          {/* Stries radiaires médullaires */}
          <path d="M230 115 L270 135 M200 185 L245 198 M205 260 L255 260 M245 320 L275 305" stroke="#d58691" strokeWidth="1.5" />
          <text x="210" y="195" className="med-label-white">Pyramides (Malpighi)</text>
        </g>

        {/* 3. Petits et grands calices (Arbre caliciel) */}
        <g {...structProps(2, 'Petits et grands calices')}>
          <path d="M280 135 Q330 165 350 195 M255 195 Q315 205 350 210 M265 255 Q320 240 350 225 M285 295 Q330 260 350 235" stroke="#488ba8" strokeWidth="5" fill="none" />
          {/* Calices mineurs coiffant les papilles */}
          <ellipse cx="280" cy="135" rx="5" ry="8" fill="#488ba8" />
          <ellipse cx="255" cy="195" rx="5" ry="8" fill="#488ba8" />
          <ellipse cx="265" cy="255" rx="5" ry="8" fill="#488ba8" />
          <ellipse cx="285" cy="295" rx="5" ry="8" fill="#488ba8" />
          <text x="315" y="165" className="med-label">Calices</text>
        </g>

        {/* 4. Bassinet (pyélon en entonnoir) */}
        <g {...structProps(3, 'Bassinet (pyélon)')}>
          <path d="M350 185 Q390 205 430 225 L410 265 Q370 245 350 235 Z" fill="#5badd0" opacity="0.75" stroke="#25627a" strokeWidth="3" />
          <text x="385" y="222" className="med-label-bold">Bassinet</text>
        </g>

        {/* 5. Uretère */}
        <g {...structProps(4, 'Uretère')}>
          <path d="M420 245 C440 285 455 330 460 395" fill="none" stroke="#25627a" strokeWidth="12" strokeLinecap="round" />
          <text x="475" y="350" className="med-label">Uretère ↓</text>
        </g>

        {/* 6. Artère et veine rénales (Hile rénal) */}
        <g {...structProps(5, 'Artère et veine rénales')}>
          <path d="M540 135 L425 175" stroke="#ba3244" strokeWidth="11" strokeLinecap="round" />
          <path d="M540 162 L435 192" stroke="#376d97" strokeWidth="11" strokeLinecap="round" />
          {/* Branches interlobaires */}
          <path d="M430 175 Q380 150 330 135 M430 175 Q370 210 320 230" stroke="#ba3244" strokeWidth="4" fill="none" />
          <text x="485" y="125" className="med-label">Vaisseaux du hile</text>
        </g>
      </g>
    )
  }

  // 5. Alvéole pulmonaire et barrière d'échange (phys-gas-exchange)
  if (courseId === 'phys-gas-exchange') {
    return (
      <g className="drawing-alveolus">
        {/* Lumière alvéolaire */}
        <path
          d="M260 35V85C100 91 130 264 305 271C473 276 516 105 380 85V35"
          fill="var(--med-wash)"
          stroke="var(--med-teal)"
          strokeWidth="9"
        />

        {/* Lit capillaire pulmonaire */}
        <path
          d="M100 277C205 365 465 395 567 282"
          fill="none"
          stroke="var(--med-red)"
          strokeWidth="38"
          opacity=".25"
        />
        <path className="med-flow med-red" d="M110 289C238 377 449 388 552 303" {...head} />

        {/* 1. Air alvéolaire */}
        <g {...structProps(0, 'Air alvéolaire')}>
          <path className="med-flow" d="M287 34V84" {...head} />
          <path className="med-flow" d="M350 84V34" {...head} />
          <text x="245" y="165" className="med-label">Lumière alvéolaire</text>
          <text x="245" y="185" className="med-annotation">PAO₂ ≈ 100 · PACO₂ ≈ 40</text>
        </g>

        {/* 2. Barrière alvéolocapillaire */}
        <g {...structProps(1, 'Barrière alvéolocapillaire')}>
          <path d="M180 230 Q305 285 435 240" fill="none" stroke="#25627a" strokeWidth="4" strokeDasharray="5 3" />
          <text x="140" y="225" className="med-label">Barrière fine (0,5 µm)</text>
        </g>

        {/* 3. Oxygène vers le sang */}
        <g {...structProps(2, 'Oxygène vers le sang')}>
          <path className="med-flow med-green" d="M292 216V315" {...head} />
          <text x="305" y="260" className="med-annotation-bold">O₂ ↓</text>
        </g>

        {/* 4. CO2 vers l'alvéole */}
        <g {...structProps(3, 'Dioxyde de carbone vers l’alvéole')}>
          <path className="med-flow med-red" d="M405 320V218" {...head} />
          <text x="415" y="260" className="med-annotation-bold">↑ CO₂</text>
        </g>

        {/* 5. Sang capillaire & Hématies */}
        <g {...structProps(4, 'Sang capillaire')}>
          {[180, 240, 360, 440, 500].map((x, i) => (
            <ellipse
              key={x}
              cx={x}
              cy={320 + Math.sin(i) * 15}
              rx="15"
              ry="8"
              fill={i < 2 ? '#624b82' : '#ba3244'}
            />
          ))}
          <text x="40" y="325" className="med-annotation">Sang veineux entrant</text>
          <text x="470" y="375" className="med-annotation">Sang oxygéné sortant →</text>
        </g>
      </g>
    )
  }

  // 6. Anatomie des poumons et arbre trachéobronchique (FMA7309 - Patrick J. Lynch / Yale University CC BY 2.5)
  if (courseId === 'FMA7309') {
    return (
      <g className="drawing-lungs-anatomy">
        {/* 1. Trachée et carène (bifurcation T4-T5) */}
        <g {...structProps(0, 'Trachée et carène')}>
          <path d="M320 25 V125" stroke="#5da9c6" strokeWidth="22" strokeLinecap="round" />
          {/* Anneaux cartilagineux en C */}
          {[42, 62, 82, 102, 118].map(y => (
            <path key={y} d={`M309 ${y} H331`} stroke="#ffffff" strokeWidth="2.5" />
          ))}
          {/* Bifurcation trachéale & éperon de la carène */}
          <path d="M320 125 L255 170 M320 125 L385 180" stroke="#5da9c6" strokeWidth="15" strokeLinecap="round" />
          <text x="338" y="60" className="med-label">Trachée</text>
          <text x="305" y="145" className="med-label-bold">Carène (T4-T5)</text>
        </g>

        {/* 2. Poumon droit (3 lobes délimités par scissure horizontale et oblique) */}
        <g {...structProps(1, 'Poumon droit (3 lobes)')}>
          <path
            d="M260 120 C230 55 160 75 140 155 C120 235 110 320 160 365 C230 385 270 345 265 250 C260 180 280 140 260 120 Z"
            fill="var(--med-wash)"
            stroke="#2e6d82"
            strokeWidth="4"
          />
          {/* Scissure horizontale (4e côte) */}
          <path d="M130 220 Q200 215 265 240" stroke="#2e6d82" strokeWidth="3" strokeDasharray="5 2" />
          {/* Scissure oblique droite */}
          <path d="M160 135 Q210 270 220 370" stroke="#2e6d82" strokeWidth="3" strokeDasharray="5 2" />
          {/* Arborisations bronchiques droites */}
          <path d="M255 170 L200 160 M255 170 L210 230 M255 170 L230 290" stroke="#87bed1" strokeWidth="3" fill="none" />
          <text x="155" y="155" className="med-label">Lobe sup.</text>
          <text x="165" y="245" className="med-label">Lobe moy.</text>
          <text x="180" y="330" className="med-label">Lobe inf.</text>
        </g>

        {/* 3. Poumon gauche (2 lobes avec incisure cardiaque & lingula) */}
        <g {...structProps(2, 'Poumon gauche (2 lobes)')}>
          <path
            d="M380 120 C410 55 480 75 500 155 C520 235 530 320 480 365 C420 385 375 355 380 290 C360 250 370 210 380 190 C385 150 365 140 380 120 Z"
            fill="var(--med-wash)"
            stroke="#ba5d6d"
            strokeWidth="4"
          />
          {/* Scissure oblique gauche */}
          <path d="M470 135 Q430 260 410 370" stroke="#ba5d6d" strokeWidth="3" strokeDasharray="5 2" />
          {/* Arborisations bronchiques gauches */}
          <path d="M385 180 L440 165 M385 180 L440 280" stroke="#dda8b1" strokeWidth="3" fill="none" />
          {/* Incisure cardiaque */}
          <text x="382" y="250" className="med-annotation-bold">Incisure cardiaque</text>
          <text x="440" y="175" className="med-label">Lobe sup.</text>
          <text x="445" y="320" className="med-label">Lobe inf.</text>
        </g>

        {/* 4. Plèvre viscérale et pariétale */}
        <g {...structProps(3, 'Plèvre viscérale et pariétale')}>
          <path d="M95 230 Q90 325 130 375" stroke="#58a183" strokeWidth="5" fill="none" />
          <path d="M85 240 Q80 335 125 385" stroke="#58a183" strokeWidth="2.5" strokeDasharray="3 2" fill="none" />
          <text x="50" y="280" className="med-label">Plèvre</text>
        </g>

        {/* 5. Hile pulmonaire */}
        <g {...structProps(4, 'Hile pulmonaire')}>
          <circle cx="270" cy="220" r="20" fill="none" stroke="#ba3244" strokeWidth="3.5" strokeDasharray="4 2" />
          {/* Vaisseaux pulmonaires */}
          <circle cx="265" cy="215" r="6" fill="#376d97" />
          <circle cx="276" cy="225" r="5" fill="#ba3244" />
          <text x="240" y="195" className="med-label">Hile droit</text>
        </g>
      </g>
    )
  }

  // 7. Cerveau & Hémisphère cérébral (FMA50801 - Patrick J. Lynch / Yale University CC BY 2.5)
  if (courseId === 'FMA50801') {
    return (
      <g className="drawing-brain-hemisphere">
        {/* Contour général du cortex télencéphalique */}
        <path
          d="M130 220 C110 130 210 50 340 50 C460 50 560 110 560 220 C560 260 520 280 480 270 C440 265 420 300 370 295 C320 290 280 290 240 310 C180 320 140 280 130 220 Z"
          fill="var(--med-wash)"
          stroke="#416173"
          strokeWidth="6"
        />

        {/* 1. Lobe frontal (moteur et préfrontal) */}
        <g {...structProps(0, 'Lobe frontal')}>
          <path
            d="M135 210 C125 145 200 65 315 65 L315 200 C270 200 210 210 135 210 Z"
            fill="rgba(58, 140, 179, 0.28)"
          />
          {/* Gyri frontaux */}
          <path d="M150 140 Q220 130 280 140 M170 175 Q240 165 290 175" stroke="#3a8cb3" strokeWidth="2" fill="none" opacity="0.6" />
          <text x="180" y="130" className="med-label-bold">LOBE FRONTAL</text>
          <text x="175" y="150" className="med-annotation">Moteur (M1) · Broca</text>
        </g>

        {/* 2. Sillon central de Rolando */}
        <g {...structProps(1, 'Sillon central (de Rolando)')}>
          <path d="M320 55 Q310 130 335 195" stroke="#cf4b5a" strokeWidth="6" strokeLinecap="round" fill="none" />
          <text x="275" y="45" className="med-label-bold">Sillon central (Rolando)</text>
        </g>

        {/* 3. Lobe pariétal (somatosensitif) */}
        <g {...structProps(2, 'Lobe pariétal')}>
          <path
            d="M330 65 C410 65 475 90 480 185 L345 195 Z"
            fill="rgba(224, 154, 76, 0.28)"
          />
          {/* Gyrus postcentral sensitif */}
          <path d="M340 75 Q330 135 355 190" stroke="#e09a4c" strokeWidth="3" fill="none" opacity="0.7" />
          <text x="375" y="125" className="med-label-bold">PARIÉTAL</text>
          <text x="380" y="145" className="med-annotation">Sensitif (S1)</text>
        </g>

        {/* 4. Sillon latéral de Sylvius */}
        <g {...structProps(3, 'Sillon latéral (de Sylvius)')}>
          <path d="M190 215 Q300 200 405 215" stroke="#25627a" strokeWidth="6" strokeLinecap="round" fill="none" />
          <text x="210" y="235" className="med-label-bold">Sillon latéral (Sylvius)</text>
        </g>

        {/* 5. Lobe temporal (audition et mémoire) */}
        <g {...structProps(4, 'Lobe temporal')}>
          <path
            d="M195 225 Q300 210 405 225 C405 270 330 285 240 295 C190 280 185 245 195 225 Z"
            fill="rgba(69, 156, 120, 0.28)"
          />
          {/* Gyri temporaux supérieur, moyen et inférieur */}
          <path d="M210 250 Q300 240 380 250 M220 270 Q300 260 360 270" stroke="#459c78" strokeWidth="2" fill="none" opacity="0.6" />
          <text x="245" y="260" className="med-label-bold">TEMPORAL</text>
          <text x="240" y="278" className="med-annotation">Audition · Wernicke</text>
        </g>

        {/* 6. Lobe occipital (vision V1) */}
        <g {...structProps(5, 'Lobe occipital')}>
          <path
            d="M485 185 C555 185 555 245 520 265 L460 220 Z"
            fill="rgba(154, 98, 179, 0.28)"
          />
          <text x="480" y="215" className="med-label-bold">OCCIPITAL</text>
          <text x="500" y="235" className="med-annotation">Vision (V1)</text>
        </g>

        {/* 7. Cervelet (folia cérébelleuses) */}
        <g {...structProps(6, 'Cervelet')}>
          <path
            d="M410 290 C450 280 520 295 505 365 C450 380 400 350 410 290 Z"
            fill="#dbe4e8"
            stroke="#416173"
            strokeWidth="3"
          />
          {/* Folia cérébelleuses de Patrick Lynch */}
          <path d="M430 305 Q470 310 485 325 M425 325 Q460 330 480 345 M420 345 Q450 350 470 360" stroke="#7e9ba8" strokeWidth="2" fill="none" />
          <text x="440" y="325" className="med-label">Cervelet</text>
        </g>

        {/* 8. Tronc cérébral (mésencéphale, pont, bulbe) */}
        <g {...structProps(7, 'Tronc cérébral')}>
          <path d="M350 285 L350 395 L390 395 L390 290" fill="#9db8c6" stroke="#416173" strokeWidth="3" />
          {/* Protubérance annulaire (pont de Varole) */}
          <path d="M345 325 C335 340 335 360 350 370" stroke="#416173" strokeWidth="3" fill="#9db8c6" />
          <text x="315" y="370" className="med-label">Tronc cérébral</text>
        </g>
      </g>
    )
  }

  // 8. Coupe du globe oculaire (anat-eye)
  if (courseId === 'anat-eye') {
    return (
      <g className="drawing-eye-anatomy">
        {/* Globe principal (Sclère blanche externe) */}
        <circle cx="360" cy="205" r="160" fill="#ffffff" stroke="#c0d3dc" strokeWidth="12" />

        {/* Choroïde (membrane vasculaire intermédiaire) */}
        <circle cx="360" cy="205" r="150" fill="none" stroke="#793641" strokeWidth="6" />

        {/* Rétine (tunique neurosensorielle orange/jaune) */}
        <path
          d="M260 85 C420 85 495 125 495 205 C495 285 420 325 260 325"
          fill="none"
          stroke="#e08e45"
          strokeWidth="6"
        />

        {/* Corps vitré central */}
        <g {...structProps(4, 'Corps vitré')}>
          <circle cx="360" cy="205" r="130" fill="rgba(195, 230, 245, 0.35)" />
          <text x="325" y="210" className="med-label-faint">Corps vitré</text>
        </g>

        {/* 1. Cornée transparente antérieure */}
        <g {...structProps(0, 'Cornée')}>
          <path
            d="M230 115 C150 145 150 265 230 295"
            fill="rgba(180, 230, 250, 0.45)"
            stroke="#2ea3c9"
            strokeWidth="7"
          />
          <text x="95" y="210" className="med-label-bold">Cornée</text>
        </g>

        {/* 2. Chambre antérieure et humeur aqueuse */}
        <g {...structProps(1, 'Chambre antérieure')}>
          <path d="M210 145 C175 175 175 235 210 265" fill="none" stroke="#68b9d6" strokeWidth="3" strokeDasharray="3 2" />
          <text x="160" y="165" className="med-annotation">Chambre ant.</text>
        </g>

        {/* 3. Iris et pupille */}
        <g {...structProps(2, 'Iris et pupille')}>
          <path d="M225 130 L245 170 M225 280 L245 240" stroke="#366848" strokeWidth="7" strokeLinecap="round" />
          <text x="215" y="120" className="med-label">Iris</text>
          <text x="210" y="205" className="med-label">Pupille</text>
        </g>

        {/* 4. Cristallin et corps ciliaire */}
        <g {...structProps(3, 'Cristallin et corps ciliaire')}>
          {/* Cristallin biconvexe */}
          <ellipse cx="260" cy="205" rx="16" ry="38" fill="rgba(240, 250, 255, 0.9)" stroke="#25627a" strokeWidth="4" />
          {/* Zonule ciliaire */}
          <path d="M250 145 L260 167 M250 265 L260 243" stroke="#719cb0" strokeWidth="2" strokeDasharray="2 2" />
          <text x="265" y="150" className="med-label">Cristallin</text>
        </g>

        {/* 6. Rétine et fovéa */}
        <g {...structProps(5, 'Rétine et fovéa')}>
          <circle cx="505" cy="205" r="8" fill="#d9532f" />
          <text x="440" y="180" className="med-label-bold">Fovéa (Macula)</text>
        </g>

        {/* 7. Choroïde et Sclère */}
        <g {...structProps(6, 'Choroïde et Sclère')}>
          <text x="450" y="95" className="med-label">Sclère & Choroïde</text>
        </g>

        {/* 8. Nerf optique (CN II) */}
        <g {...structProps(7, 'Nerf optique (CN II)')}>
          <path d="M495 240 L585 270 M505 255 L585 285" fill="#f0e2b8" stroke="#9e8749" strokeWidth="12" strokeLinecap="round" />
          <text x="510" y="315" className="med-label-bold">Nerf optique (II)</text>
        </g>
      </g>
    )
  }

  // 9. Estomac et Duodénum (FMA7148)
  if (courseId === 'FMA7148') {
    return (
      <g className="drawing-stomach">
        {/* Silhouette de l'estomac et duodénum */}
        <path
          d="M210 50 L250 50 L250 95 C290 60 380 60 410 110 C440 160 420 260 350 310 C300 345 220 340 180 290 L180 260 C150 250 110 260 100 320 L70 300 C80 210 150 210 190 220 L190 120 C180 90 210 60 210 50 Z"
          fill="var(--med-wash)"
          stroke="#934752"
          strokeWidth="6"
        />

        {/* Plis gastriques internes */}
        <path d="M280 120 Q350 180 320 260 M320 120 Q380 200 350 270" stroke="#d58691" strokeWidth="3" fill="none" />

        {/* 1. Cardia */}
        <g {...structProps(0, 'Cardia')}>
          <circle cx="235" cy="115" r="14" fill="none" stroke="#ba3244" strokeWidth="4" />
          <text x="160" y="105" className="med-label-bold">Cardia (T11)</text>
        </g>

        {/* 2. Fundus gastrique */}
        <g {...structProps(1, 'Fundus')}>
          <path d="M250 95 C290 60 380 60 400 110" fill="none" stroke="#368166" strokeWidth="5" />
          <text x="310" y="55" className="med-label-bold">Fundus (poche à air)</text>
        </g>

        {/* 3. Corps de l'estomac */}
        <g {...structProps(2, 'Corps')}>
          <text x="350" y="190" className="med-label-bold">CORPS</text>
          <text x="340" y="210" className="med-annotation">Sécrétion acide HCl</text>
        </g>

        {/* 4. Petite et Grande courbures */}
        <g {...structProps(3, 'Courbures')}>
          <text x="215" y="195" className="med-label">Petite courbure</text>
          <text x="400" y="240" className="med-label">Grande courbure</text>
        </g>

        {/* 5. Antre gastrique */}
        <g {...structProps(4, 'Antre')}>
          <text x="260" y="325" className="med-label-bold">Antre gastrique</text>
        </g>

        {/* 6. Pylore et sphincter */}
        <g {...structProps(5, 'Pylore')}>
          <path d="M175 250 V300" stroke="#ba3244" strokeWidth="8" strokeLinecap="round" />
          <text x="145" y="335" className="med-label-bold">Pylore</text>
        </g>

        {/* 7. Duodénum (cadre en C) */}
        <g {...structProps(6, 'Duodénum')}>
          <path d="M170 270 C120 260 90 280 90 330 C90 380 160 390 220 385" fill="none" stroke="#488ba8" strokeWidth="16" strokeLinecap="round" />
          <text x="65" y="255" className="med-label">Duodénum (D1-D2)</text>
        </g>
      </g>
    )
  }

  // 10. Colonne vertébrale & Disque (anat-spine / anat-cervical)
  if (courseId === 'anat-spine' || courseId === 'anat-cervical') {
    return (
      <g className="drawing-spine">
        {/* Colonne vertébrale complète de profil (gauche) */}
        <path
          d="M160 40 C140 75 140 105 160 130 C190 165 190 215 165 250 C140 285 140 315 170 345 L180 390"
          fill="none"
          stroke="#416173"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* 1. Cervical */}
        <g {...structProps(0, 'Rachis cervical')}>
          <text x="60" y="75" className="med-label-bold">Cervical (C1-C7)</text>
          <text x="60" y="92" className="med-annotation">Lordose</text>
        </g>

        {/* 2. Thoracique */}
        <g {...structProps(1, 'Rachis thoracique')}>
          <text x="215" y="175" className="med-label-bold">Thoracique (T1-T12)</text>
          <text x="215" y="192" className="med-annotation">Cyphose</text>
        </g>

        {/* 3. Lombaire */}
        <g {...structProps(2, 'Rachis lombaire')}>
          <text x="55" y="280" className="med-label-bold">Lombaire (L1-L5)</text>
          <text x="55" y="297" className="med-annotation">Lordose</text>
        </g>

        {/* 4. Sacrum */}
        <g {...structProps(3, 'Sacrum')}>
          <text x="205" y="365" className="med-label-bold">Sacrum & Coccyx</text>
        </g>

        {/* Coupe détaillée unité vertèbre-disque (droite) */}
        {/* Corps vertébral sup */}
        <g {...structProps(4, 'Corps vertébral')}>
          <rect x="360" y="90" width="110" height="70" rx="10" fill="#e7eff2" stroke="#416173" strokeWidth="4" />
          <text x="380" y="130" className="med-label-bold">Corps vertébral</text>
        </g>

        {/* Disque intervertébral */}
        <g {...structProps(5, 'Disque intervertébral')}>
          <rect x="365" y="170" width="100" height="35" rx="8" fill="#82b9ce" stroke="#25627a" strokeWidth="3" />
          {/* Nucleus pulposus central */}
          <ellipse cx="415" cy="187" rx="18" ry="8" fill="#ffffff" />
          <text x="350" y="225" className="med-label-bold">Disque (Annulus + Nucleus)</text>
        </g>

        {/* Corps vertébral inf */}
        <rect x="360" y="215" width="110" height="70" rx="10" fill="#e7eff2" stroke="#416173" strokeWidth="4" />

        {/* Canal vertébral et moelle */}
        <g {...structProps(6, 'Canal vertébral')}>
          <path d="M480 80 V295" stroke="#ba8a32" strokeWidth="16" strokeLinecap="round" />
          <path d="M480 80 V295" stroke="#ffffff" strokeWidth="4" />
          <text x="500" y="195" className="med-label-bold">Canal vertébral</text>
          <text x="500" y="215" className="med-annotation">Moelle spinale</text>
        </g>
      </g>
    )
  }

  // 11. Nerfs crâniens sur le tronc cérébral (anat-cranial-nerves)
  if (courseId === 'anat-cranial-nerves') {
    return (
      <g className="drawing-cranial-nerves">
        {/* Silhouette ventrale du tronc cérébral */}
        {/* Pédoncules cérébraux (mésencéphale) */}
        <path d="M270 80 L300 140 L340 140 L370 80" fill="#cedfe7" stroke="#3b6579" strokeWidth="4" />
        {/* Pont de Varole (renflement transversal) */}
        <path d="M240 140 C220 190 220 210 240 240 L400 240 C420 210 420 190 400 140 Z" fill="#b9d4e1" stroke="#3b6579" strokeWidth="4" />
        {/* Bulbe rachidien (pyramides et olives) */}
        <path d="M260 240 L270 360 L370 360 L380 240 Z" fill="#a4c7d7" stroke="#3b6579" strokeWidth="4" />

        {/* 1. Nerfs I et II */}
        <g {...structProps(0, 'Nerfs I et II')}>
          <path d="M280 30 V60 M360 30 V60" stroke="#cf9c34" strokeWidth="6" strokeLinecap="round" />
          <path d="M270 70 L370 70" stroke="#cf9c34" strokeWidth="6" />
          <text x="245" y="45" className="med-label-bold">I & II (Optique)</text>
        </g>

        {/* 2. Nerfs III et IV (Mésencéphale) */}
        <g {...structProps(1, 'Nerfs III et IV')}>
          <path d="M310 115 L290 125 M330 115 L350 125" stroke="#ba3244" strokeWidth="5" strokeLinecap="round" />
          <text x="355" y="115" className="med-label-bold">III & IV</text>
        </g>

        {/* 3. Nerf V (Trijumeau - Pont) */}
        <g {...structProps(2, 'Nerf V (Trijumeau)')}>
          <path d="M230 175 L180 165 M410 175 L460 165" stroke="#cf9c34" strokeWidth="8" strokeLinecap="round" />
          <text x="130" y="175" className="med-label-bold">V (Trijumeau)</text>
        </g>

        {/* 4. Sillon bulbopontique (VI, VII, VIII) */}
        <g {...structProps(3, 'Nerfs VI, VII, VIII')}>
          <path d="M300 240 V260 M340 240 V260" stroke="#ba3244" strokeWidth="4" />
          <path d="M250 240 L220 255 M390 240 L420 255" stroke="#368166" strokeWidth="5" />
          <text x="250" y="235" className="med-label-bold">VI, VII, VIII</text>
        </g>

        {/* 5. Bulbe : IX, X, XI */}
        <g {...structProps(4, 'Nerfs IX, X, XI')}>
          <path d="M260 285 L220 295 M265 310 L220 320 M270 335 L220 345" stroke="#ba3244" strokeWidth="4" strokeLinecap="round" />
          <text x="140" y="305" className="med-label-bold">IX, X (Vague), XI</text>
        </g>

        {/* 6. Bulbe : XII (Hypoglosse) */}
        <g {...structProps(5, 'Nerf XII (Hypoglosse)')}>
          <path d="M360 300 L395 315 M360 320 L395 335" stroke="#cf9c34" strokeWidth="4" strokeLinecap="round" />
          <text x="405" y="325" className="med-label-bold">XII (Hypoglosse)</text>
        </g>
      </g>
    )
  }

  // 12. Gastrulation (embryo-weeks-one-three)
  if (courseId === 'embryo-weeks-one-three') {
    return (
      <g className="drawing-gastrulation">
        <path d="M60 73Q320 10 580 73V125H60Z" fill="var(--med-wash)" />
        <text x="258" y="50" className="med-label">Cavité amniotique</text>

        {/* 1. Épiblaste / Ectoderme */}
        <g {...structProps(0, 'Épiblaste')}>
          <path
            d="M60 121H280Q305 121 320 160Q335 121 360 121H580V155H357Q337 155 320 185Q303 155 283 155H60Z"
            fill="#82c6da"
          />
          {Array.from({length: 12}, (_, i) => (
            <ellipse key={i} cx={82 + i * 43} cy="140" rx="12" ry="9" fill="#245b86" opacity=".65" />
          ))}
          <text x="80" y="110" className="med-label-bold">Épiblaste (futur ectoderme)</text>
        </g>

        {/* 2. Ligne primitive */}
        <g {...structProps(1, 'Ligne primitive')}>
          <path className="med-flow" d="M315 85V175Q315 231 247 231" {...head} />
          <path className="med-flow" d="M334 174Q370 230 403 235" {...head} />
          <text x="270" y="95" className="med-label-bold">Ligne primitive</text>
        </g>

        {/* 3. Mésoderme intraembryonnaire */}
        <g {...structProps(2, 'Mésoderme')}>
          <path d="M60 211Q180 198 281 218Q315 234 360 218Q464 194 580 211V252H60Z" fill="#dc9cac" />
          <text x="410" y="235" className="med-label-bold">Mésoderme</text>
        </g>

        {/* 4. Endoderme définitif */}
        <g {...structProps(3, 'Endoderme')}>
          <path d="M60 281Q320 271 580 281V314Q320 301 60 314Z" fill="#e4c887" />
          {Array.from({length: 12}, (_, i) => (
            <ellipse key={i} cx={82 + i * 43} cy="295" rx="12" ry="7" fill="#936c28" opacity=".65" />
          ))}
          <text x="80" y="340" className="med-label-bold">Endoderme définitif</text>
        </g>

        <text x="238" y="375" className="med-label">Vésicule vitelline</text>
      </g>
    )
  }

  // 13. Immunité adaptative (immuno-adaptive)
  return (
    <g className="drawing-immunology">
      {/* 1. CPA */}
      <g {...structProps(0, 'CPA')}>
        <path
          d="M58 93L101 115L146 82L167 131L202 151L177 185L196 231L143 243L114 281L84 238L42 253L53 195L24 163L61 145Z"
          fill="var(--med-wash)"
          stroke="var(--med-teal)"
          strokeWidth="3"
        />
        <ellipse cx="115" cy="182" rx="37" ry="45" fill="var(--med-teal)" opacity=".22" />
        <text x="60" y="320" className="med-label-bold">Cellule présentatrice (CPA)</text>
      </g>

      {/* 2. Synapse CMH II / TCR */}
      <g {...structProps(1, 'CMH II et TCR')}>
        <path className="med-flow" d="M184 166H212V179H242" />
        <path className="med-flow med-red" d="M210 156H236" />
        <path className="med-flow" d="M265 166L247 179L259 191" />
        <text x="184" y="119" className="med-label-bold">Peptide</text>
        <text x="171" y="272" className="med-annotation-bold">CMH II · TCR</text>
      </g>

      {/* 3. Lymphocyte T CD4 */}
      <g {...structProps(2, 'Lymphocyte T CD4')}>
        <circle cx="320" cy="190" r="65" fill="#dfdafa" stroke="#8b79bd" strokeWidth="3" />
        <circle cx="330" cy="198" r="36" fill="#8b79bd" opacity=".35" />
        <text x="270" y="195" className="med-label-bold">LT CD4⁺</text>
        <path className="med-flow" d="M386 177Q426 149 463 148" {...head} />
        <text x="394" y="121" className="med-label">Aide T (cytokines)</text>
      </g>

      {/* 4. Lymphocyte B et BCR */}
      <g {...structProps(3, 'Lymphocyte B')}>
        <circle cx="520" cy="125" r="45" fill="#d5ebc9" stroke="#589278" strokeWidth="3" />
        <path className="med-flow med-green" d="M516 80V62M516 62L503 48M516 62L529 48" />
        <path className="med-red med-flow" d="M501 38H531" />
        <text x="480" y="130" className="med-label-bold">Lymphocyte B</text>
        <path className="med-flow" d="M521 182V261" {...head} />
        <text x="534" y="221" className="med-annotation">Différenciation ↓</text>
      </g>

      {/* 5. Plasmocyte */}
      <g {...structProps(4, 'Plasmocyte')}>
        <ellipse cx="497" cy="320" rx="52" ry="43" fill="#d5ebc9" stroke="#589278" strokeWidth="3" />
        {[560, 590, 615].map((x, i) => (
          <path
            key={x}
            className="med-flow med-green"
            d={`M${x} ${318 + i * 16}v-17m0 0l-8 -9m8 9l8 -9`}
          />
        ))}
        <text x="460" y="325" className="med-label-bold">Plasmocyte</text>
        <text x="550" y="300" className="med-annotation">Anticorps (Ig)</text>
      </g>
    </g>
  )
}
