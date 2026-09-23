import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../../')

export const ATLAS_REGISTRY = {
  bp3d_overview: {
    modelKey: 'bp3d_overview',
    currentRevision: 'bp3d-overview-v1',
    compatibleStoredRevisions: ['bp3d-overview-v1'],
    manifestPath: path.join(ROOT_DIR, 'public/models/overview.json'),
    allowedGroups: new Set(['skin', 'skeleton', 'organs']),
  },
  bp3d_detail: {
    modelKey: 'bp3d_detail',
    currentRevision: 'bp3d-detail-v1',
    compatibleStoredRevisions: ['bp3d-detail-v1'],
    manifestPath: path.join(ROOT_DIR, 'public/models/manifest.json'),
    allowedGroups: new Set(['skin', 'skeleton', 'organs', 'muscles', 'arteries', 'veins', 'nerves', 'joints']),
  },
  male_overview: {
    modelKey: 'bp3d_overview',
    currentRevision: 'bp3d-overview-v1',
    compatibleStoredRevisions: ['bp3d-overview-v1'],
    manifestPath: path.join(ROOT_DIR, 'public/models/overview.json'),
    allowedGroups: new Set(['skin', 'skeleton', 'organs']),
  },
  male_detail: {
    modelKey: 'bp3d_detail',
    currentRevision: 'bp3d-detail-v1',
    compatibleStoredRevisions: ['bp3d-detail-v1'],
    manifestPath: path.join(ROOT_DIR, 'public/models/manifest.json'),
    allowedGroups: new Set(['skin', 'skeleton', 'organs', 'muscles', 'arteries', 'veins', 'nerves', 'joints']),
  },
  female_detail: {
    modelKey: 'female_detail',
    currentRevision: 'hra-female-v1',
    compatibleStoredRevisions: ['hra-female-v1'],
    manifestPath: path.join(ROOT_DIR, 'public/models/female-regions/manifest.json'),
    allowedGroups: new Set(['skeleton', 'organs', 'joints']),
  },
}

const manifestCache = new Map()
const structuresCache = new Map()
const labelsCache = new Map()

export function getAtlasModel(modelKey) {
  return ATLAS_REGISTRY[modelKey] || null
}

export function loadAtlasManifest(modelKey) {
  const model = getAtlasModel(modelKey)
  if (!model) return null
  if (manifestCache.has(modelKey)) {
    return manifestCache.get(modelKey)
  }
  try {
    const raw = readFileSync(model.manifestPath, 'utf8')
    const manifest = JSON.parse(raw)
    manifestCache.set(modelKey, manifest)

    const map = new Map()
    for (const struct of manifest.structures || []) {
      map.set(struct.id, struct)
    }
    structuresCache.set(modelKey, map)
    return manifest
  } catch (err) {
    console.error(`Failed to load manifest for model ${modelKey}:`, err)
    return null
  }
}

export function getStructuresMap(modelKey) {
  if (!structuresCache.has(modelKey)) {
    loadAtlasManifest(modelKey)
  }
  return structuresCache.get(modelKey) || null
}

export function resolveAtlasStructure(modelKey, structureId) {
  const map = getStructuresMap(modelKey)
  if (!map) return null
  return map.get(structureId) || null
}

function loadLabels(kind) {
  if (labelsCache.has(kind)) return labelsCache.get(kind)
  try {
    const filePath = kind === 'female'
      ? path.join(ROOT_DIR, 'src/data/female-labels.json')
      : path.join(ROOT_DIR, 'src/data/french-labels.json')
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    labelsCache.set(kind, parsed)
    return parsed
  } catch {
    return {}
  }
}

export function getCanonicalStructureName(modelKey, structureId) {
  const structure = resolveAtlasStructure(modelKey, structureId)
  if (!structure) return structureId
  const rawName = structure.name || structureId
  if (modelKey === 'female_detail') {
    const labels = loadLabels('female')
    return labels[rawName] || rawName
  }
  const labels = loadLabels('french')
  return labels[rawName] || rawName
}

const meshToGroupCache = new Map()

export function clearAtlasRegistryCache() {
  manifestCache.clear()
  structuresCache.clear()
  labelsCache.clear()
  meshToGroupCache.clear()
}

