import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createAnatomicalGraph, assemblyComponents, containingAssemblies, anatomicalDescendants, validateGraphSource, vertebraCode} from '../src/atlas/anatomicalGraph.ts'
import {meshOpacityMultiplier} from '../src/atlas/scene.ts'
import {makeAnatomyQuestions, acceptsAnatomicalAnswer, readAnatomyProgress} from '../src/atlas/anatomyLearning.ts'
import {auditAnatomyManifest,readGlbMetadata} from '../scripts/audit-anatomy-assets.mjs'
const read = name => JSON.parse(readFileSync(new URL('../'+name, import.meta.url),'utf8'))
const manifest = read('public/models/manifest.json'), female=read('public/models/female-regions/manifest.json'), source=read('public/models/anatomical-relations.json')

test('source graph has provenance, valid IDs, unique edges, no cycles and the exact source fingerprint',()=>{
  assert.deepEqual(validateGraphSource(source),[])
  assert.equal(source.sourceSha256,createHash('sha256').update(readFileSync(new URL('../public/licenses/partof_inclusion_relation_list.txt',import.meta.url))).digest('hex'))
  const graph=createAnatomicalGraph(manifest,source)
  assert.ok(graph.nodes.get('FMA7088').childIds.includes('FMA9466'))
  assert.ok(graph.nodes.get('FMA9466').parentIds.includes('FMA7088'))
  assert.ok(anatomicalDescendants(graph,'FMA13478').some(n=>n.id==='FMA16202'))
})
test('composition is mesh-backed and separate from anatomical relationships',()=>{
  const heart=assemblyComponents(manifest.structures,'FMA7088')
  assert.equal(heart.length,40)
  assert.ok(heart.some(s=>s.name==='cavity of right atrium'))
  assert.ok(containingAssemblies(manifest.structures,heart[0].id).some(s=>s.id==='FMA7088'))
  assert.deepEqual(assemblyComponents(manifest.structures,'FMA7148'),[])
  assert.deepEqual(createAnatomicalGraph(manifest,source).nodes.get('FMA7148').childIds,[])
})
test('all 24 presacral vertebrae have source-derived numbering, with atlas and axis retained',()=>{
  const codes=manifest.structures.map(s=>vertebraCode(s.name)).filter(Boolean)
  assert.equal(new Set(codes).size,24)
  for (const [region,total] of [['C',7],['T',12],['L',5]]) for(let i=1;i<=total;i++)assert.ok(codes.includes(region+i))
  assert.equal(vertebraCode('intervertebral disk of third cervical vertebra'),null)
})
test('female reference has its own mappings and never inherits male PART-OF concepts',()=>{
  const graph=createAnatomicalGraph(female,source)
  assert.equal(graph.nodes.size,female.structures.length)
  assert.equal(graph.relations.length,0)
  assert.equal(graph.nodes.has('FMA7088'),false)
  assert.ok([...graph.nodes.values()].every(n=>n.mappings.every(m=>m.assetRevision==='hra-female-v1')))
})
test('unknown medical and TA2 fields remain explicitly unknown; documented ancestors are not mapped',()=>{
  const graph=createAnatomicalGraph(manifest,source)
  const missing=[...graph.nodes.values()].find(n=>n.availability==='documented-only')
  assert.ok(missing);assert.deepEqual(missing.mappings,[])
  assert.equal(missing.latinName,null);assert.equal(missing.ta2Id,null);assert.equal(missing.innervation,null)
  assert.equal(missing.scientificStatus,'source-derived')
})
test('validator detects orphan relations, duplicates and cycles',()=>{
  assert.ok(validateGraphSource({...source,nodes:[...source.nodes,source.nodes[0]]}).some(e=>e.includes('dupliqué')))
  assert.ok(validateGraphSource({...source,relations:[...source.relations,{parentId:'missing',childId:source.nodes[0].id,type:'part-of',referenceId:source.reference.id}]}).some(e=>e.includes('orpheline')))
  const edge=source.relations[0]
  assert.ok(validateGraphSource({...source,relations:[...source.relations,{...edge,parentId:edge.childId,childId:edge.parentId}]}).some(e=>e.includes('Cycle')))
})
test('individual opacity applies to shared meshes and assemblies, clamps inputs and preserves unrelated structures',()=>{
  assert.equal(meshOpacityMultiplier(['parent','child'],{parent:.6,child:.3}),.3)
  assert.equal(meshOpacityMultiplier(['other'],{parent:0}),1)
  assert.equal(meshOpacityMultiplier(['child'],{child:0}),0)
  assert.equal(meshOpacityMultiplier(['child'],{child:-1}),0)
  assert.equal(meshOpacityMultiplier(['child'],{child:NaN}),1)
})
test('identification quiz uses real non-aggregate targets and accepts source names, synonyms, accents and vertebra codes',()=>{
  const questions=makeAnatomyQuestions(manifest.structures,s=>s.name,2000,()=>.5)
  assert.equal(questions.length,manifest.structures.filter(s=>!s.aggregate).length)
  assert.ok(questions.every(q=>q.options.some(o=>o.id===q.id)&&new Set(q.options.map(o=>o.name)).size===q.options.length))
  const c3=questions.find(q=>q.aliases.includes('C3'))
  assert.ok(acceptsAnatomicalAnswer(c3,'c3'));assert.equal(acceptsAnatomicalAnswer(c3,'C4'),false)
  assert.ok(acceptsAnatomicalAnswer({aliases:['Cœur droit']},'coeur droit'))
  assert.equal(acceptsAnatomicalAnswer({aliases:['Cœur droit']},''),false)
})
test('progress tolerates corrupt storage and validates attempts',()=>{
  assert.deepEqual(readAnatomyProgress('{bad'),{version:1,attempts:[]})
  const attempt={id:'a',revision:'bp3d-detail-v1',mode:'free',startedAt:'2026-10-17',completedAt:'2026-10-17',durationSeconds:3,answers:[{structureId:'FMA7148',given:'estomac',correct:true}]}
  assert.deepEqual(readAnatomyProgress(JSON.stringify({version:1,attempts:[attempt,{},null]})).attempts,[attempt])
})
test('all three asset manifests match real GLB nodes, real groups, lengths and SHA-256',async()=>{
  for(const file of ['public/models/overview.json','public/models/manifest.json','public/models/female-regions/manifest.json'])assert.deepEqual((await auditAnatomyManifest(read(file))).errors,[])
})
test('asset audit rejects invalid GLB and phantom mesh declarations',async()=>{
  assert.throws(()=>readGlbMetadata(Buffer.alloc(12)),/GLB/)
  const invalid=structuredClone(manifest);invalid.structures[0].meshNames=['invented'];
  assert.ok((await auditAnatomyManifest(invalid)).errors.some(e=>e.includes('Maillage introuvable')))
})

