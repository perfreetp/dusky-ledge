import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    { path: '/', redirect: '/projects' },
    { path: '/projects', component: () => import('./views/ProjectsView.vue') },
    { path: '/projects/:id/editor', component: () => import('./views/EditorView.vue') },
    { path: '/projects/:id/flat', component: () => import('./views/FlatPatternView.vue') },
    { path: '/review', component: () => import('./views/ReviewView.vue') },
    { path: '/dashboard', component: () => import('./views/DashboardView.vue') },
    { path: '/admin', component: () => import('./views/AdminView.vue') },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.token) return { path: '/login' };
  return true;
});
