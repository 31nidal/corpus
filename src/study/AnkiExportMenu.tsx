import {useState} from 'react'
import {Download,Layers3,X} from 'lucide-react'
import type {Course} from './curriculum'
import {questions} from './questions'
import {ankiFilename,buildAnkiCsv,downloadAnkiCsv,isDifficult,parseReviewRecords,selectAnkiQuestions,type AnkiExportMode} from './ankiExport'

type StorageReader={getItem:(key:string)=>string|null}

export default function AnkiExportMenu({course,storage}:{course:Course;storage:StorageReader}){
 const [open,setOpen]=useState(false),[notice,setNotice]=useState('')
 const courseQuestions=questions.filter(question=>question.course===course.id)
 const records=parseReviewRecords(storage.getItem('corpus-practice-v1'),courseQuestions)
 const errors=courseQuestions.filter(question=>records[question.id]?.wrong).length
 const difficult=courseQuestions.filter(question=>isDifficult(records[question.id])).length
 const run=(mode:AnkiExportMode)=>{const selected=selectAnkiQuestions(courseQuestions,records,mode);if(!selected.length){setNotice(mode==='errors'?'Vous n’avez aucune erreur enregistrée pour ce cours.':'Aucune notion difficile n’est encore identifiée pour ce cours.');return}downloadAnkiCsv(buildAnkiCsv(course,selected),ankiFilename(course,mode));setNotice(`${selected.length} carte${selected.length>1?'s':''} de révision exportée${selected.length>1?'s':''}, plus une carte d’information.`)}
 return <div className="anki-export"><button className="export-course" type="button" aria-expanded={open} onClick={()=>{setOpen(value=>!value);setNotice('')}}><Download size={15}/>Exporter vers Anki</button>{open&&<div className="anki-export-menu"><div className="anki-export-heading"><span><Layers3 size={17}/><strong>Créer un fichier Anki</strong></span><button aria-label="Fermer l’export Anki" onClick={()=>setOpen(false)}><X size={16}/></button></div><p>CSV UTF-8 prêt à importer dans Anki. Choisissez le type de cartes à inclure.</p><button onClick={()=>run('course')}><span><strong>Tout le cours</strong><small>{courseQuestions.length} cartes</small></span></button><button onClick={()=>run('errors')}><span><strong>Mes erreurs uniquement</strong><small>{errors?`${errors} carte${errors>1?'s':''}`:'Aucune erreur enregistrée'}</small></span></button>{difficult>0&&<button onClick={()=>run('difficult')}><span><strong>Mes notions difficiles</strong><small>{difficult} carte{difficult>1?'s':''} · moins de 70 % de réussite après 3 essais</small></span></button>}{notice&&<p className="anki-export-notice" role="status">{notice}</p>}<small className="anki-export-help">Dans Anki : Fichier → Importer. Les colonnes sont Recto, Verso, Tags et NotionId ; le HTML et les tags sont déclarés automatiquement.</small></div>}</div>
}
