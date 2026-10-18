import type { Manifest, Structure } from '../types'

export type ScientificStatus = 'source-derived' | 'pending-review' | 'validated'
export type AnatomicalReference = { id: string; title: string; url: string; license: string | null }
export type AnatomicalRelation = { parentId: string; childId: string; type: 'part-of'; referenceId: string }
export type AnatomicalSystem = {id:string; frenchName:string; referenceIds:string[]}
export type AnatomicalRegion = {id:string; frenchName:string; parentIds:string[]; referenceIds:string[]}
export type AnatomyAsset = {id:string; revision:string; groupId:string; url:string; bytes:number; sha256:string|null; license:string|null}
export type StructureMeshMapping = { assetId: string; structureId: string; assetRevision: string; groupId: string; meshNames: string[]; representation: 'assembly' | 'surface'; validation: 'manifest-declared' }
export type AnatomicalStructure = {
  id: string; sourceName: string; frenchName: string | null; latinName: string | null; ta2Id: string | null
  synonyms: string[]; systemIds: string[]; regionIds: string[]; parentIds: string[]; childIds: string[]
  description: string | null; function: string | null; vascularization: string | null; innervation: string | null
  spatialRelations: string[]; clinicalInterest: string | null; referenceIds: string[]
  pedagogicalDepth: number | null; scientificStatus: ScientificStatus
  mappings: StructureMeshMapping[]; availability: 'mapped' | 'documented-only'
}
export type AnatomyGraphSource = {
  version: 1; mappedAtlasRevision: string; reference: AnatomicalReference; sourceSha256: string
  nodes: { id: string; name: string }[]; relations: AnatomicalRelation[]
}
export type AnatomicalGraph = { nodes: Map<string, AnatomicalStructure>; relations: AnatomicalRelation[]; assets: AnatomyAsset[] }

/** Numbering comes only from explicit source names; never from the order of meshes. */
export function vertebraCode(name: string): string | null {
  if (name === 'atlas') return 'C1'
  if (name === 'axis') return 'C2'
  const ordinals = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth']
  const match = /^(\w+) (cervical|thoracic|lumbar) vertebra$/.exec(name)
  if (!match) return null
  const number = ordinals.indexOf(match[1]) + 1
  const max = match[2] === 'cervical' ? 7 : match[2] === 'thoracic' ? 12 : 5
  return number > 0 && number <= max ? `${{cervical:'C',thoracic:'T',lumbar:'L'}[match[2]]}${number}` : null
}

export function createAnatomicalGraph(manifest: Manifest, source?: AnatomyGraphSource, translate: (name: string) => string | null = () => null): AnatomicalGraph {
  const compatibleSource = source && manifest.atlasRevision?.startsWith('bp3d-') && source.mappedAtlasRevision === manifest.atlasRevision
  const nodes = new Map<string, AnatomicalStructure>()
  const revision = manifest.atlasRevision ?? 'unversioned'
  const meshGroups = new Map<string,string>()
  for (const s of manifest.structures) if (!s.aggregate) for (const mesh of s.meshNames) meshGroups.set(mesh,s.group)
  const assets: AnatomyAsset[] = manifest.groups.map(group => ({id:`${revision}:${group.id}`,revision,groupId:group.id,url:group.url,bytes:group.bytes,sha256:group.sha256 ?? null,license:manifest.license ?? null}))
  const add = (id: string, name: string, structure?: Structure) => {
    const code = vertebraCode(name)
    nodes.set(id, {
      id, sourceName: name, frenchName: translate(name), latinName: null, ta2Id: null,
      synonyms: code ? [code] : [], systemIds: [], regionIds: [], parentIds: [], childIds: [],
      description: null, function: null, vascularization: null, innervation: null, spatialRelations: [], clinicalInterest: null,
      referenceIds: compatibleSource ? [source.reference.id] : [], pedagogicalDepth: null, scientificStatus: structure?.assemblyProvenance?.validation ?? 'source-derived',
      mappings: structure ? assets.map(asset => ({assetId:asset.id, structureId:id, assetRevision:revision, groupId:asset.groupId,
        meshNames:structure.meshNames.filter(mesh => (meshGroups.get(mesh) ?? structure.group) === asset.groupId),
        representation:structure.aggregate ? 'assembly' as const : 'surface' as const, validation:'manifest-declared' as const})).filter(mapping=>mapping.meshNames.length>0) : [],
      availability: structure?.meshNames.length ? 'mapped' : 'documented-only',
    })
  }
  // A PART-OF file from another reference body must never extend the HRA atlas.
  if (compatibleSource) for (const node of source.nodes) add(node.id, node.name)
  for (const structure of manifest.structures) add(structure.id, structure.name, structure)
  const relations = compatibleSource ? source.relations.filter(r => nodes.has(r.parentId) && nodes.has(r.childId)) : []
  for (const relation of relations) {
    const parent = nodes.get(relation.parentId)!, child = nodes.get(relation.childId)!
    if (!parent.childIds.includes(child.id)) parent.childIds.push(child.id)
    if (!child.parentIds.includes(parent.id)) child.parentIds.push(parent.id)
  }
  return { nodes, relations, assets }
}

