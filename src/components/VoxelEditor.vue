<template>
  <div class="main-row">
    <!-- 左栏：工具 -->
    <aside class="sidebar">
      <div class="section">
        <h3>编辑工具</h3>
        <div class="tool-grid">
          <button v-for="t in tools" :key="t.id" :class="{ active: state.tool === t.id }"
            @click="state.tool = t.id" :title="t.tip">{{ t.label }}</button>
        </div>
        <p class="small muted" style="margin:8px 0 0">{{ currentTip }}</p>
      </div>

      <div class="section">
        <h3>镜像对称</h3>
        <div class="mirror-row">
          <button :class="{ active: state.mirror === 'off' }" @click="setMirror('off')">关闭</button>
          <button :class="{ active: state.mirror === 'x' }" @click="setMirror('x')">X 轴</button>
          <button :class="{ active: state.mirror === 'y' }" @click="setMirror('y')">Y 轴</button>
          <button :class="{ active: state.mirror === 'both' }" @click="setMirror('both')">双轴</button>
        </div>
        <p class="small muted" style="margin:8px 0 0">
          镜像轴穿过 {{ state.model.size }}×{{ state.model.size }} 工作区中心，加/删/粘贴自动同步对称位
          <span v-if="taskMirrorLock" class="badge ok" style="margin-left:4px">任务要求:{{ mirrorLabel(state.mirror) }}</span>
        </p>
      </div>

      <div class="section">
        <h3>分层切片</h3>
        <div class="row" style="margin-bottom:8px">
          <button :class="{ active: state.layerMode }" @click="toggleLayerMode">
            {{ state.layerMode ? '退出切片' : '进入切片' }}
          </button>
          <button @click="soloLayerView = !soloLayerView" :class="{ active: soloLayerView }">平面视图</button>
        </div>
        <div class="layer-row">
          <button @click="changeLayer(-1)">−</button>
          <input type="range" min="0" :max="state.model.size - 1" v-model.number="state.activeLayer" />
          <button @click="changeLayer(1)">＋</button>
        </div>
        <p class="small muted" style="margin:6px 0 0">当前第 {{ state.activeLayer + 1 }} 层 (z={{ state.activeLayer }})，切片外体素半透明且不可编辑</p>
      </div>

      <div class="section">
        <h3>剪贴板与减面</h3>
        <div class="stack">
          <div class="row">
            <button @click="copySelection" :disabled="!state.selection.size">复制选区</button>
            <button class="primary" @click="openPaste" :disabled="!clipboard">粘贴平移</button>
          </div>
          <div class="row">
            <button @click="deleteSelection" :disabled="!state.selection.size">删除选区</button>
            <button @click="clearAll">清空作品</button>
          </div>
          <button @click="runMerge">同色合并减面（贪心网格）</button>
          <div v-if="mergeInfo" class="small muted">
            原始暴露面 {{ mergeInfo.raw }} → 合并后 {{ mergeInfo.merged }}，
            大长方体 {{ mergeInfo.boxes }} 个（{{ mergeInfo.ratio }}% 面数削减）
          </div>
        </div>
      </div>

      <div class="section">
        <h3>历史</h3>
        <div class="row">
          <button @click="undo" :disabled="!undoStack.length">↶ 撤销</button>
          <button @click="redo" :disabled="!redoStack.length">↷ 重做</button>
        </div>
      </div>
    </aside>

    <!-- 中央舞台 -->
    <main class="stage">
      <VoxelViewport ref="viewportRef" :state="state" :readonly="false"
        @change="onEditEnd" @toast="toast" @select="onSelect" v-show="!soloLayerView" />
      <LayerView v-show="soloLayerView" :state="state" @change="onEditEnd" @toast="toast" />
      <div class="hint-bar">
        <span>左键拖动空白：旋转视角</span>
        <span>滚轮：缩放</span>
        <span>{{ state.tool === 'add' ? '点击/拖过体素面：加体（含镜像位）' :
          state.tool === 'erase' ? '点击/拖过体素：删体（含镜像位）' :
          state.tool === 'marquee' ? '按住拖出矩形：框选体素' :
          state.tool === 'select' ? '点选体素（Shift 多选，可点前后不同层）' : '按住拖动：整体绕竖直轴旋转' }}</span>
        <span v-if="state.layerMode">切片模式：仅 z={{ state.activeLayer }} 层可编辑</span>
      </div>
    </main>

    <!-- 右栏：颜色与数据 -->
    <aside class="sidebar right">
      <div class="section">
        <h3>积木配色</h3>
        <div class="palette-grid">
          <button v-for="(c, i) in palette" :key="i" class="swatch"
            :class="{ active: state.color === i }" :style="{ background: c.hex }"
            @click="state.color = i" :title="c.name"></button>
        </div>
        <div class="color-name">当前：{{ palette[state.color].name }}（{{ state.color }}）</div>
      </div>

      <div class="section">
        <h3>实时统计</h3>
        <div class="stat-grid">
          <div class="stat"><div class="v">{{ stats.count }}</div><div class="k">体素总数</div></div>
          <div class="stat"><div class="v">{{ stats.colors }}</div><div class="k">使用颜色</div></div>
          <div class="stat"><div class="v">{{ stats.symX }}%</div><div class="k">X 对称度</div></div>
          <div class="stat"><div class="v">{{ stats.symY }}%</div><div class="k">Y 对称度</div></div>
        </div>
        <div v-if="task" class="small" style="margin-top:8px">
          <div class="row" style="align-items:center">
            <span class="muted">任务上限 {{ task.maxVoxels }}</span>
            <span :class="['badge', stats.count > task.maxVoxels ? 'over' : 'ok']">
              {{ stats.count > task.maxVoxels ? `超出 ${stats.count - task.maxVoxels}` : `余量 ${task.maxVoxels - stats.count}` }}
            </span>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>选区（{{ state.selection.size }}）</h3>
        <div v-if="selInfo" class="kv small">
          <span class="k">包围盒</span><span>{{ selInfo.w }}×{{ selInfo.h }}×{{ selInfo.d }}</span>
          <span class="k">体素数</span><span>{{ selInfo.count }}</span>
        </div>
        <p v-else class="small muted">用点选或框选挑选体素后可复制/删除</p>
      </div>

      <div class="section">
        <h3>导出</h3>
        <div class="stack">
          <button @click="exportObjFile">导出 OBJ 模型（含 MTL 材质）</button>
          <button @click="exportListFile">导出逐层拼搭清单 (.txt)</button>
          <button @click="showList = true">查看逐层清单</button>
        </div>
      </div>

      <div class="section" v-if="canSubmit">
        <button class="primary" style="width:100%" @click="$emit('submit', state.model)">提交给老师评审</button>
        <p class="small muted" style="margin:6px 0 0">提交时自动计算体素总数与对称度，生成机器初评</p>
      </div>
    </aside>

    <!-- 粘贴平移弹窗 -->
    <div v-if="pasteOpen" class="modal-mask" @click.self="pasteOpen = false">
      <div class="modal">
        <h3>粘贴平移</h3>
        <p class="muted small">剪贴板含 {{ clipboard?.keys.length }} 个体素。调整偏移量，预览确认后粘贴；镜像开启时会同步对称位。</p>
        <div class="split">
          <div class="section">
            <label>X 偏移 dx（{{ pasteOffset.x }}）</label>
            <input type="range" min="-15" max="15" v-model.number="pasteOffset.x" />
            <label>Y 偏移 dy（{{ pasteOffset.y }}）</label>
            <input type="range" min="-15" max="15" v-model.number="pasteOffset.y" />
            <label>Z 偏移 dz（{{ pasteOffset.z }}）</label>
            <input type="range" min="-15" max="15" v-model.number="pasteOffset.z" />
            <div class="row" style="margin-top:10px">
              <button @click="pasteOffset = { x: 0, y: 0, z: 1 }">贴到上一层</button>
              <button @click="nudge(1, 0, 0)">X+1</button>
              <button @click="nudge(0, 1, 0)">Y+1</button>
            </div>
          </div>
          <div class="section">
            <div class="kv small">
              <span class="k">可粘贴</span><span>{{ pastePreview.placed }} 块</span>
              <span class="k">越界/冲突</span><span>{{ pastePreview.blocked }} 块</span>
              <span class="k">镜像扇出</span><span>{{ pastePreview.fanout }} 块</span>
            </div>
            <button class="primary" style="width:100%;margin-top:12px" @click="confirmPaste">确认粘贴</button>
            <button style="width:100%;margin-top:8px" @click="pasteOpen = false">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 拼搭清单弹窗 -->
    <div v-if="showList" class="modal-mask" @click.self="showList = false">
      <div class="modal" style="width:min(720px,92vw)">
        <h3>逐层拼搭清单</h3>
        <table>
          <thead><tr><th>层</th><th>砖块数</th><th>颜色明细</th></tr></thead>
          <tbody>
            <tr v-for="r in buildList(state.model).rows" :key="r.z">
              <td>第 {{ r.z + 1 }} 层</td>
              <td><b>{{ r.total }}</b></td>
              <td>
                <span v-for="c in r.colors" :key="c.color" class="list-chip">
                  <i :style="{ background: c.hex }"></i>{{ c.name }} ×{{ c.count }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <h4 style="margin:14px 0 6px">全模型用色汇总（共 {{ buildList(state.model).totalVoxels }} 块）</h4>
        <div>
          <span v-for="c in buildList(state.model).summary" :key="c.color" class="list-chip">
            <i :style="{ background: c.hex }"></i>{{ c.name }} 共 {{ c.count }}
          </span>
        </div>
        <div class="row" style="margin-top:14px">
          <button class="primary" @click="exportListFile(); showList = false">导出 .txt</button>
          <button @click="showList = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, shallowRef } from 'vue'
import VoxelViewport from './VoxelViewport.vue'
import LayerView from './LayerView.vue'
import { PALETTE } from '../lib/palette.js'
import {
  createModel, cloneModel, keyOf, parseKey, fanOut,
  symmetryScore, serialize, deserialize
} from '../lib/voxel.js'
import { greedyMesh, mergeCuboids, rawExposedFaces } from '../lib/merge.js'
import { exportObj, downloadText } from '../lib/obj.js'
import { buildList, buildListText } from '../lib/buildlist.js'

const props = defineProps({
  task: { type: Object, default: null },
  initialModel: { type: Object, default: null }
})
defineEmits(['submit'])

const palette = PALETTE
const tools = [
  { id: 'select', label: '点选', tip: '点选体素，Shift 多选' },
  { id: 'add', label: '加体', tip: '点击面添加体素，可拖动笔刷连画' },
  { id: 'erase', label: '删体', tip: '点击/拖过删除体素' },
  { id: 'marquee', label: '框选', tip: '拖出矩形批量选中' },
  { id: 'rotate', label: '旋转', tip: '拖动整体绕竖直轴旋转' }
]

const state = reactive({
  model: props.initialModel ? cloneModel(props.initialModel) : createModel(16),
  tool: 'add',
  color: 0,
  mirror: props.task?.mirror && props.task.mirror !== 'off' ? props.task.mirror : 'off',
  layerMode: false,
  soloLayerView: false,
  activeLayer: 0,
  selection: new Set(),
  hover: null,
  yaw: Math.PI / 6,
  tile: 26,
  version: 0,
  readonlyKey: 0,
  requestAdd: (x, y, z, color) => {
    if (props.task?.maxVoxels && state.model.voxels.size >= props.task.maxVoxels) {
      toast(`已达任务体素上限 ${props.task.maxVoxels}，无法继续添加`)
      return false
    }
    state.model.voxels.set(keyOf(x, y, z), color)
    return true
  },
  bump: () => { state.version++ }
})
const viewportRef = ref(null)
const undoStack = []
const redoStack = []
const clipboard = shallowRef(null)
const pasteOpen = ref(false)
const pasteOffset = reactive({ x: 0, y: 0, z: 1 })
const showList = ref(false)
const mergeInfo = ref(null)
const toastMsg = ref('')
let toastTimer = 0
const soloLayerView = computed({
  get: () => state.soloLayerView,
  set: v => { state.soloLayerView = v }
})

const taskMirrorLock = computed(() => !!props.task && props.task.mirror !== 'off')
const canSubmit = computed(() => !!props.task)
const currentTip = computed(() => tools.find(t => t.id === state.tool)?.tip || '')

function toast (msg) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2200)
}

