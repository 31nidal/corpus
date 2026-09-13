import {useId,useState} from 'react'
import './medicalDiagram.css'

import {medicalPlates} from './medicalPlates'
export {medicalPlates} from './medicalPlates'

function Drawing({courseId,arrow}:{courseId:string;arrow:string}) {
 const head={markerEnd:`url(#${arrow})`}
 if(courseId==='phys-cardiac-cycle')return <>
  {[80,160,240,320].map(y=><path key={y} className="med-grid" d={`M80 ${y}H580`}/>)}
  <path className="med-axis" d="M80 40V355H585"/>
  <text x="87" y="28">Pression (mmHg)</text><text x="410" y="389">Volume (mL)</text>
  <text x="38" y="85">120</text><text x="48" y="165">80</text><text x="48" y="245">40</text><text x="55" y="325">0</text>
  <text x="163" y="378">50</text><text x="454" y="378">120</text>
  <path d="M180 320Q350 323 470 300L470 140Q360 32 180 100Z" fill="var(--med-wash)"/>
  <path className="med-flow" d="M210 320Q350 321 440 306" {...head}/><path className="med-flow" d="M470 273V169" {...head}/>
  <path className="med-flow med-red" d="M448 118Q330 46 210 93" {...head}/><path className="med-flow" d="M180 127V290" {...head}/>
  <text x="275" y="347">Remplissage</text><text x="485" y="207">Contraction</text><text x="485" y="226">isovolumétrique</text>
  <text x="280" y="60">Éjection</text><text x="88" y="205">Relaxation</text><text x="252" y="216">VES = 120 − 50</text><text x="289" y="241">70 mL</text>
 </>
 if(courseId==='phys-renal')return <>
  <path d="M40 195H590V382H40Z" fill="var(--med-wash)"/><path className="med-grid" d="M40 195H590"/><text x="45" y="182">Cortex</text><text x="45" y="222">Médullaire</text>
  <path className="med-blood" d="M45 60H105C150 60 170 120 125 130C70 140 75 65 130 65C175 65 152 140 105 110C70 75 165 70 148 112L184 58H580"/>
  <path className="med-tube" d="M100 53C55 65 63 147 118 150C165 154 160 128 177 118C194 91 192 153 217 152C249 155 220 79 250 77C282 76 254 143 285 150V320Q285 355 325 355Q365 355 365 320V110C365 60 400 60 400 110C400 155 438 155 440 110C442 77 478 87 493 107H520V365"/>
  <path className="med-flow med-green" d="M286 250H239" {...head}/><text x="218" y="239">H₂O</text>
  <path className="med-flow med-green" d="M370 300H421" {...head}/><text x="391" y="287">Sels</text>
  <path className="med-flow med-green" d="M525 313H581" {...head}/><text x="555" y="300">H₂O</text><text x="540" y="346">selon ADH</text>
  <path className="med-flow" d="M310 355H345" {...head}/><text x="480" y="392">Urine ↓</text>
  <text x="37" y="33">Sang entrant</text><text x="429" y="42">Sang efférent →</text>
 </>
 if(courseId==='ventilation')return <>
  <path d="M260 35V85C100 91 130 264 305 271C473 276 516 105 380 85V35" fill="var(--med-wash)" stroke="var(--med-teal)" strokeWidth="9"/>
  <path d="M100 277C205 365 465 395 567 282" fill="none" stroke="var(--med-red)" strokeWidth="38" opacity=".25"/>
  <path className="med-flow med-red" d="M110 289C238 377 449 388 552 303" {...head}/>
  <path className="med-flow" d="M287 34V84" {...head}/><path className="med-flow" d="M350 84V34" {...head}/>
  <path className="med-flow" d="M292 216V344" {...head}/><path className="med-flow med-red" d="M405 349V218" {...head}/>
  <text x="302" y="252">O₂</text><text x="416" y="223">CO₂</text><text x="245" y="170">Lumière alvéolaire</text>
  <text x="39" y="334">Sang entrant</text><text x="450" y="387">Sang sortant</text>
  {[190,237,455,489].map((x,i)=><ellipse key={x} cx={x} cy={i<2?329+i*8:345-(i-2)*12} rx="13" ry="7" fill="var(--med-red)"/>)}
 </>
 if(courseId==='embryo-weeks-one-three')return <>
  <path d="M60 73Q320 10 580 73V125H60Z" fill="var(--med-wash)"/><text x="258" y="50">Côté amniotique</text>
  <path d="M60 121H280Q305 121 320 160Q335 121 360 121H580V155H357Q337 155 320 185Q303 155 283 155H60Z" fill="#82c6da"/>
  <path d="M60 211Q180 198 281 218Q315 234 360 218Q464 194 580 211V252H60Z" fill="#dc9cac"/>
  <path d="M60 281Q320 271 580 281V314Q320 301 60 314Z" fill="#e4c887"/>
  {Array.from({length:12},(_,i)=><ellipse key={i} cx={82+i*43} cy="140" rx="12" ry="9" fill="#245b86" opacity=".65"/>)}
  {Array.from({length:12},(_,i)=><ellipse key={i} cx={82+i*43} cy="295" rx="12" ry="7" fill="#936c28" opacity=".65"/>)}
  <path className="med-flow" d="M315 85V175Q315 231 247 231" {...head}/><path className="med-flow" d="M334 174Q370 230 403 235" {...head}/>
  <path className="med-flow" d="M323 239V285" {...head}/><text x="238" y="362">Côté vésicule vitelline</text>
 </>
 return <>
  <path d="M58 93L101 115L146 82L167 131L202 151L177 185L196 231L143 243L114 281L84 238L42 253L53 195L24 163L61 145Z" fill="var(--med-wash)" stroke="var(--med-teal)" strokeWidth="3"/>
  <ellipse cx="115" cy="182" rx="37" ry="45" fill="var(--med-teal)" opacity=".22"/>
  <circle cx="320" cy="190" r="65" fill="#dfdafa" stroke="#8b79bd" strokeWidth="3"/><circle cx="330" cy="198" r="36" fill="#8b79bd" opacity=".35"/>
  <path className="med-flow" d="M184 166H212V179H242"/><path className="med-flow med-red" d="M210 156H236"/>
  <path className="med-flow" d="M265 166L247 179L259 191"/>
  <text x="184" y="119">Peptide</text><text x="171" y="272">CMH II · TCR</text>
  <circle cx="520" cy="125" r="45" fill="#d5ebc9" stroke="#589278" strokeWidth="3"/>
  <path className="med-flow med-green" d="M516 80V62M516 62L503 48M516 62L529 48"/><path className="med-red med-flow" d="M501 38H531"/>
  <path className="med-flow" d="M386 177Q426 149 463 148" {...head}/><text x="394" y="121">Aide T</text>
  <path className="med-flow" d="M521 182V261" {...head}/><text x="534" y="221">Différenciation</text>
  <ellipse cx="497" cy="320" rx="52" ry="43" fill="#d5ebc9" stroke="#589278" strokeWidth="3"/>
  {[560,590,615].map((x,i)=><path key={x} className="med-flow med-green" d={`M${x} ${318+i*16}v-17m0 0l-8 -9m8 9l8 -9`}/>)}
  <text x="70" y="320">Présentation</text><text x="282" y="289">Activation</text>
 </>
}

