export type GroupId = 'skin' | 'skeleton' | 'organs' | 'muscles' | 'arteries' | 'veins' | 'nerves' | 'joints'
export type Structure = { id: string; name: string; group: GroupId; meshNames: string[]; aggregate?: boolean; groups?: GroupId[] }
export type ModelGroup = { id: GroupId; url: string; bytes: number; label: string }
export type Manifest = { groups: ModelGroup[]; structures: Structure[] }
export type Visibility = Record<GroupId, boolean>
export type LoadState = { progress: number; ready: GroupId[]; error: string | null; complete: boolean }
export type ViewerApi = { reset: () => void; zoom: (direction: number) => void; orient: (view: 'front' | 'back') => void; project: (id: string) => {x: number; y: number} | null }
