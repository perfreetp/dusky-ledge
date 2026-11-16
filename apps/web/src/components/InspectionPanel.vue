<template>
  <div class="inspection">
    <el-descriptions :column="1" border size="small">
      <el-descriptions-item label="总长度">
        {{ fmt(output.evaluation.totalLength) }} mm
      </el-descriptions-item>
      <el-descriptions-item label="最小弯曲半径">
        <span :class="{ bad: isRadiusBad }">
          {{ output.inspection.minBendRadius === Infinity ? '∞' : fmt(output.inspection.minBendRadius) }} mm
        </span>
        <span class="hint">（允许 ≥ {{ fmt(rules.bendRadiusFactor * rules.outerDiameter) }}）</span>
      </el-descriptions-item>
      <el-descriptions-item label="实测最小层间隙">
        <span :class="{ bad: !output.gap.pass }">{{ fmt(output.gap.minMeasuredGap) }} mm</span>
        <span class="hint">（要求 ≥ {{ fmt(rules.minLayerGap) }}）</span>
      </el-descriptions-item>
      <el-descriptions-item label="展开面积误差">
        {{ output.inspection.unfoldAreaErrorPct?.toFixed(3) ?? '-' }} %
      </el-descriptions-item>
    </el-descriptions>

    <el-alert
      v-if="output.curvature.violations.length"
      type="error"
      show-icon
      :closable="false"
      class="alert"
      :title="`曲率超差 ${output.curvature.violations.length} 段，护套会打折/降级`"
    >
      <div v-for="(v, i) in output.curvature.violations" :key="i" class="violation-row">
        t {{ v.tStart.toFixed(2) }}–{{ v.tEnd.toFixed(2) }} ｜ 长 {{ fmt(v.length) }} mm ｜
        R<sub>min</sub> {{ fmt(v.minBendRadius) }}
      </div>
    </el-alert>

    <el-alert
      v-if="output.gap.innerSelfIntersect"
      type="error"
      show-icon
      :closable="false"
      class="alert"
      title="内偏置自交：弯曲半径小于内半径，该弯段无法成型"
    />

    <el-alert
      v-if="output.envelope && output.envelope.violations.length"
      type="warning"
      show-icon
      :closable="false"
      class="alert"
      :title="`超出关节活动范围 ${output.envelope.violations.length} 段（三维中红色标出）`"
    >
      <div v-for="(v, i) in output.envelope.violations" :key="i" class="violation-row">
        {{ v.jointId }} ｜ t {{ v.tStart.toFixed(2) }}–{{ v.tEnd.toFixed(2) }} ｜ 长 {{ fmt(v.length) }} mm
      </div>
    </el-alert>

    <el-divider>分段长度统计</el-divider>
    <el-table :data="output.inspection.segmentStats" size="small" stripe max-height="260">
      <el-table-column prop="segmentName" label="段名" min-width="150" />
      <el-table-column prop="jointId" label="关节" width="64" />
      <el-table-column label="长度 mm" width="92">
        <template #default="{ row }">{{ fmt(row.length) }}</template>
      </el-table-column>
      <el-table-column label="超曲率 mm" width="96">
        <template #default="{ row }">
          <span :class="{ bad: row.curvatureViolationLength > 0 }">
            {{ fmt(row.curvatureViolationLength) }}
          </span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProjectRules } from '@pg/shared';
import type { PipelineOutput } from '@pg/geom-kernel';

const props = defineProps<{ output: PipelineOutput; rules: ProjectRules }>();

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : String(n));
const isRadiusBad = computed(
  () =>
    props.output.inspection.minBendRadius !== Infinity &&
    props.output.inspection.minBendRadius <
      props.rules.bendRadiusFactor * props.rules.outerDiameter,
);
</script>

<style scoped>
.inspection {
  padding: 4px 0;
}
.bad {
  color: #d40000;
  font-weight: 600;
}
.hint {
  color: #909399;
  font-size: 12px;
}
.alert {
  margin-top: 10px;
}
.violation-row {
  font-size: 12px;
  line-height: 1.6;
}
</style>
