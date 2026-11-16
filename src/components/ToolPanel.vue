<template>
  <div class="tool-panel">
    <section>
      <h3>模型</h3>
      <div class="row dim">
        <span>{{ store.model.nx }}×{{ store.model.ny }}×{{ store.model.nz }}</span>
        <span class="muted">
          {{ (store.model.nx * store.model.cell).toFixed(1) }}×
          {{ (store.model.ny * store.model.cell).toFixed(1) }}×
          {{ (store.model.nz * store.model.cell).toFixed(1) }} m
        </span>
      </div>
      <div class="row">
        <label>体素尺寸</label>
        <div class="seg">
          <button
            v-for="c in [0.05, 0.1, 0.2]"
            :key="c"
            :class="{ on: store.model.cell === c }"
            @click="changeCell(c)"
          >{{ c * 100 }}cm</button>
        </div>
      </div>
      <div class="row">
        <button class="btn" @click="newModel">新建空白模型</button>
        <button class="btn warn" @click="clearAll">清空</button>
      </div>
    </section>

    <section>
      <h3>点云导入</h3>
      <div class="row">
        <input ref="fileRef" type="file" accept=".ply,.xyz,.csv,.txt" hidden @change="onFile" />
        <button class="btn" @click="fileRef.click()">选择点云文件…</button>
      </div>
      <p class="hint">支持 ASCII PLY / xyz / csv,按当前体素尺寸粗格化,替换当前模型</p>
    </section>

    <section>
      <h3>镜像对称</h3>
      <div class="row">
        <label class="chk"><input type="checkbox" v-model="store.mirrorX" /> X 方向镜像</label>
        <label class="chk"><input type="checkbox" v-model="store.mirrorZ" /> Z 方向镜像</label>
      </div>
    </section>

    <section>
      <h3>石材</h3>
      <div class="materials">
        <button
          v-for="m in MATERIALS"
          :key="m.id"
          class="mat"
          :class="{ on: store.material === m.id }"
          @click="store.material = m.id"
        >
          <i :style="{ background: m.color }"></i>{{ m.name }}
        </button>
      </div>
    </section>

    <section>
      <h3>编辑工具</h3>
      <div class="seg wrap">
        <button :class="{ on: store.tool === 'paint' }" @click="store.tool = 'paint'">画笔</button>
        <button :class="{ on: store.tool === 'erase' }" @click="store.tool = 'erase'">橡皮</button>
        <button :class="{ on: store.tool === 'select' }" @click="store.tool = 'select'">框选</button>
        <button :class="{ on: store.tool === 'paste' }" @click="store.tool = 'paste'" :disabled="!store.clipboard">粘贴</button>
      </div>
      <div class="row" v-if="store.selection">
        <button class="btn sm" @click="copySel">复制选区</button>
        <button class="btn sm" @click="cutSel">剪切</button>
        <button class="btn sm" @click="store.selection = null">取消选区</button>
      </div>
      <p class="hint" v-if="store.clipboard">剪贴板 {{ store.clipboard.w }}×{{ store.clipboard.h }},选“粘贴”后在层图上点击放置</p>
    </section>

    <section>
      <h3>整层操作(第 {{ store.currentLayer + 1 }} 层)</h3>
      <div class="row">
        <label>平移</label>
        <div class="seg">
          <button @click="translate(-1, 0)">←X</button>
          <button @click="translate(1, 0)">X→</button>
          <button @click="translate(0, -1)">←Z</button>
          <button @click="translate(0, 1)">Z→</button>
        </div>
      </div>
      <div class="row">
        <label>旋转90°</label>
        <div class="seg">
          <button @click="rotate(-1)">↺ 逆时针</button>
          <button @click="rotate(1)">↻ 顺时针</button>
        </div>
      </div>
      <div class="row">
        <button class="btn warn sm" @click="clearLayer">清空本层</button>
      </div>
    </section>

    <section>
      <h3>网格减面</h3>
      <div class="row">
        <input type="range" min="0" max="0.9" step="0.05" v-model.number="store.decimation" />
        <span>{{ Math.round(store.decimation * 100) }}%</span>
      </div>
      <p class="hint">
        合并后 {{ store.mesh.facesRaw.toLocaleString() }} 面 → 减面后
        {{ store.mesh.faces.toLocaleString() }} 面
      </p>
    </section>

    <section>
      <h3>导出</h3>
      <div class="row">
        <button class="btn" @click="exportGLB">导出 GLB</button>
        <button class="btn" @click="exportCSV">体素坐标清单</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { store, MATERIALS, touch, replaceModel, notify } from '../store'
