<template>
  <div v-if="store.recordVersion" class="overlay" @click.self="store.recordVersion = null">
    <div class="sheet-wrap">
      <div class="sheet-actions no-print">
        <button class="btn" @click="print">打印</button>
        <button class="btn" @click="store.recordVersion = null">关闭</button>
      </div>
      <div class="sheet" id="record-sheet">
        <h1>假山石加工记录单</h1>
        <div class="sheet-no">记录单号:JL-{{ v.id }}-{{ fmtDate(v.createdAt) }}</div>
        <table>
          <tbody>
            <tr><th>石块编号</th><td>{{ stone?.code || '—' }}</td><th>产地</th><td>{{ stone?.origin || '—' }}</td></tr>
            <tr><th>石块尺寸</th><td>{{ stone ? `${stone.L}×${stone.W}×${stone.H} cm` : '—' }}</td><th>版本</th><td>V{{ v.n }}({{ v.status }})</td></tr>
            <tr><th>加工时间</th><td>{{ fmtTime(v.createdAt) }}</td><th>体素尺寸</th><td>{{ v.cell * 100 }} cm</td></tr>
            <tr><th>网格规模</th><td>{{ v.nx }}×{{ v.ny }}×{{ v.nz }}</td><th>体素数</th><td>{{ v.voxels.toLocaleString() }}</td></tr>
            <tr><th>成型体积</th><td>{{ v.volume.toFixed(3) }} m³</td><th>面数</th><td>合并 {{ v.facesRaw.toLocaleString() }} / 减面 {{ v.facesDec.toLocaleString() }}</td></tr>
            <tr><th>加工说明</th><td colspan="3">{{ v.note || '—' }}</td></tr>
            <tr><th>备注</th><td colspan="3">{{ stone?.note || '—' }}</td></tr>
          </tbody>
        </table>
        <div class="sign">
          <span>施工员:____________</span>
          <span>质检员:____________</span>
          <span>日期:____________</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../store'

const v = computed(() => store.recordVersion || {})
const stone = computed(() =>
  store.stones.find((s) => s.id === (store.recordVersion && store.recordVersion.stoneId))
)

function fmtTime(t) {
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}
function fmtDate(t) {
  const d = new Date(t)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
function print() {
  window.print()
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.sheet-wrap {
  max-height: 90vh;
  overflow-y: auto;
}
.sheet-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.sheet {
  background: #fff;
  color: #111;
  width: 640px;
  padding: 32px 36px;
  border-radius: 4px;
  font-size: 13px;
}
.sheet h1 {
  text-align: center;
  font-size: 20px;
  margin: 0 0 4px;
  letter-spacing: 4px;
}
.sheet-no {
  text-align: right;
  color: #555;
  font-size: 11px;
  margin-bottom: 10px;
}
.sheet table {
  width: 100%;
  border-collapse: collapse;
}
.sheet th,
.sheet td {
  border: 1px solid #333;
  padding: 7px 9px;
  text-align: left;
}
.sheet th {
  background: #f0f0f0;
  width: 90px;
  font-weight: 600;
}
.sign {
  display: flex;
  justify-content: space-between;
  margin-top: 28px;
  font-size: 13px;
}
</style>
