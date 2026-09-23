import type {Course} from './curriculum'
import {canonicalCourses} from './taxonomy/canonicalCourses'

export const subjects = [
 {id:'anatomie',title:'Anatomie',description:'Situer les structures, nommer leurs rapports et comprendre les mouvements.',scope:'Os, articulations, muscles, viscères et système nerveux',groups:['Principes','Tête et cou','Rachis','Thorax','Abdomen','Pelvis et périnée','Membre supérieur','Membre inférieur','Neuroanatomie']},
 {id:'biologie-cellulaire',title:'Biologie cellulaire',description:'Comprendre la cellule, ses échanges, son organisation et son renouvellement.',scope:'Membrane, organites, cytosquelette et division',groups:[]},
 {id:'histologie',title:'Histologie',description:'Relier l’organisation microscopique des tissus à leur fonction.',scope:'Épithéliums, tissus conjonctifs et tissus spécialisés',groups:[]},
 {id:'embryologie',title:'Embryologie & Reproduction',description:'Suivre le développement humain, la gamétogenèse et la mise en place des organes.',scope:'Fécondation, embryon, organogenèse, placenta et reproduction',groups:[]},
 {id:'genetique',title:'Génétique & Biologie moléculaire',description:'Comprendre l’expression, la transmission et les variations de l’information biologique.',scope:'ADN, expression des gènes, méiose, hérédité et outils moléculaires',groups:[]},
 {id:'chimie',title:'Chimie',description:'Maîtriser les grandeurs et les équilibres utilisés dans le vivant.',scope:'Liaisons, solutions, concentrations et acide-base',groups:[]},
 {id:'biochimie',title:'Biochimie',description:'Passer des molécules biologiques aux voies métaboliques.',scope:'Protéines, enzymes, glucides, lipides et énergie',groups:[]},
 {id:'physiologie',title:'Physiologie',description:'Expliquer le fonctionnement des systèmes et leurs régulations.',scope:'Homéostasie, signal nerveux, muscle, sang et hormones',groups:['Régulations','Neurophysiologie','Motricité','Sang et hémostase','Respiration','Équilibre hydrique','Régulation endocrine']},
 {id:'immunologie',title:'Immunologie',description:'Distinguer les acteurs de la défense et la mémoire immunitaire.',scope:'Immunité innée, adaptative et coopération cellulaire',groups:[]},
 {id:'biophysique',title:'Biophysique',description:'Raisonner avec les lois physiques, les unités et leurs hypothèses.',scope:'Échanges, mécanique des fluides, ondes et imagerie',groups:[]},
 {id:'biostatistiques',title:'Biostatistiques',description:'Décrire des données, calculer des probabilités et interpréter un résultat.',scope:'Statistiques, probabilités, estimation et tests',groups:[]},
 {id:'pharmacologie',title:'Pharmacologie',description:'Comprendre le devenir d’un médicament et ses effets.',scope:'Pharmacocinétique, récepteurs et relation dose-effet',groups:[]},
 {id:'sante-publique',title:'Santé publique',description:'Étudier la santé à l’échelle des populations et les principes de prévention.',scope:'Déterminants, prévention, études et éthique',groups:[]},
 {id:'shs',title:'Santé, Société, Humanité',description:'Relier les pratiques de soin à l’histoire, aux droits, à l’éthique et aux expériences vécues.',scope:'Histoire de la médecine, éthique, droit et relation de soin',groups:[]},
 {id:'medicament-societe',title:'Médicament & Société',description:'Étudier le médicament comme objet scientifique, réglementaire et social.',scope:'Développement, évaluation, accès, usages et pharmacovigilance',groups:[]},
 {id:'recherche-biomedicale',title:'Recherche biomédicale',description:'Lire, concevoir et évaluer des recherches en santé avec rigueur.',scope:'Plans d’étude, éthique, analyse critique et données de santé',groups:[]},
 {id:'odontologie',title:'Odontologie',description:'Comprendre l’anatomie orale, les dents et les tissus de soutien.',scope:'Morphologie dentaire, occlusion, parodonte et santé orale',groups:[]},
 {id:'anglais-medical',title:'Anglais médical',description:'Lire la littérature biomédicale et communiquer avec un vocabulaire précis.',scope:'Terminologie, anatomie, articles et présentation clinique',groups:[]},
]
export type Subject = typeof subjects[number]
export const subjectFor = (course:Course) => subjects.find(s=>s.title===course.category)!
export const normalizeSearch = (text:string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/œ/g,'oe').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()

