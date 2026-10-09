import {courses} from '../src/study/curriculum.ts'
import {generateLocalNoteDrafts} from '../server/flashcards/generation.mjs'
import {draftEvidenceSignals,isSafeDraft} from '../server/flashcards/review/policy.mjs'

// Deterministic sample evenly spaced in the ID-sorted catalogue, not selected
// according to the resulting confidence. No PDF or account data is modified.
const sorted=[...courses].sort((a,b)=>a.id.localeCompare(b.id,'en'))
const sample=Array.from({length:20},(_,i)=>sorted[Math.floor(i*(sorted.length-1)/19)])
const results=sample.map(course=>{
  const sections=course.sections.map((s,i)=>({id:`${course.id}-${i}`,title:s.title,
    content:[s.text,...(s.bullets??[])].join('\n'),startPage:i+1,endPage:i+1}))
  const drafts=generateLocalNoteDrafts({text:sections.map(s=>`${s.title}. ${s.content}`).join('\n'),
    level:'standard',requestedCount:12,source:{type:'study_document'}})
  const signals=drafts.map(draft=>({...draft,status:'pending',...draftEvidenceSignals(draft,
    sections.find(s=>s.content.normalize('NFC').replace(/\s+/g,' ').includes(draft.source.excerpt.normalize('NFC').replace(/\s+/g,' '))))}))
  return {id:course.id,title:course.title,generated:drafts.length,verbatim:signals.filter(s=>s.verbatimProof).length,
    faithful:signals.filter(isSafeDraft).length,distribution:signals.reduce((dist,s)=>{dist[s.confidence]=(dist[s.confidence]??0)+1;return dist},{})}
})
const distribution={'0':0,'0.93':0,'0.95':0,'0.97':0}
for(const result of results)for(const [value,count] of Object.entries(result.distribution))distribution[value]=(distribution[value]??0)+count
console.log(JSON.stringify({method:'20 evenly spaced courses by ID; standard; target 12; real generator; no PDF import',
  generated:results.reduce((n,r)=>n+r.generated,0),faithful:results.reduce((n,r)=>n+r.faithful,0),distribution,results},null,2))
