<template>
  <div class="viewport">
    <canvas
      ref="canvasEl"
      class="gpu"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointerleave="onLeave"
      @wheel.prevent="onWheel"
      @contextmenu.prevent
    ></canvas>

    <!-- 初始化 / 错误 -->
    <div v-if="!ready" class="boot">
      <div v-if="error" class="boot-err">
        <div class="dot blocked"></div>
        <h3>WebGPU 未能启动</h3>
        <p>{{ error }}</p>
        <p class="muted">需要在 Chrome / Edge 113+ 打开，且显卡驱动可用。若是虚拟机，请开启 GPU 直通。</p>
      </div>
      <div v-else class="boot-load">
        <div class="spinner"></div>
        <p>正在申请 GPU 适配器…</p>
      </div>
    </div>

    <!-- 视口角标：当前工具与操作提示 -->
    <div class="vp-top">
      <div class="vp-tool">
        <span class="k">{{ currentTool.key }}</span>
        <span>{{ currentTool.label }}</span>
      </div>
      <div class="vp-hint">{{ currentTool.hint }}</div>
    </div>

    <div class="vp-tr">
      <button class="chip" :class="{ on: es.mirrorOn }" @click="toggleMirror()" title="镜像对称">
        <span class="ico-mirror"></span>
        {{ es.mirrorOn ? `镜像 ${es.mirrorAxis.toUpperCase()}` : '镜像' }}
      </button>
      <button class="chip" :class="{ on: es.sectionOn }" @click="es.sectionOn = !es.sectionOn; requestRebuild()">
        切片
      </button>
    </div>

    <!-- 视图方位球 -->
    <div class="vp-compass" @pointerdown.stop>
      <button class="cmp" v-for="a in angles" :key="a.id" :title="a.label" @click="setViewAngle(a.id)">
        {{ a.badge }}
      </button>
    </div>

    <!-- 底部读数 -->
    <div class="vp-bottom">
      <div class="readout">
        <span class="rk">体素</span>
        <b>{{ es.stats.count.toLocaleString() }}</b>
        <span class="sep"></span>
        <span class="rk">指针</span>
        <b v-if="es.hover">{{ es.hover.voxel.join(' / ') }}</b>
        <b v-else class="dim">—</b>
        <span class="sep"></span>
        <span class="rk">落点</span>
        <b v-if="es.hoverPlace" :class="{ danger: placeOccupied }">{{ es.hoverPlace.join(' / ') }}</b>
        <b v-else class="dim">—</b>
      </div>
      <div class="readout right">
        <span v-if="es.selection" class="tag cyan">
          选区 {{ selSize }}
        </span>
        <span v-if="es.clipboard" class="tag" :class="es.clipboardCollision ? 'red' : 'green'">
          剪贴板 {{ es.clipboard.items.length }} 格 · {{ es.clipboardCollision ? `压到 ${es.clipboardCollision} 格` : '无冲突' }}
        </span>
        <span v-if="fps" class="tag slate">{{ fps }} fps</span>
      </div>
    </div>

    <!-- 落点冲突提示 -->
    <div v-if="occupiedNotice" class="place-warn">
      <span class="dot warn"></span>
      落点将覆盖 {{ es.clipboardCollision }} 格已有体素
    </div>

    <!-- 框选拖拽矩形 -->
    <div v-if="marquee" class="marquee" :style="marqueeStyle"></div>

    <!-- 悬浮提示 -->
    <transition name="toast">
      <div v-if="es.notice" class="toast" :class="es.notice.tone">{{ es.notice.text }}</div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { Renderer, OrbitCamera } from '../render/renderer.js'
import { buildOverlay } from '../render/overlay.js'
import { raycastVoxel, raycastGround } from '../voxel/pick.js'
import { clipFromSection, sectionActive } from '../voxel/geometry.js'
import { boxFromPoints } from '../voxel/geometry.js'
import {
  editorState as es,
  editorApi,
  meshCache,
  TOOLS,
  currentModel,
  requestRebuild,
  toggleMirror,
  updateClipboardPreview,
  pasteClipboard,
  selectBox,
  onPointerDownWorld,
  onPointerDragWorld,
  addV,
} from '../store/editorStore.js'
import { setViewport, selectDrag, setViewAngle } from '../store/viewStore.js'
import { CELL_SIZE } from '../voxel/model.js'
import * as glbApi from '../export/glb.js'
import * as store from '../store/editorStore.js'