const placement:Record<string,[string,string]>={
 orientation:['Anatomie','Principes'],homeostasis:['Physiologie','Régulations'],membrane:['Biologie cellulaire','Organisation cellulaire'],organelles:['Biologie cellulaire','Organisation cellulaire'],'cell-cycle':['Biologie cellulaire','Renouvellement cellulaire'],
 tissues:['Histologie','Tissus fondamentaux'],'gene-expression':['Génétique & Biologie moléculaire','Information génétique'],'neuronal-signal':['Physiologie','Neurophysiologie'],'muscle-contraction':['Physiologie','Motricité'],blood:['Physiologie','Sang et hémostase'],hemodynamics:['Biophysique','Fluides et échanges'],ventilation:['Physiologie','Respiration'],'fluid-balance':['Physiologie','Équilibre hydrique'],endocrine:['Physiologie','Régulation endocrine'],immunity:['Immunologie','Défenses immunitaires'],metabolism:['Biochimie','Métabolisme énergétique'],
 FMA7088:['Anatomie','Thorax'],FMA7309:['Anatomie','Thorax'],FMA7197:['Anatomie','Abdomen'],FMA7148:['Anatomie','Abdomen'],FMA7198:['Anatomie','Abdomen'],FMA7200:['Anatomie','Abdomen'],FMA7204:['Anatomie','Abdomen'],FMA50801:['Anatomie','Neuroanatomie'],FMA24474:['Anatomie','Membre inférieur'],
 'anat-cervical':['Anatomie','Rachis'],'anat-spine':['Anatomie','Rachis'],'anat-thorax':['Anatomie','Thorax'],'anat-pelvis':['Anatomie','Pelvis et périnée'],
}
const anatomyOrder=['orientation','anat-bone','anat-joints','anat-neurocranium','anat-face','anat-neck','anat-eye','anat-ear','anat-cervical','anat-spine','anat-thorax','anat-trunk-muscles','anat-mediastinum','FMA7088','FMA7309','anat-lymphatic','anat-breast','anat-peritoneum','FMA7148','FMA7200','FMA7197','FMA7198','FMA7204','anat-pelvis','anat-urinary-pelvis','anat-female-pelvis','anat-male-pelvis','anat-shoulder-girdle','anat-humerus','anat-forearm','anat-hand','anat-upper-muscles','FMA24474','anat-knee','anat-leg','anat-foot','anat-lower-muscles','FMA50801','anat-spinal-cord','anat-cranial-nerves']

const atlasLandmarks:Record<string,string>={
 'anat-bone':'FMA24474','anat-neurocranium':'BP3D_SKULL','anat-face':'BP3D_SKULL','anat-cervical':'FMA12521','anat-spine':'FMA12521','anat-thorax':'FMA7485','anat-shoulder-girdle':'FMA13323','anat-humerus':'FMA23131','anat-forearm':'FMA23465','anat-hand':'BP3D_HAND_LEFT','anat-pelvis':'FMA16587','anat-knee':'FMA24487','anat-leg':'FMA24478','anat-foot':'BP3D_FOOT_LEFT','anat-spinal-cord':'FMA7647','anat-lymphatic':'FMA7196',
}