function mirrorLabel (m) {
  return { off: '无', x: 'X 轴', y: 'Y 轴', both: 'X/Y 双轴' }[m] || m
}

// ---------- 历史 ----------
function snapshot () {
  undoStack.push(serialize(state.model))
  if (undoStack.length > 40) undoStack.shift()
  redoStack.length = 0
}
function onEditEnd () {
  snapshot()
  state.version++
}
function undo () {
  if (!undoStack.length) return
  redoStack.push(serialize(state.model))
  state.model.voxels = new Map(deserialize(undoStack.pop()).voxels)
  state.selection.clear()
  state.bump()
}
function redo () {
  if (!redoStack.length) return
  undoStack.push(serialize(state.model))
  state.model.voxels = new Map(deserialize(redoStack.pop()).voxels)
  state.selection.clear()
  state.bump()
}

// ---------- 工具/层/镜像 ----------
function setMirror (m) {
  if (taskMirrorLock.value && m !== props.task.mirror) {
    toast(`本任务强制要求 ${mirrorLabel(props.task.mirror)} 对称，不可关闭`)
    return
  }
  state.mirror = m
  state.bump()
}
function toggleLayerMode () {
  state.layerMode = !state.layerMode
  if (!state.layerMode) state.soloLayerView = false
  state.bump()
}
function changeLayer (d) {
  state.activeLayer = Math.max(0, Math.min(state.model.size - 1, state.activeLayer + d))
}

