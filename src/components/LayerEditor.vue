<template>
  <div class="layer-editor">
    <div class="layer-bar">
      <button class="btn sm" @click="stepLayer(-1)" :disabled="store.currentLayer <= 0">▼ 下层</button>
      <input
        type="range"
        class="layer-slider"
        :min="0"
        :max="store.model.ny - 1"
        v-model.number="store.currentLayer"
      />
      <button class="btn sm" @click="stepLayer(1)" :disabled="store.currentLayer >= store.model.ny - 1">▲ 上层</button>
      <span class="layer-label">
        第 {{ store.currentLayer + 1 }} / {{ store.model.ny }} 层
        ({{ (store.currentLayer * store.model.cell * 100).toFixed(0) }}–{{
          ((store.currentLayer + 1) * store.model.cell * 100).toFixed(0)
        }}cm)
      </span>
    </div>
    <div class="canvas-wrap" ref="wrapRef">
      <canvas
        ref="canvasRef"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      ></canvas>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { store, materialColor, touch } from '../store'

const canvasRef = ref(null)
const wrapRef = ref(null)
let drawing = false
let selectStart = null
let dragSel = null
let ro = null

function cellSize() {
  const c = canvasRef.value
  if (!c) return 8
  return Math.min(c.width / store.model.nx, c.height / store.model.nz)
}

function toCell(e) {
  const c = canvasRef.value
  const r = c.getBoundingClientRect()
  const s = cellSize()
  const scaleX = c.width / r.width
  const scaleY = c.height / r.height
  const x = Math.floor(((e.clientX - r.left) * scaleX) / s)
  const z = Math.floor(((e.clientY - r.top) * scaleY) / s)
  return {
    x: Math.max(0, Math.min(store.model.nx - 1, x)),
    z: Math.max(0, Math.min(store.model.nz - 1, z))
  }
}

function paintAt(x, z) {
  const m = store.tool === 'erase' ? 0 : store.material
  store.model.setMirrored(x, store.currentLayer, z, m, store.mirrorX, store.mirrorZ)
}

function onDown(e) {
  const { x, z } = toCell(e)
  if (store.tool === 'select') {
    selectStart = { x, z }
    dragSel = { x0: x, z0: z, x1: x, z1: z }
    store.selection = null
  } else if (store.tool === 'paste') {
    if (store.clipboard) {
      store.model.pasteRegion(
        store.currentLayer, store.clipboard, x, z, store.mirrorX, store.mirrorZ
      )
      touch()
    }
  } else {
    drawing = true
    paintAt(x, z)
    touch()
  }
  draw()
}

function onMove(e) {
  const { x, z } = toCell(e)
  if (store.tool === 'select' && selectStart) {
    dragSel = {
      x0: Math.min(selectStart.x, x),
      z0: Math.min(selectStart.z, z),
      x1: Math.max(selectStart.x, x),
      z1: Math.max(selectStart.z, z)
    }
    draw()
  } else if (drawing && (store.tool === 'paint' || store.tool === 'erase')) {
    paintAt(x, z)
    touch()
    draw()
  }
}

function onUp() {
  if (store.tool === 'select' && dragSel) {
    store.selection = dragSel
    dragSel = null
    selectStart = null
  }
  drawing = false
  draw()
}

function stepLayer(d) {
  store.currentLayer = Math.max(0, Math.min(store.model.ny - 1, store.currentLayer + d))
}

function draw() {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')
  const model = store.model
  const s = cellSize()
  const y = store.currentLayer

  ctx.fillStyle = '#10131a'
  ctx.fillRect(0, 0, c.width, c.height)

  // 体素
  const base = y * model.nz * model.nx
  for (let z = 0; z < model.nz; z++) {
    for (let x = 0; x < model.nx; x++) {
      const v = model.data[base + z * model.nx + x]
      if (!v) continue
      ctx.fillStyle = materialColor(v)
      ctx.fillRect(x * s, z * s, Math.ceil(s), Math.ceil(s))
    }
  }

  // 网格线
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= model.nx; x++) {
    ctx.moveTo(x * s + 0.5, 0)
    ctx.lineTo(x * s + 0.5, model.nz * s)
  }
  for (let z = 0; z <= model.nz; z++) {
    ctx.moveTo(0, z * s + 0.5)
    ctx.lineTo(model.nx * s, z * s + 0.5)
  }
  ctx.stroke()

  // 镜像轴
  ctx.setLineDash([5, 4])
  if (store.mirrorX) {
    ctx.strokeStyle = 'rgba(255,120,120,0.7)'
    ctx.beginPath()
    ctx.moveTo((model.nx / 2) * s, 0)
    ctx.lineTo((model.nx / 2) * s, model.nz * s)
    ctx.stroke()
  }
  if (store.mirrorZ) {
    ctx.strokeStyle = 'rgba(120,200,255,0.7)'
    ctx.beginPath()
    ctx.moveTo(0, (model.nz / 2) * s)
    ctx.lineTo(model.nx * s, (model.nz / 2) * s)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // 选区
  const sel = dragSel || store.selection
  if (sel) {
    ctx.strokeStyle = '#ffd54a'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.strokeRect(sel.x0 * s, sel.z0 * s, (sel.x1 - sel.x0 + 1) * s, (sel.z1 - sel.z0 + 1) * s)
    ctx.setLineDash([])
  }
}

function resize() {
  const c = canvasRef.value
  const w = wrapRef.value
  if (!c || !w) return
  c.width = w.clientWidth
  c.height = w.clientHeight
  draw()
}

onMounted(() => {
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(wrapRef.value)
  watch(
    () => [store.rev, store.currentLayer, store.mirrorX, store.mirrorZ, store.selection],
    draw
  )
})

onBeforeUnmount(() => ro && ro.disconnect())
</script>

<style scoped>
.layer-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.layer-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #1b1f27;
  border-bottom: 1px solid #2a303c;
}
.layer-slider {
  flex: 1;
  accent-color: #4da3ff;
}
.layer-label {
  font-size: 12px;
  color: #9fb0c8;
  white-space: nowrap;
}
.canvas-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
}
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}
</style>