const canvasEl = ref(null)
const ready = ref(false)
const error = ref('')
const fps = ref(0)
const renderer = shallowRef(null)
const camera = shallowRef(null)
let rafId = 0

const angles = [
  { id: 'iso', label: '等轴测', badge: '轴' },
  { id: 'front', label: '前视', badge: '前' },
  { id: 'top', label: '顶视', badge: '顶' },
  { id: 'right', label: '右视', badge: '右' },
  { id: 'left', label: '左视', badge: '左' },
]

const currentTool = computed(() => TOOLS.find((t) => t.id === es.tool) ?? TOOLS[0])
const selSize = computed(() => {
  if (!es.selection) return ''
  const b = es.selection
  return `${b.max[0] - b.min[0] + 1}×${b.max[1] - b.min[1] + 1}×${b.max[2] - b.min[2] + 1}`
})
const placeOccupied = computed(() => {
  if (!es.hoverPlace) return false
  return currentModel.value.get(...es.hoverPlace) !== undefined
})
const occupiedNotice = computed(() => es.tool === 'blit' && es.clipboardCollision > 0)

const marquee = ref(null)
const marqueeStyle = computed(() => {
  if (!marquee.value) return {}
  const m = marquee.value
  const x = Math.min(m.x0, m.x1)
  const y = Math.min(m.y0, m.y1)
  return {
    left: x + 'px',
    top: y + 'px',
    width: Math.abs(m.x1 - m.x0) + 'px',
    height: Math.abs(m.y1 - m.y0) + 'px',
  }
})

let pointers = new Map()
let dragMode = null
let dragStart = { x: 0, y: 0 }
let dragLast = { x: 0, y: 0 }
let paintData = null
let selectStartVoxel = null
let selectEndVoxel = null
let lastPaintedVoxel = null
let lastMoveEvent = null
let frameTimes = []

function localXY(e) {
  const r = canvasEl.value.getBoundingClientRect()
  return [e.clientX - r.left, e.clientY - r.top]
}

function renderAt(px, py) {
  const w = renderer.value.width / renderer.value.dpr
  const h = renderer.value.height / renderer.value.dpr
  const ray = camera.value.ray(px, py, w, h)
  const model = currentModel.value
  const visible = new Set()
  for (let i = 0; i < 4; i++) {
    if (es.soloGroup != null ? i === es.soloGroup : es.visible[i]) visible.add(i)
  }
  const clip = es.sectionOn && sectionActive(es.section) ? clipFromSection(es.section) : null
  const hit = raycastVoxel(model, ray.origin, ray.dir, { clip, visibleGroups: visible })
  let ground = null
  if (!hit) ground = raycastGround(model, ray.origin, ray.dir)
  return { ray, hit, ground }
}

function updateHover(px, py) {
  const { hit, ground } = renderAt(px, py)
  const model = currentModel.value
  if (hit) {
    es.hover = { voxel: hit.voxel, normal: hit.normal }
  } else {
    es.hover = null
  }

  // 落点
  if (es.tool === 'blit') {
    if (hit) {
      const t = hit.normal && (hit.normal[0] || hit.normal[1] || hit.normal[2]) ? addV(hit.voxel, hit.normal) : hit.voxel
      es.hoverPlace = t
      updateClipboardPreview(t)
    } else if (ground) {
      es.hoverPlace = ground.voxel
      updateClipboardPreview(ground.voxel)
    } else {
      es.hoverPlace = null
    }
  } else if (es.tool === 'paint') {
    if (hit) {
      const t = hit.normal && (hit.normal[0] || hit.normal[1] || hit.normal[2]) ? addV(hit.voxel, hit.normal) : hit.voxel
      es.hoverPlace = model.inside(...t) ? t : null
    } else if (ground) {
      es.hoverPlace = ground.voxel
    } else {
      es.hoverPlace = null
    }
  } else if (es.tool === 'erase' || es.tool === 'restyle') {
    es.hoverPlace = hit ? hit.voxel : null
  } else {
    es.hoverPlace = null
  }
  return { hit, ground }
}

