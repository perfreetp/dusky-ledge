// localStorage 持久化:工程 + 动作库
const PROJECT_KEY = 'liondance.project.v1';
const LIBRARY_KEY = 'liondance.library.v1';

export function saveProject(data) {
  try { localStorage.setItem(PROJECT_KEY, JSON.stringify(data)); } catch (e) { /* 忽略配额错误 */ }
}

export function loadProject() {
  try {
    const s = localStorage.getItem(PROJECT_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function saveLibrary(entries) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries)); } catch (e) { /* 忽略 */ }
}

export function loadLibrary() {
  try {
    const s = localStorage.getItem(LIBRARY_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
