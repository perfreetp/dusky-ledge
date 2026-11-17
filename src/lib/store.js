// 全局状态：身份、任务、提交与成绩；localStorage 持久化
import { reactive, computed, watch } from 'vue'
import { seedHouse, serialize, deserialize } from './voxel.js'
import { evaluate } from './grading.js'

const LS_KEY = 'voxel-workbench-v1'

function uid (p) {
  return `${p}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`
}

function seedState () {
  const demoModel = serialize(seedHouse(16))
  const taskA = {
    id: uid('task'), title: '小房子造型（三级）',
    brief: '用对称结构搭建一座带屋顶的小房子，墙体需空心。',
    maxVoxels: 600, mirror: 'x', createdAt: Date.now() - 86400000
  }
  const taskB = {
    id: uid('task'), title: '创意小塔（四级）',
    brief: 'X/Y 双轴对称高塔，注意每一层都要有支撑。',
    maxVoxels: 400, mirror: 'both', createdAt: Date.now() - 3600000
  }
  const evalA = evaluate(deserialize(demoModel), taskA)
  return {
    role: 'teacher',
    tasks: [taskA, taskB],
    submissions: [{
      id: uid('sub'), taskId: taskA.id, studentName: '学员·林小方',
      model: demoModel,
      eval: evalA,
      autoScore: evalA.autoScore,
      teacherScore: null, teacherComment: '',
      status: 'pending', createdAt: Date.now() - 1800000
    }],
    draftModel: null,
    draftMeta: { taskId: null }
  }
}

function load () {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && Array.isArray(s.tasks)) return s
    }
  } catch (e) { /* 数据损坏则重建 */ }
  return seedState()
}

export const store = reactive(load())

watch(store, (v) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)) } catch (e) { /* 配额满忽略 */ }
}, { deep: true })

export const actions = {
  setRole (role) { store.role = role },

  addTask (data) {
    store.tasks.unshift({ id: uid('task'), createdAt: Date.now(), ...data })
  },
  removeTask (id) {
    store.tasks = store.tasks.filter(t => t.id !== id)
  },

  saveDraft (model, taskId) {
    store.draftModel = serialize(model)
    store.draftMeta.taskId = taskId
  },
  loadDraft () {
    return store.draftModel ? deserialize(store.draftModel) : null
  },

  submit (model, task, studentName) {
    const evalResult = evaluate(model, task)
    const sub = {
      id: uid('sub'), taskId: task.id, studentName: studentName || '未命名学员',
      model: serialize(model),
      eval: evalResult, autoScore: evalResult.autoScore,
      teacherScore: null, teacherComment: '',
      status: 'pending', createdAt: Date.now()
    }
    store.submissions.unshift(sub)
    return sub
  },

  review (submissionId, score, comment) {
    const s = store.submissions.find(x => x.id === submissionId)
    if (!s) return
    s.teacherScore = Math.max(0, Math.min(100, Math.round(score)))
    s.teacherComment = comment
    s.status = 'reviewed'
  },

  resetAll () {
    const fresh = seedState()
    Object.keys(store).forEach(k => { delete store[k] })
    Object.assign(store, fresh)
  }
}

export const pendingCount = computed(() => store.submissions.filter(s => s.status === 'pending').length)
export const reviewedCount = computed(() => store.submissions.filter(s => s.status === 'reviewed').length)
