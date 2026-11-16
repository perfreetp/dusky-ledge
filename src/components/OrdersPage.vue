<template>
  <div class="page">
    <div class="page-hd">
      <div>
        <h2>车间需求单</h2>
        <p>培训中心提设备型号与必须露出的部件，组长派给建模师傅，交付后质检抽查</p>
      </div>
      <div class="right">
        <button class="btn" @click="openNew">新建需求单</button>
        <button class="btn ghost" @click="askReset">恢复示例数据</button>
      </div>
    </div>

    <div class="stat-strip">
      <div class="kpi" style="--tone:#4a5666"><div class="k">全部需求单</div><div class="v">{{ s.total }}</div></div>
      <div class="kpi" style="--tone:#5b9df5"><div class="k">待派工</div><div class="v">{{ s.todo }}</div></div>
      <div class="kpi" style="--tone:#56c9d6"><div class="k">建模中</div><div class="v">{{ s.doing }}</div></div>
      <div class="kpi" style="--tone:#a98bf0"><div class="k">待质检</div><div class="v">{{ s.submitted }}</div></div>
      <div class="kpi" style="--tone:#ef6a62"><div class="k">返工中</div><div class="v">{{ s.rework }}</div></div>
      <div class="kpi" style="--tone:#59c98a"><div class="k">已通过</div><div class="v">{{ s.passed }}</div></div>
    </div>

    <div class="filter-row">
      <div class="tabs" style="margin:0; width: min(560px, 100%)">
        <button v-for="f in filters" :key="f.id" :class="{ on: filter === f.id }" @click="filter = f.id">
          {{ f.label }}
          <span v-if="f.count != null" class="fc">{{ f.count }}</span>
        </button>
      </div>
      <input class="inp search" v-model="q" placeholder="搜型号 / 标题 / 单号" />
    </div>

    <div class="order-list">
      <div v-for="o in list" :key="o.id" class="order">
        <div>
          <div class="t">
            <span class="oid">{{ o.id }}</span>
            {{ o.title }}
            <span class="pill" :class="STATUS_TONE[o.status]">{{ STATUS_LABEL[o.status] }}</span>
            <span class="prio" :class="o.priority">{{ o.priority }}优先</span>
            <span v-if="o.reworkTimes > 0" class="pill red">返工 {{ o.reworkTimes }} 次</span>
          </div>
          <div class="meta">
            <span>设备型号 <b>{{ o.deviceModel }}</b></span>
            <span>{{ o.deviceType }}</span>
            <span>数量 <b>{{ o.quantity }}</b></span>
            <span>车间 <b>{{ o.workshop }}</b></span>
            <span v-if="o.assignee">承接 <b>{{ people[o.assignee]?.name }}</b></span>
            <span v-else>承接 <b class="dim">未派工</b></span>
            <span>交期 <b>{{ o.due }}</b></span>
            <span v-if="o.stats" class="mono" style="color:#6d7889">{{ o.stats.voxels }} 格 / {{ o.stats.tri }} 面</span>
          </div>
          <div class="expose">
            <span class="exp-label">要露出</span>
            <span v-for="(e, i) in o.exposed" :key="i" class="exp-chip">{{ e }}</span>
          </div>
          <div class="qc-note" v-if="o.qcNote">
            <b>质检意见 · {{ people[o.reviewer]?.name ?? '质检' }}</b>：{{ o.qcNote }}
          </div>
        </div>
        <div class="act">
          <button v-if="o.status === 'todo'" class="btn sm primary" @click="openAssign(o)">派工</button>
          <button v-else-if="o.status === 'rework'" class="btn sm" @click="openAssign(o)">重新派工</button>
          <button v-if="o.status === 'submitted'" class="btn sm primary" @click="openReview(o)">质检</button>
          <button class="btn sm ghost" @click="openDetail(o)">详情</button>
        </div>
      </div>
      <div v-if="!list.length" class="empty">没有匹配的需求单</div>
    </div>

    <!-- 新建 -->
    <div v-if="dialog === 'new'" class="overlay-mask" @click.self="dialog = null">
      <div class="dialog">
        <div class="dlg-hd"><h3>新建需求单</h3><button class="x" @click="dialog = null">×</button></div>
        <div class="dlg-bd">
          <div class="field">
            <label>教具名称<span class="req">*</span></label>
            <input class="inp" v-model="form.title" placeholder="例：主轴箱剖切教具" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>设备型号<span class="req">*</span></label>
              <input class="inp mono" v-model="form.deviceModel" placeholder="VMC-850" />
            </div>
            <div class="field">
              <label>设备名称</label>
              <input class="inp" v-model="form.deviceType" placeholder="立式加工中心" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>数量</label>
              <input class="inp mono" type="number" min="1" v-model.number="form.quantity" />
            </div>
            <div class="field">
              <label>交期</label>
              <input class="inp mono" type="date" v-model="form.due" />
            </div>
          </div>
          <div class="field">
            <label>必须露出的部件<span class="req">*</span></label>
            <input class="inp" v-model="form.exposed" placeholder="用逗号分隔，例：主轴箱齿轮组, Z 向丝杠, 防护门视窗" />
            <div class="hintline">质检会逐条对照这一栏抽查，写具体到能看见的零件。</div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>来源车间</label>
              <select class="sel" v-model="form.workshop">
                <option v-for="w in workshops" :key="w">{{ w }}</option>
              </select>
            </div>
            <div class="field">
              <label>优先级</label>
              <select class="sel" v-model="form.priority">
                <option>高</option><option>中</option><option>低</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>补充说明</label>
            <textarea class="ta" v-model="form.note" placeholder="剖切位置、保留比例、配色要求…"></textarea>
          </div>
          <div class="field">
            <label>绑定建模预设</label>
            <select class="sel" v-model="form.linkedPreset">
              <option :value="null">不绑定</option>
              <option v-for="p in PRESETS" :key="p.id" :value="p.id">{{ p.name }} {{ p.model }}</option>
            </select>
          </div>
        </div>
        <div class="dlg-ft">
          <button class="btn ghost" @click="dialog = null">取消</button>
          <button class="btn primary" @click="submitNew">提交需求单</button>
        </div>
      </div>
    </div>

    <!-- 派工 -->
    <div v-if="dialog === 'assign'" class="overlay-mask" @click.self="dialog = null">
      <div class="dialog">
        <div class="dlg-hd">
          <h3>派工</h3>
          <span class="sub">{{ current?.id }} {{ current?.title }}</span>
          <button class="x" @click="dialog = null">×</button>
        </div>
        <div class="dlg-bd">
          <div class="lbl">要露出的部件（师傅按此建模）</div>
          <div class="expose" style="margin-bottom:14px">
            <span v-for="(e, i) in current?.exposed" :key="i" class="exp-chip">{{ e }}</span>
          </div>
          <div class="lbl">选择承接师傅</div>
          <div class="person-pick">
            <button
              v-for="p in masters"
              :key="p.id"
              class="pp"
              :class="{ on: picked === p.id }"
              @click="picked = p.id"
            >
              <span class="avatar">{{ p.avatar }}</span>
              <span class="pn">{{ p.name }}</span>
              <span class="pt">{{ p.team }}</span>
              <span class="pw mono">在制 {{ load[p.id]?.active ?? 0 }}</span>
            </button>
          </div>
        </div>
        <div class="dlg-ft">
          <button class="btn ghost" @click="dialog = null">取消</button>
          <button class="btn primary" :disabled="!picked" @click="doAssign">确认派工</button>
        </div>
      </div>
    </div>

    <!-- 质检 -->
    <div v-if="dialog === 'review'" class="overlay-mask" @click.self="dialog = null">
      <div class="dialog">
        <div class="dlg-hd">
          <h3>质检抽查</h3>
          <span class="sub">{{ current?.id }} {{ current?.title }}</span>
          <button class="x" @click="dialog = null">×</button>
        </div>
        <div class="dlg-bd">
          <div class="checklist">
            <div class="lbl">逐条核对需求单</div>
            <label v-for="(e, i) in current?.exposed" :key="i" class="chk">
              <input type="checkbox" v-model="checked[i]" />
              <span>{{ e }}</span>
            </label>
          </div>
          <div class="field" style="margin-top:14px">
            <label>质检意见</label>
            <textarea class="ta" v-model="reviewNote" placeholder="不合格要写清哪一条没做到、怎么改"></textarea>
          </div>
          <div class="review-meta">
            <span>承接师傅 <b>{{ people[current?.assignee]?.name }}</b></span>
            <span>提交时间 <b>{{ current?.submittedAt }}</b></span>
            <span>历史返工 <b :class="{ bad: current?.reworkTimes > 0 }">{{ current?.reworkTimes }} 次</b></span>
          </div>
        </div>
        <div class="dlg-ft">
          <button class="btn ghost" @click="dialog = null">取消</button>
          <button class="btn danger" @click="doReview(false)">不合格，打回返工</button>
          <button class="btn primary" @click="doReview(true)">通过</button>
        </div>
      </div>
    </div>

    <!-- 详情 -->
    <div v-if="dialog === 'detail'" class="overlay-mask" @click.self="dialog = null">
      <div class="dialog">
        <div class="dlg-hd">
          <h3>{{ current?.title }}</h3>
          <span class="sub">{{ current?.id }}</span>
          <button class="x" @click="dialog = null">×</button>
        </div>
        <div class="dlg-bd">
          <div class="kv-grid">
            <div><span class="lbl">设备型号</span><b class="mono">{{ current?.deviceModel }}</b></div>
            <div><span class="lbl">设备名称</span><b>{{ current?.deviceType }}</b></div>
            <div><span class="lbl">数量</span><b class="mono">{{ current?.quantity }}</b></div>
            <div><span class="lbl">车间</span><b>{{ current?.workshop }}</b></div>
            <div><span class="lbl">提交人</span><b>{{ current?.requester }}</b></div>
            <div><span class="lbl">提报日期</span><b class="mono">{{ current?.createdAt }}</b></div>
            <div><span class="lbl">交期</span><b class="mono">{{ current?.due }}</b></div>
            <div><span class="lbl">状态</span><span class="pill" :class="STATUS_TONE[current?.status]">{{ STATUS_LABEL[current?.status] }}</span></div>
          </div>
          <div class="divider"></div>
          <div class="lbl">要露出的部件</div>
          <div class="expose" style="margin-bottom:12px">
            <span v-for="(e, i) in current?.exposed" :key="i" class="exp-chip">{{ e }}</span>
          </div>
          <div class="lbl">补充说明</div>
          <p class="note-text">{{ current?.note || '无' }}</p>
          <div v-if="current?.qcNote">
            <div class="lbl" style="margin-top:12px">质检意见</div>
            <div class="qc-note">{{ current.qcNote }}</div>
          </div>
          <div v-if="current?.linkedPreset">
            <div class="lbl" style="margin-top:12px">关联建模预设</div>
            <p class="note-text mono">{{ PRESETS.find(p => p.id === current.linkedPreset)?.name }} / {{ PRESETS.find(p => p.id === current.linkedPreset)?.model }}</p>
          </div>
        </div>
        <div class="dlg-ft">
          <button class="btn ghost" @click="dialog = null">关闭</button>
          <button v-if="current?.status === 'submitted'" class="btn primary" @click="openReview(current)">去质检</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import {
  workState,
  summary as s,
  boardStats,
  peopleById,
  STATUS_LABEL,
  STATUS_TONE,
  createOrder,
  assignOrder,
  reviewOrder,
  resetWorkflow,
  persist,
} from '../store/workflow.js'
import { PRESETS } from '../voxel/presets.js'
import { editorState as es, loadPreset } from '../store/editorStore.js'

