/**
 * 根 Solid store 与全部 actions。
 * 生成结果通过独立的 resultMap（普通 Map + 显式版本号触发响应）管理，
 * 避免把大体积 Float32Array 放进代理 store 带来的性能开销。
 */
import { createStore, produce } from 'solid-js/store';
import type {
  Annotation,
  AnnotationStatus,
  GenParams,
  GenResult,
  LayerKey,
  LayerVisibility,
  Overrides,
  Role,
  VersionSnapshot,
} from '../types';
import { defaultLayers, defaultParams, emptyOverrides } from '../types';
import { generate } from '../core/generate';
import { splitmix32 } from '../core/rng';
import { repository } from '../persistence/repository';
import { toPlain } from '../persistence/plain';

let idCounter = 1;
/** UI 层 id（不进入生成管线，可用时间+计数）。 */
export function uiId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
}

export interface CompareState {
  active: boolean;
  leftVersionId?: string;
  rightVersionId?: string;
  linkedCamera: boolean;
}

export interface AppState {
  role: Role;
  seed: number;
  params: GenParams;
  overrides: Overrides;
  layers: LayerVisibility;
  dirty: boolean;
  generating: boolean;
  /** 当前工作结果的场景 id（每次生成递增）。 */
  sceneId: number;
  stats: GenResult['stats'] | null;
  selectedSpeleoId: string | null;
  section: { enabled: boolean; stationIndex: number };
  compare: CompareState;
  versions: VersionSnapshot[];
  annotations: Annotation[];
  activeVersionId: string | null;
  toast: string | null;
}

const [state, setState] = createStore<AppState>({
  role: 'maker',
  seed: 20260101,
  params: defaultParams(),
  overrides: emptyOverrides(),
  layers: defaultLayers(),
  dirty: false,
  generating: false,
  sceneId: 0,
  stats: null,
  selectedSpeleoId: null,
  section: { enabled: false, stationIndex: 0 },
  compare: { active: false, linkedCamera: true },
  versions: [],
  annotations: [],
  activeVersionId: null,
  toast: null,
});

/** sceneId → 生成结果，渲染器与拾取从这里取数据。 */
const resultMap = new Map<number, GenResult>();
const resultSubs = new Set<() => void>();

export function subscribeResults(fn: () => void): () => void {
  resultSubs.add(fn);
  return () => {
    resultSubs.delete(fn);
  };
}
function notifyResults(): void {
  resultSubs.forEach((fn) => fn());
}

export function getResult(sceneId: number): GenResult | undefined {
  return resultMap.get(sceneId);
}
export function currentResult(): GenResult | undefined {
  return resultMap.get(state.sceneId);
}

