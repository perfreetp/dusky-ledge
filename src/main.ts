import './ui/styles';
import './ui/toast';
import './ui/modal';
import './ui/viewport';
import './ui/soilPalette';
import './ui/layerPanel';
import './ui/faceMeter';
import './ui/toolbar';
import './ui/gradePreview';
import './ui/taskPanel';
import './ui/dashboard';
import './ui/teacher';
import './ui/app';
import { getStore } from './state/store';
import { defaultAssignment } from './state/bootstrap';
import { updateStore } from './state/store';

function seedIfEmpty(): void {
  const store = getStore();
  if (store.assignments.length) return;
  const a = defaultAssignment();
  updateStore((s) => {
    s.assignments.push(a);
  });
}

function guardWebGL(): void {
  const test = document.createElement('canvas');
  if (!test.getContext('webgl2')) {
    const banner = document.createElement('div');
    banner.className = 'no-webgl';
    banner.innerHTML =
      '<strong>当前浏览器不支持 WebGL2。</strong><br>请使用最新版 Chrome / Edge / Firefox，并确认已启用硬件加速。';
    document.body.append(banner);
  }
}

function boot(): void {
  seedIfEmpty();
  guardWebGL();
  const root = document.getElementById('root');
  if (!root) return;
  root.replaceChildren();
  const shell = document.createElement('app-shell');
  root.append(shell);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
