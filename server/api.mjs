import fs from 'node:fs'
import {createAccountHandler} from './accounts.mjs'
import path from 'node:path'
import {createProvider} from './providers.mjs'
import {validateAction} from '../shared/actions.mjs'
const read=p=>JSON.parse(fs.readFileSync(path.resolve(process.cwd(),p.replace(/^\.\.\//,'')),'utf8'))
const manifests={male:read('../public/models/manifest.json'),female:read('../public/models/female-regions/manifest.json')},labels={...read('../src/data/female-labels.json'),...read('../src/data/french-labels.json')},lessons=read('../src/data/learning.json'),profiles=read('../src/data/profiles.json')
const systemIds=['skeletal','muscular','cardiovascular','nervous','digestive','respiratory','urinary','reproductive','lymphatic']
const aliases={coeur:'FMA7088',heart:'FMA7088',poumon:'FMA7309',poumons:'FMA7309',cerveau:'FMA50801',foie:'FMA7197',estomac:'FMA7148',pancreas:'FMA7198',rein:'FMA7204',reins:'FMA7204',femur:'FMA24474',intestin:'FMA7200',uterus:'HRA-uterus',ovaire:'HRA-ovaries',ovaires:'HRA-ovaries'}
const normalize=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/œ/g,'oe')
function resolveStructure(message,manifest){
 const text=normalize(message)
 const alias=Object.entries(aliases).find(([name])=>new RegExp(`\\b${name}\\b`).test(text))
 if(alias&&manifest.structures.some(s=>s.id===alias[1]))return alias[1]
 return manifest.structures.filter(s=>text.includes(normalize(labels[s.name]||s.name))).sort((a,b)=>(labels[b.name]||b.name).length-(labels[a.name]||a.name).length)[0]?.id
}
function localReply(context){
 const manifest=manifests[context.body]
 const text=normalize(context.message),id=resolveStructure(text,manifest)||context.selected_structure,structure=manifest.structures.find(s=>s.id===id)
 const name=structure?labels[structure.name]||structure.name:'cette structure'
 if(/reinitialis|reviens.*ensemble/.test(text))return {message:'La vue de face est rétablie.',actions:[{action:'reset_camera'}],sources:[]}
 const system=Object.entries({squelette:'skeletal',muscles:'muscular',cardiovasculaire:'cardiovascular',nerveux:'nervous',digestif:'digestive',respiratoire:'respiratory',urinaire:'urinary',reproducteur:'reproductive',lymphatique:'lymphatic'}).find(([n])=>text.includes(n))
 if(system&&/montre|affiche|masque|cache/.test(text))return {message:`Le système demandé est ${/masque|cache/.test(text)?'masqué':'affiché'}.`,actions:[{action:/masque|cache/.test(text)?'hide_system':'show_system',system:system[1]}],sources:[]}
 if(structure&&/montre|affiche|isole|masque|cache|selectionne/.test(text))return {message:`${name} : la vue est mise à jour.`,actions:[{action:/isole/.test(text)?'isolate_structure':/masque|cache/.test(text)?'hide_structure':'focus_structure',structure:id}],sources:[]}
 if(/j.ai mal|mes symptomes|quel medicament|quelle dose|diagnostique/.test(text))return {message:'Je peux expliquer les notions du cours, mais pas établir votre diagnostic ou prescrire un traitement. Pour des symptômes personnels, adressez-vous à un professionnel de santé ; en cas de symptômes graves ou soudains, contactez les urgences locales.',actions:[],sources:[]}
 if(/anime|battement|respiration animee/.test(text)&&['FMA7088','FMA7309','FMA7310'].includes(id))return {message:'Animation illustrative démarrée. Elle ne simule pas la physiologie réelle.',actions:[{action:'start_animation',animation:id==='FMA7088'?'heartbeat':'breathing'}],sources:[]}
 const lesson=context.lesson
 if(lesson){
  let answer=lesson.levels[context.learning_level]
  if(/ou |situe|localis/.test(text))answer=lesson.location
  else if(/epais|ventricule|pression/.test(text)&&lesson.id==='FMA7088')answer=lesson.levels.advanced
  else if(/fonctionne|circul|trajet/.test(text))answer=lesson.mechanism
  else if(/parties|compose|anatomie/.test(text))answer=lesson.anatomy.join(' ; ')
  return {message:`Repère du cours « ${lesson.title} » : ${answer}\n\nMode ressources locales : je consulte les fiches du projet ; je ne génère pas une réponse médicale libre.`,actions:[],sources:[{label:'Source du cours',url:lesson.source}]}
 }
 const profile=structure?profiles.find(p=>p.kind===(structure.group==='muscles'?'muscle':['arteries','veins'].includes(structure.group)?'vessel':null)&&new RegExp(p.pattern).test(structure.name)):null
 if(profile)return {message:Object.entries(profile.fields).map(([k,v])=>`${k} : ${v}`).join('\n')+'\n\nRepère de la fiche locale ; les détails non documentés ne sont pas inférés.',actions:[],sources:[{label:'Source anatomique',url:profile.source}]}
 return {message:'Je peux sélectionner une structure (« Montre-moi le pancréas »), isoler un élément ou consulter les cours locaux. Cette question ne dispose pas encore d’une réponse précise dans les ressources disponibles.',actions:[],sources:[]}
}
export function createApiHandler(config=process.env){
 const account=createAccountHandler(config)
 const provider=createProvider(config)
 return async(req,res,next)=>{
  const path=req.url?.split('?')[0]
  if(!path?.startsWith('/api/'))return next?.()
  if(path.startsWith('/api/account/'))return account(req,res)
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
  if(path==='/api/status'&&req.method==='GET')return send(200,{mode:provider?'connected':'local',label:provider?'Assistant connecté':'Ressources locales'})
  if(path!=='/api/chat')return send(404,{error:'Route inconnue.'})
  if(req.method!=='POST')return send(405,{error:'Méthode non autorisée.'})
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>20000)return send(413,{error:'Message trop volumineux.'})}
   let body;try{body=JSON.parse(raw)}catch{return send(400,{error:'Requête JSON invalide.'})}
   if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'Objet JSON attendu.'})
   if(typeof body.message!=='string'||!body.message.trim()||body.message.length>2000)return send(400,{error:'Le message doit contenir entre 1 et 2 000 caractères.'})
   if(body.body!=null&&!['male','female'].includes(body.body))return send(400,{error:'Référence anatomique inconnue.'})
   const reference=body.body??(body.selected_structure?.startsWith?.('HRA-')?'female':'male'),manifest=manifests[reference],ids=manifest.structures.map(s=>s.id)
   if(body.selected_structure!=null&&!ids.includes(body.selected_structure))return send(400,{error:'Structure inconnue.'})
   if(!['discovery','student','advanced'].includes(body.learning_level))return send(400,{error:'Niveau inconnu.'})
   const selected=manifest.structures.find(s=>s.id===body.selected_structure)
   const requestedLesson=typeof body.current_lesson==='string'?body.current_lesson.split(':')[0]:null
   const lesson=lessons.find(l=>l.id===requestedLesson)||lessons.find(l=>l.id===resolveStructure(body.message,manifest))||lessons.find(l=>l.id===selected?.id)||null
   const context={body:reference,message:body.message,selected_structure:selected?.id??null,structure_name:selected?(labels[selected.name]||selected.name):null,system:lessons.find(l=>l.id===selected?.id)?.system??selected?.group??null,learning_level:body.learning_level,current_lesson:typeof body.current_lesson==='string'?body.current_lesson.slice(0,100):null,lesson,instructions:'Répondre en français à visée éducative, distinguer les informations connues et manquantes, ne pas poser de diagnostic personnel. Utiliser uniquement les actions structurées autorisées et les sources fournies.',allowed_actions:['focus_structure','hide_structure','show_structure','isolate_structure','show_system','hide_system','reset_camera','start_animation']}
   const response=provider?await provider.respond(context):localReply(context)
   const actions=(Array.isArray(response.actions)?response.actions:[]).slice(0,8).map(a=>validateAction(a,ids,systemIds,['heartbeat','breathing'])).filter(Boolean)
   const sources=(Array.isArray(response.sources)?response.sources:[]).filter(s=>typeof s.label==='string'&&typeof s.url==='string'&&/^https:\/\//.test(s.url)).slice(0,8).map(s=>({label:s.label.slice(0,150),url:s.url.slice(0,2000)}))
   return send(200,{message:response.message,actions,sources,mode:provider?'connected':'local'})
  }catch{return send(503,{error:'Le service de conversation est indisponible. Réessayez dans un instant.'})}
 }
}
