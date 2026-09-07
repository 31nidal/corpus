import type { SharedView, Opacities, CutSettings, CameraPose } from './types'
export const groups = ['skin','skeleton','organs','muscles','arteries','veins','nerves','joints'] as const
export const defaultOpacity: Opacities = {skin:.085,skeleton:1,organs:1,muscles:1,arteries:1,veins:1,nerves:1,joints:1}
export const defaultCut: CutSettings = {enabled:false,axis:'z',position:0,flipped:false,guide:true}
const triple = (v: unknown): v is [number,number,number] => Array.isArray(v) && v.length===3 && v.every(n=>typeof n==='number' && Number.isFinite(n) && Math.abs(n)<=50)
export function decodeView(encoded: string | null): SharedView | null {
  if (!encoded || encoded.length>100000) return null
  try {
    const v=JSON.parse(decodeURIComponent(escape(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')))))
    if(v.version!==1 || !triple(v.camera?.position) || !triple(v.camera?.target)) return null
    if(Math.hypot(...v.camera.position.map((n:number,i:number)=>n-v.camera.target[i]))<.05)return null
    if(!groups.every(g=>typeof v.visibility?.[g]==='boolean' && Number.isFinite(v.opacity?.[g]) && v.opacity[g]>=0 && v.opacity[g]<=1))return null
    if(!v.cut || !['x','y','z'].includes(v.cut.axis) || !Number.isFinite(v.cut.position) || Math.abs(v.cut.position)>1 || !['enabled','flipped','guide'].every(k=>typeof v.cut[k]==='boolean'))return null
    if(!Array.isArray(v.hidden) || v.hidden.length>2000 || !v.hidden.every((id:unknown)=>typeof id==='string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)))return null
    if(!['off','names','revision'].includes(v.labels) || typeof v.isolated!=='boolean' || typeof v.dark!=='boolean')return null
    return v as SharedView
  } catch { return null }
}
export function encodeView(view: SharedView) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(view)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}
export function roundedPose(p: CameraPose): CameraPose {
  return {position:p.position.map(v=>Number(v.toFixed(5))) as CameraPose['position'],target:p.target.map(v=>Number(v.toFixed(5))) as CameraPose['target']}
}
