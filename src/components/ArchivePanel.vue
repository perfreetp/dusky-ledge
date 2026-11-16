<template>
  <div class="archive">
    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="{ on: tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <!-- 石块建档 -->
    <div v-show="tab === 'stones'" class="pane">
      <h3>石块建档</h3>
      <div class="form">
        <label>编号<input v-model.trim="form.code" placeholder="如 TH-2026-001" /></label>
        <label>产地<input v-model.trim="form.origin" placeholder="如 苏州西山" /></label>
        <div class="dims">
          <label>长(cm)<input type="number" v-model.number="form.L" min="0" /></label>
          <label>宽(cm)<input type="number" v-model.number="form.W" min="0" /></label>
          <label>高(cm)<input type="number" v-model.number="form.H" min="0" /></label>
        </div>
        <label>备注<input v-model.trim="form.note" placeholder="可空" /></label>
        <button class="btn primary" @click="createStone">建档入库</button>
      </div>
      <h3>石块列表({{ store.stones.length }})</h3>
      <div class="stone-list">
        <div
          v-for="s in store.stones"
          :key="s.id"
          class="stone"
          :class="{ on: store.currentStoneId === s.id }"
          @click="selectStone(s.id)"
        >
          <div class="stone-head">
            <b>{{ s.code }}</b>
            <span class="muted">{{ s.origin }}</span>
          </div>
          <div class="muted sm">{{ s.L }}×{{ s.W }}×{{ s.H }} cm</div>
          <div class="stone-ops">
            <button class="btn sm" @click.stop="modelFromStone(s)">按尺寸建模型</button>
            <button class="btn sm warn" @click.stop="removeStone(s)">删除</button>
          </div>
        </div>
        <p v-if="!store.stones.length" class="hint">暂无档案,先建档</p>
      </div>
    </div>

    <!-- 版本 -->
    <div v-show="tab === 'versions'" class="pane">
      <template v-if="currentStone">
        <h3>{{ currentStone.code }} · 加工版本</h3>
        <div class="form">
          <label>本次加工说明<input v-model.trim="verNote" placeholder="如:顶部瘦身,开洞" /></label>
          <button class="btn primary" @click="saveVersion">保存当前模型为新版本</button>
        </div>
        <div
          v-for="v in store.versions"
          :key="v.id"
          class="version"
        >
          <div class="stone-head">
            <b>V{{ v.n }}</b>
            <select :value="v.status" @change="setStatus(v, $event.target.value)">
              <option v-for="st in VERSION_STATUS" :key="st" :value="st">{{ st }}</option>
            </select>
          </div>
          <div class="muted sm">{{ fmtTime(v.createdAt) }} · {{ v.note || '—' }}</div>
          <div class="muted sm">
            {{ v.nx }}×{{ v.ny }}×{{ v.nz }} @{{ v.cell * 100 }}cm ·
            {{ v.voxels.toLocaleString() }} 体素 · {{ v.volume.toFixed(3) }}m³ ·
            {{ v.facesRaw.toLocaleString() }}/{{ v.facesDec.toLocaleString() }} 面
          </div>
          <div class="stone-ops">
            <button class="btn sm" @click="loadVersion(v)">载入编辑</button>
            <button class="btn sm" @click="store.recordVersion = v">加工记录单</button>
            <button class="btn sm warn" @click="removeVersion(v)">删除</button>
          </div>
        </div>
        <p v-if="!store.versions.length" class="hint">还没有版本,加工后点上方保存</p>
      </template>
      <p v-else class="hint">先在“建档”页选中一块石头</p>
    </div>

    <!-- 版本比对 -->
    <div v-show="tab === 'compare'" class="pane">
      <h3>版本比对</h3>
      <template v-if="currentStone && store.versions.length >= 2">
        <div class="row">
          <label>A</label>
          <select v-model.number="cmpA">
            <option v-for="v in store.versions" :key="v.id" :value="v.id">V{{ v.n }} · {{ fmtTime(v.createdAt) }}</option>
          </select>
          <label>B</label>
          <select v-model.number="cmpB">
            <option v-for="v in store.versions" :key="v.id" :value="v.id">V{{ v.n }} · {{ fmtTime(v.createdAt) }}</option>
          </select>
        </div>
        <table v-if="cmpResult" class="cmp">
          <thead>
            <tr><th></th><th>V{{ cmpResult.a.n }}</th><th>V{{ cmpResult.b.n }}</th><th>差异(B−A)</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in cmpResult.rows" :key="r.label">
              <td>{{ r.label }}</td>
              <td>{{ r.a }}</td>
              <td>{{ r.b }}</td>
              <td :class="r.cls">{{ r.d }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <p v-else class="hint">需要当前石块至少有两个版本</p>
    </div>

    <!-- 检索 -->
    <div v-show="tab === 'search'" class="pane">
      <h3>档案检索</h3>
      <div class="form">
        <label>产地<input v-model.trim="q.origin" placeholder="模糊匹配,可空" /></label>
        <div class="dims">
          <label>长≥<input type="number" v-model.number="q.Lmin" /></label>
          <label>宽≥<input type="number" v-model.number="q.Wmin" /></label>
          <label>高≥<input type="number" v-model.number="q.Hmin" /></label>
        </div>
        <div class="dims">
          <label>长≤<input type="number" v-model.number="q.Lmax" /></label>
          <label>宽≤<input type="number" v-model.number="q.Wmax" /></label>
          <label>高≤<input type="number" v-model.number="q.Hmax" /></label>
        </div>
        <div class="row">
          <label>版本状态</label>
          <label v-for="st in VERSION_STATUS" :key="st" class="chk">
            <input type="checkbox" :value="st" v-model="q.status" />{{ st }}
          </label>
        </div>
      </div>
      <div class="stone-list">
        <div v-for="r in searchResults" :key="r.stone.id" class="stone" @click="selectStone(r.stone.id); tab = 'versions'">
          <div class="stone-head">
            <b>{{ r.stone.code }}</b>
            <span class="muted">{{ r.stone.origin }}</span>
          </div>
          <div class="muted sm">
            {{ r.stone.L }}×{{ r.stone.W }}×{{ r.stone.H }} cm ·
            {{ r.versions.length }} 个版本
            <template v-if="r.versions.length">
              · 最新 V{{ r.versions[r.versions.length - 1].n }}({{ r.versions[r.versions.length - 1].status }})
            </template>
          </div>
        </div>
        <p v-if="!searchResults.length" class="hint">无匹配档案</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { store, VERSION_STATUS, replaceModel, notify } from '../store'
import { VoxelModel } from '../core/voxel'
import { meshGreedy, decimateMesh } from '../core/mesher'
import { materialColorRGB } from '../store'
import * as db from '../core/db'

const tabs = [
  { key: 'stones', label: '建档' },
  { key: 'versions', label: '版本' },
  { key: 'compare', label: '比对' },
  { key: 'search', label: '检索' }
]
const tab = ref('stones')

const form = reactive({ code: '', origin: '', L: 100, W: 80, H: 120, note: '' })
const verNote = ref('')
const cmpA = ref(0)
const cmpB = ref(0)
const q = reactive({ origin: '', Lmin: null, Lmax: null, Wmin: null, Wmax: null, Hmin: null, Hmax: null, status: [] })
const allVersions = ref([])

const currentStone = computed(() => store.stones.find((s) => s.id === store.currentStoneId))

async function refresh() {
  store.stones = (await db.listStones()).sort((a, b) => b.createdAt - a.createdAt)
  allVersions.value = await db.listAllVersions()
  if (store.currentStoneId) {
    store.versions = await db.listVersions(store.currentStoneId)
  }
}
refresh()

// 版本列表变化时,比对默认选最近两个版本
watch(
  () => store.versions,
  (vers) => {
    if (vers.length >= 2) {
      cmpA.value = vers[vers.length - 2].id
      cmpB.value = vers[vers.length - 1].id
    }
  }
)

async function createStone() {
  if (!form.code) {
    notify('请填写编号')
    return
  }
  if (store.stones.some((s) => s.code === form.code)) {
    notify('编号已存在')
    return
  }
  const stone = {
    code: form.code,
    origin: form.origin || '未知',
    L: form.L || 0,
    W: form.W || 0,
    H: form.H || 0,
    note: form.note,
    createdAt: Date.now()
  }
  const id = await db.addStone(stone)
  await refresh()
  store.currentStoneId = id
  notify(`已建档 ${form.code}`)
}

async function selectStone(id) {
  store.currentStoneId = id
  store.versions = await db.listVersions(id)
}

async function removeStone(s) {
  if (!confirm(`删除石块 ${s.code} 及其全部版本?`)) return
  await db.deleteStone(s.id)
  if (store.currentStoneId === s.id) {
    store.currentStoneId = null
    store.versions = []
  }
  await refresh()
}

function modelFromStone(s) {
  const cell = store.model.cell
  const nx = Math.max(1, Math.round(s.L / 100 / cell))
  const ny = Math.max(1, Math.round(s.H / 100 / cell))
  const nz = Math.max(1, Math.round(s.W / 100 / cell))
  if (nx * ny * nz > 8_000_000) {
    notify('按当前体素尺寸模型过大,请先切到更大的体素')
    return
  }
  replaceModel(new VoxelModel(nx, ny, nz, cell))
  store.currentStoneId = s.id
  notify(`已按 ${s.code} 尺寸新建 ${nx}×${ny}×${nz} 模型`)
}

async function saveVersion() {
  if (!currentStone.value) return
  const m = store.model
  const raw = meshGreedy(m, materialColorRGB)
  const dec = decimateMesh(raw, m.cell, store.decimation)
  const ser = m.serialize()
  const ver = {
    stoneId: currentStone.value.id,
    n: store.versions.length + 1,
    status: '加工中',
    note: verNote.value,
    createdAt: Date.now(),
    cell: m.cell,
    nx: m.nx,
    ny: m.ny,
    nz: m.nz,
    data: ser.data,
    voxels: m.count(),
    volume: m.volume(),
    facesRaw: raw.faceCount,
    facesDec: dec.faceCount
  }
  await db.addVersion(ver)
  verNote.value = ''
  await refresh()
  notify(`已保存 V${ver.n}`)
}

async function loadVersion(v) {
  replaceModel(VoxelModel.deserialize(v))
  notify(`已载入 V${v.n}`)
}

async function setStatus(v, status) {
  await db.updateVersion({ ...v, status })
  await refresh()
}

async function removeVersion(v) {
  if (!confirm(`删除 V${v.n}?`)) return
  await db.deleteVersion(v.id)
  await refresh()
}

function fmtTime(t) {
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

const cmpResult = computed(() => {
  const a = store.versions.find((v) => v.id === cmpA.value)
  const b = store.versions.find((v) => v.id === cmpB.value)
  if (!a || !b || a === b) return null
  const row = (label, va, vb, fmt, unit = '') => {
    const d = vb - va
    return {
      label,
      a: fmt(va) + unit,
      b: fmt(vb) + unit,
      d: (d > 0 ? '+' : '') + fmt(d) + unit,
      cls: d > 0 ? 'up' : d < 0 ? 'down' : ''
    }
  }
  const i = (x) => Math.round(x).toLocaleString()
  const f = (x) => x.toFixed(3)
  return {
    a, b,
    rows: [
      row('体素数', a.voxels, b.voxels, i),
      row('体积', a.volume, b.volume, f, ' m³'),
      row('合并后面数', a.facesRaw, b.facesRaw, i),
      row('减面后面数', a.facesDec, b.facesDec, i)
    ]
  }
})

const searchResults = computed(() => {
  const inRange = (v, lo, hi) => (lo == null || lo === '' || v >= lo) && (hi == null || hi === '' || v <= hi)
  return store.stones
    .filter((s) => {
      if (q.origin && !s.origin.includes(q.origin)) return false
      if (!inRange(s.L, q.Lmin, q.Lmax)) return false
      if (!inRange(s.W, q.Wmin, q.Wmax)) return false
      if (!inRange(s.H, q.Hmin, q.Hmax)) return false
      if (q.status.length) {
        const vers = allVersions.value.filter((v) => v.stoneId === s.id)
        if (!vers.some((v) => q.status.includes(v.status))) return false
      }
      return true
    })
    .map((s) => ({
      stone: s,
      versions: allVersions.value
        .filter((v) => v.stoneId === s.id)
        .sort((a, b) => a.createdAt - b.createdAt)
    }))
})

defineExpose({ refresh })
</script>

<style scoped>
.archive {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.tabs {
  display: flex;
  border-bottom: 1px solid #2a303c;
}
.tabs button {
  flex: 1;
  background: none;
  border: none;
  color: #8fa3c0;
  padding: 9px 0;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 2px solid transparent;
}
.tabs button.on {
  color: #fff;
  border-bottom-color: #4da3ff;
}
.pane {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  min-height: 0;
}
h3 {
  font-size: 13px;
  color: #8fa3c0;
  margin: 8px 0;
}
.form label {
  display: block;
  font-size: 12px;
  color: #9fb0c8;
  margin-bottom: 6px;
}
.form input,
.form select,
.pane select {
  width: 100%;
  box-sizing: border-box;
  background: #141821;
  border: 1px solid #333c4e;
  color: #dce6f5;
  border-radius: 5px;
  padding: 5px 8px;
  margin-top: 3px;
  font-size: 12px;
}
.dims {
  display: flex;
  gap: 6px;
}
.dims label {
  flex: 1;
}
.stone-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stone,
.version {
  background: #1c212c;
  border: 1px solid #2c3444;
  border-radius: 7px;
  padding: 8px 10px;
  cursor: pointer;
  margin-bottom: 6px;
}
.version {
  cursor: default;
}
.stone.on {
  border-color: #4da3ff;
}
.stone-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.stone-head select {
  width: auto;
  padding: 2px 4px;
}
.muted {
  color: #6b7789;
}
.sm {
  font-size: 11px;
}
.stone-ops {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.hint {
  font-size: 12px;
  color: #6b7789;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #9fb0c8;
  flex-wrap: wrap;
}
.chk {
  display: flex;
  align-items: center;
  gap: 4px;
}
table.cmp {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: #c6d2e4;
}
table.cmp th,
table.cmp td {
  border: 1px solid #2c3444;
  padding: 5px 7px;
  text-align: right;
}
table.cmp th:first-child,
table.cmp td:first-child {
  text-align: left;
}
.up {
  color: #7fd48a;
}
.down {
  color: #ff8a8a;
}
</style>
