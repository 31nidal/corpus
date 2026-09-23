export type CoursePriority = 'P0' | 'P1' | 'P2'
export type CourseStatus = 'preserved' | 'split_product' | 'new'

export interface ToulouseUniversityMapping {
  ue: string
  topic: string
}

export interface UniversityMappings {
  toulouse: ToulouseUniversityMapping
}

export interface CanonicalCourseMetadata {
  id: string
  title: string
  subject: string
  module: string
  priority: CoursePriority
  status: CourseStatus
  legacyIds: string[]
  universityMappings: UniversityMappings
}

export interface LegacyHub {
  id: string
  title: string
  subject: string
  module: string
  childrenIds: string[]
  reason: string
}

export type CourseRouteResolution =
  | { kind: 'canonical'; course: CanonicalCourseMetadata }
  | { kind: 'legacy-hub'; hub: LegacyHub; children: CanonicalCourseMetadata[] }
  | { kind: 'not-found'; id: string }

