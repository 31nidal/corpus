import { useState, useMemo } from 'react'
import type { AtlasDefinition } from './types'
import {
  Brain,
  Heart,
  Rotate3D,
  Search,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
} from 'lucide-react'

interface Props {
  atlases: AtlasDefinition[]
  onSelectAtlas: (atlasId: string, viewId?: string, mode?: string) => void
  onOpen3DAtlas: () => void
  onNavigateCourse?: (courseId: string) => void
}

export default function AtlasHub({
  atlases,
  onSelectAtlas,
  onOpen3DAtlas,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return []

    const query = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const results: {
      atlasId: string
      atlasName: string
      viewId: string
      viewName: string
      structureId: string
      structureName: string
      latinName?: string
      category: string
    }[] = []

    for (const atlas of atlases) {
      const allStructures = atlas.views.flatMap((v) => v.structures)
      for (const structure of allStructures) {
        const nameNorm = structure.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const latinNorm = (structure.latinName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const catNorm = structure.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

        if (nameNorm.includes(query) || latinNorm.includes(query) || catNorm.includes(query)) {
          const view = atlas.views.find((v) => v.id === structure.viewId)
          results.push({
            atlasId: atlas.id,
            atlasName: atlas.title,
            viewId: structure.viewId,
            viewName: view?.name || structure.viewId,
            structureId: structure.id,
            structureName: structure.name,
            latinName: structure.latinName,
            category: structure.category,
          })
        }
      }
    }

    return results.slice(0, 8)
  }, [atlases, searchQuery])

  const brainAtlas = atlases.find((a) => a.id === 'brain')
  const heartAtlas = atlases.find((a) => a.id === 'heart')

  return (
    <div className="atlas-hub-container" data-testid="atlas-hub">
      {/* Hero section */}
      <section className="atlas-hub-hero">
        <div className="hero-badge">
          <Sparkles size={16} />
          <span>MyCorpus Anatomie & Physiologie</span>
        </div>
        <h1 className="hero-title">Atlas Médicaux Haute Fidélité</h1>
        <p className="hero-description">
          Explorez l'anatomie descriptive, les voies fonctionnelles et les corrélations
          électriques et cliniques à travers des planches médicales interactives, reliées
          à vos cours et flashcards FSRS.
        </p>

        {/* Global Search */}
        <div className="atlas-hub-search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une structure (ex: Gyrus précentral, Tronc cœliaque, Faisceau de His)..."
            className="atlas-hub-search-input"
            aria-label="Rechercher une structure dans tous les atlas"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Effacer la recherche"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results-dropdown" data-testid="atlas-search-results">
            <div className="search-results-header">
              <span>{searchResults.length} structure(s) trouvée(s)</span>
            </div>
            <div className="search-results-list">
              {searchResults.map((res) => (
                <button
                  key={`${res.atlasId}-${res.structureId}`}
                  className="search-result-item"
                  onClick={() => onSelectAtlas(res.atlasId, res.viewId, 'explore')}
                >
                  <div className="result-main">
                    <strong>{res.structureName}</strong>
                    {res.latinName && <span className="result-latin">({res.latinName})</span>}
                  </div>
                  <div className="result-meta">
                    <span className="atlas-pill">{res.atlasName}</span>
                    <span className="view-pill">{res.viewName}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Quick stats banner */}
      <section className="atlas-stats-banner">
        <div className="stat-card">
          <div className="stat-number">10+</div>
          <div className="stat-label">Vues Médicales HD</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-card">
          <div className="stat-number">60+</div>
          <div className="stat-label">Structures Annotées</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-card">
          <div className="stat-number">5</div>
          <div className="stat-label">Trajets Physiologiques</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-card">
          <div className="stat-number">100%</div>
          <div className="stat-label">FSRS & ECN Connecté</div>
        </div>
      </section>

      {/* Primary Atlases Grid */}
      <section className="atlas-cards-grid">
        {/* Brain Atlas */}
        {brainAtlas && (
          <div className="atlas-feature-card brain-card" data-testid="card-atlas-brain">
            <div className="card-top-glow" />
            <div className="card-header">
              <div className="card-icon-badge brain-badge">
                <Brain size={28} />
              </div>
              <div className="card-labels">
                <span className="status-tag">Prioritaire ECN</span>
                <span className="views-count-tag">5 Vues HD</span>
              </div>
            </div>

            <h2 className="card-title">Atlas Neuroanatomie & Cerveau</h2>
            <p className="card-summary">
              Cartographie complète du cortex, des noyaux gris centraux, du tronc cérébral et
              des nerfs crâniens I à XII. Tracé dynamique des voies corticospinale, visuelle et
              du liquide cérébrospinal.
            </p>

            <div className="card-features-list">
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-check" />
                <span>5 Vues : Latérale, Sagittale, Charcot, Base & Willis</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-check" />
                <span>Trajets animés : Voie pyramidale & Circulation du LCR</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-check" />
                <span>Neuro-Explorer fonctionnel (Motricité, Langage, Mémoire)</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-check" />
                <span>Cas cliniques : AVC Sylvien / ACM & Hydrocéphalie</span>
              </div>
            </div>

            <div className="card-actions">
              <button
                className="btn-card-primary"
                onClick={() => onSelectAtlas('brain', 'lateral', 'explore')}
              >
                <span>Explorer le Cerveau</span>
                <ArrowRight size={18} />
              </button>
              <div className="quick-sub-links">
                <button
                  className="btn-card-sub"
                  onClick={() => onSelectAtlas('brain', 'sagittal', 'pathway')}
                >
                  <Activity size={14} /> Trajets & Voies
                </button>
                <button
                  className="btn-card-sub"
                  onClick={() => onSelectAtlas('brain', 'cranial_nerves', 'test')}
                >
                  <Award size={14} /> Quiz Neuro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Heart Atlas */}
        {heartAtlas && (
          <div className="atlas-feature-card heart-card" data-testid="card-atlas-heart">
            <div className="card-top-glow" />
            <div className="card-header">
              <div className="card-icon-badge heart-badge">
                <Heart size={28} />
              </div>
              <div className="card-labels">
                <span className="status-tag">Prioritaire ECN</span>
                <span className="views-count-tag">5 Vues HD</span>
              </div>
            </div>

            <h2 className="card-title">Atlas Cardiologie & Cœur</h2>
            <p className="card-summary">
              Anatomie descriptive du myocarde, 4 cavités et valves, vascularisation coronarienne
              complète, système cardionecteur avec corrélation ECG et foyers d'auscultation
              thoracique.
            </p>

            <div className="card-features-list">
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-check" />
                <span>5 Vues : Morphologie, Cavités/Valves, Coronaires, ECG, Auscultation</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-check" />
                <span>Système de conduction & Synchronisation onde P-QRS-T</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-check" />
                <span>Circuit complet grande & petite circulation sanguine</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-check" />
                <span>Cas cliniques : Infarctus STEMI antérieur & Rétrécissement aortique</span>
              </div>
            </div>

            <div className="card-actions">
              <button
                className="btn-card-primary"
                onClick={() => onSelectAtlas('heart', 'morphology', 'explore')}
              >
                <span>Explorer le Cœur</span>
                <ArrowRight size={18} />
              </button>
              <div className="quick-sub-links">
                <button
                  className="btn-card-sub"
                  onClick={() => onSelectAtlas('heart', 'conduction', 'pathway')}
                >
                  <Activity size={14} /> Conduction & ECG
                </button>
                <button
                  className="btn-card-sub"
                  onClick={() => onSelectAtlas('heart', 'coronary', 'test')}
                >
                  <Award size={14} /> Quiz Cardio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3D Human Body Atlas */}
        <div className="atlas-feature-card body3d-card" data-testid="card-atlas-3d">
          <div className="card-top-glow" />
          <div className="card-header">
            <div className="card-icon-badge body3d-badge">
              <Rotate3D size={28} />
            </div>
            <div className="card-labels">
              <span className="status-tag tag-3d">3D Temps Réel</span>
              <span className="views-count-tag">8 Systèmes</span>
            </div>
          </div>

          <h2 className="card-title">Atlas 3D du Corps Humain</h2>
          <p className="card-summary">
            Exploration spatiale temps réel du modèle masculin (DBCLS BodyParts3D) et féminin
            (HuBMAP HRA). Contrôle multicouche des organes, muscles, squelette, vaisseaux et nerfs.
          </p>

          <div className="card-features-list">
            <div className="feature-item">
              <CheckCircle2 size={16} className="feature-check" />
              <span>Modèles masculins et féminins validés scientifiquement</span>
            </div>
            <div className="feature-item">
              <CheckCircle2 size={16} className="feature-check" />
              <span>Coupes anatomiques sagittales, coronales et axiales</span>
            </div>
            <div className="feature-item">
              <CheckCircle2 size={16} className="feature-check" />
              <span>Isolation de structures et réglage d'opacité en temps réel</span>
            </div>
          </div>

          <div className="card-actions">
            <button className="btn-card-primary" onClick={onOpen3DAtlas}>
              <span>Ouvrir l'Atlas 3D</span>
              <Rotate3D size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Educational integrations footer */}
      <section className="atlas-hub-footer-info">
        <div className="info-block">
          <BookOpen size={20} className="info-icon" />
          <div>
            <h4>Connecté à vos cours</h4>
            <p>
              Chaque planche anatomique est directement liée aux fiches de cours MyCorpus
              pour une révision active en contexte.
            </p>
          </div>
        </div>
        <div className="info-block">
          <Layers size={20} className="info-icon" />
          <div>
            <h4>Flashcards FSRS en 1 Clic</h4>
            <p>
              Convertissez n'importe quelle structure ou planche en flashcard avec
              occlusion ou révision espacée immédiate.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
