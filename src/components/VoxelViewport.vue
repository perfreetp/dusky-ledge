<template>
  <div class="canvas-wrap" ref="wrapRef">
    <canvas ref="canvasRef"></canvas>
    <div v-if="rect" class="marquee-rect"
      :style="{ left: rect.x1 + 'px', top: rect.y1 + 'px', width: rect.x2 - rect.x1 + 'px', height: rect.y2 - rect.y1 + 'px' }"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { IsoRenderer } from '../lib/iso.js'
import { fanOut, keyOf } from '../lib/voxel.js'

const props = defineProps({
  state: { type: Object, required: true },
  readonly: { type: Boolean, default: false }
})
const emit = defineEmits(['change', 'toast', 'select'])

const wrapRef = ref(null)
const canvasRef = ref(null)
let renderer = null
let raf = 0
let ro = null
const rect = ref(null)
const drag = reactive({ mode: null, startX: 0, startY: 0, yaw0: 0, moved: false, lastCell: null })

function scheduleRender () {
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (renderer) renderer.render() })
}

function syncRenderer () {
  if (!renderer) return
  renderer.model = props.state.model
  renderer.mirror = props.state.mirror
  renderer.activeLayer = props.state.layerMode ? props.state.activeLayer : null
  renderer.selection = props.state.selection
  renderer.hover = props.state.hover
  scheduleRender()
}

watch(() => [props.state.version, props.state.yaw, props.state.tile, props.state.mirror,
  props.state.layerMode, props.state.activeLayer, props.state.hover, props.state.readonlyKey], syncRenderer)
watch(() => props.state.selection, syncRenderer, { deep: true })

onMounted(() => {
  renderer = new IsoRenderer(canvasRef.value)
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const doResize = () => {
    const w = wrapRef.value.clientWidth, h = wrapRef.value.clientHeight
    renderer.resize(w, h, dpr)
    scheduleRender()
  }
  ro = new ResizeObserver(doResize)
  ro.observe(wrapRef.value)
  doResize()
  syncRenderer()
  const c = canvasRef.value
  c.addEventListener('pointerdown', onDown)
  c.addEventListener('pointermove', onMove)
  c.addEventListener('contextmenu', preventMenu)
  window.addEventListener('pointerup', onUp)
  c.addEventListener('wheel', onWheel, { passive: false })
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  ro?.disconnect()
  const c = canvasRef.value
  c?.removeEventListener('contextmenu', preventMenu)
  c?.removeEventListener('pointerdown', onDown)
  c?.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  c?.removeEventListener('wheel', onWheel)
})

function localPoint (e) {
  const r = canvasRef.value.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function preventMenu (e) { e.preventDefault() }

function onWheel (e) {
  e.preventDefault()
  const s = props.state
  s.tile = Math.max(10, Math.min(60, s.tile + (e.deltaY < 0 ? 2 : -2)))
}

function onDown (e) {
  if (e.button !== 0 && e.button !== 2) return
  const p = localPoint(e)
  const s = props.state
  canvasRef.value.setPointerCapture(e.pointerId)
  drag.startX = p.x; drag.startY = p.y; drag.moved = false; drag.lastCell = null

  if (e.button === 2 || props.readonly) {
    drag.mode = 'rotate'
    drag.yaw0 = s.yaw
    return
  }
  if (s.tool === 'marquee') {
    drag.mode = 'marquee'
    rect.value = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }
    return
  }
  if (s.tool === 'rotate') {
    drag.mode = 'rotate'
    drag.yaw0 = s.yaw
    return
  }
  // 编辑/选择工具：先记录起点，移动超过阈值再决定旋转还是拖绘
  drag.mode = 'pending'
  drag.yaw0 = s.yaw
  if (s.tool === 'select') {
    const hit = renderer.pick(p.x, p.y)
    if (hit) {
      if (e.shiftKey) {
        if (s.selection.has(hit.key)) s.selection.delete(hit.key)
        else s.selection.add(hit.key)
      } else if (!s.selection.has(hit.key)) {
        s.selection.clear(); s.selection.add(hit.key)
      }
      emit('select', hit)
    } else if (!e.shiftKey) {
      s.selection.clear()
    }
  } else {
    applyBrush(p, true)
  }
}