// ---------- 统计 ----------
const stats = computed(() => ({
  count: state.model.voxels.size,
  colors: new Set(state.model.voxels.values()).size,
  symX: Math.round(symmetryScore(state.model, ['x']) * 100),
  symY: Math.round(symmetryScore(state.model, ['y']) * 100)
}))
const selInfo = computed(() => {
  if (!state.selection.size) return null
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const k of state.selection) {
    const p = parseKey(k)
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); minZ = Math.min(minZ, p.z)
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); maxZ = Math.max(maxZ, p.z)
  }
  return { w: maxX - minX + 1, h: maxY - minY + 1, d: maxZ - minZ + 1, count: state.selection.size, minX, minY, minZ }
})

function onSelect () { state.bump() }

// ---------- 复制 / 粘贴 ----------
function copySelection () {
  if (!state.selection.size) return
  const keys = [...state.selection]
  const box = selInfo.value
  const voxels = keys.map(k => {
    const p = parseKey(k)
    return { dx: p.x - box.minX, dy: p.y - box.minY, dz: p.z - box.minZ, color: state.model.voxels.get(k) }
  })
  clipboard.value = { base: { x: box.minX, y: box.minY, z: box.minZ }, keys, voxels }
  toast(`已复制 ${keys.length} 个体素`)
}

