import {useState} from 'react'
import type {StudySection} from './myCoursesTypes'
import './extractedText.css'

export function ExtractedText({text}:{text:string}) {
  const blocks=text.split(/\n\s*\n/).filter(Boolean)
  return <div className="extracted-text">{blocks.map((block,index)=>{
    const rows=block.split('\n').filter(Boolean)
    if(rows.every(row=>row.includes(' | ')))return <div className="extracted-table" key={index}><table><tbody>{rows.map((row,i)=><tr key={i}>{row.split(' | ').map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>
    return <p key={index}>{block}</p>
  })}</div>
}
export function ExtractedSection({section,index}:{section:StudySection;index:number}) {
  const [expanded,setExpanded]=useState(false)
  return <article id={'study-section-'+section.id} className="mycourses-summary-card">
    <h3><span>{index+1}. {section.title}</span><span>Pages {section.startPage}–{section.endPage}</span></h3>
    <ExtractedText text={expanded||section.content.length<=450?section.content:section.content.slice(0,450)+'…'}/>
    {section.content.length>450&&<button className="mycourses-action-btn" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Réduire le texte':'Lire la section complète'}</button>}
  </article>
}
