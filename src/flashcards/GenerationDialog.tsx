import {useEffect, useRef, useState} from 'react'
import {Check, Plus, Sparkles, Trash2, X} from 'lucide-react'
import {createDeck, createNotesBulk, generateDrafts, listDecks} from './flashcardsApi'
import type {FlashcardDeck, FlashcardNoteDraft, GenerationSource, NoteType} from './flashcardsTypes'

const extractKeys = (text: string) => {
  const matches = [...text.matchAll(/\{\{c(\d+)::[\s\S]*?\}\}/g)]
  return [...new Set(matches.map(m => `c${m[1]}`))]
}

const countDerivedCards = (draft: FlashcardNoteDraft): number => {
  switch (draft.noteType) {
    case 'bidirectional':
      return 2
    case 'cloze': {
      const keys = extractKeys(draft.fields.text || '')
      return Math.max(1, keys.length)
    }
    case 'basic':
    case 'reverse':
    case 'typed':
    default:
      return 1
  }
}

export default function GenerationDialog({
  source,
  onClose,
  onSaved,
}: {
  source: GenerationSource
  onClose: () => void
  onSaved?: (info: {count: number; deckName: string}) => void
}) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [deckId, setDeckId] = useState('')
  const [level, setLevel] = useState<'essential' | 'standard' | 'complete'>('standard')
  const [count, setCount] = useState(12)
  const [selectedSections, setSelectedSections] = useState(() => source.sections?.map(s => s.id) || [])
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(source.pageCount || 1)
  const lock = useRef(false)
  const saveRequest = useRef<{payload: string; id: string} | null>(null)
  const [preview, setPreview] = useState(false)
  const [drafts, setDrafts] = useState<FlashcardNoteDraft[]>([])
  const [generationId, setGenerationId] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [newDeck, setNewDeck] = useState('')

  useEffect(() => {
    void listDecks()
      .then(value => {
        setDecks(value)
        setDeckId(value[0]?.id || '')
      })
      .catch(problem => setError(problem.message))
  }, [])

  const generate = async () => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const result = await generateDrafts(
        source,
        level,
        count,
        selectedSections,
        source.kind === 'study' ? {startPage, endPage} : undefined
      )
      setDrafts(result.drafts)
      setGenerationId(result.generationId)
      setPreview(result.drafts.length > 0)
      if (!result.drafts.length) {
        setError('Le contenu ne contient pas assez de notions explicites pour produire des cartes utiles.')
      }
    } catch (problem) {
      setError((problem as Error).message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const addDeck = async () => {
    if (lock.current || !newDeck.trim()) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const deck = await createDeck({name: newDeck})
      setDecks(value => [deck, ...value])
      setDeckId(deck.id)
      setNewDeck('')
    } catch (problem) {
      setError((problem as Error).message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const switchType = (index: number, nextType: NoteType) => {
    setDrafts(items =>
      items.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const prev = item.fields
        let nextFields = {...prev}

        if (['basic', 'reverse', 'bidirectional'].includes(nextType)) {
          if (item.noteType === 'cloze') {
            nextFields = {
              front: prev.front || '',
              back: (prev.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '$1'),
            }
          } else if (item.noteType === 'typed') {
            nextFields = {
              front: prev.front || '',
              back: prev.answer || '',
            }
          }
        } else if (nextType === 'typed') {
          nextFields = {
            front: prev.front || '',
            answer: prev.back || (prev.text ? prev.text.replace(/\{\{c\d+::(.*?)\}\}/g, '$1') : ''),
            acceptedAnswers: [],
          }
        } else if (nextType === 'cloze') {
          // Do NOT automatically create cloze markers
          nextFields = {
            text: prev.back || prev.text || prev.front || '',
            extra: prev.extra || '',
          }
        }

        return {
          ...item,
          noteType: nextType,
          fields: nextFields,
        }
      })
    )
  }

  const insertClozeAt = (index: number) => {
    setDrafts(items =>
      items.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const text = item.fields.text || ''
        const existingKeys = extractKeys(text)
        const nextNum = existingKeys.length + 1
        if (nextNum > 3) return item

        // Append template if no text
        const updatedText = text ? `${text} {{c${nextNum}::notion}}` : `{{c${nextNum}::notion}}`
        return {
          ...item,
          fields: {...item.fields, text: updatedText},
        }
      })
    )
  }

  const selected = drafts.filter(draft => draft.selected)
  const totalCards = selected.reduce((sum, draft) => sum + countDerivedCards(draft), 0)

  const isDraftValid = (draft: FlashcardNoteDraft): boolean => {
    const f = draft.fields
    switch (draft.noteType) {
      case 'basic':
      case 'reverse':
      case 'bidirectional':
        return Boolean(f.front?.trim() && f.back?.trim() && f.front.length <= 2000 && f.back.length <= 8000)
      case 'cloze': {
        const text = f.text?.trim() || ''
        const keys = extractKeys(text)
        return Boolean(text && keys.length >= 1 && keys.length <= 3 && text.length <= 4000)
      }
      case 'typed':
        return Boolean(f.front?.trim() && f.answer?.trim() && f.front.length <= 2000 && f.answer.length <= 200)
      default:
        return false
    }
  }

  const invalid = selected.some(draft => !isDraftValid(draft))

  const save = async () => {
    if (lock.current || !deckId || !selected.length) return
    if (invalid) {
      setError('Complétez le recto et le verso (ou les champs requis) de chaque carte ou notion sélectionnée, ou désélectionnez-la.')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const notesToSave = selected.map(draft => ({
        noteType: draft.noteType,
        defaultDeckId: deckId,
        title: draft.title,
        fields: draft.fields,
        subject: draft.subject,
        chapter: draft.chapter,
        tags: draft.tags,
        source: draft.source,
      }))

      const payload = JSON.stringify(notesToSave)
      if (saveRequest.current?.payload !== payload) {
        saveRequest.current = {payload, id: crypto.randomUUID()}
      }

      const result = await createNotesBulk(notesToSave, saveRequest.current.id, generationId)
      const targetDeck = decks.find(d => d.id === deckId)
      onSaved?.({count: result.totalNotes, deckName: targetDeck?.name || 'Inconnu'})
      onClose()
    } catch (problem) {
      setError((problem as Error).message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const close = () => {
    if (busy) return
    if (preview && drafts.length && !confirm('Fermer sans enregistrer les brouillons ?')) return
    onClose()
  }

  return (
    <div className="flash-modal-backdrop" role="presentation">
      <section className="flash-modal" role="dialog" aria-modal="true" aria-label="Générer des flashcards">
        <header>
          <div>
            <span className="study-eyebrow">GÉNÉRATION EN BROUILLON</span>
            <h2>Créer depuis « {source.title} »</h2>
          </div>
          <button className="icon-button" aria-label="Fermer" disabled={busy} onClick={close}>
            <X />
          </button>
        </header>

        {!preview ? (
          <div className="flash-generator-settings">
            {source.sections?.length ? (
              <fieldset>
                <legend>Contenu à utiliser</legend>
                <label className="flash-check">
                  <input
                    type="checkbox"
                    checked={selectedSections.length === source.sections.length}
                    onChange={event =>
                      setSelectedSections(event.target.checked ? source.sections!.map(s => s.id) : [])
                    }
                  />
                  <strong>Tout sélectionner</strong>
                </label>
                {source.sections.map(section => (
                  <label className="flash-check" key={section.id}>
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section.id)}
                      onChange={event =>
                        setSelectedSections(ids =>
                          event.target.checked ? [...ids, section.id] : ids.filter(id => id !== section.id)
                        )
                      }
                    />
                    <span>
                      {section.title}
                      {section.startPage
                        ? ` · p. ${section.startPage}${section.endPage !== section.startPage ? '–' + section.endPage : ''}`
                        : ''}
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : null}

            {source.kind === 'study' && (
              <div className="flash-setting-grid">
                <label>
                  Première page
                  <input
                    type="number"
                    min="1"
                    max={source.pageCount || 1}
                    value={startPage}
                    onChange={event => setStartPage(Math.max(1, Number(event.target.value)))}
                  />
                </label>
                <label>
                  Dernière page
                  <input
                    type="number"
                    min={startPage}
                    max={source.pageCount || 1}
                    value={endPage}
                    onChange={event => setEndPage(Math.min(source.pageCount || 1, Number(event.target.value)))}
                  />
                </label>
              </div>
            )}

            <div className="flash-setting-grid">
              <label>
                Niveau
                <select value={level} onChange={event => setLevel(event.target.value as typeof level)}>
                  <option value="essential">Essentiel</option>
                  <option value="standard">Standard</option>
                  <option value="complete">Complet</option>
                </select>
              </label>
              <label>
                Nombre approximatif de notions
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={count}
                  onChange={event => setCount(Number(event.target.value))}
                />
              </label>
            </div>

            <p>Le nombre est une cible : MyCorpus ne créera pas de notions artificielles pour l’atteindre.</p>
            <button
              className="study-primary"
              disabled={
                busy ||
                !Number.isInteger(count) ||
                count < 1 ||
                count > 80 ||
                Boolean(source.sections?.length && !selectedSections.length) ||
                startPage > endPage
              }
              onClick={generate}
            >
              <Sparkles size={17} />
              {busy ? 'Analyse en cours…' : 'Générer les brouillons'}
            </button>
          </div>
        ) : (
          <div className="flash-draft-stage">
            <div className="flash-draft-toolbar">
              <strong>
                {selected.length} notion{selected.length > 1 ? 's' : ''} · {totalCards} carte(s) sélectionnée(s) ({totalCards} dérivée{totalCards > 1 ? 's' : ''})
              </strong>
              <div>
                <button disabled={busy} onClick={() => setDrafts(items => items.map(item => ({...item, selected: true})))}>
                  Tout sélectionner
                </button>
                <button disabled={busy} onClick={() => setDrafts(items => items.map(item => ({...item, selected: false})))}>
                  Tout désélectionner
                </button>
              </div>
            </div>

            <p>Relisez chaque notion avant de l’enregistrer. Vous pouvez ajuster son type ou son contenu.</p>

            <div className="flash-draft-list">
              {drafts.map((draft, index) => {
                const isValid = isDraftValid(draft)
                return (
                  <article className={draft.selected ? 'is-selected' : ''} key={draft.temporaryId}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
                      <label className="flash-check">
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={draft.selected}
                          onChange={event =>
                            setDrafts(items =>
                              items.map((item, itemIndex) =>
                                itemIndex === index ? {...item, selected: event.target.checked} : item
                              )
                            )
                          }
                        />
                        <strong>Notion {index + 1}</strong>
                      </label>

                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        {draft.rationale && (
                          <small style={{fontSize: '11px', color: '#168496', background: '#16849615', padding: '2px 8px', borderRadius: '6px'}}>
                            {draft.rationale}
                          </small>
                        )}
                        <select
                          disabled={busy}
                          value={draft.noteType}
                          onChange={e => switchType(index, e.target.value as NoteType)}
                          style={{fontSize: '12px', padding: '4px 8px'}}
                          aria-label={`Type de la notion ${index + 1}`}
                        >
                          <option value="basic">Carte simple</option>
                          <option value="bidirectional">Bidirectionnelle (2 cartes)</option>
                          <option value="cloze">Texte à trous</option>
                          <option value="typed">Réponse à saisir</option>
                          <option value="reverse">Inversée</option>
                        </select>
                      </div>
                    </div>

                    {/* Editor based on noteType */}
                    {['basic', 'reverse', 'bidirectional'].includes(draft.noteType) && (
                      <>
                        <label>
                          Recto (Question)
                          <textarea
                            aria-label="Recto"
                            disabled={busy}
                            maxLength={2000}
                            value={draft.fields.front || ''}
                            onChange={e =>
                              setDrafts(items =>
                                items.map((item, i) =>
                                  i === index ? {...item, fields: {...item.fields, front: e.target.value}} : item
                                )
                              )
                            }
                          />
                        </label>
                        <label>
                          Verso (Réponse)
                          <textarea
                            aria-label="Verso"
                            disabled={busy}
                            maxLength={8000}
                            value={draft.fields.back || ''}
                            onChange={e =>
                              setDrafts(items =>
                                items.map((item, i) =>
                                  i === index ? {...item, fields: {...item.fields, back: e.target.value}} : item
                                )
                              )
                            }
                          />
                        </label>
                        {draft.noteType === 'bidirectional' && (
                          <p style={{fontSize: '12px', color: '#168496', margin: '2px 0'}}>
                            ℹ 2 cartes dérivées seront créées : Recto → Verso et Verso → Recto.
                          </p>
                        )}
                      </>
                    )}

                    {draft.noteType === 'cloze' && (
                      <>
                        <label>
                          Texte à trous
                          <textarea
                            disabled={busy}
                            maxLength={4000}
                            value={draft.fields.text || ''}
                            placeholder="Entourez les notions à masquer de {{c1::notion}}..."
                            onChange={e =>
                              setDrafts(items =>
                                items.map((item, i) =>
                                  i === index ? {...item, fields: {...item.fields, text: e.target.value}} : item
                                )
                              )
                            }
                          />
                        </label>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <button
                            type="button"
                            className="study-secondary"
                            style={{fontSize: '12px', padding: '4px 8px'}}
                            disabled={busy || extractKeys(draft.fields.text || '').length >= 3}
                            onClick={() => insertClozeAt(index)}
                          >
                            + Insérer un trou ({`c${extractKeys(draft.fields.text || '').length + 1}`})
                          </button>
                          <small style={{color: '#657a82', fontSize: '11px'}}>
                            {extractKeys(draft.fields.text || '').length} trou(s) détecté(s) (max 3)
                          </small>
                        </div>
                      </>
                    )}

                    {draft.noteType === 'typed' && (
                      <>
                        <label>
                          Question / Consigne
                          <textarea
                            disabled={busy}
                            maxLength={2000}
                            value={draft.fields.front || ''}
                            onChange={e =>
                              setDrafts(items =>
                                items.map((item, i) =>
                                  i === index ? {...item, fields: {...item.fields, front: e.target.value}} : item
                                )
                              )
                            }
                          />
                        </label>
                        <label>
                          Réponse exacte à saisir
                          <input
                            disabled={busy}
                            maxLength={200}
                            value={draft.fields.answer || ''}
                            onChange={e =>
                              setDrafts(items =>
                                items.map((item, i) =>
                                  i === index ? {...item, fields: {...item.fields, answer: e.target.value}} : item
                                )
                              )
                            }
                          />
                        </label>
                        <small style={{fontSize: '11px', color: '#168496'}}>
                          ℹ L’étudiant devra saisir exactement cette réponse pour valider la carte.
                        </small>
                      </>
                    )}

                    {!isValid && draft.selected && (
                      <p style={{color: '#b91c1c', fontSize: '12px', margin: '4px 0'}}>
                        ⚠ Des champs obligatoires sont incomplets pour le type sélectionné.
                      </p>
                    )}

                    {draft.source.excerpt && (
                      <details style={{fontSize: '12px', color: '#657a82'}}>
                        <summary>Passage source</summary>
                        <p style={{margin: '4px 0', fontStyle: 'italic'}}>« {draft.source.excerpt} »</p>
                      </details>
                    )}

                    <button
                      className="flash-remove-draft"
                      disabled={busy}
                      onClick={() => setDrafts(items => items.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </article>
                )
              })}
            </div>

            <button
              className="study-secondary"
              aria-label="Ajouter une carte"
              disabled={busy}
              onClick={() =>
                setDrafts(items => [
                  ...items,
                  {
                    temporaryId: crypto.randomUUID(),
                    noteType: 'basic',
                    fields: {front: '', back: ''},
                    subject: source.subject || '',
                    chapter: source.chapter || source.title,
                    tags: [],
                    selected: true,
                    source: {
                      type: source.kind === 'text' ? 'free_text' : source.kind === 'study' ? 'study_document' : source.kind === 'qcm-error' ? 'qcm_error' : 'catalog_course',
                      courseId: source.courseId,
                      documentId: source.documentId,
                    },
                    rationale: 'Ajout manuel',
                  },
                ])
              }
            >
              <Plus size={16} />
              Ajouter une notion
            </button>

            <div className="flash-save-row">
              <label>
                Deck de destination
                <select disabled={busy} value={deckId} onChange={event => setDeckId(event.target.value)}>
                  <option value="">Choisir un deck</option>
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <input
                  disabled={busy}
                  maxLength={100}
                  aria-label="Nouveau deck"
                  placeholder="Nouveau deck…"
                  value={newDeck}
                  onChange={event => setNewDeck(event.target.value)}
                />
                <button disabled={busy || !newDeck.trim()} onClick={addDeck}>
                  Créer
                </button>
              </div>

              <button
                className="study-primary"
                disabled={busy || !deckId || !selected.length}
                onClick={save}
              >
                <Check size={17} />
                {busy ? 'Enregistrement…' : 'Enregistrer la sélection'}
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="flash-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}
