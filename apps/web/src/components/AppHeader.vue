<template>
  <div class="header">
    <div class="brand">机器人管线包护套建模平台</div>
    <nav>
      <router-link to="/projects">项目</router-link>
      <router-link v-if="auth.role === 'supervisor' || auth.role === 'admin'" to="/review">
        审查
      </router-link>
      <router-link v-if="auth.role === 'supervisor' || auth.role === 'admin'" to="/dashboard">
        看板
      </router-link>
      <router-link v-if="auth.role === 'admin'" to="/admin">管理</router-link>
    </nav>
    <div class="user">
      <el-tag size="small">{{ roleText }}</el-tag>
      <span>{{ auth.user?.displayName }}</span>
      <el-button text type="primary" @click="logout">退出</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const roleText = computed(() => {
  const map: Record<string, string> = {
    engineer: '设计工程师',
    supervisor: '主管',
    admin: '管理员',
  };
  return (auth.role && map[auth.role]) || '';
});
function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 26px;
  padding: 0 22px;
  height: 54px;
  background: #1d3557;
  color: white;
}
.brand {
  font-weight: 700;
  letter-spacing: 1px;
}
nav {
  display: flex;
  gap: 18px;
  flex: 1;
}
nav a {
  color: #cdd9e5;
  text-decoration: none;
  font-size: 14px;
}
nav a.router-link-active {
  color: #fff;
  font-weight: 600;
}
.user {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.user :deep(.el-button) {
  color: #a8dadc;
}
</style>
