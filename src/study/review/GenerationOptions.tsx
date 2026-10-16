import {useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import type {GenerationOptions as Options} from './api'
export function GenerationOptions({document,busy,onGenerate}:{document:StudyDocument;busy:boolean;onGenerate:(options:Options)=>void}) {
  const sections=document.sections||[]
  const [selected,setSelected]=useState(sections.map(s=>s.id))
  const [start,setStart]=useState(1),[end,setEnd]=useState(document.pageCount),[count,setCount]=useState(12)
  const [level,setLevel]=useState<Options['level']>('standard')
  return <fieldset disabled={busy} className="draft-generation-options"><legend>Générer des brouillons depuis le cours</legend>
    <div className="draft-review-fields"><label>Niveau<select value={level} onChange={e=>setLevel(e.target.value as Options['level'])}><option value="essential">Essentiel</option><option value="standard">Standard</option><option value="complete">Complet</option></select></label><label>Nombre cible<input aria-label="Nombre cible" type="number" min={1} max={60} value={count} onChange={e=>setCount(Number(e.target.value))}/></label><label>Première page<input type="number" min={1} max={document.pageCount} value={start} onChange={e=>setStart(Number(e.target.value))}/></label><label>Dernière page<input type="number" min={start} max={document.pageCount} value={end} onChange={e=>setEnd(Number(e.target.value))}/></label></div>
    <label><input type="checkbox" checked={selected.length===sections.length} onChange={e=>setSelected(e.target.checked?sections.map(s=>s.id):[])}/> Toutes les sections</label>
    <div className="draft-generation-sections">{sections.map(s=><label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,s.id]:ids.filter(id=>id!==s.id))}/>{s.title} · p. {s.startPage}–{s.endPage}</label>)}</div>
    <p>Le nombre est une cible, limitée à 60. Les sections sélectionnées sont parcourues à tour de rôle.</p>
    <button className="study-primary" disabled={!selected.length||!Number.isInteger(count)||count<1||count>60||!Number.isInteger(start)||!Number.isInteger(end)||start<1||start>end||end>document.pageCount} onClick={()=>onGenerate({count,level,sectionIds:selected,startPage:start,endPage:end})}>{busy?'Analyse en cours…':'Générer les brouillons'}</button>
  </fieldset>
}