function onDown(e) {
  if (!ready.value) return
  const [px, py] = localXY(e)
  pointers.set(e.pointerId, { x: px, y: py })
  canvasEl.value.setPointerCapture(e.pointerId)
  dragStart = { x: px, y: py }
  dragLast = { x: px, y: py }
  lastPaintedVoxel = null

  const pan = e.button === 1 || e.button === 2 || e.shiftKey
  if (pan) {
    dragMode = 'pan'
    return
  }

  const tool = es.tool
  if (tool === 'orbit') {
    dragMode = 'orbit'
    return
  }

  const { hit, ground } = updateHover(px, py)
  if (tool === 'select') {
    dragMode = 'select'
    selectStartVoxel = hit ? hit.voxel.slice() : ground ? ground.voxel.slice() : null
    selectEndVoxel = selectStartVoxel ? selectStartVoxel.slice() : null
    marquee.value = { x0: px, y0: py, x1: px, y1: py }
    return
  }
  if (tool === 'blit') {
    if (hit || ground) {
      const t = hit
        ? hit.normal && (hit.normal[0] || hit.normal[1] || hit.normal[2])
          ? addV(hit.voxel, hit.normal)
          : hit.voxel
        : ground.voxel
      updateClipboardPreview(t)
      pasteClipboard()
    }
    dragMode = null
    return
  }

  if (!hit) {
    dragMode = tool === 'paint' && ground ? 'paint' : null
    if (dragMode === 'paint' && ground) {
      editorApi.value.brush(ground.voxel, es.brush, es.group, es.mat, es.alphaQ, 'paint')
      lastPaintedVoxel = ground.voxel.slice()
    }
    return
  }


  dragMode = tool
  paintData = { hit }
  onPointerDownWorld({ ...hit, shift: e.shiftKey, tool })
  lastPaintedVoxel = hit.voxel.slice()
}

function onMove(e) {
  if (!ready.value) return
  const [px, py] = localXY(e)
  lastMoveEvent = { px, py }

  if (!dragMode) {
    updateHover(px, py)
    return
  }

  if (dragMode === 'orbit') {
    const dx = px - dragLast.x
    const dy = py - dragLast.y
    camera.value.orbit(dx, dy)
    dragLast = { x: px, y: py }
    return
  }
  if (dragMode === 'pan') {
    const dx = px - dragLast.x
    const dy = py - dragLast.y
    const h = canvasEl.value.clientHeight
    camera.value.pan(dx, dy, h)
    dragLast = { x: px, y: py }
    return
  }
  if (dragMode === 'select') {
    marquee.value = { x0: dragStart.x, y0: dragStart.y, x1: px, y1: py }
    const { hit, ground } = renderAt(px, py)
    if (hit) selectEndVoxel = hit.voxel.slice()
    else if (ground) selectEndVoxel = ground.voxel.slice()
    if (selectStartVoxel && selectEndVoxel) {
      es.selection = boxFromPoints(selectStartVoxel, selectEndVoxel)
    }
    return
  }
  if (dragMode === 'paint' || dragMode === 'erase' || dragMode === 'restyle') {
    updateHover(px, py)
    const { hit, ground } = renderAt(px, py)
    if (dragMode === 'paint') {
      let t = hit
        ? hit.normal && (hit.normal[0] || hit.normal[1] || hit.normal[2])
          ? addV(hit.voxel, hit.normal)
          : hit.voxel
        : ground
        ? ground.voxel
        : null
      if (t && !currentModel.value.inside(...t)) t = null
      if (t && (!lastPaintedVoxel || t[0] !== lastPaintedVoxel[0] || t[1] !== lastPaintedVoxel[1] || t[2] !== lastPaintedVoxel[2])) {
        editorApi.value.brush(t, es.brush, es.group, es.mat, es.alphaQ, 'paint')
        lastPaintedVoxel = t.slice()
      }
    } else if (hit) {
      if (!lastPaintedVoxel || hit.voxel.join() !== lastPaintedVoxel.join()) {
        onPointerDragWorld({ ...hit, lastVoxel: lastPaintedVoxel })
        lastPaintedVoxel = hit.voxel.slice()
      }
    }
    return
  }
}

function onUp(e) {
  if (!ready.value) return
  pointers.delete(e.pointerId)
  if (dragMode === 'select') {
    marquee.value = null
    if (selectStartVoxel && selectEndVoxel) {
      selectBox(selectStartVoxel, selectEndVoxel)
      es.selection = boxFromPoints(selectStartVoxel, selectEndVoxel)
    } else {
      es.selection = null
    }
  }
  dragMode = null
  paintData = null
  lastPaintedVoxel = null
  if (canvasEl.value.hasPointerCapture?.(e.pointerId)) canvasEl.value.releasePointerCapture(e.pointerId)
}

