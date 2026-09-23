import { canonicalCourses } from './canonicalCourses.ts'
import { legacyHubs, getLegacyHub } from './legacyHubs.ts'
import type { CourseRouteResolution } from './taxonomyTypes.ts'

export function resolveCourseRoute(id: string | null | undefined): CourseRouteResolution {
  if (!id) {
    return { kind: 'not-found', id: '' }
  }

  // 1. Check if it's a canonical chapter
  const canonical = canonicalCourses.find(c => c.id === id)
  if (canonical) {
    return { kind: 'canonical', course: canonical }
  }

  // 2. Check if it's a legacy hub
  const hub = getLegacyHub(id)
  if (hub) {
    const children = hub.childrenIds
      .map(childId => canonicalCourses.find(c => c.id === childId))
      .filter((c): c is typeof canonicalCourses[number] => Boolean(c))
    return { kind: 'legacy-hub', hub, children }
  }

  return { kind: 'not-found', id }
}

export function isCanonicalCourseId(id: string): boolean {
  return canonicalCourses.some(c => c.id === id)
}

export function isLegacyHubId(id: string): boolean {
  return legacyHubs.some(h => h.id === id)
}

export function isValidCourseOrHubId(id: string): boolean {
  return isCanonicalCourseId(id) || isLegacyHubId(id)
}

export function getCourseOrHubTitle(id: string): string | undefined {
  const canonical = canonicalCourses.find(c => c.id === id)
  if (canonical) return canonical.title
  const hub = legacyHubs.find(h => h.id === id)
  if (hub) return hub.title
  return undefined
}

export function getCourseOrHubSubject(id: string): string | undefined {
  const canonical = canonicalCourses.find(c => c.id === id)
  if (canonical) return canonical.subject
  const hub = legacyHubs.find(h => h.id === id)
  if (hub) return hub.subject
  return undefined
}
