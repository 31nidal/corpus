import { useEffect, useMemo, useState } from 'react'
import type { Manifest } from '../types'
import { translateAnatomyName } from '../data/anatomy'
import { assemblyComponents, containingAssemblies, createAnatomicalGraph, validateGraphSource, vertebraCode } from './anatomicalGraph'
import type { AnatomyGraphSource, AnatomicalStructure } from './anatomicalGraph'
import './anatomyHierarchy.css'

type Props = { manifest: Manifest; selectedId: string; onSelect: (id: string) => void }

export default function AnatomyHierarchy({ manifest, selectedId, onSelect }: Props) {
  const [source, setSource] = useState<AnatomyGraphSource>()
  const [detailManifest, setDetailManifest] = useState<Manifest>()
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const isBP3D = Boolean(manifest.atlasRevision?.startsWith('bp3d-'))
  useEffect(() => { setDocumentId(null) }, [selectedId, manifest])
  useEffect(() => {
    setError('');setSource(undefined);setDetailManifest(undefined)
    if (!isBP3D) return
    const controller = new AbortController()
    const fetchJson = async (url: string) => {
      const response = await fetch(import.meta.env.BASE_URL + url, { signal: controller.signal })
      if (!response.ok) throw new Error('Les relations anatomiques sont indisponibles.')
      return response.json()
    }
    Promise.all([
      fetchJson('models/anatomical-relations.json'),
      manifest.atlasRevision === 'bp3d-overview-v1' ? fetchJson('models/manifest.json') : Promise.resolve(manifest),
    ]).then(([data, detailed]: [AnatomyGraphSource, Manifest]) => {
      if (controller.signal.aborted) return
      if (!Array.isArray(data.nodes) || !Array.isArray(data.relations) || validateGraphSource(data).length || !Array.isArray(detailed.structures) || data.mappedAtlasRevision !== detailed.atlasRevision) throw new Error('Le catalogue anatomique est invalide.')
      setSource(data); setDetailManifest(detailed)
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Chargement impossible.') })
    return () => controller.abort()
  }, [manifest, isBP3D, attempt])
  const activeManifest = isBP3D ? detailManifest ?? manifest : manifest
  const graph = useMemo(() => createAnatomicalGraph(activeManifest, source, translateAnatomyName), [activeManifest, source])
  const node = graph.nodes.get(documentId ?? selectedId)
  if (!node) return null
  const components = assemblyComponents(activeManifest.structures, node.id)
  const assemblies = containingAssemblies(activeManifest.structures, node.id)
  const label = (id: string) => {
    const entry = graph.nodes.get(id)
    const code = entry ? vertebraCode(entry.sourceName) : null
    return `${code ? code + ' · ' : ''}${entry?.frenchName ?? entry?.sourceName ?? id}`
  }
  const navigate = (entry: AnatomicalStructure) => {
    if (entry.availability === 'mapped') { setDocumentId(null); onSelect(entry.id) }
    else setDocumentId(entry.id)
  }
  const link = (id: string) => {
    const entry = graph.nodes.get(id)
    return entry && <button key={id} type="button" onClick={() => navigate(entry)}><span>{label(id)}</span><small>{entry.availability === 'mapped' ? '3D' : 'Sans maillage'}</small></button>
  }
  return <section className="anatomy-hierarchy" aria-label="Navigation anatomique">
    <h3>Explorer les structures</h3>
    {documentId && <button type="button" className="anatomy-return" onClick={() => setDocumentId(null)}>Revenir à la sélection 3D</button>}
    <p className="anatomy-node-title"><strong>{label(node.id)}</strong><code>{node.id}</code></p>
    <p className="anatomy-status">{node.availability === 'mapped' ? 'Correspondance 3D déclarée dans le manifeste' : 'Concept documenté · aucun maillage associé'}<br/>Données issues des sources · validation scientifique individuelle en attente.</p>
    {node.parentIds.length > 0 && <div className="anatomy-links"><h4>Structures parentes · PART-OF</h4>{node.parentIds.map(link)}</div>}
    {node.childIds.length > 0 && <details open className="anatomy-links"><summary>Subdivisions anatomiques ({node.childIds.length})</summary><div className="anatomy-link-list">{node.childIds.map(link)}</div></details>}
    {assemblies.length > 0 && <div className="anatomy-links"><h4>Retrouver l’ensemble 3D</h4>{assemblies.map(s => link(s.id))}</div>}
    {components.length > 0 && <details open className="anatomy-links"><summary>Composants de l’ensemble 3D ({components.length})</summary><p className="anatomy-status">Maillages sélectionnables de cette ressource ; cette liste ne constitue pas une hiérarchie anatomique exhaustive.</p><div className="anatomy-link-list">{components.map(s => link(s.id))}</div></details>}
    {!components.length && !node.childIds.length && <p className="anatomy-status">Aucune subdivision distincte documentée dans ce catalogue. Un maillage global ne permet pas d’isoler ses régions internes.</p>}
    {isBP3D && !source && !error && <p role="status">Chargement des relations…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Réessayer les relations</button></p>}
    <details className="anatomy-metadata"><summary>Traçabilité et données manquantes</summary>
      <dl><dt>Révision des correspondances</dt><dd>{activeManifest.atlasRevision ?? 'Inconnue'}</dd><dt>Nom latin normalisé / TA2</dt><dd>Non renseignés</dd><dt>Validation scientifique individuelle</dt><dd>En attente de relecture</dd></dl>
      <p>Les descriptions de la fiche sont des repères pédagogiques. Les rapports, l’innervation ou la vascularisation spécifiques non documentés ne sont pas déduits du nom du maillage.</p>
      {isBP3D && source && <a href={source.reference.url} target="_blank" rel="noreferrer">Source des relations : BodyParts3D PART-OF</a>}
      <a href={import.meta.env.BASE_URL + (isBP3D ? 'models/LICENSE.txt' : manifest.atlasRevision==='hra-vhf-detail-v1'?'models/female-detailed/LICENSE.txt':'models/female-regions/LICENSE.txt')} target="_blank" rel="noreferrer">Licence et attribution des modèles</a>
    </details>
  </section>
}