defineProps({ nav: Object })

const people = peopleById
const load = computed(() => Object.fromEntries(boardStats.value.map((b) => [b.id, b])))
const masters = computed(() => workState.people.filter((p) => p.role === '师傅'))
const workshops = ['总装一车间', '总装二车间', '机加工车间', '冲压车间', '注塑车间', '工装车间', '物流仓']

const filter = ref('all')
const q = ref('')
const dialog = ref(null)
const current = ref(null)
const picked = ref(null)
const reviewNote = ref('')
const checked = ref([])

const filters = computed(() => [
  { id: 'all', label: '全部', count: s.value.total },
  { id: 'todo', label: '待派工', count: s.value.todo },
  { id: 'active', label: '在制', count: s.value.doing + s.value.rework },
  { id: 'submitted', label: '待质检', count: s.value.submitted },
  { id: 'passed', label: '已通过', count: s.value.passed },
])

const list = computed(() => {
  let arr = workState.orders
  if (filter.value === 'todo') arr = arr.filter((o) => o.status === 'todo')
  else if (filter.value === 'active') arr = arr.filter((o) => o.status === 'doing' || o.status === 'rework')
  else if (filter.value === 'submitted') arr = arr.filter((o) => o.status === 'submitted')
  else if (filter.value === 'passed') arr = arr.filter((o) => o.status === 'passed')
  if (q.value.trim()) {
    const t = q.value.trim().toLowerCase()
    arr = arr.filter(
      (o) =>
        o.title.toLowerCase().includes(t) ||
        o.deviceModel.toLowerCase().includes(t) ||
        o.id.toLowerCase().includes(t)
    )
  }
  return arr
})

