import {useEffect,useState} from 'react'
import {Download,History,LogOut,ShieldCheck,UserRound,X} from 'lucide-react'
import {courses} from '../study/curriculum'
import {questions} from '../study/questions'
import {activate,clearRecovery,flush,importGuest,logout,request,storageScope,useAccount} from './store'

type Mode='login'|'register'|'recover'|'password'|'delete'
type Entry={seq:number;kind:string;created:string;payload:Record<string,unknown>}

function storedCount(key:string){
 try{return Object.keys(JSON.parse(storageScope().getItem(key)||'{}')).length}
 catch{return 0}
}

function entryTitle(entry:Entry){
 const payload=entry.payload,key=String(payload.key||'')
 if(entry.kind!=='value')return String(payload.title||payload.name||'Activité enregistrée')
 if(key.startsWith('corpus-note-'))return 'Notes · '+(courses.find(course=>course.id===key.slice(12))?.title||key.slice(12))
 if(key==='corpus-completed')return 'Cours terminés'
 if(key==='corpus-saved-courses')return 'Favoris'
 if(key==='corpus-practice-v1')return 'Progression des quiz'
 if(key==='corpus-chat-v1')return 'Conversation enregistrée'
 return 'Préférences'
}

function HistoryEntry({entry,close}:{entry:Entry;close:()=>void}){
 const payload=entry.payload,key=String(payload.key||'')
 const answerMap=payload.answers as Record<string,number[]>|undefined
 return <li>
  <time>{new Date(entry.created).toLocaleString('fr-FR')}</time>
  <strong>{entryTitle(entry)}</strong>
  {payload.score!==undefined&&<span>Score : {String(payload.score)} / {String(payload.total)}</span>}
  {typeof payload.url==='string'&&payload.url.startsWith('#')&&<a href={payload.url} onClick={close}>Reprendre →</a>}
  {entry.kind==='chat'&&typeof payload.text==='string'&&<details><summary>Relire ce message</summary><p>{payload.text}</p></details>}
  {entry.kind==='quiz'&&Array.isArray(payload.questions)&&<details><summary>Revoir mes réponses</summary>{payload.questions.filter(id=>typeof id==='string').map(id=>{
   const question=questions.find(item=>item.id===id),answers=answerMap?.[String(id)]||[]
   return question?<div className="history-answer" key={String(id)}><h4>{question.prompt}</h4><p>Votre réponse : {answers.map(index=>question.options[index]).filter(Boolean).join(' ; ')||'Aucune réponse'}</p><p>Correction : {question.correct.map(index=>question.options[index]).join(' ; ')}</p><a href={'#tab=cours&cours='+question.course} onClick={close}>Relire le cours →</a></div>:null
  })}</details>}
  {entry.kind==='value'&&key.startsWith('corpus-note-')&&<details><summary>Relire cette version</summary><p>{String(payload.value||'Note supprimée')}</p></details>}
 </li>
}

