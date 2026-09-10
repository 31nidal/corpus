import {storageScope,useAccount} from '../account/store'
import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,Box,Bookmark,GraduationCap,PenLine} from 'lucide-react'
import {courses,type Course} from './curriculum'
import {questions} from './questions'
import CourseDiagram from './CourseDiagram'
import CourseLibrary from './CourseLibrary'
import {subjectFor} from './subjects'
import diseases from '../data/diseases.json'
import {lessons} from '../learning'

function readSaved():string[]{try{const v=JSON.parse(storageScope().getItem('corpus-saved-courses')||'[]');return Array.isArray(v)?v.filter(id=>courses.some(c=>c.id===id)):[]}catch{return []}}
function Notebook({course}:{course:Course}){
 const [accountStorage]=useState(storageScope),account=useAccount()
 const key='corpus-note-'+course.id
 const [note,setNote]=useState(()=>{try{return accountStorage.getItem(key)||''}catch{return ''}}),[notice,setNotice]=useState('Enregistrées sur cet appareil uniquement.')
 return <section className="course-notebook"><h2><PenLine size={19}/>Mon carnet de cours</h2><p>Reformulez une notion, notez votre erreur ou une question à poser en cours.</p><textarea aria-label="Mes notes de cours" maxLength={8000} value={note} placeholder="Ce que je veux retenir…" onChange={e=>{setNote(e.target.value);try{accountStorage.setItem(key,e.target.value);setNotice('Notes enregistrées sur cet appareil.')}catch{setNotice('Enregistrement indisponible : copiez vos notes avant de quitter.')}}}/><small role="status">{account.user?account.status:notice}</small></section>
}
export default function CoursesWorkspace(p:{initial:string|null;completed:string[];complete:(id:string)=>void;explore:(id:string)=>void;practice:(id:string)=>void;navigate:(id:string|null)=>void}){
 const [accountStorage]=useState(storageScope)
 const [query,setQuery]=useState(''),[category,setCategory]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('matiere')??''),[group,setGroup]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('module')??''),[filter,setFilter]=useState('all'),[saved,setSaved]=useState(readSaved),[reveal,setReveal]=useState(false),[pathology,setPathology]=useState<string|null>(null),[progress,setProgress]=useState(0)
 const workspace=useRef<HTMLElement>(null),course=courses.find(c=>c.id===p.initial)
 useEffect(()=>{setReveal(false);setPathology(null);setProgress(0);workspace.current?.scrollTo(0,0)},[p.initial])
 const browse=(subject:string,module='')=>{setCategory(subject);setGroup(module);const params=new URLSearchParams(location.hash.slice(1));if(subject)params.set('matiere',subject);else params.delete('matiere');if(module)params.set('module',module);else params.delete('module');history.pushState(null,'','#'+params.toString());workspace.current?.scrollTo(0,0)}
 useEffect(()=>{const sync=()=>{const params=new URLSearchParams(location.hash.slice(1));setCategory(params.get('matiere')??'');setGroup(params.get('module')??'')};window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync)}},[])
 const disease=diseases.find(d=>d.id===pathology),siblings=course?courses.filter(c=>c.category===course.category):[],nextCourse=course?siblings[siblings.indexOf(course)+1]:null
 const returnToLibrary=(subject='')=>{setQuery('');setFilter('all');browse(subject);p.navigate(null)}
 const toggleSave=(id:string)=>{const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];setSaved(next);try{accountStorage.setItem('corpus-saved-courses',JSON.stringify(next))}catch{/* optional */}}
 const questionCount=(id:string)=>questions.filter(q=>q.course===id).length
 return <section ref={workspace} onScroll={e=>{const el=e.currentTarget;setProgress(Math.round(el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight)*100))}} className="study-workspace courses-workspace" aria-label="Cours de première année">
 {course?<>
  <div className="reading-progress"><span style={{width:progress+'%'}}/></div>
  <div className="study-breadcrumb"><button onClick={()=>returnToLibrary()}><ArrowLeft size={16}/>Tous les cours</button><span>/</span><button onClick={()=>returnToLibrary(subjectFor(course).id)}>{course.category}</button><span>/</span><span>{course.tag}</span><button className="bookmark-course" aria-pressed={saved.includes(course.id)} onClick={()=>toggleSave(course.id)}><Bookmark size={15}/>{saved.includes(course.id)?'Enregistré':'Garder pour plus tard'}</button></div>
  <div className="reading-layout"><article className="course-article">
   <div className="study-eyebrow">{course.category} · {course.caseStudy?'COURS & APPLICATIONS':'REPÈRES ANATOMIQUES'}</div><h1>{course.title}</h1>
   <div className="course-meta"><span><BookOpen size={14}/>{course.minutes} min avec exercices</span><span><GraduationCap size={15}/>Première année</span><span>{questionCount(course.id)} questions associées</span>{p.completed.includes(course.id)&&<span><CheckCircle2 size={15}/>Terminé</span>}</div>
   <div className="objectives"><h2>À la fin de ce cours</h2>{course.objectives.map(o=><p key={o}><Check size={16}/>{o}</p>)}</div>
   <CourseDiagram key={'diagram-'+course.id} courseId={course.id}/>
   {course.sections.map((s,i)=><section id={'section-'+i} className="course-section" key={s.title}><span className="section-number">{String(i+1).padStart(2,'0')}</span><div><h2>{s.title}</h2>{s.text.split('\n\n').map((paragraph,j)=><p key={j}>{paragraph}</p>)}{s.bullets&&<ul>{s.bullets.map(t=><li key={t}>{t}</li>)}</ul>}</div></section>)}
   {(course.flow||course.id==='FMA7088')&&<figure className="course-flow"><figcaption>Le mécanisme en un regard</figcaption><ol>{(course.flow||['Corps','Cœur droit','Poumons','Cœur gauche','Corps']).map((step,i)=><li key={i}><span>{i+1}</span>{step}</li>)}</ol></figure>}
   {course.glossary&&<section className="course-glossary"><h2>Les mots à maîtriser</h2><dl>{course.glossary.map(([term,definition])=><div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></section>}
   <aside className="exam-trap"><Bookmark size={21}/><div><h2>Le point à ne pas confondre</h2><p>{course.trap}</p></div></aside>
   {course.caseStudy&&<section className="course-case"><span className="study-eyebrow">PASSER DE LA NOTION AU RAISONNEMENT</span><h2>À vous de l’expliquer.</h2><p>{course.caseStudy.prompt}</p><details key={course.id}><summary>Comparer avec le raisonnement corrigé</summary><p>{course.caseStudy.answer}</p></details></section>}
   <section className="active-recall"><div className="study-eyebrow">RAPPEL ACTIF</div><h2>Fermez le cours. Retrouvez l’idée.</h2><p>{course.recall}</p><button className="study-secondary" aria-expanded={reveal} onClick={()=>setReveal(v=>!v)}>{reveal?'Masquer la réponse':'Vérifier ma réponse'}</button>{reveal&&<p className="recall-answer">{course.answer}</p>}</section>
   {lessons.find(l=>l.id===course.id)?.diseases.length?<section className="course-pathologies"><h2>Ouverture clinique</h2><p>À aborder après les bases. Ces repères ne constituent pas un avis médical.</p><div className="pathology-pills">{lessons.find(l=>l.id===course.id)!.diseases.map(id=><button key={id} onClick={()=>setPathology(pathology===id?null:id)} aria-expanded={pathology===id}>{diseases.find(d=>d.id===id)?.name}</button>)}</div>{disease&&<div className="disease-reading"><h3>{disease.name}</h3>{Object.entries(disease.sections).map(([k,v])=><section key={k}><h4>{k}</h4><p>{v}</p></section>)}<a href={disease.source} target="_blank" rel="noreferrer">Consulter la source médicale ↗</a></div>}</section>:null}
   <Notebook key={course.id} course={course}/>
   <footer className="course-source"><h2>Pour vérifier et approfondir</h2>{(course.sources||[{label:'Source pédagogique du cours',url:course.source}]).map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a>)}<p>Synthèse pédagogique en français. Complétez-la avec les supports et les attendus de votre faculté.</p></footer>
   <div className="course-completion"><button className="study-secondary" onClick={()=>p.complete(course.id)} disabled={p.completed.includes(course.id)}><CheckCircle2 size={17}/>{p.completed.includes(course.id)?'Cours terminé':'Marquer ce cours terminé'}</button><button className="study-primary" onClick={()=>p.practice(course.id)}>M’entraîner sur ce cours<ArrowRight size={17}/></button></div>
   {nextCourse&&<button className="next-chapter" onClick={()=>p.navigate(nextCourse.id)}><span>CHAPITRE SUIVANT · {course.category.toLocaleUpperCase('fr')}<strong>{nextCourse.title}</strong></span><ArrowRight size={21}/></button>}
  </article><aside className="reading-sidebar"><span className="study-eyebrow">DANS CE COURS · {progress}% LU</span>{course.sections.map((s,i)=><a key={s.title} href={'#section-'+i} onClick={e=>{e.preventDefault();document.getElementById('section-'+i)?.scrollIntoView({behavior:'smooth',block:'start'})}}><span>{String(i+1).padStart(2,'0')}</span>{s.title}</a>)}{course.structure&&<button className="anatomy-link" onClick={()=>p.explore(course.structure!)}><Box size={27}/><strong>Donnez du relief au cours.</strong><span>Explorer un repère du chapitre dans l’atlas 3D</span><ArrowRight size={19}/></button>}<button className="study-secondary sidebar-practice" onClick={()=>p.practice(course.id)}>Tester ce chapitre · {questionCount(course.id)} questions<ArrowRight size={15}/></button><div className="study-note">Lire → reformuler → résoudre.<br/>Le défilement mesure la lecture, pas l’acquisition.</div></aside></div>
 </>:<>
  <CourseLibrary subjectId={category} group={group} query={query} filter={filter} saved={saved} completed={p.completed} browse={browse} search={setQuery} setFilter={setFilter} open={p.navigate}/>

 </>}
 </section>
}
