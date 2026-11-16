import { computed, reactive, ref, shallowRef, triggerRef } from 'vue';
import type {
  Feature,
  FeatureKind,
  GridSettings,
  PlanDoc,
  Pt,
} from '@shared/types';
import { History } from '@/core/history';
import {
  addFeature,
  combineFeatures,
  duplicateFeatures,
  hitFeature,
  insertVertex,
  mergePathFeatures,
  moveFeatureToIndex,
  moveVertex,
  patchFeature,
  removeFeatures,
  shiftFeature,
  deleteVertex,
  unionInPlace,
  updateFeatureFn,
} from '@/core/ops';
import { boundsOfFeatures, createFeature, defaultHatch, featureBoundsInclStroke, KIND_PRESETS } from '@/core/feature';
import { alignFeatures, distributeCenters, distributeFeatures, flipFeatures, rotateFeatures, scaleFeatures, type AlignMode, type DistributeMode } from '@/core/align';
import type { BoolOp } from '@/core/clipper';
import { rectCenter, rectFromPoints, type Rect } from '@/core/math';
import { SnapIndex, type SnapHit, type SnapKind } from '@/core/snap';

export type DraftKind =
  | FeatureKind
  | 'rect'
  | 'polygon'
  | 'measure'
  | 'channel'
  | 'walkway'
  | 'firelane'
  ;

export interface Draft {
  kind: DraftKind;
  /** committed vertices only — the live rubber-band point lives in `cursor` */
  points: Pt[];
  cursor: Pt | null;
  /** feature kind to create when this draft is committed (area/path tools) */
  target?: FeatureKind;
}

export interface CalibrationState {
  step: 1 | 2;
  p1: Pt | null;
  p2: Pt | null;
}

export type ToolId =
  | 'select'
  | 'pan'
  | 'channel'
  | 'walkway'
  | 'firelane'
  | 'park'
  | 'station'
  | 'material'
  | 'hazard'
  | 'rect'
  | 'polygon'
  | 'measure';

export interface Camera {
  scale: number;
  tx: number;
  ty: number;
  width: number;
  height: number;
}

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

export interface VertexRef {
  featureId: string;
  which: { type: 'path'; index: number } | { type: 'ring'; index: number };
  index: number;
}

export function emptyDoc(name = '未命名方案'): PlanDoc {
  return {
    schema: 1,
    name,
    workshopId: null,
    width: 24000,
    height: 16000,
    background: null,
    features: [],
    settings: {
      grid: {
        minor: 250,
        major: 1000,
        show: true,
        snapGrid: true,
        snapEndpoints: true,
        snapMidpoints: true,
        snapSegments: true,
      },
      showDimensions: true,
    },
  };
}

/** Which area feature a rect/polygon draft becomes, based on the active tool. */
function areaKind(draftKind: DraftKind, tool: ToolId): FeatureKind {
  void draftKind;
  switch (tool) {
    case 'park':
      return 'no-park';
    case 'station':
      return 'station';
    case 'hazard':
      return 'hazard';
    case 'material':
      return 'material';
    default:
      return 'material';
  }
}

let toastSeq = 0;

/** Camera scale is world-mm per CSS pixel: small = zoomed in, large = zoomed out. */
const MIN_SCALE = 0.008;
const MAX_SCALE = 400;
const clampScale = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

/**
 * The single editor store. Documents are replaced immutably on every edit so undo
 * is a plain snapshot stack and the renderer can diff cheaply.
 */
class EditorStore {
  doc = shallowRef<PlanDoc>(emptyDoc());
  camera = reactive<Camera>({ scale: 0.06, tx: 0, ty: 0, width: 100, height: 100 });
  selection = ref<string[]>([]);
  selectedVertices = ref<VertexRef[]>([]);
  tool = ref<ToolId>('select');
  snapHit = ref<SnapHit | null>(null);
  hoverId = ref<string | null>(null);
  history = new History({ limit: 200 });
  historyVersion = ref(0);
  toasts = ref<Toast[]>([]);
  draft = ref<Draft | null>(null);
  calibration = ref<CalibrationState | null>(null);
  docDirty = ref(false);
  planId = ref<string | null>(null);
  planName = ref('未命名方案');
  workshopId = ref<string | null>(null);
  backgroundUrl = ref<string | null>(null);
  gpuStats = reactive({ triangles: 0, hatchStripes: 0, batches: 0, buildMs: 0, gpu: false, adapterInfo: '' });
  rendering = ref(false);
  viewMode = ref<'edit' | 'review'>('edit');