export default function AccountPanel({close}:{close:()=>void}){
 const account=useAccount()
 const [mode,setMode]=useState<Mode>('login')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [items,setItems]=useState<Entry[]>([])
 const [more,setMore]=useState(true)

 const load=async(before?:number)=>{
  const data=await request('history'+(before?'?before='+before:''))
  setItems(old=>before?[...old,...data.items]:data.items)
  setMore(data.items.length===40)
 }
 useEffect(()=>{if(account.user)void (async()=>{await flush();await load()})().catch(problem=>setError(problem.message))},[account.user?.id])

 const action=async(fn:()=>Promise<void>)=>{
  setBusy(true);setError('')
  try{await fn()}catch(problem){setError((problem as Error).message)}finally{setBusy(false)}
 }
 const submit=(form:HTMLFormElement)=>action(async()=>{
  const data=Object.fromEntries(new FormData(form))
  if(account.user)await flush()
  const result=await request(mode,data)
  if(mode==='delete'){activate({user:null});setMode('login');return}
  if(mode==='password'){activate(result);setMode('login');setError('Mot de passe modifié.');return}
  activate(result)
 })
 const exportData=()=>action(async()=>{
  await flush()
  const data=await request('export')
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
  const link=document.createElement('a');link.href=url;link.download='mycorpus-mon-historique.json';link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
 })

 return <aside className="account-panel" aria-label="Mon compte">
  <header><span><UserRound size={20}/>MON ESPACE</span><button className="icon-button" aria-label="Fermer le profil" onClick={close}><X size={20}/></button></header>
  <div className="account-content">
   <h2>{account.user?`Bonjour, ${account.user.name}.`:'Votre apprentissage, partout.'}</h2>
   <p>{account.user?account.user.email:'Retrouvez vos cours, vos notes et vos résultats sur vos appareils.'}</p>
   {error&&<p className="account-error" role="alert">{error}</p>}
   {!account.user&&account.available&&account.status!=='Mode invité'&&<p className="account-error" role="status">{account.status}</p>}
   {account.recovery&&<section className="recovery-code"><h3>Conservez votre code de récupération</h3><p>Il remplace l’e-mail de réinitialisation. Sans ce code et sans votre mot de passe, vous ne pourrez pas récupérer le compte.</p><code>{account.recovery}</code><button onClick={clearRecovery}>J’ai conservé mon code</button></section>}

   {!account.available?<p role="status">Les comptes attendent l’activation du stockage persistant sur le serveur. Vous pouvez continuer en mode invité.</p>:(!account.user||mode==='password'||mode==='delete')?<>
    {!account.user&&<div className="account-tabs"><button aria-pressed={mode==='login'} onClick={()=>setMode('login')}>Connexion</button><button aria-pressed={mode==='register'} onClick={()=>setMode('register')}>Créer un compte</button></div>}
    <form onSubmit={event=>{event.preventDefault();void submit(event.currentTarget)}}>
     {mode==='register'&&<label>Prénom ou pseudonyme<input name="name" autoComplete="nickname" minLength={2} maxLength={60} required/></label>}
     {!account.user&&<label>Adresse e-mail<input name="email" type="email" autoComplete="email" maxLength={254} required/></label>}
     {mode==='recover'&&<label>Code de récupération<input name="recovery" autoComplete="off" required/></label>}
     <label>{mode==='recover'?'Nouveau mot de passe':account.user?'Mot de passe actuel':'Mot de passe'}<input aria-label={mode==='recover'?'Nouveau mot de passe':account.user?'Mot de passe actuel':'Mot de passe'} name="password" type="password" autoComplete={mode==='register'||mode==='recover'?'new-password':'current-password'} minLength={12} maxLength={128} required/><small>12 caractères minimum.</small></label>
     {mode==='password'&&<label>Nouveau mot de passe<input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label>}
     {mode==='delete'&&<label className="account-check"><input type="checkbox" required/>Je confirme la suppression définitive de mon compte et de tout son historique.</label>}
     {mode==='register'&&<p className="account-privacy">Vos données d’apprentissage sont enregistrées sur le serveur MyCorpus jusqu’à la suppression de votre compte. Vous pourrez les exporter ou les supprimer. N’inscrivez pas de données médicales personnelles dans vos notes. L’adresse e-mail n’est pas vérifiée.</p>}
     <button className="primary-action" disabled={busy}>{busy?'Veuillez patienter…':mode==='register'?'Créer mon compte':mode==='recover'?'Récupérer mon compte':mode==='password'?'Modifier mon mot de passe':mode==='delete'?'Supprimer définitivement':'Me connecter'}</button>
    </form>
    <button className="account-link" onClick={()=>setMode(mode==='login'?'recover':'login')}>{mode==='login'?'Mot de passe oublié ?':'Retour à la connexion'}</button>
   </>:<>
    <p className="account-sync" role="status"><ShieldCheck size={16}/>{account.status}</p>
    <div className="account-stats"><span><strong>{storedCount('corpus-completed')}</strong>Cours terminés</span><span><strong>{storedCount('corpus-practice-v1')}</strong>Questions travaillées</span><span><strong>{storedCount('corpus-saved-courses')}</strong>Favoris</span></div>
    <div className="account-actions">
     <button disabled={busy} onClick={()=>void action(async()=>activate(await request('session')))}>Recharger mon compte</button>
     <button disabled={busy} onClick={()=>void action(async()=>{await flush();await load()})}>Actualiser l’historique</button>
     <button disabled={busy} onClick={()=>void action(async()=>{importGuest();await flush()})}>Importer mes données invitées</button>
     <button disabled={busy} onClick={()=>void exportData()}><Download size={15}/>Exporter mes données</button>
    </div>
    <small>L’import ajoute les rubriques absentes du compte. Les données invitées restent sur cet appareil.</small>
    <h3><History size={18}/>Mon historique</h3><p>Explorations, cours consultés, quiz, notes et progression.</p>
    <ol className="account-history">{items.map(entry=><HistoryEntry key={entry.seq} entry={entry} close={close}/>)}</ol>
    {!items.length&&<p>Votre prochaine activité apparaîtra ici.</p>}
    {more&&<button onClick={()=>void action(()=>load(items.at(-1)?.seq))}>Afficher la suite</button>}
    <div className="account-security"><button onClick={()=>setMode('password')}>Modifier mon mot de passe</button><button disabled={busy} onClick={()=>void action(logout)}><LogOut size={15}/>Me déconnecter</button><button onClick={()=>setMode('delete')}>Supprimer mon compte</button></div>
   </>}
  </div>
 </aside>
}
