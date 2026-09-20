import { useState, useEffect, useRef } from 'react'
import {
  FileText, Upload, Trash2, ArrowRight, ArrowLeft, BookOpen,
  CheckCircle2, Sparkles, Download, AlertCircle, RefreshCw,
  FileCheck, Clock3, Layers, Quote, X, Check
} from 'lucide-react'
import type { StudyDocument, StudyQuota, StudyQuestion } from './myCoursesTypes'
import {
  fetchStudyDocuments, fetchStudyDocument, uploadStudyDocument,
  deleteStudyDocument, generateDocumentSummary, generateDocumentQuestions,
  fetchDocumentQuestions, fetchStudyQuotas
} from './myCoursesApi'
import { storageScope, useAccount } from '../account/store'
import { isCorrect } from './questions'
import { nextReview, validReview, type ReviewRecord } from './reviewSchedule'
import { buildDocumentAnkiCsv, downloadAnkiCsv, documentAnkiFilename } from './ankiExport'
import './myCourses.css'
import GenerationDialog from '../flashcards/GenerationDialog'
import type{GenerationSource}from'../flashcards/flashcardsTypes'

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
  initialDocumentId?: string | null
  initialSectionId?: string | null
  onOpenDocument?: (id: string | null) => void
  onNavigateAtlas?: () => void
}) {
  const account = useAccount()
  const [accountStorage] = useState(storageScope)
  const [documents, setDocuments] = useState<StudyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scannedAlert, setScannedAlert] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [quota, setQuota] = useState<StudyQuota | null>(null)

  // Document Detail
  const [selectedDocId, setSelectedDocId] = useState<string | null>(props.initialDocumentId || null)
  const [currentDoc, setCurrentDoc] = useState<StudyDocument | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'questions' | 'sections' | 'practice'>('summary')
  const [questions, setQuestions] = useState<StudyQuestion[]>([])
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [generatingQcm, setGeneratingQcm] = useState(false)
  const [targetPassage, setTargetPassage] = useState<{ title: string; pages: string; text: string } | null>(null)
  const [flashGeneration,setFlashGeneration]=useState<GenerationSource|null>(null)

  // In-session practice state
  const [records, setRecords] = useState<Records>(readRecords)
  const [practiceSession, setPracticeSession] = useState<{
    items: StudyQuestion[]
    index: number
    answers: Record<string, number[]>
    validated: string[]
    done: boolean
    started: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const refreshList = async () => {
    try {
      setLoading(true)
      setError(null)
      const docs = await fetchStudyDocuments()
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
    refreshList()
  }, [account.user?.id])

  useEffect(() => {
    if (selectedDocId) {
      loadDoc(selectedDocId)
    } else {
      setCurrentDoc(null)
      setQuestions([])
      setPracticeSession(null)
    }
  }, [selectedDocId])

  useEffect(()=>{if(!currentDoc||!props.initialSectionId)return;setActiveTab('sections');requestAnimationFrame(()=>document.getElementById('study-section-'+props.initialSectionId)?.scrollIntoView({behavior:'smooth',block:'center'}))},[currentDoc?.id,props.initialSectionId])

  const loadDoc = async (id: string) => {
    try {
      setLoading(true)
      const doc = await fetchStudyDocument(id)
      setCurrentDoc(doc)
      const qList = await fetchDocumentQuestions(id)
      setQuestions(qList)
      if (doc.summary) {
        setActiveTab('summary')
      } else if (qList.length > 0) {
        setActiveTab('questions')
      } else {
        setActiveTab('sections')
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger ce document.')
      setSelectedDocId(null)
      props.onOpenDocument?.(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Seuls les fichiers PDF sont acceptés.')
      return
    }
    try {
      setUploading(true)
      setError(null)
      setScannedAlert(null)
      const doc = await uploadStudyDocument(file)
      await refreshList()
      setSelectedDocId(doc.id)
      props.onOpenDocument?.(doc.id)
    } catch (err: any) {
      if (err.scanned || err.code === 'ERR_NO_EXTRACTABLE_TEXT') {
        setScannedAlert(err.message)
      } else {
        setError(err.message || 'Échec de l’importation du fichier.')
      }
    } finally {
      setUploading(false)
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
      refreshList()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.')
    }
  }

  const handleGenerateSummary = async () => {
    if (!currentDoc) return
    try {
      setGeneratingSummary(true)
      const summary = await generateDocumentSummary(currentDoc.id)
      setCurrentDoc(prev => prev ? { ...prev, summary, hasSummary: true } : null)
      setActiveTab('summary')
    } catch (err: any) {
      alert(err.message || 'Échec de la génération de la synthèse.')
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleGenerateQuestions = async (count = 5) => {
    if (!currentDoc) return
    try {
      setGeneratingQcm(true)
      const newQ = await generateDocumentQuestions(currentDoc.id, count)
      setQuestions(prev => [...newQ, ...prev])
      setActiveTab('questions')
    } catch (err: any) {
      alert(err.message || 'Échec de la génération du QCM.')
    } finally {
      setGeneratingQcm(false)
    }
  }

  // SRS & Practice save
  const saveAnswers = (items: StudyQuestion[], answers: Record<string, number[]>) => {
    const next = { ...records }
    const stamp = Date.now()
    for (const q of items) {
      next[q.id] = nextReview(next[q.id], isCorrect(q, answers[q.id] ?? []), stamp)
    }
    try {
      accountStorage.setItem('corpus-practice-v1', JSON.stringify(next))
    } catch { /* storage scope */ }
    setRecords(next)
  }

  const startPractice = (itemsToPractice = questions) => {
    if (!itemsToPractice.length) return
    setPracticeSession({
      items: itemsToPractice,
      index: 0,
      answers: {},
      validated: [],
      done: false,
      started: Date.now()
    })
    setActiveTab('practice')
  }

  const handleExportAnki = (mode: 'course' | 'errors' = 'course') => {
    if (!currentDoc || !questions.length) return
    const csv = buildDocumentAnkiCsv(currentDoc.title, currentDoc.filename, questions, mode, records)
    const filename = documentAnkiFilename(currentDoc.title, mode)
    downloadAnkiCsv(csv, filename)
  }

  const wrongQuestions = questions.filter(q => records[q.id]?.wrong)

  if (!account.user) {
    return (
      <section className="study-workspace mycourses-workspace" aria-label="Mes cours MyCorpus Study">
        <header className="mycourses-header">
          <div>
            <span className="study-eyebrow">MYCORPUS STUDY · ESPACE PERSONNEL</span>
            <h1>Mes cours.<br /><em>Vos supports, prêts à être mémorisés.</em></h1>
            <p className="mycourses-subtitle">
              Transformez vos cours magistraux, polycopiés et présentations PDF en synthèses structurées,
              QCM d’entraînement et cartes Anki directement exploitables.
            </p>
          </div>
        </header>
        <div className="mycourses-alert mycourses-alert-warning">
          <AlertCircle size={22} />
          <div>
            <strong>Connexion nécessaire pour importer vos cours</strong>
            <p>
              Les documents et questions générées sont sauvegardés de manière confidentielle et isolée dans votre espace étudiant.
              Connectez-vous à votre compte ou créez-en un gratuitement en quelques secondes via le bouton « Compte » en haut à droite.
            </p>
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

          <div className="mycourses-action-bar">
            <button className="mycourses-action-btn mycourses-action-primary" onClick={()=>setFlashGeneration({kind:'study',title:currentDoc.title,documentId:currentDoc.id,pageCount:currentDoc.pageCount,chapter:currentDoc.title,sections:(currentDoc.sections||[]).map(section=>({id:section.id,title:section.title,startPage:section.startPage,endPage:section.endPage}))})}><Sparkles size={16}/>Générer des flashcards</button>
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
                onClick={() => startPractice(questions)}
              >
                <BookOpen size={16} />
                S’entraîner
              </button>
            )}

            {questions.length > 0 && (
              <button
                className="mycourses-action-btn mycourses-action-secondary"
                onClick={() => handleExportAnki('course')}
                title="Exporter toutes les questions vers Anki"
              >
                <Download size={16} />
                Anki (.csv)
              </button>
            )}

            <button
              className="mycourses-btn-delete"
              onClick={() => handleDelete(currentDoc.id)}
              title="Supprimer ce cours"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* Tab navigation */}
        <nav className="mycourses-tabs" aria-label="Vues du cours">
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
          {questions.length > 0 && (
            <button
              className={`mycourses-tab ${activeTab === 'practice' ? 'active' : ''}`}
              onClick={() => {
                if (!practiceSession) startPractice(questions)
                setActiveTab('practice')
              }}
            >
              Entraînement direct
            </button>
          )}
        </nav>

        {/* Tab 1: Structured Summary */}
        {activeTab === 'summary' && (
          <div>
            {currentDoc.summary ? (
              <div>
                <p className="intro-text" style={{ marginBottom: '1.5rem' }}>
                  {currentDoc.summary.overview}
                </p>
                {currentDoc.summary.chapters.map((chap, idx) => (
                  <article key={chap.id || idx} className="mycourses-summary-card">
                    <h3>
                      <span>{idx + 1}. {chap.title}</span>
                      <span>{chap.pages}</span>
                    </h3>
                    <ul className="mycourses-summary-list">
                      {chap.keyPoints.map((pt, pIdx) => (
                        <li key={pIdx}>{pt}</li>
                      ))}
                    </ul>
                  </article>
                ))}
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
                {wrongQuestions.length > 0 && (
                  <button
                    className="mycourses-action-btn mycourses-action-secondary"
                    onClick={() => handleExportAnki('errors')}
                  >
                    Exporter mes erreurs Anki ({wrongQuestions.length})
                  </button>
                )}
                <button
                  className="mycourses-action-btn mycourses-action-primary"
                  onClick={() => handleGenerateQuestions(5)}
                  disabled={generatingQcm}
                >
                  <FileCheck size={16} /> {generatingQcm ? 'Génération…' : 'Générer +5 QCM'}
                </button>
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
              questions.map((q, idx) => (
                <article key={q.id} className="mycourses-question-item">
                  <div className="mycourses-question-header">
                    <div>
                      <span className="study-eyebrow">
                        QUESTION {idx + 1} · PAGES {q.sourcePages?.join('–') || '1'}
                      </span>
                      <strong>{q.prompt}</strong>
                    </div>
                    {q.sourceExcerpt && (
                      <button
                        className="mycourses-source-btn"
                        onClick={() => setTargetPassage({
                          title: q.sourceSectionTitle || currentDoc.title,
                          pages: `Pages ${q.sourcePages?.join('–') || '1'}`,
                          text: q.sourceExcerpt!
                        })}
                      >
                        <Quote size={13} /> Voir le passage source
                      </button>
                    )}
                  </div>
                  <div className="answer-options" style={{ marginTop: '1rem' }}>
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={q.correct.includes(oIdx) ? 'correct-option' : 'incorrect-option'}
                        style={{
                          padding: '0.65rem 1rem',
                          borderRadius: '0.5rem',
                          marginBottom: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          fontSize: '0.92rem'
                        }}
                      >
                        <strong>{String.fromCharCode(65 + oIdx)}</strong>
                        <span style={{ flex: 1 }}>{opt}</span>
                        {q.correct.includes(oIdx) && <Check size={16} color="#059669" />}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.75rem' }}>
                    <strong>Justification :</strong> {q.why[0] || 'Conforme au passage source.'}
                  </p>
                </article>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Detected Sections */}
        {activeTab === 'sections' && (
          <div>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Le découpage automatique identifie les chapitres et les sections à partir de la structure de votre cours.
            </p>
            {(currentDoc.sections || []).map((sec, idx) => (
              <article key={sec.id} id={'study-section-'+sec.id} className="mycourses-summary-card">
                <h3>
                  <span>{idx + 1}. {sec.title}</span>
                  <span>Pages {sec.startPage}–{sec.endPage}</span>
                </h3>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.92rem', color: 'var(--text-color, #334155)' }}>
                  {sec.content.slice(0, 450)}{sec.content.length > 450 ? '…' : ''}
                </p>
              </article>
            ))}
          </div>
        )}

        {/* Tab 4: Interactive Practice Runner */}
        {activeTab === 'practice' && practiceSession && (
          <div className="mycourses-practice-runner">
            {practiceSession.done ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 1rem' }} />
                <h2>Session d’entraînement terminée</h2>
                <p style={{ fontSize: '1.25rem', margin: '0.5rem 0 1.5rem' }}>
                  Score : <strong>{practiceSession.items.filter(q => isCorrect(q, practiceSession.answers[q.id] ?? [])).length}</strong> / {practiceSession.items.length}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {practiceSession.items.some(q => !isCorrect(q, practiceSession.answers[q.id] ?? [])) && (
                    <button
                      className="mycourses-action-btn mycourses-action-primary"
                      onClick={() => startPractice(practiceSession.items.filter(q => !isCorrect(q, practiceSession.answers[q.id] ?? [])))}
                    >
                      Revoir mes erreurs ({practiceSession.items.filter(q => !isCorrect(q, practiceSession.answers[q.id] ?? [])).length})
                    </button>
                  )}
                  <button
                    className="mycourses-action-btn mycourses-action-secondary"
                    onClick={() => startPractice(questions)}
                  >
                    Recommencer la série
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const currentQ = practiceSession.items[practiceSession.index]
                const currAnswers = practiceSession.answers[currentQ.id] ?? []
                const isVal = practiceSession.validated.includes(currentQ.id)

                const toggleOption = (idx: number) => {
                  if (isVal) return
                  const nextAns = currentQ.format === 'boolean' || currentQ.format === 'single'
                    ? [idx]
                    : currAnswers.includes(idx) ? currAnswers.filter(i => i !== idx) : [...currAnswers, idx]
                  setPracticeSession({
                    ...practiceSession,
                    answers: { ...practiceSession.answers, [currentQ.id]: nextAns }
                  })
                }

                const handleValidate = () => {
                  if (isVal) return
                  saveAnswers([currentQ], practiceSession.answers)
                  setPracticeSession({
                    ...practiceSession,
                    validated: [...practiceSession.validated, currentQ.id]
                  })
                }

                const handleNext = () => {
                  if (practiceSession.index >= practiceSession.items.length - 1) {
                    setPracticeSession({ ...practiceSession, done: true })
                  } else {
                    setPracticeSession({ ...practiceSession, index: practiceSession.index + 1 })
                  }
                }

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span className="study-eyebrow">
                        QUESTION {practiceSession.index + 1} / {practiceSession.items.length} · PAGES {currentQ.sourcePages?.join('–') || '1'}
                      </span>
                      {currentQ.sourceExcerpt && (
                        <button
                          className="mycourses-source-btn"
                          onClick={() => setTargetPassage({
                            title: currentQ.sourceSectionTitle || currentDoc.title,
                            pages: `Pages ${currentQ.sourcePages?.join('–') || '1'}`,
                            text: currentQ.sourceExcerpt!
                          })}
                        >
                          <Quote size={13} /> Source
                        </button>
                      )}
                    </div>
                    <h2 style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>{currentQ.prompt}</h2>

                    <div className="answer-options">
                      {currentQ.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          aria-pressed={currAnswers.includes(oIdx)}
                          disabled={isVal}
                          onClick={() => toggleOption(oIdx)}
                        >
                          <span className="option-letter">{String.fromCharCode(65 + oIdx)}</span>
                          <span>{opt}</span>
                          <span className="option-check">{currAnswers.includes(oIdx) && <Check size={15} />}</span>
                        </button>
                      ))}
                    </div>

                    {isVal && (
                      <div className="question-feedback" style={{ marginTop: '1.5rem' }}>
                        <h3>{isCorrect(currentQ, currAnswers) ? '✓ Bonne réponse !' : 'À retravailler'}</h3>
                        <p>{currentQ.why[0] || 'Conforme au cours.'}</p>
                      </div>
                    )}

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                      {!isVal ? (
                        <button
                          className="mycourses-action-btn mycourses-action-primary"
                          disabled={!currAnswers.length}
                          onClick={handleValidate}
                        >
                          Valider ma réponse
                        </button>
                      ) : (
                        <button
                          className="mycourses-action-btn mycourses-action-primary"
                          onClick={handleNext}
                        >
                          {practiceSession.index >= practiceSession.items.length - 1 ? 'Voir le bilan' : 'Question suivante'} <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        )}

        {/* Source Passage Modal */}
        {targetPassage && (
          <div className="mycourses-passage-modal" onClick={() => setTargetPassage(null)}>
            <div className="mycourses-passage-box" onClick={e => e.stopPropagation()}>
              <button className="mycourses-passage-close" onClick={() => setTargetPassage(null)}>
                <X size={20} />
              </button>
              <span className="study-eyebrow">TRAÇABILITÉ MYCORPUS STUDY</span>
              <h2 style={{ fontSize: '1.25rem', margin: '0.25rem 0' }}>{targetPassage.title}</h2>
              <p style={{ color: '#0284c7', fontSize: '0.85rem', fontWeight: 600 }}>{targetPassage.pages}</p>
              <blockquote className="mycourses-passage-quote">
                « {targetPassage.text} »
              </blockquote>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Ce passage provient directement du texte extrait de votre document. Aucune notion extérieure n’a été inventée.
              </p>
            </div>
          </div>
        )}
        {flashGeneration&&<GenerationDialog source={flashGeneration} onClose={()=>setFlashGeneration(null)}/>}</section>
    )
  }

  // --- Dashboard View (List of courses + Upload) ---
  return (
    <section className="study-workspace mycourses-workspace" aria-label="Mes cours MyCorpus Study">
      <header className="mycourses-header">
        <div>
          <span className="study-eyebrow">MYCORPUS STUDY · VOS DOCUMENTS PERSONNELS</span>
          <h1>Mes cours.<br /><em>Vos supports, prêts à être mémorisés.</em></h1>
          <p className="mycourses-subtitle">
            Importez vos polycopiés et diapositives PDF. MyCorpus Study extrait le texte,
            génère des synthèses structurées et crée des QCM interactifs avec traçabilité intégrale vers le support original.
          </p>
        </div>

        {quota && (
          <div className="mycourses-quota-badge">
            <FileCheck size={16} />
            <span>{documents.length} / {quota.maxDocuments} cours enregistrés</span>
          </div>
        )}
      </header>

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
        <h2 className="mycourses-upload-title">Importer un cours PDF</h2>
        <p className="mycourses-upload-desc">
          Glissez-déposez votre support de cours ou sélectionnez un fichier PDF contenant du texte sélectionnable (jusqu’à 25 Mo).
        </p>

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
        <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>Chargement de vos cours…</p>
      ) : documents.length === 0 ? (
        <div className="mycourses-summary-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <FileText size={42} color="#0284c7" style={{ margin: '0 auto 1rem' }} />
          <h3>Aucun cours pour le moment</h3>
          <p style={{ color: '#64748b', maxWidth: 450, margin: '0.5rem auto' }}>
            Importez votre premier document ci-dessus pour démarrer votre révision ciblée.
          </p>
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
    </section>
  )
}
