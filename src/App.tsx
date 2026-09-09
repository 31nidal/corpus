import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Box, GraduationCap, ArrowLeft, ArrowRight, ArrowUpRight, Bone, Copy, SlidersHorizontal, Moon, Sun, ChevronDown, CircleHelp, Eye, Heart, Layers3, Minus, MoveUpRight, Plus, Rotate3D, RotateCcw, Search, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react'
import {breastMeshIds} from './data/female-regions'
import ChatAssistant from './ChatAssistant'
import CoursesWorkspace from './study/CoursesWorkspace'
import PracticeWorkspace from './study/PracticeWorkspace'
import {courses} from './study/curriculum'
import {lessonFor,profileFor,type LearningLevel} from './learning'
import {systems} from './systems'
import {animationRegistry,type AnimationState} from './animations'
import {validateAction,type SceneAction} from '../shared/actions.mjs'
import ExplorerTools from './ExplorerTools'
import QuizPanel, {initialQuiz, type QuizState} from './QuizPanel'
import {quizQuestions} from './data/quiz'
import {decodeView, encodeView, roundedPose, defaultOpacity, defaultCut} from './viewState'
import AnatomyViewer from './AnatomyViewer'
import { describeStructure } from './data/anatomy'
import type { CameraPose, LabelMode, SharedView, GroupId, LoadState, Manifest, ViewerApi, Visibility } from './types'

const initialVisibility: Visibility = { skin: true, skeleton: true, organs: true, muscles: false, arteries: false, veins: false, nerves: false, joints: false }
const groupMeta = {
  skin: { name: 'Enveloppe corporelle', subtitle: 'Le contour du corps', icon: UserRound, color: '#76d7cc' },
  skeleton: { name: 'Squelette', subtitle: 'L’architecture intérieure', icon: Bone, color: '#d9d5bd' },
  organs: { name: 'Organes', subtitle: 'Au cœur du vivant', icon: Heart, color: '#db938c' },
  arteries: { name: 'Artères', subtitle: 'Le réseau artériel', icon: Heart, color: '#cf5b61' },
  veins: { name: 'Veines', subtitle: 'Le retour veineux', icon: Heart, color: '#5785c4' },
  nerves: { name: 'Nerfs', subtitle: 'Les connexions du corps', icon: Sparkles, color: '#bd9639' },
  joints: { name: 'Articulations', subtitle: 'Cartilages et ligaments', icon: Layers3, color: '#91b8bb' },
  muscles: { name: 'Muscles', subtitle: 'Le corps en mouvement', icon: Layers3, color: '#bb756c' },
}
const normalise = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe')

function Brand() {
 return <a className="brand mycorpus-brand" href="./" aria-label="MyCorpus, accueil"><img src={import.meta.env.BASE_URL+'mycorpus-mark.svg'} alt="" width="40" height="40"/><span><span className="brand-my">my</span>corpus<span className="brand-dot">.</span></span></a>
}

const tourSteps = [
  {id:'FMA7309',title:'1. Respirer',prompt:'Isolez le poumon, puis faites-le tourner pour repérer ses différents lobes.'},
  {id:'FMA7088',title:'2. Faire circuler',prompt:'Observez le cœur sous plusieurs angles. Retrouvez ensuite sa position dans le thorax avec « Voir le contexte ».'},
  {id:'FMA7200',title:'3. Se nourrir',prompt:'Suivez les replis de l’intestin grêle. La fiche explique le passage des nutriments vers le sang ou la lymphe.'},
  {id:'FMA50801',title:'4. Coordonner',prompt:'Approchez-vous du cerveau et observez ses reliefs. Faites tourner le modèle pour changer de perspective.'},
  {id:'FMA24474',title:'5. Se tenir debout',prompt:'Isolez le fémur. Comparez ses deux extrémités, puis retrouvez sa place entre la hanche et le genou.'},
]
function readRoute() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  return { id: params.get('structure')??(params.get('body')==='female'?'HRA-region-pelvis':null), detail: params.get('mode') !== 'overview', view:decodeView(params.get('view')) }
}

