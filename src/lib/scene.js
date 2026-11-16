import {
  Engine, Scene, ArcRotateCamera, UniversalCamera, Vector3, Matrix,
  HemisphericLight, DirectionalLight, MeshBuilder, StandardMaterial, Color3, Color4,
  GizmoManager, Camera, Tools
} from '@babylonjs/core'
import { get } from 'svelte/store'
import { panels, holds, routes, violations, selectedHoldId, holdType, holdTypes, saveLocal, markDirty } from '../store.js'
import { computeRealtimeViolations } from './checks.js'

let engine, scene, camera, gizmoMgr
const panelMeshes = new Map()   // panelId -> mesh
const holdMeshes = new Map()    // holdId -> mesh
const routeMats = new Map()     // color -> material
let violationMat = null
let selectedMat = null

export function initScene(canvas) {
  engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  scene = new Scene(engine)
  scene.clearColor = new Color3(0.13, 0.14, 0.16).toColor4(1)

  camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 2.3, 8, new Vector3(0, 2.2, 0), scene)
  camera.attachControl(canvas, true)
  camera.wheelPrecision = 30
  camera.lowerRadiusLimit = 2
  camera.upperRadiusLimit = 30

  new HemisphericLight('hemi', new Vector3(0.3, 1, 0.5), scene).intensity = 0.9
  const dir = new DirectionalLight('dir', new Vector3(-0.4, -0.8, -0.6), scene)
  dir.intensity = 0.7

  // 地面
  const ground = MeshBuilder.CreateGround('ground', { width: 30, height: 20 }, scene)
  const gm = new StandardMaterial('gm', scene)
  gm.diffuseColor = new Color3(0.22, 0.23, 0.25)
  gm.specularColor = Color3.Black()
  ground.material = gm
  ground.position.y = -0.001

  violationMat = new StandardMaterial('violation', scene)
  violationMat.diffuseColor = new Color3(1, 0.1, 0.1)
  violationMat.emissiveColor = new Color3(0.8, 0, 0)

  selectedMat = null

  // 手柄: 三轴平移 + 三轴旋转
  gizmoMgr = new GizmoManager(scene)
  gizmoMgr.positionGizmoEnabled = true
  gizmoMgr.rotationGizmoEnabled = true
  gizmoMgr.scaleGizmoEnabled = false
  gizmoMgr.usePointerToAttachGizmo = false
  gizmoMgr.gizmos.positionGizmo.scaleRatio = 1.1
  gizmoMgr.gizmos.rotationGizmo.scaleRatio = 1.1

  // 拖动中: 实时碰撞检测
  gizmoMgr.gizmos.positionGizmo.onDragObservable.add(() => refreshViolations())
  // 松手: 沿板面法线吸附贴紧
  gizmoMgr.gizmos.positionGizmo.onDragEndObservable.add(() => {
    const mesh = gizmoMgr.attachedMesh
    if (mesh && mesh.metadata?.holdId) {
      snapToPanel(mesh)
      persistHold(mesh)
      refreshViolations()
    }
  })
  gizmoMgr.gizmos.rotationGizmo.onDragEndObservable.add(() => {
    const mesh = gizmoMgr.attachedMesh
    if (mesh && mesh.metadata?.holdId) {
      persistHold(mesh)
      refreshViolations()
    }
  })

  // 点选: 按包围盒拾取
  scene.onPointerObservable.add(pi => {
    if (pi.type === 1 /* POINTERDOWN */ && pi.event.button === 0) {
      const picked = pickHoldByBoundingBox(scene.pointerX, scene.pointerY)
      selectHold(picked ? picked.metadata.holdId : null)
    }
  })

  engine.runRenderLoop(() => scene.render())
  window.addEventListener('resize', () => engine.resize())

  return { engine, scene, captureView, placeTypeAt }
}

// ---------- 包围盒拾取 ----------
function pickHoldByBoundingBox(px, py) {
  const ray = scene.createPickingRay(px, py, Matrix.Identity(), camera)
  let best = null
  for (const m of holdMeshes.values()) {
    m.computeWorldMatrix(true)
    const hit = ray.intersectsBox(m.getBoundingInfo().boundingBox)
    if (hit.hit && (!best || hit.distance < best.distance)) best = { mesh: m, distance: hit.distance }
  }
  return best?.mesh || null
}