export function getMeshToRealGroupMap(modelKey) {
  if (meshToGroupCache.has(modelKey)) return meshToGroupCache.get(modelKey)
  const manifest = loadAtlasManifest(modelKey)
  if (!manifest) return new Map()
  const map = new Map()
  // 1. Structures non-agrégées d'abord (mappage canonique vers le groupe physique réel)
  for (const s of manifest.structures || []) {
    if (!s.aggregate && s.group && Array.isArray(s.meshNames)) {
      for (const m of s.meshNames) {
        if (!map.has(m)) {
          map.set(m, s.group)
        }
      }
    }
  }
  // 2. Repli pour les maillages définis uniquement sur une structure agrégée avec un groupe
  for (const s of manifest.structures || []) {
    if (s.group && Array.isArray(s.meshNames)) {
      for (const m of s.meshNames) {
        if (!map.has(m)) {
          map.set(m, s.group)
        }
      }
    }
  }
  meshToGroupCache.set(modelKey, map)
  return map
}

/**
 * Calcule l'ensemble des maillages effectivement visibles dans la scène canonique.
 * A. Part du mapping canonique meshName -> realGroup (structures non-agrégées)
 * B. Vérifie que realGroup a visibility=true et opacity > 0
 * C. Applique isolationStructureId si présent
 * D. Retire les maillages couverts par hiddenStructureIds
 * 
 * Retourne { effectiveVisibleMeshes: Set<string>, error?: string }
 */
export function calculateEffectiveVisibleMeshes(modelKey, scene) {
  const manifest = loadAtlasManifest(modelKey)
  if (!manifest) return {effectiveVisibleMeshes: new Set(), error: 'Manifest introuvable.'}
  const structuresMap = getStructuresMap(modelKey)
  const allowedGroups = getAtlasModel(modelKey)?.allowedGroups

  // 1. Déterminer les groupes actifs (visibility=true et opacity > 0)
  const activeGroups = new Set()
  for (const group of allowedGroups || []) {
    const isVisible = scene.visibility?.[group] === true
    const opacity = Number(scene.opacity?.[group])
    if (isVisible && Number.isFinite(opacity) && opacity > 0) {
      activeGroups.add(group)
    }
  }

  // 2. Déterminer les maillages masqués par hiddenStructureIds
  const hiddenMeshNames = new Set()
  for (const hid of scene.hiddenStructureIds || []) {
    const s = structuresMap.get(hid)
    if (s && Array.isArray(s.meshNames)) {
      for (const m of s.meshNames) hiddenMeshNames.add(m)
    }
  }

  // 3. Déterminer le filtre d'isolation si actif
  let isolationMeshNames = null
  if (scene.isolationStructureId) {
    const isoStruct = structuresMap.get(scene.isolationStructureId)
    if (!isoStruct) {
      return {effectiveVisibleMeshes: new Set(), error: `Structure d'isolation introuvable: ${scene.isolationStructureId}`}
    }
    isolationMeshNames = new Set(isoStruct.meshNames || [])
  }

  // 4. Parcourir les maillages via le mapping canonique mesh -> realGroup
  const meshToRealGroup = getMeshToRealGroupMap(modelKey)
  const effectiveVisibleMeshes = new Set()
  for (const [meshName, realGroup] of meshToRealGroup.entries()) {
    if (!activeGroups.has(realGroup)) continue
    if (hiddenMeshNames.has(meshName)) continue
    if (isolationMeshNames && !isolationMeshNames.has(meshName)) continue
    effectiveVisibleMeshes.add(meshName)
  }

  return {effectiveVisibleMeshes}
}

/**
 * Évalue la compatibilité d'une carte Atlas 3D avec le modèle actuel.
 * Valide strictement EXACT et COMPATIBLE (groupes, champs, cibles, maillages, anti-recto-vide).
 * 
 * Retourne :
 * - { status: 'EXACT', reviewable: true }
 * - { status: 'COMPATIBLE', reviewable: true, message: string }
 * - { status: 'STALE_UNKNOWN', reviewable: false, code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE', error: string }
 * - { status: 'UNAVAILABLE', reviewable: false, code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE', error: string }
 */
