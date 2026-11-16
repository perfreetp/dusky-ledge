<template>
  <div class="panel">
    <div class="panel-hd">
      <b>切片剖切</b>
      <span class="sp"></span>
      <button class="btn sm ghost" @click="toggleOn" :class="{ on: es.sectionOn }">
        {{ es.sectionOn ? '开' : '关' }}
      </button>
    </div>
    <div class="panel-bd tight">
      <div v-for="ax in axes" :key="ax.key" class="slice-row">
        <span class="ax" :style="{ color: ax.color }">{{ ax.label }}</span>
        <input
          type="range"
          :min="0"
          :max="ax.max"
          :value="es.section[ax.key]?.at ?? 0"
          :disabled="!es.sectionOn"
          @input="onInput(ax, $event)"
        />
        <button
          class="dirbtn"
          :disabled="!es.sectionOn || !es.section[ax.key]"
          :title="es.section[ax.key]?.dir === 'max' ? '从负向切' : '从正向切'"
          @click="flipSection(ax.key)"
        >{{ es.section[ax.key]?.dir === 'max' ? '≤' : '≥' }}</button>
        <span class="v" :class="{ off: !es.section[ax.key] }">
          {{ es.section[ax.key] ? es.section[ax.key].at + 1 : '—' }}
        </span>
      </div>

      <div class="flip-row">
        <label class="sw-row"><input type="checkbox" v-model="es.showGrid" @change="touch" /> 地面网格</label>
        <label class="sw-row"><input type="checkbox" v-model="es.showEdges" @change="touch" /> 悬停描边</label>
      </div>
      <div class="hintline">拖动滑杆沿 X / Y / Z 剖开设备，剖切面做暗色封边；≥ / ≤ 可换切另一侧。</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { editorState as es, setSection, clearSection, flipSection, requestRebuild } from '../store/editorStore.js'

const axes = computed(() => [
  { key: 'x', label: 'X', color: '#e07f5a', max: es.model.sx - 1 },
  { key: 'y', label: 'Y', color: '#7fc98a', max: es.model.sy - 1 },
  { key: 'z', label: 'Z', color: '#6aa6e0', max: es.model.sz - 1 },
])

function onInput(ax, e) {
  es.sectionOn = true
  setSection(ax.key, Number(e.target.value), es.section[ax.key]?.dir ?? 'min')
}

function toggleOn() {
  if (es.sectionOn) {
    es.sectionOn = false
    clearSection()
  } else {
    es.sectionOn = true
    setSection('x', Math.floor(es.model.sx / 2), 'min')
  }
  requestRebuild()
}

function touch() {
  requestRebuild()
}
</script>

<style scoped>
.slice-row { display: grid; grid-template-columns: 18px 1fr 26px 26px; align-items: center; gap: 6px; margin-bottom: 7px; }
.slice-row .ax { font-family: var(--mono); font-size: 10.5px; }
.slice-row input { accent-color: var(--accent); width: 100%; }
.slice-row .v { font-family: var(--mono); font-size: 10px; color: var(--text-2); text-align: right; }
.slice-row .v.off { color: #4d5768; }
.dirbtn {
  border: 1px solid var(--line-2); background: #121821; color: var(--text-2); border-radius: 4px;
  font-size: 10px; padding: 2px 0; cursor: pointer; font-family: var(--mono);
}
.dirbtn:disabled { opacity: .35; cursor: default; }
.dirbtn:hover:not(:disabled) { background: #1d2632; color: var(--text); }
.flip-row { display: flex; gap: 14px; margin-top: 9px; padding-top: 8px; border-top: 1px solid var(--line); }
.btn.on { border-color: #8a6a34; color: var(--accent-2); }
</style>
