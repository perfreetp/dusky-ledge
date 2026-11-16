import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/plans' },
    { path: '/plans', name: 'plans', component: () => import('./views/PlansView') },
    { path: '/editor/:id?', name: 'editor', component: () => import('./views/EditorView') },
    { path: '/versions', name: 'versions', component: () => import('./views/VersionsView') },
    { path: '/training', name: 'training', component: () => import('./views/TrainingView') },
    { path: '/training/:taskId', name: 'task-detail', component: () => import('./views/TaskDetailView') },
    { path: '/practice/:taskId', name: 'practice', component: () => import('./views/PracticeView') },
    { path: '/grade/:submissionId', name: 'grade', component: () => import('./views/GradeView') },
    { path: '/summary/:taskId', name: 'summary', component: () => import('./views/SummaryView') },
    { path: '/help', name: 'help', component: () => import('./views/HelpView') },
  ],
});
