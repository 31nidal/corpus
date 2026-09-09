export type GroupId = 'skin' | 'skeleton' | 'organs' | 'muscles' | 'arteries' | 'veins' | 'nerves' | 'joints'
export type Structure = { id: string; name: string; group: GroupId; meshNames: string[]; aggregate?: boolean; groups?: GroupId[]; detailOnly?:boolean }
export type ModelGroup = { id: GroupId; url: string; bytes: number; label: string }
export type Manifest = { groups: ModelGroup[]; structures: Structure[] }
export type Visibility = Record<GroupId, boolean>
export type LoadState = { progress: number; ready: GroupId[]; error: string | null; complete: boolean }
export type ViewerApi = { frame: (id:string) => void; capture: () => CameraPose; reset: () => void; zoom: (direction: number) => void; orient: (view: 'front' | 'back') => void; project: (id: string) => {x: number; y: number} | null }
export type Opacities = Record<GroupId, number>
export type CutSettings = { enabled: boolean; axis: 'x' | 'y' | 'z'; position: number; flipped: boolean; guide: boolean }
export type CameraPose = { position: [number,number,number]; target: [number,number,number] }
export type LabelMode = 'off' | 'names' | 'revision'
export type SharedView = { version: 1; camera: CameraPose; visibility: Visibility; opacity: Opacities; cut: CutSettings; isolated: boolean; hidden: string[]; labels: LabelMode; dark: boolean }
