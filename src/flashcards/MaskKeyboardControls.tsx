import type {ImageOcclusionMask} from './flashcardsTypes'
type Geometry = 'x' | 'y' | 'width' | 'height'
const fields: {key: Geometry; label: string}[] = [
  {key: 'x', label: 'Position horizontale (%)'}, {key: 'y', label: 'Position verticale (%)'},
  {key: 'width', label: 'Largeur du masque (%)'}, {key: 'height', label: 'Hauteur du masque (%)'},
]
export function MaskKeyboardControls({mask, onChange}: {mask: ImageOcclusionMask; onChange: (mask: ImageOcclusionMask) => void}) {
  function change(key: Geometry, percent: number) {
    if (!Number.isFinite(percent)) return
    const value = {...mask, [key]: Math.round(Math.max(0, Math.min(1, percent / 100)) * 10000) / 10000}
    value.width = Math.max(.02, Math.min(1, value.width)); value.height = Math.max(.02, Math.min(1, value.height))
    value.x = Math.min(value.x, 1 - value.width); value.y = Math.min(value.y, 1 - value.height)
    onChange(value)
  }
  return <fieldset className="occlusion-geometry"><legend>Position et taille du masque</legend>{fields.map(({key, label}) =>
    <label key={key}>{label}<input type="number" min={key === 'width' || key === 'height' ? 2 : 0} max={100} step={1}
      value={Number((mask[key] * 100).toFixed(2))} onChange={event => change(key, Number(event.target.value))}/></label>,
  )}</fieldset>
}