const pastePreview = computed(() => {
  if (!clipboard.value || !pasteOpen.value) return { placed: 0, blocked: 0, fanout: 0 }
  let placed = 0, blocked = 0, fanout = 0
  const targets = new Set()
  for (const v of clipboard.value.voxels) {
    const x = clipboard.value.base.x + v.dx + pasteOffset.x
    const y = clipboard.value.base.y + v.dy + pasteOffset.y
    const z = clipboard.value.base.z + v.dz + pasteOffset.z
    const pts = fanOut(state.model, x, y, z, state.mirror)
    for (const [fx, fy, fz] of pts) {
      const k = keyOf(fx, fy, fz)
      if (targets.has(k)) continue
      targets.add(k)
      const out = fx < 0 || fy < 0 || fz < 0 || fx >= state.model.size || fy >= state.model.size || fz >= state.model.size
      if (out || state.model.voxels.has(k)) blocked++
      else placed++
    }
  }
  return { placed, blocked, fanout: targets.size }
})

function openPaste () {
  if (!clipboard.value) return
  pasteOffset.x = 0; pasteOffset.y = 0; pasteOffset.z = 1
  pasteOpen.value = true
}
function nudge (x, y, z) {
  pasteOffset.x += x; pasteOffset.y += y; pasteOffset.z += z
}
function confirmPaste () {
  snapshot()
  for (const v of clipboard.value.voxels) {
    const x = clipboard.value.base.x + v.dx + pasteOffset.x
    const y = clipboard.value.base.y + v.dy + pasteOffset.y
    const z = clipboard.value.base.z + v.dz + pasteOffset.z
    const pts = fanOut(state.model, x, y, z, state.mirror)
    for (const [fx, fy, fz] of pts) {
      if (fx < 0 || fy < 0 || fz < 0 || fx >= state.model.size || fy >= state.model.size || fz >= state.model.size) continue
      if (!state.model.voxels.has(keyOf(fx, fy, fz))) state.model.voxels.set(keyOf(fx, fy, fz), v.color)
    }
  }
  pasteOpen.value = false
  state.selection.clear()
  state.bump()
  toast('粘贴完成')
}