import { VoxelModel } from '../core/voxel'
import { parsePointCloud } from '../core/pointcloud'
import { meshGreedy, decimateMesh } from '../core/mesher'
import { materialColorRGB } from '../store'
import { buildGLB, downloadBlob } from '../core/glb'

const fileRef = ref(null)

function changeCell(c) {
  if (c === store.model.cell) return
  store.model.resample(c)
  store.selection = null
  touch()
  notify(`体素尺寸已切换为 ${c * 100}cm`)
}

function newModel() {
  const nx = parseInt(prompt('X 向格数', '64'), 10)
  const ny = parseInt(prompt('Y 向层数', '40'), 10)
  const nz = parseInt(prompt('Z 向格数', '64'), 10)
  if (![nx, ny, nz].every((n) => Number.isInteger(n) && n > 0 && n <= 256)) {
    notify('尺寸无效(1–256)')
    return
  }
  replaceModel(new VoxelModel(nx, ny, nz, store.model.cell))
  notify('已新建空白模型')
}

function clearAll() {
  if (!confirm('确定清空整个模型?')) return
  store.model.clear()
  touch()
}

function onFile(e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const pts = parsePointCloud(String(reader.result))
      const m = VoxelModel.fromPoints(pts, store.model.cell, store.material)
      replaceModel(m)
      notify(`点云 ${pts.length / 3} 点 → ${m.nx}×${m.ny}×${m.nz} 体素`)
    } catch (err) {
      notify('点云解析失败:' + err.message)
    }
  }
  reader.readAsText(f)
}

function copySel() {
  const s = store.selection
  if (!s) return
  store.clipboard = store.model.copyRegion(store.currentLayer, s.x0, s.z0, s.x1, s.z1)
  notify(`已复制 ${store.clipboard.w}×${store.clipboard.h} 选区`)
}

function cutSel() {
  copySel()
  const s = store.selection
  for (let z = s.z0; z <= s.z1; z++)
    for (let x = s.x0; x <= s.x1; x++) store.model.set(x, store.currentLayer, z, 0)
  store.selection = null
  touch()
}

function translate(dx, dz) {
  store.model.layerTranslate(store.currentLayer, dx, dz)
  touch()
}

function rotate(dir) {
  store.model.layerRotate(store.currentLayer, dir)
  touch()
}

function clearLayer() {
  if (!confirm(`清空第 ${store.currentLayer + 1} 层?`)) return
  store.model.layerClear(store.currentLayer)
  touch()
}

function exportGLB() {
  const raw = meshGreedy(store.model, materialColorRGB)
  const dec = decimateMesh(raw, store.model.cell, store.decimation)
  const glb = buildGLB(dec)
  downloadBlob(glb, `taihu-stone-${Date.now()}.glb`, 'model/gltf-binary')
  notify(`已导出 GLB(${dec.faceCount} 面)`)
}

function exportCSV() {
  const m = store.model
  const lines = ['x,y,z,material']
  for (let y = 0; y < m.ny; y++)
    for (let z = 0; z < m.nz; z++)
      for (let x = 0; x < m.nx; x++) {
        const v = m.data[m.index(x, y, z)]
        if (v) lines.push(`${x},${y},${z},${v}`)
      }
  downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), `voxels-${Date.now()}.csv`)
  notify(`已导出 ${lines.length - 1} 条体素坐标`)
}
</script>

<style scoped>
.tool-panel {
  padding: 10px;
  overflow-y: auto;
  height: 100%;
}
section {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #262c38;
}
h3 {
  font-size: 13px;
  color: #8fa3c0;
  margin: 0 0 8px;
  font-weight: 600;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.row label {
  font-size: 12px;
  color: #9fb0c8;
}
.dim {
  font-size: 13px;
  justify-content: space-between;
}
.muted {
  color: #6b7789;
  font-size: 12px;
}
.seg {
  display: flex;
  gap: 4px;
}
.seg.wrap {
  flex-wrap: wrap;
}
.seg button {
  background: #232936;
  border: 1px solid #333c4e;
  color: #c6d2e4;
  padding: 4px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
}
.seg button.on {
  background: #2f5d95;
  border-color: #4da3ff;
  color: #fff;
}
.seg button:disabled {
  opacity: 0.4;
  cursor: default;
}
.materials {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.mat {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #232936;
  border: 1px solid #333c4e;
  color: #c6d2e4;
  padding: 5px 8px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
}
.mat.on {
  border-color: #ffd54a;
  background: #2c3242;
}
.mat i {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: inline-block;
}
.chk {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #c6d2e4;
}
.hint {
  font-size: 11px;
  color: #6b7789;
  margin: 4px 0 0;
}
input[type='range'] {
  flex: 1;
  accent-color: #4da3ff;
}
</style>
