import type { CameraPose, Opacities, Visibility, CutSettings, LabelMode } from '../types'
export type StructureOpacities = Record<string, number>
export type AnatomySceneSnapshot = {
  selectedId: string | null; visibility: Visibility; opacity: Opacities
  structureOpacities: StructureOpacities; cut: CutSettings; labels: LabelMode; isolated: boolean; hiddenIds: string[]; camera: CameraPose | null
}
/** A containing assembly sets a ceiling; unrelated structures are unaffected. */
export function meshOpacityMultiplier(structureIds: string[], values: StructureOpacities = {}): number {
  return structureIds.reduce((opacity, id) => {
    const value = values[id]
    return Number.isFinite(value) ? Math.min(opacity, Math.max(0, Math.min(1, value))) : opacity
  }, 1)
}
