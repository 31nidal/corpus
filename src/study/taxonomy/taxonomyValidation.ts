import { canonicalCourses } from './canonicalCourses.ts'
import { legacyHubs } from './legacyHubs.ts'

export const COURSE_ID_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*|FMA[0-9]+)$/

export interface TaxonomyValidationResult {
  valid: boolean
  errors: string[]
  metrics: {
    canonicalCount: number
    legacyHubsCount: number
    p0Count: number
    p1Count: number
    p2Count: number
    anatomyCount: number
    preservedCount: number
    splitProductCount: number
    newCount: number
  }
}

export function validateTaxonomyInvariants(): TaxonomyValidationResult {
  const errors: string[] = []

  // 1. Regex validation for canonical course IDs
  for (const course of canonicalCourses) {
    if (!COURSE_ID_REGEX.test(course.id)) {
      errors.push(`Invalid canonical course ID format: "${course.id}"`)
    }
  }

  // 2. Regex validation for legacy hub IDs
  for (const hub of legacyHubs) {
    if (!COURSE_ID_REGEX.test(hub.id)) {
      errors.push(`Invalid legacy hub ID format: "${hub.id}"`)
    }
  }

  // 3. Uniqueness of canonical course IDs
  const canonicalIds = new Set<string>()
  for (const course of canonicalCourses) {
    if (canonicalIds.has(course.id)) {
      errors.push(`Duplicate canonical course ID: "${course.id}"`)
    }
    canonicalIds.add(course.id)
  }

  // 4. Uniqueness of legacy hub IDs
  const hubIds = new Set<string>()
  for (const hub of legacyHubs) {
    if (hubIds.has(hub.id)) {
      errors.push(`Duplicate legacy hub ID: "${hub.id}"`)
    }
    hubIds.add(hub.id)
  }

  // 5. No collision between canonical courses and legacy hubs
  for (const hubId of hubIds) {
    if (canonicalIds.has(hubId)) {
      errors.push(`Collision: Legacy Hub ID "${hubId}" also exists as a canonical course ID!`)
    }
  }

  // 6. Each childrenId of a legacy hub exists in canonical courses and is not duplicated in the same hub
  for (const hub of legacyHubs) {
    const seenChildren = new Set<string>()
    for (const childId of hub.childrenIds) {
      if (!canonicalIds.has(childId)) {
        errors.push(`Legacy Hub "${hub.id}" references non-existent canonical child ID "${childId}"`)
      }
      if (seenChildren.has(childId)) {
        errors.push(`Legacy Hub "${hub.id}" has duplicate child ID "${childId}"`)
      }
      seenChildren.add(childId)
    }
  }

  // 7. Each legacyId referenced in canonical courses exists in legacy hubs
  for (const course of canonicalCourses) {
    for (const legacyId of course.legacyIds) {
      if (!hubIds.has(legacyId)) {
        errors.push(`Canonical course "${course.id}" references non-existent legacy ID "${legacyId}"`)
      }
    }
  }

  // 8. Derived metric assertions
  const canonicalCount = canonicalCourses.length
  const legacyHubsCount = legacyHubs.length
  const p0Count = canonicalCourses.filter(c => c.priority === 'P0').length
  const p1Count = canonicalCourses.filter(c => c.priority === 'P1').length
  const p2Count = canonicalCourses.filter(c => c.priority === 'P2').length
  const anatomyCount = canonicalCourses.filter(c => c.subject === 'Anatomie').length
  const preservedCount = canonicalCourses.filter(c => c.status === 'preserved').length
  const splitProductCount = canonicalCourses.filter(c => c.status === 'split_product').length
  const newCount = canonicalCourses.filter(c => c.status === 'new').length

  if (canonicalCount !== 305) {
    errors.push(`Expected 305 canonical courses, but got ${canonicalCount}`)
  }
  if (legacyHubsCount !== 26) {
    errors.push(`Expected 26 legacy hubs, but got ${legacyHubsCount}`)
  }
  if (p0Count !== 166) {
    errors.push(`Expected 166 P0 courses, but got ${p0Count}`)
  }
  if (p1Count !== 128) {
    errors.push(`Expected 128 P1 courses, but got ${p1Count}`)
  }
  if (p2Count !== 11) {
    errors.push(`Expected 11 P2 courses, but got ${p2Count}`)
  }
  if (anatomyCount !== 80) {
    errors.push(`Expected 80 Anatomy courses, but got ${anatomyCount}`)
  }
  if (preservedCount !== 72) {
    errors.push(`Expected 72 preserved courses, but got ${preservedCount}`)
  }
  if (splitProductCount !== 55) {
    errors.push(`Expected 55 split product courses, but got ${splitProductCount}`)
  }
  if (newCount !== 178) {
    errors.push(`Expected 178 new courses, but got ${newCount}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    metrics: {
      canonicalCount,
      legacyHubsCount,
      p0Count,
      p1Count,
      p2Count,
      anatomyCount,
      preservedCount,
      splitProductCount,
      newCount,
    },
  }
}
