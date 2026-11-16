import { createApp } from 'vue';
import App from './App';
import './styles.css';
import { router } from './router';
import { store } from './state/editor';

createApp(App).use(router).mount('#app');

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__marking = { store, router };
}
