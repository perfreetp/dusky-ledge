<template>
  <div class="page">
    <AppHeader />
    <div class="content">
      <h2>主管看板 — 版本与分段长度统计</h2>
      <el-row :gutter="16">
        <el-col :span="8" v-for="card in cards" :key="card.label">
          <el-card class="stat-card">
            <div class="stat-num">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card class="block">
        <template #header>各项目版本数</template>
        <v-chart class="chart" :option="versionOption" autoresize />
      </el-card>

      <el-card class="block">
        <template #header>项目分段长度（最新版本，mm）</template>
        <v-chart class="chart tall" :option="segmentOption" autoresize />
      </el-card>

      <el-card class="block">
        <template #header>跨项目汇总</template>
        <el-table :data="summary" size="small" stripe>
          <el-table-column prop="projectCode" label="项目编号" width="160" />
          <el-table-column label="版本" width="80" prop="version" />
          <el-table-column label="总长 mm" width="120">
            <template #default="{ row }">{{ row.totalLength.toFixed(1) }}</template>
          </el-table-column>
          <el-table-column label="曲率超差 mm" width="140">
            <template #default="{ row }">
              <span :style="{ color: row.curvatureViolationLength > 0 ? '#d40000' : '#67c23a' }">
                {{ row.curvatureViolationLength.toFixed(1) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="越界 mm" width="120">
            <template #default="{ row }">{{ row.envelopeViolationLength.toFixed(1) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { api } from '../api/client.js';
import AppHeader from '../components/AppHeader.vue';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent]);

interface OverviewRow {
  projectCode: string;
  projectName: string;
  status: string;
  versionCount: number;
}
const overview = ref<OverviewRow[]>([]);
const summary = ref<unknown[]>([]);
const segmentRows = ref<
  { version: number; segmentName: string; length: number; projectId: string }[]
>([]);

const cards = computed(() => [
  { label: '项目总数', value: overview.value.length },
  {
    label: '待审查',
    value: overview.value.filter((p) => p.status === 'submitted').length,
  },
  {
    label: '累计版本',
    value: overview.value.reduce((s, p) => s + p.versionCount, 0),
  },
]);

const versionOption = computed(() => ({
  tooltip: {},
  xAxis: { type: 'category', data: overview.value.map((p) => p.projectCode) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      type: 'bar',
      data: overview.value.map((p) => p.versionCount),
      itemStyle: { color: '#457b9d' },
      label: { show: true, position: 'top' },
    },
  ],
}));

const segmentOption = computed(() => {
  // 每项目取最大版本的分段
  const latestByProject = new Map<string, number>();
  for (const r of segmentRows.value) {
    latestByProject.set(r.projectId, Math.max(latestByProject.get(r.projectId) ?? 0, r.version));
  }
  const rows = segmentRows.value.filter(
    (r) => latestByProject.get(r.projectId) === r.version,
  );
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { top: 40 },
    xAxis: { type: 'category', data: rows.map((r) => r.segmentName), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: 'mm' },
    series: [{ type: 'bar', data: rows.map((r) => r.length), itemStyle: { color: '#2a9d8f' } }],
  };
});

onMounted(async () => {
  overview.value = (await api.statsOverview()) as OverviewRow[];
  summary.value = await api.statsSummary();
  const all = await Promise.all(overview.value.map((p) => api.segmentStats((p as unknown as { projectId: string }).projectId)));
  segmentRows.value = all
    .flat()
    .map((r) => r as { version: number; segmentName: string; length: number; projectId: string });
});
</script>

<style scoped>
.content {
  padding: 18px 24px;
}
.stat-card {
  text-align: center;
}
.stat-num {
  font-size: 30px;
  font-weight: 700;
  color: #1d3557;
}
.stat-label {
  color: #909399;
  margin-top: 4px;
}
.block {
  margin-top: 18px;
}
.chart {
  height: 300px;
}
.chart.tall {
  height: 380px;
}
</style>
