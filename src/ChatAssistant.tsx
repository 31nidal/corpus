import {storageScope} from './account/store'
import {useEffect,useRef,useState} from 'react'
import {ArrowUp,MessageCircle,X,LoaderCircle} from 'lucide-react'
import type {SceneAction} from '../shared/actions.mjs'
import type {LearningLevel} from './learning'
type Message={role:'user'|'assistant';text:string;context:string;sources?:{label:string;url:string}[]}
const storedMessage=(message:Message):Message=>({...message,text:message.text.slice(0,5000),context:message.context.slice(0,500),sources:message.sources?.slice(0,2).map(source=>({label:source.label.slice(0,150),url:source.url.slice(0,1000)}))})
export default function ChatAssistant(p:{open:boolean;body:'male'|'female';selectedId:string|null;name:string;system:string;lesson:string;level:LearningLevel;onAction:(a:SceneAction)=>void;onOpen:(b:boolean)=>void}){
 const [accountStorage]=useState(storageScope)
 const open=p.open
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState('local'),[error,setError]=useState('')
 const [messages,setMessages]=useState<Message[]>(()=>{try{return JSON.parse(accountStorage.getItem('corpus-chat-v1')||'[]')}catch{return []}})
 useEffect(()=>{if(messages.length)accountStorage.setItem('corpus-chat-v1',JSON.stringify(messages.slice(-20).map(storedMessage)))},[messages])
 const controller=useRef<AbortController|null>(null),latest=useRef(p);latest.current=p
 useEffect(()=>{fetch('/api/status').then(r=>r.json()).then(r=>setMode(r.mode)).catch(()=>setMode('unavailable'));return()=>controller.current?.abort()},[])
 const toggle=(v:boolean)=>{p.onOpen(v)}
 const send=async()=>{
  if(!message.trim()||busy)return
  const text=message.trim(),context=p.name,selected=p.selectedId,reference=p.body
  const userMessage:Message={role:'user',text,context};setMessages(m=>[...m,userMessage]);accountStorage.event('chat',{title:'Votre question · '+context,...storedMessage(userMessage)});setMessage('');setBusy(true);setError('');toggle(true)
  controller.current=new AbortController()
  try{
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,body:reference,selected_structure:selected,system:p.system,current_lesson:p.lesson,learning_level:p.level}),signal:controller.current.signal})
   const data=await response.json();if(!response.ok)throw new Error(data.error||'La réponse est indisponible.')
   setMode(data.mode)
   const assistantMessage:Message={role:'assistant',text:String(data.message),context,sources:data.sources};setMessages(m=>[...m,assistantMessage]);accountStorage.event('chat',{title:'Réponse · '+context,...storedMessage(assistantMessage)})
   if(latest.current.selectedId===selected&&latest.current.body===reference)for(const action of data.actions??[])p.onAction(action)
   else if(data.actions?.length)setError('La sélection a changé : les actions de cette réponse n’ont pas été appliquées.')
  }catch(e){if((e as Error).name!=='AbortError'){setError((e as Error).message);setMessage(text)}}finally{setBusy(false)}
 }
 return <div className={`assistant-dock ${open?'assistant-open':''}`}>
 {open&&<section className="chat-panel" aria-label="Conversation contextuelle"><header><span><MessageCircle size={15}/>{mode==='connected'?'Assistant IA':'Ressources locales'}</span><button aria-label="Fermer la conversation" onClick={()=>toggle(false)}><X size={17}/></button></header><p className="chat-context">Contexte : {p.name} · {mode==='connected'?'fournisseur configuré':mode==='unavailable'?'service indisponible':'fiches du projet, sans IA générative'}</p><div className="chat-messages" aria-live="polite">{messages.length?messages.map((m,i)=><article key={i} className={`chat-message ${m.role}`}><small>{m.role==='user'?'Vous':mode==='connected'?'Assistant':'Fiche locale'} · {m.context}</small><p>{m.text}</p>{m.sources?.filter(s=>/^https:\/\//.test(s.url)).map(s=><a href={s.url} key={s.url} target="_blank" rel="noreferrer">{s.label}</a>)}</article>):<><h3>Une question, un point de vue.</h3><p>Demandez une explication ou pilotez le corps en langage naturel.</p>{['Montre-moi le pancréas','Isole le cœur','Pourquoi le ventricule gauche est-il plus épais ?'].map(q=><button className="chat-suggestion" key={q} onClick={()=>setMessage(q)}>{q}</button>)}</>}</div>{error&&<p className="chat-error" role="alert">{error}</p>}</section>}
 <form className="chat-composer" onSubmit={e=>{e.preventDefault();void send()}}><button type="button" className="chat-open-button" aria-label="Ouvrir l’assistant" onClick={()=>toggle(!open)}><MessageCircle size={19}/></button><input aria-label="Question à l’assistant" placeholder={`Posez une question${p.selectedId?' sur '+p.name.toLowerCase():' sur le corps'}…`} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)}/><button type="submit" aria-label="Envoyer la question" disabled={busy||!message.trim()}>{busy?<LoaderCircle className="spinning" size={18}/>:<ArrowUp size={18}/>}</button></form>
 </div>
}
