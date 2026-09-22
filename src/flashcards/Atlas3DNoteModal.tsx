import React, { useEffect, useMemo, useState } from 'react'
import type { Atlas3DScene, Atlas3DTarget, FlashcardDeck, FlashcardNote } from './flashcardsTypes'
import type { Manifest } from '../types'
import { createNote, listDecks } from './flashcardsApi'
import { describeStructure } from '../data/anatomy'
import { AlertCircle, Box, Check, Plus, Trash2, X } from 'lucide-react'

interface Atlas3DNoteModalProps {
  isOpen: boolean
  onClose: () => void
  modelKey: 'bp3d_overview' | 'bp3d_detail' | 'female_detail'
  atlasRevision: string
  scene: Atlas3DScene
  initialStructure: { id: string; name: string }
  manifest: Manifest
  onCreated?: (note: FlashcardNote) => void
}

export const Atlas3DNoteModal: React.FC<Atlas3DNoteModalProps> = ({
  isOpen,
  onClose,
  modelKey,
  atlasRevision,
  scene,
  initialStructure,
  manifest,
  onCreated,
}) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [deckId, setDeckId] = useState<string>('')
  const [targets, setTargets] = useState<Atlas3DTarget[]>([
    { id: 'target_1', structureId: initialStructure.id },
  ])
  const [prompt, setPrompt] = useState('Identifier la structure anatomique')
  const [extra, setExtra] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addStructureId, setAddStructureId] = useState('')

  // Charger la liste des decks utilisateur
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    listDecks()
      .then((loadedDecks) => {
        if (cancelled) return
        setDecks(loadedDecks)
        if (loadedDecks.length && !deckId) {
          setDeckId(loadedDecks[0].id)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isOpen])

  // Structures map pour le nommage
  const structuresMap = useMemo(() => {
    return new Map(manifest.structures.map((s) => [s.id, s]))
  }, [manifest])

  // Calcul préventif anti-recto-vide
  const emptyRectoWarning = useMemo(() => {
    const activeGroups = new Set(
      manifest.groups
        .map((g) => g.id)
        .filter((g) => scene.visibility[g] && (scene.opacity[g] ?? 1) > 0)
    )
    const hiddenMeshes = new Set(
      (scene.hiddenStructureIds || []).flatMap((hid) => structuresMap.get(hid)?.meshNames || [])
    )
    const isolationMeshes = scene.isolationStructureId
      ? new Set(structuresMap.get(scene.isolationStructureId)?.meshNames || [])
      : null

    // Tous les maillages visibles de la scène
    const effectiveMeshes = new Set<string>()
    for (const struct of manifest.structures) {
      if (!activeGroups.has(struct.group)) continue
      for (const m of struct.meshNames) {
        if (hiddenMeshes.has(m)) continue
        if (isolationMeshes && !isolationMeshes.has(m)) continue
        effectiveMeshes.add(m)
      }
    }

    for (const t of targets) {
      const s = structuresMap.get(t.structureId)
      if (!s) continue
      const targetMeshes = new Set(s.meshNames)
      let otherVisibleCount = 0
      for (const m of effectiveMeshes) {
        if (!targetMeshes.has(m)) {
          otherVisibleCount++
        }
      }
      if (otherVisibleCount === 0) {
        return `Le recto sera complètement vide pour la structure « ${describeStructure(s.name, s.group).name} ». Activez d'autres couches ou désactivez l'isolation afin de préserver un contexte visuel.`
      }
    }
    return null
  }, [manifest, scene, targets, structuresMap])

  if (!isOpen) return null

  const handleAddTarget = () => {
    if (!addStructureId) return
    if (targets.some((t) => t.structureId === addStructureId)) return
    setTargets([...targets, { id: `target_${Date.now()}`, structureId: addStructureId }])
    setAddStructureId('')
  }

  const handleRemoveTarget = (id: string) => {
    if (targets.length <= 1) return
    setTargets(targets.filter((t) => t.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deckId) {
      setError('Veuillez sélectionner un deck.')
      return
    }
    if (!targets.length) {
      setError('Au moins une cible anatomique est requise.')
      return
    }
    if (emptyRectoWarning) {
      setError(emptyRectoWarning)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const primaryStruct = structuresMap.get(targets[0].structureId)
      const title = primaryStruct ? describeStructure(primaryStruct.name, primaryStruct.group).name : 'Flashcard Atlas 3D'

      const note = await createNote({
        defaultDeckId: deckId,
        noteType: 'atlas_3d',
        title,
        fields: {
          modelKey,
          atlasRevision,
          scene,
          targets,
          prompt: prompt.trim() || 'Identifier la structure anatomique',
          extra: extra.trim() || undefined,
        },
      })

      onCreated?.(note)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la note 3D.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="flash-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Créer une flashcard Atlas 3D"
    >
      <div className="flash-modal max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-6 text-slate-100 shadow-2xl overflow-y-auto max-h-[90vh]">
        <header className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Box size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Créer une flashcard Atlas 3D</h2>
              <p className="text-xs text-slate-400">Scène 3D interactive et révision FSRS</p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {emptyRectoWarning && !error && (
          <div className="mt-4 p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 text-amber-400 mt-0.5" />
            <span>{emptyRectoWarning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Deck selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Deck de destination</label>
            <select
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.subject ? `(${d.subject})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Targets list */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Structure(s) cible(s) à mémoriser ({targets.length} carte{targets.length > 1 ? 's' : ''})
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {targets.map((t, idx) => {
                const s = structuresMap.get(t.structureId)
                const frenchName = s ? describeStructure(s.name, s.group).name : t.structureId
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-200 truncate">{frenchName}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({t.structureId})</span>
                    </div>
                    {targets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTarget(t.id)}
                        className="text-slate-400 hover:text-red-400 p-1 rounded"
                        title="Supprimer cette cible"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Ajouter une autre cible optionnelle */}
            <div className="mt-2 flex gap-2">
              <select
                value={addStructureId}
                onChange={(e) => setAddStructureId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none"
              >
                <option value="">+ Ajouter une autre structure comme cible…</option>
                {manifest.structures
                  .filter((s) => !targets.some((t) => t.structureId === s.id))
                  .slice(0, 100)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {describeStructure(s.name, s.group).name} ({s.id})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddTarget}
                disabled={!addStructureId}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Consigne (Recto)</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={2000}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              placeholder="Identifier la structure anatomique"
            />
          </div>

          {/* Extra notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Précisions / notes complémentaires (optionnel)
            </label>
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              maxLength={8000}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              placeholder="Rappels cliniques, rapports anatomiques, moyen mnémotechnique…"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || Boolean(emptyRectoWarning)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-teal-700/30 flex items-center gap-1.5 transition"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Création…
                </>
              ) : (
                <>
                  <Check size={14} />
                  Créer la flashcard 3D
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
