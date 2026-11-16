<template>
  <div class="page">
    <div class="page-hd">
      <div>
        <h2>完成量与返工看板</h2>
        <p>按师傅统计通过量、在制量、返工次数；返工次数越多，说明交出去还得再磨一遍</p>
      </div>
      <div class="right">
        <div class="seg">
          <button :class="{ on: mode === 'person' }" @click="mode = 'person'">按人</button>
          <button :class="{ on: mode === 'order' }" @click="mode = 'order'">按单</button>
        </div>
      </div>
    </div>

    <div class="stat-strip">
      <div class="kpi" style="--tone:#59c98a">
        <div class="k">累计完成</div>
        <div class="v">{{ totals.done }}<small>单</small></div>
      </div>
      <div class="kpi" style="--tone:#5b9df5">
        <div class="k">在制</div>
        <div class="v">{{ totals.active }}<small>单</small></div>
      </div>
      <div class="kpi" style="--tone:#ef6a62">
        <div class="k">返工合计</div>
        <div class="v">{{ totals.reworks }}<small>次</small></div>
      </div>
      <div class="kpi" style="--tone:#a98bf0">
        <div class="k">一次性通过率</div>
        <div class="v">{{ totals.firstPass }}<small>%</small></div>
      </div>
      <div class="kpi" style="--tone:#56c9d6">
        <div class="k">平均交付</div>
        <div class="v">{{ totals.avgDays }}<small>天</small></div>
      </div>
    </div>

    <template v-if="mode === 'person'">
      <div class="board-grid">
        <div v-for="p in stats" :key="p.id" class="person-card">
          <div class="person-hd">
            <span class="avatar">{{ p.avatar }}</span>
            <div>
              <div class="nm">{{ p.name }}</div>
              <div class="tm">{{ p.team }} · {{ p.role }}</div>
            </div>
            <span class="rk2">{{ rankOf(p) }}</span>
          </div>
          <div class="mini-stats">
            <div class="mini">
              <div class="k">完成</div>
              <div class="v good">{{ p.done }}</div>
            </div>
            <div class="mini">
              <div class="k">在制</div>
              <div class="v">{{ p.active }}</div>
            </div>
            <div class="mini">
              <div class="k">返工</div>
              <div class="v" :class="p.reworks > 0 ? 'bad' : ''">{{ p.reworks }}</div>
            </div>
          </div>
          <div class="progress"><i :style="{ width: (p.total ? Math.round((p.done / p.total) * 100) : 0) + '%' }"></i></div>
          <div class="prog-lbl">
            <span>通过率 {{ p.passRate }}%</span>
            <span>总承接 {{ p.total }} 单</span>
          </div>
          <div class="person-orders">
            <div v-for="o in ordersOf(p.id)" :key="o.id" class="po">
              <span class="dot-s" :style="{ background: toneColor(o.status) }"></span>
              <span class="tx" :title="o.title">{{ o.id }} {{ o.title }}</span>
              <span v-if="o.reworkTimes" class="rw">返 {{ o.reworkTimes }}</span>
            </div>
            <div v-if="!ordersOf(p.id).length" class="po" style="opacity:.4">
              <span class="tx">暂无承接</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:16px">
        <div class="panel-hd"><b>个人明细</b></div>
        <table class="table">
          <thead>
            <tr>
              <th>师傅</th>
              <th>班组</th>
              <th class="num">承接</th>
              <th class="num">完成</th>
              <th class="num">在制</th>
              <th class="num">待质检</th>
              <th class="num">返工次数</th>
              <th class="num">一次性通过率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in stats" :key="p.id">
              <td>{{ p.name }}</td>
              <td class="muted">{{ p.team }}</td>
              <td class="num">{{ p.total }}</td>
              <td class="num good">{{ p.done }}</td>
              <td class="num">{{ p.active }}</td>
              <td class="num">{{ p.pending }}</td>
              <td class="num" :class="{ bad: p.reworks > 0 }">{{ p.reworks }}</td>
              <td class="num">
                <template v-if="finishedOf(p.id)">{{ firstPassOf(p.id) }}%</template>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <div class="panel">
        <div class="panel-hd"><b>按需求单</b><span class="sp"></span><span class="muted" style="font-size:10.5px">共 {{ workState.orders.length }} 单</span></div>
        <table class="table">
          <thead>
            <tr>
              <th>单号</th>
              <th>教具</th>
              <th>设备型号</th>
              <th>状态</th>
              <th>承接</th>
              <th class="num">返工</th>
              <th class="num">体素</th>
              <th class="num">面数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in workState.orders" :key="o.id">
              <td class="mono muted">{{ o.id }}</td>
              <td>{{ o.title }}</td>
              <td class="mono">{{ o.deviceModel }}</td>
              <td><span class="pill" :class="STATUS_TONE[o.status]">{{ STATUS_LABEL[o.status] }}</span></td>
              <td>{{ people[o.assignee]?.name ?? '—' }}</td>
              <td class="num" :class="{ bad: o.reworkTimes > 0 }">{{ o.reworkTimes }}</td>
              <td class="num">{{ o.stats?.voxels?.toLocaleString() ?? '—' }}</td>
              <td class="num">{{ o.stats?.tri?.toLocaleString() ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel" style="margin-top:14px">
        <div class="panel-hd"><b>动态</b></div>
        <div class="panel-bd">
          <div class="activity">
            <div v-for="(a, i) in workState.activity" :key="i" class="act-item">
              <span class="when">{{ a.at }}</span>
              <span class="kind" :style="{ background: kindColor(a.kind) }"></span>
              <span class="what"><span class="who">{{ a.who }}</span> {{ a.what }} <span class="tg">{{ a.target }}</span></span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { workState, boardStats, peopleById, STATUS_LABEL, STATUS_TONE } from '../store/workflow.js'

const mode = ref('person')
const people = peopleById
const stats = computed(() => [...boardStats.value].sort((a, b) => b.done - a.done || a.reworks - b.reworks))

const totals = computed(() => {
  const d = stats.value
  const done = d.reduce((a, p) => a + p.done, 0)
  const active = d.reduce((a, p) => a + p.active, 0)
  const reworks = d.reduce((a, p) => a + p.reworks, 0)
  const totalOrders = d.reduce((a, p) => a + p.total, 0)
  const passedWithNoRework = workState.orders.filter((o) => o.status === 'passed' && o.reworkTimes === 0).length
  const finished = workState.orders.filter((o) => o.status === 'passed').length
  return {
    done,
    active,
    reworks,
    firstPass: finished ? Math.round((passedWithNoRework / finished) * 100) : 0,
    avgDays: (() => {
      const ds = workState.orders
        .filter((o) => o.submittedAt && o.assignedAt)
        .map((o) => (new Date(o.submittedAt) - new Date(o.assignedAt)) / 86400000)
      if (!ds.length) return 0
      return (ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1)
    })(),
  }
})

function rankOf(p) {
  const i = stats.value.findIndex((x) => x.id === p.id)
  return ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][i] ?? String(i + 1)
}

function ordersOf(id) {
  return workState.orders.filter((o) => o.assignee === id)
}

function finishedOf(id) {
  return workState.orders.filter((o) => o.assignee === id && o.status === 'passed').length
}

function firstPassOf(id) {
  const own = workState.orders.filter((o) => o.assignee === id)
  const fin = own.filter((o) => o.status === 'passed')
  if (!fin.length) return 0
  return Math.round((fin.filter((o) => o.reworkTimes === 0).length / fin.length) * 100)
}

function toneColor(s) {
  return { todo: '#4a5666', doing: '#5b9df5', submitted: '#a98bf0', passed: '#59c98a', rework: '#ef6a62' }[s]
}
function kindColor(k) {
  return { rework: '#ef6a62', submit: '#a98bf0', pass: '#59c98a', assign: '#5b9df5', create: '#6d7889' }[k] ?? '#4a5666'
}
</script>

<style scoped>
.page { max-width: 1440px; margin: 0 auto; width: 100%; }
.seg { display: flex; background: #0e131a; border: 1px solid var(--line); border-radius: 7px; padding: 3px; }
.seg button { border: 0; background: transparent; color: var(--text-3); font-size: 11.5px; padding: 5px 14px; border-radius: 5px; cursor: pointer; }
.seg button.on { background: var(--panel-3); color: var(--text); }
</style>
