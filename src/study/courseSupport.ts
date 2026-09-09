import type {Course} from './curriculum'
import type {Diagram} from './diagrams'
import type {Question} from './questions'

/** Vocabulary exercises supplement the existing mechanism and reasoning bank. */
export function courseSupport(catalog:Course[]){
 const diagrams:Record<string,Diagram>={},questions:Question[]=[]
 for(const c of catalog){
  const terms=c.glossary?.slice(0,4)??[]
  if(terms.length!==4)throw new Error('Four defined terms are required for '+c.id)
  diagrams[c.id]={title:'Les repères de ce chapitre',caption:'Comparez ces notions et leurs définitions. Cette carte de révision ne représente pas les positions anatomiques.',kind:'compare',nodes:terms.map(([label,detail])=>({label,detail}))}
  terms.forEach(([term,definition],i)=>questions.push({id:c.id+'-vocabulary-'+(i+1),course:c.id,topic:c.category,difficulty:'essentiel',prompt:'Dans le chapitre « '+c.title+' », quel terme correspond à cette définition : « '+definition+' » ?',options:terms.map(([label])=>label),correct:[i],why:terms.map(([label,text],j)=>j===i?'Oui. '+term+' : '+definition:'Cette proposition désigne une autre notion. '+label+' : '+text)}))
 }
 return {diagrams,questions}
}