  private snapIndexCache: SnapIndex | null = null;
  private snapKey = '';

  get features(): Feature[] {
    return this.doc.value.features;
  }

  get selectedFeatures(): Feature[] {
    const set = new Set(this.selection.value);
    return this.features.filter((f) => set.has(f.id));
  }

  get grid(): GridSettings {
    return this.doc.value.settings.grid;
  }

  setDoc(doc: PlanDoc, opts: { resetHistory?: boolean } = {}) {
    this.doc.value = doc;
    if (opts.resetHistory) {
      this.history.clear();
      this.historyVersion.value++;
    }
    this.snapIndexCache = null;
    this.docDirty.value = true;
  }

  /** Apply an edit with an undo snapshot; coalesceKey merges gestures. */
  edit(label: string, fn: (doc: PlanDoc) => PlanDoc, opts: { coalesce?: string } = {}) {
    const before = this.doc.value;
    const after = fn(before);
    if (after === before) return;
    this.history.push(label, before, this.selection.value, opts.coalesce);
    this.doc.value = after;
    this.snapIndexCache = null;
    this.docDirty.value = true;
    this.historyVersion.value++;
  }

  undo() {
    const r = this.history.undo(this.doc.value, this.selection.value);
    if (!r) return;
    this.doc.value = r.doc;
    this.selection.value = r.selection.filter((id) => r.doc.features.some((f) => f.id === id));
    this.snapIndexCache = null;
    this.docDirty.value = true;
    this.historyVersion.value++;
    this.toast(`撤销：${r.label}`);
  }

  redo() {
    const r = this.history.redo(this.doc.value, this.selection.value);
    if (!r) return;
    this.doc.value = r.doc;
    this.selection.value = r.selection.filter((id) => r.doc.features.some((f) => f.id === id));
    this.snapIndexCache = null;
    this.docDirty.value = true;
    this.historyVersion.value++;
    this.toast(`重做：${r.label}`);
  }

  toast(message: string, tone: Toast['tone'] = 'info') {
    const t = { id: ++toastSeq, message, tone };
    this.toasts.value = [...this.toasts.value, t];
    setTimeout(() => {
      this.toasts.value = this.toasts.value.filter((x) => x.id !== t.id);
    }, 4200);
  }

  // ---- selection -----------------------------------------------------------

  select(ids: string[], additive = false) {
    if (!additive) this.selection.value = [...new Set(ids)];
    else this.selection.value = [...new Set([...this.selection.value, ...ids])];
  }

  toggleSelect(id: string) {
    this.selection.value = this.selection.value.includes(id)
      ? this.selection.value.filter((x) => x !== id)
      : [...this.selection.value, id];
  }

  clearSelection() {
    this.selection.value = [];
    this.selectedVertices.value = [];
  }

  selectAll() {
    this.selection.value = this.features.filter((f) => f.visible && !f.locked).map((f) => f.id);
  }

  // ---- snapping ------------------------------------------------------------

  get snapIndex(): SnapIndex {
    const key = `${this.doc.value.features.length}:${this.historyVersion.value}:${JSON.stringify(this.grid)}`;
    if (!this.snapIndexCache || key !== this.snapKey) {
      this.snapIndexCache = new SnapIndex(
        this.features.filter((f) => f.visible && !f.locked),
        this.grid,
        Math.max(250, this.grid.minor * 4)
      );
      this.snapKey = key;
    }
    return this.snapIndexCache;
  }

