import { STORAGE_KEYS, MAX_REWORK } from '../config';
import type { ProjectMeta, Rework, LayerId } from '../types';
import { hashString } from '../utils/prng';
import { generateZone } from './generator';
import type { Feature } from '../types';

/**
 * 项目持久化：仅保存项目元数据（含图层覆盖、返工记录），
 * 上万要素由种子确定性生成，不写入 localStorage。
 */
class ProjectStore {
  private cache = new Map<string, Feature[]>();

  list(): ProjectMeta[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.projects);
      const arr = raw ? (JSON.parse(raw) as ProjectMeta[]) : [];
      return arr.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  private saveAll(projects: ProjectMeta[]) {
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  }

  get(id: string): ProjectMeta | undefined {
    return this.list().find((p) => p.id === id);
  }

  create(zone: string, deadlineDays = 14): ProjectMeta {
    const projects = this.list();
    const now = Date.now();
    const seed = hashString(zone + ':' + now) || 1;
    const meta: ProjectMeta = {
      id: 'P' + String(now).slice(-8) + '-' + (projects.length + 1).toString(36).toUpperCase(),
      zone,
      status: 'editing',
      createdAt: now,
      deadline: now + deadlineDays * 86400000,
      seed,
      reworks: [],
      layerOverrides: {}
    };
    projects.push(meta);
    this.saveAll(projects);
    return meta;
  }

  update(id: string, patch: Partial<ProjectMeta>): ProjectMeta | undefined {
    const projects = this.list();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx < 0) return undefined;
    projects[idx] = { ...projects[idx], ...patch };
    this.saveAll(projects);
    return projects[idx];
  }

  remove(id: string) {
    this.cache.delete(id);
    this.saveAll(this.list().filter((p) => p.id !== id));
  }

  /** 取项目要素（应用图层归属覆盖），结果在会话内缓存 */
  loadFeatures(meta: ProjectMeta): Feature[] {
    const cached = this.cache.get(meta.id);
    if (cached) return cached;
    const { features } = generateZone(meta.seed);
    const overrides = meta.layerOverrides;
    for (const f of features) {
      const ov = overrides[f.id];
      if (ov) f.layer = ov;
    }
    this.cache.set(meta.id, features);
    return features;
  }

  setLayerOverride(projectId: string, featureIds: string[], layer: LayerId): ProjectMeta | undefined {
    const meta = this.get(projectId);
    if (!meta) return undefined;
    const overrides = { ...meta.layerOverrides };
    for (const id of featureIds) overrides[id] = layer;
    const updated = this.update(projectId, { layerOverrides: overrides });
    const cached = this.cache.get(projectId);
    if (cached) for (const f of cached) if (overrides[f.id]) f.layer = overrides[f.id];
    return updated;
  }

  submit(id: string): ProjectMeta | undefined {
    const meta = this.get(id);
    // 制作中或退回返工（仍有返工次数）的项目均可提交
    if (!meta || (meta.status !== 'editing' && meta.status !== 'returned')) return meta;
    if (meta.reworks.length >= MAX_REWORK) return meta;
    return this.update(id, { status: 'submitted', submittedAt: Date.now() });
  }

  /** 主管退回：视口圈位 + 返工原因，最多 3 次，第 3 次退回后项目关闭不可再提交 */
  returnForRework(id: string, rework: Omit<Rework, 'id' | 'at'>): ProjectMeta | undefined {
    const meta = this.get(id);
    if (!meta || (meta.status !== 'submitted' && meta.status !== 'returned')) return meta;
    if (meta.reworks.length >= MAX_REWORK) return meta;
    const entry: Rework = {
      ...rework,
      id: 'RW' + (meta.reworks.length + 1),
      at: Date.now()
    };
    const reworks = [...meta.reworks, entry];
    return this.update(id, {
      status: 'returned',
      reworks
    });
  }

  approve(id: string): ProjectMeta | undefined {
    const meta = this.get(id);
    if (!meta || meta.status !== 'submitted') return meta;
    return this.update(id, { status: 'approved', approvedAt: Date.now() });
  }

  markDelivered(id: string): ProjectMeta | undefined {
    const meta = this.get(id);
    if (!meta || meta.status !== 'approved') return meta;
    return this.update(id, { status: 'delivered', deliveredAt: Date.now() });
  }

  remainingReworks(meta: ProjectMeta): number {
    return Math.max(0, MAX_REWORK - meta.reworks.length);
  }
}

export const projectStore = new ProjectStore();
