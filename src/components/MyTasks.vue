<template>
  <div class="panel">
    <div class="panel-hd">
      <b>我的工序</b>
      <span class="sp"></span>
      <span class="pill" :class="rolePill">{{ me?.role }}</span>
    </div>
    <div class="panel-bd tight">
      <div v-if="!visible.length" class="mine-empty">
        {{ me?.role === '组长' ? '暂时没有待派工或待重新派工的单' : me?.role === '质检' ? '没有待检的提交' : '暂无派给你的单' }}
      </div>
      <div v-for="o in visible" :key="o.id" class="mine-item">
        <div class="mi-hd">
          <span class="oid">{{ o.id }}</span>
          <span class="pill" :class="STATUS_TONE[o.status]">{{ STATUS_LABEL[o.status] }}</span>
        </div>
        <div class="mi-t">{{ o.title }}</div>
        <div class="mi-m mono">{{ o.deviceModel }} · 交期 {{ o.due }}</div>
        <div class="mi-act">
          <template v-if="isLead">
            <button class="btn sm primary" @click="$emit('goto-orders')">去派工</button>
          </template>
          <template v-else-if="isQC">
            <button class="btn sm primary" @click="$emit('goto-orders')">去质检</button>
          </template>
          <template v-else-if="o.assignee === workState.currentUser && (o.status === 'doing' || o.status === 'rework')">
            <button class="btn sm" @click="linkModel(o)">载入模型</button>
            <button class="btn sm primary" @click="$emit('submit', o)">提交质检</button>
          </template>
        </div>
      </div>
      <div class="mine-foot">
        <button class="btn sm full ghost" @click="$emit('goto-board')">看完成量与返工 →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { workState, me, isLead, isQC, STATUS_LABEL, STATUS_TONE } from '../store/workflow.js'

const emit = defineEmits(['goto-orders', 'goto-board', 'goto-workbench', 'submit', 'load-preset'])

const visible = computed(() => {
  if (isLead.value) {
    return workState.orders.filter((o) => o.status === 'todo' || o.status === 'rework').slice(0, 4)
  }
  if (isQC.value) {
    return workState.orders.filter((o) => o.status === 'submitted').slice(0, 4)
  }
  return workState.orders.filter((o) => o.assignee === workState.currentUser).slice(0, 4)
})

const rolePill = computed(() => (isLead.value ? 'blue' : isQC.value ? 'violet' : 'green'))

function linkModel(o) {
  if (o.linkedPreset) emit('load-preset', o.linkedPreset)
  emit('goto-workbench')
}
</script>

<style scoped>
.mine-empty { font-size: 11px; color: var(--text-3); padding: 8px 4px; line-height: 1.5; }
.mine-item { border-bottom: 1px solid var(--line); padding: 7px 2px; }
.mine-item:last-of-type { border-bottom: 0; }
.mi-hd { display: flex; align-items: center; justify-content: space-between; }
.mi-t { font-size: 12px; margin-top: 3px; }
.mi-m { font-size: 9.5px; color: var(--text-3); margin-top: 2px; }
.mi-act { display: flex; gap: 4px; margin-top: 6px; }
.mi-act .btn { flex: 1; font-size: 10.5px; padding: 4px 2px; }
.mine-foot { margin-top: 8px; }
</style>
