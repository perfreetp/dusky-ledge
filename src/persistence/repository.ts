/** 仓库接口：所有持久化读写的唯一入口，未来可整体替换为 HTTP 后端实现。 */
import type { Annotation, Overrides, VersionSnapshot, GenParams } from '../types';
import { getDB, type WorkspaceDoc } from './db';
import { toPlain } from './plain';

export const repository = {
  async loadWorkspace(): Promise<WorkspaceDoc | undefined> {
    return (await getDB()).get('projects', 'current');
  },

  async saveWorkspace(seed: number, params: GenParams, overrides: Overrides): Promise<void> {
    // Solid store 代理无法被结构化克隆，toPlain 剥离 Proxy 转为纯对象
    const doc: WorkspaceDoc = {
      key: 'current',
      seed,
      params: toPlain(params),
      overrides: toPlain(overrides),
      updatedAt: Date.now(),
    };
    await (await getDB()).put('projects', doc);
  },

  async listVersions(): Promise<VersionSnapshot[]> {
    const all = await (await getDB()).getAll('versions');
    return all.sort((a, b) => a.createdAt - b.createdAt);
  },

  async getVersion(id: string): Promise<VersionSnapshot | undefined> {
    return (await getDB()).get('versions', id);
  },

  async putVersion(snapshot: VersionSnapshot): Promise<void> {
    await (await getDB()).put('versions', toPlain(snapshot));
  },

  async deleteVersion(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['versions', 'annotations'], 'readwrite');
    await tx.objectStore('versions').delete(id);
    const annStore = tx.objectStore('annotations');
    const linked = await annStore.index('versionId').getAllKeys(id);
    await Promise.all(linked.map((k) => annStore.delete(k)));
    await tx.done;
  },

  async listAnnotations(versionId?: string): Promise<Annotation[]> {
    const db = await getDB();
    if (!versionId) return db.getAll('annotations');
    return db.getAllFromIndex('annotations', 'versionId', versionId);
  },

  async putAnnotation(annotation: Annotation): Promise<void> {
    await (await getDB()).put('annotations', toPlain(annotation));
  },

  async deleteAnnotation(id: string): Promise<void> {
    await (await getDB()).delete('annotations', id);
  },

  async getMeta<T>(key: string): Promise<T | undefined> {
    const doc = await (await getDB()).get('meta', key);
    return doc ? (doc.value as T) : undefined;
  },

  async setMeta(key: string, value: unknown): Promise<void> {
    await (await getDB()).put('meta', { key, value });
  },
};
