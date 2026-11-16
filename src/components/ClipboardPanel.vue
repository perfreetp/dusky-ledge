<template>
  <div class="panel">
    <div class="panel-hd"><b>剪贴板与选区</b></div>
    <div class="panel-bd tight">
      <div class="sel-info" v-if="es.selection">
        <div>
          <span class="lbl" style="margin:0">选区尺寸</span>
          <div class="mono big">{{ selSize }}</div>
        </div>
        <div>
          <span class="lbl" style="margin:0">体素数</span>
          <div class="mono big">{{ selCount }}</div>
        </div>
        <div>
          <span class="lbl" style="margin:0">起点</span>
          <div class="mono big">{{ es.selection.min.join(',') }}</div>
        </div>
      </div>
      <div v-else class="sel-empty">用「框选」工具（M）拖一个矩形，或在分组面板点「S」只取一组。</div>

      <div class="clip-actions">
        <button class="btn sm" :disabled="!es.selection" @click="copySelection">复制 <kbd>Ctrl+C</kbd></button>
        <button class="btn sm" :disabled="!es.selection" @click="cutSelection">剪切 <kbd>Ctrl+X</kbd></button>
        <button class="btn sm" :disabled="!es.selection" @click="deleteSelection">删除 <kbd>Del</kbd></button>
      </div>

      <template v-if="es.clipboard">
        <div class="clip-box">
          <div class="clip-hd">
            <span class="dot ok"></span>
            <b>剪贴板</b>
            <span class="mono">{{ es.clipboard.items.length }} 格 · {{ es.clipboard.size.join('×') }}</span>
          </div>
          <div class="coord-row">
            <span class="lbl" style="margin:0">目标坐标</span>
            <input class="inp mini mono" type="number" v-model.number="tx" />
            <input class="inp mini mono" type="number" v-model.number="ty" />
            <input class="inp mini mono" type="number" v-model.number="tz" />
            <button class="btn sm" @click="applyCoords">定位</button>
          </div>
          <div class="clip-status" :class="statusTone">
            {{ statusText }}
          </div>
          <div class="btn-row">
            <button class="btn sm primary" @click="pasteClipboard">粘贴到此 <kbd>Ctrl+V</kbd></button>
            <button class="btn sm ghost" :disabled="es.tool !== 'blit'" @click="es.tool = 'select'">取消定位</button>
          </div>
          <div class="hintline">用「粘贴定位」工具在画面上移动，会显示落点包围盒；压到已有体素时框变红并提示格数。</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  editorState as es,
  copySelection,
  cutSelection,
  deleteSelection,
  pasteClipboard,
  updateClipboardPreview,
} from '../store/editorStore.js'
import { collectVoxels } from '../voxel/geometry.js'

const selSize = computed(() => {
  if (!es.selection) return ''
  const b = es.selection
  return `${b.max[0] - b.min[0] + 1} × ${b.max[1] - b.min[1] + 1} × ${b.max[2] - b.min[2] + 1}`
})
const selCount = computed(() => (es.selection ? collectVoxels(es.model, es.selection).length : 0))

const tx = ref(0)
const ty = ref(0)
const tz = ref(0)

watch(
  () => es.clipboardTarget.join(),
  (v) => {
    const [a, b, c] = v.split(',').map(Number)
    tx.value = a
    ty.value = b
    tz.value = c
  },
  { immediate: true }
)

function applyCoords() {
  updateClipboardPreview([Number(tx.value) || 0, Number(ty.value) || 0, Number(tz.value) || 0])
  es.tool = 'blit'
}

const statusText = computed(() => {
  if (es.clipboardOutOfBounds) return '落点越界：会超出工作台范围'
  if (es.clipboardCollision > 0) return `落点冲突：将覆盖 ${es.clipboardCollision} 格已有体素`
  return '落点可用：范围内没有已有体素'
})
const statusTone = computed(() =>
  es.clipboardOutOfBounds || es.clipboardCollision > 0 ? 'warn' : 'ok'
)
</script>

<style scoped>
.sel-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 9px; }
.sel-info > div:last-child { grid-column: 1 / -1; }
.big { font-size: 13px; color: var(--text); margin-top: 2px; }
.sel-empty {
  font-size: 11px; color: var(--text-3); line-height: 1.6; background: #10161e; border: 1px dashed #2a3442;
  border-radius: 6px; padding: 9px 10px; margin-bottom: 9px;
}
.clip-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
.clip-actions .btn { font-size: 10.5px; padding: 5px 2px; flex-direction: column; gap: 2px; }
kbd {
  font-family: var(--mono); font-size: 8.5px; color: var(--text-3); border: 1px solid #2c3543;
  border-radius: 3px; padding: 0 3px; background: #0d1219;
}
.clip-box { margin-top: 10px; border-top: 1px solid var(--line); padding-top: 9px; }
.clip-hd { display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 8px; }
.clip-hd b { font-size: 11.5px; }
.clip-hd span:last-child { margin-left: auto; color: var(--text-3); font-size: 10px; }
.coord-row { display: grid; grid-template-columns: 1fr 46px 46px 46px auto; gap: 4px; align-items: center; margin-bottom: 7px; }
.coord-row .lbl { font-size: 10px; }
.inp.mini { padding: 4px 5px; font-size: 11px; text-align: center; }
.clip-status { font-size: 10.5px; padding: 5px 8px; border-radius: 5px; margin-bottom: 8px; line-height: 1.5; }
.clip-status.ok { background: #10241a; color: #8fd7ad; border: 1px solid #26523a; }
.clip-status.warn { background: #241716; color: #efa79f; border: 1px solid #5b2b2b; }
</style>
