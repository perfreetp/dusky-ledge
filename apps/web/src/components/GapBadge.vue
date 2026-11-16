<template>
  <transition name="pop">
    <div v-if="!output.gap.pass" class="gap-badge">
      <el-icon><WarningFilled /></el-icon>
      <div>
        <strong>层间最小间隙不足</strong>
        <div class="num">实测 {{ output.gap.minMeasuredGap.toFixed(2) }} mm ＜ 要求
          {{ output.gap.requiredMinGap.toFixed(2) }} mm</div>
        <div v-if="output.gap.innerSelfIntersect" class="num">内偏置自交风险（R ＜ 内半径
          {{ output.gap.selfIntersectRadiusLimit.toFixed(1) }}）</div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { WarningFilled } from '@element-plus/icons-vue';
import type { PipelineOutput } from '@pg/geom-kernel';

defineProps<{ output: PipelineOutput }>();
</script>

<style scoped>
.gap-badge {
  position: fixed;
  right: 380px;
  bottom: 28px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #fef0f0;
  border: 1px solid #f56c6c;
  color: #d40000;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(212, 0, 0, 0.18);
  z-index: 50;
  max-width: 340px;
}
.num {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  margin-top: 2px;
}
.pop-enter-active,
.pop-leave-active {
  transition: all 0.25s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
