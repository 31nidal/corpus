import {DraftReviewRepository} from './repository.mjs'
const statuses=new Set(['pending','edited','accepted','rejected'])
export async function handleDraftReview({db,notes,userId,subpath,url,req,readJson,send,now=Date.now}) {
  const docMatch=subpath.match(/^documents\/([^/]+)\/drafts(?:\/(generate|accept|reject|restore))?$/)
  const draftMatch=subpath.match(/^drafts\/([^/]+)(?:\/(accept|reject|restore))?$/)
  if(!docMatch&&!draftMatch)return false
  const repo=new DraftReviewRepository(db,notes,now)
  if(docMatch) {
    const [,documentId,action]=docMatch
    if(!repo.document(userId,documentId)){send(404,{error:'Document introuvable.'});return true}
    if(!action&&req.method==='GET') {
      const status=url.searchParams.get('status')||undefined
      const limit=Number(url.searchParams.get('limit')??50),offset=Number(url.searchParams.get('offset')??0)
      if((status&&!statuses.has(status))||!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(offset)||offset<0){send(400,{error:'Filtres ou pagination invalides.'});return true}
      send(200,repo.list(userId,documentId,status,limit,offset));return true
    }
    if(req.method==='POST'&&action) {
      const body=await readJson(req)
      if(!body||typeof body!=='object'||Array.isArray(body)){send(400,{error:'Requête invalide.'});return true}
      if(action==='generate') {
        if(Object.keys(body).some(k=>!['count','level'].includes(k))){send(400,{error:'La génération lit uniquement les sections du document ; seuls count et level sont autorisés.'});return true}
        send(201,repo.generate(userId,documentId,body))
      }else send(200,repo.batch(userId,documentId,action,body))
      return true
    }
  }else {
    const [,id,action]=draftMatch
    if(!repo.row(userId,id)){send(404,{error:'Brouillon introuvable.'});return true}
    if(!action&&req.method==='PATCH'){send(200,{draft:repo.patch(userId,id,await readJson(req))});return true}
    if(action&&req.method==='POST') {
      const body=await readJson(req)
      if(!body||typeof body!=='object'||Array.isArray(body)){send(400,{error:'Requête invalide.'});return true}
      const result=repo.act(userId,id,action,{deckId:body.deckId})
      send(result.status==='not_found'?404:result.status==='invalid'?result.httpStatus:200,result)
      return true
    }
  }
  send(405,{error:'Méthode non autorisée.'});return true
}