function onMove (e) {
  const p = localPoint(e)
  const s = props.state
  const dx = p.x - drag.startX, dy = p.y - drag.startY
  if (drag.mode === 'pending' && Math.hypot(dx, dy) > 5) {
    drag.mode = (s.tool === 'add' || s.tool === 'erase') ? 'paint' : 'rotate'
  }

  if (drag.mode === 'rotate') {
    s.yaw = drag.yaw0 + dx * 0.012
    return
  }
  if (drag.mode === 'marquee') {
    rect.value = {
      x1: Math.min(drag.startX, p.x), y1: Math.min(drag.startY, p.y),
      x2: Math.max(drag.startX, p.x), y2: Math.max(drag.startY, p.y)
    }
    return
  }
  if (drag.mode === 'paint') {
    applyBrush(p, false)
    return
  }
  // 悬停提示
  if (!drag.mode) updateHover(p)
}

function onUp (e) {
  if (!drag.mode) { drag.mode = null; return }
  const p = localPoint(e)
  const s = props.state
  if (drag.mode === 'marquee' && rect.value) {
    const keys = renderer.marquee(rect.value)
    if (!e.shiftKey) s.selection.clear()
    for (const k of keys) s.selection.add(k)
    rect.value = null
    emit('toast', keys.length ? `框选 ${keys.length} 个体素` : '框选内没有体素')
  }
  if (drag.mode === 'paint' || drag.mode === 'pending') emit('change')
  drag.mode = null
  updateHover(p)
}

/** 在屏幕点处执行一次笔刷（加/删），含镜像扇出与层约束 */
function applyBrush (p, isFirst) {
  const s = props.state
  if (props.readonly) return
  const hit = renderer.pick(p.x, p.y)
  const stamp = (x, y, z) => {
    const ck = `${x},${y},${z}`
    if (drag.lastCell === ck) return
    drag.lastCell = ck
    if (s.tool === 'add') {
      const pts = fanOut(s.model, x, y, z, s.mirror)
      for (const [fx, fy, fz] of pts) {
        if (s.layerMode && fz !== s.activeLayer) continue
        if (!s.model.voxels.has(keyOf(fx, fy, fz))) {
          if (!s.requestAdd(fx, fy, fz, s.color)) return
        }
      }
    } else {
      const pts = fanOut(s.model, x, y, z, s.mirror)
      for (const [fx, fy, fz] of pts) {
        if (s.layerMode && fz !== s.activeLayer) continue
        s.model.voxels.delete(keyOf(fx, fy, fz))
      }
      s.selection.delete(ck)
    }
    s.bump()
  }

  if (s.tool === 'add') {
    if (!hit) {
      if (isFirst) emit('toast', '点在已有体素的面上来添加新体素')
      return
    }
    let nx = hit.x + hit.nx, ny = hit.y + hit.ny, nz = hit.z + hit.nz
    if (s.layerMode) {
      nz = s.activeLayer
      // 同一层内：落在命中体素上时不处理
      if (nx === hit.x && ny === hit.y && nz === hit.z) return
    }
    stamp(nx, ny, nz)
  } else if (s.tool === 'erase') {
    if (!hit) return
    stamp(hit.x, hit.y, hit.z)
  }
}

function updateHover (p) {
  const s = props.state
  if (props.readonly || (s.tool !== 'add' && s.tool !== 'erase')) {
    s.hover = null
    return
  }
  const hit = renderer.pick(p.x, p.y)
  if (!hit) { s.hover = null; return }
  if (s.tool === 'erase') {
    s.hover = { x: hit.x, y: hit.y, z: hit.z, ghost: null }
  } else {
    let gx = hit.x + hit.nx, gy = hit.y + hit.ny, gz = hit.z + hit.nz
    if (s.layerMode) gz = s.activeLayer
    s.hover = { x: hit.x, y: hit.y, z: hit.z, ghost: { x: gx, y: gy, z: gz } }
  }
}

defineExpose({
  resetView () {
    props.state.yaw = Math.PI / 6
    props.state.tile = 26
  }
})
</script>