export function organizeCourses(catalog:Course[]):Course[]{
 const mapped=catalog.map(course=>{
  const categoryAlias:Record<string,string>={'Embryologie':'Embryologie & Reproduction','Génétique':'Génétique & Biologie moléculaire'}
  const [category,tag]=placement[course.id]??[categoryAlias[course.category]??(course.category==='Anatomie & physiologie'?'Anatomie':course.category),course.tag]
  return {...course,category,tag,structure:course.structure??atlasLandmarks[course.id]??null}
 })
 const orderedGroups=new Map(subjects.map(subject=>[subject.title,[...new Set([...subject.groups,...mapped.filter(c=>c.category===subject.title).map(c=>c.tag)])]]))
 return mapped.sort((a,b)=>{
  const subjectDifference=subjects.findIndex(s=>s.title===a.category)-subjects.findIndex(s=>s.title===b.category)
  if(subjectDifference)return subjectDifference
  if(a.category==='Anatomie')return anatomyOrder.indexOf(a.id)-anatomyOrder.indexOf(b.id)
  const groups=orderedGroups.get(a.category)??[]
  return groups.indexOf(a.tag)-groups.indexOf(b.tag)
 })
}

export function groupCourses(items:Course[]):{subject:Subject;groups:{title:string;courses:Course[]}[]}[]{
 return subjects.map(subject=>{
  const own=items.filter(c=>c.category===subject.title)
  const names=[...new Set([...subject.groups,...own.map(c=>c.tag)])]
  return {subject,groups:names.map(title=>({title,courses:own.filter(c=>c.tag===title)})).filter(g=>g.courses.length)}
 }).filter(s=>s.groups.length)
}

const canonicalById=new Map(canonicalCourses.map(course=>[course.id,course]))
const subjectSearchAliases:Record<string,string[]>={
 'Anatomie':['anat','anatomie descriptive','osteologie','arthrologie'],
 'Biologie cellulaire':['biocell','bio cell','cell bio'],
 'Histologie':['histo'],
 'Embryologie & Reproduction':['embryo','embryologie reproduction'],
 'Génétique & Biologie moléculaire':['genetique','biologie moleculaire','genomique'],
 'Chimie':['chim'],
 'Biochimie':['biochim','metabolisme'],
 'Physiologie':['physio'],
 'Immunologie':['immuno'],
 'Biophysique':['biophys','physique medicale'],
 'Biostatistiques':['stats','biostats','statistiques'],
 'Pharmacologie':['pharma','icm','adme','pharmacocinetique','pharmacodynamie'],
 'Santé publique':['sante publique','sante population','epidemiologie'],
 'Santé, Société, Humanité':['shs','ssh','ethique','droit de la sante'],
 'Médicament & Société':['medicament societe','reglementation medicament','economie medicament'],
 'Recherche biomédicale':['recherche','lca','lecture critique article','ebm'],
 'Odontologie':['odonto','dentaire'],
 'Anglais médical':['anglais medical','medical english'],
}
const courseSearchAliases:Record<string,string[]>={
 'phys-cardiovascular-hemodynamics-regulation':['cardio','hemodynamique','pression debit resistance','debit cardiaque','pam'],
 'phys-pulmonary-mechanics-volumes':['pneumo','spirometrie','volumes pulmonaires'],
 'phys-respiratory-regulation':['pneumo','controle respiratoire','regulation ventilation'],
 'research-critical-reading-therapeutic-trial':['lca essai therapeutique'],
 'research-critical-reading-diagnostic-study':['lca diagnostic'],
 'english-reading-clinical-trials':['abstract paper clinical trial pico'],
}

export const courseSearchText=(c:Course)=>{
 const canonical=canonicalById.get(c.id)
 return normalizeSearch([
  c.id,c.title,c.category,c.tag,...(subjectSearchAliases[c.category]??[]),...(courseSearchAliases[c.id]??[]),
  canonical?.module??'',canonical?.universityMappings.toulouse.ue??'',canonical?.universityMappings.toulouse.topic??'',...(canonical?.legacyIds??[]),
  ...c.objectives,...c.sections.flatMap(s=>[s.title,s.text,...s.bullets??[]]),...(c.glossary??[]).flat()
 ].join(' '))
}

export const courseMatchesSearch=(c:Course,query:string)=>{
 const tokens=normalizeSearch(query).split(' ').filter(Boolean)
 if(!tokens.length)return true
 const haystack=courseSearchText(c)
 return tokens.every(token=>haystack.includes(token))
}
