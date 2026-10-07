import {createHash} from 'node:crypto'
import {extractTypedStudyFacts} from '../../study/symbolic-facts.mjs'

// Existing integer timestamps (receipts, assets and FSRS) use Unix milliseconds.
export const REJECTED_DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

// Eligibility is computed, never stored. Only statement-preserving note types
// backed by an existing typed fact qualify. Editing requires individual review.
export const SAFE_DRAFT_RULE = Object.freeze({
  minConfidence: 0.95,
  compatibleTypes: Object.freeze(['basic', 'reverse', 'cloze']),
  eligibleStatuses: Object.freeze(['pending']),
})

export const normalizeDraftContent = value => String(value ?? '')
  .normalize('NFC').toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim()

export function draftContentHash(front, sourceExcerpt) {
  return createHash('sha256')
    .update(JSON.stringify([normalizeDraftContent(front), normalizeDraftContent(sourceExcerpt)]))
    .digest('hex')
}

const verbatimText = value => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim()

// PDF line breaks are compacted; case, accents, punctuation and words must match.
// These signals apply only to a generated draft, never to user-edited content.
export function draftEvidenceSignals(draft, section) {
  const excerpt = verbatimText(draft.source?.excerpt)
  const verbatimProof = Boolean(excerpt && verbatimText(section?.content).includes(excerpt))
  const facts = section ? extractTypedStudyFacts([section]) : []
  const confidence = verbatimProof
    ? Math.max(0, ...facts.filter(fact => verbatimText(fact.evidence) === excerpt).map(fact => fact.confidence))
    : 0
  return {confidence, verbatimProof}
}

export function isSafeDraft(draft) {
  return Number.isFinite(draft.confidence) && draft.confidence >= SAFE_DRAFT_RULE.minConfidence &&
    (draft.verbatimProof === true || draft.verbatimProof === 1) &&
    SAFE_DRAFT_RULE.compatibleTypes.includes(draft.noteType) &&
    SAFE_DRAFT_RULE.eligibleStatuses.includes(draft.status)
}
