import {generateWithQuota} from '../../ai/generation.mjs'
import {sanitizeGeneratedNoteDrafts} from '../generation.mjs'

export async function generateReviewDrafts({repo,userId,documentId,options,provider,config}) {
  const context=repo.generationContext(userId,documentId,options)
  if(provider?.name!=='gemini')return {...repo.generate(userId,documentId,options),generation:{mode:'local',message:'Moteur local — règles automatiques, sans appel Gemini.'}}
  const result=await generateWithQuota({db:repo.db,userId,provider,config,task:'flashcards',
    context:{sections:context.sections,requestedCount:context.requestedCount,level:context.level,chapter:context.doc.title},local:()=>null})
  if(result.value===null)return {...repo.generate(userId,documentId,options),generation:result.generation}
  const drafts=result.value.flatMap(item=>{
    const section=context.sections.find(s=>s.id===item.sourceSectionId)
    if(!section)return []
    return sanitizeGeneratedNoteDrafts([item],{text:section.content,level:context.level,requestedCount:1,chapter:context.doc.title,source:{type:'study_document',documentId,sectionId:section.id,sectionTitle:section.title}},section.content)
  })
  try {
    const saved=repo.generate(userId,documentId,options,drafts)
    if(!saved.created)result.refund?.()
    return {...saved,generation:result.generation}
  }catch(error){result.refund?.();throw error}
}

export async function regenerateReviewDraft({repo,userId,id,provider,config}) {
  const row=repo.row(userId,id)
  if(!row)throw Object.assign(new Error('Brouillon introuvable.'),{status:404})
  if(row.status==='accepted')throw Object.assign(new Error('Un brouillon accepté ne peut plus être régénéré.'),{status:409})
  const section=repo.section(userId,row)
  if(!section)throw Object.assign(new Error('Le passage source est introuvable.'),{status:404})
  if(provider?.name!=='gemini')throw Object.assign(new Error('La régénération IA nécessite Gemini. Vous pouvez modifier la carte manuellement.'),{status:503})
  const result=await generateWithQuota({db:repo.db,userId,provider,config,task:'flashcards',
    context:{text:row.source_excerpt,requestedCount:1,level:'standard',noteType:row.note_type,source:{sectionId:section.id}},local:()=>null})
  if(!result.value)return {draft:repo.view(userId,row),generation:result.generation,unchanged:true}
  const item=result.value[0]
  try {
    const current=repo.row(userId,id)
    if(!current||current.updated_at!==row.updated_at)throw Object.assign(new Error('Le brouillon a changé pendant la génération. Réessayez.'),{status:409})
    const draft=repo.patch(userId,id,{noteType:item.noteType,fields:item.fields})
    // Keep the permanent draft identity and its original proof. Editing semantics
    // deliberately remove the automatic confidence flag.
    return {draft,generation:result.generation}
  }catch(error){result.refund?.();throw error}
}
