<template>
  <div class="page">
    <AppHeader />
    <div class="toolbar">
      <el-button @click="$router.back()">← 返回</el-button>
      <strong>平面下料图</strong>
      <el-tag v-if="pattern" type="info">
        {{ pattern.width.toFixed(0) }} × {{ pattern.height.toFixed(0) }} mm ｜ 面积
        {{ pattern.area.toFixed(0) }} mm²
      </el-tag>
      <div class="spacer"></div>
      <el-checkbox v-model="layers.outline">轮廓</el-checkbox>
      <el-checkbox v-model="layers.cut">切口</el-checkbox>
      <el-checkbox v-model="layers.align">对位线</el-checkbox>
      <el-checkbox v-model="layers.grid">网格</el-checkbox>
      <el-checkbox v-model="layers.label">标注</el-checkbox>
      <el-button type="primary" :disabled="!pattern" @click="exportDxf">导出 DXF</el-button>
      <el-button :disabled="!pattern" @click="exportSvg">导出 SVG</el-button>
    </div>
    <div v-loading="loading" class="canvas-wrap">
      <svg v-if="pattern" :viewBox="`0 0 ${pattern.width} ${pattern.height}`" class="flat-svg">
        <rect x="0" y="0" :width="pattern.width" :height="pattern.height" fill="white" />
        <g v-if="layers.grid" stroke="#cfd6dd" stroke-width="0.25">
          <line
            v-for="(g, i) in pattern.gridLines"
            :key="'g' + i"
            :x1="g.from[0]"
            :y1="g.from[1]"
            :x2="g.to[0]"
            :y2="g.to[1]"
          />
        </g>
        <polygon
          v-if="layers.outline"
          :points="pattern.outline.map((p) => p.join(',')).join(' ')"
          fill="rgba(64,158,255,0.08)"
          stroke="#1d3557"
          stroke-width="0.7"
        />
        <g v-if="layers.cut" stroke="#d40000" stroke-width="0.6">
          <line
            v-for="(c, i) in pattern.cutLines"
            :key="'c' + i"
            :x1="c.from[0]"
            :y1="c.from[1]"
            :x2="c.to[0]"
            :y2="c.to[1]"
          />
        </g>
        <g v-if="layers.align" stroke="#2e7d32" stroke-width="0.5">
          <line
            v-for="(a, i) in pattern.alignmentMarks"
            :key="'a' + i"
            :x1="a.from[0]"
            :y1="a.from[1]"
            :x2="a.to[0]"
            :y2="a.to[1]"
          />
        </g>
        <g v-if="layers.label" fill="#303133" font-size="5" font-family="sans-serif">
          <text v-for="(l, i) in pattern.labels" :key="'l' + i" :x="l.position[0]" :y="l.position[1]">
            {{ l.text }}
          </text>
        </g>
      </svg>
      <el-empty v-else-if="!loading" description="该项目还没有可展开的版本" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FlatPattern, ProjectVersionDto } from '@pg/shared';
import {
  computeSegmentRanges,
  evaluateSpline,
  buildTube,
  unfoldTube,
} from '@pg/geom-kernel';
import { buildDxf, buildSvg, downloadTextFile } from '@pg/export';
import { api } from '../api/client.js';
import AppHeader from '../components/AppHeader.vue';

const route = useRoute();
const loading = ref(false);
const pattern = ref<FlatPattern | null>(null);
const latest = ref<ProjectVersionDto | null>(null);
const layers = reactive({ outline: true, cut: true, align: true, grid: true, label: true });

onMounted(async () => {
  const projectId = String(route.params.id);
  loading.value = true;
  try {
    const versions = await api.listVersions(projectId);
    latest.value = versions[0] ?? null;
    if (!latest.value) return;
    const m = latest.value.model;
    const evaluation = evaluateSpline(m.interpolation, m.controlPoints, {
      samples: m.rules.tubularSegments,
    });
    const tube = buildTube(evaluation, {
      radius: m.rules.outerDiameter / 2,
      radialSegments: m.rules.radialSegments,
      tubularSegments: m.rules.tubularSegments,
      layer: 'outer',
    });
    const ranges = computeSegmentRanges(m.controlPoints, evaluation);
    pattern.value = unfoldTube(tube, {
      segmentRanges: ranges,
      segmentNames:
        latest.value.inspection?.segmentStats.map((s) => s.segmentName) ??
        ranges.map((r, i) => `S${i + 1}-${r.jointId}`),
    });
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    loading.value = false;
  }
});

function exportDxf() {
  if (!pattern.value) return;
  const dxf = buildDxf(pattern.value, latest.value?.model.name ?? '护套下料图');
  downloadTextFile(dxf, { filename: `${latest.value?.model.name ?? 'flat'}.dxf`, mime: 'application/dxf' });
}
function exportSvg() {
  if (!pattern.value) return;
  const svg = buildSvg(pattern.value, latest.value?.model.name ?? '护套下料图');
  downloadTextFile(svg, { filename: `${latest.value?.model.name ?? 'flat'}.svg`, mime: 'image/svg+xml' });
}
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}
.spacer {
  flex: 1;
}
.canvas-wrap {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: #ebeef5;
}
.flat-svg {
  background: white;
  width: 100%;
  max-width: 1100px;
  border: 1px solid #dcdfe6;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
</style>