test('unapproved asset revisions and noncommercial license declarations fail the import gate',async()=>{
 const invalid={...manifest,license:'CC BY-NC 4.0'}
 assert.ok((await auditAnatomyManifest(invalid)).errors.some(e=>e.includes('non approuvée')))
 assert.ok((await auditAnatomyManifest({...manifest,atlasRevision:'untested-new-assets'})).errors.some(e=>e.includes('non approuvée')))
})

test('mesh mappings split multi-layer assemblies into versioned assets and reject foreign graph revisions',()=>{
 const graph=createAnatomicalGraph(manifest,source)
 const heart=graph.nodes.get('FMA7088')
 assert.equal(heart.mappings.flatMap(m=>m.meshNames).length,40)
 for(const mapping of heart.mappings) assert.ok(graph.assets.some(a=>a.id===mapping.assetId&&a.revision===mapping.assetRevision&&a.groupId===mapping.groupId))
 assert.equal(createAnatomicalGraph({...manifest,atlasRevision:'bp3d-detail-v2'},source).relations.length,0)
})

test('click exercises exclude surfaces that the explorer only reveals on selection',async()=>{
 const {eligibleAnatomyTargets}=await import('../src/atlas/anatomyLearning.ts')
 const surface={id:'surface',name:'source surface',group:'organs',meshNames:['mesh'],detailOnly:true}
 assert.deepEqual(eligibleAnatomyTargets([surface],'click'),[])
 assert.equal(eligibleAnatomyTargets([surface],'free').length,1)
 assert.deepEqual(eligibleAnatomyTargets([{...surface,aggregate:true}],'free'),[])
})

test('click targets exclude ambiguous translated names while preserving other exercise modes',async()=>{
 const {eligibleAnatomyTargets}=await import('../src/atlas/anatomyLearning.ts')
 const structures=[{id:'one',name:'papilla one',group:'organs',meshNames:['a']},{id:'two',name:'papilla two',group:'organs',meshNames:['b']},{id:'three',name:'cortex',group:'organs',meshNames:['c']}]
 const label=s=>s.name.startsWith('papilla')?'Papille rénale':'Cortex rénal'
 assert.deepEqual(eligibleAnatomyTargets(structures,'click',label).map(s=>s.id),['three'])
 assert.equal(eligibleAnatomyTargets(structures,'mcq',label).length,3)
})

test('female detailed graph keeps renal collections pending review and never inherits male relations',()=>{
 const extended=read('public/models/female-detailed/manifest.json'),graph=createAnatomicalGraph(extended,source)
 assert.equal(graph.relations.length,0)
 assert.equal(graph.nodes.get('HRA-kidney-left').scientificStatus,'pending-review')
 assert.ok(graph.nodes.get('FMA7088').mappings.every(mapping=>mapping.assetRevision==='hra-vhf-detail-v1'))
})

test('female detailed long source IDs persist through shared scenes and attempt validation',async()=>{
 const {encodeView,decodeView,defaultOpacity,defaultCut}=await import('../src/viewState.ts')
 const {validAnatomyAttempt}=await import('../shared/anatomyProgress.mjs')
 const structureId='HRA-VH_F_left_posterior_descending_branch_of_circumflex_branch_of_left_coronary_artery'
 const view={version:1,camera:{position:[0,0,6],target:[0,0,0]},visibility:Object.fromEntries(Object.keys(defaultOpacity).map(group=>[group,true])),opacity:defaultOpacity,structureOpacities:{[structureId]:.4},cut:defaultCut,isolated:false,hidden:[structureId],labels:'off',dark:false}
 assert.deepEqual(decodeView(encodeView(view)),view)
 assert.equal(validAnatomyAttempt({id:'attempt_extended',revision:'hra-vhf-detail-v1',mode:'click',startedAt:'2026-10-17T10:00:00Z',completedAt:'2026-10-17T10:01:00Z',durationSeconds:60,answers:[{structureId,given:'artère',correct:true}]}),true)
})
