import type {NoteType, FlashcardNote} from '../../flashcards/flashcardsTypes'
export type DraftStatus = 'pending'|'edited'|'accepted'|'rejected'
export type Draft = {id:string;documentId:string;sectionId:string|null;page:number;noteType:NoteType;front:string;back:string;fields:Record<string,unknown>;sourceExcerpt:string;subject:string;chapter:string;tags:string[];confidence:number;verbatimProof:boolean;status:DraftStatus;rejectedFrom:'pending'|'edited'|null;acceptedNoteId:string|null;createdAt:number;updatedAt:number;faithfulToCourse:boolean}
export type DraftList = {drafts:Draft[];counts:Record<DraftStatus|'total'|'faithfulToCourse',number>;filteredTotal:number;limit:number;offset:number;nextOffset:number|null}
export type ActionResult = {id:string;status:'accepted'|'already_accepted'|'rejected'|'restored'|'not_found'|'invalid';noteId?:string;note?:FlashcardNote;draft?:Draft;error?:string}
export type GenerationOptions = {count:number;level:'essential'|'standard'|'complete';sectionIds?:string[];startPage?:number;endPage?:number}
export class ReviewRequestError extends Error {constructor(message:string, public status?:number){super(message)}}
async function request<T>(path:string,method='GET',body?:unknown):Promise<T> {
  let response:Response
  try {response=await fetch(`/api/flashcards/${path}`,{method,credentials:'same-origin',signal:AbortSignal.timeout(45000),headers:body===undefined?undefined:{'content-type':'application/json','x-mycorpus-request':'1'},body:body===undefined?undefined:JSON.stringify(body)})}
  catch {throw new ReviewRequestError('Erreur réseau. Vérifiez votre connexion puis réessayez.')}
  const data=await response.json().catch(()=>null)
  if(!response.ok)throw new ReviewRequestError(data?.error||'Impossible de traiter la demande.',response.status)
  if(!data)throw new ReviewRequestError('Réponse du serveur illisible. Réessayez.')
  return data as T
}
const documentPath=(id:string)=>`documents/${encodeURIComponent(id)}/drafts`
export const generateDocumentDrafts=(id:string,options:GenerationOptions)=>request<{created:number;ignored:number;generated:number;unattributed:number}>(`${documentPath(id)}/generate`,'POST',options)
export const patchDraft=(id:string,noteType:NoteType,fields:Record<string,unknown>)=>request<{draft:Draft}>(`drafts/${encodeURIComponent(id)}`,'PATCH',{noteType,fields})
export const actOnDrafts=(id:string,action:'accept'|'reject'|'restore',ids:string[],deckId:string)=>request<{results:ActionResult[]}>(`${documentPath(id)}/${action}`,'POST',{ids,...(action==='accept'?{deckId}:{})})
// Rebuild a prefix from zero after mutations. Each HTTP page is bounded at 500.
// Never continue from an offset captured before accept/reject changed the filter.
export async function loadDraftPrefix(id:string,status:DraftStatus|'',target=50):Promise<DraftList> {
  const drafts:Draft[]=[]
  let response:DraftList
  do {
    const params=new URLSearchParams({limit:String(Math.min(500,target-drafts.length)),offset:String(drafts.length)})
    if(status)params.set('status',status)
    response=await request<DraftList>(`${documentPath(id)}?${params}`)
    drafts.push(...response.drafts)
  }while(drafts.length<target&&response.nextOffset!==null)
  return {...response,drafts}
}