export const actions = {
  state,

  setRole(role: Role): void {
    setState('role', role);
    repository.setMeta('role', role);
  },

  updateParams(patch: Partial<GenParams>): void {
    setState('params', (p) => ({ ...p, ...patch }));
    setState('dirty', true);
  },

  updateControlPoint(index: number, patch: Partial<GenParams['controlPoints'][number]>): void {
    setState(
      'params',
      produce<GenParams>((p) => {
        p.controlPoints[index] = { ...p.controlPoints[index]!, ...patch };
      }),
    );
    setState('dirty', true);
  },

  addControlPoint(): void {
    setState(
      'params',
      produce<GenParams>((p) => {
        const last = p.controlPoints[p.controlPoints.length - 1]!;
        p.controlPoints.push({ x: last.x + 4, y: last.y, z: last.z + 6 });
      }),
    );
    setState('dirty', true);
  },

  removeControlPoint(index: number): void {
    if (state.params.controlPoints.length <= 2) return;
    setState(
      'params',
      produce<GenParams>((p) => {
        p.controlPoints.splice(index, 1);
      }),
    );
    setState('dirty', true);
  },

  setSeed(seed: number): void {
    setState('seed', seed >>> 0);
    setState('dirty', true);
  },

  reseed(): void {
    // 仅此处允许 crypto 随机源，只用于填写新种子，不进入几何决策
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    this.setSeed(buf[0]!);
  },

  toggleLayer(key: LayerKey): void {
    setState('layers', key, (v) => !v);
  },

  setSection(enabled: boolean, stationIndex?: number): void {
    setState('section', { enabled, stationIndex: stationIndex ?? state.section.stationIndex });
  },

  /** 重新跑生成管线；override 原样参与，因此手动改线/单株编辑自动保留。 */
  regenerate(): number {
    setState('generating', true);
    const result = generate(state.seed, state.params, state.overrides);
    const nextId = state.sceneId + 1;
    resultMap.set(nextId, result);
    // 控制缓存规模
    if (resultMap.size > 6) {
      const oldest = Math.min(...resultMap.keys());
      if (oldest !== nextId) resultMap.delete(oldest);
    }
    setState({
      sceneId: nextId,
      stats: result.stats,
      dirty: false,
      generating: false,
      selectedSpeleoId: null,
    });
    notifyResults();
    repository.saveWorkspace(state.seed, state.params, state.overrides);
    return nextId;
  },

  // ---- 步道 override ----
  addTrailOverride(s: number, lateral: number, up: number): void {
    setState(
      'overrides',
      produce<Overrides>((ov) => {
        const existing = ov.trail.find((t) => Math.abs(t.s - s) < 0.02);
        if (existing) {
          existing.lateral = lateral;
          existing.up = up;
        } else {
          ov.trail.push({ s, lateral, up });
          ov.trail.sort((a, b) => a.s - b.s);
        }
      }),
    );
    setState('dirty', true);
  },

  clearTrailOverrides(): void {
    setState('overrides', 'trail', []);
    setState('dirty', true);
  },

  // ---- 钟乳石单株编辑 ----
  selectSpeleo(id: string | null): void {
    setState('selectedSpeleoId', id);
  },

  deleteSpeleo(id: string): void {
    setState(
      'overrides',
      produce<Overrides>((ov) => {
        if (!ov.speleo.deleted.includes(id)) ov.speleo.deleted.push(id);
      }),
    );
    setState('dirty', true);
    setState('selectedSpeleoId', null);
  },

  replaceSpeleo(id: string): void {
    const newSeed = splitmix32((state.seed ^ splitmix32(id.length * 131 + state.overrides.speleo.replaced.length * 17 + 7)) >>> 0);
    setState(
      'overrides',
      produce<Overrides>((ov) => {
        const found = ov.speleo.replaced.find((r) => r.id === id);
        if (found) found.seed = newSeed;
        else ov.speleo.replaced.push({ id, seed: newSeed });
      }),
    );
    setState('dirty', true);
  },

  restoreSpeleo(id: string): void {
    setState(
      'overrides',
      produce<Overrides>((ov) => {
        ov.speleo.deleted = ov.speleo.deleted.filter((x) => x !== id);
        ov.speleo.replaced = ov.speleo.replaced.filter((x) => x.id !== id);
      }),
    );
    setState('dirty', true);
  },

  // ---- 版本 ----
  async loadVersions(): Promise<void> {
    setState('versions', await repository.listVersions());
  },

  async commitVersion(label: string): Promise<string> {
    if (!state.stats) this.regenerate();
    const id = uiId('ver');
    const snapshot: VersionSnapshot = {
      id,
      parentId: state.activeVersionId ?? undefined,
      createdAt: Date.now(),
      label,
      seed: state.seed,
      params: toPlain(state.params),
      overrides: toPlain(state.overrides),
      stats: state.stats!,
    };
    await repository.putVersion(snapshot);
    setState('activeVersionId', id);
    await this.loadVersions();
    this.toast(`已提交新版本：${label}`);
    return id;
  },

  /** 载入某版本的输入并重新生成（几何不入库，按快照重算）。 */
  checkoutVersion(snapshot: VersionSnapshot): number {
    setState({
      seed: snapshot.seed,
      params: toPlain(snapshot.params),
      overrides: toPlain(snapshot.overrides),
      activeVersionId: snapshot.id,
      compare: { ...state.compare, active: false },
    });
    const id = this.regenerate();
    return id;
  },

  async deleteVersion(snapshotId: string): Promise<void> {
    await repository.deleteVersion(snapshotId);
    if (state.activeVersionId === snapshotId) setState('activeVersionId', null);
    await this.loadVersions();
    setState('annotations', await repository.listAnnotations());
  },

  // ---- 批注 ----
  async loadAnnotations(): Promise<void> {
    setState('annotations', await repository.listAnnotations());
  },

  async addAnnotation(versionId: string, anchor: Annotation['anchor'], body: string): Promise<void> {
    const annotation: Annotation = {
      id: uiId('ann'),
      versionId,
      anchor,
      authorRole: state.role,
      body,
      createdAt: Date.now(),
      status: 'open',
      replies: [],
    };
    await repository.putAnnotation(annotation);
    await this.loadAnnotations();
  },

  async replyAnnotation(annotationId: string, body: string): Promise<void> {
    const target = state.annotations.find((a) => a.id === annotationId);
    if (!target) return;
    target.replies.push({ id: uiId('rep'), role: state.role, body, createdAt: Date.now() });
    await repository.putAnnotation(target);
    await this.loadAnnotations();
  },

  async setAnnotationStatus(annotationId: string, status: AnnotationStatus): Promise<void> {
    const target = state.annotations.find((a) => a.id === annotationId);
    if (!target) return;
    target.status = status;
    await repository.putAnnotation(target);
    await this.loadAnnotations();
  },

  // ---- 对比 ----
  openCompare(leftVersionId: string, rightVersionId: string): void {
    setState('compare', { active: true, leftVersionId, rightVersionId, linkedCamera: true });
  },

  closeCompare(): void {
    setState('compare', 'active', false);
  },

  toggleLinkedCamera(): void {
    setState('compare', 'linkedCamera', (v) => !v);
  },

  toast(message: string): void {
    setState('toast', message);
    setTimeout(() => setState('toast', null), 2600);
  },

  async hydrate(): Promise<void> {
    const role = await repository.getMeta<Role>('role');
    if (role) setState('role', role);
    const ws = await repository.loadWorkspace();
    if (ws) {
      setState({ seed: ws.seed, params: ws.params, overrides: ws.overrides });
    }
    await this.loadVersions();
    await this.loadAnnotations();
  },
};

export { setState, state };
