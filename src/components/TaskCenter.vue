<template>
  <div class="page">
    <h2 class="page-title">考级任务中心</h2>
    <div class="split">
      <!-- 老师：下发任务 -->
      <div class="card" v-if="store.role === 'teacher'">
        <h4>下发新任务</h4>
        <div class="stack" style="margin-top:10px">
          <div><label>任务名称</label><input type="text" v-model="form.title" placeholder="例：对称小城堡（五级）" /></div>
          <div><label>任务说明</label>
            <textarea rows="3" v-model="form.brief" placeholder="造型要求、结构要点、评分关注点…"></textarea>
          </div>
          <div class="row">
            <div><label>体素上限</label><input type="number" min="1" v-model.number="form.maxVoxels" /></div>
            <div><label>对称要求</label>
              <select v-model="form.mirror">
                <option value="off">不要求对称</option>
                <option value="x">X 轴对称</option>
                <option value="y">Y 轴对称</option>
                <option value="both">X/Y 双轴对称</option>
              </select>
            </div>
          </div>
          <button class="primary" @click="issue">下发任务</button>
        </div>
      </div>

      <!-- 学员：提交须知 -->
      <div class="card" v-else>
        <h4>学员提交流程</h4>
        <ol class="small muted" style="padding-left:18px;line-height:2">
          <li>在右侧选择老师下发的任务，注意 <b>体素上限</b> 与 <b>对称要求</b></li>
          <li>进入工作台后用加体/删体笔刷拼搭，可开镜像辅助、分层切片编辑</li>
          <li>随时查看右栏实时体素数与对称度，超限无法继续加体</li>
          <li>完成后点击「提交给老师评审」，系统自动给出机器初评</li>
          <li>老师复核改分后，可在「成绩与错法」页查看最终成绩</li>
        </ol>
      </div>

      <!-- 任务列表 -->
      <div class="card">
        <h4>任务列表（{{ store.tasks.length }}）</h4>
        <div class="stack" style="margin-top:10px">
          <div v-for="t in store.tasks" :key="t.id" class="section" style="padding:12px">
            <div class="row" style="align-items:flex-start">
              <div style="flex:2">
                <b>{{ t.title }}</b>
                <p class="small muted" style="margin:4px 0">{{ t.brief || '（无补充说明）' }}</p>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <span class="list-chip">上限 {{ t.maxVoxels }} 体素</span>
                  <span class="list-chip">对称：{{ mirrorLabel(t.mirror) }}</span>
                  <span class="list-chip">提交 {{ subCount(t.id) }} 份</span>
                </div>
              </div>
              <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                <button class="primary" @click="$emit('open-task', t)">
                  {{ store.role === 'teacher' ? '查看示范/编辑' : '进入工作台' }}
                </button>
                <button v-if="store.role === 'teacher'" class="danger" @click="remove(t)">删除任务</button>
              </div>
            </div>
          </div>
          <p v-if="!store.tasks.length" class="muted small">暂无任务</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { store, actions } from '../lib/store.js'

defineEmits(['open-task'])
const form = reactive({ title: '', brief: '', maxVoxels: 200, mirror: 'x' })

function mirrorLabel (m) {
  return { off: '不要求', x: 'X 轴', y: 'Y 轴', both: 'X/Y 双轴' }[m] || m
}
function issue () {
  if (!form.title.trim()) return alert('请填写任务名称')
  if (!(form.maxVoxels > 0)) return alert('体素上限需大于 0')
  actions.addTask({ title: form.title.trim(), brief: form.brief.trim(), maxVoxels: form.maxVoxels, mirror: form.mirror })
  form.title = ''; form.brief = ''
}
function subCount (taskId) {
  return store.submissions.filter(s => s.taskId === taskId).length
}
function remove (t) {
  if (window.confirm(`删除任务「${t.title}」？相关提交记录保留。`)) actions.removeTask(t.id)
}
</script>