const form = reactive({
  title: '',
  deviceModel: '',
  deviceType: '',
  quantity: 1,
  exposed: '',
  workshop: '总装一车间',
  priority: '中',
  note: '',
  due: '',
  linkedPreset: null,
})

function openNew() {
  Object.assign(form, {
    title: '',
    deviceModel: '',
    deviceType: '',
    quantity: 1,
    exposed: '',
    workshop: '总装一车间',
    priority: '中',
    note: '',
    due: '',
    linkedPreset: null,
  })
  dialog.value = 'new'
}

function submitNew() {
  if (!form.title.trim() || !form.deviceModel.trim()) {
    window.alert('教具名称与设备型号必填')
    return
  }
  if (!form.exposed.trim()) {
    window.alert('请至少写一个必须露出的部件')
    return
  }
  createOrder({ ...form })
  dialog.value = null
}

function openAssign(o) {
  current.value = o
  picked.value = o.assignee || null
  dialog.value = 'assign'
}

function doAssign() {
  assignOrder(current.value.id, picked.value)
  dialog.value = null
}

function openReview(o) {
  current.value = o
  checked.value = (o.exposed || []).map(() => true)
  reviewNote.value = ''
  dialog.value = 'review'
}

function doReview(pass) {
  if (!pass && !reviewNote.value.trim()) {
    window.alert('打回必须填写质检意见，说明哪里没做到')
    return
  }
  reviewOrder(current.value.id, pass, reviewNote.value)
  dialog.value = null
}

