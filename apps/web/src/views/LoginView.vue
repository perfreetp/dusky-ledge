<template>
  <div class="login-wrap">
    <el-card class="card">
      <h2>管线包护套曲面建模工具</h2>
      <el-form @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="username" placeholder="用户名" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="submit">
          登录
        </el-button>
      </el-form>
      <el-alert
        class="demo"
        type="info"
        :closable="false"
        title="演示账号：engineer / engineer123，supervisor / super1234，admin / admin1234"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const username = ref('engineer');
const password = ref('engineer123');
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    ElMessage.success(`欢迎，${auth.user?.displayName}`);
    router.push('/projects');
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #1d3557, #457b9d);
}
.card {
  width: 440px;
  padding: 12px;
}
h2 {
  text-align: center;
  margin: 8px 0 22px;
  color: #1d3557;
}
.demo {
  margin-top: 14px;
}
</style>
