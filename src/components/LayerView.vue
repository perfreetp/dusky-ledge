<template>
  <div class="canvas-wrap" ref="wrapRef">
    <canvas ref="canvasRef"></canvas>
    <div v-if="rect" class="marquee-rect"
      :style="{ left: rect.x1 + 'px', top: rect.y1 + 'px', width: rect.x2 - rect.x1 + 'px', height: rect.y2 - rect.y1 + 'px' }"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { PlanRenderer } from '../lib/planview.js'
import { keyOf } from '../lib/voxel.js'

const props = defineProps({
  state: { type: Object, required: true }
})
const emit = defineEmits(['change', 'toast'])

const wrapRef = ref(null)
const canvasRef = ref(null)
let renderer = null
let raf = 0
let ro = null
const rect = ref(null)
const drag = reactive({ mode: null, last: null })

function scheduleRender () {
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderer?.render() })
}
function sync () {
  if (!renderer) return
  renderer.model = props.state.model
  renderer.layer = props.state.activeLayer
  renderer.mirror = props.state.mirror
  renderer.selection = props.state.selection
  scheduleRender()
}
watch(() => [props.state.version, props.state.activeLayer, props.state.mirror], sync)
watch(() => props.state.selection, sync, { deep: true })

onMounted(() => {
  renderer = new PlanRenderer(canvasRef.value)
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const doResize = () => {
    renderer.resize(wrapRef.value.clientWidth, wrapRef.value.clientHeight, dpr)
    scheduleRender()
  }
  ro = new ResizeObserver(doResize)
  ro.observe(wrapRef.value)
  doResize()
  sync()
  const c = canvasRef.value
  c.addEventListener('pointerdown', onDown)
  c.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
})
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  ro?.disconnect()
  window.removeEventListener('pointerup', onUp)
})

function pt (e) {
  const r = canvasRef.value.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function onDown (e) {
  const p = pt(e)
  const s = props.state
  canvasRef.value.setPointerCapture(e.pointerId)
  drag.last = null
  const cell = renderer.cellAt(p.x, p.y)
  if (s.tool === 'marquee') {
    drag.mode = 'marquee'
    rect.value = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }
    return
  }
  if (s.tool === 'rotate') { drag.mode = null; emit('toast', '切片模式下旋转请使用主视图') ; return }
  if (!cell) return
  if (s.tool === 'select') {
    drag.mode = 'select'
    const k = keyOf(cell.x, cell.y, s.activeLayer)
    if (e.shiftKey) {
      if (s.selection.has(k)) s.selection.delete(k); else s.selection.add(k)
    } else {
      s.selection.clear(); s.selection.add(k)
    }
    return
  }
  drag.mode = s.tool
  stamp(cell)
}

function onMove (e) {
  const p = pt(e)
  const s = props.state
  const cell = renderer.cellAt(p.x, p.y)
  renderer.hoverCell = cell
  if (renderer.ghost && !cell) renderer.ghost = null
  if (cell && (s.tool === 'add' || s.tool === 'erase')) {
    renderer.ghost = s.tool === 'add' ? { x: cell.x, y: cell.y, color: s.color } : null
  } else renderer.ghost = null
  scheduleRender()

  if (drag.mode === 'marquee' && rect.value) {
    rect.value = {
      x1: Math.min(rect.value.x1, p.x), y1: Math.min(rect.value.y1, p.y),
      x2: Math.max(rect.value.x1, p.x), y2: Math.max(rect.value.y1, p.y)
    }
    return
  }
  if ((drag.mode === 'add' || drag.mode === 'erase') && cell) stamp(cell)
}

function onUp (e) {
  const s = props.state
  if (drag.mode === 'marquee' && rect.value) {
    const r = rect.value
    const a = renderer.cellAt(r.x1, r.y1), b = renderer.cellAt(r.x2, r.y2)
    if (a && b) {
      if (!e.shiftKey) s.selection.clear()
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
        for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
          if (s.model.voxels.has(keyOf(x, y, s.activeLayer))) s.selection.add(keyOf(x, y, s.activeLayer))
        }
      }
    }
    rect.value = null
  }
  if (drag.mode === 'add' || drag.mode === 'erase') emit('change')
  drag.mode = null
  renderer.hoverCell = null
  renderer.ghost = null
  scheduleRender()
}

function stamp (cell) {
  const s = props.state
  const z = s.activeLayer
  const cells = renderer.fanCells(cell.x, cell.y)
  const ck = `${cell.x},${cell.y},${z}`
  if (drag.last === ck) return
  drag.last = ck
  for (const [x, y] of cells) {
    const k = keyOf(x, y, z)
    if (s.tool === 'add') {
      if (!s.model.voxels.has(k)) s.requestAdd(x, y, z, s.color)
    } else {
      s.model.voxels.delete(k)
      s.selection.delete(k)
    }
  }
  s.bump()
}
</script>
