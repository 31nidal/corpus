import {extractClozeKeys, renderClozeCard} from './cloze.mjs'

export const NOTE_TYPES = new Set(['basic', 'reverse', 'bidirectional', 'cloze', 'typed', 'image_occlusion'])
export const CARD_TYPES = new Set(['basic', 'cloze', 'typed', 'image_occlusion'])

export function deriveCardsFromNote(noteType, fields, suppressedKeys = [], context = {}) {
  const suppressed = new Set(suppressedKeys || [])
  const derivations = []

  switch (noteType) {
    case 'basic': {
      const front = (fields.front || '').trim()
      const back = (fields.back || '').trim()
      if (!suppressed.has('forward')) {
        derivations.push({
          derivationKey: 'forward',
          cardType: 'basic',
          front,
          back,
          typedTarget: null,
          acceptedAnswers: null,
        })
      }
      break
    }
    case 'reverse': {
      const front = (fields.front || '').trim()
      const back = (fields.back || '').trim()
      if (!suppressed.has('reverse')) {
        derivations.push({
          derivationKey: 'reverse',
          cardType: 'basic',
          front: back,
          back: front,
          typedTarget: null,
          acceptedAnswers: null,
        })
      }
      break
    }
    case 'bidirectional': {
      const front = (fields.front || '').trim()
      const back = (fields.back || '').trim()
      if (!suppressed.has('forward')) {
        derivations.push({
          derivationKey: 'forward',
          cardType: 'basic',
          front,
          back,
          typedTarget: null,
          acceptedAnswers: null,
        })
      }
      if (!suppressed.has('reverse')) {
        derivations.push({
          derivationKey: 'reverse',
          cardType: 'basic',
          front: back,
          back: front,
          typedTarget: null,
          acceptedAnswers: null,
        })
      }
      break
    }
    case 'cloze': {
      const text = fields.text || ''
      const extra = (fields.extra || '').trim()
      const keys = extractClozeKeys(text)
      for (const key of keys) {
        if (!suppressed.has(key)) {
          const rendered = renderClozeCard(text, key)
          const backContent = extra ? `${rendered.back}\n\n${extra}` : rendered.back
          derivations.push({
            derivationKey: key,
            cardType: 'cloze',
            front: rendered.front,
            back: backContent,
            typedTarget: null,
            acceptedAnswers: null,
          })
        }
      }
      break
    }
    case 'typed': {
      const front = (fields.front || '').trim()
      const answer = (fields.answer || '').trim()
      const extra = (fields.extra || '').trim()
      const acceptedAnswers = Array.isArray(fields.acceptedAnswers)
        ? fields.acceptedAnswers.map(a => String(a).trim()).filter(Boolean)
        : []
      if (!suppressed.has('typed')) {
        const backContent = extra ? `${answer}\n\n${extra}` : answer
        derivations.push({
          derivationKey: 'typed',
          cardType: 'typed',
          front,
          back: backContent,
          typedTarget: answer,
          acceptedAnswers: acceptedAnswers.length ? acceptedAnswers : null,
        })
      }
      break
    }
    case 'image_occlusion': {
      const assetId = context.assetId
      if (!assetId) {
        throw new Error('assetId obligatoire dans le contexte pour dériver une note image_occlusion.')
      }
      const prompt = (fields.prompt || '').trim() || 'Identifier la structure'
      const extra = (fields.extra || '').trim()
      const masks = Array.isArray(fields.masks) ? fields.masks : []
      for (const mask of masks) {
        const key = `occlusion:${mask.id}`
        if (!suppressed.has(key)) {
          const label = (mask.label || '').trim()
          const backContent = label ? (extra ? `${label}\n\n${extra}` : label) : (extra || 'Zone révélée')
          derivations.push({
            derivationKey: key,
            cardType: 'image_occlusion',
            front: prompt,
            back: backContent,
            typedTarget: null,
            acceptedAnswers: null,
            visual: {
              type: 'image_occlusion',
              assetId,
              targetMaskId: mask.id,
              targetRect: {
                x: mask.x,
                y: mask.y,
                width: mask.width,
                height: mask.height,
              },
            },
          })
        }
      }
      break
    }
    default:
      throw new Error(`Type de note non supporté: ${noteType}`)
  }

  return derivations
}