function onLeave() {
  if (!dragMode) {
    es.hover = null
    if (es.tool !== 'blit') es.hoverPlace = null
  }
}

function onWheel(e) {
  if (!ready.value) return
  const [px, py] = localXY(e)
  camera.value.zoom(e.deltaY)
  if (!dragMode) updateHover(px, py)
}

function frameAll() {
  const model = currentModel.value
  const b = model.bounds()
  camera.value.frame(
    b ?? { min: [0, 0, 0], max: [model.sx - 1, model.sy - 1, model.sz - 1] },
    canvasEl.value.clientWidth / canvasEl.value.clientHeight,
    { x: model.sx, y: model.sy, z: model.sz }
  )
}

function setAngle(id) {
  const cam = camera.value
  const d = cam.distance
  if (id === 'iso') {
    cam.yaw = -0.72
    cam.pitch = 0.36
  } else if (id === 'front') {
    cam.yaw = 0
    cam.pitch = 0.05
  } else if (id === 'top') {
    cam.yaw = 0
    cam.pitch = 1.44
  } else if (id === 'right') {
    cam.yaw = Math.PI / 2
    cam.pitch = 0.05
  } else if (id === 'left') {
    cam.yaw = -Math.PI / 2
    cam.pitch = 0.05
  }
  cam.distance = d
}

let lastOverlaySig = ''
function overlaySignature() {
  const model = currentModel.value
  return [
    es.stats.count,
    es.meshVersion,
    lastMoveEvent ? lastMoveEvent.px : -1,
    lastMoveEvent ? lastMoveEvent.py : -1,
    es.sectionOn ? JSON.stringify(es.section) : '',
    es.selection ? JSON.stringify(es.selection) : '',
    es.mirrorOn ? es.mirrorAxis : '',
    es.tool,
    es.clipboardCollision,
    es.clipboardTarget.join(),
    model.sx,
    model.sz,
  ].join('|')
}

function loop(t) {
  rafId = requestAnimationFrame(loop)
  const r = renderer.value
  if (!r || !r.ok) return
  // 网格更新
  const mc = meshCache.value
  if (r.lastMeshVersion !== mc.version) {
    r.setMesh(mc.mesh)
    r.lastMeshVersion = mc.version
  }
  // 叠加层
  const sig = overlaySignature()
  if (sig !== lastOverlaySig) {
    lastOverlaySig = sig
    const lines = buildOverlay(currentModel.value, {
      showGrid: es.showGrid,
      showEdges: es.showEdges,
      hover: es.hover,
      hoverPlace: es.hoverPlace,
      selection: es.selection,
      clipboard: es.clipboard,
      clipboardTarget: es.clipboardTarget,
      clipboardCollision: es.clipboardCollision,
      clipboardOutOfBounds: es.clipboardOutOfBounds,
      mirrorOn: es.mirrorOn,
      mirrorAxis: es.mirrorAxis,
      sectionOn: es.sectionOn,
      section: es.section,
      xrayGrid: true,
    })
    r.setOverlay(lines)
  }
  r.render()
  frameTimes.push(t)
  while (frameTimes.length && t - frameTimes[0] > 1000) frameTimes.shift()
  if (frameTimes.length > 5) fps.value = frameTimes.length
}

onMounted(async () => {
  try {
    const r = new Renderer(canvasEl.value)
    await r.init()
    renderer.value = r
    camera.value = r.camera
    r.setGround(400, [0.013, 0.0145, 0.017])
    ready.value = true
    setViewport({ frameAll, setAngle })
    if (typeof window !== 'undefined') {
      // 调试钩子：自动化测试用，只读取不写业务状态之外的东西
      window.__vp = { renderer: r, camera: r.camera, es, glbApi, store }
    }
    requestAnimationFrame(loop)
    // 布局稳定后再取景，否则画布尺寸可能是 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        r.resize()
        frameAll()
        requestRebuild()
      })
    })
  } catch (err) {
    error.value = err.message ?? String(err)
    console.error(err)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  setViewport(null)
})

defineExpose({ frameAll, setAngle })
</script>
