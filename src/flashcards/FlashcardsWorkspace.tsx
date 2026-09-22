import{useEffect,useRef,useState}from'react'
import{BarChart3,BookOpen,Brain,Check,ChevronRight,Copy,Download,Layers,Plus,RotateCcw,Search,Sparkles,Trash2,X}from'lucide-react'
import{useAccount}from'../account/store'
import{createDeck,createNote,deleteCard,deleteDeck,downloadCsv,duplicateCard,exportAnki,fetchNote,fetchStats,listCards,listDecks,moveCard,previewCard,reviewCard,reviewQueue,updateCard,updateDeck,updateNote}from'./flashcardsApi'
import type{Flashcard,FlashcardDeck,FlashcardPreview,FlashcardStats,GenerationSource,NoteType}from'./flashcardsTypes'
import GenerationDialog from'./GenerationDialog'
import'./flashcards.css'

type View='today'|'decks'|'cards'|'stats'

type EditorState = {
  id?: string
  noteId?: string | null
  noteVersion?: number
  noteType: NoteType
  deckId: string
  title: string
  front: string
  back: string
  clozeText: string
  typedAnswer: string
  acceptedAnswers: string
  extra: string
  subject: string
  chapter: string
  tags: string
}

const emptyEditor: EditorState = {
  noteType: 'basic',
  deckId: '',
  title: '',
  front: '',
  back: '',
  clozeText: '',
  typedAnswer: '',
  acceptedAnswers: '',
  extra: '',
  subject: '',
  chapter: '',
  tags: '',
}

function normalizeTypedAnswerClient(str: string) {
  return str.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')
}

function checkTypedClient(input: string, target: string, accepted: string[] = []) {
  const normInput = normalizeTypedAnswerClient(input)
  const normTarget = normalizeTypedAnswerClient(target)
  if (!normInput) return false
  if (normInput === normTarget && normTarget.length > 0) return true
  return accepted.some(a => normalizeTypedAnswerClient(a) === normInput)
}

