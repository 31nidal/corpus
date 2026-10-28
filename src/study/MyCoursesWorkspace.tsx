import {CourseLearningDashboard} from './CourseLearningDashboard'
import {CourseTrainer} from './CourseTrainer'
import {CourseReader,CourseWeaknesses} from './CourseLearningPanels'
import {fetchLearningOverview,updateLearningDocument} from './myCoursesApi'
import type {LearningOverview} from './myCoursesTypes'
import './courseLearning.css'
import {SummaryChapter} from './ai/SummaryChapter'
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Crop, FileText, Upload, Trash2, ArrowRight, ArrowLeft, BookOpen,
  Sparkles, AlertCircle, RefreshCw,
  FileCheck, Clock3, Layers, X, Check
} from 'lucide-react'
import type { StudyDocument, StudyQuota, StudyQuestion } from './myCoursesTypes'
import {
  fetchStudyDocuments, fetchStudyDocument, uploadStudyDocument,
  deleteStudyDocument, generateDocumentSummary, generateDocumentQuestions,
  fetchDocumentQuestions, fetchStudyQuotas
} from './myCoursesApi'
import { storageScope, useAccount } from '../account/store'
import { isCorrect } from './questionScoring'
import { nextReview, validReview, type ReviewRecord } from './reviewSchedule'
import './myCourses.css'
import ReviewWorkspace from './review/ReviewWorkspace'
import {ExtractedSection} from './ExtractedSection'
import DownloadPdfButton from './DownloadPdfButton'
import {GenerationNotice,useGenerationProvider} from './ai/GenerationNotice'
import {SupportPreview, type SupportTask} from './ai/SupportPreview'
import type {FlashcardDeck} from '../flashcards/flashcardsTypes'
import {listDecks} from '../flashcards/flashcardsApi'
import {PdfCropSelector} from '../flashcards/PdfCropSelector'
import {ImageOcclusionEditor} from '../flashcards/ImageOcclusionEditor'

type Records = Record<string, ReviewRecord>

