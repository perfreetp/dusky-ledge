<template>
  <div class="page">
    <AppHeader />
    <div class="content">
      <div class="toolbar">
        <h2>项目列表</h2>
        <el-button type="primary" @click="showCreate = true">新建项目</el-button>
      </div>
      <el-table :data="projects" v-loading="loading" stripe>
        <el-table-column prop="code" label="项目编号" width="170" />
        <el-table-column prop="name" label="项目名称" min-width="220" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="currentVersion" label="版本数" width="90" />
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ new Date(row.updatedAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/projects/${row.id}/editor`)">
              三维建模
            </el-button>
            <el-button size="small" @click="$router.push(`/projects/${row.id}/flat`)">
              下料图
            </el-button>
            <el-button
              v-if="auth.role === 'engineer' || auth.role === 'admin'"
              size="small"
              type="warning"
              plain
              @click="submit(row.id)"
            >
              提交审查
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showCreate" title="新建护套项目" width="520px">
      <el-form label-width="110px">
        <el-form-item label="项目名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="项目编号">
          <el-input v-model="form.code" placeholder="如 LINE-A-07" />
        </el-form-item>
        <el-form-item label="机器人机型">
          <el-select v-model="form.robotConfigId" placeholder="选择机型" style="width: 100%">
            <el-option v-for="r in robots" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="create">创建并进入建模</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { ProjectDto } from '@pg/shared';
import { DEFAULT_PROJECT_RULES } from '@pg/shared';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import AppHeader from '../components/AppHeader.vue';

const auth = useAuthStore();
const router = useRouter();
const projects = ref<ProjectDto[]>([]);
const robots = ref<{ id: string; name: string }[]>([]);
const loading = ref(false);
const showCreate = ref(false);
const form = reactive({ name: '', code: '', robotConfigId: '' });

const statusText = (s: string) =>
  ({ draft: '草稿', submitted: '待审查', approved: '已批准', rejected: '已驳回' })[s] ?? s;
const statusType = (s: string) =>
  ({ draft: 'info', submitted: 'warning', approved: 'success', rejected: 'danger' })[s] ?? 'info';

async function load() {
  loading.value = true;
  try {
    projects.value = await api.listProjects();
    robots.value = await api.listRobots();
    if (!form.robotConfigId && robots.value[0]) form.robotConfigId = robots.value[0].id;
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (!form.name || !form.code || !form.robotConfigId) {
    ElMessage.warning('请完整填写项目信息');
    return;
  }
  const p = await api.createProject({
    name: form.name,
    code: form.code,
    robotConfigId: form.robotConfigId,
    rules: DEFAULT_PROJECT_RULES,
  });
  ElMessage.success('项目已创建');
  showCreate.value = false;
  router.push(`/projects/${p.id}/editor`);
}

async function submit(id: string) {
  await api.submitReview(id);
  ElMessage.success('已提交主管审查');
  load();
}

onMounted(load);
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.content {
  padding: 18px 24px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
