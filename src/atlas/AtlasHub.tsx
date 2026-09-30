import { useMemo, useState } from 'react'
import type { AtlasDefinition } from './types'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Brain,
  Heart,
  Rotate3D,
  Search,
  X,
} from 'lucide-react'

interface Props {
  atlases: AtlasDefinition[]
  onSelectAtlas: (atlasId: string, viewId?: string, mode?: string) => void
  onOpen3DAtlas: () => void
  onNavigateCourse?: (courseId: string) => void
}

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function AtlasHub({ atlases, onSelectAtlas, onOpen3DAtlas }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    const query = normalize(searchQuery.trim())
    if (query.length < 2) return []

    const results: {
      atlasId: string
      atlasName: string
      viewId: string
      viewName: string
      structureId: string
      structureName: string
      latinName?: string
    }[] = []

    for (const atlas of atlases) {
      for (const view of atlas.views) {
        for (const structure of view.structures) {
          if ([structure.name, structure.latinName ?? '', structure.category].some((value) => normalize(value).includes(query))) {
            results.push({
              atlasId: atlas.id,
              atlasName: atlas.title,
              viewId: structure.viewId,
              viewName: atlas.views.find((item) => item.id === structure.viewId)?.name ?? structure.viewId,
              structureId: structure.id,
              structureName: structure.name,
              latinName: structure.latinName,
            })
          }
        }
      }
    }

    return results.slice(0, 8)
  }, [atlases, searchQuery])

  const brainAtlas = atlases.find((atlas) => atlas.id === 'brain')
  const heartAtlas = atlases.find((atlas) => atlas.id === 'heart')
  const structureCount = atlases.reduce((sum, atlas) => sum + atlas.views.reduce((viewSum, view) => viewSum + view.structures.length, 0), 0)

  return (
    <main className="atlas-hub-container" data-testid="atlas-hub">
      <section className="atlas-hub-stage" aria-labelledby="atlas-hub-title">
        <div className="atlas-hub-copy">
          <div className="atlas-hub-eyebrow"><span className="atlas-eyebrow-dot" /> ATLAS ANATOMIQUE · MYCORPUS</div>
          <h1 className="hero-title" id="atlas-hub-title">Le corps, <em>en profondeur.</em></h1>
          <p className="hero-description">
            Parcourez les structures, comprenez leurs rapports et reliez chaque repère anatomique à sa fonction.
          </p>

          <div className="atlas-hub-search-wrap">
            <div className="atlas-hub-search-box">
              <Search size={18} className="search-icon" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher un organe, un os, une structure…"
                className="atlas-hub-search-input"
                aria-label="Rechercher une structure dans tous les atlas"
              />
              {searchQuery && <button className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Effacer la recherche"><X size={16} /></button>}
              {!searchQuery && <kbd className="atlas-search-hint">⌘ K</kbd>}
            </div>
            {searchResults.length > 0 && (
              <div className="search-results-dropdown" data-testid="atlas-search-results">
                <div className="search-results-header">{searchResults.length} structure{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}</div>
                <div className="search-results-list">
                  {searchResults.map((result) => (
                    <button key={`${result.atlasId}-${result.structureId}`} className="search-result-item" onClick={() => onSelectAtlas(result.atlasId, result.viewId, 'explore')}>
                      <span className="result-main"><strong>{result.structureName}</strong>{result.latinName && <span className="result-latin">{result.latinName}</span>}</span>
                      <span className="result-meta"><span>{result.atlasName}</span><span>{result.viewName}</span></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="atlas-hub-primary-actions">
            <button className="atlas-open-3d" data-testid="card-atlas-3d" onClick={onOpen3DAtlas}>
              <span className="atlas-open-icon"><Rotate3D size={19} /></span>
              <span className="atlas-open-copy"><strong>Explorer le corps en 3D</strong><small>Tourner, zoomer et isoler chaque système</small></span>
              <ArrowRight className="atlas-open-arrow" size={18} />
            </button>
            <div className="atlas-hub-stat"><strong>{structureCount.toLocaleString('fr-FR')}</strong><span>repères anatomiques</span></div>
          </div>
        </div>

        <button className="atlas-hub-visual" onClick={onOpen3DAtlas} aria-label="Ouvrir l’atlas 3D du corps humain">
          <div className="atlas-visual-orbit atlas-visual-orbit-one" />
          <div className="atlas-visual-orbit atlas-visual-orbit-two" />
          <div className="atlas-visual-grid" />
          <div className="atlas-visual-glow" />
          <svg className="atlas-human-outline" viewBox="0 0 360 470" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="atlas-body-gradient" x1="76" y1="44" x2="285" y2="428" gradientUnits="userSpaceOnUse"><stop stopColor="#d9efec"/><stop offset=".48" stopColor="#85bcb9"/><stop offset="1" stopColor="#4e9293"/></linearGradient>
              <linearGradient id="atlas-line-gradient" x1="100" y1="86" x2="250" y2="396" gradientUnits="userSpaceOnUse"><stop stopColor="#faffff" stopOpacity=".92"/><stop offset="1" stopColor="#b8e4df" stopOpacity=".34"/></linearGradient>
              <filter id="atlas-body-shadow" x="38" y="10" width="284" height="452" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="15"/></filter>
            </defs>
            <ellipse cx="180" cy="435" rx="91" ry="13" fill="#6eaaa8" opacity=".22" filter="url(#atlas-body-shadow)"/>
            <path d="M158 49c0-17 10-29 22-29s22 12 22 29v18c0 15-10 26-22 26s-22-11-22-26V49Z" fill="url(#atlas-body-gradient)" stroke="url(#atlas-line-gradient)" strokeWidth="2"/>
            <path d="M158 98c-17 5-36 13-49 24-12 10-18 24-22 43l-20 94c-3 13 3 22 12 24 9 1 15-5 18-16l20-73 6 67-10 91c-2 14 5 23 14 23 9 0 14-7 16-19l14-76 4 73-2 70c0 13 6 21 15 21 10 0 15-8 15-20l3-81 3 81c0 12 5 20 15 20 9 0 15-8 15-21l-2-70 4-73 14 76c2 12 7 19 16 19 9 0 16-9 14-23l-10-91-6-67 20 73c3 11 9 17 18 16 9-2 15-11 12-24l-20-94c-4-19-10-33-22-43-13-11-32-19-49-24-9 9-19 13-30 13s-21-4-30-13Z" fill="url(#atlas-body-gradient)" fillOpacity=".82" stroke="url(#atlas-line-gradient)" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M180 111v189m-29-113 29 31 29-31m-28 113-22 68m22-68 22 68M124 135l28 13m84-13-28 13" stroke="url(#atlas-line-gradient)" strokeWidth="2" strokeLinecap="round" opacity=".72"/>
            <circle cx="180" cy="166" r="12" fill="#c7f1e7" fillOpacity=".65" stroke="#f5fffc" strokeOpacity=".88"/>
            <circle cx="180" cy="166" r="4" fill="#fff"/>
            <circle cx="180" cy="225" r="7" fill="#b7e6db" fillOpacity=".62" stroke="#f5fffc" strokeOpacity=".8"/>
            <path d="M167 252c8-6 18-6 26 0" stroke="#f5fffc" strokeOpacity=".62" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="atlas-visual-label atlas-visual-label-head"><i /> SYSTÈME NERVEUX</span>
          <span className="atlas-visual-label atlas-visual-label-heart"><i /> CIRCULATION</span>
          <span className="atlas-visual-caption"><span>01 / 03</span><strong>Une vision d’ensemble, jusque dans le détail.</strong><ArrowDownRight size={17} /></span>
        </button>
      </section>

      <section className="atlas-hub-explore" aria-label="Explorer par région anatomique">
        <div className="atlas-section-heading"><div><span>POUR COMMENCER</span><h2>Explorer par région</h2></div><span className="atlas-section-note">Choisissez un atlas pour entrer dans le détail</span></div>
        <div className="atlas-region-list">
          {brainAtlas && <button className="atlas-region-row brain-region" data-testid="card-atlas-brain" onClick={() => onSelectAtlas('brain', 'lateral', 'explore')}>
            <span className="atlas-region-symbol"><Brain size={22} strokeWidth={1.6} /></span><span className="atlas-region-content"><strong>Le cerveau</strong><small>Neuroanatomie · voies · fonctions</small></span><span className="atlas-region-count">{brainAtlas.views.length} planches</span><span className="atlas-region-action">Explorer <ArrowRight size={15} /></span>
          </button>}
          {heartAtlas && <button className="atlas-region-row heart-region" data-testid="card-atlas-heart" onClick={() => onSelectAtlas('heart', 'morphology', 'explore')}>
            <span className="atlas-region-symbol"><Heart size={22} strokeWidth={1.6} /></span><span className="atlas-region-content"><strong>Le cœur</strong><small>Anatomie · conduction · circulation</small></span><span className="atlas-region-count">{heartAtlas.views.length} planches</span><span className="atlas-region-action">Explorer <ArrowRight size={15} /></span>
          </button>}
          <button className="atlas-region-row body-region" onClick={onOpen3DAtlas}>
            <span className="atlas-region-symbol"><Activity size={22} strokeWidth={1.6} /></span><span className="atlas-region-content"><strong>Le corps humain</strong><small>Systèmes anatomiques en trois dimensions</small></span><span className="atlas-region-count">Atlas 3D</span><span className="atlas-region-action">Explorer <ArrowRight size={15} /></span>
          </button>
        </div>
      </section>
      <footer className="atlas-hub-note"><span>Un atlas pour apprendre, observer et comprendre.</span><span>Contenu pédagogique · ne remplace pas un avis médical</span></footer>
    </main>
  )
}
