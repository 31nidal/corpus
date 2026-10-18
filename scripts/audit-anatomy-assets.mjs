import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
export function readGlbMetadata(buffer) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) throw new Error('GLB 2 invalide')
  const jsonLength = buffer.readUInt32LE(12)
  if (buffer.toString('ascii', 16, 20) !== 'JSON' || 20 + jsonLength > buffer.length) throw new Error('Chunk JSON GLB invalide')
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength))
  return {gltf, meshNames: new Set((gltf.nodes || []).filter(node => Number.isInteger(node.mesh)).map(node => node.name))}
}
export async function auditAnatomyManifest(manifest, publicRoot = path.join(root, 'public')) {
  const errors = [], assets = new Map(), ids = new Set()
  if (!manifest.atlasRevision || !manifest.license) errors.push('Révision ou licence absente')
  const approved = {
    'bp3d-overview-v1': {license:'CC BY-SA 2.1 Japan',notice:'models/LICENSE.txt',provenance:'licenses/provenance.json'},
    'bp3d-detail-v1': {license:'CC BY-SA 2.1 Japan',notice:'models/LICENSE.txt',provenance:'licenses/detailed-provenance.json'},
    'hra-vhf-detail-v1': {license:'CC BY 4.0',notice:'models/female-detailed/LICENSE.txt',provenance:'licenses/female-detailed-provenance.json'},
    'hra-female-v1': {license:'CC BY 4.0',notice:'models/female-regions/LICENSE.txt',provenance:'licenses/female-provenance.json'},
  }[manifest.atlasRevision]
  if (!approved || manifest.license !== approved.license) errors.push('Révision ou licence non approuvée : vérifier les droits avant intégration')
  if (approved) for (const proof of [approved.notice,approved.provenance]) {
    try { if (!(await readFile(path.join(publicRoot,proof))).length) errors.push(`Preuve vide : ${proof}`) }
    catch { errors.push(`Preuve de droits absente : ${proof}`) }
  }
  for (const group of manifest.groups) {
    if (assets.has(group.id)) errors.push(`Groupe dupliqué : ${group.id}`)
    try {
      const filename = path.resolve(publicRoot, group.url)
      if (!filename.startsWith(path.resolve(publicRoot) + path.sep)) throw new Error('Chemin hors ressources publiques')
      const buffer = await readFile(filename)
      if (group.bytes !== buffer.length) errors.push(`Taille incorrecte : ${group.id}`)
      if (createHash('sha256').update(buffer).digest('hex') !== group.sha256) errors.push(`Empreinte incorrecte : ${group.id}`)
      assets.set(group.id, readGlbMetadata(buffer))
    } catch (error) { errors.push(`${group.id} : ${error.message}`) }
  }
  const owners = new Map()
  for (const [group, {meshNames}] of assets) for (const name of meshNames) {
    if (owners.has(name)) errors.push(`Nom de maillage présent dans plusieurs fichiers : ${name}`)
    owners.set(name, group)
  }
  for (const structure of manifest.structures) {
    if (!structure.id || ids.has(structure.id)) errors.push(`ID absent ou dupliqué : ${structure.id}`)
    ids.add(structure.id)
    if (!structure.meshNames?.length || new Set(structure.meshNames).size !== structure.meshNames.length) errors.push(`Correspondance vide ou dupliquée : ${structure.id}`)
    if (!assets.has(structure.group)) errors.push(`Groupe inconnu : ${structure.id}`)
    for (const name of structure.meshNames || []) {
      if (!owners.has(name)) errors.push(`Maillage introuvable : ${structure.id}/${name}`)
      else if (!(structure.groups || [structure.group]).includes(owners.get(name))) errors.push(`Couche réelle absente du mapping : ${structure.id}/${name}`)
    }
  }
  return {revision: manifest.atlasRevision, structures: ids.size, meshes: owners.size, errors}
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const filename of ['models/overview.json','models/manifest.json','models/female-regions/manifest.json','models/female-detailed/manifest.json']) {
    const manifest = JSON.parse(await readFile(path.join(root, 'public', filename), 'utf8'))
    const result = await auditAnatomyManifest(manifest)
    console.log(JSON.stringify(result, null, 2))
    if (result.errors.length) process.exitCode = 1
  }
}
