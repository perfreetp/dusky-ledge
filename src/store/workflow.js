import { reactive, computed, watch } from 'vue'

const KEY = 'profile-workshop:workflow:v1'

// 用本地日期，避免 UTC 在东八区把日期算成前一天
const todayISO = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const seedPeople = [
  { id: 'p1', name: '周正海', role: '组长', team: '建模一组', avatar: '周' },
  { id: 'p2', name: '林柳', role: '师傅', team: '建模一组', avatar: '林' },
  { id: 'p3', name: '高雄', role: '师傅', team: '建模一组', avatar: '高' },
  { id: 'p4', name: '徐怀', role: '师傅', team: '建模二组', avatar: '徐' },
  { id: 'p5', name: '冉静', role: '师傅', team: '建模二组', avatar: '冉' },
  { id: 'p6', name: '郑维', role: '质检', team: '质检科', avatar: '郑' },
]

const seedOrders = [
  {
    id: 'WO-2411',
    code: '提-0928',
    title: '冲压线上下料机器人教学剖面',
    deviceModel: 'IRB-2600',
    deviceType: '六轴工业机器人',
    quantity: 3,
    exposed: ['基座回转支座', '大臂小臂减速机', '腕部管线包', '控制柜内部端子'],
    note: '学员要能直接看到 J2 和 J3 轴减速机，外壳做成可摘的分块护罩。腕部线束要能抽出一节。',
    priority: '高',
    requester: '培训中心 · 教务组',
    workshop: '总装一车间',
    status: 'todo', // todo | assigned | submitted | passed | rework
    assignee: null,
    assignedAt: null,
    submittedAt: null,
    reviewedAt: null,
    reviewer: null,
    qcNote: '',
    reworkTimes: 1,
    createdAt: '2026-11-09',
    due: '2026-11-22',
    linkedPreset: 'robot',
    stats: null,
  },
  {
    id: 'WO-2412',
    code: '提-1002',
    title: '立式加工中心主轴箱剖切教具',
    deviceModel: 'VMC-850',
    deviceType: '立式加工中心',
    quantity: 2,
    exposed: ['主轴箱齿轮组', 'Z 向丝杠', '防护门视窗', '电气柜断路器排'],
    note: '主轴箱沿 Z 向前 1/3 剖开，丝杠保留 3 圈完整螺纹即可。外壳需保留视窗框。',
    priority: '中',
    requester: '培训中心 · 机加工教研组',
    workshop: '机加工车间',
    status: 'doing',
    assignee: 'p2',
    assignedAt: '2026-11-12',
    submittedAt: null,
    reviewedAt: null,
    reviewer: null,
    qcNote: '',
    reworkTimes: 0,
    createdAt: '2026-11-10',
    due: '2026-11-20',
    linkedPreset: 'cnc',
    stats: null,
  },
  {
    id: 'WO-2413',
    code: '提-1005',
    title: '倍速链装配线段教具（前 3 工位）',
    deviceModel: 'AL-2400',
    deviceType: '倍速链装配线',
    quantity: 4,
    exposed: ['顶升机构', '辊筒传动', '阻挡气缸', '配电柜进线'],
    note: '只要前三个工位，长度按 2.4 米切。顶升台要能从侧面看到导轨。',
    priority: '中',
    requester: '培训中心 · 自动化教研组',
    workshop: '总装二车间',
    status: 'doing',
    assignee: 'p3',
    assignedAt: '2026-11-13',
    submittedAt: null,
    reviewedAt: null,
    reviewer: null,
    qcNote: '',
    reworkTimes: 2,
    createdAt: '2026-11-11',
    due: '2026-11-25',
    linkedPreset: 'conveyor',
    stats: null,
  },
  {
    id: 'WO-2414',
    code: '提-1011',
    title: '气动夹具快换模块剖面',
    deviceModel: 'QC-160',
    deviceType: '气动夹具',
    quantity: 6,
    exposed: ['气缸内腔', '换向阀', '定位销', '气路快插接头'],
    note: '气缸要整段剖开看到活塞和密封圈，气路用异色标出。',
    priority: '低',
    requester: '培训中心 · 液压气动教研组',
    workshop: '工装车间',
    status: 'rework',
    assignee: 'p4',
    assignedAt: '2026-11-14',
    submittedAt: '2026-11-15',
    reviewedAt: '2026-11-16',
    reviewer: 'p6',
    qcNote: '气缸剖面没做到中线，活塞环只露了一半；气路配色和外壳混在一起分不清。按需求单第 2 条返工，补上换向阀内部。',
    reworkTimes: 1,
    createdAt: '2026-11-12',
    due: '2026-11-19',
    linkedPreset: 'cnc',
    stats: { voxels: 486, tri: 2741 },
  },
  {
    id: 'WO-2415',
    code: '提-1013',
    title: '冲压机机身与传动系统剖面',
    deviceModel: 'JH21-160',
    deviceType: '开式固定台压力机',
    quantity: 1,
    exposed: ['曲轴连杆', '离合器', '飞轮', '导轨与滑块'],
    note: '机身左侧整面剖开，飞轮只保留 1/4 扇形。连杆运动轨迹用辅线示意。',
    priority: '高',
    requester: '培训中心 · 冲压教研组',
    workshop: '冲压车间',
    status: 'passed',
    assignee: 'p5',
    assignedAt: '2026-11-08',
    submittedAt: '2026-11-13',
    reviewedAt: '2026-11-14',
    reviewer: 'p6',
    qcNote: '合格。曲轴与连杆配合关系清楚，飞轮剖面处理得当。',
    reworkTimes: 1,
    createdAt: '2026-11-05',
    due: '2026-11-15',
    linkedPreset: null,
    stats: { voxels: 912, tri: 4380 },
  },
  {
    id: 'WO-2416',
    code: '提-1015',
    title: '立体仓库堆垛机立柱剖面',
    deviceModel: 'SRM-1200',
    deviceType: '巷道堆垛机',
    quantity: 2,
    exposed: ['提升链条', '载货台', '行走轮组', '控制柜'],
    note: '立柱下半段剖开看提升链条走向，载货台给个单独的拆解视图。',
    priority: '中',
    requester: '培训中心 · 物流教研组',
    workshop: '总装一车间',
    status: 'todo',
    assignee: null,
    assignedAt: null,
    submittedAt: null,
    reviewedAt: null,
    reviewer: null,
    qcNote: '',
    reworkTimes: 0,
    createdAt: '2026-11-15',
    due: '2026-11-30',
    linkedPreset: null,
    stats: null,
  },
  {
    id: 'WO-2417',
    code: '提-1016',
    title: '注塑机合模机构剖面教具',
    deviceModel: 'HT-180',
    deviceType: '注塑机',
    quantity: 2,
    exposed: ['双肘杆机构', '导柱导套', '锁模油缸'],
    note: '双肘杆要做到能动画演示合模过程的静态三位置。',
    priority: '中',
    requester: '培训中心 · 塑料成形教研组',
    workshop: '注塑车间',
    status: 'passed',
    assignee: 'p2',
    assignedAt: '2026-11-06',
    submittedAt: '2026-11-11',
    reviewedAt: '2026-11-12',
    reviewer: 'p6',
    qcNote: '合格。三个位置的肘杆姿态标注清晰，建议补一张爆炸图。',
    reworkTimes: 0,
    createdAt: '2026-11-03',
    due: '2026-11-12',
    linkedPreset: null,
    stats: { voxels: 1204, tri: 5620 },
  },
  {
    id: 'WO-2418',
    code: '提-1018',
    title: '龙门加工中心横梁剖面',
    deviceModel: 'GMC-4028',
    deviceType: '龙门加工中心',
    quantity: 1,
    exposed: ['横梁筋板', '滑枕导轨', '双驱丝杠'],
    note: '横梁中段剖开看内部筋板布局，用于讲解铸铁件结构刚性。',
    priority: '低',
    requester: '培训中心 · 设备结构教研组',
    workshop: '机加工车间',
    status: 'rework',
    assignee: 'p3',
    assignedAt: '2026-11-10',
    submittedAt: '2026-11-15',
    reviewedAt: '2026-11-16',
    reviewer: 'p6',
    qcNote: '筋板厚度比例失真，看起来像 50mm 实际应 30mm；剖切面没做封边，渲染出来是空壳。',
    reworkTimes: 1,
    createdAt: '2026-11-07',
    due: '2026-11-21',
    linkedPreset: null,
    stats: { voxels: 2140, tri: 18640 },
  },
]