  /** Snap a world point, converting a screen-pixel tolerance into mm. */
  snapPoint(p: Pt, pxTolerance = 12, exclude?: string[]): { p: Pt; hit: SnapHit | null } {
    const tolMm = pxTolerance * this.camera.scale;
    const kinds: SnapKind[] = [];
    if (this.grid.snapEndpoints) kinds.push('endpoint', 'center');
    if (this.grid.snapMidpoints) kinds.push('midpoint');
    if (this.grid.snapSegments) kinds.push('segment');
    if (this.grid.snapGrid) kinds.push('grid');
    const hit = this.snapIndex.query(p, tolMm, { excludeFeatureIds: new Set(exclude ?? []) , kinds });
    return { p: hit ? hit.point : p, hit };
  }

  // ---- feature ops ---------------------------------------------------------

  addFeatureOfKind(kind: FeatureKind, overrides: Partial<Feature> = {}) {
    const f = createFeature(kind, overrides);
    this.edit(`新建${KIND_PRESETS[kind].label}`, (doc) => addFeature(doc, f));
    this.select([f.id]);
  }

  deleteSelected() {
    if (!this.selection.value.length) return;
    const ids = [...this.selection.value];
    this.edit(`删除 ${ids.length} 个对象`, (doc) => removeFeatures(doc, ids));
    this.clearSelection();
    this.toast(`已删除 ${ids.length} 个对象`);
  }

  duplicateSelected() {
    if (!this.selection.value.length) return;
    this.edit('复制对象', (doc) => duplicateFeatures(doc, this.selection.value).doc);
    const before = new Set(this.selection.value);
    const next = this.features.find((f) => !before.has(f.id) && f.name.endsWith('副本'));
    if (next) this.select([next.id]);
  }

  patch(id: string, patch: Partial<Feature>, label = '修改属性', coalesce?: string) {
    this.edit(label, (doc) => patchFeature(doc, id, patch), { coalesce });
  }

  patchMany(ids: string[], patch: Partial<Feature>, label = '批量修改') {
    this.edit(label, (doc) => {
      let out = doc;
      for (const id of ids) out = patchFeature(out, id, patch);
      return out;
    });
  }

  booleanOp(op: BoolOp) {
    if (this.selection.value.length < 2) {
      this.toast('布尔运算需要至少选择两个对象（差集：第一个为主体）', 'error');
      return;
    }
    const res = combineFeatures(this.doc.value, this.selection.value, op);
    if (res.error) {
      this.toast(res.error, 'error');
      return;
    }
    this.edit(`${op === 'union' ? '并集' : op === 'difference' ? '差集' : op === 'intersection' ? '交集' : '异或'}运算`, () => res.doc);
    if (res.select) this.select(res.select);
    this.toast(res.message ?? '布尔运算完成', 'success');
  }

  unionInPlace() {
    const res = unionInPlace(this.doc.value, this.selection.value);
    if (res.error) return this.toast(res.error, 'error');
    this.edit('合并重叠区域', () => res.doc);
    if (res.select) this.select(res.select);
    this.toast(res.message ?? '已合并', 'success');
  }

  mergeLines() {
    const res = mergePathFeatures(this.doc.value, this.selection.value);
    if (res.error) return this.toast(res.error, 'error');
    this.edit('合并为流水线', () => res.doc);
    if (res.select) this.select(res.select);
    this.toast(res.message ?? '已合并', 'success');
  }

  // ---- alignment -----------------------------------------------------------

  moveBy(delta: Pt, ids = this.selection.value) {
    if (!ids.length || (delta.x === 0 && delta.y === 0)) return;
    this.edit(
      '移动对象',
      (doc) => {
        const set = new Set(ids);
        return { ...doc, features: doc.features.map((f) => (set.has(f.id) ? shiftFeature(f, delta) : f)) };
      },
      { coalesce: `nudge-${ids.join(',')}` }
    );
  }

  align(mode: AlignMode) {
    if (this.selection.value.length < 2) return this.toast('对齐需要选中两个以上对象', 'error');
    this.edit(
      `对齐：${LABELS[mode]}`,
      (doc) => ({ ...doc, features: alignFeatures(doc.features, this.selection.value, mode) })
    );
  }

