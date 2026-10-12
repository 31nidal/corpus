import {useRef,useState} from 'react'
import {FileDown} from 'lucide-react'

export default function DownloadPdfButton({title,selector,className,label='Exporter en PDF'}:{title:string;selector:string;className?:string;label?:string}) {
  const busy=useRef(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  async function download() {
    if(busy.current)return
    busy.current=true;setLoading(true);setError('')
    try {
      const content=document.querySelector<HTMLElement>(selector)
      if(!content)throw new Error('Le cours est introuvable. Réessayez.')
      const {downloadCoursePdf}=await import('./downloadCoursePdf')
      await downloadCoursePdf(content,title)
    } catch {setError('Téléchargement du PDF impossible. Réessayez.')} finally {busy.current=false;setLoading(false)}
  }
  return <span><button className={className} onClick={()=>void download()} disabled={loading} aria-busy={loading}><FileDown size={15}/>{loading?'Préparation du PDF…':label}</button>{error&&<span role="alert">{error}</span>}</span>
}