// ---------- 岩板 ----------
export function rebuildPanels() {
  for (const m of panelMeshes.values()) m.dispose()
  panelMeshes.clear()
  const list = get(panels)
  list.forEach((p, idx) => {
    const mesh = MeshBuilder.CreateBox('panel_' + p.id, { width: p.width, height: p.height, depth: p.thickness }, scene)
    mesh.position.set(p.x, p.y, p.z)
    mesh.rotation.y = p.angleY * Math.PI / 180
    const mat = new StandardMaterial('pm_' + p.id, scene)
    mat.diffuseColor = idx % 2 === 0 ? new Color3(0.62, 0.58, 0.52) : new Color3(0.55, 0.52, 0.47)
    mat.specularColor = new Color3(0.05, 0.05, 0.05)
    mesh.material = mat
    mesh.enableEdgesRendering()
    mesh.edgesWidth = 2
    mesh.edgesColor = new Color4(0, 0, 0, 0.6)
    mesh.metadata = { panelId: p.id, width: p.width, height: p.height, thickness: p.thickness, name: p.name }
    mesh.isPickable = true
    panelMeshes.set(p.id, mesh)
  })
  refreshViolations()
}

// ---------- 支点 ----------
function routeColor(routeId) {
  const r = get(routes).find(x => x.id === routeId)
  return r ? r.color : '#9e9e9e'
}
function matFor(color) {
  if (!routeMats.has(color)) {
    const m = new StandardMaterial('rm_' + color, scene)
    const c = Color3.FromHexString(color)
    m.diffuseColor = c
    m.emissiveColor = c.scale(0.25)
    m.specularColor = new Color3(0.2, 0.2, 0.2)
    routeMats.set(color, m)
  }
  return routeMats.get(color)
}

function buildHoldMesh(h) {
  const t = holdType(h.typeId)
  let mesh
  switch (t.shape) {
    case 'sphere':
      mesh = MeshBuilder.CreateSphere('hold_' + h.id, { diameter: 1, segments: 12 }, scene)
      mesh.scaling.set(t.w, t.h, t.d)
      break
    case 'dome':
      mesh = MeshBuilder.CreateSphere('hold_' + h.id, { diameter: 1, slice: 0.5, segments: 12 }, scene)
      mesh.scaling.set(t.w, t.d * 2, t.h)
      mesh.rotation.x = Math.PI / 2
      break
    case 'cyl':
      mesh = MeshBuilder.CreateCylinder('hold_' + h.id, { diameter: t.w, height: t.d, tessellation: 16 }, scene)
      mesh.rotation.x = Math.PI / 2
      break
    case 'pyr':
      mesh = MeshBuilder.CreateCylinder('hold_' + h.id, { diameterTop: 0, diameterBottom: t.w, height: t.d, tessellation: 4 }, scene)
      mesh.rotation.x = -Math.PI / 2
      break
    default:
      mesh = MeshBuilder.CreateBox('hold_' + h.id, { width: t.w, height: t.h, depth: t.d }, scene)
  }
  mesh.metadata = { holdId: h.id, depth: t.d }
  mesh.isPickable = false // 拾取走包围盒手动判定
  return mesh
}

export function syncHolds() {
  const list = get(holds)
  const seen = new Set()
  for (const h of list) {
    seen.add(h.id)
    let mesh = holdMeshes.get(h.id)
    if (!mesh) {
      mesh = buildHoldMesh(h)
      holdMeshes.set(h.id, mesh)
    }
    mesh.position.set(h.x, h.y, h.z)
    mesh.rotation.y = (h.rotY || 0) * Math.PI / 180
  }
  for (const [id, mesh] of holdMeshes) {
    if (!seen.has(id)) { mesh.dispose(); holdMeshes.delete(id) }
  }
  recolorHolds()
  refreshViolations()
}

// 按线路着色; 违规标红; 选中高亮
export function recolorHolds() {
  const vio = new Set()
  for (const v of get(violations)) { vio.add(v.aId); if (v.bId) vio.add(v.bId) }
  const sel = get(selectedHoldId)
  for (const [id, mesh] of holdMeshes) {
    const h = get(holds).find(x => x.id === id)
    if (!h) continue
    if (vio.has(id)) mesh.material = violationMat
    else mesh.material = matFor(routeColor(h.routeId))
    if (id === sel) {
      mesh.renderOutline = true
      mesh.outlineColor = Color3.White()
      mesh.outlineWidth = 0.06
    } else mesh.renderOutline = false
  }
}

// ---------- 选中与手柄 ----------
export function selectHold(id) {
  selectedHoldId.set(id)
  const mesh = id ? holdMeshes.get(id) : null
  gizmoMgr.attachToMesh(mesh || null)
  recolorHolds()
}

