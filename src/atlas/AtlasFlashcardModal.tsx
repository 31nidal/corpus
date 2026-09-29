import { useState, useEffect } from 'react'
import type { AtlasDefinition, AtlasStructure } from './types'
import { listDecks, createCard, createDeck } from '../flashcards/flashcardsApi'
import type { FlashcardDeck } from '../flashcards/flashcardsTypes'
import {
  X,
  CreditCard,
  Sparkles,
  CheckCircle2,
  FolderPlus,
  Layers,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  structure: AtlasStructure | null
  atlas: AtlasDefinition
  currentViewId: string
  mode?: 'basic' | 'occlusion'
}

export default function AtlasFlashcardModal({
  isOpen,
  onClose,
  structure,
  atlas,
  mode = 'basic',
}: Props) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string>('')
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [newDeckName, setNewDeckName] = useState(
    atlas.id === 'brain' ? 'Atlas Neuroanatomie' : 'Atlas Cardiologie'
  )

  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setSuccess(false)
    setError(null)
    setLoading(true)

    listDecks()
      .then((loadedDecks) => {
        setDecks(loadedDecks)
        if (loadedDecks.length > 0) {
          const matchingDeck = loadedDecks.find(
            (d) =>
              d.name.toLowerCase().includes(atlas.id) ||
              (atlas.id === 'brain' && d.name.toLowerCase().includes('neuro')) ||
              (atlas.id === 'heart' && d.name.toLowerCase().includes('cardio'))
          )
          setSelectedDeckId(matchingDeck ? matchingDeck.id : loadedDecks[0].id)
        } else {
          setIsCreatingDeck(true)
        }
      })
      .catch((err) => {
        console.error('Erreur chargement decks:', err)
        setError('Impossible de charger les paquets de flashcards.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, atlas.id])

  useEffect(() => {
    if (!structure) return

    if (mode === 'basic') {
      setFront(`🧠 Anatomie & Fonction : **${structure.name}**\n\n*(Nom latin : ${structure.latinName || 'N/A'})*\n\nDonnez sa localisation, sa vascularisation principale, sa fonction clé et son implication clinique.`)
      
      let backContent = `### 📍 Localisation\n${structure.location || 'Voir atlas'}\n\n`
      if (structure.vascularization) {
        backContent += `### 🩸 Vascularisation\n${structure.vascularization}\n\n`
      }
      backContent += `### ⚙️ Fonction\n${structure.function || structure.description}\n\n`
      if (structure.clinicalPearl) {
        backContent += `### 💡 Perle clinique\n${structure.clinicalPearl}\n\n`
      }
      if (structure.examHighYield) {
        backContent += `### 🎯 Repère ECN\n${structure.examHighYield}`
      }
      setBack(backContent)
    } else {
      const view = atlas.views.find(v => v.id === structure.viewId)
      setFront(`🔍 Identification anatomique :\n\nQuelle est la structure surlignée sur la vue **${view?.name || 'anatomique'}** de l'atlas ?`)
      setBack(`**${structure.name}** (*${structure.latinName || 'N/A'}*)\n\nCatégorie : ${structure.category}\n\n${structure.function || structure.description}`)
    }

    setTags(['atlas', atlas.id, structure.category, 'mycorpus'])
  }, [structure, atlas, mode])

  if (!isOpen || !structure) return null

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      let targetDeckId = selectedDeckId

      if (isCreatingDeck && newDeckName.trim()) {
        const created = await createDeck({
          name: newDeckName.trim(),
          description: `Paquet généré depuis l'Atlas ${atlas.title}`,
          subject: atlas.id === 'brain' ? 'Neuroanatomie' : 'Cardiologie',
        })
        targetDeckId = created.id
      }

      if (!targetDeckId) {
        throw new Error('Veuillez sélectionner ou créer un paquet.')
      }

      await createCard({
        deckId: targetDeckId,
        front: front.trim(),
        back: back.trim(),
        tags: tags,
      })

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de la création.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="atlas-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="atlas-flashcard-modal"
        onClick={(e) => e.stopPropagation()}
        data-testid="atlas-flashcard-modal"
      >
        <div className="atlas-modal-header">
          <div className="modal-title-wrap">
            <CreditCard size={20} className="modal-title-icon" />
            <div>
              <h3>Créer une Flashcard FSRS</h3>
              <p className="modal-subtitle">
                {structure.name} · {atlas.title}
              </p>
            </div>
          </div>
          <button className="atlas-modal-close" onClick={onClose} aria-label="Fermer la boîte de dialogue">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="atlas-modal-success">
            <CheckCircle2 size={48} className="success-icon" />
            <h4>Flashcard FSRS créée avec succès !</h4>
            <p>La carte est désormais intégrée dans votre algorithme de révision espacée FSRS.</p>
          </div>
        ) : (
          <form onSubmit={handleCreateCard} className="atlas-modal-form">
            {error && (
              <div className="atlas-form-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group deck-group">
              <label htmlFor="deck-select">
                <Layers size={16} /> Paquet de destination :
              </label>

              {loading ? (
                <div className="loading-decks">
                  <Loader2 size={16} className="spin-icon" /> Chargement des paquets...
                </div>
              ) : isCreatingDeck ? (
                <div className="create-deck-inline">
                  <input
                    type="text"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="Nom du nouveau paquet..."
                    className="atlas-input"
                    required
                  />
                  <button
                    type="button"
                    className="atlas-btn-link"
                    onClick={() => setIsCreatingDeck(false)}
                    disabled={decks.length === 0}
                  >
                    Choisir existant
                  </button>
                </div>
              ) : (
                <div className="select-deck-inline">
                  <select
                    id="deck-select"
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="atlas-select"
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="atlas-btn-link"
                    onClick={() => setIsCreatingDeck(true)}
                  >
                    <FolderPlus size={14} /> Nouveau
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="card-front">Recto de la carte (Question / Invite) :</label>
              <textarea
                id="card-front"
                rows={4}
                value={front}
                onChange={(e) => setFront(e.target.value)}
                className="atlas-textarea"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="card-back">Verso de la carte (Réponse / Définition médicale) :</label>
              <textarea
                id="card-back"
                rows={7}
                value={back}
                onChange={(e) => setBack(e.target.value)}
                className="atlas-textarea"
                required
              />
            </div>

            <div className="form-footer">
              <div className="fsrs-info-pill">
                <Sparkles size={14} /> Planifiée automatiquement via FSRS v5
              </div>
              <div className="modal-actions">
                <button type="button" className="atlas-btn-secondary" onClick={onClose} disabled={submitting}>
                  Annuler
                </button>
                <button type="submit" className="atlas-btn-primary" disabled={submitting || loading}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spin-icon" /> Création en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Enregistrer la Flashcard
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
