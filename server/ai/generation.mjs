import {getOrResetStudyQuota,reserveGenerationQuota,releaseGenerationQuota} from '../study/quota.mjs'
import {checkAiBudget,recordAiUsage} from './usage.mjs'

const localDescription = 'Moteur local — règles automatiques, sans appel Gemini.'
export async function generateWithQuota({db,userId,provider,task,context,local,config={}}) {
  if(!provider)return {value:await local(),generation:{mode:'local',message:localDescription}}
  checkAiBudget(db,userId,config)
  // Account overrides update the existing monthly counter; never create a second quota.
  let overrides={}
  try {overrides=JSON.parse(config.AI_ACCOUNT_LIMITS_JSON||'{}')}catch { /* optional admin configuration */ }
  const configured=overrides[userId]?.monthlyGenerations??config.AI_MONTHLY_GENERATIONS
  if(configured!==undefined&&Number.isInteger(Number(configured))&&Number(configured)>=0&&Number(configured)<=10000){getOrResetStudyQuota(userId,db);db.prepare('UPDATE study_quotas SET monthly_generations=? WHERE user_id=?').run(Number(configured),userId)}
  reserveGenerationQuota(userId,db)
  let generation
  try {
    const method={flashcards:'generateFlashcards',summary:'generateStudySummary',revision:'generateStudySummary',questions:'generateStudyQuestions',ocr:'extractScannedPdf'}[task]
    const value=task==='ocr'?await provider[method](context.buffer,context.pageCount):await provider[method](context)
    generation=value.generation||{mode:'provider'}
    recordAiUsage(db,userId,task,generation,'success')
    let refunded=false
    return {value,generation,refund:()=>{if(!refunded){releaseGenerationQuota(userId,db);refunded=true}}}
  }catch(error){
    releaseGenerationQuota(userId,db)
    generation=error.generation
    recordAiUsage(db,userId,task,generation,'failed')
    if(task==='ocr'||[400,403,413,429].includes(error.status))throw error
    return {value:await local(),generation:{...generation,mode:'local',errorCode:error.code||'AI_UNAVAILABLE',message:`La génération Gemini a échoué. ${localDescription} Le quota de génération a été restitué.`}}
  }
}
