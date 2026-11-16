<template>
  <div class="panel">
    <div class="panel-hd"><b>分组</b><span class="sp"></span>
      <button class="btn sm ghost" @click="allGroupsVisible">全部显</button>
    </div>
    <div class="panel-bd tight">
      <div
        v-for="g in GROUPS"
        :key="g.id"
        class="grp"
        :class="{ cur: es.group === g.id }"
        @click="setGroup(g.id)"
      >
        <span class="sw" :style="{ background: g.color }"></span>
        <span class="nm">
          {{ g.name }}
          <small>{{ g.en }} · {{ (es.stats.byGroup[g.id] || 0).toLocaleString() }}</small>
        </span>
        <span class="num">{{ pct(g.id) }}%</span>
        <button
          class="solo"
          :class="{ on: es.soloGroup === g.id }"
          :title="es.soloGroup === g.id ? '取消单独显示' : '只看这一组'"
          @click.stop="soloGroupToggle(g.id)"
        >S</button>
        <button
          class="eye"
          :class="{ off: !es.visible[g.id] }"
          :title="es.visible[g.id] ? '隐藏' : '显示'"
          @click.stop="toggleVisible(g.id)"
        >
          <svg v-if="es.visible[g.id]" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8z" />
            <circle cx="8" cy="8" r="1.8" />
          </svg>
          <svg v-else viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M2 2l12 12M6.2 4.3A6.6 6.6 0 018 4c4 0 6.5 4 6.5 4a11 11 0 01-2.4 2.6M4.3 5.6A11 11 0 001.5 8s2.5 4 6.5 4c.7 0 1.4-.1 2-.3" />
          </svg>
        </button>
      </div>
      <div class="grp-hint">
        <span class="dot" :style="{ background: GROUPS[es.group].color }"></span>
        当前落笔：<b>{{ GROUPS[es.group].name }}</b> · {{ GROUPS[es.group].desc }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { editorState as es, setGroup, toggleVisible, soloGroupToggle, allGroupsVisible, meshCache } from '../store/editorStore.js'
import { GROUPS } from '../store/materials.js'

function pct(i) {
  const byGroup = meshCache.value.mesh?.triByGroup ?? [0, 0, 0, 0]
  const total = byGroup.reduce((a, b) => a + b, 0) || 1
  return Math.round((byGroup[i] / total) * 100)
}
</script>

<style scoped>
.grp-hint {
  display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--text-3);
  margin-top: 6px; padding: 6px 7px 2px; border-top: 1px solid var(--line); line-height: 1.5;
}
.grp-hint b { color: var(--text-2); font-weight: 500; }
.grp-hint .dot { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; }
</style>
