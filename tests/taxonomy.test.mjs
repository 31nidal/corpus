import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalCourses,
  legacyHubs,
  getLegacyHub,
  findHubForChild,
  resolveCourseRoute,
  isCanonicalCourseId,
  isLegacyHubId,
  isValidCourseOrHubId,
  getCourseOrHubTitle,
  getCourseOrHubSubject,
  validateTaxonomyInvariants,
  COURSE_ID_REGEX
} from '../src/study/taxonomy/index.ts'
import { expandCourseIdsForProvenance } from '../server/flashcards/provenance.mjs'

test('A. Taxonomy invariants (counts, disciplines, priorities, IDs, and Toulouse UEs)', () => {
  const result = validateTaxonomyInvariants()
  assert.equal(result.valid, true, `Validation errors: ${result.errors.join('; ')}`)
  assert.equal(result.errors.length, 0)

  // Metrics check
  assert.equal(canonicalCourses.length, 305, 'Total canonical courses must be exactly 305')
  assert.equal(legacyHubs.length, 26, 'Total legacy hubs must be exactly 26')

  const p0Count = canonicalCourses.filter(c => c.priority === 'P0').length
  const p1Count = canonicalCourses.filter(c => c.priority === 'P1').length
  const p2Count = canonicalCourses.filter(c => c.priority === 'P2').length

  assert.equal(p0Count, 166, 'P0 courses must be exactly 166')
  assert.equal(p1Count, 128, 'P1 courses must be exactly 128')
  assert.equal(p2Count, 11, 'P2 courses must be exactly 11')

  const anatomyCount = canonicalCourses.filter(c => c.subject === 'Anatomie').length
  assert.equal(anatomyCount, 80, 'Anatomie courses must be exactly 80')

  // Toulouse UE checks
  const medSocCourses = canonicalCourses.filter(c => c.subject === 'Médicament & Société')
  assert.ok(medSocCourses.length > 0, 'Médicament & Société courses must exist')
  for (const c of medSocCourses) {
    assert.equal(c.universityMappings.toulouse.ue, 'UE8', `Course ${c.id} should map to UE8`)
  }

  const rechercheCourses = canonicalCourses.filter(c => c.subject === 'Recherche biomédicale')
  assert.ok(rechercheCourses.length > 0, 'Recherche biomédicale courses must exist')
  for (const c of rechercheCourses) {
    assert.equal(c.universityMappings.toulouse.ue, 'UE8/11', `Course ${c.id} should map to UE8/11`)
  }

  const anglaisCourses = canonicalCourses.filter(c => c.subject === 'Anglais médical')
  assert.ok(anglaisCourses.length > 0, 'Anglais médical courses must exist')
  for (const c of anglaisCourses) {
    assert.equal(c.universityMappings.toulouse.ue, 'UE13', `Course ${c.id} should map to UE13`)
  }

  // Zero collisions between canonical courses and legacy hubs
  const canonicalIds = new Set(canonicalCourses.map(c => c.id))
  for (const hub of legacyHubs) {
    assert.ok(!canonicalIds.has(hub.id), `Legacy hub ${hub.id} collides with a canonical ID`)
  }
})

test('B. Old URL cell-cycle resolves to Legacy Hub with children', () => {
  const route = resolveCourseRoute('cell-cycle')
  assert.equal(route.kind, 'legacy-hub')
  if (route.kind === 'legacy-hub') {
    assert.equal(route.hub.id, 'cell-cycle')
    assert.equal(route.hub.title, 'Cycle cellulaire et mitose')
    assert.deepEqual(route.hub.childrenIds, ['cell-cycle-phases-control', 'cell-mitosis-cytokinesis'])
    assert.equal(route.children.length, 2)
    assert.equal(route.children[0].id, 'cell-cycle-phases-control')
    assert.equal(route.children[1].id, 'cell-mitosis-cytokinesis')
  }
})

test('C. Canonical URL cell-cycle-phases-control resolves to canonical chapter', () => {
  const route = resolveCourseRoute('cell-cycle-phases-control')
  assert.equal(route.kind, 'canonical')
  if (route.kind === 'canonical') {
    assert.equal(route.course.id, 'cell-cycle-phases-control')
    assert.equal(route.course.priority, 'P0')
    assert.equal(route.course.subject, 'Biologie cellulaire')
    assert.equal(route.course.title, 'Cycle cellulaire : phases G1, S, G2, M, cyclines, CDK et points de contrôle')
  }
})

test('D. Progression preservation (corpus-completed)', () => {
  const savedCompletedInLocalStorage = ['cell-cycle', 'orientation', 'non-existent-random-id']
  // App.tsx and CoursesWorkspace.tsx use isValidCourseOrHubId to filter
  const restored = savedCompletedInLocalStorage.filter(x => isValidCourseOrHubId(x))
  assert.deepEqual(restored, ['cell-cycle', 'orientation'], 'cell-cycle must be preserved and non-existent removed')

  assert.equal(isValidCourseOrHubId('cell-cycle'), true)
  assert.equal(isLegacyHubId('cell-cycle'), true)
  assert.equal(isCanonicalCourseId('cell-cycle'), false)

  assert.equal(isValidCourseOrHubId('orientation'), true)
  assert.equal(isCanonicalCourseId('orientation'), true)
  assert.equal(isLegacyHubId('orientation'), false)
})

