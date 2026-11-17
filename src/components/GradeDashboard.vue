<template>
  <div class="page">
    <h2 class="page-title">成绩与常见错法汇总</h2>

    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);max-width:860px;margin-bottom:16px">
      <div class="card" style="text-align:center">
        <div style="font-size:26px;font-weight:800">{{ store.submissions.length }}</div><div class="muted small">提交总数</div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:26px;font-weight:800">{{ reviewed.length }}</div><div class="muted small">已复核</div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:26px;font-weight:800">{{ avgScore }}</div><div class="muted small">平均最终分</div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:26px;font-weight:800">{{ avgAuto }}</div><div class="muted small">平均机器初评</div>
      </div>
    </div>

    <div class="split">
      <!-- 成绩表 -->
      <div class="card">
        <h4>成绩明细</h4>
        <table>
          <thead><tr><th>学员</th><th>任务</th><th>初评</th><th>最终</th><th>分差</th></tr></thead>
          <tbody>
            <tr v-for="s in store.submissions" :key="s.id">
              <td>{{ s.studentName }}</td>
              <td class="truncate">{{ taskTitle(s.taskId) }}</td>
              <td>{{ s.autoScore }}</td>
              <td><b>{{ s.status === 'reviewed' ? s.teacherScore : '—' }}</b></td>
              <td>
                <span v-if="s.status === 'reviewed'" :style="{ color: s.teacherScore - s.autoScore >= 0 ? 'var(--ok)' : 'var(--danger)' }">
                  {{ s.teacherScore - s.autoScore >= 0 ? '+' : '' }}{{ s.teacherScore - s.autoScore }}
                </span>
                <span v-else class="muted">待评</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 常见错法 -->
      <div class="card">
        <h4>常见错法 Top（共 {{ mistake.total }} 份提交）</h4>
        <div class="stack" style="margin-top:10px">
          <div v-for="(m, i) in mistake.items" :key="m.key">
            <div class="row" style="align-items:center">
              <span style="flex:2">{{ i + 1 }}. {{ m.label }}</span>
              <b style="width:48px;text-align:right">{{ m.count }} 次</b>
              <span class="muted small" style="width:52px;text-align:right">{{ Math.round(m.ratio * 100) }}%</span>
            </div>
            <div class="bar" style="margin-top:4px"><i :style="{ width: Math.round(m.ratio * 100) + '%' }"></i></div>
          </div>
          <p v-if="!mistake.total" class="muted small">暂无提交数据</p>
        </div>

        <h4 style="margin-top:18px">教师评语摘录</h4>
        <div class="stack">
          <div v-for="s in reviewedWithComments" :key="s.id" class="section small">
            <b>{{ s.studentName }}</b>（最终 {{ s.teacherScore }} 分）：{{ s.teacherComment }}
          </div>
          <p v-if="!reviewedWithComments.length" class="muted small">还没有评语</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../lib/store.js'
import { mistakeSummary } from '../lib/grading.js'

const mistake = computed(() => mistakeSummary(store.submissions, store.tasks))
const reviewed = computed(() => store.submissions.filter(s => s.status === 'reviewed'))
const reviewedWithComments = computed(() => reviewed.value.filter(s => s.teacherComment))
const avgScore = computed(() => {
  const arr = reviewed.value
  return arr.length ? Math.round(arr.reduce((s, x) => s + x.teacherScore, 0) / arr.length) : '—'
})
const avgAuto = computed(() => store.submissions.length
  ? Math.round(store.submissions.reduce((s, x) => s + x.autoScore, 0) / store.submissions.length) : '—')
function taskTitle (id) { return store.tasks.find(t => t.id === id)?.title || '—' }
</script>
