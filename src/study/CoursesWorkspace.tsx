import {storageScope,useAccount} from '../account/store'
import {useEffect,useRef,useState,type FormEvent} from 'react'
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,Box,Bookmark,GraduationCap,PenLine,ShieldAlert,FileDown,Sparkles} from 'lucide-react'
import {courses,type Course} from './curriculum'
import {questions} from './questions'
import CourseDiagram from './CourseDiagram'
import CourseLibrary from './CourseLibrary'
import {subjectFor} from './subjects'
import diseases from '../data/diseases.json'
import {lessons} from '../learning'
import {feedbackUrl} from './feedback'
import AnkiExportMenu from './AnkiExportMenu'
import GenerationDialog from '../flashcards/GenerationDialog'
import type{GenerationSource}from'../flashcards/flashcardsTypes'
import {resolveCourseRoute, isValidCourseOrHubId, type LegacyHub, type CanonicalCourseMetadata} from './taxonomy'

const sectionSlug=(title:string,index:number)=>`${index+1}-${title.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}`

function readSaved():string[]{try{const v=JSON.parse(storageScope().getItem('corpus-saved-courses')||'[]');return Array.isArray(v)?v.filter(id=>courses.some(c=>c.id===id)||isValidCourseOrHubId(id)):[]}catch{return []}}
function Notebook({courseId,title}:{courseId:string;title?:string}){
 const [accountStorage]=useState(storageScope),account=useAccount()
 const key='corpus-note-'+courseId
 const [note,setNote]=useState(()=>{try{return accountStorage.getItem(key)||''}catch{return ''}}),[notice,setNotice]=useState('Enregistrées sur cet appareil uniquement.')
 return <section className="course-notebook"><h2><PenLine size={19}/>Mon carnet de cours{title?` · ${title}`:''}</h2><p>Reformulez une notion, notez votre erreur ou une question à poser en cours.</p><textarea aria-label="Mes notes de cours" maxLength={8000} value={note} placeholder="Ce que je veux retenir…" onChange={e=>{setNote(e.target.value);try{accountStorage.setItem(key,e.target.value);setNotice('Notes enregistrées sur cet appareil.')}catch{setNotice('Enregistrement indisponible : copiez vos notes avant de quitter.')}}}/><small role="status">{account.user?account.status:notice}</small></section>
}
const frenchDate=(value:string)=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T12:00:00Z'))
function ReviewNotice({course}:{course:Course}){
 const review=course.review!,labels={unreviewed:'Non relu par un professionnel de santé',pedagogical:'Relu pédagogiquement',professional:'Relu par un professionnel de santé'}
 return <aside className={'course-review course-review-'+review.status} aria-label="Transparence éditoriale"><ShieldAlert size={21}/><div><span className="review-label">STATUT DU CONTENU</span><strong>{labels[review.status]}</strong><p>Dernière mise à jour : {frenchDate(review.updatedAt)} · Références associées : {frenchDate(review.sourcesUpdatedAt)} · {(course.sources?.length||1)} source{(course.sources?.length||1)>1?'s':''}</p><small>Support pédagogique indépendant, sans validation clinique ni affiliation universitaire. Vérifiez les notions avec les supports officiels de votre faculté.</small></div></aside>
}
function FeedbackForm({course}:{course:Course}){
 const [open,setOpen]=useState(false),[status,setStatus]=useState<'idle'|'sending'|'sent'|'error'>('idle')
 const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setStatus('sending');const target=event.currentTarget,form=new FormData(target),payload={course:course.id,courseTitle:course.title,passage:String(form.get('passage')||''),correction:String(form.get('correction')||''),source:String(form.get('source')||''),email:String(form.get('email')||'')};try{const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json','X-MyCorpus-Request':'feedback'},body:JSON.stringify(payload)});if(!response.ok)throw new Error();setStatus('sent');target.reset()}catch{setStatus('error')}}
 return <section className="course-feedback-panel"><button className="course-feedback" type="button" aria-expanded={open} onClick={()=>{setOpen(value=>!value);setStatus('idle')}}>Signaler une erreur dans ce cours</button>{open&&<>{status==='sent'?<div className="feedback-success" role="status"><strong>Merci, votre signalement a bien été transmis.</strong><p>Il sera relu avant toute modification du cours.</p><button type="button" onClick={()=>setOpen(false)}>Fermer</button></div>:<form onSubmit={submit}><p>Aucun compte n’est nécessaire. Décrivez précisément le passage afin de faciliter sa vérification.</p><label>Passage concerné<textarea name="passage" required maxLength={1500}/></label><label>Correction proposée<textarea name="correction" required maxLength={3000}/></label><label>Source éventuelle<input name="source" type="url" maxLength={1000} placeholder="https://…"/></label><label>E-mail pour vous répondre <small>(facultatif)</small><input name="email" type="email" maxLength={254}/></label><div className="feedback-actions"><button className="study-primary" disabled={status==='sending'}>{status==='sending'?'Envoi…':'Envoyer le signalement'}</button><a target="_blank" rel="noreferrer" href={feedbackUrl(course.id)}>Ou ouvrir un ticket GitHub ↗</a></div>{status==='error'&&<p className="feedback-error" role="alert">Le formulaire est momentanément indisponible. Vous pouvez utiliser le lien GitHub ci-dessus.</p>}<small className="feedback-privacy">Les informations saisies servent uniquement à examiner ce signalement. N’indiquez aucune donnée médicale personnelle.</small></form>}</>}</section>
}

function LegacyHubView(p:{hub:LegacyHub;children:CanonicalCourseMetadata[];completed:string[];saved:string[];toggleSave:(id:string)=>void;returnToLibrary:(subject?:string)=>void;navigate:(id:string|null)=>void;practice:(id:string)=>void}){
 const isHubCompleted=p.completed.includes(p.hub.id)
 return <>
  <div className="study-breadcrumb"><button onClick={()=>p.returnToLibrary()}><ArrowLeft size={16}/>Tous les cours</button><span>/</span><span>{p.hub.subject}</span><span>/</span><span>{p.hub.title}</span><div className="course-document-actions"><button className="bookmark-course" aria-pressed={p.saved.includes(p.hub.id)} onClick={()=>p.toggleSave(p.hub.id)}><Bookmark size={15}/>{p.saved.includes(p.hub.id)?'Enregistré':'Garder pour plus tard'}</button></div></div>
  <div className="reading-layout">
   <article className="course-article">
    <div className="study-eyebrow">{p.hub.subject.toLocaleUpperCase('fr')} · {p.hub.module.toLocaleUpperCase('fr')}</div>
    <h1>{p.hub.title}</h1>
    <div className="course-meta"><span className="legacy-hub-badge"><Sparkles size={14}/> Ancien cours restructuré</span><span><BookOpen size={14}/> {p.children.length} nouvelles unités courtes (10–25 min)</span>{isHubCompleted&&<span><CheckCircle2 size={15}/> Validé dans l'ancienne version</span>}</div>
    {isHubCompleted&&<aside className="legacy-hub-completed-banner" role="status"><CheckCircle2 size={24}/><div><strong>Validé dans l'ancienne version du programme</strong><p>Vous aviez validé ce cours dans l'ancienne version du programme. Pour valider la nouvelle version avec sa granularité approfondie, complétez les chapitres ci-dessous :</p></div></aside>}
    <section className="legacy-hub-explanation"><h2>Pourquoi ce cours a-t-il été restructuré ?</h2><p>{p.hub.reason}</p><small>Ce cours a été découpé pour offrir un apprentissage plus progressif et ciblé, conforme aux exigences de la première année Santé. Chaque sous-chapitre représente 10 à 25 minutes de travail concentré.</small></section>
    <section className="legacy-hub-children-section"><h2>Nouveaux chapitres du programme canonique</h2><div className="legacy-hub-children-list">{p.children.map((child,index)=>{const isChildCompleted=p.completed.includes(child.id);return <div key={child.id} className="legacy-child-row"><span className="child-index">{String(index+1).padStart(2,'0')}</span><div className="child-content"><div className="child-title-bar"><h3>{child.title}</h3><span className={`priority-tag priority-${child.priority.toLowerCase()}`}>{child.priority}</span></div><p>{child.subject} · {child.module}</p><div className="child-meta-status">{isChildCompleted?<span className="child-completed"><CheckCircle2 size={15}/> Chapitre validé</span>:<span className="child-pending">À étudier</span>}</div></div><button className="study-primary" onClick={()=>p.navigate(child.id)}>Accéder au cours <ArrowRight size={15}/></button></div>})}</div></section>
    <section className="legacy-hub-practice-section"><h2>Entraînement QCM d'ensemble</h2><p>Testez vos connaissances transversales sur l'ensemble des notions de ce thème restructuré.</p><button className="study-secondary" onClick={()=>p.practice(p.hub.id)}><GraduationCap size={17}/> Lancer l'entraînement ({p.hub.title})</button></section>
    <Notebook courseId={p.hub.id} title={p.hub.title}/>
   </article>
   <aside className="reading-sidebar"><span className="study-eyebrow">SOMMAIRE DES UNITÉS</span>{p.children.map((child,i)=><button key={child.id} className="sidebar-child-link" onClick={()=>p.navigate(child.id)}><span>{String(i+1).padStart(2,'0')}</span>{child.title}</button>)}<button className="study-secondary sidebar-practice" onClick={()=>p.practice(p.hub.id)}><GraduationCap size={16}/> S'entraîner sur ce thème</button><div className="study-note">Vos anciennes notes et votre statut sont conservés.<br/>Les nouveaux chapitres se valident individuellement.</div></aside>
  </div>
 </>
}

function CanonicalPlaceholderView(p:{course:CanonicalCourseMetadata;completed:string[];saved:string[];toggleSave:(id:string)=>void;returnToLibrary:(subject?:string)=>void;navigate:(id:string|null)=>void;practice:(id:string)=>void}){
 return <>
  <div className="study-breadcrumb"><button onClick={()=>p.returnToLibrary()}><ArrowLeft size={16}/>Tous les cours</button><span>/</span><span>{p.course.subject}</span><span>/</span><span>{p.course.module}</span><div className="course-document-actions"><button className="bookmark-course" aria-pressed={p.saved.includes(p.course.id)} onClick={()=>p.toggleSave(p.course.id)}><Bookmark size={15}/>{p.saved.includes(p.course.id)?'Enregistré':'Garder pour plus tard'}</button></div></div>
  <div className="reading-layout">
   <article className="course-article">
    <div className="study-eyebrow">{p.course.subject.toLocaleUpperCase('fr')} · {p.course.module.toLocaleUpperCase('fr')}</div>
    <h1>{p.course.title}</h1>
    <div className="canonical-placeholder-meta"><span className={`priority-tag priority-${p.course.priority.toLowerCase()}`}>Priorité {p.course.priority}</span><span><GraduationCap size={15}/> Maquette canonique de première année Santé</span><span><BookOpen size={14}/> 10 à 25 min d'apprentissage ciblé</span>{p.completed.includes(p.course.id)&&<span><CheckCircle2 size={15}/> Terminé</span>}</div>
    <CourseDiagram key={'diagram-'+p.course.id} courseId={p.course.id}/>
    <section className="legacy-hub-explanation"><h2>Nouveau chapitre au programme canonique</h2><p>Ce chapitre fait partie du référentiel pédagogique approfondi MyCorpus. La rédaction complète de son contenu selon les standards éditoriaux de première année Santé est programmée.</p><small>Référentiel universitaire associé : Toulouse {p.course.universityMappings.toulouse.ue} ({p.course.universityMappings.toulouse.topic}).</small></section>
    <section className="legacy-hub-practice-section"><h2>S'entraîner sur cette matière</h2><p>Pratiquez dès maintenant les notions de {p.course.subject} en mode QCM ou examen blanc.</p><button className="study-secondary" onClick={()=>p.practice(p.course.id)}><GraduationCap size={17}/> Lancer un entraînement ({p.course.subject})</button></section>
    <Notebook courseId={p.course.id} title={p.course.title}/>
   </article>
   <aside className="reading-sidebar"><span className="study-eyebrow">NAVIGATION</span><button className="study-secondary sidebar-practice" onClick={()=>p.returnToLibrary()}><ArrowLeft size={16}/> Retourner à la bibliothèque</button></aside>
  </div>
 </>
}

export default function CoursesWorkspace(p:{initial:string|null;completed:string[];complete:(id:string)=>void;explore:(id:string)=>void;practice:(id:string)=>void;navigate:(id:string|null)=>void}){
 const [accountStorage]=useState(storageScope)
 const [query,setQuery]=useState(''),[category,setCategory]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('matiere')??''),[group,setGroup]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('module')??''),[filter,setFilter]=useState('all'),[saved,setSaved]=useState(readSaved),[reveal,setReveal]=useState(false),[pathology,setPathology]=useState<string|null>(null),[progress,setProgress]=useState(0)
 const [generation,setGeneration]=useState<GenerationSource|null>(null),[selectedPassage,setSelectedPassage]=useState(''),[toast,setToast]=useState('')
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(t)},[toast])
 const workspace=useRef<HTMLElement>(null)
 const routeResolution=resolveCourseRoute(p.initial)
 const course=routeResolution.kind==='legacy-hub'?undefined:courses.find(c=>c.id===p.initial)
 useEffect(()=>{setReveal(false);setPathology(null);setProgress(0);workspace.current?.scrollTo(0,0)},[p.initial])
 useEffect(()=>{if(!course)return;const section=new URLSearchParams(location.hash.slice(1)).get('section');if(section)requestAnimationFrame(()=>document.getElementById('section-'+section)?.scrollIntoView({behavior:'smooth',block:'start'}))},[course?.id])
 const browse=(subject:string,module='')=>{setCategory(subject);setGroup(module);const params=new URLSearchParams(location.hash.slice(1));if(subject)params.set('matiere',subject);else params.delete('matiere');if(module)params.set('module',module);else params.delete('module');history.pushState(null,'','#'+params.toString());workspace.current?.scrollTo(0,0)}
 useEffect(()=>{const sync=()=>{const params=new URLSearchParams(location.hash.slice(1));setCategory(params.get('matiere')??'');setGroup(params.get('module')??'')};window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync)}},[])
 const disease=diseases.find(d=>d.id===pathology),siblings=course?courses.filter(c=>c.category===course.category):[],nextCourse=course?siblings[siblings.indexOf(course)+1]:null
 const returnToLibrary=(subject='')=>{setQuery('');setFilter('all');browse(subject);p.navigate(null)}
 const toggleSave=(id:string)=>{const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];setSaved(next);try{accountStorage.setItem('corpus-saved-courses',JSON.stringify(next))}catch{/* optional */}}
 const questionCount=(id:string)=>questions.filter(q=>q.course===id).length
 const exportPdf=()=>{if(!course)return;const previous=document.title;document.title=`MyCorpus - ${course.title}`;window.addEventListener('afterprint',()=>{document.title=previous},{once:true});window.print()}
 return <section ref={workspace} onScroll={e=>{const el=e.currentTarget;setProgress(Math.round(el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight)*100))}} className="study-workspace courses-workspace" aria-label="Cours de première année">
 {routeResolution.kind==='legacy-hub'?<LegacyHubView hub={routeResolution.hub} children={routeResolution.children} completed={p.completed} saved={saved} toggleSave={toggleSave} returnToLibrary={returnToLibrary} navigate={p.navigate} practice={p.practice}/>:course?<>
  <div className="reading-progress"><span style={{width:progress+'%'}}/></div>
  <div className="study-breadcrumb"><button onClick={()=>returnToLibrary()}><ArrowLeft size={16}/>Tous les cours</button><span>/</span><button onClick={()=>returnToLibrary(subjectFor(course).id)}>{course.category}</button><span>/</span><span>{course.tag}</span><div className="course-document-actions"><button className="study-primary" onClick={()=>setGeneration({kind:'catalog',title:course.title,courseId:course.id,subject:course.category,chapter:course.title,sections:course.sections.map((section,index)=>({id:sectionSlug(section.title,index),title:section.title,text:[section.text,...(section.bullets||[])].join(' ')}))})}><Sparkles size={15}/>Générer des flashcards</button><button className="export-course" onClick={exportPdf}><FileDown size={15}/>Exporter en PDF</button><AnkiExportMenu course={course} storage={accountStorage}/><button className="bookmark-course" aria-pressed={saved.includes(course.id)} onClick={()=>toggleSave(course.id)}><Bookmark size={15}/>{saved.includes(course.id)?'Enregistré':'Garder pour plus tard'}</button></div></div>
  <div className="reading-layout"><article className="course-article" onMouseUp={()=>{const text=window.getSelection()?.toString().trim()||'';setSelectedPassage(text.length>=20&&text.length<=8000?text:'')}}>
   <div className="study-eyebrow">{course.category} · {course.caseStudy?'COURS & APPLICATIONS':'REPÈRES ANATOMIQUES'}</div><h1>{course.title}</h1>
   <div className="course-meta"><span><BookOpen size={14}/>{course.readingMinutes?`${course.readingMinutes} min de lecture · exercices en plus`:`${course.minutes} min avec exercices`}</span><span><GraduationCap size={15}/>Première année</span><span>{questionCount(course.id)} questions associées</span>{p.completed.includes(course.id)&&<span><CheckCircle2 size={15}/>Terminé</span>}</div>
   <ReviewNotice course={course}/>
   <div className="objectives"><h2>À la fin de ce cours</h2>{course.objectives.map(o=><p key={o}><Check size={16}/>{o}</p>)}</div>
   {course.prerequisites&&<aside className="course-prerequisites"><strong>Avant de commencer</strong><p>{course.prerequisites.join(' · ')}</p><small>Durée de lecture indicative, calculée à 180 mots/minute. Prenez le temps de refaire les exemples.</small></aside>}
   <CourseDiagram key={'diagram-'+course.id} courseId={course.id}/>
   {selectedPassage&&<aside className="flash-selection-action"><span>{selectedPassage.slice(0,120)}{selectedPassage.length>120?'…':''}</span><button className="study-secondary" onClick={()=>setGeneration({kind:'catalog',title:'Passage sélectionné',text:selectedPassage,courseId:course.id,subject:course.category,chapter:course.title,locator:{route:`#tab=cours&cours=${course.id}`}})}>Ajouter aux flashcards</button></aside>}
   {course.sections.map((s,i)=>{const id=sectionSlug(s.title,i);return <section id={'section-'+id} className="course-section" key={s.title}><span className="section-number">{String(i+1).padStart(2,'0')}</span><div><div className="course-section-title"><h2>{s.title}</h2><button className="study-text-link" onClick={()=>setGeneration({kind:'catalog',title:s.title,text:[s.text,...(s.bullets||[])].join(' '),courseId:course.id,sectionId:id,subject:course.category,chapter:course.title,locator:{route:`#tab=cours&cours=${course.id}&section=${id}`}})}>+ Flashcards</button></div>{s.text.split('\n\n').map((paragraph,j)=><p key={j}>{paragraph}</p>)}{s.bullets&&<ul>{s.bullets.map(t=><li key={t}>{t}</li>)}</ul>}</div></section>})}
   {course.learning&&<section className="course-learning-tools" aria-label="Outils de raisonnement du cours">
    <div className="course-formula"><span className="study-eyebrow">RELATION À SAVOIR UTILISER</span><h2>{course.learning.formula.label}</h2><strong>{course.learning.formula.expression}</strong><p>{course.learning.formula.explanation}</p></div>
    <div className="course-comparison"><span className="study-eyebrow">TABLEAU COMPARATIF</span><div className="course-table-scroll"><table><thead><tr>{course.learning.comparison.headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{course.learning.comparison.rows.map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></div>
    <div className="course-worked-example"><span className="study-eyebrow">EXEMPLE RÉSOLU</span><h2>{course.learning.example.prompt}</h2><ol>{course.learning.example.steps.map(step=><li key={step}>{step}</li>)}</ol><p><strong>Conclusion :</strong> {course.learning.example.result}</p></div>
    <div className="course-common-errors"><span className="study-eyebrow">ERREURS CLASSIQUES</span>{course.learning.errors.map(error=><article key={error.title}><h3>{error.title}</h3><p>{error.detail}</p></article>)}</div>
   </section>}
   {(course.flow||course.id==='FMA7088')&&<figure className="course-flow"><figcaption>Le mécanisme en un regard</figcaption><ol>{(course.flow||['Corps','Cœur droit','Poumons','Cœur gauche','Corps']).map((step,i)=><li key={i}><span>{i+1}</span>{step}</li>)}</ol></figure>}
   {course.glossary&&<section className="course-glossary"><h2>Les mots à maîtriser</h2><dl>{course.glossary.map(([term,definition])=><div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></section>}
   <aside className="exam-trap"><Bookmark size={21}/><div><h2>Le point à ne pas confondre</h2><p>{course.trap}</p></div></aside>
   {course.caseStudy&&<section className="course-case"><span className="study-eyebrow">PASSER DE LA NOTION AU RAISONNEMENT</span><h2>À vous de l’expliquer.</h2><p>{course.caseStudy.prompt}</p><details key={course.id}><summary>Comparer avec le raisonnement corrigé</summary><p>{course.caseStudy.answer}</p></details></section>}
   <section className="active-recall"><div className="study-eyebrow">RAPPEL ACTIF</div><h2>Fermez le cours. Retrouvez l’idée.</h2><p>{course.recall}</p><button className="study-secondary" aria-expanded={reveal} onClick={()=>setReveal(v=>!v)}>{reveal?'Masquer la réponse':'Vérifier ma réponse'}</button>{reveal&&<p className="recall-answer">{course.answer}</p>}</section>
   {lessons.find(l=>l.id===course.id)?.diseases.length?<section className="course-pathologies"><h2>Ouverture clinique</h2><p>À aborder après les bases. Ces repères ne constituent pas un avis médical.</p><div className="pathology-pills">{lessons.find(l=>l.id===course.id)!.diseases.map(id=><button key={id} onClick={()=>setPathology(pathology===id?null:id)} aria-expanded={pathology===id}>{diseases.find(d=>d.id===id)?.name}</button>)}</div>{disease&&<div className="disease-reading"><h3>{disease.name}</h3>{Object.entries(disease.sections).map(([k,v])=><section key={k}><h4>{k}</h4><p>{v}</p></section>)}<a href={disease.source} target="_blank" rel="noreferrer">Consulter la source médicale ↗</a></div>}</section>:null}
   <FeedbackForm course={course}/>
   <Notebook key={course.id} courseId={course.id} title={course.title}/>
   <footer className="course-source"><h2>Pour vérifier et approfondir</h2>{(course.sources||[{label:'Source pédagogique du cours',url:course.source}]).map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a>)}<p>Synthèse pédagogique en français. Complétez-la avec les supports et les attendus de votre faculté.</p></footer>
   <div className="course-completion"><button className="study-secondary" onClick={()=>p.complete(course.id)} disabled={p.completed.includes(course.id)}><CheckCircle2 size={17}/>{p.completed.includes(course.id)?'Cours terminé':'Marquer ce cours terminé'}</button><button className="study-primary" onClick={()=>p.practice(course.id)}>M’entraîner sur ce cours<ArrowRight size={17}/></button></div>
   {nextCourse&&<button className="next-chapter" onClick={()=>p.navigate(nextCourse.id)}><span>CHAPITRE SUIVANT · {course.category.toLocaleUpperCase('fr')}<strong>{nextCourse.title}</strong></span><ArrowRight size={21}/></button>}
  </article><aside className="reading-sidebar"><span className="study-eyebrow">DANS CE COURS · {progress}% LU</span>{course.sections.map((s,i)=>{const id=sectionSlug(s.title,i);return <a key={s.title} href={'#section-'+id} onClick={e=>{e.preventDefault();document.getElementById('section-'+id)?.scrollIntoView({behavior:'smooth',block:'start'})}}><span>{String(i+1).padStart(2,'0')}</span>{s.title}</a>})}{course.structure&&<button className="anatomy-link" onClick={()=>p.explore(course.structure!)}><Box size={27}/><strong>Donnez du relief au cours.</strong><span>Explorer un repère du chapitre dans l’atlas 3D</span><ArrowRight size={19}/></button>}<button className="study-secondary sidebar-practice" onClick={()=>p.practice(course.id)}>Tester ce chapitre · {questionCount(course.id)} questions<ArrowRight size={15}/></button><div className="study-note">Lire → reformuler → résoudre.<br/>Le défilement mesure la lecture, pas l’acquisition.</div></aside></div>
 </>:routeResolution.kind==='canonical'?<CanonicalPlaceholderView course={routeResolution.course} completed={p.completed} saved={saved} toggleSave={toggleSave} returnToLibrary={returnToLibrary} navigate={p.navigate} practice={p.practice}/>:<>
  <CourseLibrary subjectId={category} group={group} query={query} filter={filter} saved={saved} completed={p.completed} browse={browse} search={setQuery} setFilter={setFilter} open={p.navigate}/>
 </>}
 {generation&&<GenerationDialog source={generation} onClose={()=>setGeneration(null)} onSaved={info=>info&&setToast(`${info.count} carte${info.count>1?'s':''} enregistrée${info.count>1?'s':''} dans le deck « ${info.deckName} »`)}/>}
 {toast&&<div className="flash-toast" role="status"><Check size={16}/><span>{toast}</span></div>}</section>
}

