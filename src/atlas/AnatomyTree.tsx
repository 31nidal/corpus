import { useMemo, useState } from 'react'
import type { Manifest } from '../types'
import { translateAnatomyName } from '../data/anatomy'
import { assemblyComponents, vertebraCode } from './anatomicalGraph'
import { normalizeAnatomicalAnswer } from './anatomyLearning'

/** The tree exposes actual resource composition; anatomical PART-OF stays in its sourced panel. */
export default function AnatomyTree({manifest,selectedId,onSelect}:{manifest:Manifest;selectedId:string|null;onSelect:(id:string)=>void}) {
  const [query,setQuery]=useState('')
  const [limit,setLimit]=useState(60)
  const index=useMemo(()=>{
    const label=(id:string)=>{const s=manifest.structures.find(s=>s.id===id)!;const code=vertebraCode(s.name);return `${code?code+' · ':''}${translateAnatomyName(s.name)??s.name}`}
    const labels=new Map(manifest.structures.map(s=>[s.id,label(s.id)]))
    const assemblies=manifest.structures.filter(s=>s.aggregate).map(s=>({structure:s,children:assemblyComponents(manifest.structures,s.id)}))
    const memberIds=new Set(assemblies.flatMap(a=>a.children.map(s=>s.id)))
    return {labels,assemblies,memberIds}
  },[manifest])
  const choose=(id:string)=><button type="button" key={id} aria-current={selectedId===id?'true':undefined} onClick={()=>onSelect(id)}><span>{index.labels.get(id)}</span><small>{id}</small></button>
  const normalized=normalizeAnatomicalAnswer(query)
  const results=normalized?manifest.structures.filter(s=>normalizeAnatomicalAnswer(`${index.labels.get(s.id)} ${s.name} ${s.id}`).includes(normalized)):[]
  return <nav className="anatomy-tree" aria-label="Arbre des structures 3D">
    <p>Corps humain · {manifest.atlasRevision?.startsWith('hra-')?'référence féminine':'référence masculine'}</p>
    <label><span className="sr-only">Rechercher dans l’arbre</span><input aria-label="Rechercher dans l’arbre" placeholder="Nom, identifiant, C1 à L5…" value={query} onChange={event=>{setQuery(event.target.value);setLimit(60)}}/></label>
    {normalized ? <><p role="status">{results.length} résultat(s)</p>{results.slice(0,limit).map(s=>choose(s.id))}{results.length>limit&&<button onClick={()=>setLimit(n=>n+60)}>Afficher la suite</button>}</> : manifest.groups.map(group=>{
      const assemblies=index.assemblies.filter(a=>a.structure.group===group.id)
      const leaves=manifest.structures.filter(s=>s.group===group.id&&!s.aggregate&&!index.memberIds.has(s.id))
      return <details key={group.id}><summary>{group.label} <small>({manifest.structures.filter(s=>s.group===group.id&&!s.aggregate).length})</small></summary>
        {assemblies.map(({structure,children})=><details key={structure.id}><summary>{index.labels.get(structure.id)}</summary>{choose(structure.id)}{[...children].sort((a,b)=>index.labels.get(a.id)!.localeCompare(index.labels.get(b.id)!,'fr',{numeric:true})).map(s=>choose(s.id))}</details>)}
        <TreeLeaves leaves={leaves.map(s=>s.id)} choose={choose}/>
      </details>
    })}
    <p className="tool-note">Arbre des ressources disponibles. Les relations anatomiques sourcées se consultent dans chaque fiche.</p>
  </nav>
}
function TreeLeaves({leaves,choose}:{leaves:string[];choose:(id:string)=>React.ReactNode}) {
  const [limit,setLimit]=useState(40)
  return <>{leaves.slice(0,limit).map(choose)}{leaves.length>limit&&<button onClick={()=>setLimit(n=>n+40)}>Afficher {Math.min(40,leaves.length-limit)} structures supplémentaires</button>}</>
}
