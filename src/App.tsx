import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Bone, ChevronDown, CircleHelp, Eye, Heart, Layers3, Minus, MoveUpRight, Plus, Rotate3D, RotateCcw, Search, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react'
import AnatomyViewer from './AnatomyViewer'
import { describeStructure } from './data/anatomy'
import type { GroupId, LoadState, Manifest, ViewerApi, Visibility } from './types'

const initialVisibility: Visibility = { skin: true, skeleton: true, organs: true, muscles: false, arteries: false, veins: false, nerves: false, joints: false }
const groupMeta = {
  skin: { name: 'Enveloppe corporelle', subtitle: 'Le contour du corps', icon: UserRound, color: '#76d7cc' },
  skeleton: { name: 'Squelette', subtitle: 'L’architecture intérieure', icon: Bone, color: '#d9d5bd' },
  organs: { name: 'Organes', subtitle: 'Au cœur du vivant', icon: Heart, color: '#db938c' },
  arteries: { name: 'Artères', subtitle: 'Le réseau artériel', icon: Heart, color: '#cf5b61' },
  veins: { name: 'Veines', subtitle: 'Le retour veineux', icon: Heart, color: '#5785c4' },
  nerves: { name: 'Nerfs', subtitle: 'Les connexions du corps', icon: Sparkles, color: '#bd9639' },
  joints: { name: 'Articulations', subtitle: 'Cartilages et ligaments', icon: Layers3, color: '#91b8bb' },
  muscles: { name: 'Muscles', subtitle: 'Le corps en mouvement', icon: Layers3, color: '#bb756c' },
}
const normalise = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe')

function Brand() {
  return <a className="brand" href="./" aria-label="Corpus, accueil"><svg viewBox="0 0 28 38" fill="none" aria-hidden="true"><path d="M5 2c0 16 18 18 18 34M23 2C23 18 5 20 5 36M7 8h14M10 14h8M10 24h8M7 30h14" stroke="currentColor" strokeWidth="1.5" /></svg><span>corpus<span className="brand-dot">.</span></span></a>
}

