<template>
  <div class="panel">
    <div class="panel-hd"><b>工具</b><span class="sp"></span>
      <span class="mono hintkeys">Q B E R I M P</span>
    </div>
    <div class="panel-bd tight">
      <div class="toolgrid">
        <button
          v-for="t in TOOLS"
          :key="t.id"
          class="tool"
          :class="{ on: es.tool === t.id }"
          :title="t.hint"
          @click="es.tool = t.id"
        >
          <span class="k">{{ t.key }}</span>
          <component :is="icons[t.id]" />
          <span>{{ t.label }}</span>
        </button>
      </div>

      <div v-if="es.tool === 'paint' || es.tool === 'erase'" class="brush-row">
        <span class="lbl" style="margin:0">笔刷半径</span>
        <input type="range" min="1" max="4" step="1" v-model.number="es.brush" />
        <span class="mono bv">{{ es.brush }}</span>
      </div>

      <div class="divider"></div>

      <div class="btn-row">
        <button class="btn sm" :disabled="!es.editor.log.canUndo" @click="undo" title="Ctrl+Z">撤销</button>
        <button class="btn sm" :disabled="!es.editor.log.canRedo" @click="redo" title="Ctrl+Shift+Z">重做</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue'
import { editorState as es, TOOLS, undo, redo } from '../store/editorStore.js'

const svg = (paths) => () =>
  h('svg', { viewBox: '0 0 20 20' }, paths.map((d) => h('path', { d })))

const icons = {
  orbit: svg([
    'M10 3.2a6.8 6.8 0 016.4 4.5M3.4 10.4A6.8 6.8 0 009.9 16.8',
    'M15.4 3.6l1.2 4.2-4.1-1M4.6 16.4l-1.2-4.2 4.1 1',
    'M10 7.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8z',
  ]),
  paint: svg(['M4 15.5L11.5 8l1.5 1.5L5.5 17z', 'M11 6.5l2.6-2.6 3.5 3.5-2.6 2.6z', 'M12.5 5l1.6-1.6 2.5 2.5L15 7.5']),
  erase: svg(['M3.5 12.5l6-6 5.5 5.5-6 6H5.5z', 'M8 17.5h8.5', 'M7 9.5l5.5 5.5']),
  restyle: svg(['M10 2.8l6.8 3.9v6.6L10 17.2 3.2 13.3V6.7z', 'M10 10.2l6.8-3.5M10 10.2v6.6M10 10.2L3.2 6.7']),
  pick: svg(['M13.5 3.2l3.3 3.3-2 2-1.5-1.5-5 5 .9 1.4-2 2-3-3 2-2 1.4.9 5-5-1.5-1.5z']),
  select: svg(['M3.2 7V4.6A1.4 1.4 0 014.6 3.2H7', 'M13 3.2h2.4a1.4 1.4 0 011.4 1.4V7', 'M16.8 13v2.4a1.4 1.4 0 01-1.4 1.4H13', 'M7 16.8H4.6a1.4 1.4 0 01-1.4-1.4V13', 'M7.6 7.6h4.8v4.8H7.6z']),
  blit: svg(['M8 3.2h9v9H8z', 'M3 8h9v9H3z', 'M11.6 11.6l-3.2 3.2']),
}
</script>

<style scoped>
.hintkeys { font-size: 9px; color: #4a5464; letter-spacing: 1px; }
.brush-row { display: flex; align-items: center; gap: 8px; margin-top: 9px; }
.brush-row input { flex: 1; accent-color: var(--accent); }
.brush-row .lbl { font-size: 10.5px; }
.bv { font-size: 11px; color: var(--text-2); width: 12px; text-align: right; }
</style>