const seedActivity = [
  { at: '11-16 16:42', who: '郑维', what: '质检打回', target: 'WO-2418 龙门加工中心横梁剖面', kind: 'rework' },
  { at: '11-16 15:10', who: '郑维', what: '质检打回', target: 'WO-2414 气动夹具快换模块剖面', kind: 'rework' },
  { at: '11-16 09:31', who: '徐怀', what: '提交质检', target: 'WO-2414 气动夹具快换模块剖面', kind: 'submit' },
  { at: '11-15 17:02', who: '高雄', what: '提交质检', target: 'WO-2418 龙门加工中心横梁剖面', kind: 'submit' },
  { at: '11-14 10:18', who: '郑维', what: '质检通过', target: 'WO-2415 冲压机机身与传动系统剖面', kind: 'pass' },
  { at: '11-13 14:55', who: '冉静', what: '提交质检', target: 'WO-2415 冲压机机身与传动系统剖面', kind: 'submit' },
  { at: '11-12 11:20', who: '郑维', what: '质检通过', target: 'WO-2417 注塑机合模机构剖面教具', kind: 'pass' },
]

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data.orders || !data.people) return null
    return data
  } catch {
    return null
  }
}

const saved = load()

export const workState = reactive({
  people: saved?.people ?? seedPeople,
  orders: saved?.orders ?? seedOrders,
  activity: saved?.activity ?? seedActivity,
  currentUser: saved?.currentUser ?? 'p2',
})

