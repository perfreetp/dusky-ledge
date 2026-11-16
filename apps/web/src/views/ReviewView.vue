<template>
  <div class="page">
    <AppHeader />
    <div class="content">
      <h2>审查队列</h2>
      <el-table :data="queue" v-loading="loading" stripe>
        <el-table-column prop="projectCode" label="项目编号" width="170" />
        <el-table-column prop="projectName" label="项目名称" min-width="200" />
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column label="总长 mm" width="110">
          <template #default="{ row }">{{ fmt(row.latest?.inspection?.totalLength) }}</template>
        </el-table-column>
        <el-table-column label="曲率超差段" width="110">
          <template #default="{ row }">
            <el-tag :type="row.latest?.inspection?.curvatureViolations?.length ? 'danger' : 'success'">
              {{ row.latest?.inspection?.curvatureViolations?.length ?? 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="层间隙" width="100">
          <template #default="{ row }">
            <el-tag :type="row.latest?.inspection?.minGapPass ? 'success' : 'danger'">
              {{ fmt(row.latest?.inspection?.minMeasuredGap) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button size="small" @click="openDiff(row)">版本对比</el-button>
            <el-button size="small" type="success" @click="act(row, 'approve')">批准</el-button>
            <el-button size="small" type="danger" plain @click="act(row, 'reject')">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="diffVisible" title="版本差异对比" size="48%">
      <template v-if="diffData">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="插值方式变化">
            {{ diffData.interpolationChanged ? `${diffData.fromInterpolation} → ${diffData.toInterpolation}` : '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="控制点数量">
            {{ diffData.controlPointCount.from }} → {{ diffData.controlPointCount.to }}
          </el-descriptions-item>
          <el-descriptions-item label="总长 mm">
            {{ fmt(diffData.totalLength.from) }} → {{ fmt(diffData.totalLength.to) }}
          </el-descriptions-item>
        </el-descriptions>
        <h4>各段长度变化</h4>
        <el-table :data="diffData.segmentLengthDiff" size="small" stripe>
          <el-table-column prop="segmentName" label="段名" min-width="160" />
          <el-table-column label="旧长度" width="100">
            <template #default="{ row }">{{ fmt(row.from) }}</template>
          </el-table-column>
          <el-table-column label="新长度" width="100">
            <template #default="{ row }">{{ fmt(row.to) }}</template>
          </el-table-column>
          <el-table-column label="差值" width="100">
            <template #default="{ row }">
              <span :style="{ color: row.delta >= 0 ? '#67c23a' : '#f56c6c' }">
                {{ row.delta >= 0 ? '+' : '' }}{{ fmt(row.delta) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '../api/client.js';
import AppHeader from '../components/AppHeader.vue';

const queue = ref<ReviewQueueRow[]>([]);
const loading = ref(false);
const diffVisible = ref(false);
const diffData = ref<DiffData | null>(null);
let current: { projectId: string; version: number } | null = null;

interface ReviewQueueRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  version: number;
  latest: {
    changeNote: string;
    inspection: {
      totalLength: number;
      curvatureViolations: unknown[];
      minGapPass: boolean;
      minMeasuredGap: number;
    } | null;
    createdAt: string;
  } | null;
}

interface DiffData {
  interpolationChanged: boolean;
  fromInterpolation: string;
  toInterpolation: string;
  controlPointCount: { from: number; to: number };
  movedPoints: unknown[];
  weightsChanged: unknown[];
  segmentLengthDiff: { segmentName: string; from: number; to: number; delta: number }[];
  totalLength: { from: number | null; to: number | null };
}

const fmt = (n: unknown) => (typeof n === 'number' ? n.toFixed(1) : '—');

async function load() {
  loading.value = true;
  try {
    queue.value = (await api.reviewQueue()) as ReviewQueueRow[];
  } finally {
    loading.value = false;
  }
}

async function openDiff(row: { projectId: string; version: number }) {
  current = { projectId: row.projectId, version: row.version };
  const from = Math.max(1, row.version - 1);
  diffData.value = (await api.diff(row.projectId, from, row.version)) as DiffData;
  diffVisible.value = true;
}

async function act(row: { projectId: string }, action: 'approve' | 'reject') {
  const { value } = await ElMessageBox.prompt(
    action === 'approve' ? '批准意见（可留空）' : '驳回原因',
    action === 'approve' ? '批准版本' : '驳回版本',
    { inputValue: action === 'approve' ? '检查合格，同意下发车间' : '', confirmButtonText: '确定' },
  ).catch(() => ({ value: null }));
  if (value === null) return;
  if (action === 'approve') await api.approve(row.projectId, value || '同意');
  else await api.reject(row.projectId, value || '不符合要求');
  ElMessage.success(action === 'approve' ? '已批准' : '已驳回');
  load();
}

onMounted(load);
</script>

<style scoped>
.content {
  padding: 18px 24px;
}
h4 {
  margin: 18px 0 8px;
}
</style>
