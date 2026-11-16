// 档案加工存储：原始测量建档、图档版本、版本比对差异报告、归档检索（localStorage 持久化）
import type {
  DiffEntry,
  DiffReport,
  DrawingVersion,
  MeasurementArchive,
  MineDataset,
  Roadway,
} from './types';

const LS_ARCHIVES = 'mtp.archives.v1';
const LS_VERSIONS = 'mtp.versions.v1';
const LS_REPORTS = 'mtp.reports.v1';

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 几何指纹：中心线采样 + 断面/长度 */
export function geomFingerprint(rw: Roadway): string {
  const step = Math.max(1, Math.floor(rw.centerline.length / 32));
  const sample: string[] = [];
  for (let i = 0; i < rw.centerline.length; i += step) {
    const p = rw.centerline[i];
    sample.push(`${p[0].toFixed(1)},${p[1].toFixed(1)},${p[2].toFixed(1)}`);
  }
  const key = [
    rw.section.type, rw.section.width, rw.section.height, rw.length, sample.join('|'),
  ].join('#');
  return hash32(key).toString(16).padStart(8, '0');
}

/** 巷道综合指纹（属性 + 几何） */
export function fingerprint(rw: Roadway): string {
  return hash32(`${rw.name}#${rw.district}#${rw.purpose}#${geomFingerprint(rw)}`)
    .toString(16)
    .padStart(8, '0');
}

function load<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export interface SearchQuery {
  name?: string;
  levelMin?: number;
  levelMax?: number;
  district?: string;
}

class ArchiveStore {
  archives: MeasurementArchive[] = [];
  versions: DrawingVersion[] = [];
  reports: DiffReport[] = [];
  private listeners = new Set<() => void>();