/** Resource composition, not a claim of anatomical PART-OF or spatial adjacency. */
export function assemblyComponents(structures: Structure[], id: string): Structure[] {
  const parent = structures.find(s => s.id === id)
  if (!parent?.aggregate) return []
  const names = new Set(parent.meshNames)
  return structures.filter(s => s.id !== id && !s.aggregate && s.meshNames.length > 0 && s.meshNames.every(name => names.has(name)))
}
export function containingAssemblies(structures: Structure[], id: string): Structure[] {
  const child = structures.find(s => s.id === id)
  if (!child) return []
  return structures.filter(s => s.aggregate && s.id !== id && child.meshNames.length > 0 && child.meshNames.every(name => s.meshNames.includes(name)))
}

export function anatomicalDescendants(graph: AnatomicalGraph, id: string): AnatomicalStructure[] {
  const seen = new Set<string>([id]), result: AnatomicalStructure[] = [], queue = [...(graph.nodes.get(id)?.childIds ?? [])]
  for (let index = 0; index < queue.length; index++) {
    const node = graph.nodes.get(queue[index])
    if (!node || seen.has(node.id)) continue
    seen.add(node.id); result.push(node); queue.push(...node.childIds)
  }
  return result
}

export function validateGraphSource(source: AnatomyGraphSource): string[] {
  const errors: string[] = [], ids = new Set<string>(), edges = new Set<string>()
  if (source.version !== 1 || !source.mappedAtlasRevision || !source.reference?.id || !source.reference?.url || !source.sourceSha256) errors.push('Provenance absente ou version inconnue')
  for (const node of source.nodes) {
    if (!node.id || !node.name || ids.has(node.id)) errors.push(`Identifiant absent ou dupliqué : ${node.id}`)
    ids.add(node.id)
  }
  const children = new Map<string, string[]>()
  for (const relation of source.relations) {
    const key = `${relation.parentId}:${relation.childId}`
    if (!ids.has(relation.parentId) || !ids.has(relation.childId)) errors.push(`Relation orpheline : ${key}`)
    if (edges.has(key)) errors.push(`Relation dupliquée : ${key}`)
    if (relation.type !== 'part-of' || relation.referenceId !== source.reference.id) errors.push(`Source de relation invalide : ${key}`)
    edges.add(key); children.set(relation.parentId, [...(children.get(relation.parentId) ?? []), relation.childId])
  }
  const visiting = new Set<string>(), done = new Set<string>()
  const visit = (id: string) => {
    if (visiting.has(id)) { errors.push(`Cycle anatomique : ${id}`); return }
    if (done.has(id)) return
    visiting.add(id); for (const child of children.get(id) ?? []) visit(child)
    visiting.delete(id); done.add(id)
  }
  for (const id of ids) visit(id)
  return errors
}
