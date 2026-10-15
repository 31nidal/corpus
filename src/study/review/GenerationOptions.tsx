import {useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import type {GenerationOptions as Options} from './api'
export function GenerationOptions({document,busy,onGenerate,sourceSelection}:{document:StudyDocument;busy:boolean;onGenerate:(options:Options)=>void;sourceSelection?:Options['selection']}) {
  const sections=document.sections||[]
  const [selected,setSelected]=useState(sections.map(s=>s.id))
  const [start,setStart]=useState(1),[end,setEnd]=useState(document.pageCount),[count,setCount]=useState(12)
  const [useSelection,setUseSelection]=useState(Boolean(sourceSelection))
  const passage=useSelection&&sourceSelection
  const [level,setLevel]=useState<Options['level']>('standard')
  return <fieldset disabled={busy} className="draft-generation-options"><legend>Générer des brouillons depuis le cours</legend>
    {sourceSelection&&<><label><input type="checkbox" checked={useSelection} onChange={event=>setUseSelection(event.target.checked)}/>Utiliser uniquement le passage sélectionné · page {sourceSelection.page}</label>{passage&&<blockquote>{sourceSelection.text}</blockquote>}</>}
    <div className="draft-review-fields"><label>Niveau<select value={level} onChange={e=>setLevel(e.target.value as Options['level'])}><option value="essential">Essentiel</option><option value="standard">Standard</option><option value="complete">Complet</option></select></label><label>Nombre cible<input aria-label="Nombre cible" type="number" min={1} max={60} value={count} onChange={e=>setCount(Number(e.target.value))}/></label><label>Première page<input disabled={Boolean(passage)} type="number" min={1} max={document.pageCount} value={start} onChange={e=>setStart(Number(e.target.value))}/></label><label>Dernière page<input disabled={Boolean(passage)} type="number" min={start} max={document.pageCount} value={end} onChange={e=>setEnd(Number(e.target.value))}/></label></div>
    <fieldset disabled={Boolean(passage)}><label><input type="checkbox" checked={selected.length===sections.length} onChange={e=>setSelected(e.target.checked?sections.map(s=>s.id):[])}/> Toutes les sections</label>
    <div className="draft-generation-sections">{sections.map(s=><label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,s.id]:ids.filter(id=>id!==s.id))}/>{s.title} · p. {s.startPage}–{s.endPage}</label>)}</div>
    </fieldset><p>{passage?'Seul ce passage sera analysé ; sa page et ses preuves seront conservées.':'Le nombre est une cible, limitée à 60. Les sections sélectionnées sont parcourues à tour de rôle.'}</p>
    <button className="study-primary" disabled={!passage&&!selected.length||!Number.isInteger(count)||count<1||count>60||!passage&&(!Number.isInteger(start)||!Number.isInteger(end)||start<1||start>end||end>document.pageCount)} onClick={()=>onGenerate(passage?{count,level,selection:sourceSelection}:{count,level,sectionIds:selected,startPage:start,endPage:end})}>{busy?'Analyse en cours…':'Générer les brouillons'}</button>
  </fieldset>
}