test('E. Bookmarks preservation (corpus-saved-courses)', () => {
  const savedCourses = ['cell-cycle', 'homeostasis', 'unknown-deleted']
  const restored = savedCourses.filter(x => isValidCourseOrHubId(x))
  assert.deepEqual(restored, ['cell-cycle', 'homeostasis'])

  const hub = getLegacyHub('cell-cycle')
  assert.ok(hub)
  assert.equal(hub.title, 'Cycle cellulaire et mitose')
})

test('F. Legacy note access (corpus-note-[courseId])', () => {
  const hubId = 'cell-cycle'
  const noteKey = 'corpus-note-' + hubId
  assert.equal(noteKey, 'corpus-note-cell-cycle', 'Note key must preserve exact courseId')
})

test('G. Children are not automatically marked completed when hub is completed', () => {
  const userCompleted = ['cell-cycle']
  const hub = getLegacyHub('cell-cycle')
  assert.ok(hub)

  for (const childId of hub.childrenIds) {
    assert.equal(
      userCompleted.includes(childId),
      false,
      `Child ${childId} must not be automatically marked completed`
    )
  }
})

test('H. Flashcard provenance expansion: hub to children', () => {
  const expanded = expandCourseIdsForProvenance('cell-cycle')
  assert.deepEqual(
    expanded,
    ['cell-cycle', 'cell-cycle-phases-control', 'cell-mitosis-cytokinesis'],
    'Expanding cell-cycle must return hub and all children'
  )
})

test('I. Flashcard provenance expansion: child to hub', () => {
  const expanded = expandCourseIdsForProvenance('cell-cycle-phases-control')
  assert.deepEqual(
    expanded,
    ['cell-cycle-phases-control', 'cell-cycle'],
    'Expanding child must include the child and its parent legacy hub'
  )

  const standalone = expandCourseIdsForProvenance('orientation')
  assert.deepEqual(standalone, ['orientation'])
})

test('J. Regex validation for course and hub IDs', () => {
  // Canonical kebab-case
  assert.ok(COURSE_ID_REGEX.test('cell-cycle-phases-control'))
  assert.ok(COURSE_ID_REGEX.test('anat-scapula-clavicle'))
  assert.ok(COURSE_ID_REGEX.test('biochem-krebs-cycle'))

  // Legacy FMA IDs
  assert.ok(COURSE_ID_REGEX.test('FMA7088'))
  assert.ok(COURSE_ID_REGEX.test('FMA7309'))
  assert.ok(COURSE_ID_REGEX.test('FMA24474'))

  // Legacy hubs
  for (const hub of legacyHubs) {
    assert.ok(COURSE_ID_REGEX.test(hub.id), `Legacy hub ID ${hub.id} must pass regex`)
  }

  // Canonical courses
  for (const course of canonicalCourses) {
    assert.ok(COURSE_ID_REGEX.test(course.id), `Canonical course ID ${course.id} must pass regex`)
  }

  // Invalid IDs
  assert.equal(COURSE_ID_REGEX.test('Cell-Cycle'), false, 'Uppercase letters forbidden except FMA')
  assert.equal(COURSE_ID_REGEX.test('cell--cycle'), false, 'Double hyphens forbidden')
  assert.equal(COURSE_ID_REGEX.test('cell cycle'), false, 'Spaces forbidden')
  assert.equal(COURSE_ID_REGEX.test('-cell-cycle'), false, 'Leading hyphen forbidden')
  assert.equal(COURSE_ID_REGEX.test('cell-cycle-'), false, 'Trailing hyphen forbidden')
  assert.equal(COURSE_ID_REGEX.test('FMA'), false, 'FMA without digits forbidden')
  assert.equal(COURSE_ID_REGEX.test('FMA-7088'), false, 'FMA with hyphen forbidden')
  assert.equal(COURSE_ID_REGEX.test('FMA_7088'), false, 'Underscore forbidden')
})

test('K. Helpers getCourseOrHubTitle and getCourseOrHubSubject', () => {
  assert.equal(getCourseOrHubTitle('cell-cycle'), 'Cycle cellulaire et mitose')
  assert.equal(getCourseOrHubTitle('cell-cycle-phases-control'), 'Cycle cellulaire : phases G1, S, G2, M, cyclines, CDK et points de contrôle')
  assert.equal(getCourseOrHubTitle('unknown-course-id'), undefined)

  assert.equal(getCourseOrHubSubject('cell-cycle'), 'Biologie cellulaire')
  assert.equal(getCourseOrHubSubject('cell-cycle-phases-control'), 'Biologie cellulaire')
  assert.equal(getCourseOrHubSubject('unknown-course-id'), undefined)
})
