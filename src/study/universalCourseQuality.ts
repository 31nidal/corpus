import type {Course} from './curriculum'
import type {Question} from './questions'

const prerequisites:Record<string,string[]>={
 Anatomie:['Position anatomique et plans de coupe','Vocabulaire de localisation','Organisation générale du corps'],
 'Biologie cellulaire':['Structure générale d’une cellule','Membrane plasmique','Lien entre structure et fonction'],
 Histologie:['Quatre familles tissulaires','Cellule et matrice extracellulaire','Lecture d’une coupe'],
 Embryologie:['Fécondation et divisions cellulaires','Plans anatomiques','Origine des feuillets'],
 Génétique:['Organisation de l’ADN','Expression d’un gène','Division cellulaire'],
 Chimie:['Unités du système international','Quantité de matière','Lecture d’une équation'],
 Biochimie:['Liaisons chimiques','Groupes fonctionnels','Notion de concentration'],
 Physiologie:['Homéostasie','Gradient et débit','Relation entre structure et fonction'],
 Immunologie:['Cellules sanguines','Récepteurs membranaires','Communication cellulaire'],
 Biophysique:['Unités et conversions','Proportionnalité','Lecture d’un graphique'],
 Biostatistiques:['Fractions et pourcentages','Lecture d’un tableau','Population et échantillon'],
 Pharmacologie:['Récepteurs et signalisation','Concentration et dose','Fonctions rénale et hépatique'],
 'Santé publique':['Population et échantillon','Risque et fréquence','Niveaux de prévention'],
}

const words=(course:Course)=>course.sections.map(s=>s.text+' '+(s.bullets??[]).join(' ')).join(' ').trim().split(/\s+/).filter(Boolean).length

export function finalizeCourseQuality(catalog:Course[]):Course[]{
 return catalog.map(course=>({...course,prerequisites:course.prerequisites??prerequisites[course.category]??['Notions fondamentales du chapitre'],readingMinutes:course.readingMinutes??Math.max(2,Math.ceil(words(course)/180))}))
}

const concise=(text:string,max=220)=>{
 const sentence=text.replace(/\s+/g,' ').trim().match(/^.*?[.!?](?:\s|$)/)?.[0]??text.replace(/\s+/g,' ').trim()
 return sentence.length<=max?sentence:sentence.slice(0,max).replace(/\s+\S*$/,'')+'…'
}
const rotate=<T,>(items:T[],from:number,count=3)=>Array.from({length:Math.min(count,items.length)},(_,i)=>items[(from+i)%items.length])

export function completeQuestionBank(catalog:Course[],existing:Question[],minimum=15):Question[]{
 const result=[...existing]
 for(const course of catalog){
  const own=result.filter(q=>q.course===course.id)
  if(own.length>=minimum)continue
  const candidates:Question[]=[]
  const sections=course.sections.map(section=>({title:section.title,summary:concise(section.text)}))
  sections.forEach((section,index)=>{
   const choices=rotate(sections,index,3)
   candidates.push({id:`quality-${course.id}-section-${index+1}`,course:course.id,topic:course.category,difficulty:'essentiel',format:'single',
    prompt:`Dans le cours « ${course.title} », quelle formulation correspond à la partie « ${section.title} » ?`,
    options:choices.map(item=>item.summary),correct:[0],why:choices.map((item,i)=>i===0?`Oui. Cette idée est développée dans « ${section.title} ».`:`Cette idée appartient à « ${item.title} » ; elle ne répond pas à la partie demandée.`)})
   candidates.push({id:`quality-${course.id}-map-${index+1}`,course:course.id,topic:course.category,difficulty:'application',format:'single',
    prompt:`À quelle partie du cours rattacher cette idée : « ${section.summary} » ?`,options:choices.map(item=>item.title),correct:[0],
    why:choices.map((item,i)=>i===0?`La formulation vient de la partie « ${section.title} ».`:`« ${item.title} » développe une autre étape ou un autre niveau du raisonnement.`)})
  })
  const glossary=course.glossary??[]
  glossary.forEach(([term,definition],index)=>{
   const terms=rotate(glossary,index,3),definitions=rotate(glossary,index+1,3).map(pair=>pair[1])
   candidates.push({id:`quality-${course.id}-term-${index+1}`,course:course.id,topic:course.category,difficulty:'essentiel',format:'single',
    prompt:`Quelle association définit correctement « ${term} » ?`,options:[`${term} : ${definition}`,...definitions.slice(0,2).map(value=>`${term} : ${value}`)],correct:[0],
    why:[`Cette définition correspond à « ${term} ».`,...definitions.slice(0,2).map((_,i)=>`Cette définition correspond plutôt à « ${terms[(i+1)%terms.length][0]} ».`)]})
  })
  if(course.caseStudy)candidates.push({id:`quality-${course.id}-case`,course:course.id,topic:course.category,difficulty:'application',format:'single',prompt:course.caseStudy.prompt,
   options:[concise(course.caseStudy.answer,300),...sections.slice(0,2).map(s=>s.summary)],correct:[0],why:['Ce raisonnement répond aux éléments précis du cas.',...sections.slice(0,2).map(s=>`Cette proposition rappelle « ${s.title} », sans résoudre entièrement le cas.`)]})
  candidates.push({id:`quality-${course.id}-recall`,course:course.id,topic:course.category,difficulty:'application',format:'single',prompt:course.recall,
   options:[concise(course.answer,300),...sections.slice(-2).map(s=>s.summary)],correct:[0],why:['Cette réponse reprend le raisonnement attendu du cours.',...sections.slice(-2).map(s=>`Cette proposition relève de « ${s.title} », mais ne répond pas directement à la question.`)]})
  for(const candidate of candidates){
   if(result.filter(q=>q.course===course.id).length>=minimum)break
   if(candidate.options.length>=2&&!result.some(q=>q.id===candidate.id||q.prompt===candidate.prompt))result.push(candidate)
  }
  if(result.filter(q=>q.course===course.id).length<minimum)throw new Error(`Banque incomplète pour ${course.id}`)
 }
 return result
}
