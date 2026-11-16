<template>
  <div class="panel">
    <div class="panel-hd"><b>设备</b><span class="sp"></span>
      <button class="btn sm ghost" @click="clear" title="清空工作台">清空</button>
    </div>
    <div class="panel-bd tight">
      <div class="preset-list">
        <button
          v-for="p in PRESETS"
          :key="p.id"
          class="preset"
          :class="{ on: es.presetId === p.id }"
          @click="loadPreset(p.id)"
        >
          <div class="preset-t">
            <b>{{ p.name }}</b>
            <span class="mono">{{ p.model }}</span>
          </div>
          <div class="preset-c">{{ p.caption }}</div>
          <div class="preset-s mono">{{ p.size.join('×') }} 格 · 单格 0.5 m</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { editorState as es, loadPreset, clearAll } from '../store/editorStore.js'
import { PRESETS } from '../voxel/presets.js'

function clear() {
  if (!window.confirm('清空当前工作台？所有体素会被移除，之后可用 Ctrl+Z 撤销。')) return
  clearAll()
}
</script>

<style scoped>
.preset-list { display: flex; flex-direction: column; gap: 5px; }
.preset {
  text-align: left; background: #121821; border: 1px solid var(--line); border-radius: 7px; padding: 7px 9px;
  cursor: pointer; color: var(--text-2); transition: all .13s;
}
.preset:hover { background: #1a2230; border-color: #2c3848; }
.preset.on { background: linear-gradient(180deg, #211d16, #1a1813); border-color: #6d5426; }
.preset-t { display: flex; align-items: baseline; gap: 7px; }
.preset-t b { color: var(--text); font-size: 12px; font-weight: 500; }
.preset.on .preset-t b { color: var(--accent-2); }
.preset-t span { font-size: 9.5px; color: var(--text-3); }
.preset-c { font-size: 10.5px; color: var(--text-3); margin-top: 2px; }
.preset-s { font-size: 9.5px; color: #4f5a6b; margin-top: 3px; }
</style>
