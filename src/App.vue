<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark"><i></i><i></i><i></i><i></i></div>
        <div class="brand-text">
          <b>剖面工坊</b>
          <span>Section Workshop</span>
        </div>
      </div>

      <nav class="nav">
        <button :class="{ on: page === 'model' }" @click="go('model')">
          建模台
          <span class="badge">{{ es.stats.count.toLocaleString() }}</span>
        </button>
        <button :class="{ on: page === 'orders' }" @click="go('orders')">
          需求单
          <span v-if="summary.todo + summary.rework" class="badge hot">{{ summary.todo + summary.rework }}</span>
          <span v-else class="badge">{{ summary.total }}</span>
        </button>
        <button :class="{ on: page === 'board' }" @click="go('board')">看板</button>
      </nav>

      <div class="top-right">
        <span class="dev-tag mono" v-if="page === 'model' && es.presetId">
          {{ presetName }} · 单格 0.5 m
        </span>
        <div class="user-switch">
          <select v-model="workState.currentUser" @change="persist()">
            <option v-for="p in workState.people" :key="p.id" :value="p.id">
              {{ p.name }} · {{ p.role }}
            </option>
          </select>
          <span class="avatar">{{ me?.avatar }}</span>
        </div>
      </div>
    </header>

    <div class="workspace" :class="page === 'model' ? '' : 'board'">
      <!-- 左栏：只在建模台 -->
      <aside class="side" :class="{ hidden: page !== 'model' && page !== 'orders' && page !== 'board' }" v-if="page === 'model'">
        <PresetPanel />
        <ToolPanel />
        <GroupPanel />
      </aside>

      <main v-if="page === 'model'" class="stage">
        <Viewport />
        <div class="bottom-bar">
          <div class="bb-left">
            <button class="btn sm" @click="copySelection">复制</button>
            <button class="btn sm" @click="pasteClipboard" :disabled="!es.clipboard">粘贴</button>
            <span class="bb-sep"></span>
            <button class="btn sm" @click="es.tool = 'select'">框选</button>
            <button class="btn sm" @click="deleteSelection" :disabled="!es.selection">删除选区</button>
            <span class="bb-sep"></span>
            <button class="btn sm" @click="toggleMirror()" :class="{ primary: es.mirrorOn }">
              镜像{{ es.mirrorOn ? '开' : '关' }}
            </button>
            <select class="sel mini-sel" v-model="es.mirrorAxis" @change="setMirrorAxis(es.mirrorAxis)">
              <option value="x">X 轴</option>
              <option value="y">Y 轴</option>
              <option value="z">Z 轴</option>
            </select>
          </div>
          <div class="bb-right">
            <button class="btn sm ghost" @click="frameAll">适应视图</button>
            <span class="bb-sep"></span>
            <button class="btn sm primary" @click="showExport = true">导出 glb</button>
          </div>
        </div>
      </main>

      <OrdersPage v-if="page === 'orders'" />

      <BoardPage v-if="page === 'board'" />

      <!-- 右栏：建模台 -->
      <aside class="side right" v-if="page === 'model'">
        <MaterialPanel />
        <SlicePanel />
        <ClipboardPanel />
        <MyTasks
          @goto-orders="go('orders')"
          @goto-board="go('board')"
          @goto-workbench="go('model')"
          @submit="openSubmit"
          @load-preset="(id) => loadPreset(id)"
        />
        <div class="export-card">
          <div class="ec-hd">导出核算</div>
          <div class="ec-row"><span>体素</span><b class="mono">{{ es.stats.count.toLocaleString() }}</b></div>
          <div class="ec-row"><span>合并后面数</span><b class="mono">{{ currentTris.toLocaleString() }}</b></div>
          <div class="ec-note" :class="{ bad: currentTris > 20000 }">
            {{ currentTris > 20000 ? '已超 20,000 面，导出前需减面' : '在 20,000 面以内，可直接导出' }}
          </div>
          <button class="btn sm full primary" @click="showExport = true">打开导出核对</button>
        </div>
      </aside>
    </div>

    <ExportDialog v-if="showExport" @close="showExport = false" @exported="onExported" />

    <!-- 提交质检 -->
    <div v-if="submitTarget" class="overlay-mask" @click.self="submitTarget = null">
      <div class="dialog">
        <div class="dlg-hd">
          <h3>提交质检</h3>
          <span class="sub">{{ submitTarget.id }} {{ submitTarget.title }}</span>
          <button class="x" @click="submitTarget = null">×</button>
        </div>
        <div class="dlg-bd">
          <div class="submit-sum">
            <div><span class="lbl">体素</span><b class="mono">{{ es.stats.count.toLocaleString() }}</b></div>
            <div><span class="lbl">合并后面数</span><b class="mono">{{ currentTris.toLocaleString() }}</b></div>
            <div><span class="lbl">设备型号</span><b class="mono">{{ submitTarget.deviceModel }}</b></div>
          </div>
          <div class="lbl">交付前自检</div>
          <label class="chk"><input type="checkbox" v-model="submitCheck.allExposed" /> 需求单里要露出的部件都已做出来</label>
          <label class="chk"><input type="checkbox" v-model="submitCheck.sliced" /> 切片剖切方向正确，内部结构不被外壳挡住</label>
          <label class="chk"><input type="checkbox" v-model="submitCheck.under20k" /> 合并后面数在 20,000 以内</label>
          <div class="hintline">提交后状态变为「待质检」，质检抽查不合格会打回返工并计入返工次数。</div>
        </div>
        <div class="dlg-ft">
          <button class="btn ghost" @click="submitTarget = null">再改改</button>
          <button class="btn primary" :disabled="!allChecked" @click="doSubmit">确认提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import Viewport from './components/Viewport.vue'
