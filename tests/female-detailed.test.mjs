import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {glbChunks,subsetGlb} from '../scripts/build-female-detailed.mjs'
const root=fileURLToPath(new URL('../',import.meta.url))
const out=process.env.ANATOMY_DETAILED_OUTPUT||path.join(root,'public/models/female-detailed')
const read=name=>JSON.parse(readFileSync(name,'utf8'))
const manifest=read(path.join(out,'manifest.json')),old=read(path.join(root,'public/models/female-regions/manifest.json'))
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
function geometry(buffer) {
 const {gltf,binary}=glbChunks(buffer),result=new Map()
 const accessor=index=>{
  const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView]
  const size=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type])*({5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a.componentType])
  assert.ok(size>0)
  const stride=v.byteStride||size,start=(v.byteOffset||0)+(a.byteOffset||0),parts=[]
  assert.ok(start+(a.count-1)*stride+size<=gltf.buffers[0].byteLength)
  for(let i=0;i<a.count;i++)parts.push(binary.subarray(start+i*stride,start+i*stride+size))
  return {componentType:a.componentType,type:a.type,count:a.count,sha256:sha(Buffer.concat(parts))}
 }
 for(const node of gltf.nodes)if(node.mesh!==undefined) {
  // These imported cache meshes have their source world transform baked into vertices.
  assert.equal(node.matrix,undefined);assert.equal(node.translation,undefined);assert.equal(node.rotation,undefined);assert.equal(node.scale,undefined)
  const primitives=gltf.meshes[node.mesh].primitives.map(p=>({mode:p.mode??4,indices:p.indices===undefined?null:accessor(p.indices),attributes:Object.fromEntries(Object.entries(p.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,index])=>[name,accessor(index)]))}))
  result.set(node.name,primitives)
 }
 return result
}

test('expanded female reference contains 591 explicitly VH_F source meshes and no Allen or Yao components',()=>{
 assert.equal(manifest.atlasRevision,'hra-vhf-detail-v1')
 const leaves=manifest.structures.filter(s=>!s.aggregate)
 assert.equal(leaves.length,591)
 assert.ok(leaves.every(s=>s.sourceNode.startsWith('VH_F_')&&s.id==='HRA-'+s.sourceNode))
 assert.ok(manifest.structures.every(s=>s.meshNames.every(name=>name.startsWith('HRA-VH_F_'))))
 assert.equal(manifest.structures.some(s=>s.id==='FMA50801'),false)
 assert.deepEqual(manifest.bounds,old.bounds)
 assert.equal(manifest.source.sha256,'472567a56896b9b7890508da6501fbf858e56aaa30745365f7a71ade782b529c')
 assert.equal(manifest.license,'CC BY 4.0')
})

test('all existing regional IDs, metadata, vertex coordinates and topology remain identical in the expanded reference',()=>{
 const byId=new Map(manifest.structures.map(s=>[s.id,s])),expanded=new Map()
 for(const g of manifest.groups)for(const [id,primitives] of geometry(readFileSync(path.join(out,g.id+'.glb'))))expanded.set(id,primitives)
 for(const structure of old.structures)assert.deepEqual(byId.get(structure.id),structure)
 for(const g of old.groups) {
  const originals=geometry(readFileSync(path.join(root,'public',g.url)))
  for(const [id,primitives] of originals) {
   const next=expanded.get(id)
   assert.equal(next.length,primitives.length)
   for(let index=0;index<primitives.length;index++) {
    assert.deepEqual(next[index].indices,primitives[index].indices,`topologie ${id}`)
    assert.deepEqual(next[index].attributes.POSITION,primitives[index].attributes.POSITION,`positions ${id}`)
    // The historical regional exporter recalculated normals; that reference remains unchanged.
    assert.equal(next[index].attributes.NORMAL.count,primitives[index].attributes.NORMAL.count)
   }
  }
 }
})

test('lossless subset keeps only selected real nodes and exact accessor data',()=>{
 const group=manifest.groups.find(g=>g.id==='organs')
 const source=readFileSync(path.join(out,group.id+'.glb')),all=geometry(source),id=[...all.keys()][0]
 const subset=subsetGlb(source,new Set([id])),selected=geometry(subset)
 assert.equal(selected.size,1);assert.deepEqual(selected.get(id),all.get(id))
 assert.ok(subset.length<source.length)
 assert.throws(()=>subsetGlb(source,new Set(['invented'])),/Sélection absente/)
})

test('extended assets match their SHA-256, exact buffer declarations and all versioned mappings',()=>{
 const names=new Map()
 for(const group of manifest.groups) {
  const bytes=readFileSync(path.join(out,group.id+'.glb'))
  assert.equal(bytes.length,group.bytes);assert.equal(sha(bytes),group.sha256)
  const meshes=geometry(bytes);assert.equal(meshes.size,group.structures)
  for(const id of meshes.keys()){assert.equal(names.has(id),false);names.set(id,group.id)}
 }
 for(const s of manifest.structures)for(const mesh of s.meshNames)assert.ok((s.groups||[s.group]).includes(names.get(mesh)))
 assert.equal(names.size,591)
})

test('renal resource collections have explicit source membership, both sides and a pending review status',()=>{
 for(const side of ['left','right']) {
  const kidney=manifest.structures.find(s=>s.id==='HRA-kidney-'+side)
  assert.ok(kidney?.aggregate);assert.equal(kidney.assemblyProvenance.validation,'pending-review')
  const members=manifest.structures.filter(s=>!s.aggregate&&kidney.meshNames.includes(s.id))
  assert.ok(members.some(s=>s.name==='renal pyramid'))
  assert.ok(members.some(s=>s.name==='renal papilla'))
  assert.ok(members.some(s=>s.name==='outer cortex of kidney'))
  assert.ok(members.every(s=>!s.name.includes('impression of liver')))
 }
})
