import React, { useEffect, useRef, useState } from 'react'
import type { Flashcard, FlashcardNote } from './flashcardsTypes'
import type { Manifest, Opacities, ViewerApi, Visibility } from '../types'
import AnatomyViewer from '../AnatomyViewer'
import { fetchNote } from './flashcardsApi'
import { Eye, EyeOff, RotateCcw } from 'lucide-react'

interface ReviewAtlas3DProps {
  card: Flashcard
  isFlipped: boolean
  onError?: (err: string) => void
  onReadyChange?: (ready: boolean) => void
}

export const manifestCache = new Map<string, Manifest>()
export const noteCache = new Map<string, FlashcardNote>()

export function clearAtlasReviewCache() {
  manifestCache.clear()
  noteCache.clear()
}

export const ReviewAtlas3D: React.FC<ReviewAtlas3DProps> = ({ card, isFlipped, onError, onReadyChange }) => {
  const visual = card.visual
  const noteCacheKey = card.noteId
    ? typeof card.noteVersion === 'number'
      ? `${card.noteId}:${card.noteVersion}`
      : card.noteId
    : ''
  const [note, setNote] = useState<FlashcardNote | null>(() => (noteCacheKey ? noteCache.get(noteCacheKey) ?? null : null))
  const [manifest, setManifest] = useState<Manifest | null>(() => (visual?.modelKey ? manifestCache.get(visual.modelKey) ?? null : null))
  const [loading, setLoading] = useState(!note || !manifest)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [viewerLoadState, setViewerLoadState] = useState<{
    progress: number
    ready: string[]
    error: string | null
    complete: boolean
  } | null>(null)
  const apiRef = useRef<ViewerApi | null>(null)

  // Réinitialiser immédiatement l'état ready à chaque changement de carte
  useEffect(() => {
    onReadyChange?.(false)
    setViewerLoadState(null)
  }, [card.id])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!visual || visual.type !== 'atlas_3d' || !visual.modelKey || !card.noteId) {
        const msg = 'Données visuelles Atlas 3D manquantes ou incomplètes sur cette carte.'
        setError(msg)
        onError?.(msg)
        setLoading(false)
        onReadyChange?.(false)
        return
      }

      setError(null)
      try {
        // 1. Charger la note parent contenant la scène 3D canonique (cache versionné noteId:noteVersion)
        const key = typeof card.noteVersion === 'number' ? `${card.noteId}:${card.noteVersion}` : card.noteId
        let loadedNote = noteCache.get(key)
        if (!loadedNote || (typeof card.noteVersion === 'number' && loadedNote.noteVersion !== card.noteVersion)) {
          loadedNote = await fetchNote(card.noteId)
          noteCache.set(key, loadedNote)
          noteCache.set(card.noteId, loadedNote)
        }
        if (cancelled) return
        setNote(loadedNote)

        // 2. Charger le manifest du modèle anatomique correspondant
        const modelKey = visual.modelKey
        let loadedManifest = manifestCache.get(modelKey)
        if (!loadedManifest) {
          const path =
            modelKey === 'female_detail'
              ? 'female-regions/manifest.json'
              : modelKey === 'bp3d_detail'
                ? 'manifest.json'
                : 'overview.json'
          const res = await fetch(`${import.meta.env.BASE_URL}models/${path}`)
          if (!res.ok) throw new Error(`Échec de chargement du modèle anatomique ${modelKey}.`)
          loadedManifest = await res.json()
          if (!loadedManifest || !loadedManifest.groups || !loadedManifest.structures) {
            throw new Error(`Manifest anatomique invalide pour ${modelKey}.`)
          }
          manifestCache.set(modelKey, loadedManifest)
        }
        if (cancelled) return
        setManifest(loadedManifest)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Erreur de chargement 3D'
        setError(msg)
        onError?.(msg)
        onReadyChange?.(false)
        setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [card.id, card.noteId, card.noteVersion, visual?.modelKey])

  const scene = note?.fields?.scene
  const structureId = visual?.structureId || ''

  // Groupes requis par la configuration de scène de la note
  const neededGroups = React.useMemo(() => {
    if (!manifest || !scene) return []
    const sceneVis = (scene.visibility || {}) as Record<string, boolean>
    const sceneOp = (scene.opacity || {}) as Record<string, number>
    return manifest.groups
      .map((g) => g.id)
      .filter((gid) => sceneVis[gid] && (sceneOp[gid] ?? 1) > 0)
  }, [manifest, scene])

  // Prêt si non en cours de chargement, aucune erreur, note et manifest présents,
  // et AnatomyViewer a terminé le chargement de tous les groupes requis
  const isReady = Boolean(
    !loading &&
    !error &&
    note &&
    manifest &&
    scene &&
    viewerLoadState &&
    !viewerLoadState.error &&
    viewerLoadState.complete &&
    (neededGroups.length === 0 || neededGroups.every((gid) => viewerLoadState.ready.includes(gid)))
  )

  useEffect(() => {
    onReadyChange?.(isReady)
  }, [isReady, onReadyChange])

  if (error) {
    return (
      <div
        className="review-atlas-error"
        style={{
          padding: 20,
          textAlign: 'center',
          color: '#f87171',
          background: 'rgba(127, 29, 29, 0.2)',
          borderRadius: 14,
          border: '1px solid rgba(239, 68, 68, 0.4)',
          margin: '16px 0',
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Impossible de charger la vue Atlas 3D</p>
        <p style={{ fontSize: 12, color: '#fca5a5' }}>{error}</p>
      </div>
    )
  }

  if (loading || !note || !manifest || !scene) {
    return (
      <div
        className="review-atlas-loading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '420px',
          background: '#091217',
          borderRadius: 18,
          border: '1px solid rgba(239, 246, 255, 0.1)',
          color: '#7b959e',
          gap: 12,
          margin: '16px 0',
        }}
      >
        <div style={{ width: 28, height: 28, border: '2px solid #168496', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13 }}>Chargement de la scène 3D…</span>
      </div>
    )
  }

  const defaultVisibility: Visibility = { skin: true, skeleton: true, organs: true, muscles: false, arteries: false, veins: false, nerves: false, joints: false }
  const defaultOpacity: Opacities = { skin: 0.12, skeleton: 1, organs: 1, muscles: 1, arteries: 1, veins: 1, nerves: 1, joints: 1 }

  const visibility: Visibility = { ...defaultVisibility, ...(scene.visibility as Partial<Visibility>) }
  const opacity: Opacities = { ...defaultOpacity, ...(scene.opacity as Partial<Opacities>) }

  return (
    <div
      className="review-atlas-container"
      data-testid="review-atlas-3d"
    >
      <AnatomyViewer
        manifest={manifest}
        visibility={visibility}
        opacity={opacity}
        cut={scene.cut}
        selectedId={null}
        isolationStructureId={scene.isolationStructureId}
        interactionMode="review"
        reviewTargetId={structureId}
        reviewRevealed={isFlipped}
        hiddenIds={scene.hiddenStructureIds}
        cameraRestore={scene.camera}
        resetKey={resetKey}
        onSelect={() => {}}
        onHover={() => {}}
        onLoad={(state) => {
          setViewerLoadState(state)
          if (state.error) {
            setError(state.error)
            onError?.(state.error)
            onReadyChange?.(false)
          }
        }}
        apiRef={apiRef}
        animation={{ id: '', playing: false }}
        labels="off"
      />

      {/* Bouton Vue d'origine */}
      <button
        type="button"
        className="review-camera-reset-btn"
        onClick={() => {
          apiRef.current?.restoreCamera?.()
          setResetKey((k) => k + 1)
        }}
        title="Réinitialiser l'angle et le zoom de caméra d'origine"
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 8,
          color: '#e2e8f0',
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        <RotateCcw size={14} />
        Vue d'origine
      </button>

      {/* Badge statut Recto / Verso */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          background: isFlipped ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
          backdropFilter: 'blur(8px)',
          border: isFlipped ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(245, 158, 11, 0.6)',
          color: isFlipped ? '#34d399' : '#fbbf24',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {isFlipped ? (
          <>
            <Eye size={13} /> Structure révélée
          </>
        ) : (
          <>
            <EyeOff size={13} /> Structure masquée · Tournez et zoomez pour observer
          </>
        )}
      </div>
    </div>
  )
}