// ---------- 法线吸附 ----------
function snapToPanel(mesh) {
  const pos = mesh.position
  let best = null
  for (const pm of panelMeshes.values()) {
    const inv = pm.getWorldMatrix().clone().invert()
    const local = Vector3.TransformCoordinates(pos, inv)
    const md = pm.metadata
    const outX = Math.max(Math.abs(local.x) - md.width / 2, 0)
    const outY = Math.max(Math.abs(local.y) - md.height / 2, 0)
    const dz = Math.abs(local.z - md.thickness / 2)
    const score = outX + outY + dz
    if (!best || score < best.score) best = { pm, local, score }
  }
  if (!best) return
  const { pm, local } = best
  const depth = mesh.metadata.depth || 0.05
  local.z = pm.metadata.thickness / 2 + depth / 2   // 沿板面法线贴紧
  const world = Vector3.TransformCoordinates(local, pm.getWorldMatrix())
  mesh.position.copyFrom(world)
  mesh.rotation.y = pm.rotation.y                    // 对齐板面朝向
  mesh.metadata.panelId = pm.metadata.panelId
}

function persistHold(mesh) {
  const id = mesh.metadata.holdId
  holds.update(list => list.map(h => h.id === id ? {
    ...h,
    x: +mesh.position.x.toFixed(4),
    y: +mesh.position.y.toFixed(4),
    z: +mesh.position.z.toFixed(4),
    rotY: +(mesh.rotation.y * 180 / Math.PI).toFixed(1),
    panelId: mesh.metadata.panelId || h.panelId
  } : h))
  markDirty()
  saveLocal()
}

// ---------- 实时碰撞 ----------
export function refreshViolations() {
  // 用网格当前位姿(拖动中)覆盖 store 数据再检测
  const list = get(holds).map(h => {
    const m = holdMeshes.get(h.id)
    if (!m) return h
    return { ...h, x: m.position.x, y: m.position.y, z: m.position.z, panelId: m.metadata.panelId || h.panelId }
  })
  violations.set(computeRealtimeViolations(list, get(panels)))
  recolorHolds()
}

// ---------- 拖放落点 ----------
export function placeTypeAt(typeId, offsetX, offsetY, routeId) {
  const pick = scene.pick(offsetX, offsetY, m => m.metadata?.panelId)
  const t = holdType(typeId)
  let x, y, z, panelId, rotY = 0
  if (pick.hit && pick.pickedMesh) {
    const pm = pick.pickedMesh
    const inv = pm.getWorldMatrix().clone().invert()
    const local = Vector3.TransformCoordinates(pick.pickedPoint, inv)
    local.z = pm.metadata.thickness / 2 + t.d / 2
    const world = Vector3.TransformCoordinates(local, pm.getWorldMatrix())
    x = world.x; y = world.y; z = world.z
    panelId = pm.metadata.panelId
    rotY = pm.rotation.y * 180 / Math.PI
  } else {
    x = 0; y = 1; z = 0.5; panelId = null
  }
  const id = 'H' + Date.now().toString(36)
  holds.update(list => [...list, { id, typeId, routeId, panelId, x, y, z, rotY }])
  markDirty(); saveLocal()
  syncHolds()
  selectHold(id)
  return id
}

// ---------- 出图: 正视 / 俯视 ----------
export async function captureView(kind) {
  const list = get(panels)
  if (!list.length) return
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9
  for (const p of list) {
    minX = Math.min(minX, p.x - p.width / 2); maxX = Math.max(maxX, p.x + p.width / 2)
    minY = Math.min(minY, p.y - p.height / 2); maxY = Math.max(maxY, p.y + p.height / 2)
    minZ = Math.min(minZ, p.z - 0.3); maxZ = Math.max(maxZ, p.z + 0.3)
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
  const cam = new UniversalCamera('capture', Vector3.Zero(), scene)
  cam.mode = Camera.ORTHOGRAPHIC_CAMERA
  const buildTop = engine.getRenderHeight() / engine.getRenderWidth()
  if (kind === 'front') {
    const hw = (maxX - minX) / 2 * 1.06, hh = (maxY - minY) / 2 * 1.06
    cam.position = new Vector3(cx, cy, maxZ + 10)
    cam.setTarget(new Vector3(cx, cy, cz))
    cam.orthoLeft = -hw; cam.orthoRight = hw
    cam.orthoBottom = -hh; cam.orthoTop = hh
  } else {
    const hw = (maxX - minX) / 2 * 1.06
    const hd = Math.max((maxZ - minZ) / 2 * 1.3, hw * buildTop)
    cam.position = new Vector3(cx, maxY + 10, cz)
    cam.upVector = new Vector3(0, 0, -1)
    cam.setTarget(new Vector3(cx, cy, cz))
    cam.orthoLeft = -hw; cam.orthoRight = hw
    cam.orthoBottom = -hd; cam.orthoTop = hd
  }
  cam.minZ = 0.1; cam.maxZ = 100
  const name = kind === 'front' ? '正视图.png' : '俯视图.png'
  await Tools.CreateScreenshotAsync(engine, cam, { width: 1920, height: 1200, fileName: name })
  cam.dispose()
}