  distribute(mode: DistributeMode, centers = false) {
    if (this.selection.value.length < 3) return this.toast('等距分布需要选中三个以上对象', 'error');
    this.edit(
      `等距分布（${mode === 'horizontal' ? '水平' : '垂直'}）`,
      (doc) => ({
        ...doc,
        features: centers
          ? distributeCenters(doc.features, this.selection.value, mode)
          : distributeFeatures(doc.features, this.selection.value, mode),
      })
    );
  }

  rotate(deg: number) {
    if (!this.selection.value.length) return;
    const b = boundsOfFeatures(this.selectedFeatures);
    const c = rectCenter(b);
    this.edit(`旋转 ${deg}°`, (doc) => ({ ...doc, features: rotateFeatures(doc.features, this.selection.value, c, deg) }));
  }

  flip(axis: 'h' | 'v') {
    if (!this.selection.value.length) return;
    this.edit(`镜像（${axis === 'h' ? '水平' : '垂直'}）`, (doc) => ({
      ...doc,
      features: flipFeatures(doc.features, this.selection.value, axis),
    }));
  }

  scale(sx: number, sy: number) {
    if (!this.selection.value.length) return;
    const c = rectCenter(boundsOfFeatures(this.selectedFeatures));
    this.edit(`缩放 ${sx}×${sy}`, (doc) => ({ ...doc, features: scaleFeatures(doc.features, this.selection.value, c, sx, sy) }));
  }

  reorder(id: string, toIndex: number) {
    this.edit('调整图层顺序', (doc) => moveFeatureToIndex(doc, id, toIndex));
  }

  // ---- vertex editing ------------------------------------------------------

  moveVertex(ref: VertexRef, p: Pt, coalesce = `vertex-${ref.featureId}-${ref.index}`) {
    this.edit(
      '移动顶点',
      (doc) =>
        updateFeatureFn(doc, ref.featureId, (f) => moveVertex(f, ref.which, ref.index, p)),
      { coalesce }
    );
  }

  insertVertex(ref: VertexRef, p: Pt) {
    this.edit('插入顶点', (doc) => updateFeatureFn(doc, ref.featureId, (f) => insertVertex(f, ref.which, ref.index, p)));
  }

  removeVertex(ref: VertexRef) {
    this.edit('删除顶点', (doc) => updateFeatureFn(doc, ref.featureId, (f) => deleteVertex(f, ref.which, ref.index)));
  }

  // ---- hit testing ---------------------------------------------------------

  hit(p: Pt): string | null {
    const tol = 8 * this.camera.scale;
    return hitFeature(this.doc.value, p, tol);
  }

  // ---- camera --------------------------------------------------------------

  setViewport(width: number, height: number) {
    this.camera.width = width;
    this.camera.height = height;
  }

  screenToWorld(sx: number, sy: number): Pt {
    return { x: sx * this.camera.scale + this.camera.tx, y: sy * this.camera.scale + this.camera.ty };
  }

  worldToScreen(p: Pt): Pt {
    return { x: (p.x - this.camera.tx) / this.camera.scale, y: (p.y - this.camera.ty) / this.camera.scale };
  }

  panBy(dxScreen: number, dyScreen: number) {
    this.camera.tx -= dxScreen * this.camera.scale;
    this.camera.ty -= dyScreen * this.camera.scale;
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const before = this.screenToWorld(sx, sy);
    const next = clampScale(this.camera.scale / factor);
    this.camera.scale = next;
    const after = this.screenToWorld(sx, sy);
    this.camera.tx += before.x - after.x;
    this.camera.ty += before.y - after.y;
  }

  fitTo(rect: Rect, padding = 60) {
    const w = Math.max(1, this.camera.width - padding * 2);
    const h = Math.max(1, this.camera.height - padding * 2);
    const rw = Math.max(1, rect.maxX - rect.minX);
    const rh = Math.max(1, rect.maxY - rect.minY);
    this.camera.scale = clampScale(Math.max(rw / w, rh / h));
    // centre precisely
    const cx = (rect.minX + rect.maxX) / 2;
    const cy = (rect.minY + rect.maxY) / 2;
    this.camera.tx = cx - (this.camera.width / 2) * this.camera.scale;
    this.camera.ty = cy - (this.camera.height / 2) * this.camera.scale;
  }

