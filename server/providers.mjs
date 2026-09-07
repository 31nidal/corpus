// Provider contract: respond(context) -> { message, actions, sources }.
// Add adapters here; UI and the scene action contract never depend on a vendor SDK.
export class HttpProvider {
 constructor(config){this.url=config.CHAT_UPSTREAM_URL;this.token=config.CHAT_UPSTREAM_TOKEN}
 async respond(context){
  const response=await fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},body:JSON.stringify(context),signal:AbortSignal.timeout(25000)})
  if(!response.ok)throw new Error('provider_unavailable')
  const raw=await response.text();if(raw.length>64000)throw new Error('provider_response_too_large')
  const result=JSON.parse(raw)
  if(typeof result.message!=='string'||result.message.length>16000)throw new Error('invalid_provider_response')
  return result
 }
}
export function createProvider(config){return config.CHAT_UPSTREAM_URL?new HttpProvider(config):null}
