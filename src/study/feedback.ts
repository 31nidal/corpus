export function feedbackUrl(course:string,question?:string){
 const params=new URLSearchParams({title:`[Pédagogie] ${question||course}`,body:`Cours : ${course}\n${question?`Question : ${question}\n`:''}Lien : https://mycorpus3d.com/#tab=cours&cours=${encodeURIComponent(course)}\n\nPassage concerné :\n\nCorrection proposée et source éventuelle :\n`})
 return `https://github.com/31nidal/corpus/issues/new?${params}`
}