  fitToContent() {
    const rects = this.features.map(featureBoundsInclStroke);
    const b = rects.length
      ? rects.reduce((acc, r) => ({
          minX: Math.min(acc.minX, r.minX),
          minY: Math.min(acc.minY, r.minY),
          maxX: Math.max(acc.maxX, r.maxX),
          maxY: Math.max(acc.maxY, r.maxY),
        }))
      : { minX: 0, minY: 0, maxX: this.doc.value.width, maxY: this.doc.value.height };
    this.fitTo(b);
  }

  fitToSelection() {
    if (!this.selectedFeatures.length) return this.fitToContent();
    this.fitTo(boundsOfFeatures(this.selectedFeatures));
  }

  zoomToFitDoc() {
    this.fitTo({ minX: 0, minY: 0, maxX: this.doc.value.width, maxY: this.doc.value.height }, 40);
  }

  // ---- drafting ------------------------------------------------------------

  startDraft(kind: DraftKind, p: Pt, target?: FeatureKind) {
    this.draft.value = {
      kind,
      points: [{ x: p.x, y: p.y }],
      cursor: { x: p.x, y: p.y },
      target,
    };
    triggerRef(this.draft);
  }

  updateDraft(p: Pt) {
    const d = this.draft.value;
    if (!d) return;
    d.cursor = { x: p.x, y: p.y };
    triggerRef(this.draft);
  }

  appendDraftPoint(p: Pt) {
    const d = this.draft.value;
    if (!d) return;
    const last = d.points[d.points.length - 1];
    if (last && Math.hypot(last.x - p.x, last.y - p.y) < 0.01) {
      d.cursor = { x: p.x, y: p.y };
      triggerRef(this.draft);
      return;
    }
    d.points = [...d.points, { x: p.x, y: p.y }];
    d.cursor = { x: p.x, y: p.y };
    triggerRef(this.draft);
  }

  cancelDraft() {
    this.draft.value = null;
  }

  /** Finish the current draft, creating a feature. Returns created id or null. */
  commitDraft(): string | null {
    const d = this.draft.value;
    if (!d) return null;
    this.draft.value = null;
    if (d.kind === 'measure') return null;

    if (d.kind === 'rect') {
      const a = d.points[0];
      const b = d.cursor ?? d.points[d.points.length - 1];
      const x0 = Math.min(a.x, b.x);
      const y0 = Math.min(a.y, b.y);
      const x1 = Math.max(a.x, b.x);
      const y1 = Math.max(a.y, b.y);
      if (x1 - x0 < 10 || y1 - y0 < 10) return null;
      const ring = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
      const kind = d.target ?? areaKind(d.kind, this.tool.value);
      const f = createFeature(kind, { geom: 'area', rings: [ring], paths: [] });
      this.edit(`新建${KIND_PRESETS[kind].label}`, (doc) => addFeature(doc, f));
      this.select([f.id]);
      return f.id;
    }

    const pts = d.points.filter((p, i, arr) => i === 0 || Math.hypot(p.x - arr[i - 1].x, p.y - arr[i - 1].y) > 0.01);
    if (pts.length < 2) return null;

    if (d.kind === 'polygon') {
      const ring = pts.slice();
      if (ring.length < 3) return null;
      const kind = d.target ?? areaKind(d.kind, this.tool.value);
      const f = createFeature(kind, { geom: 'area', rings: [ring], paths: [] });
      this.edit('新建多边形区域', (doc) => addFeature(doc, f));
      this.select([f.id]);
      return f.id;
    }

    // center line kinds
    const kindMap: Record<string, FeatureKind> = { channel: 'main-channel', walkway: 'walkway', firelane: 'fire-lane' };
    const kind = d.target ?? kindMap[d.kind] ?? 'main-channel';
    // append to an existing feature of the same kind if the first point snaps to its end
    const f = createFeature(kind, { geom: 'path', paths: [pts], rings: [] });
    this.edit(`绘制${KIND_PRESETS[kind].label}`, (doc) => addFeature(doc, f));
    this.select([f.id]);
    return f.id;
  }

  // ---- styles --------------------------------------------------------------

