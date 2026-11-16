<template>
  <div ref="wrap" class="viewport">
    <canvas ref="canvas"></canvas>
    <div class="hud">
      <span>体素 {{ store.mesh.voxels.toLocaleString() }}</span>
      <span>体积 {{ store.mesh.volume.toFixed(3) }} m³</span>
      <span>合并后面 {{ store.mesh.facesRaw.toLocaleString() }}</span>
      <span class="accent">减面后 {{ store.mesh.faces.toLocaleString() }} 面</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { store, materialColorRGB } from '../store'
import { meshGreedy, decimateMesh } from '../core/mesher'

const wrap = ref(null)
const canvas = ref(null)

let renderer, scene, camera, controls, mesh, layerPlane, gridHelper
let rafId = 0
let rebuildScheduled = false

function rebuild() {
  const model = store.model
  const raw = meshGreedy(model, materialColorRGB)
  const dec = decimateMesh(raw, model.cell, store.decimation)

  store.mesh.facesRaw = raw.faceCount
  store.mesh.faces = dec.faceCount
  store.mesh.voxels = model.count()
  store.mesh.volume = model.volume()

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(dec.positions, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(dec.normals, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(dec.colors, 3))
  geo.setIndex(new THREE.BufferAttribute(dec.indices, 1))

  if (mesh) {
    mesh.geometry.dispose()
    mesh.geometry = geo
  } else {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02
    })
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
  }

  // 地面网格与当前层高亮框随模型尺寸调整
  const w = model.nx * model.cell
  const h = model.ny * model.cell
  const d = model.nz * model.cell
  if (gridHelper) {
    scene.remove(gridHelper)
    gridHelper.geometry.dispose()
  }
  const div = Math.max(model.nx, model.nz)
  gridHelper = new THREE.GridHelper(Math.max(w, d), Math.min(div, 64), 0x445066, 0x2c3340)
  gridHelper.position.set(w / 2, 0, d / 2)
  scene.add(gridHelper)

  if (layerPlane) {
    layerPlane.geometry.dispose()
    layerPlane.geometry = new THREE.PlaneGeometry(w, d)
  }
  updateLayerPlane()
  frameCamera(false)
}

function updateLayerPlane() {
  if (!layerPlane) return
  const model = store.model
  layerPlane.position.set(
    (model.nx * model.cell) / 2,
    (store.currentLayer + 1) * model.cell + 0.001,
    (model.nz * model.cell) / 2
  )
}

let cameraFramed = false
function frameCamera(force) {
  if (cameraFramed && !force) return
  cameraFramed = true
  const model = store.model
  const w = model.nx * model.cell
  const h = model.ny * model.cell
  const d = model.nz * model.cell
  const r = Math.max(w, h, d)
  camera.position.set(w / 2 + r, h + r * 0.7, d / 2 + r)
  controls.target.set(w / 2, h / 2, d / 2)
  camera.near = r / 100
  camera.far = r * 20
  camera.updateProjectionMatrix()
  controls.update()
}

function scheduleRebuild() {
  if (rebuildScheduled) return
  rebuildScheduled = true
  requestAnimationFrame(() => {
    rebuildScheduled = false
    rebuild()
  })
}

function resize() {
  if (!wrap.value) return
  const w = wrap.value.clientWidth
  const h = wrap.value.clientHeight
  if (!w || !h) return
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

let ro
onMounted(() => {
  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x16191f)

  camera = new THREE.PerspectiveCamera(50, 1, 0.01, 500)
  controls = new OrbitControls(camera, canvas.value)
  controls.enableDamping = true

  // 简单光照 + 环境光,看清凹凸
  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const key = new THREE.DirectionalLight(0xfff2e0, 1.4)
  key.position.set(3, 6, 2)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.35)
  fill.position.set(-4, 2, -3)
  scene.add(fill)

  // 当前层高亮平面
  layerPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x4da3ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  )
  layerPlane.rotation.x = -Math.PI / 2
  scene.add(layerPlane)

  rebuild()
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(wrap.value)

  const loop = () => {
    rafId = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, camera)
  }
  loop()

  watch(() => store.rev, scheduleRebuild)
  watch(() => store.decimation, scheduleRebuild)
  watch(() => store.currentLayer, updateLayerPlane)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  ro && ro.disconnect()
  renderer && renderer.dispose()
})
</script>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.hud {
  position: absolute;
  left: 10px;
  top: 8px;
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #aab4c4;
  background: rgba(16, 19, 25, 0.72);
  padding: 5px 10px;
  border-radius: 6px;
  pointer-events: none;
}
.hud .accent {
  color: #6fb7ff;
  font-weight: 600;
}
</style>
