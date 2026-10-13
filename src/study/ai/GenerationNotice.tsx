import {useEffect,useState} from 'react'
import {useAccount} from '../../account/store'
export type GenerationInfo = {mode:string;model?:string;message?:string;errorCode?:string;coverage?:{sectionsTotal:number;sectionsAnalyzed:number;chunksTotal:number;chunksAnalyzed:number;sectionsSummarized?:number;missingSections?:{id:string;title:string}[]};rejected?:number}
export function useGenerationProvider() {
  const [provider,setProvider]=useState<GenerationInfo|null>(null)
  const account=useAccount()
  useEffect(()=>{let active=true;setProvider(null);void fetch('/api/flashcards/generation-status',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(value=>{if(active)setProvider(value)}).catch(()=>{});return()=>{active=false}},[account.user?.id])
  return provider
}
export function GenerationNotice({generation,provider}:{generation?:GenerationInfo|null;provider?:GenerationInfo|null}) {
  const info=generation||provider
  if(!info)return <p>Les supports générés restent à relire avant validation.</p>
  return <div className="generation-notice">
    <p><strong>{info.mode==='gemini'?`Génération par IA · Gemini${info.model?' · '+info.model:''}`:'Génération locale'}</strong></p>
    {!generation&&info.mode==='gemini'&&<p>Les passages sélectionnés seront transmis à Google pour cette génération. Évitez les données personnelles sensibles.</p>}
    {info.message&&<p>{info.message}</p>}
    {info.coverage&&<p>{info.coverage.sectionsAnalyzed}/{info.coverage.sectionsTotal} sections analysées · {info.coverage.chunksAnalyzed}/{info.coverage.chunksTotal} blocs traités.</p>}
    {info.coverage?.sectionsSummarized!==undefined&&<p>{info.coverage.sectionsSummarized}/{info.coverage.sectionsTotal} sections représentées dans le support. Ce compteur ne garantit pas la couverture de chaque notion.</p>}
    {Boolean(info.coverage?.missingSections?.length)&&<p>Sections sans point retenu : {info.coverage!.missingSections!.map(section=>section.title).join(' · ')}.</p>}
    {Boolean(info.rejected)&&<p>{info.rejected} propositions écartées lors des contrôles de qualité et de source.</p>}
    <small>Vérifiez les questions, les réponses et leurs preuves. La présence d’un extrait ne certifie pas l’exactitude du cours.</small>
  </div>
}
