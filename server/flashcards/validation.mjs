import {getAtlasModel, resolveAtlasStructure, calculateEffectiveVisibleMeshes} from './atlasRegistry.mjs'

const sourceTypes = new Set(['manual', 'catalog_course', 'study_document', 'qcm_error', 'free_text'])
export const ratings = new Set(['again', 'hard', 'good', 'easy'])

export function cleanText(value, max, required = false) {
  if (value == null) return required ? null : ''
  if (typeof value !== 'string') return null
  const clean = value.trim()
  if ((required && !clean) || clean.length > max) return null
  return clean
}

export function normalizeName(value) {
  return value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

export function validateTags(value) {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > 20) return null
  const tags = value.map(tag => cleanText(tag, 50, true))
  if (tags.some(tag => tag === null)) return null
  return [...new Set(tags)]
}

export function validateVisual(value) {
  if (value == null) return null
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const type = cleanText(value.type, 30, true)
  if (type === 'atlas_3d') {
    const modelKey = cleanText(value.modelKey, 50, true)
    const atlasRevision = cleanText(value.atlasRevision, 50, true)
    const targetId = cleanText(value.targetId, 100, true)
    const structureId = cleanText(value.structureId, 100, true)
    if (!modelKey || !atlasRevision || !targetId || !structureId) return undefined
    return {type: 'atlas_3d', modelKey, atlasRevision, targetId, structureId}
  }
  if (type === 'image_occlusion') {
    const assetId = cleanText(value.assetId, 100, true)
    const targetMaskId = cleanText(value.targetMaskId, 100, true)
    if (!assetId || !targetMaskId) return undefined
    const rect = value.targetRect
    if (!rect || typeof rect !== 'object') return undefined
    const {x, y, width: w, height: h} = rect
    if (![x, y, w, h].every(n => typeof n === 'number' && Number.isFinite(n))) return undefined
    return {type: 'image_occlusion', assetId, targetMaskId, targetRect: {x, y, width: w, height: h}}
  }
  const url = cleanText(value.url, 1000)
  const alt = cleanText(value.alt, 300)
  const resourceId = cleanText(value.resourceId, 150)
  if (!type || url === null || alt === null || resourceId === null) return undefined
  if (url && !(/^https:\/\//.test(url) || url.startsWith('/'))) return undefined
  const visual = {type, ...(url ? {url} : {}), ...(alt ? {alt} : {}), ...(resourceId ? {resourceId} : {})}
  if (Number.isSafeInteger(value.page) && value.page > 0 && value.page < 100000) visual.page = value.page
  return visual
}

export function validateCard(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const front = input.front === undefined && partial ? undefined : cleanText(input.front, 2000, true)
  const back = input.back === undefined && partial ? undefined : cleanText(input.back, 8000, true)
  const deckId = input.deckId === undefined && partial ? undefined : cleanText(input.deckId, 100, true)
  const subject = input.subject === undefined && partial ? undefined : cleanText(input.subject, 150)
  const chapter = input.chapter === undefined && partial ? undefined : cleanText(input.chapter, 200)
  const tags = input.tags === undefined && partial ? undefined : validateTags(input.tags)
  const visual = input.visual === undefined && partial ? undefined : validateVisual(input.visual)
  if (front === null || back === null || deckId === null || subject === null || chapter === null || tags === null || (input.visual !== undefined && visual === undefined)) return null
  const source = input.source && typeof input.source === 'object' && !Array.isArray(input.source) ? input.source : {}
  const sourceType = input.source === undefined && partial ? undefined : (sourceTypes.has(source.type) ? source.type : 'manual')
  const sourceFields = {}
  for (const [key, max] of [['courseId', 150], ['documentId', 100], ['sectionId', 180], ['excerpt', 1500]]) {
    const cleaned = cleanText(source[key], max)
    if (cleaned === null) return null
    sourceFields[key] = cleaned || null
  }
  let locator = null
  if (source.locator != null) {
    if (!source.locator || typeof source.locator !== 'object' || Array.isArray(source.locator) || JSON.stringify(source.locator).length > 1500) return null
    locator = source.locator
  }
  return {front, back, deckId, subject, chapter, tags, visual, source: sourceType === undefined ? undefined : {type: sourceType, ...sourceFields, locator}}
}

export function validateDeck(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const name = input.name === undefined && partial ? undefined : cleanText(input.name, 100, true)
  const description = input.description === undefined && partial ? undefined : cleanText(input.description, 500)
  const subject = input.subject === undefined && partial ? undefined : cleanText(input.subject, 150)
  if (name === null || description === null || subject === null) return null
  return {name, description, subject}
}

export function validateNote(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  const noteType = input.noteType === undefined && partial ? undefined : cleanText(input.noteType, 50, true)
  if (noteType !== undefined && !['basic', 'reverse', 'bidirectional', 'cloze', 'typed', 'image_occlusion', 'atlas_3d'].includes(noteType)) {
    return null
  }

  const assetId = input.assetId === undefined && partial ? undefined : cleanText(input.assetId, 100, true)
  const assetIdRegex = /^asset_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  if (noteType === 'image_occlusion' && !partial) {
    if (!assetId || !assetIdRegex.test(assetId)) return null
  } else if (assetId !== undefined && assetId !== null && !assetIdRegex.test(assetId)) {
    return null
  }

  const defaultDeckId = input.defaultDeckId === undefined && partial ? undefined : cleanText(input.defaultDeckId, 100, !partial)
  if (input.defaultDeckId !== undefined && defaultDeckId === null) return null

  const title = input.title === undefined && partial ? undefined : cleanText(input.title, 200)
  const subject = input.subject === undefined && partial ? undefined : cleanText(input.subject, 150)
  const chapter = input.chapter === undefined && partial ? undefined : cleanText(input.chapter, 200)
  const tags = input.tags === undefined && partial ? undefined : validateTags(input.tags)
  const visual = input.visual === undefined && partial ? undefined : validateVisual(input.visual)

  if (title === null || subject === null || chapter === null || tags === null || (input.visual !== undefined && visual === undefined)) {
    return null
  }

  let fields = undefined
  if (input.fields !== undefined || !partial) {
    if (!input.fields || typeof input.fields !== 'object' || Array.isArray(input.fields)) return null
    const f = input.fields
    if (noteType === 'basic' || noteType === 'reverse' || noteType === 'bidirectional') {
      const front = cleanText(f.front, 2000, true)
      const back = cleanText(f.back, 8000, true)
      if (!front || !back) return null
      fields = {front, back}
    } else if (noteType === 'cloze') {
      const text = cleanText(f.text, 8000, true)
      if (!text) return null
      // Check cloze syntax
      const keys = [...text.matchAll(/\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g)]
      if (!keys.length) return null
      const extra = cleanText(f.extra, 4000)
      if (extra === null) return null
      fields = {text, extra: extra || ''}
    } else if (noteType === 'typed') {
      const front = cleanText(f.front, 2000, true)
      const answer = cleanText(f.answer, 2000, true)
      if (!front || !answer) return null
      let acceptedAnswers = []
      if (f.acceptedAnswers !== undefined) {
        if (!Array.isArray(f.acceptedAnswers) || f.acceptedAnswers.length > 20) return null
        const cleanedAnswers = f.acceptedAnswers.map(a => cleanText(a, 500, true))
        if (cleanedAnswers.some(a => a === null)) return null
        acceptedAnswers = [...new Set(cleanedAnswers)]
      }
      const extra = cleanText(f.extra, 4000)
      if (extra === null) return null
      fields = {front, answer, acceptedAnswers, extra: extra || ''}
    } else if (noteType === 'image_occlusion') {
      const prompt = cleanText(f.prompt, 2000)
      if (prompt === null) return null
      const extra = cleanText(f.extra, 4000)
      if (extra === null) return null
      const occlusionMode = cleanText(f.occlusionMode, 50) || 'hide_one'
      if (occlusionMode !== 'hide_one') return null
      if (!Array.isArray(f.masks) || f.masks.length < 1 || f.masks.length > 50) return null

      const maskIdRegex = /^mask_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      const seenIds = new Set()
      const validatedMasks = []

      for (const m of f.masks) {
        if (!m || typeof m !== 'object') return null
        const maskId = typeof m.id === 'string' ? m.id.trim() : ''
        if (!maskIdRegex.test(maskId)) return null
        if (seenIds.has(maskId)) return null
        seenIds.add(maskId)

        const x = Number(m.x)
        const y = Number(m.y)
        const width = Number(m.width)
        const height = Number(m.height)

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null
        if (x < 0 || x >= 1 || y < 0 || y >= 1) return null
        if (width <= 0 || width > 1 || height <= 0 || height > 1) return null
        if (x + width > 1.001 || y + height > 1.001) return null

        const label = cleanText(m.label, 300)
        if (label === null) return null

        validatedMasks.push({
          id: maskId,
          x: Math.round(x * 10000) / 10000,
          y: Math.round(y * 10000) / 10000,
          width: Math.round(width * 10000) / 10000,
          height: Math.round(height * 10000) / 10000,
          label: label || '',
        })
      }

      fields = {
        prompt: prompt || '',
        extra: extra || '',
        occlusionMode,
        masks: validatedMasks,
      }
    } else if (noteType === 'atlas_3d') {
      const prompt = cleanText(f.prompt, 2000)
      if (prompt === null) return null
      const extra = cleanText(f.extra, 4000)
      if (extra === null) return null

      if (!f.scene || typeof f.scene !== 'object' || Array.isArray(f.scene)) return null
      const s = f.scene

      const modelKey = cleanText(s.modelKey || f.modelKey, 50, true)
      const atlasModel = getAtlasModel(modelKey)
      if (!atlasModel) return null

      const atlasRevision = cleanText(s.atlasRevision || f.atlasRevision, 50, true)
      if (!atlasRevision) return null
      // Contrainte 5 : pour une NOUVELLE note (partial === false), atlasRevision doit être EXACTEMENT la révision courante
      if (!partial && atlasRevision !== atlasModel.currentRevision) {
        return null
      }
      if (partial && !atlasModel.compatibleStoredRevisions.includes(atlasRevision)) {
        return null
      }

      // Caméra
      if (!s.camera || typeof s.camera !== 'object' || Array.isArray(s.camera)) return null
      const pos = s.camera.position
      const tgt = s.camera.target
      if (!Array.isArray(pos) || pos.length !== 3 || !Array.isArray(tgt) || tgt.length !== 3) return null
      if (!pos.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 50)) return null
      if (!tgt.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 50)) return null
      const camDist = Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2])
      if (camDist < 0.05) return null

      // Visibility : Contrainte 6 - chaque groupe autorisé pour ce modelKey doit être présent et boolean
      if (!s.visibility || typeof s.visibility !== 'object' || Array.isArray(s.visibility)) return null
      const cleanVisibility = {}
      for (const group of atlasModel.allowedGroups) {
        if (typeof s.visibility[group] !== 'boolean') return null
        cleanVisibility[group] = s.visibility[group]
      }

      // Opacity : Contrainte 6 - chaque groupe autorisé pour ce modelKey doit être présent et un nombre [0, 1]
      if (!s.opacity || typeof s.opacity !== 'object' || Array.isArray(s.opacity)) return null
      const cleanOpacity = {}
      for (const group of atlasModel.allowedGroups) {
        const val = s.opacity[group]
        if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 1) return null
        cleanOpacity[group] = Math.round(val * 1000) / 1000
      }

      // Cut
      if (!s.cut || typeof s.cut !== 'object' || Array.isArray(s.cut)) return null
      if (typeof s.cut.enabled !== 'boolean' || typeof s.cut.flipped !== 'boolean' || typeof s.cut.guide !== 'boolean') return null
      if (!['x', 'y', 'z'].includes(s.cut.axis)) return null
      if (typeof s.cut.position !== 'number' || !Number.isFinite(s.cut.position) || s.cut.position < -1 || s.cut.position > 1) return null

      // Isolation : Contraintes 1 & 2
      let isolationStructureId = null
      if (s.isolationStructureId !== undefined && s.isolationStructureId !== null) {
        if (typeof s.isolationStructureId !== 'string') return null
        const cleanIso = s.isolationStructureId.trim()
        if (!cleanIso || !resolveAtlasStructure(modelKey, cleanIso)) return null
        isolationStructureId = cleanIso
      }

      // Hidden structures
      if (!Array.isArray(s.hiddenStructureIds)) return null
      if (s.hiddenStructureIds.length > 500) return null
      const validatedHidden = []
      for (const hid of s.hiddenStructureIds) {
        if (typeof hid !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(hid)) return null
        if (!resolveAtlasStructure(modelKey, hid)) return null
        validatedHidden.push(hid)
      }

      const validatedScene = {
        modelKey,
        atlasRevision,
        camera: {
          position: [Math.round(pos[0] * 10000) / 10000, Math.round(pos[1] * 10000) / 10000, Math.round(pos[2] * 10000) / 10000],
          target: [Math.round(tgt[0] * 10000) / 10000, Math.round(tgt[1] * 10000) / 10000, Math.round(tgt[2] * 10000) / 10000],
        },
        visibility: cleanVisibility,
        opacity: cleanOpacity,
        cut: {
          enabled: s.cut.enabled,
          axis: s.cut.axis,
          position: Math.round(s.cut.position * 10000) / 10000,
          flipped: s.cut.flipped,
          guide: s.cut.guide,
        },
        isolationStructureId,
        hiddenStructureIds: validatedHidden,
      }

      // Targets
      if (!Array.isArray(f.targets) || f.targets.length < 1 || f.targets.length > 20) return null
      const targetIdRegex = /^target_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const seenTargetIds = new Set()
      const seenStructureIds = new Set()
      const validatedTargets = []

      for (const t of f.targets) {
        if (!t || typeof t !== 'object') return null
        const targetId = typeof t.id === 'string' ? t.id.trim() : ''
        if (!targetIdRegex.test(targetId)) return null
        if (seenTargetIds.has(targetId)) return null
        seenTargetIds.add(targetId)

        const structureId = typeof t.structureId === 'string' ? t.structureId.trim() : ''
        if (!structureId || seenStructureIds.has(structureId)) return null
        seenStructureIds.add(structureId)

        const struct = resolveAtlasStructure(modelKey, structureId)
        if (!struct) return null

        validatedTargets.push({
          id: targetId,
          structureId,
        })
      }

      // Contrainte 3 : Effective Visible Mesh Set & Anti-Recto vide
      const {effectiveVisibleMeshes, error: meshError} = calculateEffectiveVisibleMeshes(modelKey, validatedScene)
      if (meshError) return null

      for (const vt of validatedTargets) {
        const targetStruct = resolveAtlasStructure(modelKey, vt.structureId)
        const targetMeshes = targetStruct.meshNames || []
        const hasVisible = targetMeshes.some(m => effectiveVisibleMeshes.has(m))
        if (!hasVisible) {
          // La cible n'a aucun maillage visible dans cette scène / isolation
          return null
        }

        // Simuler le Recto : retirer les maillages de la cible
        const frontVisibleCount = [...effectiveVisibleMeshes].filter(m => !targetMeshes.includes(m)).length
        if (frontVisibleCount === 0) {
          // Le Recto serait complètement vide (aucun contexte anatomique)
          return null
        }
      }

      fields = {
        prompt: prompt || '',
        extra: extra || '',
        modelKey,
        atlasRevision,
        scene: validatedScene,
        targets: validatedTargets,
      }
    } else if (partial && noteType === undefined) {
      // Partial update without changing noteType; validate generic field strings
      fields = {}
      if (f.front !== undefined) {
        const front = cleanText(f.front, 2000, true)
        if (!front) return null
        fields.front = front
      }
      if (f.back !== undefined) {
        const back = cleanText(f.back, 8000, true)
        if (!back) return null
        fields.back = back
      }
      if (f.text !== undefined) {
        const text = cleanText(f.text, 8000, true)
        if (!text) return null
        const keys = [...text.matchAll(/\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g)]
        if (!keys.length) return null
        fields.text = text
      }
      if (f.answer !== undefined) {
        const answer = cleanText(f.answer, 2000, true)
        if (!answer) return null
        fields.answer = answer
      }
      if (f.extra !== undefined) {
        const extra = cleanText(f.extra, 4000)
        if (extra === null) return null
        fields.extra = extra || ''
      }
      if (f.acceptedAnswers !== undefined) {
        if (!Array.isArray(f.acceptedAnswers) || f.acceptedAnswers.length > 20) return null
        const cleanedAnswers = f.acceptedAnswers.map(a => cleanText(a, 500, true))
        if (cleanedAnswers.some(a => a === null)) return null
        fields.acceptedAnswers = [...new Set(cleanedAnswers)]
      }
      if (f.prompt !== undefined) {
        const prompt = cleanText(f.prompt, 2000)
        if (prompt === null) return null
        fields.prompt = prompt
      }
      if (f.occlusionMode !== undefined) {
        const mode = cleanText(f.occlusionMode, 50)
        if (mode !== 'hide_one') return null
        fields.occlusionMode = mode
      }
      if (f.masks !== undefined) {
        if (!Array.isArray(f.masks) || f.masks.length < 1 || f.masks.length > 50) return null
        const maskIdRegex = /^mask_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        const seenIds = new Set()
        const validatedMasks = []
        for (const m of f.masks) {
          if (!m || typeof m !== 'object') return null
          const maskId = typeof m.id === 'string' ? m.id.trim() : ''
          if (!maskIdRegex.test(maskId)) return null
          if (seenIds.has(maskId)) return null
          seenIds.add(maskId)
          const x = Number(m.x), y = Number(m.y), width = Number(m.width), height = Number(m.height)
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null
          if (x < 0 || x >= 1 || y < 0 || y >= 1) return null
          if (width <= 0 || width > 1 || height <= 0 || height > 1) return null
          if (x + width > 1.001 || y + height > 1.001) return null
          const label = cleanText(m.label, 300)
          if (label === null) return null
          validatedMasks.push({
            id: maskId,
            x: Math.round(x * 10000) / 10000,
            y: Math.round(y * 10000) / 10000,
            width: Math.round(width * 10000) / 10000,
            height: Math.round(height * 10000) / 10000,
            label: label || '',
          })
        }
        fields.masks = validatedMasks
      }
    } else {
      return null
    }
  }

  const source = input.source && typeof input.source === 'object' && !Array.isArray(input.source) ? input.source : {}
  const sourceType = input.source === undefined && partial ? undefined : (sourceTypes.has(source.type) ? source.type : 'manual')
  const sourceFields = {}
  for (const [key, max] of [['courseId', 150], ['documentId', 100], ['sectionId', 180], ['excerpt', 1500]]) {
    const cleaned = cleanText(source[key], max)
    if (cleaned === null) return null
    sourceFields[key] = cleaned || null
  }
  let locator = null
  if (source.locator != null) {
    if (!source.locator || typeof source.locator !== 'object' || Array.isArray(source.locator) || JSON.stringify(source.locator).length > 1500) return null
    locator = source.locator
  }

  let expectedVersion = undefined
  if (input.expectedVersion !== undefined) {
    if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) return null
    expectedVersion = input.expectedVersion
  }

  return {
    noteType,
    defaultDeckId,
    title,
    fields,
    subject,
    chapter,
    tags,
    visual,
    assetId: assetId !== undefined ? assetId : undefined,
    expectedVersion,
    source: sourceType === undefined ? undefined : {type: sourceType, ...sourceFields, locator},
  }
}