  applyPresetToSelection(kind: FeatureKind) {
    if (!this.selection.value.length) return;
    const preset = KIND_PRESETS[kind];
    this.patchMany(this.selection.value, { kind, ...structuredClone(preset.style) }, `套用规范：${preset.label}`);
  }

  setHatchForSelection(patch: Partial<NonNullable<Feature['hatch']>> | null) {
    if (!this.selection.value.length) return;
    this.edit('修改填充', (doc) => {
      let out = doc;
      for (const id of this.selection.value) {
        out = updateFeatureFn(out, id, (f) => {
          if (patch === null) return { ...f, hatch: null };
          const base = f.hatch ?? defaultHatch();
          return { ...f, hatch: { ...base, ...patch } };
        });
      }
      return out;
    });
  }

  setLineWidth(width: number) {
    this.patchMany(this.selection.value, { lineWidth: width }, `线宽 ${width}mm`);
  }

  // ---- document settings ---------------------------------------------------

  updateGrid(patch: Partial<GridSettings>) {
    this.edit(
      '修改网格设置',
      (doc) => ({ ...doc, settings: { ...doc.settings, grid: { ...doc.settings.grid, ...patch } } }),
      { coalesce: 'grid-settings' }
    );
  }

  setDocMeta(patch: Partial<Pick<PlanDoc, 'name' | 'width' | 'height' | 'workshopId'>>) {
    this.edit('修改方案信息', (doc) => ({ ...doc, ...patch }), { coalesce: 'doc-meta' });
  }

  setBackground(bg: PlanDoc['background']) {
    this.edit('设置底图', (doc) => ({ ...doc, background: bg }));
  }

  /**
   * Calibrate the background: the operator clicked two points on the floor plan that
   * are a known distance apart (e.g. a 6 m bay). Scale the image about the first
   * click so that distance becomes exact, then optionally shift the origin.
   */
  calibrateBackground(
    p1: Pt,
    p2: Pt,
    realMetres: number,
    mode: 'scale' | 'scale+offset' = 'scale'
  ) {
    const bg = this.doc.value.background;
    if (!bg || realMetres <= 0) return;
    const measured = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (measured < 1) return;
    const factor = (realMetres * 1000) / measured;
    // The two points are in world coordinates; the image is anchored at bg.x/bg.y
    const anchor = mode === 'scale' ? { x: bg.x, y: bg.y } : { x: p1.x, y: p1.y };
    const next = {
      ...bg,
      x: anchor.x + (bg.x - p1.x) * factor,
      y: anchor.y + (bg.y - p1.y) * factor,
      width: bg.width * factor,
      height: bg.height * factor,
    };
    this.edit('校准底图比例', (doc) => ({
      ...doc,
      background: next,
      width: Math.max(doc.width, Math.ceil(next.x + next.width)),
      height: Math.max(doc.height, Math.ceil(next.y + next.height)),
    }));
  }

  startCalibration() {
    if (!this.doc.value.background) {
      this.toast('请先上传底图再校准', 'error');
      return;
    }
    this.calibration.value = { step: 1, p1: null, p2: null };
    this.tool.value = 'select';
  }

  calibPoint(p: Pt) {
    const c = this.calibration.value;
    if (!c) return;
    if (c.step === 1) {
      this.calibration.value = { step: 2, p1: { ...p }, p2: null };
    } else if (c.p1) {
      this.calibration.value = { ...c, p2: { ...p } };
    }
  }

  cancelCalibration() {
    this.calibration.value = null;
  }

  setBackgroundTransform(patch: Partial<NonNullable<PlanDoc['background']>>) {
    this.edit(
      '调整底图',
      (doc) => (doc.background ? { ...doc, background: { ...doc.background, ...patch } } : doc),
      { coalesce: 'bg-transform' }
    );
  }
}

export const store = new EditorStore();

export const LABELS: Record<AlignMode, string> = {
  left: '左对齐',
  hcenter: '水平居中',
  right: '右对齐',
  top: '顶对齐',
  vcenter: '垂直居中',
  bottom: '底对齐',
};

export const selectionBounds = computed(() => boundsOfFeatures(store.selectedFeatures));

export function useStore() {
  return store;
}

export { rectFromPoints };
