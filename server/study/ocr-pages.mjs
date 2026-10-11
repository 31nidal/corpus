import {generateWithQuota} from '../ai/generation.mjs'

export async function transcribeMissingPages({extracted,buffer,db,userId,provider,config}) {
  const missing=extracted.pages.filter(page=>!page.text.trim())
  if(!missing.length)return {extracted,generation:null}
  if(provider?.name!=='gemini')throw Object.assign(new Error('Configurez Gemini pour transcrire les pages scannées.'),{status:503,code:'AI_OCR_UNAVAILABLE'})
  const result=await generateWithQuota({db,userId,provider,config,task:'ocr',context:{buffer,pageCount:extracted.pageCount},local:()=>null})
  const uncertain=result.value.pages.filter(page=>page.uncertain).map(page=>page.pageNumber)
  const pages=extracted.pages.map(page=>{
    if(page.text.trim())return page // Never overwrite already readable text with model transcription.
    const transcribed=result.value.pages.find(candidate=>candidate.pageNumber===page.pageNumber)
    return {...page,text:transcribed?.text?.trim()||''}
  })
  const remaining=pages.filter(page=>!page.text.trim()).map(page=>page.pageNumber)
  if(remaining.length===missing.length)result.refund?.()
  const warnings=(extracted.extraction?.warnings||[]).filter(warning=>!missing.some(page=>warning===`Page ${page.pageNumber} : aucun texte sélectionnable.`))
  warnings.push(...uncertain.filter(number=>missing.some(page=>page.pageNumber===number)).map(number=>`Page ${number} : transcription OCR incertaine, à vérifier.`),...remaining.map(number=>`Page ${number} : aucun texte récupéré par OCR.`))
  return {extracted:{...extracted,pages,totalText:pages.map(page=>page.text).join('\n'),extraction:{method:'pdfjs+ocr',warnings}},generation:{...result.generation,transcribedPages:missing.length-remaining.length,uncertainPages:uncertain,unreadablePages:remaining}}
}
