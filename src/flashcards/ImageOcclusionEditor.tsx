import React, {useState, useRef, useEffect} from 'react'
import {
  Square,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Layers,
} from 'lucide-react'
import type {FlashcardDeck, FlashcardNote, ImageOcclusionMask} from './flashcardsTypes'
import {createNote, updateNote, uploadFlashcardAsset} from './flashcardsApi'

interface ImageOcclusionEditorProps {
  imageSrc: string
  initialAssetId?: string | null
  imageBlob?: Blob | null
  sourceMetadata?: {
    sourceKind: string
    sourceDocumentId?: string | null
    sourcePage?: number | null
    sourceCrop?: {x: number; y: number; width: number; height: number} | null
  } | null
  defaultDeckId: string
  decks: FlashcardDeck[]
  noteId?: string | null
  noteVersion?: number
  initialMasks?: ImageOcclusionMask[]
  initialPrompt?: string
  initialExtra?: string
  initialSubject?: string
  initialChapter?: string
  initialTags?: string[]
  onCreated: (note: FlashcardNote) => void
  onUpdated?: () => void
  onCancel: () => void
}

export const ImageOcclusionEditor: React.FC<ImageOcclusionEditorProps> = ({
  imageSrc,
  initialAssetId,
  imageBlob,
  sourceMetadata,
  defaultDeckId,
  decks,
  noteId,
  noteVersion,
  initialMasks = [],
  initialPrompt = 'Identifier la structure masquée',
  initialExtra = '',
  initialSubject = '',
  initialChapter = '',
  initialTags = [],
  onCreated,
  onUpdated,
  onCancel,
}) => {
  const [masks, setMasks] = useState<ImageOcclusionMask[]>(initialMasks)
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [extra, setExtra] = useState(initialExtra)
  const [deckId, setDeckId] = useState(defaultDeckId || decks[0]?.id || '')
  const [subject, setSubject] = useState(initialSubject)
  const [chapter, setChapter] = useState(initialChapter)
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '))

  useEffect(() => {
    if (!deckId && decks.length > 0) {
      setDeckId(defaultDeckId || decks[0].id)
    }
  }, [decks, deckId, defaultDeckId])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drag creation & moving/resizing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{x: number; y: number} | null>(null)
  const [currentDraw, setCurrentDraw] = useState<{x: number; y: number; width: number; height: number} | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<{x: number; y: number} | null>(null)

  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{mask: ImageOcclusionMask; handle: string; startCoords: {x: number; y: number}} | null>(null)

  const imageContainerRef = useRef<HTMLDivElement | null>(null)
  const imageElementRef = useRef<HTMLImageElement | null>(null)

  const clamp = (val: number, min = 0, max = 1) => Math.max(min, Math.min(max, val))

  const getNormalizedCoords = (e: {clientX: number; clientY: number}) => {
    if (!imageElementRef.current) return {x: 0, y: 0}
    const rect = imageElementRef.current.getBoundingClientRect()
    return {
      x: clamp((e.clientX - rect.left) / rect.width),
      y: clamp((e.clientY - rect.top) / rect.height),
    }
  }

  // --- RESIZE HANDLER ---
  const handleResizeStart = (e: React.MouseEvent | React.PointerEvent, handle: string, mask: ImageOcclusionMask) => {
    e.stopPropagation()
    if ('button' in e && e.button !== 0) return
    const coords = getNormalizedCoords(e)
    setSelectedMaskId(mask.id)
    setIsResizing(handle)
    setResizeStart({mask: {...mask}, handle, startCoords: coords})
  }

  // --- MOUSE HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement

    // If clicked on resize handle or delete button, ignore here
    if (target.closest('[data-resize-handle]') || target.closest('[data-delete-btn]')) return

    // If clicked on an existing mask, select it or start dragging
    const maskEl = target.closest('[data-mask-id]') as HTMLElement | null
    if (maskEl) {
      const clickedId = maskEl.getAttribute('data-mask-id')
      if (clickedId) {
        setSelectedMaskId(clickedId)
        const mask = masks.find(m => m.id === clickedId)
        if (mask) {
          const coords = getNormalizedCoords(e)
          setIsDragging(true)
          setDragOffset({x: coords.x - mask.x, y: coords.y - mask.y})
          return
        }
      }
    }

    // Otherwise, start drawing a new mask
    if (masks.length >= 50) {
      setError('Limite maximale de 50 masques atteinte par note.')
      return
    }

    setSelectedMaskId(null)
    const coords = getNormalizedCoords(e)
    setIsDrawing(true)
    setDrawStart(coords)
    setCurrentDraw(null)
  }

  const handleMouseMove = (e: React.MouseEvent | React.PointerEvent) => {
    const coords = getNormalizedCoords(e)

    if (isResizing && resizeStart) {
      const {mask: orig, handle, startCoords} = resizeStart
      const deltaX = coords.x - startCoords.x
      const deltaY = coords.y - startCoords.y
      let newX = orig.x
      let newY = orig.y
      let newW = orig.width
      let newH = orig.height

      if (handle === 'se') {
        newW = clamp(orig.width + deltaX, 0.01, 1 - orig.x)
        newH = clamp(orig.height + deltaY, 0.01, 1 - orig.y)
      } else if (handle === 'ne') {
        const right = clamp(orig.x + orig.width + deltaX, orig.x + 0.01, 1)
        newW = right - orig.x
        const top = clamp(orig.y + deltaY, 0, (orig.y + orig.height) - 0.01)
        newY = top
        newH = (orig.y + orig.height) - top
      } else if (handle === 'sw') {
        const left = clamp(orig.x + deltaX, 0, (orig.x + orig.width) - 0.01)
        newX = left
        newW = (orig.x + orig.width) - left
        const bottom = clamp(orig.y + orig.height + deltaY, orig.y + 0.01, 1)
        newH = bottom - orig.y
      } else if (handle === 'nw') {
        const left = clamp(orig.x + deltaX, 0, (orig.x + orig.width) - 0.01)
        newX = left
        newW = (orig.x + orig.width) - left
        const top = clamp(orig.y + deltaY, 0, (orig.y + orig.height) - 0.01)
        newY = top
        newH = (orig.y + orig.height) - top
      }

      setMasks(prev =>
        prev.map(m => {
          if (m.id !== orig.id) return m
          return {
            ...m,
            x: Math.round(newX * 10000) / 10000,
            y: Math.round(newY * 10000) / 10000,
            width: Math.round(newW * 10000) / 10000,
            height: Math.round(newH * 10000) / 10000,
          }
        })
      )
      return
    }

    if (isDragging && selectedMaskId && dragOffset) {
      setMasks(prev =>
        prev.map(m => {
          if (m.id !== selectedMaskId) return m
          const newX = clamp(coords.x - dragOffset.x, 0, 1 - m.width)
          const newY = clamp(coords.y - dragOffset.y, 0, 1 - m.height)
          return {
            ...m,
            x: Math.round(newX * 10000) / 10000,
            y: Math.round(newY * 10000) / 10000,
          }
        })
      )
      return
    }

    if (isDrawing && drawStart) {
      const x = Math.min(drawStart.x, coords.x)
      const y = Math.min(drawStart.y, coords.y)
      const width = Math.abs(coords.x - drawStart.x)
      const height = Math.abs(coords.y - drawStart.y)

      if (width > 0.005 && height > 0.005) {
        setCurrentDraw({x, y, width, height})
      }
    }
  }

  const handleMouseUp = () => {
    if (isDrawing && currentDraw && currentDraw.width > 0.01 && currentDraw.height > 0.01) {
      const newMask: ImageOcclusionMask = {
        id: `mask_${crypto.randomUUID()}`,
        x: Math.round(currentDraw.x * 10000) / 10000,
        y: Math.round(currentDraw.y * 10000) / 10000,
        width: Math.round(currentDraw.width * 10000) / 10000,
        height: Math.round(currentDraw.height * 10000) / 10000,
        label: `Structure ${masks.length + 1}`,
      }
      setMasks(prev => [...prev, newMask])
      setSelectedMaskId(newMask.id)
    }

    setIsDrawing(false)
    setDrawStart(null)
    setCurrentDraw(null)
    setIsDragging(false)
    setDragOffset(null)
    setIsResizing(null)
    setResizeStart(null)
  }

  const handleDeleteMask = (id: string) => {
    setMasks(prev => prev.filter(m => m.id !== id))
    if (selectedMaskId === id) {
      setSelectedMaskId(null)
    }
  }

  const handleUpdateMaskLabel = (id: string, label: string) => {
    setMasks(prev => prev.map(m => (m.id === id ? {...m, label} : m)))
  }

  // --- SAVE ACTION ---
  const handleSave = async () => {
    setError(null)
    if (!deckId) {
      setError('Veuillez sélectionner un paquet cible.')
      return
    }
    if (masks.length === 0) {
      setError('Veuillez dessiner au moins un masque sur l’image.')
      return
    }
    if (masks.length > 50) {
      setError('Maximum 50 masques autorisés.')
      return
    }

    setSaving(true)
    try {
      let finalAssetId = initialAssetId

      // Upload asset if not already stored
      if (!finalAssetId) {
        if (!imageBlob) {
          throw new Error('Image source introuvable.')
        }
        const asset = await uploadFlashcardAsset(imageBlob, {
          sourceKind: sourceMetadata?.sourceKind || 'upload',
          sourceDocumentId: sourceMetadata?.sourceDocumentId,
          sourcePage: sourceMetadata?.sourcePage,
          sourceCrop: sourceMetadata?.sourceCrop,
        })
        finalAssetId = asset.id
      }

      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const noteSource = sourceMetadata?.sourceDocumentId
        ? {
            type: 'study_document',
            documentId: sourceMetadata.sourceDocumentId,
            locator: sourceMetadata.sourcePage ? {page: sourceMetadata.sourcePage} : undefined,
          }
        : {type: 'manual'}

      if (noteId && typeof noteVersion === 'number') {
        await updateNote(
          noteId,
          {
            defaultDeckId: deckId,
            noteType: 'image_occlusion',
            assetId: finalAssetId,
            title: prompt || 'Image Occlusion',
            fields: {
              prompt: prompt.trim() || 'Identifier la structure masquée',
              extra: extra.trim(),
              occlusionMode: 'hide_one',
              masks,
            },
            subject: subject.trim(),
            chapter: chapter.trim(),
            tags,
          },
          noteVersion
        )
        if (onUpdated) {
          onUpdated()
        } else {
          onCreated({ id: noteId } as any)
        }
      } else {
        const note = await createNote({
          defaultDeckId: deckId,
          noteType: 'image_occlusion',
          assetId: finalAssetId,
          title: prompt || 'Image Occlusion',
          fields: {
            prompt: prompt.trim() || 'Identifier la structure masquée',
            extra: extra.trim(),
            occlusionMode: 'hide_one',
            masks,
          },
          subject: subject.trim(),
          chapter: chapter.trim(),
          tags,
          source: noteSource as any,
        })
        onCreated(note)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement de la note.')
      setSaving(false)
    }
  }

  const selectedMask = masks.find(m => m.id === selectedMaskId)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              {noteId ? 'Modifier la flashcard visuelle' : 'Éditeur Image Occlusion'}
              <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                {masks.length} carte{masks.length > 1 ? 's' : ''} dérivée{masks.length > 1 ? 's' : ''}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Chaque rectangle correspond à une carte indépendante avec son propre suivi FSRS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || masks.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-sm transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {noteId ? 'Mise à jour…' : 'Génération des cartes…'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {noteId ? 'Enregistrer les modifications' : `Créer la Note et ${masks.length} carte${masks.length > 1 ? 's' : ''}`}
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main workspace: 2-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Canvas / Image Area */}
        <div
          ref={imageContainerRef}
          className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-900/40 relative select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
        >
          <div className="relative inline-block border border-slate-700/80 rounded-lg shadow-2xl overflow-hidden bg-black/40 cursor-crosshair">
            <img
              ref={imageElementRef}
              src={imageSrc}
              alt="Source à masquer"
              className="block max-h-[75vh] w-auto h-auto object-contain pointer-events-none"
              draggable={false}
            />

            {/* Existing Masks */}
            {masks.map((mask, idx) => {
              const isSelected = mask.id === selectedMaskId
              return (
                <div
                  key={mask.id}
                  data-mask-id={mask.id}
                  className={`absolute rounded cursor-move transition-shadow ${
                    isSelected
                      ? 'border-2 border-indigo-400 bg-indigo-600/80 shadow-lg shadow-indigo-500/30'
                      : 'border-2 border-amber-400/90 bg-amber-500/70 hover:bg-amber-500/85 shadow-sm'
                  }`}
                  style={{
                    left: `${mask.x * 100}%`,
                    top: `${mask.y * 100}%`,
                    width: `${mask.width * 100}%`,
                    height: `${mask.height * 100}%`,
                  }}
                  title={mask.label || `Masque ${idx + 1}`}
                >
                  <div className="w-full h-full flex items-center justify-center p-1 text-center overflow-hidden">
                    <span className="text-[11px] font-semibold text-white drop-shadow truncate select-none">
                      {mask.label || `#${idx + 1}`}
                    </span>
                  </div>

                  {isSelected && (
                    <>
                      <button
                        type="button"
                        data-delete-btn="true"
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteMask(mask.id)
                        }}
                        className="absolute -top-3 -right-3 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full shadow z-20"
                        title="Supprimer ce masque"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* 4 Corner Resize Handles */}
                      <div
                        data-resize-handle="nw"
                        onMouseDown={e => handleResizeStart(e, 'nw', mask)}
                        onPointerDown={e => handleResizeStart(e, 'nw', mask)}
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize z-10"
                        title="Redimensionner coin haut-gauche"
                      />
                      <div
                        data-resize-handle="ne"
                        onMouseDown={e => handleResizeStart(e, 'ne', mask)}
                        onPointerDown={e => handleResizeStart(e, 'ne', mask)}
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize z-10"
                        title="Redimensionner coin haut-droite"
                      />
                      <div
                        data-resize-handle="sw"
                        onMouseDown={e => handleResizeStart(e, 'sw', mask)}
                        onPointerDown={e => handleResizeStart(e, 'sw', mask)}
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize z-10"
                        title="Redimensionner coin bas-gauche"
                      />
                      <div
                        data-resize-handle="se"
                        onMouseDown={e => handleResizeStart(e, 'se', mask)}
                        onPointerDown={e => handleResizeStart(e, 'se', mask)}
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize z-10"
                        title="Redimensionner coin bas-droite"
                      />
                    </>
                  )}
                </div>
              )
            })}

            {/* Currently drawing mask */}
            {currentDraw && (
              <div
                className="absolute border-2 border-dashed border-indigo-400 bg-indigo-500/30 pointer-events-none"
                style={{
                  left: `${currentDraw.x * 100}%`,
                  top: `${currentDraw.y * 100}%`,
                  width: `${currentDraw.width * 100}%`,
                  height: `${currentDraw.height * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Settings & Mask Details Sidebar */}
        <div className="w-80 lg:w-96 border-l border-slate-800 bg-slate-900/90 flex flex-col p-5 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Active Mask Inspector */}
          <div className="mb-6 p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Square className="w-3.5 h-3.5 text-indigo-400" />
                {selectedMask ? 'Masque sélectionné' : 'Aucun masque sélectionné'}
              </h3>
              {selectedMask && (
                <button
                  type="button"
                  onClick={() => handleDeleteMask(selectedMask.id)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              )}
            </div>

            {selectedMask ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Réponse / Nom de la structure masquée
                  </label>
                  <input
                    type="text"
                    value={selectedMask.label || ''}
                    onChange={e => handleUpdateMaskLabel(selectedMask.id, e.target.value)}
                    placeholder="Ex: Artère coronaire droite"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    C’est la réponse révélée au verso de la carte dérivée.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Cliquez et glissez sur l’image pour créer un nouveau masque, ou cliquez sur un masque existant pour le renommer.
              </p>
            )}
          </div>

          {/* Global Note Fields */}
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Paquet cible <span className="text-indigo-400">*</span>
              </label>
              <select
                value={deckId}
                onChange={e => setDeckId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {decks.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.subject ? `(${d.subject})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Question / Consigne globale
              </label>
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Identifier la structure masquée"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Précisions / Explication (optionnel)
              </label>
              <textarea
                value={extra}
                onChange={e => setExtra(e.target.value)}
                placeholder="Contexte anatomique, vue, mémo..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Matière
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ex: Anatomie"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chapitre
                </label>
                <input
                  type="text"
                  value={chapter}
                  onChange={e => setChapter(e.target.value)}
                  placeholder="Ex: Cœur"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="schéma, vasculaire, pass..."
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Masks List Summary */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">
                Cartes qui seront générées ({masks.length}) :
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {masks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Aucun masque pour l’instant.</p>
                ) : (
                  masks.map((m, idx) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMaskId(m.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer ${
                        m.id === selectedMaskId
                          ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                          : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate max-w-[190px]">
                        {idx + 1}. {m.label || `Masque #${idx + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteMask(m.id)
                        }}
                        className="text-slate-400 hover:text-red-400 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