export function checkAtlasCardCompatibility(modelKey, savedRevision, scene, targets = []) {
  const model = getAtlasModel(modelKey)
  if (!model) {
    return {
      status: 'UNAVAILABLE',
      reviewable: false,
      code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
      error: `Modèle 3D inconnu: ${modelKey}`,
    }
  }

  const manifest = loadAtlasManifest(modelKey)
  if (!manifest) {
    return {
      status: 'UNAVAILABLE',
      reviewable: false,
      code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
      error: `Manifest introuvable pour le modèle ${modelKey}`,
    }
  }

  const structuresMap = getStructuresMap(modelKey)

  // 1. Cibles non-vides et structures existantes
  if (!Array.isArray(targets) || targets.length === 0) {
    return {
      status: 'UNAVAILABLE',
      reviewable: false,
      code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
      error: 'Aucune cible anatomique valide sur cette carte.',
    }
  }

  for (const target of targets) {
    if (!target || !target.structureId || !structuresMap.has(target.structureId)) {
      return {
        status: 'UNAVAILABLE',
        reviewable: false,
        code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
        error: `La structure cible ${target?.structureId} n'existe plus dans le modèle ${modelKey}.`,
      }
    }
  }

  // 2. Scène valide
  if (!scene || typeof scene !== 'object') {
    return {
      status: 'UNAVAILABLE',
      reviewable: false,
      code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
      error: 'Scène 3D manquante ou invalide.',
    }
  }

  // 3. Validation stricte des groupes de la scène par rapport aux allowedGroups du modèle
  if (scene.visibility && typeof scene.visibility === 'object') {
    for (const group of Object.keys(scene.visibility)) {
      if (!model.allowedGroups.has(group)) {
        return {
          status: 'UNAVAILABLE',
          reviewable: false,
          code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
          error: `Groupe non autorisé dans visibility: ${group}`,
        }
      }
      if (typeof scene.visibility[group] !== 'boolean') {
        return {
          status: 'UNAVAILABLE',
          reviewable: false,
          code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
          error: `Valeur de visibilité invalide pour le groupe: ${group}`,
        }
      }
    }
  }

  if (scene.opacity && typeof scene.opacity === 'object') {
    for (const group of Object.keys(scene.opacity)) {
      if (!model.allowedGroups.has(group)) {
        return {
          status: 'UNAVAILABLE',
          reviewable: false,
          code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
          error: `Groupe non autorisé dans opacity: ${group}`,
        }
      }
      const val = scene.opacity[group]
      if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 1) {
        return {
          status: 'UNAVAILABLE',
          reviewable: false,
          code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
          error: `Valeur d'opacité invalide pour le groupe: ${group}`,
        }
      }
    }
  }

  // 4. Présence de l'isolation si configurée
  if (scene.isolationStructureId && !structuresMap.has(scene.isolationStructureId)) {
    return {
      status: 'UNAVAILABLE',
      reviewable: false,
      code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
      error: `La structure d'isolation ${scene.isolationStructureId} n'existe plus dans le modèle ${modelKey}.`,
    }
  }

  // 5. Présence des structures masquées
  for (const hid of scene.hiddenStructureIds || []) {
    if (!structuresMap.has(hid)) {
      return {
        status: 'UNAVAILABLE',
        reviewable: false,
        code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
        error: `La structure masquée ${hid} n'existe plus dans le modèle ${modelKey}.`,
      }
    }
  }

  // 6. Calcul des maillages visibles et vérification anti-recto-vide
  let effectiveRes
  try {
    effectiveRes = calculateEffectiveVisibleMeshes(modelKey, scene)
    if (effectiveRes.error) {
      return {
        status: 'UNAVAILABLE',
        reviewable: false,
        code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
        error: effectiveRes.error,
      }
    }
  } catch (err) {
    return {
      status: 'UNAVAILABLE',
      reviewable: false,
      code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
      error: err instanceof Error ? err.message : 'Erreur lors du calcul des maillages visibles.',
    }
  }

  const { effectiveVisibleMeshes } = effectiveRes
  if (!effectiveVisibleMeshes || effectiveVisibleMeshes.size === 0) {
    return {
      status: 'UNAVAILABLE',
      reviewable: false,
      code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
      error: 'Aucun maillage visible dans cette configuration de scène.',
    }
  }

  for (const target of targets) {
    const struct = structuresMap.get(target.structureId)
    const targetMeshes = new Set(struct?.meshNames || [])
    let frontVisibleCount = 0
    for (const m of effectiveVisibleMeshes) {
      if (!targetMeshes.has(m)) {
        frontVisibleCount++
      }
    }
    if (frontVisibleCount === 0) {
      return {
        status: 'UNAVAILABLE',
        reviewable: false,
        code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
        error: `Le recto de révision pour la cible ${target.structureId} serait vide (aucun maillage de contexte).`,
      }
    }
  }

  // 7. Évaluer la révision enregistrée par rapport à la révision courante
  if (savedRevision === model.currentRevision) {
    return {status: 'EXACT', reviewable: true}
  }

  if (model.compatibleStoredRevisions.includes(savedRevision)) {
    return {
      status: 'COMPATIBLE',
      reviewable: true,
      message: `Modèle mis à jour (révision enregistrée: ${savedRevision}, active: ${model.currentRevision}). Scène compatible.`,
    }
  }

  return {
    status: 'STALE_UNKNOWN',
    reviewable: false,
    code: 'ERR_ATLAS_CARD_NOT_REVIEWABLE',
    error: `La révision ${savedRevision} n'est pas déclarée compatible avec la révision active ${model.currentRevision}.`,
  }
}