function deleteSelection () {
  if (!state.selection.size) return
  snapshot()
  for (const k of state.selection) state.model.voxels.delete(k)
  state.selection.clear()
  state.bump()
  toast('选区已删除')
}
function clearAll () {
  if (!state.model.voxels.size) return
  if (!window.confirm('确定清空整个作品？')) return
  snapshot()
  state.model.voxels.clear()
  state.selection.clear()
  state.bump()
}

// ---------- 减面 ----------
function runMerge () {
  const raw = rawExposedFaces(state.model)
  const mesh = greedyMesh(state.model)
  const boxes = mergeCuboids(state.model)
  const ratio = raw ? Math.round((1 - mesh.mergedFaces / raw) * 100) : 0
  mergeInfo.value = { raw, merged: mesh.mergedFaces, boxes: boxes.length, ratio, mesh, boxes }
  toast(`减面完成：${raw} 面 → ${mesh.mergedFaces} 面，合并为 ${boxes.length} 个同色长方体`)
}

// ---------- 导出 ----------
function exportObjFile () {
  if (!state.model.voxels.size) return toast('作品为空，无法导出')
  const mesh = greedyMesh(state.model)
  const { obj, mtl, objName, mtlName } = exportObj(state.model, mesh, 'voxel-work')
  downloadText(objName, obj, 'text/plain;charset=utf-8')
  setTimeout(() => downloadText(mtlName, mtl, 'text/plain;charset=utf-8'), 120)
  toast('已导出 OBJ + MTL')
}
function exportListFile () {
  if (!state.model.voxels.size) return toast('作品为空，无法导出')
  downloadText('build-list.txt', buildListText(state.model, '拼搭清单'))
  toast('拼搭清单已导出')
}

// ---------- 快捷键 ----------
function onKey (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo() }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') copySelection()
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') openPaste()
  else if (e.key === 'Delete') deleteSelection()
  else if (e.key === '1') state.tool = 'select'
  else if (e.key === '2') state.tool = 'add'
  else if (e.key === '3') state.tool = 'erase'
  else if (e.key === '4') state.tool = 'marquee'
  else if (e.key === '5') state.tool = 'rotate'
}
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