export default function FlashcardsWorkspace({openCourse,openDocument}:{openCourse:(courseId:string,sectionId?:string|null)=>void;openDocument:(documentId:string,sectionId?:string|null)=>void}){
 const account=useAccount(),[view,setView]=useState<View>('today'),[decks,setDecks]=useState<FlashcardDeck[]>([]),[cards,setCards]=useState<Flashcard[]>([]),[nextCursor,setNextCursor]=useState<string|null>(null),[stats,setStats]=useState<FlashcardStats|null>(null),[query,setQuery]=useState(''),[deckFilter,setDeckFilter]=useState(''),[subjectFilter,setSubjectFilter]=useState(''),[chapterFilter,setChapterFilter]=useState(''),[tagFilter,setTagFilter]=useState(''),[editor,setEditor]=useState<EditorState|null>(null),[newDeck,setNewDeck]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[review,setReview]=useState<Flashcard[]|null>(null),[reviewIndex,setReviewIndex]=useState(0),[revealed,setRevealed]=useState(false),[cardPreview,setCardPreview]=useState<FlashcardPreview|null>(null),[previewLoading,setPreviewLoading]=useState(false),[previewError,setPreviewError]=useState(''),[reviewStarted,setReviewStarted]=useState(0),[freeText,setFreeText]=useState(''),[generation,setGeneration]=useState<GenerationSource|null>(null),[exportOpen,setExportOpen]=useState(false),[exportScope,setExportScope]=useState<'all'|'due'|'decks'|'course'>('all'),[exportDecks,setExportDecks]=useState<string[]>([]),[exportCourse,setExportCourse]=useState(''),[toast,setToast]=useState('')
 const [typedInput, setTypedInput] = useState('')
 const clozeTextareaRef = useRef<HTMLTextAreaElement | null>(null)

 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(t)},[toast])
 const requestVersion=useRef(0), actionLock=useRef(false)
 const [pending,setPending]=useState(false)
 const cardFilters={limit:100,query,deck:deckFilter,subject:subjectFilter,chapter:chapterFilter,tag:tagFilter}
 const refresh=async()=>{if(!account.user)return;const version=++requestVersion.current;setLoading(!stats);setError('');try{const[d,c,s]=await Promise.all([listDecks(),listCards(cardFilters),fetchStats()]);if(version!==requestVersion.current)return;setDecks(d);setCards(c.cards);setNextCursor(c.nextCursor);setStats(s)}catch(e){if(version===requestVersion.current)setError((e as Error).message)}finally{if(version===requestVersion.current)setLoading(false)}}
 const perform=async(action:()=>Promise<unknown>)=>{if(actionLock.current)return;actionLock.current=true;setPending(true);setError('');try{await action()}catch(e){setError((e as Error).message)}finally{actionLock.current=false;setPending(false)}}
 const loadMore=()=>perform(async()=>{if(!nextCursor)return;const version=requestVersion.current;const page=await listCards({...cardFilters,cursor:nextCursor});if(version!==requestVersion.current)return;setCards(items=>[...items,...page.cards.filter(card=>!items.some(item=>item.id===card.id))]);setNextCursor(page.nextCursor)})
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>|undefined;if(!stats)void refresh();else timer=setTimeout(()=>void refresh(),200);return()=>{clearTimeout(timer);requestVersion.current++}},[account.user?.id,query,deckFilter,subjectFilter,chapterFilter,tagFilter])
 useEffect(()=>{setCards([]);setDecks([]);setStats(null);setReview(null);setCardPreview(null);setPreviewLoading(false);setPreviewError('');setEditor(null);setGeneration(null);setFreeText('');setTypedInput('')},[account.user?.id])
 const startReview=(deckId?:string)=>perform(async()=>{const due=await reviewQueue(deckId);setReview(due);setReviewIndex(0);setRevealed(false);setCardPreview(null);setPreviewLoading(false);setPreviewError('');setReviewStarted(Date.now());setTypedInput('')})
 const reveal=async()=>{const c=review?.[reviewIndex];if(!c)return;setRevealed(true);setPreviewLoading(true);setPreviewError('');setCardPreview(null);try{const p=await previewCard(c.id);setCardPreview(p.preview)}catch(e){setPreviewError((e as Error).message||'Impossible de calculer les prochains rappels.')}finally{setPreviewLoading(false)}}
 const rate=(rating:'again'|'hard'|'good'|'easy')=>perform(async()=>{const card=review?.[reviewIndex];if(!card||!revealed||!cardPreview||previewLoading)return;await reviewCard(card.id,rating,Date.now()-reviewStarted,card.review?.dueAt,card.review?.reviewVersion,cardPreview.id);
  // Sibling burying in current active session: remove subsequent siblings of the same note
  if(card.noteId){
    setReview(cards=>cards?cards.filter((c,idx)=>idx<=reviewIndex||c.noteId!==card.noteId):null)
  }
  setReviewIndex(i=>i+1);setRevealed(false);setCardPreview(null);setPreviewLoading(false);setPreviewError('');setReviewStarted(Date.now());setTypedInput('')})

 const openEditCard = async (card: Flashcard) => {
   if (card.noteId) {
     try {
       const note = await fetchNote(card.noteId)
       setEditor({
         id: note.id,
         noteId: note.id,
         noteVersion: note.noteVersion,
         noteType: note.noteType,
         deckId: card.deckId || note.defaultDeckId || decks[0]?.id || '',
         title: note.title || '',
         front: note.fields.front || '',
         back: note.fields.back || '',
         clozeText: note.fields.text || '',
         typedAnswer: note.fields.answer || '',
         acceptedAnswers: (note.fields.acceptedAnswers || []).join(', '),
         extra: note.fields.extra || '',
         subject: note.subject || '',
         chapter: note.chapter || '',
         tags: (note.tags || []).join(', '),
       })
     } catch (e) {
       setError((e as Error).message || 'Impossible de charger la Note parente.')
     }
   } else {
     setEditor({
       ...emptyEditor,
       id: card.id,
       deckId: card.deckId,
       front: card.front,
       back: card.back,
       subject: card.subject,
       chapter: card.chapter,
       tags: (card.tags || []).join(', '),
     })
   }
 }

 const saveEditor = () => perform(async () => {
   if (!editor) return
   const parsedTags = typeof editor.tags === 'string'
     ? editor.tags.split(',').map(t => t.trim()).filter(Boolean)
     : editor.tags

   if (editor.noteId) {
     // Updating existing Note
     let fields: Record<string, unknown> = {}
     if (['basic', 'reverse', 'bidirectional'].includes(editor.noteType)) {
       fields = {front: editor.front.trim(), back: editor.back.trim()}
     } else if (editor.noteType === 'cloze') {
       fields = {text: editor.clozeText.trim(), extra: editor.extra.trim()}
     } else if (editor.noteType === 'typed') {
       const alts = editor.acceptedAnswers.split(',').map(s => s.trim()).filter(Boolean)
       fields = {front: editor.front.trim(), answer: editor.typedAnswer.trim(), acceptedAnswers: alts, extra: editor.extra.trim()}
     }
     await updateNote(editor.noteId, {
       defaultDeckId: editor.deckId,
       noteType: editor.noteType,
       title: editor.title.trim() || undefined,
       fields,
       subject: editor.subject.trim(),
       chapter: editor.chapter.trim(),
       tags: parsedTags,
     }, editor.noteVersion ?? 0)
   } else if (editor.id) {
     // Updating legacy card
     await updateCard(editor.id, {
       deckId: editor.deckId,
       front: editor.front.trim(),
       back: editor.back.trim(),
       subject: editor.subject.trim(),
       chapter: editor.chapter.trim(),
       tags: parsedTags,
     })
   } else {
     // Creating new Note
     let fields: Record<string, unknown> = {}
     if (['basic', 'reverse', 'bidirectional'].includes(editor.noteType)) {
       fields = {front: editor.front.trim(), back: editor.back.trim()}
     } else if (editor.noteType === 'cloze') {
       fields = {text: editor.clozeText.trim(), extra: editor.extra.trim()}
     } else if (editor.noteType === 'typed') {
       const alts = editor.acceptedAnswers.split(',').map(s => s.trim()).filter(Boolean)
       fields = {front: editor.front.trim(), answer: editor.typedAnswer.trim(), acceptedAnswers: alts, extra: editor.extra.trim()}
     }
     await createNote({
       defaultDeckId: editor.deckId,
       noteType: editor.noteType,
       title: editor.title.trim() || undefined,
       fields,
       subject: editor.subject.trim(),
       chapter: editor.chapter.trim(),
       tags: parsedTags,
     })
   }
   setEditor(null)
   await refresh()
 })

 const insertCloze = () => {
   const textarea = clozeTextareaRef.current
   if (!textarea || !editor) return
   const start = textarea.selectionStart
   const end = textarea.selectionEnd
   const text = editor.clozeText
   const selected = text.slice(start, end) || 'mot'
   const existingMatches = [...text.matchAll(/\{\{c(\d+)::/g)].map(m => parseInt(m[1], 10))
   const nextNum = existingMatches.length ? Math.max(...existingMatches) + 1 : 1
   const insertion = `{{c${nextNum}::${selected}}}`
   const nextText = text.slice(0, start) + insertion + text.slice(end)
   setEditor({...editor, clozeText: nextText})
 }

 const addDeck=()=>perform(async()=>{if(!newDeck.trim())return;await createDeck({name:newDeck});setNewDeck('');await refresh()})
 const current=review?.[reviewIndex]
 const masteredPercent=stats?.total?Math.round(stats.mastered/stats.total*100):0
 const sourceAction=(card:Flashcard)=>{if(card.source.courseId)openCourse(card.source.courseId,card.source.sectionId);else if(card.source.documentId)openDocument(card.source.documentId,card.source.sectionId)}

 const isTypedMatch = current?.cardType === 'typed' ? checkTypedClient(typedInput, current.typedTarget || '', current.acceptedAnswers || []) : false

 if(!account.user)return <section className="study-workspace flash-workspace"><header className="flash-hero"><div><span className="study-eyebrow">MÉMORISER AVEC RÉGULARITÉ</span><h1>Vos flashcards.<br/><em>Une notion à la fois.</em></h1><p>Connectez-vous pour créer vos decks, synchroniser vos cartes et retrouver vos révisions sur tous vos appareils.</p></div><Brain size={90}/></header><div className="mycourses-alert mycourses-alert-warning"><strong>Connexion nécessaire</strong><p>La création et la progression sont isolées dans votre compte MyCorpus.</p></div></section>
 if(review)return <section className="study-workspace flash-workspace flash-review"><header><button className="study-text-link" disabled={pending} onClick={()=>{setReview(null);setCardPreview(null);setPreviewLoading(false);setPreviewError('');void refresh()}}><X size={16}/>Quitter</button><span>{Math.min(reviewIndex+1,review.length)} / {review.length}</span></header>{error&&<p className="flash-error" role="alert">{error}</p>}{current?<article className="review-card"><span className="study-eyebrow">{decks.find(d=>d.id===current.deckId)?.name||'Flashcard'}{current.cardType==='cloze'?' · Texte à trous':current.cardType==='typed'?' · Réponse saisie':''}</span>
  <div className="review-face">
    <small>RECTO</small>
    <h1>{current.front}</h1>
    {current.cardType==='typed'&&!revealed&&<div className="review-typed-input"><input autoFocus placeholder="Tapez votre réponse…" value={typedInput} onChange={e=>setTypedInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void reveal()}}/><button className="study-primary" onClick={reveal}>Vérifier</button></div>}
  </div>
  {revealed?<><div className="review-answer"><small>VERSO</small>
    {current.cardType==='typed'&&<div className={`typed-feedback ${isTypedMatch?'is-match':'is-mismatch'}`}>{isTypedMatch?<div><Check size={20}/> <strong>Correct !</strong> Votre saisie correspond à l’attendu.</div>:<div><X size={20}/> <strong>Différence relevée :</strong><br/>Votre réponse : <del>{typedInput||'(vide)'}</del><br/>Attendu : <ins>{current.typedTarget}</ins></div>}</div>}
    {current.cardType==='cloze'?<p dangerouslySetInnerHTML={{__html:current.back}}/>:<p>{current.back}</p>}
  </div>
  {previewLoading?<div><p className="review-loading-status" aria-live="polite">Calcul des prochains rappels…</p><div className="review-ratings"><button disabled><strong>À revoir</strong><small>…</small></button><button disabled><strong>Difficile</strong><small>…</small></button><button disabled><strong>Correct</strong><small>…</small></button><button disabled><strong>Facile</strong><small>…</small></button></div></div>:previewError?<div className="review-preview-error" role="alert"><p className="flash-error">{previewError}</p><button className="study-secondary" onClick={reveal}>Réessayer</button></div>:cardPreview?<div className="review-ratings"><button disabled={pending} onClick={()=>rate('again')}><strong>À revoir</strong><small>{cardPreview.labels.again}</small></button><button disabled={pending} onClick={()=>rate('hard')}><strong>Difficile</strong><small>{cardPreview.labels.hard}</small></button><button disabled={pending} onClick={()=>rate('good')}><strong>Correct</strong><small>{cardPreview.labels.good}</small></button><button disabled={pending} onClick={()=>rate('easy')}><strong>Facile</strong><small>{cardPreview.labels.easy}</small></button></div>:null}</>:<button className="study-primary" onClick={reveal}>Afficher la réponse</button>}</article>:<div className="flash-empty"><h2>Session terminée</h2><p>{review.length} carte(s) révisée(s). Les cartes « À revoir » seront de nouveau disponibles dans environ dix minutes.</p><button disabled={pending} onClick={()=>{setReview(null);setCardPreview(null);setPreviewLoading(false);setPreviewError('');void refresh()}}>Retour aux flashcards</button></div>}</section>
 return <section className="study-workspace flash-workspace" aria-label="Flashcards" aria-busy={loading}><header className="flash-hero"><div><span className="study-eyebrow">RÉPÉTITION ESPACÉE · SYNCHRONISÉE</span><h1>Vos flashcards.<br/><em>Retenir durablement.</em></h1><p>Créez vos cartes, transformez vos cours en brouillons relus, puis révisez au bon moment.</p></div><div className="flash-hero-score"><strong>{stats?.dueToday||0}</strong><span>à revoir aujourd’hui</span><button className="study-primary" disabled={!stats?.dueToday} onClick={()=>startReview()}>Commencer<ChevronRight size={17}/></button></div></header>
 <nav className="flash-tabs" aria-label="Sections flashcards">{([['today','Aujourd’hui',RotateCcw],['decks','Mes decks',Layers],['cards','Toutes mes cartes',BookOpen],['stats','Statistiques',BarChart3]]as const).map(([id,label,Icon])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}><Icon size={17}/>{label}</button>)}</nav>
 {error&&<p className="flash-error" role="alert">{error}</p>}{loading?<p className="flash-loading">Chargement de vos flashcards…</p>:view==='today'?<div className="flash-dashboard"><div className="flash-stat-grid"><article><strong>{stats?.dueToday||0}</strong><span>À réviser</span></article><article><strong>{stats?.newCards||0}</strong><span>Nouvelles</span></article><article><strong>{stats?.mastered||0}</strong><span>Maîtrisées</span></article><article><strong>{stats?.streak||0} j</strong><span>Série actuelle</span></article></div><section className="flash-free-generator"><div><Sparkles size={24}/><h2>Générer depuis un texte</h2><p>Collez vos notes ou un extrait de cours. Le texte sert uniquement à produire l’aperçu et n’est pas conservé.</p></div><textarea aria-label="Texte à transformer en flashcards" placeholder="Collez ici le contenu à mémoriser…" value={freeText} onChange={e=>setFreeText(e.target.value)} maxLength={300000}/><button className="study-primary" disabled={freeText.trim().length<20} onClick={()=>setGeneration({kind:'text',title:'Texte libre',text:freeText})}><Sparkles size={16}/>Générer des flashcards</button></section><section><div className="flash-section-heading"><h2>Vos decks</h2><button onClick={()=>setView('decks')}>Tout afficher</button></div><div className="deck-grid">{decks.slice(0,6).map(deck=><article key={deck.id}><span>{deck.subject||'Deck personnel'}</span><h3>{deck.name}</h3><p>{deck.cardCount} cartes · {deck.dueCount} dues</p><button disabled={!deck.dueCount} onClick={()=>startReview(deck.id)}>Réviser ce deck</button></article>)}</div></section></div>:
 view==='decks'?<div><div className="flash-create-deck"><input maxLength={100} aria-label="Nom du nouveau deck" placeholder="Nom du nouveau deck" value={newDeck} onChange={e=>setNewDeck(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void addDeck()}}/><button className="study-primary" disabled={pending||!newDeck.trim()} onClick={addDeck}><Plus size={16}/>Créer un deck</button></div><div className="deck-grid">{decks.map(deck=><article key={deck.id}><span>{deck.subject||'Deck personnel'}</span><h3>{deck.name}</h3><p>{deck.cardCount} cartes · {deck.dueCount} à revoir</p><div><button onClick={()=>{const name=prompt('Nouveau nom du deck',deck.name);if(name)void perform(async()=>{await updateDeck(deck.id,{name});await refresh()})}}>Renommer</button><button onClick={()=>{if(confirm(`Supprimer « ${deck.name} » et ses cartes ?`))void perform(async()=>{await deleteDeck(deck.id);if(deckFilter===deck.id)setDeckFilter('');await refresh()})}}><Trash2 size={14}/>Supprimer</button></div></article>)}</div></div>:
  view==='cards'?<div><div className="flash-card-toolbar"><div><Search size={16}/><input aria-label="Rechercher dans les flashcards" placeholder="Rechercher recto, verso, matière, tag…" value={query} onChange={e=>setQuery(e.target.value)}/></div><select aria-label="Filtrer par deck" value={deckFilter} onChange={e=>setDeckFilter(e.target.value)}><option value="">Tous les decks</option>{decks.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><input aria-label="Filtrer par matière" placeholder="Matière" value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}/><input aria-label="Filtrer par chapitre" placeholder="Chapitre" value={chapterFilter} onChange={e=>setChapterFilter(e.target.value)}/><input aria-label="Filtrer par tag" placeholder="Tag" value={tagFilter} onChange={e=>setTagFilter(e.target.value)}/><button className="study-primary" disabled={!decks.length||pending} onClick={()=>setEditor({...emptyEditor,deckId:deckFilter||decks[0].id})}><Plus size={16}/>Nouvelle carte</button></div><div className="flash-card-list">{cards.map(card=><article key={card.id}><div><span>{decks.find(d=>d.id===card.deckId)?.name} · {card.subject||'Sans matière'}<span className="card-type-badge">{card.cardType==='cloze'?`Trou (${card.derivationKey})`:card.cardType==='typed'?'Réponse saisie':card.derivationKey==='reverse'?'Inversée':card.derivationKey==='forward'?'Directe':'Standard'}</span></span><h3>{card.front}</h3><p>{card.back}</p>{card.tags.length?<div className="flash-tags">{card.tags.map(tag=><em key={tag}>{tag}</em>)}</div>:null}</div><div className="flash-card-actions">{(card.source.courseId||card.source.documentId)&&<button onClick={()=>sourceAction(card)}>Voir dans {card.source.documentId?'le PDF':'le cours'}</button>}<button onClick={()=>void openEditCard(card)}>Modifier</button><select aria-label={'Déplacer '+card.front} value={card.deckId} onChange={e=>void perform(async()=>{await moveCard(card.id,e.target.value);await refresh()})}>{decks.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><button title="Dupliquer" onClick={()=>void perform(async()=>{await duplicateCard(card.id);await refresh()})}><Copy size={15}/></button><button title="Supprimer" onClick={()=>confirm('Supprimer cette carte et son historique de révision ?')&&void perform(async()=>{await deleteCard(card.id, typeof card.noteVersion === 'number' ? card.noteVersion : undefined);await refresh()})}><Trash2 size={15}/></button></div></article>)}</div>{nextCursor&&<button className="study-secondary flash-load-more" disabled={pending} onClick={loadMore}>Charger davantage de cartes</button>}{!cards.length&&<p className="flash-empty">Aucune carte ne correspond à ces filtres.</p>}</div>:
 <div className="flash-stats"><div className="flash-stat-grid"><article><strong>{stats?.total||0}</strong><span>Cartes</span></article><article><strong>{stats?.successRate||0}%</strong><span>Taux de réussite</span></article><article><strong>{stats?.mastered||0}</strong><span>Maîtrisées</span></article><article><strong>{masteredPercent}%</strong><span>Progression</span></article></div><section><h2>Progression par deck</h2>{stats?.decks.map(deck=><div className="deck-progress" key={deck.id}><span><strong>{deck.name}</strong><small>{deck.mastered}/{deck.total} maîtrisées · {deck.due} dues</small></span><progress max={Math.max(1,deck.total)} value={deck.mastered}/></div>)}</section><section><h2>Progression par matière</h2>{stats?.subjects.map(subject=><div className="deck-progress" key={subject.name}><span><strong>{subject.name}</strong><small>{subject.mastered}/{subject.total} maîtrisées</small></span><progress max={Math.max(1,subject.total)} value={subject.mastered}/></div>)}</section><button className="study-secondary" onClick={()=>setExportOpen(true)}><Download size={16}/>Exporter vers Anki</button></div>}
 {editor&&<div className="flash-modal-backdrop"><section className="flash-modal flash-card-editor" role="dialog" aria-modal="true" aria-label="Éditeur de flashcard"><header><h2>{editor.id?'Modifier la carte':'Nouvelle carte'}</h2><button className="icon-button" aria-label="Fermer l’éditeur" disabled={pending} onClick={()=>setEditor(null)}><X/></button></header>
 <label>Type de carte
   <div className="note-type-selector" role="group" aria-label="Type de note">
     <button type="button" aria-pressed={editor.noteType==='basic'} onClick={()=>setEditor({...editor,noteType:'basic'})}>Basique</button>
     <button type="button" aria-pressed={editor.noteType==='reverse'} onClick={()=>setEditor({...editor,noteType:'reverse'})}>Inversée</button>
     <button type="button" aria-pressed={editor.noteType==='bidirectional'} onClick={()=>setEditor({...editor,noteType:'bidirectional'})}>Bidirectionnelle</button>
     <button type="button" aria-pressed={editor.noteType==='cloze'} onClick={()=>setEditor({...editor,noteType:'cloze'})}>Texte à trous</button>
     <button type="button" aria-pressed={editor.noteType==='typed'} onClick={()=>setEditor({...editor,noteType:'typed'})}>Réponse saisie</button>
   </div>
 </label>
 <label>Deck<select value={editor.deckId} onChange={e=>setEditor({...editor,deckId:e.target.value})}>{decks.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
 {['basic','reverse','bidirectional'].includes(editor.noteType)?<>
   <label>Recto<textarea maxLength={2000} value={editor.front} onChange={e=>setEditor({...editor,front:e.target.value})}/></label>
   <label>Verso<textarea maxLength={8000} value={editor.back} onChange={e=>setEditor({...editor,back:e.target.value})}/></label>
   {editor.noteType==='bidirectional'&&<div className="derivation-preview-list"><strong>Dérivation automatique :</strong> 2 cartes générées (Recto ➔ Verso et Verso ➔ Recto). Chacune possède son propre suivi FSRS.</div>}
 </>:editor.noteType==='cloze'?<>
   <label>Texte avec trous
     <div className="cloze-toolbar">
       <button type="button" onClick={insertCloze}>{'Insérer trou ({{c1::...}})'}</button>
     </div>
     <textarea ref={clozeTextareaRef} maxLength={8000} placeholder="Exemple : Le {{c1::cœur::organe}} pompe le sang vers le {{c2::poumon}}." value={editor.clozeText} onChange={e=>setEditor({...editor,clozeText:e.target.value})} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==='c'||e.key==='C')){e.preventDefault();insertCloze()}}}/>
   </label>
   <label>Complément <small>(affiché sur le verso)</small><textarea maxLength={4000} value={editor.extra} onChange={e=>setEditor({...editor,extra:e.target.value})}/></label>
   <div className="derivation-preview-list"><strong>Raccourci :</strong> Sélectionnez un mot et faites <kbd>Ctrl+Shift+C</kbd> (ou <kbd>Cmd+Shift+C</kbd>) pour créer un trou. Chaque numéro de trou produira une carte distincte.</div>
 </>:<>
   <label>Question<textarea maxLength={2000} placeholder="Question demandant une réponse textuelle précise…" value={editor.front} onChange={e=>setEditor({...editor,front:e.target.value})}/></label>
   <label>Réponse attendue<input maxLength={2000} placeholder="Orthographe exacte attendue" value={editor.typedAnswer} onChange={e=>setEditor({...editor,typedAnswer:e.target.value})}/></label>
   <label>Variantes acceptées <small>(séparées par virgules)</small><input maxLength={1000} placeholder="Ex : Lutèce, Lutece" value={editor.acceptedAnswers} onChange={e=>setEditor({...editor,acceptedAnswers:e.target.value})}/></label>
   <label>Complément / Explication<textarea maxLength={4000} value={editor.extra} onChange={e=>setEditor({...editor,extra:e.target.value})}/></label>
 </>}
 <div className="flash-setting-grid"><label>Matière <small>(facultatif)</small><input value={editor.subject} onChange={e=>setEditor({...editor,subject:e.target.value})}/></label><label>Chapitre <small>(facultatif)</small><input value={editor.chapter} onChange={e=>setEditor({...editor,chapter:e.target.value})}/></label></div>
 <label>Tags séparés par des virgules<input value={editor.tags} onChange={e=>setEditor({...editor,tags:e.target.value})}/></label>
 {error&&<p className="flash-error" role="alert">{error}</p>}
 <button className="study-primary" disabled={pending||!editor.deckId||(['basic','reverse','bidirectional'].includes(editor.noteType)&&(!editor.front.trim()||!editor.back.trim()))||(editor.noteType==='cloze'&&!editor.clozeText.includes('{{c'))||(editor.noteType==='typed'&&(!editor.front.trim()||!editor.typedAnswer.trim()))} onClick={saveEditor}>Enregistrer</button>
 </section></div>}
 {generation&&<GenerationDialog source={generation} onClose={()=>setGeneration(null)} onSaved={info=>{setFreeText('');void refresh();if(info)setToast(`${info.count} carte${info.count>1?'s':''} enregistrée${info.count>1?'s':''} dans le deck « ${info.deckName} »`)}}/>}
 {exportOpen&&<div className="flash-modal-backdrop"><section className="flash-modal flash-card-editor" role="dialog" aria-modal="true"><header><h2>Exporter vers Anki</h2><button className="icon-button" onClick={()=>setExportOpen(false)}><X/></button></header><label>Contenu<select value={exportScope} onChange={e=>setExportScope(e.target.value as typeof exportScope)}><option value="all">Toutes mes flashcards</option><option value="due">Uniquement les cartes à réviser</option><option value="decks">Un ou plusieurs decks</option><option value="course">Les cartes d’un cours</option></select></label>{exportScope==='decks'&&<fieldset>{decks.map(deck=><label className="flash-check" key={deck.id}><input type="checkbox" checked={exportDecks.includes(deck.id)} onChange={e=>setExportDecks(ids=>e.target.checked?[...ids,deck.id]:ids.filter(id=>id!==deck.id))}/>{deck.name}</label>)}</fieldset>}{exportScope==='course'&&<label>Cours<select value={exportCourse} onChange={e=>setExportCourse(e.target.value)}><option value="">Choisir un cours</option>{stats?.courses.map(course=><option key={course.id} value={course.id}>{course.title||course.id} · {course.total} cartes</option>)}</select></label>}<button className="study-primary" disabled={exportScope==='decks'&&!exportDecks.length||exportScope==='course'&&!exportCourse} onClick={async()=>{try{const filters=exportScope==='due'?{due:true}:exportScope==='decks'?{deckIds:exportDecks}:exportScope==='course'?{courseId:exportCourse}:{};downloadCsv(await exportAnki(filters),'mycorpus-flashcards.csv');setExportOpen(false)}catch(e){setError((e as Error).message)}}}><Download size={16}/>Télécharger le fichier Anki</button></section></div>}
 {toast&&<div className="flash-toast" role="status"><Check size={16}/><span>{toast}</span></div>}
</section>
}
