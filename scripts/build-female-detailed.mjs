/** Extract only explicitly VH_F-labelled meshes from the locally verified HRA cache.
 * No mesh is generated, moved, simplified, relabelled as another sex, or merged.
 * Usage: node scripts/build-female-detailed.mjs [--out /temporary/output]
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {readGlbMetadata} from './audit-anatomy-assets.mjs'
const root=fileURLToPath(new URL('../',import.meta.url))
const sha=data=>createHash('sha256').update(data).digest('hex')
const sourceDigest='472567a56896b9b7890508da6501fbf858e56aaa30745365f7a71ade782b529c'
const revision='hra-vhf-detail-v1'

export function glbChunks(buffer) {
 const {gltf}=readGlbMetadata(buffer)
 let binary=null
 for(let offset=12;offset+8<=buffer.length;) {
  const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4)
  if(offset+8+length>buffer.length)throw new Error('Chunk GLB tronqué')
  if(type===0x004e4942)binary=buffer.subarray(offset+8,offset+8+length)
  offset+=8+length
 }
 if(!binary||gltf.buffers?.length!==1||gltf.buffers[0].uri)throw new Error('Un unique buffer GLB intégré est requis')
 return {gltf,binary}
}

export function subsetGlb(buffer,wantedNames) {
 const {gltf,binary}=glbChunks(buffer)
 if(gltf.animations?.length||gltf.skins?.length||gltf.textures?.length||gltf.images?.length||gltf.extensionsRequired?.length)throw new Error('Ressource animée, texturée ou compressée non prise en charge par cet extracteur conservateur')
 const clone=value=>structuredClone(value)
 const keepNodes=new Set(),parents=new Map()
 for(const [index,node] of gltf.nodes.entries())for(const child of node.children||[])parents.set(child,index)
 for(const [index,node] of gltf.nodes.entries())if(Number.isInteger(node.mesh)&&wantedNames.has(node.name)) {
  let ancestor=index
  while(ancestor!==undefined&&!keepNodes.has(ancestor)){keepNodes.add(ancestor);ancestor=parents.get(ancestor)}
 }
 const selectedNames=new Set([...keepNodes].filter(i=>Number.isInteger(gltf.nodes[i].mesh)).map(i=>gltf.nodes[i].name))
 if(selectedNames.size!==wantedNames.size||[...selectedNames].some(name=>!wantedNames.has(name)))throw new Error('Sélection absente ou ancêtre porteur de géométrie non sélectionnée')
 const usedMeshes=new Set([...keepNodes].filter(i=>Number.isInteger(gltf.nodes[i].mesh)).map(i=>gltf.nodes[i].mesh))
 const usedAccessors=new Set(),usedMaterials=new Set()
 for(const index of usedMeshes)for(const primitive of gltf.meshes[index].primitives) {
  for(const accessor of Object.values(primitive.attributes||{}))usedAccessors.add(accessor)
  if(primitive.indices!==undefined)usedAccessors.add(primitive.indices)
  for(const target of primitive.targets||[])for(const accessor of Object.values(target))usedAccessors.add(accessor)
  if(primitive.material!==undefined)usedMaterials.add(primitive.material)
 }
 const usedViews=new Set()
 for(const index of usedAccessors) {
  const accessor=gltf.accessors[index]
  if(!accessor||accessor.sparse||accessor.bufferView===undefined)throw new Error('Accessor sparse ou absent non pris en charge')
  usedViews.add(accessor.bufferView)
 }
 const mapFor=set=>new Map([...set].sort((a,b)=>a-b).map((old,index)=>[old,index]))
 const nodeMap=mapFor(keepNodes),meshMap=mapFor(usedMeshes),accessorMap=mapFor(usedAccessors),viewMap=mapFor(usedViews),materialMap=mapFor(usedMaterials)
 const parts=[],bufferViews=[];let offset=0
 for(const old of viewMap.keys()) {
  const view=gltf.bufferViews[old]
  if(view.buffer!==0||(view.byteOffset||0)+view.byteLength>binary.length)throw new Error('BufferView hors limites')
  const padding=(4-offset%4)%4
  if(padding){parts.push(Buffer.alloc(padding));offset+=padding}
  const bytes=binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength)
  parts.push(bytes);bufferViews.push({...clone(view),buffer:0,byteOffset:offset});offset+=bytes.length
 }
 const nodes=[...nodeMap.keys()].map(old=>{
  const node=clone(gltf.nodes[old])
  if(node.mesh!==undefined)node.mesh=meshMap.get(node.mesh)
  if(node.children)node.children=node.children.filter(child=>nodeMap.has(child)).map(child=>nodeMap.get(child))
  return node
 })
 const meshes=[...meshMap.keys()].map(old=>{
  const mesh=clone(gltf.meshes[old])
  for(const primitive of mesh.primitives) {
   for(const key of Object.keys(primitive.attributes||{}))primitive.attributes[key]=accessorMap.get(primitive.attributes[key])
   if(primitive.indices!==undefined)primitive.indices=accessorMap.get(primitive.indices)
   for(const target of primitive.targets||[])for(const key of Object.keys(target))target[key]=accessorMap.get(target[key])
   if(primitive.material!==undefined)primitive.material=materialMap.get(primitive.material)
  }
  return mesh
 })
 const scenes=(gltf.scenes||[]).map(scene=>({...clone(scene),nodes:(scene.nodes||[]).filter(node=>nodeMap.has(node)).map(node=>nodeMap.get(node))}))
 const data={asset:clone(gltf.asset),scene:gltf.scene??0,scenes,nodes,meshes,
  accessors:[...accessorMap.keys()].map(old=>({...clone(gltf.accessors[old]),bufferView:viewMap.get(gltf.accessors[old].bufferView)})),
  bufferViews,buffers:[{byteLength:offset}],...(usedMaterials.size?{materials:[...materialMap.keys()].map(old=>clone(gltf.materials[old]))}:{})}
 const json=Buffer.from(JSON.stringify(data)),jsonPadding=(4-json.length%4)%4,binPadding=(4-offset%4)%4
 const jsonChunk=Buffer.concat([json,Buffer.alloc(jsonPadding,0x20)]),binChunk=Buffer.concat([...parts,Buffer.alloc(binPadding)])
 const header=Buffer.alloc(12),jsonHeader=Buffer.alloc(8),binHeader=Buffer.alloc(8)
 header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonChunk.length+binChunk.length,8)
 jsonHeader.writeUInt32LE(jsonChunk.length);jsonHeader.writeUInt32LE(0x4e4f534a,4)
 binHeader.writeUInt32LE(binChunk.length);binHeader.writeUInt32LE(0x004e4942,4)
 return Buffer.concat([header,jsonHeader,jsonChunk,binHeader,binChunk])
}

export async function buildFemaleDetailed(out=path.join(root,'public/models/female-detailed')) {
 const cache=path.join(root,'.model-cache/female')
 const manifest=JSON.parse(await readFile(path.join(cache,'manifest.json'),'utf8'))
 const existing=JSON.parse(await readFile(path.join(root,'public/models/female-regions/manifest.json'),'utf8'))
 const evidence=JSON.parse(await readFile(path.join(root,'public/licenses/female-provenance.json'),'utf8'))
 if(manifest.source?.sha256!==sourceDigest||evidence.sha256!==sourceDigest||manifest.license!=='CC BY 4.0')throw new Error('Provenance HRA originale non vérifiée')
 if(JSON.stringify(manifest.bounds.transform)!==JSON.stringify(existing.bounds.transform))throw new Error('Référentiels spatiaux différents')
 const leaf=manifest.structures.filter(s=>!s.aggregate&&s.sourceNode?.startsWith('VH_F_')&&s.id==='HRA-'+s.sourceNode)
 const ids=new Set(leaf.map(s=>s.id)),oldById=new Map(existing.structures.map(s=>[s.id,s]))
 if(ids.size!==leaf.length)throw new Error('Identifiants VH_F dupliqués')
 const structures=leaf.map(s=>oldById.get(s.id)??s)
 for(const s of manifest.structures)if(s.aggregate&&s.meshNames.length&&s.meshNames.every(id=>ids.has(id)))structures.push(oldById.get(s.id)??s)
 for(const s of existing.structures)if(s.id.startsWith('HRA-region-')) {
  if(!s.meshNames.every(id=>ids.has(id)))throw new Error('Une région existante n’appartient pas à la référence VH_F')
  structures.push(s)
 }
 // Explicit resource collections: exact VH_F renal source-node families, never inferred PART-OF edges.
 for(const [side,word] of [['L','left'],['R','right']]) {
  const pattern=new RegExp('^VH_F_(?:kidney_capsule|hilum_of_kidney|outer_cortex_of_kidney|renal_column|renal_papilla|renal_pyramid|renal_pelvis)_'+side+'(?:_[a-z])?$')
  const members=leaf.filter(s=>pattern.test(s.sourceNode)||s.sourceNode==='VH_F_'+word+'_renal_artery'||s.sourceNode==='VH_F_'+word+'_renal_vein')
  if(members.length)structures.push({id:'HRA-kidney-'+word,name:word+' kidney',group:'organs',groups:[...new Set(members.map(s=>s.group))],meshNames:members.flatMap(s=>s.meshNames),aggregate:true,
   assemblyProvenance:{type:'curated-resource-collection',reference:'female-source-crosswalk.csv',memberSourcePattern:pattern.source,associatedVessels:members.filter(s=>s.group==='arteries'||s.group==='veins').map(s=>s.sourceNode),validation:'pending-review'}})
 }
 if(new Set(structures.map(s=>s.id)).size!==structures.length)throw new Error('Assemblages dupliqués')
 await mkdir(out,{recursive:true})
 const groups=[],inputs=[]
 for(const group of manifest.groups) {
  const wanted=new Set(leaf.filter(s=>s.group===group.id).flatMap(s=>s.meshNames))
  if(!wanted.size)continue
  const original=await readFile(path.join(cache,group.id+'.glb'))
  if(sha(original)!==group.sha256)throw new Error('Cache altéré : '+group.id)
  const result=subsetGlb(original,wanted)
  const filename=group.id+'.glb';await writeFile(path.join(out,filename),result)
  groups.push({...group,url:'models/female-detailed/'+filename,bytes:result.length,sha256:sha(result),structures:wanted.size})
  inputs.push({group:group.id,sha256:sha(original),bytes:original.length,keptMeshNames:[...wanted]})
 }
 const provenance={...evidence,adaptationRevision:revision,changes:[...evidence.changes,'Keep only explicitly VH_F-named source nodes; exclude Allen and Yao source components','Subset nodes, accessors and binary bufferViews without changing geometry bytes or transforms','Retain existing regional identifiers and assemblies; publish as a distinct optional reference'],inputs,
  excludedSourceNodes:manifest.structures.filter(s=>!s.aggregate&&!ids.has(s.id)).map(s=>s.sourceNode),
  existingRegionalRevision:existing.atlasRevision,existingRegionalMeshIds:existing.structures.filter(s=>!s.aggregate).map(s=>s.id)}
 const output={...manifest,version:4,atlasRevision:revision,sex:'female',groups,structures,regions:existing.regions,specialist:false,source:provenance,
  limitations:['Only meshes explicitly identified as Visible Human Female (VH_F) are included; Allen and Yao components excluded','Reference anatomy is partial: no claim of a complete female skeleton, muscular or nervous system','Not an interchangeable mesh revision of the regional atlas; saved regional flashcards retain their original reference','No separately modelled gastric fundus, antrum or pylorus is present in these resources']}
 await writeFile(path.join(out,'manifest.json'),JSON.stringify(output,null,2)+'\n')
 await writeFile(path.join(out,'PROVENANCE.json'),JSON.stringify(provenance,null,2)+'\n')
 await writeFile(path.join(out,'LICENSE.txt'),await readFile(path.join(cache,'LICENSE.txt'),'utf8')+'\nAdditional adaptation: explicit Visible Human Female source nodes only, lossless GLB subset; Allen and Yao components excluded. Source geometry, normals, indices and coordinate transforms are retained.\n')
 console.log(JSON.stringify({revision,meshes:leaf.length,entries:structures.length,bytes:groups.reduce((total,g)=>total+g.bytes,0)},null,2))
 return output
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const index=process.argv.indexOf('--out')
 await buildFemaleDetailed(index>=0?path.resolve(process.argv[index+1]):undefined)
}
