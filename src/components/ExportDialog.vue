<template>
  <div class="overlay-mask" @click.self="$emit('close')">
    <div class="dialog wide">
      <div class="dlg-hd">
        <h3>导出前核对</h3>
        <span class="sub">合并体素 → 只留外观面 → 生成 glb</span>
        <button class="x" @click="$emit('close')">×</button>
      </div>

      <div class="dlg-bd">
        <div class="stat-grid">
          <div class="stat">
            <div class="k">体素数</div>
            <div class="v">{{ report.voxels.toLocaleString() }}<span class="u">格</span></div>
          </div>
          <div class="stat">
            <div class="k">逐格外表面（未合并）</div>
            <div class="v">{{ report.rawFaceCount.toLocaleString() }}<span class="u">面</span></div>
          </div>
          <div class="stat" :class="overLimit ? 'alert' : 'ok'">
            <div class="k">合并后三角面</div>
            <div class="v">{{ report.mergedTri.toLocaleString() }}<span class="u">tri</span></div>
          </div>
        </div>

        <div class="merge-note">
          <span class="dot ok" style="margin-top:4px"></span>
          <span>
            剔除相邻内部面后剩 <b class="mono">{{ report.rawFaceCount.toLocaleString() }}</b> 个四边形面，再对同色共面格做贪心合并，
            压到 <b class="mono">{{ report.quadCount.toLocaleString() }}</b> 个四边形 = <b class="mono">{{ report.mergedTri.toLocaleString() }}</b> 三角面，
            <template v-if="reduction > 0">比合并前少 <b class="mono">{{ reduction }}%</b> 的面。</template>
            <template v-else>当前每格材质都不同，共面合并没有收益，可以统一同组材质来减面。</template>
          </span>
        </div>

        <div class="section-title">各组面数占比 <span class="n">按导出分组</span></div>
        <div class="bars">
          <div class="bar-row" v-for="g in GROUPS" :key="g.id">
            <span class="gl" :class="{ off: !exportGroups[g.id] }" @click="toggleGroup(g.id)">
              <span class="sw" :style="{ background: g.color }"></span>{{ g.name }}
            </span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{ width: pct(g.id) + '%', background: g.color }"
              ></div>
            </div>
            <span class="num">{{ report.triByGroup[g.id].toLocaleString() }} · {{ pct(g.id).toFixed(1) }}%</span>
          </div>
        </div>
        <div class="hintline" style="margin-top:6px">点组名可取消/恢复导出该组，面数与占比会实时重算。</div>

        <div class="block-note" v-if="overLimit">
          <span class="dot blocked" style="margin-top:4px"></span>
          <span>
            合并后 <b class="mono">{{ report.mergedTri.toLocaleString() }}</b> 面，超过 <b class="mono">20,000</b> 面的上限。
            请先减面：降低切片内侧的细节格、隐藏不参与教学的部分、或放大体素尺寸后再导出。
          </span>
        </div>
        <div class="block-note warn-note" v-if="!overLimit && ratioHigh">
          <span class="dot warn" style="margin-top:4px"></span>
          <span>已接近 20,000 面上限（{{ (report.mergedTri / 200).toFixed(0) }}%），建议顺手清理一下遮挡在内部的面。</span>
        </div>

        <div class="divider"></div>
        <div class="field-row">
          <div class="field">
            <label>文件名</label>
            <input class="inp mono" v-model="filename" />
          </div>
          <div class="field">
            <label>导出范围</label>
            <div class="range-hint">
              {{ sliceNote }}
            </div>
          </div>
        </div>
      </div>

      <div class="dlg-ft">
        <button class="btn ghost" @click="$emit('close')">取消</button>
        <button class="btn" @click="recompute">重新统计</button>
        <button class="btn primary" :disabled="overLimit || report.mergedTri === 0" @click="doExport">
          {{ overLimit ? '面数超限，先减面' : '导出 .glb' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { GROUPS } from '../store/materials.js'
import { editorState as es, toast } from '../store/editorStore.js'
import { exportReport, downloadGLB } from '../export/glb.js'
import { clipFromSection, sectionActive } from '../voxel/geometry.js'

const emit = defineEmits(['close', 'exported'])

const MAX_TRIS = 20000
const report = ref({ voxels: 0, rawFaceCount: 0, mergedTri: 0, quadCount: 0, triByGroup: [0, 0, 0, 0] })
const exportGroups = ref([true, true, true, true])
const filename = ref(defaultName())

function defaultName() {
  const p = es.presetId || 'model'
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${p}-剖面教具-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function activeClip() {
  return es.sectionOn && sectionActive(es.section) ? clipFromSection(es.section) : null
}

function compute() {
  const groups = GROUPS.filter((g) => exportGroups.value[g.id]).map((g) => g.id)
  report.value = exportReport(es.model, { clip: activeClip(), groups })
}

onMounted(compute)

function recompute() {
  compute()
  toast('已重新统计', 'info')
}

function pct(id) {
  const total = report.value.triByGroup.reduce((a, b) => a + b, 0) || 1
  return (report.value.triByGroup[id] / total) * 100
}

function toggleGroup(id) {
  const next = [...exportGroups.value]
  next[id] = !next[id]
  if (!next.some(Boolean)) {
    toast('至少要保留一个分组', 'warn')
    return
  }
  exportGroups.value = next
  compute()
}

const overLimit = computed(() => report.value.mergedTri > MAX_TRIS)
const ratioHigh = computed(() => report.value.mergedTri > MAX_TRIS * 0.85)
const reduction = computed(() => {
  const raw = report.value.rawFaceCount
  if (!raw) return 0
  return Math.round((1 - report.value.quadCount / raw) * 100)
})
const sliceNote = computed(() => {
  if (!es.sectionOn || !sectionActive(es.section)) return '整体导出（含所有切片外部分）'
  const parts = []
  for (const k of ['x', 'y', 'z']) {
    const s = es.section[k]
    if (s) parts.push(`${k.toUpperCase()} ${s.dir === 'min' ? '≥' : '≤'} ${s.at + 1}`)
  }
  return '按当前切片导出：' + parts.join('，')
})

function doExport() {
  if (overLimit.value) return
  const groups = GROUPS.filter((g) => exportGroups.value[g.id]).map((g) => g.id)
  const res = downloadGLB(es.model, filename.value, { clip: activeClip(), groups })
  toast(`已导出 ${res.triTotal.toLocaleString()} 面 · ${(res.bytes / 1024).toFixed(0)} KB`, 'ok')
  emit('exported', res)
  emit('close')
}
</script>

<style scoped>
.gl {
  display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11.5px; user-select: none;
  transition: opacity .15s;
}
.gl.off { opacity: .3; text-decoration: line-through; }
.sw { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
.range-hint { font-size: 11px; color: var(--text-2); padding: 7px 0; line-height: 1.5; }
.warn-note { background: #221d10; border-color: #5d4a1f; color: #e8c68a; }
.dlg-hd h3 { white-space: nowrap; }
</style>
