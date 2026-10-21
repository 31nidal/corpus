// Only our generated reveal markers become elements. Imported/source HTML is text.
const decode=(value:string)=>value.replace(/&(?:amp|lt|gt|quot|#39);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity]||entity))
export default function ClozeBack({text}:{text:string}){
 const parts=text.split(/(<span class="cloze-revealed" data-cloze="c\d+">[\s\S]*?<\/span>)/g)
 return <>{parts.map((part,index)=>{const match=part.match(/^<span class="cloze-revealed" data-cloze="(c\d+)">([\s\S]*)<\/span>$/);return match?<span key={index} className="cloze-revealed" data-cloze={match[1]}>{decode(match[2])}</span>:decode(part)})}</>
}