export function persist() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        people: workState.people,
        orders: workState.orders,
        activity: workState.activity,
        currentUser: workState.currentUser,
      })
    )
  } catch {
    /* 本地存储不可用时静默降级 */
  }
}

export const ROLE_LABEL = { 组长: '组长', 师傅: '建模师傅', 质检: '质检员' }
export const STATUS_LABEL = {
  todo: '待派工',
  doing: '建模中',
  submitted: '待质检',
  passed: '已通过',
  rework: '返工中',
}
export const STATUS_TONE = {
  todo: 'slate',
  doing: 'blue',
  submitted: 'violet',
  passed: 'green',
  rework: 'red',
}

export const peopleById = computed(() => Object.fromEntries(workState.people.map((p) => [p.id, p])))
export const me = computed(() => peopleById.value[workState.currentUser])
export const isLead = computed(() => me.value?.role === '组长')
export const isQC = computed(() => me.value?.role === '质检')

export const myOrders = computed(() => workState.orders.filter((o) => o.assignee === workState.currentUser))

export const boardStats = computed(() => {
  const masters = workState.people.filter((p) => p.role === '师傅')
  return masters.map((p) => {
    const own = workState.orders.filter((o) => o.assignee === p.id)
    const done = own.filter((o) => o.status === 'passed').length
    const active = own.filter((o) => o.status === 'doing' || o.status === 'rework' || o.status === 'submitted').length
    const reworks = own.reduce((a, o) => a + (o.reworkTimes || 0), 0)
    const pending = own.filter((o) => o.status === 'submitted').length
    return {
      ...p,
      total: own.length,
      done,
      active,
      pending,
      reworks,
      passRate: own.length ? Math.round((done / own.length) * 100) : 0,
    }
  })
})

