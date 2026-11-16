/** IndexedDB 打开与 schema（idb 8）。 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Annotation, VersionSnapshot } from '../types';

export interface WorkspaceDoc {
  key: 'current';
  seed: number;
  params: import('../types').GenParams;
  overrides: import('../types').Overrides;
  updatedAt: number;
}

export interface MetaDoc {
  key: string;
  value: unknown;
}

interface CaveDB extends DBSchema {
  projects: { key: string; value: WorkspaceDoc };
  versions: { key: string; value: VersionSnapshot; indexes: { parentId: string } };
  annotations: { key: string; value: Annotation; indexes: { versionId: string } };
  meta: { key: string; value: MetaDoc };
}

export const DB_NAME = 'karst-cave-db';
export const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<CaveDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<CaveDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CaveDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const versions = db.createObjectStore('versions', { keyPath: 'id' });
          versions.createIndex('parentId', 'parentId');
          const annotations = db.createObjectStore('annotations', { keyPath: 'id' });
          annotations.createIndex('versionId', 'versionId');
        }
        // projects 与 meta 均为单键文档库，文档自带 key 字段作为主键。
        // v1 遗留的是无 keyPath 的 out-of-line 库，v3 升级时整体重建（仅本地缓存，可重生成）。
        if (oldVersion < 3) {
          if (db.objectStoreNames.contains('projects')) db.deleteObjectStore('projects');
          if (db.objectStoreNames.contains('meta')) db.deleteObjectStore('meta');
          db.createObjectStore('projects', { keyPath: 'key' });
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}