function openDetail(o) {
  current.value = o
  dialog.value = 'detail'
}

function askReset() {
  if (!window.confirm('恢复成示例数据？当前的新建与派工记录会被清空。')) return
  resetWorkflow()
}
</script>

<style scoped>
.filter-row { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.page { max-width: 1320px; margin: 0 auto; width: 100%; }
.search { width: 220px; }
.fc { font-family: var(--mono); font-size: 9.5px; opacity: .7; margin-left: 3px; }
.exp-label { font-size: 10px; color: var(--text-3); align-self: center; letter-spacing: .5px; }
.person-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.pp {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer;
  background: #121821; border: 1px solid var(--line); color: var(--text-2); text-align: left;
}
.pp:hover { background: #1a222e; }
.pp.on { border-color: #8a6a34; background: #211c13; color: var(--text); }
.pp .pn { font-size: 12.5px; color: var(--text); }
.pp .pt { font-size: 10px; color: var(--text-3); }
.pp .pw { margin-left: auto; font-size: 10px; color: var(--text-3); }
.checklist { background: #10161e; border-radius: 7px; padding: 10px 12px; }
.chk { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 0; cursor: pointer; color: var(--text-2); }
.chk input { accent-color: var(--accent); }
.review-meta { display: flex; gap: 16px; font-size: 11px; color: var(--text-3); margin-top: 12px; flex-wrap: wrap; }
.review-meta b { color: var(--text-2); font-weight: 500; }
.review-meta b.bad { color: var(--red); }
.kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.kv-grid > div { display: flex; flex-direction: column; gap: 2px; }
.kv-grid b { font-weight: 500; font-size: 12.5px; }
.note-text { font-size: 12px; color: var(--text-2); line-height: 1.65; margin: 4px 0 0; }
</style>