export default function App() {
  const [detailMode, setDetailMode] = useState(true)
  const [isolated, setIsolated] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogGroup, setCatalogGroup] = useState('all')
  const [catalogLimit, setCatalogLimit] = useState(60)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [manifestError, setManifestError] = useState(false)
  const [load, setLoad] = useState<LoadState>({ progress: 0, ready: [], error: null, complete: false })
  const [visibility, setVisibility] = useState(initialVisibility)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchIndex, setSearchIndex] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [modal, setModal] = useState<'about' | 'help' | null>(null)
  const [layersOpen, setLayersOpen] = useState(false)
  const [orientation, setOrientation] = useState<'front' | 'back'>('front')
  const apiRef = useRef<ViewerApi | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchBox = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const detailCloseRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setManifest(null); setSelectedId(null); setHiddenIds([]); setIsolated(false); setManifestError(false)
    setLoad({progress:0,ready:[],error:null,complete:false})
    fetch(`${import.meta.env.BASE_URL}models/${detailMode ? 'manifest.json' : 'overview.json'}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('manifest'); return response.json() })
      .then((data: Manifest) => { if (!data.groups?.length || !data.structures?.length) throw new Error('manifest'); setManifest(data) })
      .catch(error => { if (error.name !== 'AbortError') setManifestError(true) })
    return () => controller.abort()
  }, [detailMode])

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') { event.preventDefault(); searchRef.current?.focus() }
      if (event.key === 'Escape') { setSearchOpen(false); setLayersOpen(false) }
    }
    function outside(event: PointerEvent) { if (!searchBox.current?.contains(event.target as Node)) setSearchOpen(false) }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside) }
  }, [])

  useEffect(() => {
    if (modal) { previousFocus.current = document.activeElement as HTMLElement; dialogRef.current?.showModal() }
    else if (dialogRef.current?.open) { dialogRef.current.close(); previousFocus.current?.focus() }
  }, [modal])

  const structures = manifest?.structures ?? []
  const selected = structures.find(s => s.id === selectedId)
  const description = selected ? describeStructure(selected.name, selected.group) : null
  const hovered = structures.find(s => s.id === hover?.id)
  const filtered = structures.filter(s => {
    const d = describeStructure(s.name, s.group)
    return normalise([d.name, d.system, ...d.keywords].join(' ')).includes(normalise(query.trim()))
  }).sort((a,b) => Number(Boolean(b.aggregate)) - Number(Boolean(a.aggregate))).slice(0, query ? 35 : 8)

  const selectStructure = useCallback((id: string) => {
    const structure = manifest?.structures.find(s => s.id === id)
    if (!structure) return
    setVisibility(v => ({ ...v, ...Object.fromEntries((structure.groups ?? [structure.group]).map(g => [g, true])) }))
    setHiddenIds(ids => ids.filter(hidden => hidden !== id)); setCatalogOpen(false)
    setSelectedId(id); setSearchOpen(false); setQuery(''); setHover(null); setLayersOpen(false)
  }, [manifest])
  const applyPreset = (groups: GroupId[]) => {
    setVisibility(Object.fromEntries(Object.keys(initialVisibility).map(id => [id, groups.includes(id as GroupId)])) as Visibility)
    setHiddenIds([]); setIsolated(false); setSelectedId(null); setLayersOpen(false)
    setResetKey(k => k + 1); setOrientation('front')
  }
  const reset = () => { setSelectedId(null); setIsolated(false); setHover(null); setResetKey(k => k + 1); setOrientation('front') }
  const toggleGroup = (id: GroupId) => {
    setVisibility(v => ({ ...v, [id]: !v[id] }))
    if (selected?.group === id && visibility[id]) { setSelectedId(null); setResetKey(k => k + 1) }
  }
  const onLoad = useCallback((state: LoadState) => setLoad(state), [])
  const nextStructure = (direction: number) => {
    if (!selected) return
    const siblings = structures.filter(s => s.group === selected.group)
    selectStructure(siblings[(siblings.findIndex(s => s.id === selectedId) + direction + siblings.length) % siblings.length].id)
  }
  const quickFind = (term: string) => structures.find(s => s.id === ({'Cœur':'FMA7088','Cerveau':'FMA50801','Poumon':'FMA7309'} as Record<string,string>)[term])
  const hiddenMeshes = new Set(hiddenIds.flatMap(id => structures.find(s => s.id === id)?.meshNames ?? []))
  const visibleCount = structures.filter(s => !s.aggregate && visibility[s.group] && load.ready.includes(s.group) && s.meshNames.some(name => !hiddenMeshes.has(name) && (!isolated || !selected || selected.meshNames.includes(name)))).length
  const catalog = structures.filter(s => catalogGroup === 'all' || s.group === catalogGroup)
  const setAllLayers = (on: boolean) => {setVisibility(Object.fromEntries(Object.keys(initialVisibility).map(id => [id,on])) as Visibility);setHiddenIds([]);setIsolated(false);setSelectedId(null)}

  return <main className="experience" data-selected={selectedId ?? ''} data-loaded={load.complete}>
    <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="world-grid" />
    <header className="topbar">
      <Brand />
      <nav aria-label="Navigation principale"><span className="nav-active"><span /> Exploration</span><button onClick={() => setModal('about')}>Le projet <ArrowUpRight size={13} /></button></nav>
      <div className="search-wrap" ref={searchBox}>
        <div className={`search-input ${searchOpen ? 'is-open' : ''}`}>
          <Search size={17} /><input ref={searchRef} value={query} onChange={e => { setQuery(e.target.value); setSearchIndex(0); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} placeholder="Rechercher une structure…" aria-label="Rechercher une structure" role="combobox" aria-expanded={searchOpen} aria-controls="search-results" aria-autocomplete="list" aria-activedescendant={searchOpen && filtered[searchIndex] ? `result-${filtered[searchIndex].id}` : undefined} onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIndex(i => Math.min(i + 1, filtered.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIndex(i => Math.max(i - 1, 0)) }
            if (e.key === 'Enter' && filtered[searchIndex]) { e.preventDefault(); selectStructure(filtered[searchIndex].id); searchRef.current?.blur() }
          }} /><kbd>⌘ K</kbd>
          {query && <button className="clear-search" aria-label="Effacer la recherche" onClick={() => { setQuery(''); searchRef.current?.focus() }}><X size={14} /></button>}
        </div>
        {searchOpen && <div className="search-results" id="search-results" role="listbox" aria-label="Structures anatomiques"><p className="eyebrow">{query ? `${filtered.length}${filtered.length === 35 ? '+' : ''} résultats` : 'À explorer'}</p>{filtered.length ? filtered.map((s, index) => <button key={s.id} role="option" aria-selected={index === searchIndex} id={`result-${s.id}`} onPointerMove={() => setSearchIndex(index)} onClick={() => selectStructure(s.id)}><span className="result-dot" style={{ background: groupMeta[s.group].color }} /><span>{describeStructure(s.name, s.group).name}<small>{groupMeta[s.group].name}</small></span><ArrowUpRight size={15} /></button>) : <p className="empty-search">Aucune structure trouvée.<br />Essayez « cœur », « rein » ou « fémur ».</p>}</div>}
      </div>
    </header>

    <aside className="intro">
      <div className="edition"><span className="pulse-dot" /> ATLAS ANATOMIQUE <span className="edition-number">ÉDITION 03</span></div>
      <h1>Explorez le corps.<br /><em>Comprenez le vivant.</em></h1>
      <p className="intro-text">1 663 structures. Une nouvelle perspective.</p>
      <div className="atlas-mode" aria-label="Niveau de détail"><button aria-pressed={!detailMode} onClick={() => setDetailMode(false)}>Vue d’ensemble</button><button aria-pressed={detailMode} onClick={() => setDetailMode(true)}>Atlas détaillé</button></div>
    </aside>

    <div className="view-presets" aria-label="Vues rapides"><span>Vues rapides</span>{([
      {name:'Organes',groups:['skin','skeleton','organs']},
      {name:'Squelette',groups:['skin','skeleton']},
      ...(detailMode ? [{name:'Muscles',groups:['skin','muscles']}] : [])
    ] as {name:string;groups:GroupId[]}[]).map(preset=><button key={preset.name} aria-label={`Vue ${preset.name.toLowerCase()}`} aria-pressed={Object.entries(visibility).every(([id,on])=>on===preset.groups.includes(id as GroupId))} onClick={()=>applyPreset(preset.groups)}>{preset.name}</button>)}</div>
    <section className={`stage ${selected ? 'has-selection' : ''}`} aria-label="Corps humain en trois dimensions">
      <div className="stage-orbit orbit-one" /><div className="stage-orbit orbit-two" />
      <div className="stage-axis" /><span className="axis-label axis-top">SUPÉRIEUR</span><span className="axis-label axis-bottom">INFÉRIEUR</span>
      {manifest && <AnatomyViewer manifest={manifest} visibility={visibility} selectedId={selectedId} resetKey={resetKey} onSelect={selectStructure} onHover={setHover} onLoad={onLoad} apiRef={apiRef} isolated={isolated} hiddenIds={hiddenIds} />}
      {(!load.complete && !load.error && !manifestError) && <div className={`loading-indicator ${load.ready.length ? 'loading-small' : ''}`} role="status"><span className="loading-symbol"><Brand /></span><span>{load.ready.length ? 'Les structures prennent forme' : 'Le vivant se révèle'}</span><div className="progress-track"><div style={{ width: `${load.progress}%` }} /></div><small>CHARGEMENT DES MAILLAGES <span>{Math.round(load.progress)} %</span></small></div>}
      {(load.error || manifestError) && <div className="error-panel" role="alert"><CircleHelp size={24} /><h2>Le modèle n’a pas pu se charger</h2><p>{manifestError ? 'Le catalogue anatomique est indisponible.' : load.error}</p><button onClick={() => window.location.reload()}>Réessayer <RotateCcw size={15} /></button></div>}
      {load.complete && visibleCount === 0 && <div className="empty-model"><Layers3 size={26} /><p>Le corps attend votre regard.</p><button onClick={() => setVisibility(initialVisibility)}>Afficher les structures <Eye size={15} /></button></div>}
      <div className="view-corner"><span className="corner-cross">+</span> {detailMode ? "ATLAS DÉTAILLÉ" : "VUE D’ENSEMBLE"}<br /><span className="coordinate">{orientation === 'front' ? 'VUE ANTÉRIEURE' : 'VUE POSTÉRIEURE'} · POSITION LIBRE</span></div>
    </section>

    <aside className={`layers-panel ${layersOpen ? 'mobile-open' : ''}`} aria-label="Couches anatomiques">
      <button className="mobile-layers-toggle" onClick={() => setLayersOpen(v => !v)} aria-expanded={layersOpen}><Layers3 size={17} /> Couches anatomiques <span>{manifest?.groups.filter(g => visibility[g.id]).length ?? 0}</span><ChevronDown size={15} /></button>
      <div className="layers-content"><div className="section-label"><span>COUCHES ANATOMIQUES</span><Layers3 size={14} /></div>
        {manifest?.groups.map(group => { const meta = groupMeta[group.id]; const Icon = meta.icon; return <button className={`layer-row ${visibility[group.id] ? 'layer-on' : ''}`} key={group.id} role="switch" aria-checked={visibility[group.id]} aria-label={meta.name} onClick={() => toggleGroup(group.id)} title={load.ready.includes(group.id) ? "Afficher ou masquer" : "Charger cette couche"}><span className="layer-icon" style={{ color: meta.color }}><Icon size={20} strokeWidth={1.4} /></span><span className="layer-text">{meta.name}<small>{structures.filter(s => s.group === group.id && !s.aggregate).length} structures{visibility[group.id] && !load.ready.includes(group.id) ? " · chargement…" : ""}</small></span><span className="switch"><span /></span></button> })}
        <div className="layer-actions"><button onClick={() => setAllLayers(true)}>Tout afficher</button><button onClick={() => setAllLayers(false)}>Tout masquer</button></div>{hiddenIds.length > 0 && <button className="restore-hidden" onClick={() => setHiddenIds([])}>Rétablir {hiddenIds.length} structure(s) masquée(s)</button>}<p className="layer-note"><span /> L’enveloppe est transparente pour révéler l’intérieur.</p>
      </div>
    </aside>

    {!selected && !catalogOpen && <aside className="discovery"><span className="discovery-index">VOTRE EXPLORATION</span><div className="discovery-line" /><h2>Un point de départ.</h2><p>Choisissez une structure, puis isolez-la pour découvrir ses détails.</p><span className="discovery-arrow"><MoveUpRight size={27} strokeWidth={1} /></span><button className="browse-atlas" onClick={() => setCatalogOpen(true)}>Parcourir l’atlas <ArrowUpRight size={15} /></button><div className="quick-links">{['Cœur', 'Cerveau', 'Poumon'].map(term => { const s = quickFind(term); return s ? <button key={term} onClick={() => selectStructure(s.id)} disabled={!load.ready.includes(s.group)}>{term === 'Poumon' ? 'Poumons' : term}<ArrowUpRight size={12} /></button> : null })}</div></aside>}

    {catalogOpen && !selected && <aside className="detail-panel catalog-panel" aria-label="Index anatomique"><div className="detail-heading"><span className="eyebrow">INDEX ANATOMIQUE</span><button className="icon-button" aria-label="Fermer l’index" onClick={() => setCatalogOpen(false)}><X size={18}/></button></div><div className="catalog-filter"><select aria-label="Filtrer l’index par système" value={catalogGroup} onChange={e=>{setCatalogGroup(e.target.value);setCatalogLimit(60)}}><option value="all">Tous les systèmes</option>{manifest?.groups.map(g=><option key={g.id} value={g.id}>{groupMeta[g.id].name}</option>)}</select><small>{catalog.length} entrées · utilisez aussi la recherche</small></div><div className="catalog-list">{catalog.slice(0,catalogLimit).map(s=><button key={s.id} onClick={()=>selectStructure(s.id)}><span style={{background:groupMeta[s.group].color}}/><span>{describeStructure(s.name,s.group).name}<small>{s.id}{s.aggregate?' · ensemble':''}</small></span><ArrowUpRight size={12}/></button>)}{catalogLimit<catalog.length&&<button className="catalog-more" onClick={()=>setCatalogLimit(n=>n+60)}>Afficher la suite ({catalog.length-catalogLimit})</button>}</div></aside>}
    {selected && description && <aside className="detail-panel" aria-label={`Fiche : ${description.name}`} data-testid="structure-detail">
      <div className="detail-heading"><span className="eyebrow">EXPLORER UNE STRUCTURE</span><button ref={detailCloseRef} className="icon-button" aria-label="Fermer la fiche" onClick={reset}><X size={18} /></button></div>
      <div className="detail-content"><div className="detail-category"><span style={{ background: groupMeta[selected.group].color }} />{description.system}</div><h2>{description.name}</h2><p className="original-name">{selected.aggregate ? "Ensemble anatomique" : "Structure anatomique"} · {selected.id}</p><div className="dissection-actions"><button aria-pressed={isolated} onClick={() => setIsolated(v=>!v)}>{isolated ? "Voir le contexte" : "Isoler"}<Eye size={14}/></button><button onClick={() => {setHiddenIds(ids=>[...ids,selected.id]);setSelectedId(null);setIsolated(false)}}>Masquer<X size={14}/></button></div><p className="detail-role">{description.role}</p><div className="detail-rule" /><h3>Un peu plus près</h3><p className="detail-description">{description.description}</p>{description.fact && <div className="fact"><Sparkles size={16} /><div><span>LE SAVIEZ-VOUS ?</span><p>{description.fact}</p></div></div>}<a className="source-link" href={description.source.url} target="_blank" rel="noreferrer">Source : {description.source.label}<ArrowUpRight size={13} /></a><div className="anatomical-id">IDENTIFIANT ANATOMIQUE <code>{selected.id}</code></div></div>
      <div className="detail-footer"><button onClick={reset}><ArrowLeft size={14} /> Vue d’ensemble</button><div><button aria-label="Structure précédente" onClick={() => nextStructure(-1)}><ArrowLeft size={16} /></button><button aria-label="Structure suivante" onClick={() => nextStructure(1)}><ArrowRight size={16} /></button></div></div>
    </aside>}

    {hover && hovered && !searchOpen && <div className="hover-label" role="tooltip" style={{ left: Math.min(hover.x + 16, window.innerWidth - 200), top: Math.max(80, hover.y - 42) }}><span />{describeStructure(hovered.name, hovered.group).name}<small>Cliquer pour explorer</small></div>}

    <div className="viewer-bottom"><div className="interaction-hint"><Rotate3D size={15} /><span>Glisser pour tourner</span><span className="hint-dot">·</span><span className="desktop-hint">Défiler pour zoomer</span><span className="mobile-hint">Pincer pour zoomer</span></div><div className="viewer-controls" aria-label="Commandes de la vue"><button aria-label="Zoom arrière" onClick={() => apiRef.current?.zoom(-1)} disabled={!load.ready.length}><Minus size={18} /></button><button aria-label="Zoom avant" onClick={() => apiRef.current?.zoom(1)} disabled={!load.ready.length}><Plus size={18} /></button><span className="control-separator" /><button className="orientation-button" onClick={() => { const next = orientation === 'front' ? 'back' : 'front'; setOrientation(next); apiRef.current?.orient(next) }} disabled={!load.ready.length} title="Changer de côté">{orientation === 'front' ? 'Face' : 'Dos'}<Rotate3D size={15} /></button><span className="control-separator" /><button aria-label="Réinitialiser la vue" title="Réinitialiser la vue" onClick={reset} disabled={!load.ready.length}><RotateCcw size={17} /></button></div></div>

    <footer className="bottombar"><div className="model-status"><span className={`status-dot ${load.complete ? 'is-ready' : ''}`} /><span>{load.complete ? `${visibleCount} structures visibles` : 'Préparation de l’exploration'}</span><span className="footer-divider">/</span><span>BodyParts3D</span></div><button className="education-note" onClick={()=>{setSelectedId(null);setIsolated(false);setCatalogOpen(v=>!v)}}>Index des structures <ArrowUpRight size={12}/></button><div className="footer-actions"><button onClick={() => setModal('about')}>Sources & crédits <ArrowUpRight size={12} /></button><button onClick={() => setModal('help')} aria-label="Aide à la navigation"><CircleHelp size={17} /></button></div></footer>

    <dialog ref={dialogRef} className="info-dialog" onCancel={() => setModal(null)} onClick={e => { if (e.target === dialogRef.current) setModal(null) }}><div className="dialog-inner"><button className="dialog-close icon-button" aria-label="Fermer" onClick={() => setModal(null)}><X size={20} /></button><span className="eyebrow">CORPUS · ATLAS OUVERT</span><h2>{modal === 'help' ? 'Prenez le corps en main.' : 'Le vivant appartient à tous.'}</h2>{modal === 'help' ? <><p>Un espace pour observer, explorer et comprendre, à votre rythme.</p><div className="help-row"><Rotate3D /><div><strong>Changer de perspective</strong><p>Glissez avec la souris ou un doigt pour tourner. La molette ou deux doigts permettent de zoomer.</p></div></div><div className="help-row"><Search /><div><strong>Suivre votre curiosité</strong><p>Survolez une structure pour connaître son nom. Cliquez, touchez ou utilisez la recherche pour ouvrir sa fiche. La recherche accepte les accents ou leur absence.</p></div></div><div className="help-row"><Layers3 /><div><strong>Voir sous la surface</strong><p>Activez les couches anatomiques. Sur téléphone, ouvrez « Couches anatomiques ». Masquer le squelette facilite l’exploration des organes.</p></div></div><div className="help-row"><RotateCcw /><div><strong>Retrouver vos repères</strong><p>Le bouton de réinitialisation retrouve la vue de face. Les réglages de couches sont conservés.</p></div></div></> : <><p>Corpus est une invitation à explorer l’anatomie humaine grâce à de véritables maillages 3D, indépendants et sélectionnables.</p><h3>Des modèles scientifiques ouverts</h3><p>BodyParts3D, © The Database Center for Life Science (DBCLS), sous licence Creative Commons Attribution 4.0 International.</p><p>Modèles issus de l’archive officielle BodyParts3D 4.0, complétés par les cinq surfaces lobaires pulmonaires de l’archive officielle 3.0 dans le même repère. Ils sont simplifiés, regroupés, orientés et convertis en GLB pour le Web. Les couleurs sont des choix de visualisation. La page actuelle indique CC BY 4.0 (27 février 2025), mais les fichiers OBJ téléchargés portent CC BY-SA 2.1 Japon. Nos GLB conservent cette dernière licence : attribution et partage des adaptations sous les mêmes conditions.</p><div className="dialog-links"><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer">Modèles d’origine <ArrowUpRight size={14} /></a><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">Licence de la source <ArrowUpRight size={14} /></a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 <ArrowUpRight size={14} /></a><a href={`${import.meta.env.BASE_URL}SOURCES.md`} target="_blank">Sources pédagogiques <ArrowUpRight size={14} /></a></div><p>Attribution des fichiers : BodyParts3D, © The Database Center for Life Science (DBCLS), sous licence Creative Commons Attribution – Partage dans les mêmes conditions 2.1 Japon.</p><div className="dialog-links"><a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noreferrer">Licence des GLB : CC BY-SA 2.1 Japon <ArrowUpRight size={14} /></a><a href={`${import.meta.env.BASE_URL}licenses/detailed-provenance.json`} target="_blank">Provenance des fichiers <ArrowUpRight size={14} /></a></div><div className="dialog-links"><a href={`${import.meta.env.BASE_URL}licenses/lung-surfaces-provenance.json`} target="_blank">Provenance des lobes pulmonaires <ArrowUpRight size={14} /></a><a href={`${import.meta.env.BASE_URL}models/LICENSE.txt`} target="_blank">Notice de redistribution <ArrowUpRight size={14} /></a></div><h3>Un atlas étendu, pas une anatomie exhaustive</h3><p>Le mode détaillé utilise les éléments nommés de l’archive ISA 4.0 : os, dents, muscles, vaisseaux, nerfs, organes et tissus de soutien. Les fichiers sans identification sont exclus. Ce corps de référence masculin ne couvre ni toutes les variantes anatomiques ni les détails microscopiques. Certaines fiches donnent uniquement des repères de groupe.</p><p>La nomenclature française provient de Z-Anatomy (TA2.csv), sous CC BY-SA 4.0. Les noms sont complétés par des traductions descriptives des portions, côtés et branches. Les noms sources restent conservés dans les données de provenance ; les libellés français ne constituent pas une nouvelle nomenclature officielle.</p><a href={`${import.meta.env.BASE_URL}licenses/terminology-LICENSE.txt`} target="_blank">Crédits de la nomenclature</a><h3>Apprendre avec des repères fiables</h3><p>Les fiches sont rédigées en français à partir de ressources pédagogiques du NIH et d’OpenStax. Chaque fiche renvoie à sa source.</p><div className="educational-box"><ShieldCheck size={22} /><p>Un outil pédagogique, pas un outil de diagnostic. Ce modèle représente une anatomie de référence ; les formes et les proportions varient d’une personne à l’autre. Il ne constitue pas un atlas exhaustif.</p></div></>}<button className="dialog-action" onClick={() => setModal(null)}>Revenir à l’exploration <ArrowRight size={16} /></button></div></dialog>
    <span className="sr-only" aria-live="polite">{description ? `Structure sélectionnée : ${description.name}. ${description.role}` : ''}</span>
  </main>
}