export const summary = computed(() => {
  const o = workState.orders
  return {
    total: o.length,
    todo: o.filter((x) => x.status === 'todo').length,
    doing: o.filter((x) => x.status === 'doing').length,
    submitted: o.filter((x) => x.status === 'submitted').length,
    rework: o.filter((x) => x.status === 'rework').length,
    passed: o.filter((x) => x.status === 'passed').length,
    reworkTotal: o.reduce((a, x) => a + (x.reworkTimes || 0), 0),
  }
})

let seq = 1
export function nextOrderId() {
  const nums = workState.orders
    .map((o) => parseInt(String(o.id).replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n))
  const max = nums.length ? Math.max(...nums) : 2400
  return 'WO-' + String(max + 1)
}

let actSeq = 1
export function logActivity(who, what, target, kind) {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  workState.activity.unshift({
    at: `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
    who,
    what,
    target,
    kind,
    _k: actSeq++,
  })
  if (workState.activity.length > 80) workState.activity.length = 80
  persist()
}

export function createOrder(form) {
  const id = nextOrderId()
  const order = {
    id,
    code: '提-' + id.slice(3),
    title: form.title,
    deviceModel: form.deviceModel,
    deviceType: form.deviceType,
    quantity: Number(form.quantity) || 1,
    exposed: form.exposed
      .split(/[,，、\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    note: form.note,
    priority: form.priority || '中',
    requester: form.requester || '培训中心 · 教务组',
    workshop: form.workshop || '总装一车间',
    status: 'todo',
    assignee: null,
    assignedAt: null,
    submittedAt: null,
    reviewedAt: null,
    reviewer: null,
    qcNote: '',
    reworkTimes: 0,
    createdAt: todayISO(),
    due: form.due || todayISO(),
    linkedPreset: form.linkedPreset || null,
    stats: null,
  }
  workState.orders.unshift(order)
  logActivity(me.value?.name ?? '系统', '新建需求单', `${id} ${order.title}`, 'create')
  persist()
  return order
}

export function assignOrder(orderId, personId) {
  const o = workState.orders.find((x) => x.id === orderId)
  if (!o) return
  o.assignee = personId
  o.assignedAt = todayISO()
  o.status = o.status === 'rework' ? 'rework' : 'doing'
  logActivity(me.value?.name ?? '系统', '派工', `${o.id} → ${peopleById.value[personId]?.name}`, 'assign')
  persist()
}

export function submitForQC(orderId, stats) {
  const o = workState.orders.find((x) => x.id === orderId)
  if (!o) return
  o.status = 'submitted'
  o.submittedAt = todayISO()
  if (stats) o.stats = stats
  logActivity(me.value?.name ?? '系统', '提交质检', `${o.id} ${o.title}`, 'submit')
  persist()
}

export function reviewOrder(orderId, pass, note) {
  const o = workState.orders.find((x) => x.id === orderId)
  if (!o) return
  o.reviewedAt = todayISO()
  o.reviewer = workState.currentUser
  o.qcNote = note || ''
  if (pass) {
    o.status = 'passed'
    logActivity(me.value?.name ?? '系统', '质检通过', `${o.id} ${o.title}`, 'pass')
  } else {
    o.status = 'rework'
    o.reworkTimes = (o.reworkTimes || 0) + 1
    logActivity(me.value?.name ?? '系统', '质检打回', `${o.id} ${o.title}`, 'rework')
  }
  persist()
}

export function resetWorkflow() {
  workState.people = JSON.parse(JSON.stringify(seedPeople))
  workState.orders = JSON.parse(JSON.stringify(seedOrders))
  workState.activity = JSON.parse(JSON.stringify(seedActivity))
  persist()
}
