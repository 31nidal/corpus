import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { GroupId, LoadState, Manifest, ViewerApi, Visibility } from './types'

type Props = {
  manifest: Manifest
  visibility: Visibility
  selectedId: string | null
  resetKey: number
  onSelect: (id: string) => void
  onHover: (hover: { id: string; x: number; y: number } | null) => void
  onLoad: (state: LoadState) => void
  isolated?: boolean
  hiddenIds?: string[]
  apiRef: RefObject<ViewerApi | null>
}

type AnatomyMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>
type Runtime = {
  setVisibility: (visibility: Visibility) => void
  select: (id: string | null) => void
  reset: () => void
  refresh: () => void
}

function organColor(name: string): THREE.ColorRepresentation {
  const text = name.toLocaleLowerCase('fr')
  if (/hair/.test(text)) return '#665b55'
  if (/tooth|teeth/.test(text)) return '#f2e6d2'
  if (/cerveau|encéphale|brain|cerebr/.test(text)) return '#e3b7aa'
  if (/cœur|coeur|heart/.test(text)) return '#c25362'
  if (/poumon|lung/.test(text)) return '#d797ac'
  if (/foie|liver/.test(text)) return '#9f594c'
  if (/rein|kidney/.test(text)) return '#a76b57'
  if (/estomac|stomach/.test(text)) return '#d39b82'
  if (/intestin|côlon|colon/.test(text)) return '#d7a594'
  if (/pancréas|pancreas/.test(text)) return '#d4b384'
  if (/rate|spleen/.test(text)) return '#976b89'
  if (/vessie|bladder/.test(text)) return '#d0b59b'
  if (/trachée|trachea|œsophage|oesophage|esophagus/.test(text)) return '#b8a193'
  return '#ca998a'
}

