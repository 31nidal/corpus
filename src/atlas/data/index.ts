import { brainAtlasData } from './brainAtlasData'
import { heartAtlasData } from './heartAtlasData'
import type { AtlasDefinition } from '../types'

export const atlasRegistry: Record<'brain' | 'heart', AtlasDefinition> = {
  brain: brainAtlasData,
  heart: heartAtlasData
}

export function getAtlasDefinition(id: string): AtlasDefinition | null {
  if (id === 'brain' || id === 'heart') {
    return atlasRegistry[id]
  }
  return null
}

export function getAllAtlases(): AtlasDefinition[] {
  return [brainAtlasData, heartAtlasData]
}
