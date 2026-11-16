<template>
  <div class="page">
    <AppHeader />
    <div class="content">
      <h2>系统管理</h2>
      <el-card>
        <template #header>用户（演示种子数据）</template>
        <el-table :data="users" v-loading="loading" size="small" stripe>
          <el-table-column prop="username" label="用户名" width="160" />
          <el-table-column prop="displayName" label="姓名" min-width="180" />
          <el-table-column prop="role" label="角色" width="140" />
        </el-table>
      </el-card>
      <el-card class="block">
        <template #header>机器人机型配置</template>
        <el-table :data="robots" size="small" stripe>
          <el-table-column prop="code" label="机型代码" width="220" />
          <el-table-column prop="name" label="名称" min-width="200" />
          <el-table-column label="关节数" width="100">
            <template #default="{ row }">{{ jointCount(row) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
      <el-card class="block">
        <template #header>项目规则说明（在每个项目的建模侧栏中维护）</template>
        <ul class="rules">
          <li>护套外径、壁厚：决定内外双层半径（r<sub>外</sub>=D/2，r<sub>内</sub>=D/2−壁厚）</li>
          <li>弯曲半径系数 k：最小允许弯曲半径 R<sub>min</sub> = k × 外径，低于即标红提示打折</li>
          <li>最小层间隙：实测间隙低于该值弹出数字告警</li>
          <li>命名模板：支持 {project}、{seq}、{joint} 占位符</li>
          <li>切换 PostgreSQL：schema.prisma 的 provider 改为 postgresql 并配置 DATABASE_URL</li>
        </ul>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api/client.js';
import AppHeader from '../components/AppHeader.vue';

const users = ref<unknown[]>([]);
const robots = ref<{ code: string; name: string; config: { joints?: unknown[] } }[]>([]);
const loading = ref(false);

function jointCount(row: { config?: { joints?: unknown[] } }): number {
  return row.config?.joints?.length ?? 0;
}
onMounted(async () => {
  loading.value = true;
  try {
    const [u, r] = await Promise.all([
      fetch('/api/users', { headers: { Authorization: `Bearer ${localStorage.getItem('pg-token')}` } }).then(
        (x) => (x.ok ? x.json() : []),
      ),
      api.listRobots(),
    ]);
    users.value = u;
    robots.value = r as typeof robots.value;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.content {
  padding: 18px 24px;
}
.block {
  margin-top: 18px;
}
.rules {
  line-height: 2;
  color: #606266;
}
</style>
