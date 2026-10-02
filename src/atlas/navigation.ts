import type { AtlasDefinition, AtlasStructure } from './types'
import type { FlashcardSource } from '../flashcards/flashcardsTypes'

export function atlasStructureHash(atlasId: AtlasDefinition['id'], viewId: string, structureId: string): string {
  return '#' + new URLSearchParams({ tab: 'atlas', sub: atlasId, view: viewId, structure: structureId }).toString()
}

export function atlasFlashcardSource(atlasId: AtlasDefinition['id'], viewId: string, structure: AtlasStructure): FlashcardSource {
  return {
    type: 'manual',
    courseId: structure.relatedCourseId ?? null,
    locator: { route: atlasStructureHash(atlasId, viewId, structure.id), structureId: structure.id },
  }
}