function readRecords(): Records {
  try {
    const raw = JSON.parse(storageScope().getItem('corpus-practice-v1') || '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return Object.fromEntries(Object.entries(raw).filter(([_, v]) => validReview(v))) as Records
  } catch {
    return {}
  }
}

export default function MyCoursesWorkspace(props: {
  onOpenAccount?: () => void
  initialDocumentId?: string | null
  initialSectionId?: string | null
  onOpenDocument?: (id: string | null) => void
  onNavigateAtlas?: () => void
}) {
  const account = useAccount()
  const accountStorage = useMemo(storageScope,[account.user?.id])
  const identity=useRef(account.user?.id);identity.current=account.user?.id
  const [overview,setOverview]=useState<LearningOverview>({metadata:[],questions:[],history:[]})
  const [overviewError,setOverviewError]=useState('')
  const refreshOverview=async()=>{const userId=identity.current;try{const value=await fetchLearningOverview();if(identity.current===userId){setOverview(value);setOverviewError('')}}catch{if(identity.current===userId)setOverviewError('Votre activité n’a pas pu être chargée. Réessayez pour afficher une progression à jour.')}}
  const [subject,setSubject]=useState(''),[savingSubject,setSavingSubject]=useState(false)
  const [trainerMode,setTrainerMode]=useState(0)
  const [errorsOnly,setErrorsOnly]=useState(false)
  const loadVersion=useRef(0)
  const [documents, setDocuments] = useState<StudyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [documentLoading,setDocumentLoading]=useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedAlert, setScannedAlert] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadFile,setUploadFile]=useState<{name:string;size:number}|null>(null)
  const uploadLock=useRef(false)
  const [quota, setQuota] = useState<StudyQuota | null>(null)

  // Document Detail
  const [selectedDocId, setSelectedDocId] = useState<string | null>(props.initialDocumentId || null)
  const [currentDoc, setCurrentDoc] = useState<StudyDocument | null>(null)
  const activeDocument=useRef<string|null>(null);activeDocument.current=currentDoc?.id||null
  const [activeTab, setActiveTab] = useState<'summary' | 'questions' | 'sections' | 'practice' | 'reader' | 'weaknesses'>('practice')
  const [questions, setQuestions] = useState<StudyQuestion[]>([])
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [generatingQcm, setGeneratingQcm] = useState(false)
  const [flashReview,setFlashReview]=useState<'generate'|'review'|null>(null)
  const [supportTask,setSupportTask]=useState<SupportTask|null>(null)
  const [supportOptions,setSupportOptions]=useState({count:5,replace:false})
  const generationProvider=useGenerationProvider()
  const [ocrRequested,setOcrRequested]=useState(false)
  const [generationRequest,setGenerationRequest]=useState(0)
  const [visualCropDoc, setVisualCropDoc] = useState<StudyDocument | null>(null)
  const [cropResult, setCropResult] = useState<{
    blob: Blob
    pageNumber: number
    crop: {x: number; y: number; width: number; height: number} | null
  } | null>(null)
  const [studyDecks, setStudyDecks] = useState<FlashcardDeck[]>([])

  const openVisualCrop = async (doc: StudyDocument) => {
    const userId=identity.current
    try {
      const d = await listDecks()
      if(userId!==identity.current||activeDocument.current!==doc.id)return
      setStudyDecks(d)
    } catch {
      // best effort
    }
    if(userId===identity.current&&activeDocument.current===doc.id)setVisualCropDoc(doc)
  }

  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // In-session practice state
  const [records, setRecords] = useState<Records>(readRecords)
  const recordsRef=useRef(records);recordsRef.current=records
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const refreshList = async () => {
    try {
      setLoading(true)
      setError(null)
      const userId=identity.current
      const docs = await fetchStudyDocuments()
      if(userId!==identity.current)return
      setDocuments(docs)
      const q = await fetchStudyQuotas()
      setQuota(q)
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos cours.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVersion.current++;setDocumentLoading(false);setCurrentDoc(null);setSelectedDocId(props.initialDocumentId||null);setDocuments([]);setQuota(null);setQuestions([]);setFlashReview(null);setSupportTask(null);setVisualCropDoc(null);setCropResult(null);setRecords(readRecords());setOverview({metadata:[],questions:[],history:[]})
    if(account.user){void refreshList();void refreshOverview()}else setLoading(false)
  }, [account.user?.id])

  useEffect(() => {
    if (selectedDocId&&account.user) {
      loadDoc(selectedDocId)
    } else {
      loadVersion.current++;setDocumentLoading(false);setCurrentDoc(null)
      setQuestions([])
    }
  }, [selectedDocId,account.user?.id])

  useEffect(()=>{if(!currentDoc||!props.initialSectionId)return;setActiveTab('sections');requestAnimationFrame(()=>document.getElementById('study-section-'+props.initialSectionId)?.scrollIntoView({behavior:'smooth',block:'center'}))},[currentDoc?.id,props.initialSectionId])

  const loadDoc = async (id: string) => {
    const userId=identity.current
    const version=++loadVersion.current
    try {
      setDocumentLoading(true);setCurrentDoc(null);setQuestions([]);setError(null)
      setLoading(true)
      const doc = await fetchStudyDocument(id)
      if(userId!==identity.current)return
      const qList = await fetchDocumentQuestions(id)
      if(userId!==identity.current)return
      if(version!==loadVersion.current)return
      setCurrentDoc(doc);setErrorsOnly(false);setQuestions(qList);setActiveTab(props.initialSectionId?'sections':'practice')
      setSubject(overview.metadata.find(m=>m.documentId===id)?.subject||'')
      void updateLearningDocument(id,{opened:true}).then(refreshOverview).catch(()=>setOverviewError('La dernière consultation n’a pas pu être enregistrée.'))
    } catch (err: any) {
      if(userId!==identity.current||version!==loadVersion.current)return
      setError(err.message || 'Impossible de charger ce document.')
      setSelectedDocId(null)
      props.onOpenDocument?.(null)
    } finally {
      if(version===loadVersion.current){setLoading(false);setDocumentLoading(false)}
    }
  }

  const handleFileUpload = async (file: File) => {
    if(uploadLock.current)return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Le fichier dépasse la taille maximale autorisée de 25 Mo.')
      return
    }
    const userId=identity.current
    try {
      uploadLock.current=true
      setUploadFile({name:file.name,size:file.size})
      setUploading(true)
      setError(null)
      setScannedAlert(null)
      const doc = await uploadStudyDocument(file,undefined,{ocr:ocrRequested})
      if(userId!==identity.current)return
      await refreshList()
      if(userId!==identity.current)return
      setSelectedDocId(doc.id)
      setToast('Document importé')
      props.onOpenDocument?.(doc.id)
    } catch (err: any) {
      if (err.scanned || err.code === 'ERR_NO_EXTRACTABLE_TEXT') {
        setScannedAlert(err.message)
      } else {
        setError(err.message || 'Échec de l’importation du fichier.')
      }
    } finally {
      uploadLock.current=false
      setUploading(false)
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce cours et toutes ses questions générées ?')) return
    try {
      await deleteStudyDocument(id)
      if (selectedDocId === id) {
        setSelectedDocId(null)
        props.onOpenDocument?.(null)
      }
      await refreshList()
      setToast('Cours supprimé')
    } catch (err: any) {
      console.error('Suppression du document',err)
      setError('Impossible de supprimer ce cours. Il reste disponible. Réessayez dans quelques instants.')
    }
  }

  const handleGenerateSummary = async () => {
    if (!currentDoc) return
    if(generationProvider?.mode==='gemini'){setSupportTask('summary');return}
    const userId=identity.current,documentId=currentDoc.id
    try {
      setError(null)
      setGeneratingSummary(true)
      const summary = await generateDocumentSummary(currentDoc.id)
      if(userId!==identity.current||activeDocument.current!==documentId)return
      setCurrentDoc(prev => prev?.id===documentId ? { ...prev, summary, hasSummary: true } : prev)
      setActiveTab('summary')
      setToast('Synthèse générée')
    } catch (err: any) {
      console.error('Génération de la synthèse',err)
      setError('Impossible de générer la synthèse. Votre cours reste disponible. Réessayez dans quelques instants.')
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleGenerateQuestions = async (count = 5, replace = false) => {
    if (!currentDoc) return
    if (replace && questions.length > 0 && !window.confirm('Remplacer tous les QCM existants de ce cours par une nouvelle série ?')) return
    if(generationProvider?.mode==='gemini'){setSupportOptions({count,replace});setSupportTask('questions');return}

    const userId=identity.current,documentId=currentDoc.id
    try {
      setError(null)
      setGeneratingQcm(true)
      await generateDocumentQuestions(currentDoc.id, count, undefined, replace)
      const refreshed=await fetchDocumentQuestions(currentDoc.id)
      if(userId!==identity.current||activeDocument.current!==documentId)return
      setQuestions(refreshed)
      if (replace) {
        }
      setActiveTab('questions')
      setToast('QCM généré')
    } catch (err: any) {
      console.error('Génération des questions',err)
      setError('Impossible de générer les questions. Votre cours reste disponible. Réessayez dans quelques instants.')
    } finally {
      setGeneratingQcm(false)
    }
  }

  // SRS & Practice save
  const saveAnswers = (items: StudyQuestion[], answers: Record<string, number[]>) => {
    const next = { ...recordsRef.current }
    const stamp = Date.now()
    for (const q of items) {
      next[q.id] = nextReview(next[q.id], isCorrect(q, answers[q.id] ?? []), stamp)
    }
    try {
      accountStorage.setItem('corpus-practice-v1', JSON.stringify(next))
    } catch { /* storage scope */ }
    recordsRef.current=next;setRecords(next)
  }

  const startPractice = () => {setErrorsOnly(false);setTrainerMode(value=>value+1);setActiveTab('practice')}

  if(documentLoading&&selectedDocId&&account.user&&!currentDoc)return <section className="study-workspace mycourses-workspace" role="status">Chargement du cours et de ses questions…</section>

  if (!account.user) {
    return (
      <section className="study-workspace mycourses-workspace" aria-label="Mes cours MyCorpus Study">
        <header className="mycourses-header">
          <div>
            <span className="study-eyebrow">MYCORPUS STUDY · ESPACE PERSONNEL</span>
            <h1>Mes cours.<br /><em>Apprendre. S’entraîner. Maîtriser.</em></h1>
            <p className="mycourses-subtitle">
              Importez vos PDF, testez vos connaissances et retrouvez vos lacunes avec des corrections reliées au cours original.
            </p>
          </div>
        </header>
        <div className="mycourses-alert mycourses-alert-warning">
          <AlertCircle size={22} />
          <div>
            <strong>Connexion nécessaire pour importer vos cours</strong>
            <p>
              Les documents et questions générées sont sauvegardés de manière confidentielle et isolée dans votre espace étudiant.
              Connectez-vous à votre compte ou créez-en un gratuitement en quelques secondes depuis votre espace Compte.
            </p><button className="study-primary" onClick={props.onOpenAccount}>Se connecter</button>
          </div>
        </div>
      </section>
    )
  }

  // --- Document Detail View ---
  if (currentDoc) {
    return (
      <section className="study-workspace mycourses-workspace mycourses-detail" aria-label={`Détail du cours : ${currentDoc.title}`}>
        <div className="mycourses-breadcrumb">
          <button onClick={() => { setSelectedDocId(null); props.onOpenDocument?.(null) }}>
            <ArrowLeft size={16} /> Revenir à Mes cours
          </button>
          <span>/</span>
          <span>{currentDoc.title}</span>
        </div>

        {error&&<div className="mycourses-alert mycourses-alert-error" role="alert"><AlertCircle size={20}/><p>{error}</p><button className="icon-button" aria-label="Fermer le message" onClick={()=>setError(null)}><X size={18}/></button></div>}
        {currentDoc.extraction?.warnings.length? <details className="mycourses-alert"><summary>Points à vérifier dans l’extraction ({currentDoc.extraction.warnings.length})</summary><ul>{currentDoc.extraction.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></details>:null}
        <GenerationNotice provider={generationProvider}/>
        <header className="mycourses-detail-hero">
          <div>
            <span className="study-eyebrow">SUPPORT IMPORTÉ · {currentDoc.filename}</span>
            <h1>{currentDoc.title}</h1>
            <div className="mycourses-detail-meta">
              <span><FileText size={15} /> {currentDoc.pageCount} pages</span>
              <span><Layers size={15} /> {currentDoc.sections?.length || currentDoc.sectionCount} chapitres détectés</span>
              <span><Clock3 size={15} /> {questions.length} questions générées</span>
            </div>
          </div>

          <details className="learning-tools"><summary>Outils du cours · Flashcards, QCM et synthèse</summary><div className="mycourses-action-bar">
            <a className="mycourses-action-btn" href={`/api/study/documents/${encodeURIComponent(currentDoc.id)}/pdf`} download={currentDoc.filename}>Télécharger le PDF original</a>
            <button className="mycourses-action-btn mycourses-action-primary" onClick={()=>{setFlashReview('generate');setGenerationRequest(value=>value+1)}}><Sparkles size={16}/>Générer des flashcards</button>
            <button className="mycourses-action-btn" onClick={()=>setFlashReview('review')}>Réviser les brouillons</button>
            <button className="mycourses-action-btn" onClick={()=>{setSupportOptions({count:5,replace:false});setSupportTask('summary')}} title="Synthèse, fiche de révision ou QCM à relire et modifier avant enregistrement">Préparer un support à relire</button>
            {currentDoc.summary&&activeTab==='summary'&&<DownloadPdfButton title={currentDoc.title} selector=".mycourses-summary-content" label="Exporter la synthèse en PDF" className="mycourses-action-btn"/>}
            <button className="mycourses-action-btn mycourses-action-secondary" onClick={()=>void openVisualCrop(currentDoc)} title="Créer une flashcard d’occlusion d’image à partir d’une page de ce PDF"><Crop size={16}/>Flashcard visuelle</button>
            {!currentDoc.summary ? (
              <button
                className="mycourses-action-btn mycourses-action-primary"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
              >
                <Sparkles size={16} />
                {generatingSummary ? 'Génération de la synthèse…' : 'Générer la synthèse'}
              </button>
            ) : (
              <button
                className="mycourses-action-btn mycourses-action-secondary"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                title="Régénérer la synthèse"
              >
                <RefreshCw size={15} />
                {generatingSummary ? 'Actualisation…' : 'Actualiser synthèse'}
              </button>
            )}

            <button
              className="mycourses-action-btn mycourses-action-primary"
              onClick={() => handleGenerateQuestions(5)}
              disabled={generatingQcm}
            >
              <FileCheck size={16} />
              {generatingQcm ? 'Génération QCM…' : 'Générer QCM (+5)'}
            </button>

            {questions.length > 0 && (
              <button
                className="mycourses-action-btn mycourses-action-secondary"
                onClick={() => startPractice()}
              >
                <BookOpen size={16} />
                S’entraîner
              </button>
            )}



            <button
              className="mycourses-btn-delete"
              onClick={() => handleDelete(currentDoc.id)}
              title="Supprimer ce cours"
            >
              <Trash2 size={18} />
            </button>
          </div></details>
        </header>
        <form className="learning-organisation" onSubmit={async event=>{event.preventDefault();if(savingSubject)return;setSavingSubject(true);try{await updateLearningDocument(currentDoc.id,{subject});await refreshOverview();setToast('Matière enregistrée')}catch(e){setError((e as Error).message)}finally{setSavingSubject(false)}}}><label>Matière<input value={subject} onChange={event=>setSubject(event.target.value)} maxLength={100} placeholder="Ex. Biologie cellulaire"/></label><button className="study-secondary" disabled={savingSubject}>{savingSubject?'Enregistrement…':'Enregistrer la matière'}</button></form>

        {/* Tab navigation */}
        <nav className="mycourses-tabs" aria-label="Vues du cours">
          <button aria-pressed={activeTab==='reader'} className={`mycourses-tab ${activeTab==='reader'?'active':''}`} onClick={()=>setActiveTab('reader')}>Apprendre · PDF</button>
          <button aria-pressed={activeTab==='practice'} className={`mycourses-tab ${activeTab==='practice'?'active':''}`} onClick={()=>setActiveTab('practice')}>S’entraîner · Interroge-moi</button>
          <button aria-pressed={activeTab==='weaknesses'} className={`mycourses-tab ${activeTab==='weaknesses'?'active':''}`} onClick={()=>setActiveTab('weaknesses')}>Maîtriser · Mes lacunes</button>
        </nav>
        <details className="learning-secondary-tabs" open={['summary','questions','sections'].includes(activeTab)||undefined}><summary>Supports et texte extrait</summary><nav className="mycourses-tabs" aria-label="Supports complémentaires">
          <button
            className={`mycourses-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Synthèse {currentDoc.summary ? '✓' : ''}
          </button>
          <button
            className={`mycourses-tab ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            QCM générés ({questions.length})
          </button>
          <button
            className={`mycourses-tab ${activeTab === 'sections' ? 'active' : ''}`}
            onClick={() => setActiveTab('sections')}
          >
            Découpage ({currentDoc.sections?.length || currentDoc.sectionCount} sections)
          </button>
        </nav></details>

        {/* Tab 1: Structured Summary */}
        {activeTab === 'summary' && (
          <div className="mycourses-summary-content">
            {currentDoc.summary ? (
              <div>
                <p className="intro-text" style={{ marginBottom: '1.5rem' }}>
                  {currentDoc.summary.overview}
                </p>
                {currentDoc.summary.generation&&<GenerationNotice generation={currentDoc.summary.generation}/>}
                {currentDoc.summary.chapters.map((chapter,index)=><SummaryChapter key={chapter.id||index} chapter={chapter} index={index} paragraphs={currentDoc.summary?.kind==='summary'}/>)}

              </div>
            ) : (
              <div className="mycourses-summary-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <Sparkles size={36} color="#0284c7" style={{ margin: '0 auto 1rem' }} />
                <h3>Aucune synthèse générée pour l’instant</h3>
                <p style={{ color: '#64748b', maxWidth: 450, margin: '0.5rem auto 1.5rem' }}>
                  MyCorpus Study peut analyser les chapitres de votre cours et en extraire une synthèse structurée strictement fidèle au texte.
                </p>
                <button
                  className="mycourses-action-btn mycourses-action-primary"
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                >
                  <Sparkles size={16} />
                  {generatingSummary ? 'Génération en cours…' : 'Générer la synthèse structurée'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Generated Questions & Source Traceability */}
        {activeTab === 'questions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <p style={{ margin: 0, color: '#64748b' }}>
                {questions.length} questions issues de ce document. Chaque question est liée à son extrait source.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>

                <button
                  className="mycourses-action-btn mycourses-action-primary"
                  onClick={() => handleGenerateQuestions(5)}
                  disabled={generatingQcm}
                >
                  <FileCheck size={16} /> {generatingQcm ? 'Génération…' : 'Générer +5 QCM'}
                </button>
                {questions.length > 0 && (
                  <button
                    className="mycourses-action-btn mycourses-action-secondary"
                    onClick={() => handleGenerateQuestions(Math.min(Math.max(questions.length, 5), 20), true)}
                    disabled={generatingQcm}
                    title="Supprimer les QCM actuels puis générer une nouvelle série"
                  >
                    <RefreshCw size={15} /> Remplacer les QCM
                  </button>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="mycourses-summary-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <FileCheck size={36} color="#0284c7" style={{ margin: '0 auto 1rem' }} />
                <h3>Aucune question générée pour ce cours</h3>
                <p style={{ color: '#64748b', maxWidth: 450, margin: '0.5rem auto 1.5rem' }}>
                  Générez une série de questions d’entraînement à choix multiples directement basées sur les pages de votre document.
                </p>
                <button
                  className="mycourses-action-btn mycourses-action-primary"
                  onClick={() => handleGenerateQuestions(5)}
                  disabled={generatingQcm}
                >
                  <FileCheck size={16} /> Générer 5 questions
                </button>
              </div>
            ) : (
              <><button className="study-primary" onClick={startPractice}>Travailler ces QCM</button>{questions.map((q,idx)=><article key={q.id} className="mycourses-question-item"><span className="study-eyebrow">QUESTION {idx+1} · {q.sourceEvidence?.page?`PAGE ${q.sourceEvidence.page}`:'PAGE EXACTE NON CONFIRMÉE'}</span><h3>{q.prompt}</h3><p>{q.sourceEvidence?.verified?'Citation retrouvée dans votre cours.':'Source non vérifiée : cette question est exclue des interrogations.'}</p></article>)}</>
            )}
          </div>
        )}

        {/* Tab 3: Detected Sections */}
        {activeTab === 'sections' && (
          <div>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Le découpage automatique identifie les chapitres et les sections à partir de la structure de votre cours.
            </p>
            {(currentDoc.sections || []).map((sec, idx) => <ExtractedSection key={sec.id} section={sec} index={idx}/>)}
          </div>
        )}

        {activeTab==='reader'&&<CourseReader key={currentDoc.id} document={currentDoc}/>}
        {activeTab==='practice'&&<CourseTrainer key={currentDoc.id+'-'+trainerMode} document={currentDoc} questions={questions} records={records} initialMode={errorsOnly?'errors':'adaptive'} onQuestions={items=>{if(identity.current===account.user?.id&&activeDocument.current===currentDoc.id)setQuestions(items)}} onAnswer={(q,answers)=>{if(identity.current===account.user?.id)saveAnswers([q],{[q.id]:answers})}} onActivity={()=>void refreshOverview()}/>}
        {activeTab==='weaknesses'&&<CourseWeaknesses document={currentDoc} questions={questions} records={records} onPractice={()=>{setErrorsOnly(true);setTrainerMode(value=>value+1);setActiveTab('practice')}}/>}

        {visualCropDoc && (
          <PdfCropSelector
            documentId={visualCropDoc.id}
            documentTitle={visualCropDoc.title}
            onSelectCrop={({ blob, pageNumber, crop }) => {
              setVisualCropDoc(null)
              setCropResult({ blob, pageNumber, crop })
            }}
            onCancel={() => setVisualCropDoc(null)}
          />
        )}
        {cropResult && currentDoc && (
          <ImageOcclusionEditor
            imageSrc={URL.createObjectURL(cropResult.blob)}
            imageBlob={cropResult.blob}
            defaultDeckId={studyDecks[0]?.id || ''}
            decks={studyDecks}
            sourceMetadata={{
              sourceKind: 'study_document',
              sourceDocumentId: currentDoc.id,
              sourcePage: cropResult.pageNumber,
              sourceCrop: cropResult.crop || undefined,
            }}
            initialSubject={currentDoc.title}
            initialChapter={currentDoc.title}
            onCreated={note => {
              setCropResult(null)
              setToast(`Note d'occlusion créée avec succès (${note.cards?.length || 1} carte(s))`)
            }}
            onCancel={() => setCropResult(null)}
          />
        )}
        {flashReview&&currentDoc&&<ReviewWorkspace key={currentDoc.id} document={currentDoc} initialGenerate={flashReview==='generate'} generationRequest={generationRequest} onClose={()=>setFlashReview(null)}/>}
        {supportTask&&currentDoc&&<SupportPreview document={currentDoc} task={supportTask} count={supportOptions.count} replace={supportOptions.replace} onClose={()=>setSupportTask(null)} onSaved={task=>{setToast(task==='questions'?'QCM relus enregistrés':'Support relu enregistré');void loadDoc(currentDoc.id)}}/>}
        {toast&&<div className="flash-toast" role="status"><Check size={16}/><span>{toast}</span></div>}
      </section>
    )
  }

  // --- Dashboard View (List of courses + Upload) ---
  return (
    <section className="study-workspace mycourses-workspace" aria-label="Mes cours MyCorpus Study">
      <header className="mycourses-header">
        <div>
          <span className="study-eyebrow">MYCORPUS STUDY · VOS DOCUMENTS PERSONNELS</span>
          <h1>Mes cours.</h1>
          <p className="mycourses-subtitle">
            Votre espace de révision active : des questions sur vos PDF, des corrections sourcées et une progression fondée sur vos réponses.
          </p>
        </div>

        {quota && (
          <div className="mycourses-quota-badge">
            <FileCheck size={16} />
            <span>{documents.length} / {quota.maxDocuments} cours enregistrés</span>
          </div>
        )}
      </header>

      <button className="study-secondary learning-import-shortcut" disabled={uploading} onClick={()=>fileInputRef.current?.click()}><Upload size={17}/>Importer un PDF</button>
      <ol className="mycourses-workflow" aria-label="De votre cours à la révision">{['Apprendre','S’entraîner','Maîtriser'].map((step,index)=><li key={step}><span>{index+1}</span>{step}</li>)}</ol>
      {overviewError?<div className="mycourses-alert mycourses-alert-error" role="alert"><p>{overviewError}</p><button className="study-secondary" onClick={()=>void refreshOverview()}>Recharger ma progression</button></div>:!loading&&<CourseLearningDashboard documents={documents} overview={overview} records={records} onImport={()=>fileInputRef.current?.click()} onOpen={id=>{setSelectedDocId(id);props.onOpenDocument?.(id)}}/>}
      {/* Scanned PDF warning alert */}
      {scannedAlert && (
        <div className="mycourses-alert mycourses-alert-error" role="alert">
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <strong>Document numérisé ou image non pris en charge</strong>
            <p>{scannedAlert}</p>
          </div>
          <button
            onClick={() => setScannedAlert(null)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* General error alert */}
      {error && (
        <div className="mycourses-alert mycourses-alert-error" role="alert">
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div>{error}</div>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload card */}
      <section
        className={`mycourses-upload-card ${dragOver ? 'is-dragover' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFileUpload(file)
        }}
      >
        <div className="mycourses-upload-icon">
          <Upload size={26} />
        </div>
        <h2 className="mycourses-upload-title">Ajoutez votre cours</h2>
        <p className="mycourses-upload-desc">
          Glissez-déposez votre support de cours ou sélectionnez un fichier PDF contenant du texte sélectionnable (jusqu’à 25 Mo).
        </p>

        <ul className="mycourses-import-benefits"><li><Check size={15}/>Comprendre votre cours</li><li><Check size={15}/>Créer des QCM</li><li><Check size={15}/>Générer des flashcards</li></ul>
        {generationProvider?.mode==='gemini'&&<label><input type="checkbox" checked={ocrRequested} disabled={uploading} onChange={event=>setOcrRequested(event.target.checked)}/>Transcrire aussi les pages scannées avec Gemini (40 pages / 10 Mo maximum). Le PDF sera transmis à Google.</label>}
        {uploadFile&&<div className="mycourses-upload-status" role="status"><strong>{uploadFile.name}</strong><span>{new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(uploadFile.size/1024)} Ko · extraction en cours</span><progress aria-label="Extraction du PDF"/><small>Votre document s’ouvrira quand l’extraction sera terminée.</small></div>}
        <div className="mycourses-upload-controls">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
          />
          <button
            className="mycourses-file-btn"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={17} />
            {uploading ? 'Extraction du texte…' : 'Choisir un PDF'}
          </button>
        </div>
      </section>

      {/* List of uploaded documents */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 600, margin: 0 }}>Vos cours enregistrés</h2>
        <span style={{ color: '#64748b', fontSize: '0.88rem' }}>{documents.length} document{documents.length > 1 ? 's' : ''}</span>
      </div>

      {loading && documents.length === 0 ? (
<p className="mc-loading" role="status">Chargement de vos cours…</p>
      ) : documents.length === 0 ? (
        <div className="mycourses-summary-card" style={{ textAlign: 'center', padding: '1.5rem' }}>

          <h3>Aucun cours pour le moment</h3>
          <p style={{ color: '#64748b', maxWidth: 450, margin: '0.5rem auto' }}>
            Votre bibliothèque est prête à accueillir votre premier PDF.
          </p><button className="study-secondary" disabled={uploading} onClick={()=>fileInputRef.current?.click()}>Ajouter mon premier cours</button>
        </div>
      ) : (
        <div className="mycourses-grid">
          {documents.map(doc => (
            <article key={doc.id} className="mycourses-card">
              <div>
                <div className="mycourses-card-header">
                  <div className="mycourses-card-icon">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="mycourses-card-title">{doc.title}</h3>
                    <div className="mycourses-card-meta">
                      {doc.filename} · {doc.pageCount} pages
                    </div>
                  </div>
                </div>

                <div className="mycourses-card-badges">
                  <span className="mycourses-badge">
                    <Layers size={12} /> {doc.sectionCount} chapitres
                  </span>
                  {doc.hasSummary && (
                    <span className="mycourses-badge mycourses-badge-success">
                      <Sparkles size={12} /> Synthèse prête
                    </span>
                  )}
                  {doc.questionCount > 0 && (
                    <span className="mycourses-badge mycourses-badge-success">
                      <FileCheck size={12} /> {doc.questionCount} QCM
                    </span>
                  )}
                </div>
              </div>

              <div className="mycourses-card-actions">
                <button
                  className="mycourses-btn-open"
                  onClick={() => {
                    setSelectedDocId(doc.id)
                    props.onOpenDocument?.(doc.id)
                  }}
                >
                  Ouvrir ce cours <ArrowRight size={15} />
                </button>
                <button
                  className="mycourses-btn-delete"
                  onClick={() => handleDelete(doc.id)}
                  title="Supprimer ce document"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {toast&&<div className="flash-toast" role="status"><Check size={16}/><span>{toast}</span></div>}
    </section>
  )
}
