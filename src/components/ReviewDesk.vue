<template>
  <div class="page">
    <h2 class="page-title">教师复核台 · 待评 {{ pending.length }} / 已评 {{ reviewed.length }}</h2>
    <div class="card">
      <table>
        <thead>
          <tr><th>学员</th><th>任务</th><th>体素</th><th>对称度</th><th>悬空</th><th>机器初评</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in store.submissions" :key="s.id">
            <td>{{ s.studentName }}</td>
            <td class="truncate">{{ taskTitle(s.taskId) }}</td>
            <td>
              <span :class="['badge', s.eval.overLimit ? 'over' : 'ok']">{{ s.eval.voxelCount }}</span>
            </td>
            <td>{{ Math.round(s.eval.symmetry * 100) }}%</td>
            <td>
              <span :class="['badge', s.eval.suspendedCount ? 'over' : 'ok']">{{ s.eval.suspendedCount }}</span>
            </td>
            <td><b>{{ s.autoScore }}</b> 分</td>
            <td>
              <span :class="['badge', s.status === 'pending' ? 'pending' : 'reviewed']">
                {{ s.status === 'pending' ? '待复核' : `已评 ${s.teacherScore}` }}
              </span>
            </td>
            <td><button @click="open(s)">立体复核 / 改分</button></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!store.submissions.length" class="muted small" style="padding:12px 4px">还没有提交记录</p>
    </div>

    <!-- 复核弹窗 -->
    <div v-if="current" class="modal-mask" @click.self="current = null">
      <div class="modal">
        <h3>立体复核 — {{ current.studentName }} · {{ taskTitle(current.taskId) }}</h3>
        <div class="split">
          <div style="min-height:380px;border:1px solid var(--line);border-radius:10px;overflow:hidden;position:relative;background:radial-gradient(circle at 50% 30%, #17263c 0%, #0f1722 75%)">
            <VoxelViewport :state="viewerState" :readonly="true" />
            <div style="position:absolute;top:8px;left:10px" class="small muted">拖动旋转 · 滚轮缩放（只读复核视图）</div>
          </div>
          <div class="stack">
            <div class="section">
              <h3>机器初评指标</h3>
              <div class="kv">
                <span class="k">体素总数</span><span>{{ current.eval.voxelCount }} / 上限 {{ currentTask?.maxVoxels ?? '—' }}
                  <span v-if="current.eval.overLimit" class="badge over">超限</span></span>
                <span class="k">综合对称度</span><span>{{ Math.round(current.eval.symmetry * 100) }}%
                  <span v-for="a in current.eval.requiredAxes" :key="a" class="small muted">
                    （{{ a.toUpperCase() }} 轴 {{ Math.round((current.eval.perAxis[a] ?? 0) * 100) }}%）
                  </span>
                </span>
                <span class="k">悬空体素</span><span>{{ current.eval.suspendedCount }} 块</span>
                <span class="k">使用颜色</span><span>{{ current.eval.colorCount }} 种</span>
              </div>
              <div class="bar" style="margin-top:10px"><i :style="{ width: current.autoScore + '%' }"></i></div>
              <p class="small" style="margin-top:8px">初评 {{ current.autoScore }} 分</p>
              <ul class="small muted" style="margin:6px 0 0;padding-left:18px">
                <li v-for="(n, i) in current.eval.notes" :key="i">{{ n }}</li>
              </ul>
            </div>
            <div class="section">
              <h3>教师评分</h3>
              <label>最终成绩（0-100）</label>
              <input type="number" min="0" max="100" v-model.number="scoreInput" />
              <label style="margin-top:8px">评语 / 错法指正</label>
              <textarea rows="3" v-model="commentInput" placeholder="例：左侧屋顶比右侧少两块，对称度被扣分；二层左侧有 3 块悬空…"></textarea>
              <div class="row" style="margin-top:10px">
                <button class="primary" @click="save">保存成绩</button>
                <button @click="current = null">关闭</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import VoxelViewport from './VoxelViewport.vue'
import { store, actions } from '../lib/store.js'
import { deserialize } from '../lib/voxel.js'

const current = ref(null)
const scoreInput = ref(80)
const commentInput = ref('')
const viewerState = reactive({
  model: { size: 16, voxels: new Map() },
  tool: 'rotate', color: 0, mirror: 'off',
  layerMode: false, activeLayer: 0,
  selection: new Set(), hover: null,
  yaw: Math.PI / 6, tile: 26, version: 0, readonlyKey: 0,
  requestAdd: () => false, bump: () => {}
})

const pending = computed(() => store.submissions.filter(s => s.status === 'pending'))
const reviewed = computed(() => store.submissions.filter(s => s.status === 'reviewed'))
const currentTask = computed(() => store.tasks.find(t => t.id === current.value?.taskId))
function taskTitle (id) { return store.tasks.find(t => t.id === id)?.title || '（任务已删除）' }

watch(current, (s) => {
  if (!s) return
  viewerState.model = deserialize(s.model)
  viewerState.mirror = currentTask.value?.mirror || 'off'
  viewerState.selection = new Set()
  viewerState.version++
  scoreInput.value = s.teacherScore ?? s.autoScore
  commentInput.value = s.teacherComment || ''
})

function open (s) { current.value = s }
function save () {
  if (scoreInput.value === '' || scoreInput.value < 0 || scoreInput.value > 100) {
    return alert('请输入 0-100 的成绩')
  }
  actions.review(current.value.id, scoreInput.value, commentInput.value.trim())
  current.value = null
}
</script>