  constructor() {
    this.archives = load(LS_ARCHIVES, []);
    this.versions = load(LS_VERSIONS, []);
    this.reports = load(LS_REPORTS, []);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private emit() {
    this.listeners.forEach((f) => f());
  }

  private persist() {
    save(LS_ARCHIVES, this.archives);
    save(LS_VERSIONS, this.versions);
    save(LS_REPORTS, this.reports);
    this.emit();
  }

  /** 原始测量文件建档编号 */
  registerMeasurement(fileName: string, ds: MineDataset, note?: string): MeasurementArchive {
    const seq = this.archives.length + 1;
    const arch: MeasurementArchive = {
      id: `CL-${ds.period === 1 ? '2025' : '2026'}-${String(seq).padStart(4, '0')}`,
      fileName,
      uploadedAt: new Date().toISOString(),
      roadwayCount: ds.roadways.length,
      pointCount: ds.roadways.reduce((n, r) => n + r.centerline.length, 0),
      totalLength: ds.totalLength,
      district: ds.roadways[0]?.district ?? '',
      period: ds.period,
      status: 'raw',
      note,
      roadwayIds: ds.roadways.map((r) => r.id),
    };
    this.archives = [arch, ...this.archives];
    this.persist();
    return arch;
  }

  /** 加工出图档版本 */
  createVersion(basedOn: string, ds: MineDataset, note: string): DrawingVersion {
    const seq = this.versions.filter((v) => v.basedOn === basedOn).length + 1;
    const fingerprints: Record<string, string> = {};
    for (const rw of ds.roadways) fingerprints[rw.id] = fingerprint(rw);
    const v: DrawingVersion = {
      id: `GT-${String(this.versions.length + 1).padStart(4, '0')}`,
      basedOn,
      version: `v1.${seq - 1}.0`,
      createdAt: new Date().toISOString(),
      period: ds.period,
      roadwayCount: ds.roadways.length,
      totalLength: ds.totalLength,
      note,
      status: 'processed',
      fingerprints,
    };
    this.versions = [v, ...this.versions];
    this.archives = this.archives.map((a) => (a.id === basedOn ? { ...a, status: 'processed' } : a));
    this.persist();
    return v;
  }

  /** 版本比对 → 差异报告（按巷道 id 配对，几何/属性指纹分别判定） */
  diffVersions(
    from: DrawingVersion,
    to: DrawingVersion,
    fromDs: MineDataset,
    toDs: MineDataset,
  ): DiffReport {
    const entries: DiffEntry[] = [];
    const fromIds = new Set(Object.keys(from.fingerprints));
    const toIds = new Set(Object.keys(to.fingerprints));
    const nameOf = (ds: MineDataset, id: string) =>
      ds.roadways.find((r) => r.id === id)?.name ?? id;
    let added = 0, removed = 0, geometry = 0, meta = 0, unchanged = 0;

    for (const id of toIds) {
      const name = nameOf(toDs, id);
      if (!fromIds.has(id)) {
        const rw = toDs.roadways.find((r) => r.id === id);
        entries.push({
          roadwayId: id, name, change: 'added', detail: '本期新增巷道',
          lengthDelta: rw?.length,
        });
        added++;
        continue;
      }
      if (from.fingerprints[id] !== to.fingerprints[id]) {
        const rwFrom = fromDs.roadways.find((r) => r.id === id);
        const rwTo = toDs.roadways.find((r) => r.id === id);
        const gChanged = rwFrom && rwTo && geomFingerprint(rwFrom) !== geomFingerprint(rwTo);
        if (gChanged) {
          entries.push({
            roadwayId: id, name, change: 'geometry',
            detail: '中心线走向/断面或长度发生变化',
            lengthDelta: (rwTo?.length ?? 0) - (rwFrom?.length ?? 0),
          });
          geometry++;
        } else {
          entries.push({ roadwayId: id, name, change: 'meta', detail: '属性信息更新（名称/采区/用途）' });
          meta++;
        }
      } else {
        entries.push({ roadwayId: id, name, change: 'unchanged', detail: '无变化' });
        unchanged++;
      }
    }
    for (const id of fromIds) {
      if (!toIds.has(id)) {
        const rw = fromDs.roadways.find((r) => r.id === id);
        entries.push({
          roadwayId: id, name: nameOf(fromDs, id), change: 'removed',
          detail: '本期废弃/封闭巷道', lengthDelta: -(rw?.length ?? 0),
        });
        removed++;
      }
    }
    const order = { added: 0, removed: 1, geometry: 2, meta: 3, unchanged: 4 } as const;
    entries.sort((a, b) => order[a.change] - order[b.change]);
    const lengthDelta = to.totalLength - from.totalLength;
    entries.sort((a, b) => ({ added: 0, removed: 1, geometry: 2, meta: 3, unchanged: 4 }[a.change] - { added: 0, removed: 1, geometry: 2, meta: 3, unchanged: 4 }[b.change]));

    const report: DiffReport = {
      id: `BG-${String(this.reports.length + 1).padStart(4, '0')}`,
      fromVersion: from.id,
      toVersion: to.id,
      createdAt: new Date().toISOString(),
      entries,
      summary: { added, removed, geometry, meta, unchanged },
      lengthDelta,
    };
    this.reports = [report, ...this.reports];
    this.persist();
    return report;
  }

  archive(versionId: string) {
    this.versions = this.versions.map((v) =>
      v.id === versionId ? { ...v, status: 'archived' as const } : v,
    );
    this.persist();
  }

  /** 归档检索：巷道名 + 标高区间 + 采区（在已归档版本对应数据集上检索由 App 传入） */
  searchRoadways(ds: MineDataset, q: SearchQuery): Roadway[] {
    return ds.roadways.filter((r) => {
      if (q.name && !r.name.includes(q.name.trim())) return false;
      if (q.district && r.district !== q.district) return false;
      if (q.levelMin != null && r.levelMax < q.levelMin) return false;
      if (q.levelMax != null && r.levelMin > q.levelMax) return false;
      return true;
    });
  }

  reset() {
    this.archives = [];
    this.versions = [];
    this.reports = [];
    this.persist();
  }
}

export const archiveStore = new ArchiveStore();