import PresetPanel from './components/PresetPanel.vue'
import ToolPanel from './components/ToolPanel.vue'
import GroupPanel from './components/GroupPanel.vue'
import MaterialPanel from './components/MaterialPanel.vue'
import SlicePanel from './components/SlicePanel.vue'
import ClipboardPanel from './components/ClipboardPanel.vue'
import MyTasks from './components/MyTasks.vue'
import ExportDialog from './components/ExportDialog.vue'
import OrdersPage from './components/OrdersPage.vue'
import BoardPage from './components/BoardPage.vue'

import { editorState as es, copySelection, pasteClipboard, deleteSelection, toggleMirror, setMirrorAxis, loadPreset, toast } from './store/editorStore.js'
import { frameAll } from './store/viewStore.js'
import { workState, summary, me, persist, submitForQC } from './store/workflow.js'
import { PRESETS } from './voxel/presets.js'
import { buildMesh } from './voxel/mesh.js'
import { clipFromSection, sectionActive } from './voxel/geometry.js'

const page = ref('model')
const showExport = ref(false)
const submitTarget = ref(null)
const submitCheck = reactive({ allExposed: false, sliced: false, under20k: false })

const presetName = computed(() => PRESETS.find((p) => p.id === es.presetId)?.name ?? '自定义')
const allChecked = computed(() => submitCheck.allExposed && submitCheck.sliced && submitCheck.under20k)
const currentTris = computed(() => {
  const clip = es.sectionOn && sectionActive(es.section) ? clipFromSection(es.section) : null
  return buildMesh(es.model, { visibleGroups: new Set([0, 1, 2, 3]), clip }).triCount
})

function go(p) {
  page.value = p
}

function openSubmit(order) {
  submitTarget.value = order
  submitCheck.allExposed = false
  submitCheck.sliced = false
  submitCheck.under20k = currentTris.value <= 20000
}

function doSubmit() {
  const o = submitTarget.value
  submitForQC(o.id, { voxels: es.stats.count, tri: currentTris.value })
  toast(`已提交 ${o.id} 到质检`, 'ok')
  submitTarget.value = null
}

function onExported(res) {
  toast(`导出完成：${res.triTotal.toLocaleString()} 面`, 'ok')
}

function onKey(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return
  const k = e.key.toLowerCase()
  const map = { q: 'orbit', b: 'paint', e: 'erase', r: 'restyle', i: 'pick', m: 'select', p: 'blit' }
  if (page.value !== 'model') return
  if (map[k] && !e.ctrlKey && !e.metaKey) {
    es.tool = map[k]
    e.preventDefault()
    return
  }
  if ((e.ctrlKey || e.metaKey) && k === 'z') {
    e.shiftKey ? es.editor.redo() : es.editor.undo()
    e.preventDefault()
    return
  }
  if ((e.ctrlKey || e.metaKey) && k === 'c') {
    copySelection()
    e.preventDefault()
    return
  }
  if ((e.ctrlKey || e.metaKey) && k === 'v') {
    pasteClipboard()
    e.preventDefault()
    return
  }
  if ((e.ctrlKey || e.metaKey) && k === 'x') {
    copySelection()
    deleteSelection()
    e.preventDefault()
    return
  }
  if (k === 'delete' || k === 'backspace') {
    deleteSelection()
    e.preventDefault()
    return
  }
  if (k === 'escape') {
    es.selection = null
    if (es.tool === 'blit') es.tool = 'select'
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.dev-tag { font-size: 10.5px; color: var(--text-3); padding: 3px 8px; border: 1px solid var(--line); border-radius: 5px; }
.badge.hot { background: #5b2b2b; color: #f29c95; }
.nav button.on .badge.hot { background: #ef6a62; color: #2a0c0a; }
.bottom-bar {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-top: 1px solid var(--line);
  background: #11161e; flex-wrap: wrap;
}
.bb-left, .bb-right { display: flex; align-items: center; gap: 5px; }
.bb-right { margin-left: auto; }
.bb-sep { width: 1px; height: 16px; background: var(--line-2); margin: 0 4px; }
.mini-sel { width: auto; padding: 4px 6px; font-size: 11px; }
.export-card { border: 1px solid var(--line); border-radius: 9px; background: var(--panel-2); padding: 10px; }
.ec-hd { font-size: 11.5px; font-weight: 600; margin-bottom: 8px; }
.ec-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-3); padding: 3px 0; }
.ec-row b { color: var(--text); font-weight: 500; font-size: 11.5px; }
.ec-note { font-size: 10.5px; color: #8fd7ad; background: #10241a; border: 1px solid #26523a; border-radius: 5px; padding: 5px 8px; margin: 7px 0; line-height: 1.45; }
.ec-note.bad { color: #efa79f; background: #241716; border-color: #5b2b2b; }
.submit-sum { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; background: #10161e; border-radius: 7px; padding: 10px 12px; }
.submit-sum > div { display: flex; flex-direction: column; gap: 2px; }
.submit-sum b { font-size: 14px; font-weight: 500; }
.chk { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 0; cursor: pointer; color: var(--text-2); }
.chk input { accent-color: var(--accent); }
</style>
