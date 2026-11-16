<template>
  <div class="panel">
    <div class="panel-hd"><b>材质与透明度</b></div>
    <div class="panel-bd tight">
      <div class="swatches">
        <div class="sw-wrap" v-for="m in MATERIALS" :key="m.id">
          <div
            class="sw-item"
            :class="{ on: es.mat === m.id }"
            :style="swStyle(m)"
            :title="m.name"
            @click="setMat(m.id)"
          >
            <span class="gl"></span>
          </div>
          <div class="sw-name">{{ m.short }}</div>
        </div>
      </div>

      <div class="slider-row">
        <span class="lbl" style="margin:0; white-space:nowrap">透明度</span>
        <input type="range" min="5" max="100" step="1" :value="percent" @input="onAlpha" />
        <span class="val">{{ percent }}%</span>
      </div>
      <div class="alpha-bar">
        <span :style="{ width: percent + '%' }"></span>
      </div>

      <div class="divider"></div>
      <button class="btn sm full" :disabled="!es.selection" @click="applySelection">
        套用到选区{{ es.selection ? '整片' : '' }}
      </button>
      <div class="hintline">点格子用「改属性」工具可逐格套用；这里只改当前落笔参数。</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { editorState as es, setMat, toast } from '../store/editorStore.js'
import { MATERIALS, GROUPS, percentToQ, qToPercent } from '../store/materials.js'
import { collectVoxels } from '../voxel/geometry.js'

const percent = computed(() => qToPercent(es.alphaQ))

function onAlpha(e) {
  es.alphaQ = percentToQ(Number(e.target.value))
}

function swStyle(m) {
  const color = m.color ?? GROUPS[es.group].color
  return {
    background: m.color
      ? color
      : `linear-gradient(135deg, ${GROUPS[es.group].color} 55%, #2a2f36 55%)`,
    opacity: 0.45 + (m.alpha ?? 1) * 0.55,
  }
}

function applySelection() {
  if (!es.selection) return
  const voxels = collectVoxels(es.model, es.selection)
  if (!voxels.length) {
    toast('选区里没有体素', 'warn')
    return
  }
  es.editor.restyle(voxels, { group: null, mat: es.mat, alphaQ: es.alphaQ })
  toast(`已为 ${voxels.length} 格套用材质`, 'ok')
}
</script>

<style scoped>
.sw-wrap { display: flex; flex-direction: column; }
.sw-item { width: 100%; }
.swatches { row-gap: 7px; }
.alpha-bar { height: 3px; background: #0e131a; border-radius: 2px; margin-top: 6px; overflow: hidden; }
.alpha-bar span { display: block; height: 100%; background: linear-gradient(90deg, #4a5a70, #7fb6c4); transition: width .15s; }
</style>
