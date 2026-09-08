import {useEffect,useId,useState} from 'react'
import {ArrowRight,MousePointer2} from 'lucide-react'
import {diagrams} from './diagrams'

export default function CourseDiagram({courseId}:{courseId:string}){
 const graph=diagrams[courseId],uid=useId().replace(/:/g,''),[active,setActive]=useState(0),[compact,setCompact]=useState(()=>window.matchMedia('(max-width:700px)').matches)
 useEffect(()=>{setActive(0)},[courseId])
 useEffect(()=>{const media=window.matchMedia('(max-width:700px)');const update=()=>setCompact(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[])
 if(!graph)return null
 const width=compact?340:720,n=graph.nodes.length,nodeWidth=compact?142:graph.kind==='branch'?Math.min(154,640/Math.max(1,n-1)-12):174,nodeHeight=66
 const ranks=Array<number>(n).fill(Infinity);ranks[0]=0
 if(graph.links)for(let pass=0;pass<n;pass++)for(const edge of graph.links)ranks[edge.to]=Math.min(ranks[edge.to],ranks[edge.from]+1)
 const levels=graph.nodes.map((_,i)=>graph.links?(Number.isFinite(ranks[i])?ranks[i]:1):i===0?0:1)
 const positions=graph.nodes.map((_,i)=>{
  if(graph.kind==='cycle'&&!compact){const angle=-Math.PI/2+i*2*Math.PI/n;return {x:360+245*Math.cos(angle),y:180+132*Math.sin(angle)}}
  if(graph.kind==='branch'){
   const siblings=levels.map((level,index)=>level===levels[i]?index:-1).filter(index=>index>=0),index=siblings.indexOf(i),columns=compact?Math.min(2,siblings.length):siblings.length
   const previousRows=Array.from({length:levels[i]},(_,level)=>Math.ceil(levels.filter(value=>value===level).length/(compact?2:n))).reduce((a,b)=>a+b,0)
   return{x:width/columns*(index%columns+.5),y:43+(previousRows+Math.floor(index/columns))*112}
  }
  const columns=compact?(graph.kind==='compare'?2:1):3,row=Math.floor(i/columns),col=row%2===0?i%columns:columns-1-i%columns
  return{x:width/columns*(col+.5),y:45+row*116}
 })
 const height=Math.max(...positions.map(p=>p.y))+48
 const links=graph.links??(graph.kind==='compare'?[]:graph.kind==='branch'?graph.nodes.slice(1).map((_,i)=>({from:0,to:i+1})):graph.nodes.slice(1).map((_,i)=>({from:i,to:i+1})))
 const edges=graph.kind==='cycle'?[...links,{from:n-1,to:0}]:links
 const path=(from:number,to:number)=>{
  const a=positions[from],b=positions[to]
  if(graph.kind==='cycle'&&compact&&to===0)return 'M '+(a.x-nodeWidth/2)+' '+a.y+' H 30 V '+b.y+' H '+(b.x-nodeWidth/2-6)
  if(Math.abs(a.y-b.y)<8){const dir=b.x>a.x?1:-1;return 'M '+(a.x+dir*nodeWidth/2)+' '+a.y+' L '+(b.x-dir*(nodeWidth/2+6))+' '+b.y}
  const dir=b.y>a.y?1:-1,start=a.y+dir*nodeHeight/2,end=b.y-dir*(nodeHeight/2+6),middle=(start+end)/2
  return 'M '+a.x+' '+start+' V '+middle+' H '+b.x+' V '+end
 }
 return <figure className="interactive-diagram" aria-labelledby={uid+'-title'}>
  <figcaption><span className="study-eyebrow">SCHÉMA EXPLICATIF INTERACTIF</span><h2 id={uid+'-title'}>{graph.title}</h2><p>{graph.caption}</p></figcaption>
  <div className="diagram-hint"><MousePointer2 size={14}/>Sélectionnez un élément pour comprendre son rôle.</div>
  <div className={'diagram-canvas diagram-'+graph.kind} style={{aspectRatio:width+'/'+height}} role="group" aria-label="Éléments du schéma">
   <svg viewBox={'0 0 '+width+' '+height} aria-hidden="true"><defs><marker id={uid+'-arrow'} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke"/></marker></defs>{edges.map((edge,i)=><path key={i} d={path(edge.from,edge.to)} className={edge.from===active||edge.to===active?'diagram-edge active':'diagram-edge'} markerEnd={'url(#'+uid+'-arrow)'} />)}</svg>
   {graph.nodes.map((node,i)=><button key={node.label} aria-pressed={active===i} onClick={()=>setActive(i)} style={{left:(positions[i].x-nodeWidth/2)/width*100+'%',top:(positions[i].y-nodeHeight/2)/height*100+'%',width:nodeWidth/width*100+'%',height:nodeHeight/height*100+'%'}}><span>{String(i+1).padStart(2,'0')}</span><strong>{node.label}</strong></button>)}
  </div>
  <div className="diagram-explanation" aria-live="polite"><span>{String(active+1).padStart(2,'0')}</span><div><h3>{graph.nodes[active].label}</h3><p>{graph.nodes[active].detail}</p></div></div>
  <div className="diagram-navigation"><span>{active+1} / {n} éléments</span><button onClick={()=>setActive((active+1)%n)}>Élément suivant<ArrowRight size={15}/></button></div>
  <ul className="sr-only">{edges.map((edge,i)=><li key={i}>{graph.nodes[edge.from].label} vers {graph.nodes[edge.to].label}</li>)}</ul>
 </figure>
}
