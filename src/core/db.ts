// ===== IndexedDB 持久化封装 =====
import type { DBShape, Order, Project, User } from './types';

const DB_NAME = 'aerial-rig-editor';
const DB_VER = 1;
const STORE = 'kv';
const KEY = 'state';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function defaultState(): DBShape {
  const users: User[] = [
    { id: 'u_coach', name: '李教练', role: 'coach' },
    { id: 'u_anim1', name: '王动画', role: 'animator' },
    { id: 'u_anim2', name: '赵动画', role: 'animator' },
    { id: 'u_director', name: '张团长', role: 'director' }
  ];
  return { users, orders: [], projects: [], currentUserId: null };
}

export async function loadState(): Promise<DBShape> {
  try {
    const db = await openDB();
    const data = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!data) {
      const init = defaultState();
      await saveState(init);
      return init;
    }
    return data as DBShape;
  } catch (e) {
    console.warn('IndexedDB 不可用，使用内存态', e);
    return defaultState();
  }
}

export async function saveState(state: DBShape): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('保存失败', e);
  }
}

// 仅用于类型检查处显式标注
export type { Order, Project };