export default function MedicalDiagram({courseId}:{courseId:string}) {
 const plate=medicalPlates[courseId],uid=useId().replace(/:/g,''),[active,setActive]=useState(0),[hidden,setHidden]=useState(false),[quiz,setQuiz]=useState(false),[target,setTarget]=useState(0),[result,setResult]=useState<boolean|null>(null)
 if(!plate)return null
 const select=(index:number)=>{setActive(index);if(quiz)setResult(index===target)}
 return <figure className="medical-plate" aria-label={plate.title}>
  <figcaption><span className="study-eyebrow">COMPRENDRE PAR LE DESSIN</span><h2>{plate.title}</h2><p>{plate.caption}</p></figcaption>
  <div className="medical-toolbar"><button aria-pressed={hidden} onClick={()=>setHidden(!hidden)}>{hidden?'Afficher les légendes':'Masquer les légendes'}</button><button aria-pressed={quiz} onClick={()=>{setQuiz(!quiz);setResult(null)}}>{quiz?'Quitter le repérage':'Exercice de repérage'}</button></div>
  {quiz&&<p className="medical-target">Retrouvez : <strong>{plate.points[target].name}</strong></p>}
  <div className="medical-scroll" tabIndex={0} role="region" aria-label="Dessin défilable horizontalement sur petit écran"><div className="medical-drawing">
   <svg viewBox="0 0 640 410" aria-hidden="true"><defs><marker id={uid} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker></defs><Drawing courseId={courseId} arrow={uid}/></svg>
   {plate.points.map((point,i)=><button className="medical-hotspot" key={point.name} style={{left:point.x/640*100+'%',top:point.y/410*100+'%'}} aria-label={hidden||quiz?`Repère ${i+1}`:point.name} aria-pressed={active===i&&(!quiz||result!==null)} onClick={()=>select(i)}>{i+1}</button>)}
  </div></div>
  <small className="medical-scroll-hint">Sur petit écran, faites glisser le dessin horizontalement. Les repères sont accessibles au clavier.</small>
  {!hidden&&!quiz&&<div className="medical-legend">{plate.points.map((p,i)=><button key={p.name} onClick={()=>select(i)} aria-pressed={active===i}>{i+1}. {p.name}</button>)}</div>}
  <div className="medical-detail" aria-live="polite">{quiz?<><strong>{result===null?'Choisissez un repère numéroté.':result?'Bien repéré.':'Ce repère ne correspond pas. Réessayez.'}</strong>{result&&<><p>{plate.points[target].detail}</p><button onClick={()=>{setTarget((target+1)%plate.points.length);setResult(null)}}>Repère suivant →</button></>}</>:hidden?<p>Légendes masquées : nommez les repères, puis affichez les légendes pour vérifier.</p>:<><strong>{active+1}. {plate.points[active].name}</strong><p>{plate.points[active].detail}</p></>}</div>
 </figure>
}
