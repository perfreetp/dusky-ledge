<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="logo">方块工坊 <span>·</span> 体素造型与拼搭考级工作台</div>
      <nav class="tabs">
        <button :class="{ active: tab === 'workbench' }" @click="tab = 'workbench'">工作台</button>
        <button :class="{ active: tab === 'tasks' }" @click="tab = 'tasks'">任务中心</button>
        <button v-if="store.role === 'teacher'" :class="{ active: tab === 'review' }" @click="tab = 'review'">
          复核台<span v-if="pendingCount" class="badge pending" style="margin-left:5px">{{ pendingCount }}</span>
        </button>
        <button :class="{ active: tab === 'grades' }" @click="tab = 'grades'">成绩与错法</button>
      </nav>
      <div class="role-switch">
        <span class="who">当前身份</span>
        <button :class="{ active: store.role === 'teacher' }" @click="switchRole('teacher')">老师</button>
        <button :class="{ active: store.role === 'student' }" @click="switchRole('student')">学员</button>
        <button @click="resetAll" title="恢复演示数据">重置</button>
      </div>
    </header>

    <VoxelEditor v-if="tab === 'workbench'" :key="editorKey" :task="activeTask"
      :initial-model="initialModel" @submit="onSubmit" />
    <TaskCenter v-else-if="tab === 'tasks'" @open-task="openTask" />
    <ReviewDesk v-else-if="tab === 'review'" />
    <GradeDashboard v-else />

    <!-- 提交确认 -->
    <div v-if="submitOpen" class="modal-mask" @click.self="submitOpen = false">
      <div class="modal" style="width:min(560px,92vw)">
        <h3>提交作品 · {{ activeTask?.title }}</h3>
        <div class="kv" style="font-size:13px">
          <span class="k">体素总数</span><span>{{ lastEval?.voxelCount }}（上限 {{ activeTask?.maxVoxels }}）
            <span v-if="lastEval?.overLimit" class="badge over">超限 {{ lastEval.voxelCount - activeTask.maxVoxels }}</span></span>
          <span class="k">综合对称度</span><span>{{ Math.round((lastEval?.symmetry ?? 0) * 100) }}%
            <span v-for="a in lastEval?.requiredAxes || []" :key="a" class="small muted">
              （{{ a.toUpperCase() }} {{ Math.round((lastEval.perAxis[a] ?? 0) * 100) }}%）
            </span></span>
          <span class="k">悬空体素</span><span>{{ lastEval?.suspendedCount }} 块</span>
          <span class="k">机器初评</span><span><b style="font-size:18px">{{ lastEval?.autoScore }}</b> 分</span>
        </div>
        <ul class="small muted" style="padding-left:18px;margin:10px 0">
          <li v-for="(n, i) in lastEval?.notes" :key="i">{{ n }}</li>
        </ul>
        <label>学员署名</label>
        <input type="text" v-model="studentName" placeholder="请输入姓名" />
        <div class="row" style="margin-top:12px">
          <button class="primary" @click="confirmSubmit">确认提交</button>
          <button @click="submitOpen = false">继续修改</button>
        </div>
      </div>
    </div>

    <div v-if="globalToast" class="toast">{{ globalToast }}</div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import VoxelEditor from './components/VoxelEditor.vue'
import TaskCenter from './components/TaskCenter.vue'
import ReviewDesk from './components/ReviewDesk.vue'
import GradeDashboard from './components/GradeDashboard.vue'
import { store, actions, pendingCount } from './lib/store.js'
import { evaluate } from './lib/grading.js'
import { cloneModel, seedHouse } from './lib/voxel.js'

const tab = ref('workbench')
const editorKey = ref(0)
const activeTask = ref(null)
const initialModel = ref(null)
const submitOpen = ref(false)
const pendingModel = ref(null)
const lastEval = ref(null)
const studentName = ref('学员·' + ['林小方', '陈积木', '王方块', '赵拼拼'][Math.floor(Math.random() * 4)])
const globalToast = ref('')
let toastTimer = 0

function toast (m) {
  globalToast.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { globalToast.value = '' }, 2400)
}

function switchRole (role) {
  actions.setRole(role)
  if (role === 'student' && tab.value === 'review') tab.value = 'tasks'
  toast(`已切换为${role === 'teacher' ? '老师' : '学员'}身份`)
}

function openTask (task) {
  activeTask.value = task
  // 学员：优先恢复该任务草稿，否则从空白开始；老师：载入演示作品作示范
  const draft = actions.loadDraft()
  if (store.role === 'student' && draft) {
    initialModel.value = draft
    toast('已恢复上次草稿')
  } else if (store.role === 'teacher') {
    initialModel.value = seedHouse(16)
  } else {
    initialModel.value = null
  }
  editorKey.value++
  tab.value = 'workbench'
}

function onSubmit (model) {
  if (!activeTask.value) {
    // 自由创作：提示先选任务
    tab.value = 'tasks'
    toast('请先在任务中心选择一个考级任务')
    return
  }
  if (!model.voxels.size) return toast('空作品无法提交')
  pendingModel.value = cloneModel(model)
  lastEval.value = evaluate(pendingModel.value, activeTask.value)
  submitOpen.value = true
}

function confirmSubmit () {
  const sub = actions.submit(pendingModel.value, activeTask.value, studentName.value.trim())
  actions.saveDraft(pendingModel.value, activeTask.value.id)
  submitOpen.value = false
  toast(`提交成功，机器初评 ${sub.autoScore} 分，等待老师复核`)
  if (store.role === 'student') tab.value = 'grades'
}

function resetAll () {
  if (!window.confirm('恢复内置演示数据？当前任务、提交与草稿都会被重置。')) return
  actions.resetAll()
  activeTask.value = null
  initialModel.value = null
  editorKey.value++
  toast('已恢复演示数据')
}
</script>
