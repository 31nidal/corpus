export type GroupId = 'skin' | 'skeleton' | 'organs' | 'muscles' | 'arteries' | 'veins' | 'nerves' | 'joints'
export type Structure = { id: string; name: string; group: GroupId; meshNames: string[]; aggregate?: boolean; groups?: GroupId[]; detailOnly?:boolean; assemblyProvenance?: { type: 'curated-resource-collection'; validation: 'pending-review'; reference: string } }
export type ModelGroup = { id: GroupId; url: string; bytes: number; label: string; sha256?: string }
export type Manifest = { license?: string; atlasRevision?: string; groups: ModelGroup[]; structures: Structure[] }
export type Visibility = Record<GroupId, boolean>
export type LoadState = { progress: number; ready: GroupId[]; error: string | null; complete: boolean }
export type AnatomicalView = 'front' | 'back' | 'left' | 'right' | 'superior' | 'inferior'
export type ViewerApi = { frame: (id:string) => void; capture: () => CameraPose; reset: () => void; zoom: (direction: number) => void; orient: (view: AnatomicalView) => void; project: (id: string) => {x: number; y: number} | null; restoreCamera?: () => void }
export type Opacities = Record<GroupId, number>
export type CutSettings = { enabled: boolean; axis: 'x' | 'y' | 'z'; position: number; flipped: boolean; guide: boolean }
export type CameraPose = { position: [number,number,number]; target: [number,number,number] }
export type LabelMode = 'off' | 'names' | 'revision'
export type SharedView = { version: 1; camera: CameraPose; visibility: Visibility; opacity: Opacities; structureOpacities?: Record<string, number>; cut: CutSettings; isolated: boolean; hidden: string[]; labels: LabelMode; dark: boolean }