export default function AnatomyViewer(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<Runtime | null>(null)
  const latest = useRef(props)
  latest.current = props

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let frame = 0
    let hoveredId: string | null = null
    let selectedId = latest.current.selectedId
    let visibility = latest.current.visibility
    const aborter = new AbortController()
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(39, 1, 0.025, 50)
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      latest.current.onLoad({ progress: 0, ready: [], error: 'La 3D ne peut pas démarrer. Activez l’accélération graphique ou essayez un navigateur récent.', complete: true })
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.domElement.setAttribute('aria-label', 'Corps humain en trois dimensions. Glissez pour tourner, pincez ou utilisez la molette pour zoomer.')
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.style.touchAction = 'none'
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.085
    controls.enablePan = false
    controls.rotateSpeed = 0.65
    controls.zoomSpeed = 0.75
    controls.minDistance = 0.05
    controls.maxDistance = 14
    controls.minPolarAngle = 0.12
    controls.maxPolarAngle = Math.PI - 0.12
    controls.target.set(0, 0, 0)
    camera.position.set(0, 0.04, 6.1)

    scene.add(new THREE.HemisphereLight(0xf5f8ff, 0x9892a3, 1.0))
    const key = new THREE.DirectionalLight(0xfff4e9, 2.4)
    key.position.set(-3, 5, 5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xd3e9ff, 1.1)
    fill.position.set(4, 1, 3)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xe4f1ff, 2.0)
    rim.position.set(2, 3, -4)
    scene.add(rim)
    const lower = new THREE.DirectionalLight(0xd7cfbd, 0.5)
    lower.position.set(-2, -3, 2)
    scene.add(lower)

    // Only this quiet display plinth is procedural. Every body structure is a source anatomical mesh.
    const stage = new THREE.Group()
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.727, 96),
      new THREE.MeshBasicMaterial({ color: 0x5c8588, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -1.84
    stage.add(ring)
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.652, 96),
      new THREE.MeshBasicMaterial({ color: 0x5c8588, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }),
    )
    innerRing.rotation.x = -Math.PI / 2
    innerRing.position.y = -1.84
    stage.add(innerRing)
    scene.add(stage)

    const structures = new Map(props.manifest.structures.map((entry) => [entry.id, entry]))
    const idsByMesh = new Map<string, string[]>()
    for (const entry of props.manifest.structures) for (const name of entry.meshNames) idsByMesh.set(name, [...(idsByMesh.get(name) ?? []), entry.id])
    const groupRoots = new Map<GroupId, THREE.Group>()
    const meshesById = new Map<string, AnatomyMesh[]>()
    const allMeshes: AnatomyMesh[] = []
    const baseColors = new Map<AnatomyMesh, THREE.Color>()
    const highlightColor = new THREE.Color('#72d6d7')
    const box = new THREE.Box3()
    const scratchBox = new THREE.Box3()
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    const direction = new THREE.Vector3()
    const projected = new THREE.Vector3()
    let homeDistance = 6.1
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let tween: { start: number; duration: number; fromPosition: THREE.Vector3; toPosition: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 } | null = null

    let dirty = true
    const updateMaterials = () => {
      dirty = true
      const hiddenNames = new Set((latest.current.hiddenIds ?? []).flatMap(id => structures.get(id)?.meshNames ?? []))
      for (const mesh of allMeshes) {
        const { structureId, anatomyGroup } = mesh.userData
        const isSelected = mesh.userData.structureIds.includes(selectedId)
        const isHovered = structureId === hoveredId
        const material = mesh.material
        material.color.copy(baseColors.get(mesh)!)
        if (isSelected) material.color.lerp(highlightColor, 0.15)
        else if (isHovered) material.color.lerp(highlightColor, 0.22)
        material.emissive.set(isSelected ? '#1c8e98' : isHovered ? '#17666b' : '#000000')
        material.emissiveIntensity = isSelected ? 0.12 : isHovered ? 0.18 : 0

        mesh.visible = !hiddenNames.has(mesh.name) && (!latest.current.isolated || !selectedId || isSelected)
        const context = Boolean(selectedId) && !isSelected
        const opacity = anatomyGroup === 'skin'
          ? isSelected ? 0.3 : isHovered ? 0.17 : selectedId ? 0.022 : 0.085
          : context ? anatomyGroup === 'skeleton' ? 0.04 : 0.045 : 1
        const transparent = opacity < 1
        if (material.transparent !== transparent) {
          material.transparent = transparent
          material.needsUpdate = true
        }
        material.opacity = opacity
        material.depthWrite = !transparent
        mesh.renderOrder = anatomyGroup === 'skin' ? 3 : transparent ? 2 : 0
      }
    }

    const boundsFor = (id: string) => {
      const meshes = meshesById.get(id)
      if (!meshes?.length) return false
      box.makeEmpty()
      for (const mesh of meshes) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
        scratchBox.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld)
        box.union(scratchBox)
      }
      return !box.isEmpty()
    }

    const moveCamera = (position: THREE.Vector3, target: THREE.Vector3, duration = 1050) => {
      if (reducedMotion) {
        tween = null
        camera.position.copy(position)
        controls.target.copy(target)
        controls.update()
        return
      }
      tween = {
        start: performance.now(), duration,
        fromPosition: camera.position.clone(), toPosition: position.clone(),
        fromTarget: controls.target.clone(), toTarget: target.clone(),
      }
    }

    const focus = (id: string | null) => {
      selectedId = id
      hoveredId = null
      latest.current.onHover(null)
      updateMaterials()
      if (!id || !boundsFor(id)) return
      box.getCenter(center)
      box.getSize(size)
      const extent = Math.max(size.y, size.x / camera.aspect, size.z * 0.85)
      const distance = THREE.MathUtils.clamp(extent / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.6, 0.16, homeDistance)
      direction.copy(camera.position).sub(controls.target).normalize()
      if (structures.get(id)?.group === 'organs' && direction.z > 0.25) direction.set(0, 0.04, 1).normalize()
      moveCamera(direction.multiplyScalar(distance).add(center), center)
    }

    const reset = () => {
      hoveredId = null
      latest.current.onHover(null)
      moveCamera(new THREE.Vector3(0, 0.04, homeDistance), new THREE.Vector3(0, 0, 0))
    }

    const setVisibility = (next: Visibility) => {
      visibility = next
      for (const [id, root] of groupRoots) root.visible = visibility[id]
      if (hoveredId && !visibility[structures.get(hoveredId)!.group]) {
        hoveredId = null
        latest.current.onHover(null)
      }
      updateMaterials()
      void loadGroups()
    }

    runtimeRef.current = { setVisibility, select: focus, reset, refresh: updateMaterials }
    const api: ViewerApi = {
      reset,
      zoom: (step) => {
        direction.copy(camera.position).sub(controls.target)
        const distance = THREE.MathUtils.clamp(direction.length() * (step > 0 ? 0.77 : 1.3), controls.minDistance, controls.maxDistance)
        moveCamera(direction.setLength(distance).add(controls.target), controls.target, 450)
      },
      orient: (view) => {
        const distance = camera.position.distanceTo(controls.target)
        moveCamera(new THREE.Vector3(0, 0.01, view === 'front' ? distance : -distance).add(controls.target), controls.target, 800)
      },
      project: (id) => {
        if (!boundsFor(id)) return null
        box.getCenter(projected).project(camera)
        const rect = renderer.domElement.getBoundingClientRect()
        return { x: rect.left + (projected.x + 1) / 2 * rect.width, y: rect.top + (1 - projected.y) / 2 * rect.height }
      },
    }
    props.apiRef.current = api

    const resize = () => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      const previous = homeDistance
      homeDistance = Math.max(3.6, 1.8 / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.14
      if (!selectedId && !tween) {
        direction.copy(camera.position).sub(controls.target).multiplyScalar(homeDistance / previous)
        camera.position.copy(controls.target).add(direction)
      }
      controls.update()
      dirty = true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerDown: { x: number; y: number; time: number } | null = null
    const activePointers = new Set<number>()
    let pendingHover: { x: number; y: number } | null = null
    let lastHoverTime = 0

    const pick = (x: number, y: number) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const candidates = allMeshes.filter((mesh) => visibility[mesh.userData.anatomyGroup as GroupId] && mesh.visible)
      const hits = raycaster.intersectObjects(candidates, false)
      // The skin is an x-ray envelope; anatomy underneath remains accessible.
      const hit = hits.find(hit => hit.object.userData.anatomyGroup !== 'skin' && (hit.object as AnatomyMesh).material.opacity > 0.1) ?? hits.find(hit => hit.object.userData.anatomyGroup !== 'skin') ?? hits[0]
      return hit?.object.userData.structureId as string | undefined
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && !pointerDown) pendingHover = { x: event.clientX, y: event.clientY }
    }
    const handlePointerDown = (event: PointerEvent) => {
      activePointers.add(event.pointerId)
      pointerDown = activePointers.size === 1 ? { x: event.clientX, y: event.clientY, time: performance.now() } : null
      pendingHover = null
      hoveredId = null
      latest.current.onHover(null)
      updateMaterials()
    }
    const handlePointerUp = (event: PointerEvent) => {
      if (activePointers.size === 1 && pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) < 7 && performance.now() - pointerDown.time < 650) {
        const id = pick(event.clientX, event.clientY)
        if (id) latest.current.onSelect(id)
      }
      activePointers.delete(event.pointerId)
      pointerDown = null
    }
    const handlePointerLeave = () => {
      pendingHover = null
      hoveredId = null
      latest.current.onHover(null)
      renderer.domElement.style.cursor = 'grab'
      updateMaterials()
    }
    const handlePointerCancel = (event: PointerEvent) => { activePointers.delete(event.pointerId); pointerDown = null; handlePointerLeave() }
    const handleControlsStart = () => { tween = null; renderer.domElement.style.cursor = 'grabbing' }
    const handleControlsEnd = () => { renderer.domElement.style.cursor = 'grab' }
    controls.addEventListener('start', handleControlsStart)
    controls.addEventListener('end', handleControlsEnd)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave)
    renderer.domElement.addEventListener('pointercancel', handlePointerCancel)
    renderer.domElement.style.cursor = 'grab'

    const ready: GroupId[] = []
    const errors: string[] = []
    const groups = [...props.manifest.groups].sort((a, b) => ['organs', 'skeleton', 'skin', 'muscles', 'arteries', 'veins', 'nerves', 'joints'].indexOf(a.id) - ['organs', 'skeleton', 'skin', 'muscles', 'arteries', 'veins', 'nerves', 'joints'].indexOf(b.id))
    const totalBytes = () => groups.filter(g => visibility[g.id] || ready.includes(g.id)).reduce((sum,g) => sum + g.bytes, 0)
    let receivedBytes = 0
    let progress = 0
    const emitLoad = (complete = false) => {
      if (!disposed) latest.current.onLoad({ progress: complete ? 100 : progress, ready: [...ready], error: errors.length ? errors.join(' ') : null, complete })
    }
    // Development-only observability for real browser interaction tests.
    if (import.meta.env.DEV) Object.assign(window, { __CORPUS_TEST__: {
      project: api.project,
      state: () => ({ selectedId, hoveredId, camera: camera.position.toArray(), target: controls.target.toArray(), visibility: { ...visibility }, meshes: allMeshes.length, visibleMeshes: allMeshes.filter(m => visibility[m.userData.anatomyGroup as GroupId] && m.visible).length, ready: [...ready] }),
    } })
    const contextLost = (event: Event) => {
      event.preventDefault()
      errors.push('La connexion au processeur graphique a été interrompue. Rechargez la page pour retrouver la vue 3D.')
      emitLoad(true)
    }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    emitLoad()

    const disposeObject = (object: THREE.Object3D) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          for (const material of materials) material.dispose()
        }
      })
    }

    const loader = new GLTFLoader()
    let loading = false
    const failed = new Set<GroupId>()
    const loadGroups = async () => {
      if (loading || disposed) return
      loading = true
      emitLoad(false)
      while (true) {
        const group = groups.find(g => visibility[g.id] && !ready.includes(g.id) && !failed.has(g.id))
        if (!group) break
        if (disposed) return
        let groupBytes = 0
        try {
          const modelUrl = new URL(group.url, new URL(import.meta.env.BASE_URL, window.location.href)).href
          const response = await fetch(modelUrl, { signal: aborter.signal })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          let buffer: ArrayBuffer
          if (response.body) {
            const reader = response.body.getReader()
            const chunks: Uint8Array<ArrayBuffer>[] = []
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              chunks.push(value as Uint8Array<ArrayBuffer>)
              groupBytes += value.byteLength
              progress = Math.min(99, Math.round((receivedBytes + groupBytes) / Math.max(totalBytes(), 1) * 100))
              emitLoad()
            }
            const combined = new Uint8Array(groupBytes)
            let offset = 0
            for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength }
            buffer = combined.buffer
          } else {
            buffer = await response.arrayBuffer()
            groupBytes = buffer.byteLength
          }
          const gltf = await loader.parseAsync(buffer, new URL('.', modelUrl).href)
          if (disposed) { disposeObject(gltf.scene); return }
          const root = gltf.scene
          root.name = `anatomy-${group.id}`
          root.visible = visibility[group.id]
          root.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return
            let ids = idsByMesh.get(child.name)
            let ancestor = child.parent
            while (!ids && ancestor) { ids = idsByMesh.get(ancestor.name); ancestor = ancestor.parent }
            if (!ids?.length) return
            const id = ids.find(id => !structures.get(id)?.aggregate) ?? ids[0]
            const structure = structures.get(id)!
            const originals = Array.isArray(child.material) ? child.material : [child.material]
            for (const original of originals) original.dispose()
            const color = group.id === 'skin' ? '#76bfc4' : group.id === 'skeleton' ? '#e0d5bc' : group.id === 'muscles' ? '#bd575b' : group.id === 'arteries' ? '#c83d4b' : group.id === 'veins' ? '#4a75b3' : group.id === 'nerves' ? '#c7a443' : group.id === 'joints' ? '#8eb2b6' : organColor(structure.name)
            const material = new THREE.MeshPhysicalMaterial({
              color, roughness: group.id === 'skeleton' ? 0.58 : group.id === 'muscles' ? 0.48 : 0.33,
              metalness: group.id === 'skin' ? 0.05 : 0,
              clearcoat: group.id === 'organs' ? 0.26 : 0.08,
              clearcoatRoughness: 0.48,
              side: group.id === 'skin' ? THREE.FrontSide : THREE.DoubleSide,
            })
            child.material = material
            child.userData.structureId = id
            child.userData.structureIds = ids
            child.userData.anatomyGroup = group.id
            child.geometry.computeBoundingBox()
            child.geometry.computeBoundingSphere()
            const mesh = child as AnatomyMesh
            baseColors.set(mesh, material.color.clone())
            allMeshes.push(mesh)
            for (const relatedId of ids) {
              const siblings = meshesById.get(relatedId) ?? []
              siblings.push(mesh); meshesById.set(relatedId, siblings)
            }
          })
          scene.add(root)
          root.updateMatrixWorld(true)
          groupRoots.set(group.id, root)
          ready.push(group.id)
          receivedBytes += group.bytes || groupBytes
          progress = Math.min(99, Math.round(receivedBytes / Math.max(totalBytes(), 1) * 100))
          updateMaterials()
          emitLoad()
          if (selectedId && (structures.get(selectedId)?.groups ?? [structures.get(selectedId)?.group]).includes(group.id)) focus(selectedId)
        } catch (error) {
          if (disposed || aborter.signal.aborted) return
          failed.add(group.id)
          errors.push(`Le chargement de « ${group.label} » a échoué (${error instanceof Error ? error.message : 'erreur inconnue'}).`)
          receivedBytes += group.bytes
          emitLoad()
        }
      }
      loading = false
      emitLoad(true)
    }
    void loadGroups()

    const animate = (time: number) => {
      if (disposed) return
      if (tween) {
        const fraction = Math.min((time - tween.start) / tween.duration, 1)
        const eased = fraction < 0.5 ? 4 * fraction ** 3 : 1 - (-2 * fraction + 2) ** 3 / 2
        camera.position.lerpVectors(tween.fromPosition, tween.toPosition, eased)
        controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased)
        if (fraction === 1) tween = null
      }
      if (controls.update()) dirty = true
      if (tween) dirty = true
      if (pendingHover && time - lastHoverTime > 50 && !tween) {
        const { x, y } = pendingHover
        const id = pick(x, y) ?? null
        pendingHover = null
        lastHoverTime = time
        if (id !== hoveredId) { hoveredId = id; updateMaterials() }
        renderer.domElement.style.cursor = id ? 'pointer' : 'grab'
        latest.current.onHover(id ? { id, x, y } : null)
      }
      if (dirty) { renderer.render(scene, camera); dirty = false }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)

    return () => {
      disposed = true
      aborter.abort()
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.removeEventListener('start', handleControlsStart)
      controls.removeEventListener('end', handleControlsEnd)
      controls.dispose()
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave)
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      disposeObject(scene)
      renderer.dispose()
      renderer.domElement.remove()
      if (props.apiRef.current === api) props.apiRef.current = null
      runtimeRef.current = null
    }
  }, [props.manifest, props.apiRef])

  useEffect(() => { runtimeRef.current?.setVisibility(props.visibility) }, [props.visibility])
  useEffect(() => { runtimeRef.current?.select(props.selectedId) }, [props.selectedId])
  useEffect(() => { runtimeRef.current?.refresh() }, [props.isolated, props.hiddenIds])
  useEffect(() => { if (props.resetKey) runtimeRef.current?.reset() }, [props.resetKey])

  return <div ref={hostRef} className="anatomy-canvas" />
}
