// Editorial triage, not a medical certification or a word-count target.
export const normalize = text => String(text ?? '').normalize('NFKC').toLocaleLowerCase('fr').replace(/[’]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const placeholder = /nouveau chapitre au programme canonique|rédaction complète.*programmée|contenu à venir|lorem ipsum|\bplaceholder\b/i
const generic = /cette (?:proposition|option|réponse|formulation|idée|interprétation) (?:ne |confond|correspond|appartient|contredit|relève|reprend|généralise|dépasse|présente|omet|réduit|transpose)|raisonnement attendu du cours|la formulation vient de|repère anatomique demandé est celui décrit|réponse correcte :|la bonne réponse est :/i
export function inspectCourse(course, ownQuestions) {
 const issues=[]
 const add=(severity,code,location,detail)=>issues.push({severity,code,location,detail})
 const textFields=[...course.objectives,course.trap,course.recall,course.answer,...course.sections.flatMap(s=>[s.title,s.text,...(s.bullets??[])])]
 if(textFields.some(t=>!String(t??'').trim()))add('error','empty-content',course.id,'Champ pédagogique vide')
 if(textFields.some(t=>placeholder.test(t)))add('error','placeholder',course.id,'Texte provisoire publié')
 const bodies=new Set()
 for(const [i,s] of course.sections.entries()){
  const body=normalize(s.text+' '+(s.bullets??[]).join(' '))
  if(bodies.has(body))add('error','duplicate-section',`section:${i+1}`,s.title)
  bodies.add(body)
  // Concision alone is an advisory signal; a definition or a table can be short.
  if(body.split(' ').length<25)add('warning','short-section',`section:${i+1}`,s.title)
  if(/^(cette notion|ce chapitre|il est important|il est essentiel|repérez les éléments)/i.test(s.text.trim()))add('warning','generic-section',`section:${i+1}`,s.title)
 }
 if(course.objectives.some(x=>/^(comprendre|connaître|savoir|restituer le mécanisme|relier les structures)/i.test(x)))add('warning','vague-objective','objectives','Préférer une action observable et un objet précis')
 if(normalize(course.answer).split(' ').length<5)add('warning','thin-recall-answer','answer',course.answer)
 for(const source of course.sources??[]){
  try {const url=new URL(source.url);if(url.protocol!=='https:'||!source.label.trim())throw Error();if(url.pathname==='/'||/\/books\/?$|\/content\/?$|\/pages\/1-introduction$/.test(url.pathname))add('warning','broad-source','sources',source.url)}catch{add('error','invalid-source','sources',source.url)}
 }
 if(!course.sources?.length)add('error','missing-source','sources','Aucune source nommée')
 if(ownQuestions.length<5)add('error','missing-qcm','questions',String(ownQuestions.length))
 const singles=ownQuestions.filter(q=>q.correct.length===1&&q.format!=='boolean')
 if(singles.length>=5&&singles.every(q=>q.correct[0]===0))add('warning','source-position-bias','questions','Toutes les réponses uniques sont en tête dans les données ; vérifier séparément le mélange de présentation')
 for(const q of ownQuestions){
  if(!q.prompt.trim()||q.options.length<2||q.options.length>4||q.why.length!==q.options.length||!q.correct.length||q.correct.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length)||new Set(q.correct).size!==q.correct.length)add('error','invalid-qcm',q.id,q.prompt)
  if(q.why.some(x=>!x.trim())||q.options.some(x=>!x.trim()))add('error','empty-qcm',q.id,q.prompt)
  if([q.prompt,...q.options,...q.why].some(x=>placeholder.test(x)))add('error','placeholder',q.id,q.prompt)
  if(new Set(q.options.map(o=>o.normalize('NFKC').toLocaleLowerCase('fr').replace(/\s+/g,' ').replace(/[.]$/,'').trim())).size!==q.options.length)add('error','duplicate-option',q.id,q.prompt)
  if(q.why.some(x=>generic.test(x)||/^(oui|non|faux|exact|c’est exact|correct)[.! ]*$/i.test(x.trim())))add('warning','weak-explanation',q.id,q.prompt)
  const explanations=q.why.map(normalize)
  if(q.format!=='boolean'&&explanations.some((x,i)=>x&&explanations.indexOf(x)!==i))add('warning','repeated-explanation',q.id,'Une explication identique est utilisée pour plusieurs propositions ; vérifier chaque justification')
  if(/Dans le cours .*quelle formulation correspond|À quelle partie du cours rattacher/i.test(q.prompt))add('warning','document-navigation-qcm',q.id,q.prompt)
  if(q.options.some((o,i)=>!q.correct.includes(i)&&/transcytose osseuse|commutation de classe des neutrophiles|fabriquer de la bile|produit la bile|production de bile|remplace tous les|sans aucune limite|transformée de l’hémoglobine|se trouve exclusivement dans le système nerveux|elle élimine tous les biais|elle consomme obligatoirement un ATP à chaque étape/i.test(o)))add('warning','suspect-distractor',q.id,q.prompt)
 }
 return issues
}
export function editorialAudit(courses,questions){
 const courseIds=new Set(courses.map(c=>c.id))
 questions=questions.filter(q=>courseIds.has(q.course))
 const entries=courses.map(course=>({id:course.id,subject:course.category,issues:inspectCourse(course,questions.filter(q=>q.course===course.id))}))
 const shared=new Map()
 for(const course of courses)for(const [index,section] of course.sections.entries()){
  const body=normalize(section.text)
  // Short definitions can legitimately recur; flag only substantial shared prose.
  if(body.length<240)continue
  const matches=shared.get(body)??[]
  matches.push({id:course.id,section:index+1});shared.set(body,matches)
 }
 for(const matches of shared.values())if(new Set(matches.map(m=>m.id)).size>1){
  for(const match of matches)entries.find(e=>e.id===match.id).issues.push({severity:'warning',code:'shared-section',location:`section:${match.section}`,detail:matches.filter(m=>m.id!==match.id).map(m=>`${m.id}#${m.section}`).join(', ')})
 }
 const warningCounts={}
 for(const row of entries)for(const issue of row.issues)warningCounts[issue.code]=(warningCounts[issue.code]??0)+1
 const singles=questions.filter(q=>q.correct.length===1&&q.format!=='boolean')
 const subjectCounts=Object.fromEntries([...new Set(courses.map(c=>c.category))].map(subject=>{
  const rows=entries.filter(e=>e.subject===subject),ids=new Set(rows.map(r=>r.id))
  return [subject,{courses:rows.length,questions:questions.filter(q=>ids.has(q.course)).length,errors:rows.flatMap(r=>r.issues).filter(i=>i.severity==='error').length,warnings:rows.flatMap(r=>r.issues).filter(i=>i.severity==='warning').length}]
 }))
 return {counts:{courses:courses.length,questions:questions.length,errors:entries.flatMap(r=>r.issues).filter(i=>i.severity==='error').length,signals:warningCounts},subjects:subjectCounts,rawPositionBias:{singleQuestions:singles.length,firstCorrect:singles.filter(q=>q.correct[0]===0).length,note:'Mesure des données sources ; contrôler séparément le mélange à l’affichage.'},courses:entries}
}