export default function App() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('corpus-theme') === 'dark' } catch { return false } })
  const [learningOpen,setLearningOpen]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('tab')==='cours')
  const [atlasVisited,setAtlasVisited]=useState(()=>!['cours','entrainement'].includes(new URLSearchParams(location.hash.slice(1)).get('tab')??''))
  const [practiceOpen,setPracticeOpen]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('tab')==='entrainement')
  useEffect(()=>{if(!learningOpen&&!practiceOpen)setAtlasVisited(true)},[learningOpen,practiceOpen])
  const [courseToOpen,setCourseToOpen]=useState<string|null>(()=>new URLSearchParams(location.hash.slice(1)).get('cours'))
  const [practiceCourse,setPracticeCourse]=useState<string|null>(()=>new URLSearchParams(location.hash.slice(1)).get('cours'))
  const currentLesson=courseToOpen??''
  const [level]=useState<LearningLevel>('student')
  const [chatOpen,setChatOpen]=useState(false)
  const [profileOpen,setProfileOpen]=useState(false)
  const [completed,setCompleted]=useState<string[]>(()=>{try{const v=JSON.parse(localStorage.getItem('corpus-completed')||'[]');return Array.isArray(v)?v.filter(x=>courses.some(l=>l.id===x)):[]}catch{return []}})
  const [layerTab,setLayerTab]=useState<'layers'|'systems'>('layers')
  const [activeSystems,setActiveSystems]=useState<string[]>([])
  const [animation,setAnimation]=useState<AnimationState>(null)
  const [opacity,setOpacity] = useState(defaultOpacity)
  const [cut,setCut] = useState(defaultCut)
  const [labels,setLabels] = useState<LabelMode>('off')
  const [cameraRestore,setCameraRestore] = useState<CameraPose|null>(null)
  const [toolsOpen,setToolsOpen] = useState(false)
  const [quiz,setQuiz] = useState<QuizState|null>(null)
  const [guided, setGuided] = useState(false)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101d22' : '#ffffff')
    try { localStorage.setItem('corpus-theme', dark ? 'dark' : 'light') } catch { /* Storage is optional. */ }
  }, [dark])
  const [route, setRoute] = useState(readRoute)
  const [body,setBody]=useState<'male'|'female'>(()=>new URLSearchParams(location.hash.slice(1)).get('body')==='female'?'female':'male')
  const [shareStatus, setShareStatus] = useState('')
  const [routeError, setRouteError] = useState('')
  const [detailMode, setDetailMode] = useState(() => readRoute().detail)
  const [isolated, setIsolated] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogGroup, setCatalogGroup] = useState('all')
  const [catalogLimit, setCatalogLimit] = useState(60)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [manifestError, setManifestError] = useState(false)
  const [load, setLoad] = useState<LoadState>({ progress: 0, ready: [], error: null, complete: false })
  const [visibility, setVisibility] = useState(initialVisibility)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchIndex, setSearchIndex] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [modal, setModal] = useState<'about' | 'help' | null>(null)
  const [layersOpen, setLayersOpen] = useState(false)
  const [orientation, setOrientation] = useState<'front' | 'back'>('front')
  const pendingIsolation = useRef<string | null>(null)
  const apiRef = useRef<ViewerApi | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchBox = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const detailCloseRef = useRef<HTMLButtonElement>(null)

  const writeRoute = (id: string | null, detail = detailMode, reference = body) => {
    setLearningOpen(false);setPracticeOpen(false)
    const url = new URL(window.location.href)
    const params = new URLSearchParams()
    if (id) params.set('structure', id)
    if(reference==='female')params.set('body','female')
    if (!detail) params.set('mode', 'overview')
    url.hash = params.toString()
    if (url.href !== window.location.href) window.history.pushState(null, '', url)
    setCameraRestore(null); setRoute({id, detail, view:null}); setShareStatus('')
  }
  const openFemaleRegion=(id:string)=>{setBody('female');setDetailMode(true);setGuided(false);setQuiz(null);setAnimation(null);setCut(defaultCut);setOpacity(defaultOpacity);setVisibility(initialVisibility);setActiveSystems([]);setHiddenIds([]);setLabels('off');setCatalogOpen(false);setHover(null);pendingIsolation.current=id;writeRoute(id,true,'female')}
  const changeBody=(next:'male'|'female')=>{setBody(next);setDetailMode(true);setGuided(false);setQuiz(null);setAnimation(null);setCut(defaultCut);setOpacity(defaultOpacity);setVisibility(initialVisibility);setActiveSystems([]);setLabels('off');setCatalogOpen(false);setHover(null);writeRoute(null,true,next)}
  const changeMode = (detail: boolean) => { setGuided(false); setDetailMode(detail); writeRoute(null, detail) }
  useEffect(() => {
    const restore = () => { const params=new URLSearchParams(location.hash.slice(1));setBody(params.get('body')==='female'?'female':'male');setLearningOpen(params.get('tab')==='cours');setPracticeOpen(params.get('tab')==='entrainement');setPracticeCourse(params.get('tab')==='entrainement'?params.get('cours'):null);setCourseToOpen(params.get('cours')); const next = readRoute(); setRoute(next); setDetailMode(next.detail); setShareStatus('') }
    window.addEventListener('popstate', restore)
    window.addEventListener('hashchange', restore)
    return () => { window.removeEventListener('popstate', restore); window.removeEventListener('hashchange', restore) }
  }, [])
  useEffect(() => {
    if (!manifest || route.detail !== detailMode) return
    const structure = manifest.structures.find(s => s.id === route.id)
    setRouteError(route.id && !structure ? 'Cette structure est introuvable dans cet atlas. Vous pouvez poursuivre avec la recherche.' : '')
    setSelectedId(structure?.id ?? null); setIsolated(route.view?.isolated ?? ((pendingIsolation.current !== null && pendingIsolation.current === structure?.id) || (body==='female' && Boolean(structure?.id.startsWith('HRA-region-'))))); pendingIsolation.current=null; setHover(null)
    if(route.view){
      setOpacity(route.view.opacity);setCut(route.view.cut);setLabels(route.view.labels);setDark(route.view.dark)
      setHiddenIds(route.view.hidden.filter(id=>manifest.structures.some(s=>s.id===id)))
      setVisibility(route.view.visibility);setCameraRestore(route.view.camera)
    }
    if (!structure && !route.view) setResetKey(k => k + 1)
    if (structure && !route.view) {
      setVisibility(v => ({...v, ...Object.fromEntries((structure.groups ?? [structure.group]).map(g => [g,true]))}))
      setHiddenIds(ids => ids.filter(id => !manifest.structures.find(s=>s.id===id)?.meshNames.some(name=>structure.meshNames.includes(name)))); setCatalogOpen(false)
    }
  }, [route, manifest, detailMode])
  const captureView = (): SharedView | null => {
    const camera=apiRef.current?.capture()
    return camera ? {version:1,camera:roundedPose(camera),visibility,opacity,cut,isolated,hidden:hiddenIds,labels,dark} : null
  }
  const share = async () => {
    const view=captureView()
    if(!view)return
    const url=new URL(window.location.href),params=new URLSearchParams()
    if(selectedId)params.set('structure',selectedId)
    if(!detailMode)params.set('mode','overview')
    if(body==='female')params.set('body','female')
    params.set('view',encodeView(view));url.hash=params.toString();window.history.replaceState(null,'',url)
    try { await navigator.clipboard.writeText(url.href); setShareStatus('Lien copié !') }
    catch { setShareStatus('Copiez le lien ci-dessous :') }
  }

  useEffect(() => {
    const controller = new AbortController()
    setManifest(null); setSelectedId(null); setHiddenIds([]); setIsolated(false); setManifestError(false)
    setLoad({progress:0,ready:[],error:null,complete:false})
    fetch(`${import.meta.env.BASE_URL}models/${body==='female'?'female-regions/manifest.json':detailMode ? 'manifest.json' : 'overview.json'}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('manifest'); return response.json() })
      .then((data: Manifest) => { if (!data.groups?.length || !data.structures?.length) throw new Error('manifest'); setManifest(data) })
      .catch(error => { if (error.name !== 'AbortError') setManifestError(true) })
    return () => controller.abort()
  }, [detailMode,body])

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') { event.preventDefault(); searchRef.current?.focus() }
      if (event.key === 'Escape') { setSearchOpen(false); setLayersOpen(false) }
    }
    function outside(event: PointerEvent) { if (!searchBox.current?.contains(event.target as Node)) setSearchOpen(false) }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside) }
  }, [])

  useEffect(() => {
    if (modal) { previousFocus.current = document.activeElement as HTMLElement; dialogRef.current?.showModal() }
    else if (dialogRef.current?.open) { dialogRef.current.close(); previousFocus.current?.focus() }
  }, [modal])

  const isLoaded = learningOpen || practiceOpen || Boolean(manifest && load.complete && (load.error || manifest.groups.every(g => !visibility[g.id] || load.ready.includes(g.id))))
  const structures = manifest?.structures ?? []
  const selected = structures.find(s => s.id === selectedId)
  const description = selected ? describeStructure(selected.name, selected.group) : null
  const hovered = structures.find(s => s.id === hover?.id)
  const filtered = structures.filter(s => {
    const d = describeStructure(s.name, s.group)
    return normalise([d.name, d.system, ...d.keywords].join(' ')).includes(normalise(query.trim()))
  }).sort((a,b) => Number(Boolean(b.aggregate)) - Number(Boolean(a.aggregate))).slice(0, query ? 35 : 8)

  const selectStructure = useCallback((id: string) => {
    setAnimation(null)
    if(quiz?.answered || quiz?.done)return
    if(quiz){
      const question=quizQuestions[quiz.index],target=manifest?.structures.find(s=>s.id===question.id),picked=manifest?.structures.find(s=>s.id===id)
      const correct=id===question.id || Boolean(target && picked && picked.meshNames.some(name=>target.meshNames.includes(name)))
      setQuiz({...quiz,attempts:quiz.attempts+1,answered:correct,score:quiz.score+(correct&&!quiz.helped&&quiz.attempts===0?1:0),feedback:correct?'Exact ! Vous avez trouvé la bonne structure.':'Pas encore. Observez sa position et essayez à nouveau.'})
      if(correct){setSelectedId(question.id);setIsolated(true)}
      return
    }
    setGuided(false)
    const structure = manifest?.structures.find(s => s.id === id)
    if (!structure) return
    setVisibility(v => ({ ...v, ...Object.fromEntries((structure.groups ?? [structure.group]).map(g => [g, true])) }))
    setHiddenIds(ids => ids.filter(hidden => !manifest?.structures.find(s=>s.id===hidden)?.meshNames.some(name=>structure.meshNames.includes(name))));
    setOpacity(o=>({...o,...Object.fromEntries((structure.groups??[structure.group]).filter(g=>o[g]===0).map(g=>[g,defaultOpacity[g]]))})); setCatalogOpen(false)
    writeRoute(id); setSelectedId(id); setSearchOpen(false); setQuery(''); setHover(null); setLayersOpen(false)
  }, [manifest, detailMode, quiz,body])
  const applyPreset = (groups: GroupId[]) => {
    setAnimation(null);setActiveSystems([]);setGuided(false);setOpacity(defaultOpacity);setCut(defaultCut)
    setVisibility(Object.fromEntries(Object.keys(initialVisibility).map(id => [id, groups.includes(id as GroupId)])) as Visibility)
    setHiddenIds([]); setIsolated(false); setSelectedId(null); setLayersOpen(false)
    setResetKey(k => k + 1); setOrientation('front'); writeRoute(null)
  }
  const reset = () => { if(body==='female'){openFemaleRegion('HRA-region-pelvis');return}  setAnimation(null);setCameraRestore(null);setCut(defaultCut); setGuided(false); setSelectedId(null); setIsolated(false); setHover(null); setResetKey(k => k + 1); setOrientation('front'); writeRoute(null) }
  const toggleGroup = (id: GroupId) => {
    if(activeSystems.length){setActiveSystems([]);setHiddenIds([])}
    setVisibility(v => ({ ...v, [id]: !v[id] }))
    if (selected?.group === id && visibility[id]) { setSelectedId(null); setResetKey(k => k + 1);writeRoute(null) }
  }
  const onLoad = useCallback((state: LoadState) => setLoad(state), [])
  const nextStructure = (direction: number) => {
    if (!selected) return
    const siblings = structures.filter(s => s.group === selected.group)
    selectStructure(siblings[(siblings.findIndex(s => s.id === selectedId) + direction + siblings.length) % siblings.length].id)
  }
  const quickFind = (term: string) => structures.find(s => s.id === ({'Cœur':'FMA7088','Cerveau':'FMA50801','Poumon':'FMA7309'} as Record<string,string>)[term])
  const hiddenMeshes = new Set(hiddenIds.flatMap(id => structures.find(s => s.id === id)?.meshNames ?? []))
  const visibleCount = structures.filter(s => !s.aggregate && (!s.detailOnly || (selectedId===s.id&&!selected?.aggregate)) && visibility[s.group] && opacity[s.group]>0 && load.ready.includes(s.group) && s.meshNames.some(name => !hiddenMeshes.has(name) && (!isolated || !selected || selected.meshNames.includes(name)))).length
  const catalog = structures.filter(s => catalogGroup === 'all' || s.group === catalogGroup)
  const setAllLayers = (on: boolean) => {setActiveSystems([]);if(on)setOpacity(defaultOpacity);setGuided(false);setVisibility(Object.fromEntries(Object.keys(initialVisibility).map(id => [id,on])) as Visibility);setHiddenIds([]);setIsolated(false);setSelectedId(null);writeRoute(null)}

  const tourIndex = tourSteps.findIndex(step => step.id === selectedId)
  const activeTour = guided && tourIndex >= 0
  const visitStep = (index: number) => {
    setGuided(true); setDetailMode(true); setIsolated(false); setVisibility(initialVisibility)
    setHiddenIds([]); setCatalogOpen(false); setLayersOpen(false)
    setBody('male');writeRoute(tourSteps[index].id, true,'male')
  }
  const prepareQuestion = (index:number) => {
    setBody('male');setDetailMode(true);setCameraRestore(null);writeRoute(null,true,'male');setGuided(false);setSelectedId(null);setIsolated(false);setHiddenIds([])
    setOpacity(defaultOpacity);setCut(defaultCut);setLabels('revision');setToolsOpen(false);setCatalogOpen(false)
    setVisibility(Object.fromEntries(Object.keys(initialVisibility).map(id=>[id,(quizQuestions[index].groups as readonly string[]).includes(id)])) as Visibility)
    setResetKey(k=>k+1);setSearchOpen(false);setQuery('')
  }
  const startQuiz = () => {setChatOpen(false);setLearningOpen(false);setProfileOpen(false);setAnimation(null);setQuiz(initialQuiz);prepareQuestion(0)}
  const endQuiz = () => {setQuiz(null);setLabels('off');reset();setVisibility(initialVisibility)}
  const nextQuestion = () => {
    if(!quiz)return
    const results=[...quiz.results,{id:quizQuestions[quiz.index].id,earned:quiz.attempts===1&&!quiz.helped}]
    if(quiz.index===quizQuestions.length-1){setQuiz({...quiz,done:true,results});return}
    const next=quiz.index+1;setQuiz({...initialQuiz,index:next,score:quiz.score,results});prepareQuestion(next)
  }
  const availableSystems=systems.filter(system=>structures.some(s=>!s.aggregate&&system.match(s)))
  const applySystems=(next:string[])=>{
    setActiveSystems(next);setAnimation(null);setSelectedId(null);setIsolated(false);writeRoute(null)
    const members=structures.filter(s=>!s.aggregate&&next.some(id=>systems.find(x=>x.id===id)?.match(s)))
    setHiddenIds(structures.filter(s=>!s.aggregate&&s.group!=='skin'&&!members.includes(s)).map(s=>s.id))
    setVisibility(Object.fromEntries(Object.keys(initialVisibility).map(id=>[id,id==='skin'||members.some(s=>s.group===id)])) as Visibility)
    setOpacity(defaultOpacity);setCut(defaultCut);setCameraRestore(null);setResetKey(k=>k+1)
  }
  const openStudy=(tab:'cours'|'entrainement',id:string|null=null)=>{setAnimation(null);setChatOpen(false);setLearningOpen(tab==='cours');setPracticeOpen(tab==='entrainement');setCourseToOpen(id);setPracticeCourse(tab==='entrainement'?id:null);setToolsOpen(false);setProfileOpen(false);setQuiz(null);setCatalogOpen(false);const params=new URLSearchParams(location.hash.slice(1));params.delete('view');params.set('tab',tab);if(id)params.set('cours',id);else params.delete('cours');history.pushState(null,'','#'+params.toString())}
  const femaleCourse=selected?.meshNames.some(n=>breastMeshIds.includes(n))?'anat-breast':'anat-female-pelvis'
  const openLearning=()=>openStudy('cours',body==='female'?femaleCourse:lessonFor(selected)?.id??null)
  const openPractice=()=>openStudy('entrainement',body==='female'?femaleCourse:null)
  const completeCourse=(id:string)=>{const next=[...new Set([...completed,id])];setCompleted(next);try{localStorage.setItem('corpus-completed',JSON.stringify(next))}catch{}}
  const executeAction=(raw:SceneAction)=>{
    const action=validateAction(raw,structures.map(s=>s.id),availableSystems.map(s=>s.id),animationRegistry.map(a=>a.id))
    if(!action)return
    setQuiz(null)
    if(action.action==='reset_camera'){reset();return}
    if(action.action==='show_system'||action.action==='hide_system'){
      if(action.action==='show_system'){applySystems([...new Set([...activeSystems,action.system])])}
      else if(activeSystems.length){applySystems(activeSystems.filter(id=>id!==action.system))}
      else {const system=systems.find(s=>s.id===action.system);setHiddenIds(ids=>[...new Set([...ids,...structures.filter(s=>!s.aggregate&&system?.match(s)).map(s=>s.id)])])}
      return
    }
    if(action.action==='start_animation'){
      const descriptor=animationRegistry.find(a=>a.id===action.animation)
      if(descriptor){selectStructure(descriptor.targets[0]);setAnimation({id:descriptor.id,playing:true})}return
    }
    if('structure' in action){
      const target=structures.find(s=>s.id===action.structure);if(!target)return
      if(action.action==='hide_structure'){setHiddenIds(ids=>[...new Set([...ids,target.id])]);if(selectedId===target.id){setSelectedId(null);writeRoute(null)};return}
      if(action.action==='isolate_structure')pendingIsolation.current=target.id
      selectStructure(target.id)
    }
  }
  const detailedProfile=selected?profileFor(selected):null
  const selectedAnimation=animationRegistry.find(a=>a.targets.some(id=>id===selectedId))
  return <main className="experience" data-body={body} data-workspace={learningOpen?'courses':practiceOpen?'practice':'atlas'} data-chat={chatOpen} data-selected={selectedId ?? ''} data-loaded={isLoaded}>
    <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="world-grid" />
    <header className="topbar">
      <Brand />
      <nav aria-label="Navigation principale"><button className={!learningOpen&&!practiceOpen?"nav-active":""} onClick={()=>{setChatOpen(false);setLearningOpen(false);setPracticeOpen(false);setToolsOpen(false);setQuiz(null);setProfileOpen(false);writeRoute(selectedId)}}><Box size={15}/>Atlas 3D</button><button onClick={()=>openStudy('cours')} aria-pressed={learningOpen}><BookOpen size={15}/>Cours</button><button onClick={openPractice} aria-pressed={practiceOpen||Boolean(quiz)}><GraduationCap size={16}/>Entraînement</button><button onClick={()=>{setChatOpen(false);setProfileOpen(v=>!v);setLearningOpen(false);setPracticeOpen(false);setToolsOpen(false);setQuiz(null);setCatalogOpen(false)}}>Ma progression</button></nav>
      <button className="theme-toggle" aria-label={dark ? 'Activer le thème clair' : 'Activer le thème sombre'} title={dark ? 'Thème clair' : 'Thème sombre'} onClick={()=>setDark(v=>!v)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
      <div className="search-wrap" ref={searchBox}>
        <div className={`search-input ${searchOpen ? 'is-open' : ''}`}>
          <Search size={17} /><input ref={searchRef} disabled={Boolean(quiz)} value={query} onChange={e => { setQuery(e.target.value); setSearchIndex(0); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} placeholder="Rechercher une structure…" aria-label="Rechercher une structure" role="combobox" aria-expanded={searchOpen} aria-controls="search-results" aria-autocomplete="list" aria-activedescendant={searchOpen && filtered[searchIndex] ? `result-${filtered[searchIndex].id}` : undefined} onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIndex(i => Math.min(i + 1, filtered.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIndex(i => Math.max(i - 1, 0)) }
            if (e.key === 'Enter' && filtered[searchIndex]) { e.preventDefault(); selectStructure(filtered[searchIndex].id); searchRef.current?.blur() }
          }} /><kbd>⌘ K</kbd>
          {query && <button className="clear-search" aria-label="Effacer la recherche" onClick={() => { setQuery(''); searchRef.current?.focus() }}><X size={14} /></button>}
        </div>
        {searchOpen && <div className="search-results" id="search-results" role="listbox" aria-label="Structures anatomiques"><p className="eyebrow">{query ? `${filtered.length}${filtered.length === 35 ? '+' : ''} résultats` : 'À explorer'}</p>{filtered.length ? filtered.map((s, index) => <button key={s.id} role="option" aria-selected={index === searchIndex} id={`result-${s.id}`} onPointerMove={() => setSearchIndex(index)} onClick={() => selectStructure(s.id)}><span className="result-dot" style={{ background: groupMeta[s.group].color }} /><span>{describeStructure(s.name, s.group).name}<small>{groupMeta[s.group].name}</small></span><ArrowUpRight size={15} /></button>) : <p className="empty-search">Aucune structure trouvée.<br />Essayez « cœur », « rein » ou « fémur ».</p>}</div>}
      </div>
    </header>

    <div className="atlas-workspace" hidden={learningOpen||practiceOpen}>
    <aside className="intro">
      <div className="edition"><span className="pulse-dot" /> ATLAS ANATOMIQUE <span className="edition-number">ÉDITION 03</span></div>
      <h1>{body==='female'?'Anatomie féminine.':'Le corps humain.'}<br /><em>{body==='female'?'Explorer par région.':'Une autre dimension.'}</em></h1>
      <p className="intro-text">Votre laboratoire d’anatomie personnel.</p>
      {body==='male'?<details className="female-specialty"><summary>Anatomie féminine <ArrowUpRight size={14}/></summary><div className="female-specialty-menu"><p>Trois explorations ciblées sur de vrais modèles féminins.</p>{[{id:'pelvis',name:'Bassin féminin'},{id:'reproductive',name:'Appareil reproducteur'},{id:'breast',name:'Sein et glandes mammaires'}].map(r=><button key={r.id} onClick={()=>openFemaleRegion('HRA-region-'+r.id)}>{r.name}<ArrowRight size={14}/></button>)}</div></details>:<button className="return-main-atlas" onClick={()=>changeBody('male')}><ArrowLeft size={14}/>Revenir au corps entier</button>}
      {body==='male'&&<div className="atlas-mode" aria-label="Niveau de détail"><button title="Structures regroupées pour découvrir les principaux repères" aria-pressed={!detailMode} onClick={() => changeMode(false)}>Vue d’ensemble</button><button title="Structures anatomiques séparées et sélectionnables" aria-pressed={detailMode} onClick={() => changeMode(true)}>Atlas détaillé</button></div>}<p className="mode-explanation">{manifest?structures.filter(s=>!s.aggregate).length.toLocaleString('fr-FR')+(body==='female'?' structures · explorations régionales':' structures · référence masculine'):'Chargement de la référence…'}</p>{body==='female'&&<p className="female-coverage"><span className="coverage-full">Modèles féminins HRA : bassin, appareil reproducteur et sein. Une sélection régionale, sans ajout de maillages masculins.</span><span className="coverage-compact">HRA · explorations féminines régionales</span></p>}<button className="mobile-learn" onClick={()=>openStudy('cours')}>Cours</button><button className="mobile-start-quiz" onClick={openPractice}>Entraînement</button><button className="mobile-profile" onClick={()=>{setChatOpen(false);setProfileOpen(true);setLearningOpen(false);setToolsOpen(false);setQuiz(null)}}>Profil</button><button className="mobile-start-tour" onClick={()=>visitStep(0)}>Visite guidée <ArrowRight size={13}/></button>
    </aside>

    {body==='female'?<div className="view-presets female-region-presets" aria-label="Régions féminines">{[{id:'pelvis',name:'Bassin'},{id:'reproductive',name:'Reproduction'},{id:'breast',name:'Sein'}].map(r=><button key={r.id} aria-pressed={selectedId==='HRA-region-'+r.id} onClick={()=>openFemaleRegion('HRA-region-'+r.id)}>{r.name}</button>)}</div>:<div className="view-presets" aria-label="Vues rapides"><span>Vues rapides</span>{([
      {name:'Organes',groups:['skin','skeleton','organs']},
      {name:'Squelette',groups:['skin','skeleton']},
      ...(detailMode ? [{name:'Muscles',groups:['skin','skeleton','organs','muscles']}] : [])
    ] as {name:string;groups:GroupId[]}[]).map(preset=><button key={preset.name} aria-label={`Vue ${preset.name.toLowerCase()}`} aria-pressed={Object.entries(visibility).every(([id,on])=>on===preset.groups.includes(id as GroupId))} onClick={()=>applyPreset(preset.groups)}>{preset.name}</button>)}<button aria-label="Vue cerveau" aria-pressed={selectedId==='FMA50801'} disabled={!manifest||Boolean(quiz)} onClick={()=>{setCut(defaultCut);executeAction({action:'isolate_structure',structure:'FMA50801'});apiRef.current?.frame('FMA50801')}}>Cerveau</button></div>}
    {body==='female'&&<div className="female-study-links"><button onClick={()=>openStudy('cours',femaleCourse)}><BookOpen size={14}/>Cours de la région</button><button onClick={()=>openStudy('entrainement',femaleCourse)}><GraduationCap size={14}/>Quiz de la région</button></div>}
    {routeError && <div className="route-notice" role="status">{routeError}<button onClick={()=>writeRoute(null)} aria-label="Fermer le message"><X size={16}/></button></div>}
    <section className={`stage ${selected ? 'has-selection' : ''}`} aria-label="Corps humain en trois dimensions">
      <div className="stage-zoom" aria-label="Zoom du modèle"><span>Zoom</span><button aria-label="Réduire le modèle" disabled={!load.ready.length} onClick={()=>apiRef.current?.zoom(-1)}><Minus size={18}/></button><button aria-label="Agrandir le modèle" disabled={!load.ready.length} onClick={()=>apiRef.current?.zoom(1)}><Plus size={18}/></button><button aria-label="Recadrer la structure" disabled={!load.ready.length} onClick={()=>selectedId?apiRef.current?.frame(selectedId):apiRef.current?.reset()}><RotateCcw size={16}/></button></div><div className="stage-orbit orbit-one" /><div className="stage-orbit orbit-two" />
      <div className="stage-axis" /><span className="axis-label axis-top">SUPÉRIEUR</span><span className="axis-label axis-bottom">INFÉRIEUR</span>
      {manifest && atlasVisited && <AnatomyViewer manifest={manifest} visibility={visibility} selectedId={selectedId} resetKey={resetKey} onSelect={selectStructure} onHover={setHover} onLoad={onLoad} apiRef={apiRef} isolated={isolated} hiddenIds={hiddenIds} opacity={opacity} cut={cut} labelPriority={quiz&&!quiz.done?quizQuestions[quiz.index].id:null} labels={quiz ? 'revision' : labels} cameraRestore={cameraRestore} animation={animation} />}
      {(!isLoaded && !load.error && !manifestError) && <div className={`loading-indicator ${load.ready.length ? 'loading-small' : ''}`} role="status"><span className="loading-symbol"><Brand /></span><span>{load.ready.length ? 'Les structures prennent forme' : 'Le vivant se révèle'}</span><div className="progress-track"><div style={{ width: `${load.progress}%` }} /></div><small>CHARGEMENT DES MAILLAGES <span>{Math.round(load.progress)} %</span></small></div>}
      {(load.error || manifestError) && <div className="error-panel" role="alert"><CircleHelp size={24} /><h2>Le modèle n’a pas pu se charger</h2><p>{manifestError ? 'Le catalogue anatomique est indisponible.' : load.error}</p><button onClick={() => window.location.reload()}>Réessayer <RotateCcw size={15} /></button></div>}
      {load.complete && visibleCount === 0 && <div className="empty-model"><Layers3 size={26} /><p>Le corps attend votre regard.</p><button onClick={() => setVisibility(initialVisibility)}>Afficher les structures <Eye size={15} /></button></div>}
      <div className="view-corner"><span className="corner-cross">+</span> {detailMode ? "ATLAS DÉTAILLÉ" : "VUE D’ENSEMBLE"}<br /><span className="coordinate">{orientation === 'front' ? 'VUE ANTÉRIEURE' : 'VUE POSTÉRIEURE'} · POSITION LIBRE</span></div>
    </section>

    <aside className={`layers-panel ${layersOpen ? 'mobile-open' : ''}`} aria-label="Couches anatomiques">
      <button className="mobile-layers-toggle" onClick={() => setLayersOpen(v => !v)} aria-expanded={layersOpen}><Layers3 size={17} /> Couches anatomiques <span>{manifest?.groups.filter(g => visibility[g.id]).length ?? 0}</span><ChevronDown size={15} /></button>
      <div className="layers-content"><div className="layer-tabs"><button aria-pressed={layerTab==='layers'} onClick={()=>setLayerTab('layers')}>Couches</button><button aria-pressed={layerTab==='systems'} onClick={()=>setLayerTab('systems')}>Systèmes</button></div><div className="section-label"><span>COUCHES ANATOMIQUES</span><Layers3 size={14} /></div>
        {layerTab==='systems'&&availableSystems.map(system=><button key={system.id} role="switch" aria-checked={activeSystems.includes(system.id)} aria-label={`Système ${system.name}`} className={`layer-row ${activeSystems.includes(system.id)?'layer-on':''}`} onClick={()=>applySystems(activeSystems.includes(system.id)?activeSystems.filter(id=>id!==system.id):[...activeSystems,system.id])}><span className="layer-text">{system.name}<small>{structures.filter(s=>!s.aggregate&&system.match(s)).length} éléments disponibles</small></span><span className="switch"><span/></span></button>)}{layerTab==='layers'&&manifest?.groups.map(group => { const meta = groupMeta[group.id]; const Icon = meta.icon; return <button className={`layer-row ${visibility[group.id] ? 'layer-on' : ''}`} key={group.id} role="switch" aria-checked={visibility[group.id]} aria-label={meta.name} onClick={() => toggleGroup(group.id)} title={load.ready.includes(group.id) ? "Afficher ou masquer" : "Charger cette couche"}><span className="layer-icon" style={{ color: meta.color }}><Icon size={20} strokeWidth={1.4} /></span><span className="layer-text">{meta.name}<small>{structures.filter(s => s.group === group.id && !s.aggregate).length} structures{visibility[group.id] && !load.ready.includes(group.id) ? " · chargement…" : ""}</small></span><span className="switch"><span /></span></button> })}
        <div className="layer-actions"><button onClick={() => setAllLayers(true)}>Tout afficher</button><button onClick={() => setAllLayers(false)}>Tout masquer</button></div>{hiddenIds.length > 0 && <button className="restore-hidden" onClick={() => setHiddenIds([])}>Rétablir {hiddenIds.length} structure(s) masquée(s)</button>}<p className="layer-note"><span /> {body==='female' ? "Référence féminine HRA : seules les structures disponibles sont proposées." : visibility.muscles ? "Le visage conserve son enveloppe ; les muscles faciaux ne sont pas inclus." : "L’enveloppe est transparente pour révéler l’intérieur."}</p>
      </div>
    </aside>

    {!selected && !catalogOpen && !toolsOpen && !quiz && !learningOpen && !profileOpen && <aside className="discovery"><span className="discovery-index">VOTRE EXPLORATION</span><div className="discovery-line" /><h2>Un point de départ.</h2><p>Choisissez une structure, puis isolez-la pour découvrir ses détails.</p><span className="discovery-arrow"><MoveUpRight size={27} strokeWidth={1} /></span><button className="browse-atlas" onClick={() => setCatalogOpen(true)}>Parcourir l’atlas <ArrowUpRight size={15} /></button><button className="start-tour" onClick={()=>visitStep(0)}>Visite guidée <span>5 étapes</span><ArrowRight size={14}/></button><div className="quick-links">{['Cœur', 'Cerveau', 'Poumon'].map(term => { const s = quickFind(term); return s ? <button key={term} onClick={() => selectStructure(s.id)} disabled={!load.ready.includes(s.group)}>{term === 'Poumon' ? 'Poumons' : term}<ArrowUpRight size={12} /></button> : null })}</div></aside>}

    {catalogOpen && !selected && !toolsOpen && !quiz && !learningOpen && !profileOpen && <aside className="detail-panel catalog-panel" aria-label="Index anatomique"><div className="detail-heading"><span className="eyebrow">INDEX ANATOMIQUE</span><button className="icon-button" aria-label="Fermer l’index" onClick={() => setCatalogOpen(false)}><X size={18}/></button></div><div className="catalog-filter"><select aria-label="Filtrer l’index par système" value={catalogGroup} onChange={e=>{setCatalogGroup(e.target.value);setCatalogLimit(60)}}><option value="all">Tous les systèmes</option>{manifest?.groups.map(g=><option key={g.id} value={g.id}>{groupMeta[g.id].name}</option>)}</select><small>{catalog.length} entrées · utilisez aussi la recherche</small></div><div className="catalog-list">{catalog.slice(0,catalogLimit).map(s=><button key={s.id} onClick={()=>selectStructure(s.id)}><span style={{background:groupMeta[s.group].color}}/><span>{describeStructure(s.name,s.group).name}<small>{s.id}{s.aggregate?' · ensemble':''}</small></span><ArrowUpRight size={12}/></button>)}{catalogLimit<catalog.length&&<button className="catalog-more" onClick={()=>setCatalogLimit(n=>n+60)}>Afficher la suite ({catalog.length-catalogLimit})</button>}</div></aside>}
    {selected && description && !toolsOpen && !quiz && !learningOpen && !profileOpen && <aside className="detail-panel" aria-label={`Fiche : ${description.name}`} data-testid="structure-detail">
      <div className="detail-heading"><span className="eyebrow">{activeTour ? `VISITE GUIDÉE · ${tourIndex+1} / ${tourSteps.length}` : "EXPLORER UNE STRUCTURE"}</span><button ref={detailCloseRef} className="icon-button" aria-label="Fermer la fiche" onClick={reset}><X size={18} /></button></div>
      <div className="detail-content"><div className="detail-category"><span style={{ background: groupMeta[selected.group].color }} />{description.system}</div><h2>{description.name}</h2><p className="original-name">{selected.aggregate ? "Ensemble anatomique" : "Structure anatomique"} · {selected.id}</p><div className="dissection-actions"><button aria-pressed={isolated} onClick={() => setIsolated(v=>!v)}>{isolated ? "Voir le contexte" : "Isoler"}<Eye size={14}/></button><button onClick={() => {setHiddenIds(ids=>[...ids,selected.id]);setSelectedId(null);setIsolated(false);writeRoute(null)}}>Masquer<X size={14}/></button></div><button className="share-structure" onClick={share}><Copy size={14}/> Copier le lien de cette structure</button>{shareStatus && <div className="share-feedback" role="status">{shareStatus}{shareStatus !== 'Lien copié !' && <input aria-label="Lien de la structure" readOnly value={window.location.href} onFocus={e=>e.target.select()}/>}</div>}<>{activeTour && <div className="tour-prompt"><strong>{tourSteps[tourIndex].title}</strong><p>{tourSteps[tourIndex].prompt}</p><progress aria-label="Progression de la visite" max={tourSteps.length} value={tourIndex+1}/></div>}</><p className="detail-role">{description.role}</p><div className="learning-actions"><button className="primary-action" onClick={openLearning}>Apprendre cette structure <ArrowRight size={14}/></button><button className="subtle-action" onClick={()=>openStudy('entrainement',lessonFor(selected)?.id??null)}>Tester mes connaissances</button>{selectedAnimation&&<button className="subtle-action" onClick={()=>setAnimation(animation?null:{id:selectedAnimation.id,playing:true})}>{animation?'Arrêter l’animation':selectedAnimation.name}</button>}{animation&&<p className="tool-note">Déformation illustrative, pas une simulation physiologique.</p>}</div>{detailedProfile&&<div className="profile-facts"><h3>{detailedProfile.kind==='muscle'?'Action, attaches et innervation':'Territoire du réseau'}</h3><dl>{Object.entries(detailedProfile.fields).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="tool-note">{detailedProfile.kind==='muscle'?'Repères du muscle ou de la portion nommée ; les variantes ne sont pas détaillées.':'Le réseau parent est décrit ; le territoire exact de cette petite branche n’est pas inféré.'}</p><a className="source-link" href={detailedProfile.source} target="_blank" rel="noreferrer">Source anatomique</a></div>}<div className="detail-rule" /><h3>Un peu plus près</h3><p className="detail-description">{description.description}</p>{description.fact && <div className="fact"><Sparkles size={16} /><div><span>LE SAVIEZ-VOUS ?</span><p>{description.fact}</p></div></div>}<a className="source-link" href={description.source.url} target="_blank" rel="noreferrer">Source : {description.source.label}<ArrowUpRight size={13} /></a><div className="anatomical-id">IDENTIFIANT ANATOMIQUE <code>{selected.id}</code></div></div>
      <div className="detail-footer">{activeTour ? <><button disabled={tourIndex===0} onClick={()=>visitStep(tourIndex-1)}><ArrowLeft size={14}/> Précédent</button><button className="tour-next" onClick={()=>tourIndex===tourSteps.length-1 ? setGuided(false) : visitStep(tourIndex+1)}>{tourIndex===tourSteps.length-1 ? 'Terminer la visite' : 'Étape suivante'}<ArrowRight size={14}/></button></> : <><button onClick={reset}><ArrowLeft size={14} /> Vue d’ensemble</button><div><button aria-label="Structure précédente" onClick={() => nextStructure(-1)}><ArrowLeft size={16} /></button><button aria-label="Structure suivante" onClick={() => nextStructure(1)}><ArrowRight size={16} /></button></div></>}</div>
    </aside>}


    {profileOpen && <aside className="detail-panel profile-panel" aria-label="Profil local"><div className="detail-heading"><span className="eyebrow">VOTRE ESPACE</span><button className="icon-button" aria-label="Fermer le profil" onClick={()=>setProfileOpen(false)}><X size={18}/></button></div><div className="detail-content"><h2>Votre progression.</h2><p className="quiz-score">{completed.length} / {courses.length}</p><p>Cours terminés sur cet appareil. Aucun compte n’est nécessaire.</p><ul>{courses.filter(l=>completed.includes(l.id)).map(l=><li key={l.id}>{l.title}</li>)}</ul><button className="subtle-action" onClick={()=>{setCompleted([]);try{localStorage.removeItem('corpus-completed')}catch{}}}>Effacer ma progression locale</button><button className="primary-action" onClick={openLearning}>Reprendre l’apprentissage</button></div></aside>}
    {!quiz && <ChatAssistant body={body} open={chatOpen} selectedId={selectedId} name={description?.name??'Le corps humain'} system={description?.system??''} lesson={learningOpen?currentLesson:lessonFor(selected)?.id??''} level={level} onAction={executeAction} onOpen={setChatOpen}/>}
    {toolsOpen && !quiz && <ExplorerTools cut={cut} setCut={setCut} opacity={opacity} setOpacity={setOpacity} labels={labels} setLabels={setLabels} groups={(manifest?.groups??[]).map(g=>({id:g.id,name:groupMeta[g.id].name}))} close={()=>setToolsOpen(false)} share={share} status={shareStatus}/>}
    {quiz && <QuizPanel quiz={quiz} setQuiz={setQuiz} close={endQuiz} next={nextQuestion} reveal={()=>{setQuiz({...quiz,answered:true,helped:true,feedback:'Réponse dévoilée. Prenez le temps de repérer cette structure.'});setSelectedId(quizQuestions[quiz.index].id);setIsolated(true)}}/>}
    {hover && hovered && !searchOpen && !quiz && <div className="hover-label" role="tooltip" style={{ left: Math.min(hover.x + 16, window.innerWidth - 200), top: Math.max(80, hover.y - 42) }}><span />{describeStructure(hovered.name, hovered.group).name}<small>Cliquer pour explorer</small></div>}

    <div className="viewer-bottom"><div className="interaction-hint"><Rotate3D size={15} /><span>Glisser pour tourner</span><span className="hint-dot">·</span><span className="desktop-hint">Pointer puis défiler pour zoomer</span><span className="mobile-hint">Deux doigts pour zoomer / déplacer</span></div><div className="viewer-controls" aria-label="Commandes de la vue"><button aria-label="Outils d’exploration" aria-pressed={toolsOpen} onClick={()=>{setChatOpen(false);setToolsOpen(v=>!v);setLearningOpen(false);setProfileOpen(false)}} disabled={Boolean(quiz)}><SlidersHorizontal size={17}/></button><button aria-label="Zoom arrière" onClick={() => apiRef.current?.zoom(-1)} disabled={!load.ready.length}><Minus size={18} /></button><button aria-label="Zoom avant" onClick={() => apiRef.current?.zoom(1)} disabled={!load.ready.length}><Plus size={18} /></button><span className="control-separator" /><button className="orientation-button" onClick={() => { const next = orientation === 'front' ? 'back' : 'front'; setOrientation(next); apiRef.current?.orient(next) }} disabled={!load.ready.length} title="Changer de côté">{orientation === 'front' ? 'Face' : 'Dos'}<Rotate3D size={15} /></button><span className="control-separator" /><button aria-label="Réinitialiser la vue" title="Réinitialiser la vue" onClick={reset} disabled={!load.ready.length}><RotateCcw size={17} /></button></div></div>

    <footer className="bottombar"><div className="model-status"><span className={`status-dot ${load.complete ? 'is-ready' : ''}`} /><span>{load.complete ? `${visibleCount} structures actives` : 'Préparation de l’exploration'}</span><span className="footer-divider">/</span><span>{body==='female'?'Human Reference Atlas':'BodyParts3D'}</span></div><button className="education-note" onClick={()=>{setSelectedId(null);setIsolated(false);setCatalogOpen(v=>!v)}}>Index des structures <ArrowUpRight size={12}/></button><div className="footer-actions"><button onClick={() => setModal('about')}>Sources & crédits <ArrowUpRight size={12} /></button><button onClick={() => setModal('help')} aria-label="Aide à la navigation"><CircleHelp size={17} /></button></div></footer>

    </div>
    {learningOpen&&<CoursesWorkspace initial={courseToOpen} completed={completed} complete={completeCourse} explore={id=>{const reference=id.startsWith('HRA-')?'female':'male';setBody(reference);setDetailMode(true);setLearningOpen(false);setPracticeOpen(false);writeRoute(id,true,reference)}} practice={id=>openStudy('entrainement',id)} navigate={id=>openStudy('cours',id)}/>}
    {practiceOpen&&<PracticeWorkspace course={practiceCourse} navigate={id=>openStudy('entrainement',id)} learn={id=>openStudy('cours',id)} start3D={startQuiz}/>}
    <dialog ref={dialogRef} className="info-dialog" onCancel={() => setModal(null)} onClick={e => { if (e.target === dialogRef.current) setModal(null) }}><div className="dialog-inner"><button className="dialog-close icon-button" aria-label="Fermer" onClick={() => setModal(null)}><X size={20} /></button><span className="eyebrow">MYCORPUS · ATLAS OUVERT</span><h2>{modal === 'help' ? 'Prenez le corps en main.' : 'Le vivant appartient à tous.'}</h2>{modal === 'help' ? <><p>Un espace pour observer, explorer et comprendre, à votre rythme.</p><div className="help-row"><Rotate3D /><div><strong>Changer de perspective</strong><p>Glissez avec la souris ou un doigt pour tourner. Pointez la zone à explorer puis utilisez la molette pour zoomer dessus. Glissez avec le bouton droit pour déplacer le corps. Sur téléphone, pincez autour de la zone souhaitée ; glissez avec deux doigts pour la déplacer.</p></div></div><div className="help-row"><Search /><div><strong>Suivre votre curiosité</strong><p>Survolez une structure pour connaître son nom. Cliquez, touchez ou utilisez la recherche pour ouvrir sa fiche. La recherche accepte les accents ou leur absence.</p></div></div><div className="help-row"><Layers3 /><div><strong>Voir sous la surface</strong><p>Activez les couches anatomiques. Sur téléphone, ouvrez « Couches anatomiques ». Masquer le squelette facilite l’exploration des organes.</p></div></div><div className="help-row"><RotateCcw /><div><strong>Retrouver vos repères</strong><p>Le bouton de réinitialisation retrouve la vue de face. Les réglages de couches sont conservés.</p></div></div></> : <><p>MyCorpus est une invitation à explorer l’anatomie humaine grâce à de véritables maillages 3D, indépendants et sélectionnables.</p><h3>Des modèles scientifiques ouverts</h3><p>BodyParts3D, © The Database Center for Life Science (DBCLS), sous licence Creative Commons Attribution 4.0 International.</p><p>Modèles issus de l’archive officielle BodyParts3D 4.0, complétés par les cinq surfaces lobaires pulmonaires de l’archive officielle 3.0 dans le même repère. Ils sont simplifiés, regroupés, orientés et convertis en GLB pour le Web. Les couleurs sont des choix de visualisation. La page actuelle indique CC BY 4.0 (27 février 2025), mais les fichiers OBJ téléchargés portent CC BY-SA 2.1 Japon. Nos GLB conservent cette dernière licence : attribution et partage des adaptations sous les mêmes conditions.</p><div className="dialog-links"><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer">Modèles d’origine <ArrowUpRight size={14} /></a><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">Licence de la source <ArrowUpRight size={14} /></a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 <ArrowUpRight size={14} /></a><a href={`${import.meta.env.BASE_URL}SOURCES.md`} target="_blank">Sources pédagogiques <ArrowUpRight size={14} /></a></div><p>Attribution des fichiers : BodyParts3D, © The Database Center for Life Science (DBCLS), sous licence Creative Commons Attribution – Partage dans les mêmes conditions 2.1 Japon.</p><div className="dialog-links"><a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noreferrer">Licence des GLB : CC BY-SA 2.1 Japon <ArrowUpRight size={14} /></a><a href={`${import.meta.env.BASE_URL}licenses/detailed-provenance.json`} target="_blank">Provenance des fichiers <ArrowUpRight size={14} /></a></div><div className="dialog-links"><a href={`${import.meta.env.BASE_URL}licenses/lung-surfaces-provenance.json`} target="_blank">Provenance des lobes pulmonaires <ArrowUpRight size={14} /></a><a href={`${import.meta.env.BASE_URL}models/LICENSE.txt`} target="_blank">Notice de redistribution <ArrowUpRight size={14} /></a></div><h3>Référence féminine Human Reference Atlas</h3><p>Modèle United Female v1.5, Kristen Browne et Heidi Schlehlein, HuBMAP, à partir du Visible Human Female de la National Library of Medicine. Licence CC BY 4.0. Maillages simplifiés et répartis en couches pour le Web. Le squelette et les muscles sont partiels ; cette référence composite ne remplace pas un corps féminin exhaustif.</p><a href={import.meta.env.BASE_URL+'licenses/female-provenance.json'} target="_blank" rel="noreferrer">Provenance et transformations du modèle féminin ↗</a><a href={import.meta.env.BASE_URL+'models/female-regions/LICENSE.txt'} target="_blank" rel="noreferrer">Crédits et licence du modèle féminin ↗</a><h3>Un atlas étendu, pas une anatomie exhaustive</h3><p>Le mode détaillé utilise les éléments nommés de l’archive ISA 4.0 : os, dents, muscles, vaisseaux, nerfs, organes et tissus de soutien. Les fichiers sans identification sont exclus. Ce corps de référence masculin ne couvre ni toutes les variantes anatomiques ni les détails microscopiques. Certaines fiches donnent uniquement des repères de groupe.</p><p>La nomenclature française provient de Z-Anatomy (TA2.csv), sous CC BY-SA 4.0. Les noms sont complétés par des traductions descriptives des portions, côtés et branches. Les noms sources restent conservés dans les données de provenance ; les libellés français ne constituent pas une nouvelle nomenclature officielle.</p><a href={`${import.meta.env.BASE_URL}licenses/terminology-LICENSE.txt`} target="_blank">Crédits de la nomenclature</a><h3>Apprendre avec des repères fiables</h3><p>Les fiches sont rédigées en français à partir de ressources pédagogiques du NIH et d’OpenStax. Chaque fiche renvoie à sa source.</p><div className="educational-box"><ShieldCheck size={22} /><p>Un outil pédagogique, pas un outil de diagnostic. Ce modèle représente une anatomie de référence ; les formes et les proportions varient d’une personne à l’autre. Il ne constitue pas un atlas exhaustif.</p></div></>}<button className="dialog-action" onClick={() => setModal(null)}>Revenir à l’exploration <ArrowRight size={16} /></button></div></dialog>
    <span className="sr-only" aria-live="polite">{description ? `Structure sélectionnée : ${description.name}. ${description.role}` : ''}</span>
  </main>
}
