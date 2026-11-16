import { VoxelGrid, mirrorConsistency, encodeRle } from '../core/voxelGrid';
import { buildLayers, layerAtY, type LayerSpec } from '../core/layers';
import { meshSelection, meshMask, type MeshResult } from '../core/mesher';
import { ChunkedMesher, type ChunkedMeshResult } from '../core/chunkedMesher';
import {
  computeModelStats,
  autoGrade,
  expectedSharesFromRows,
  type ModelStats,
  type AutoGradeResult,
  type Issue,
} from '../core/grading';
import {
  makeEditContext,
  placeVoxel,
  eraseVoxel,
  hideVoxel,
  replaceMaterial,
  extractBox,
  moveBoxToLayer,
  clearLayer,
  clampBox,
  hiddenCount,
  type Box,
  type ExtractResult,
} from '../core/operations';
import type { RayHit } from '../core/picker';
import { MATERIALS } from '../core/materials';
import { meshToObj, meshToMtl } from '../core/exportObj';
import { decimateToBudget, type DecimateResult } from '../core/simplify';
import {
  assignmentExpectedShares,
  deadlineState,
  makeId,
  type Assignment,
  type Submission,
  type CheckSnapshot,
} from './assignment';

export type Tool = 'orbit' | 'place' | 'erase' | 'hide' | 'select' | 'eyedrop';

export interface ProjectOptions {
  dims: { nx: number; ny: number; nz: number };
  layerRows: number[];
}

interface Snapshot {
  mat: Uint8Array;
  hidden: Uint8Array;
}

interface UndoEntry {
  label: string;
  before: Snapshot;
  after: Snapshot;
}

export interface ChangeFlags {
  grid: boolean;
  view: boolean;
  info: boolean;
}

const WORK_KEY = 'strata-voxel-lab/workspace/v2';

export class EditorModel {
  grid: VoxelGrid;
  layers: LayerSpec[];
  assignment: Assignment | null = null;
  student = '';

  material = 1;
  tool: Tool = 'place';
  mirror = false;
  /** 非 null 时只显示这一层 */
  soloLayer: number | null = null;
  hiddenLayers = new Set<number>();
  currentLayerIndex = 0;

  selection: Box | null = null;
  clipboard: ExtractResult | null = null;
  hover: RayHit | null = null;
  /** 以半透明方式显示被单独隐藏的体素，便于点回去恢复 */
  revealHidden = false;

  /** 变更计数，订阅者据此判断是否需要重绘 */
  tick = 0;
  private listeners = new Set<(flags: ChangeFlags) => void>();
  private meshCache: MeshResult | null = null;
  private meshTick = -1;
  private selectionMeshCache: MeshResult | null = null;
  private selectionMeshTick = -1;
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  private strokeBefore: Snapshot | null = null;
  private strokeLabel = '';
  private pendingFlags: ChangeFlags = { grid: false, view: false, info: false };
  private emitScheduled = false;

  constructor(opts: ProjectOptions) {
    this.grid = new VoxelGrid(opts.dims);
    this.layers = buildLayers(opts.layerRows);
    this.currentLayerIndex = 0;
  }

  // ── 订阅与通知 ──
  subscribe(fn: (flags: ChangeFlags) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** 合并同一帧内的多次变更，避免重复渲染 */
  mark(flags: Partial<ChangeFlags> = {}): void {
    this.tick++;
    this.pendingFlags.grid ||= flags.grid ?? false;
    this.pendingFlags.view ||= flags.view ?? false;
    this.pendingFlags.info ||= flags.info ?? true;
    if (this.emitScheduled) return;
    this.emitScheduled = true;
    const run = () => {
      this.emitScheduled = false;
      const f = this.pendingFlags;
      this.pendingFlags = { grid: false, view: false, info: false };
      for (const fn of this.listeners) fn(f);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else queueMicrotask(run);
  }

  // ── 几何与可见性 ──
  get dims() {
    return this.grid.dims;
  }

  get currentLayer(): LayerSpec {
    return this.layers[Math.min(this.currentLayerIndex, this.layers.length - 1)];
  }

  visibleLayers(): Set<number> | null {
    if (this.soloLayer !== null) return new Set([this.soloLayer]);
    if (this.hiddenLayers.size === 0) return null;
    const set = new Set<number>();
    for (const l of this.layers) if (!this.hiddenLayers.has(l.index)) set.add(l.index);
    return set;
  }

  isLayerVisible(index: number): boolean {
    if (this.soloLayer !== null) return this.soloLayer === index;
    return !this.hiddenLayers.has(index);
  }

  /** 体素是否可被拾取（可见层 + 未单独隐藏；开启“显示隐藏”时隐藏体素也可被点中） */
  isPickable(x: number, y: number, z: number): boolean {
    const i = this.grid.materialAt(x, y, z);
    if (!i) return false;
    if (this.grid.isHidden(x, y, z) && !this.revealHidden) return false;
    return this.isLayerVisible(layerAtY(this.layers, y));
  }

  toggleRevealHidden(): void {
    this.revealHidden = !this.revealHidden;
    this.mark({ grid: true, view: true });
  }

  /** 被隐藏体素的网格（半透明显示用）；无隐藏体素时返回 null */
  get hiddenMesh(): MeshResult | null {
    if (!this.revealHidden || !this.hiddenVoxels) return null;
    const mask = new Uint8Array(this.grid.mat.length);
    const { nx, ny, nz } = this.grid.dims;
    const nxz = nx * nz;
    for (let y = 0; y < ny; y++) {
      if (!this.isLayerVisible(layerAtY(this.layers, y))) continue;
      const base = y * nxz;
      for (let k = 0; k < nxz; k++) {
        const i = base + k;
        if (this.grid.hidden[i] && this.grid.mat[i]) mask[i] = this.grid.mat[i];
      }
    }
    return meshMask(this.grid.dims, mask, true);
  }

  /** 懒计算网格；同一 tick 内复用。使用分块增量网格化，拖拽时不重算整块探方。 */
  get mesh(): MeshResult {
    if (this.meshCache && this.meshTick === this.tick) return this.meshCache;
    const chunker = this.ensureChunker();
    chunker.setVisibility(this.layers, this.visibleLayers());
    // 把这一轮的变更点换算成受影响的分块
    const journal = this.grid.drainJournal();
    if (journal.indices.length <= 4096 && !journal.overflow) {
      for (const i of journal.indices) {
        const c = this.grid.coords(i);
        chunker.invalidateVoxel(c.x, c.y, c.z);
      }
    } else {
      chunker.invalidateAll();
    }
    this.meshCache = chunker.build(this.grid);
    this.meshTick = this.tick;
    return this.meshCache;
  }

  private chunker: ChunkedMesher | null = null;
  private chunkerDimsKey = '';
  private ensureChunker(): ChunkedMesher {
    const key = `${this.grid.dims.nx}x${this.grid.dims.ny}x${this.grid.dims.nz}`;
    if (!this.chunker || this.chunkerDimsKey !== key) {
      this.chunker = new ChunkedMesher(this.grid.dims);
      this.chunkerDimsKey = key;
      this.grid.touchAll();
    }
    return this.chunker;
  }

  /** 网格缓存重建统计（调试/自测用） */
  get meshRebuildInfo(): { rebuilt: number; total: number } {
    const m = this.mesh as ChunkedMeshResult;
    return { rebuilt: m.rebuiltChunks ?? 0, total: m.totalChunks ?? 0 };
  }

  get selectionMesh(): MeshResult | null {
    if (!this.selection) return null;
    if (this.selectionMeshCache && this.selectionMeshTick === this.tick) return this.selectionMeshCache;
    this.selectionMeshCache = meshSelection(this.grid, this.indicesInBox(this.selection), 200);
    this.selectionMeshTick = this.tick;
    return this.selectionMeshCache;
  }

  get stats(): ModelStats {
    return computeModelStats(this.grid, this.layers);
  }

  get filledCount(): number {
    return this.grid.filled();
  }

  get hiddenVoxels(): number {
    return hiddenCount(this.grid);
  }

  get expectedShares(): number[] {
    return this.assignment ? assignmentExpectedShares(this.assignment) : expectedSharesFromRows(this.layers.map((l) => l.rows));
  }

  get faceBudget(): number {
    return this.assignment?.faceBudget ?? 0;
  }

  indicesInBox(box: Box): number[] {
    const out: number[] = [];
    for (let y = box.y0; y <= box.y1; y++)
      for (let z = box.z0; z <= box.z1; z++)
        for (let x = box.x0; x <= box.x1; x++) {
          const i = this.grid.index(x, y, z);
          if (this.grid.mat[i]) out.push(i);
        }
    return out;
  }

  // ── 撤销/重做 ──
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoLabel(): string {
    return this.undoStack[this.undoStack.length - 1]?.label ?? '';
  }

  get redoLabel(): string {
    return this.redoStack[this.redoStack.length - 1]?.label ?? '';
  }

  private snapshot(): Snapshot {
    return { mat: this.grid.mat.slice(), hidden: this.grid.hidden.slice() };
  }

  private restore(s: Snapshot): void {
    this.grid.mat.set(s.mat);
    this.grid.hidden.set(s.hidden);
  }

  private commit(label: string, before: Snapshot): void {
    const after = this.snapshot();
    if (sameSnapshot(before, after)) return;
    this.undoStack.push({ label, before, after });
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack = [];
  }

  private transact(label: string, fn: () => void): void {
    const before = this.snapshot();
    fn();
    this.commit(label, before);
    this.mark({ grid: true });
  }

  beginStroke(label: string): void {
    if (this.strokeBefore) return;
    this.strokeLabel = label;
    this.strokeBefore = this.snapshot();
  }

  endStroke(): void {
    if (!this.strokeBefore) return;
    const before = this.strokeBefore;
    this.strokeBefore = null;
    this.commit(this.strokeLabel, before);
    this.mark({});
  }

  undo(): void {
    if (this.strokeBefore) this.endStroke();
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.restore(entry.before);
    this.redoStack.push(entry);
    this.mark({ grid: true, view: true });
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.restore(entry.after);
    this.undoStack.push(entry);
    this.mark({ grid: true, view: true });
  }

  // ── 工程 ──
  loadProject(opts: ProjectOptions, assignment: Assignment | null = null, student = this.student): void {
    this.grid = new VoxelGrid(opts.dims);
    this.layers = buildLayers(opts.layerRows);
    this.assignment = assignment;
    this.student = student;
    this.currentLayerIndex = 0;
    this.soloLayer = null;
    this.hiddenLayers.clear();
    this.selection = null;
    this.clipboard = null;
    this.hover = null;
    this.undoStack = [];
    this.redoStack = [];
    this.strokeBefore = null;
    this.mark({ grid: true, view: true });
  }

  loadSerialized(
    data: { dims: { nx: number; ny: number; nz: number }; mat: string; hidden: string },
    rows: number[],
    assignment: Assignment | null = null,
  ): void {
    this.grid = VoxelGrid.deserialize(data);
    this.layers = buildLayers(rows);
    this.assignment = assignment;
    this.currentLayerIndex = 0;
    this.soloLayer = null;
    this.hiddenLayers.clear();
    this.selection = null;
    this.clipboard = null;
    this.undoStack = [];
    this.redoStack = [];
    this.strokeBefore = null;
    this.mark({ grid: true, view: true });
  }

  // ── 交互状态 ──
  setTool(tool: Tool): void {
    this.tool = tool;
    if (tool === 'select') this.hover = null;
    this.mark({ view: true });
  }

  setMaterial(id: number): void {
    this.material = id;
    if (this.tool === 'erase' || this.tool === 'hide' || this.tool === 'orbit' || this.tool === 'select') {
      this.tool = 'place';
    }
    this.mark({ view: true });
  }

  toggleMirror(): void {
    this.mirror = !this.mirror;
    this.mark({ view: true });
  }

  setCurrentLayer(index: number): void {
    this.currentLayerIndex = Math.max(0, Math.min(this.layers.length - 1, index));
    this.mark({ view: true });
  }

  setSoloLayer(index: number | null): void {
    this.soloLayer = index !== null && this.soloLayer === index ? null : index;
    this.mark({ grid: true, view: true });
  }

  toggleLayer(index: number): void {
    if (this.hiddenLayers.has(index)) this.hiddenLayers.delete(index);
    else this.hiddenLayers.add(index);
    this.mark({ grid: true, view: true });
  }

  showAllLayers(): void {
    this.hiddenLayers.clear();
    this.soloLayer = null;
    this.mark({ grid: true, view: true });
  }

  setHover(hit: RayHit | null): void {
    const prev = this.hover?.index ?? -1;
    const next = hit?.index ?? -1;
    this.hover = hit;
    if (prev !== next) this.mark({ view: true, info: false });
  }

  // ── 编辑 ──
  private ctx() {
    return makeEditContext(this.grid, this.mirror);
  }

  erase(hit: RayHit | null): number {
    if (!hit) return 0;
    const changed = eraseVoxel(this.ctx(), hit.x, hit.y, hit.z).length;
    if (changed) this.mark({ grid: true, view: true });
    return changed;
  }

  /**
   * 在当前层内按柱位落块（拖拽绘制用）：
   * 找到该列本层最上面的实体，在其上方一格放置；已填满本层则跳过，绝不溢出到相邻层。
   */
  placeColumn(x: number, z: number): number {
    if (!this.grid.inBounds(x, 0, z)) return 0;
    const layer = this.currentLayer;
    const top = layer.start + layer.rows - 1;
    let highest = -1;
    for (let y = layer.start; y <= top; y++) {
      if (this.grid.materialAt(x, y, z)) highest = y;
    }
    const target = highest < 0 ? top : highest + 1;
    if (target > top) return 0;
    const changed = placeVoxel(this.ctx(), x, target, z, this.material).length;
    if (changed) this.mark({ grid: true, view: true });
    return changed;
  }

  toggleHiddenAt(hit: RayHit | null): number {
    if (!hit) return 0;
    const currentlyHidden = this.grid.isHidden(hit.x, hit.y, hit.z);
    const changed = hideVoxel(this.ctx(), hit.x, hit.y, hit.z, !currentlyHidden).length;
    if (changed) this.mark({ grid: true, view: true });
    return changed;
  }

  pickMaterial(hit: RayHit | null): number {
    if (!hit) return 0;
    const m = this.grid.materialAt(hit.x, hit.y, hit.z);
    if (m) {
      this.material = m;
      this.tool = 'place';
      this.mark({ view: true });
    }
    return m;
  }

  restoreHidden(): void {
    if (!this.hiddenVoxels) return;
    this.transact('恢复隐藏体素', () => {
      this.grid.hidden.fill(0);
      this.grid.touchAll();
    });
  }

  replaceAll(from: number, to: number, scope: Box | null = null): number {
    let n = 0;
    this.transact(`土色替换 ${from}→${to}`, () => {
      n = replaceMaterial(this.grid, from, to, scope ?? undefined);
    });
    return n;
  }

  clearLayer(index = this.currentLayerIndex): number {
    let n = 0;
    this.transact('清空本层', () => {
      n = clearLayer(this.grid, this.layers[index]);
    });
    return n;
  }

  setSelection(box: Box | null): void {
    this.selection = box ? clampBox(box, this.grid) : null;
    this.mark({ view: true });
  }

  copySelection(): number {
    if (!this.selection) return 0;
    this.clipboard = extractBox(this.grid, this.selection);
    this.mark({});
    return this.clipboard.count;
  }

  pasteToLayer(target: number, keepSource: boolean, yOffset = 0): { moved: number; skipped: number } {
    if (!this.selection) return { moved: 0, skipped: 0 };
    let result = { moved: 0, skipped: 0 };
    this.transact(keepSource ? '复制到目标层' : '平移到目标层', () => {
      const r = moveBoxToLayer(this.grid, this.selection!, this.layers, {
        targetLayer: target,
        mirror: this.mirror,
        keepSource,
        yOffset,
      });
      result = { moved: r.moved, skipped: r.skipped };
      this.selection = r.box;
    });
    return result;
  }

  fillSelection(): number {
    if (!this.selection) return 0;
    const box = this.selection;
    let n = 0;
    this.transact('填充选区', () => {
      for (let y = box.y0; y <= box.y1; y++)
        for (let z = box.z0; z <= box.z1; z++)
          for (let x = box.x0; x <= box.x1; x++)
            if (this.grid.setMaterial(x, y, z, this.material)) n++;
    });
    return n;
  }

  clearSelection(): number {
    if (!this.selection) return 0;
    const box = this.selection;
    let n = 0;
    this.transact('清除选区', () => {
      for (let y = box.y0; y <= box.y1; y++)
        for (let z = box.z0; z <= box.z1; z++)
          for (let x = box.x0; x <= box.x1; x++)
            if (this.grid.setMaterial(x, y, z, 0)) n++;
    });
    return n;
  }

  // ── 评分与导出 ──
  grade(): AutoGradeResult {
    const m = mirrorConsistency(this.grid);
    return autoGrade({
      layerFilled: Array.from(this.grid.countsByLayer(this.layers)),
      shares: this.stats.shares,
      expectedShares: this.expectedShares,
      mirrorRatio: m.ratio,
      mirrorRequired: this.assignment?.mirrorRequired ?? this.mirror,
      triCount: this.mesh.triCount,
      faceBudget: this.faceBudget,
      hiddenCount: this.hiddenVoxels,
    });
  }

  decimate(budget = this.faceBudget): DecimateResult {
    return decimateToBudget(this.grid, budget > 0 ? budget : Math.floor(this.mesh.triCount / 2));
  }

  /** 导出当前可见内容；decimate=true 时先按预算减面 */
  buildObj(useDecimation: boolean, budget = this.faceBudget): {
    obj: string;
    mtl: string;
    triangles: number;
    factor: number;
    decimated: boolean;
  } {
    let mesh = this.mesh;
    let factor = 1;
    let decimated = false;
    if (useDecimation && budget > 0 && mesh.triCount > budget) {
      const r = decimateToBudget(this.grid, budget);
      mesh = r.mesh;
      factor = r.factor;
      decimated = r.factor > 1;
    }
    return {
      obj: meshToObj(mesh, mesh === this.mesh ? this.grid.dims : { nx: Math.ceil(this.grid.dims.nx / factor), ny: Math.ceil(this.grid.dims.ny / factor), nz: Math.ceil(this.grid.dims.nz / factor) }, {
        scale: factor,
      }),
      mtl: meshToMtl(mesh),
      triangles: mesh.triCount,
      factor,
      decimated,
    };
  }

  buildSubmission(a: Assignment, student: string): Submission {
    const graded = this.grade();
    const checks: CheckSnapshot[] = graded.checks.map((c) => ({ ...c }));
    const issues: Issue[] = graded.issues.map((i) => ({ ...i }));
    const stats = this.stats;
    return {
      id: makeId('sub'),
      assignmentId: a.id,
      student: student.trim() || '未署名',
      submittedAt: new Date().toISOString(),
      late: deadlineState(a) === 'late',
      payload: {
        dims: { ...this.grid.dims },
        mat: encodeRle(this.grid.mat),
        hidden: encodeRle(this.grid.hidden),
      },
      stats: {
        voxelCount: stats.voxelCount,
        layerFilled: [...stats.layerFilled],
        shares: [...stats.shares],
        mirrorRatio: stats.mirrorRatio,
        triCount: this.mesh.triCount,
        hiddenCount: this.hiddenVoxels,
      },
      autoScore: graded.total,
      autoMax: graded.max,
      checks,
      issues,
    };
  }

  // ── 草稿 ──
  saveDraft(): void {
    try {
      localStorage.setItem(
        WORK_KEY,
        JSON.stringify({
          v: 2,
          student: this.student,
          assignmentId: this.assignment?.id ?? null,
          rows: this.layers.map((l) => l.rows),
          data: this.grid.serialize(),
          savedAt: new Date().toISOString(),
        }),
      );
    } catch (err) {
      console.warn('[draft] 保存失败', err);
    }
  }

  static readDraft(): {
    student: string;
    assignmentId: string | null;
    rows: number[];
    data: { dims: { nx: number; ny: number; nz: number }; mat: string; hidden: string };
    savedAt: string;
  } | null {
    try {
      const raw = localStorage.getItem(WORK_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p?.data?.mat || !Array.isArray(p.rows)) return null;
      return p;
    } catch {
      return null;
    }
  }

  /** 草稿是否与当前题目规格一致（尺寸与层厚都要吻合，否则会拿旧作业评新题） */
  static draftMatches(
    draft: { rows: number[]; data: { dims: { nx: number; ny: number; nz: number } } } | null,
    a: Assignment,
  ): boolean {
    if (!draft) return false;
    const d = draft.data.dims;
    if (d.nx !== a.nx || d.ny !== a.ny || d.nz !== a.nz) return false;
    if (draft.rows.length !== a.layerRows.length) return false;
    return draft.rows.every((r, i) => r === a.layerRows[i]);
  }

  static clearDraft(): void {
    try {
      localStorage.removeItem(WORK_KEY);
    } catch {
      /* ignore */
    }
  }
}

function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  if (a.mat.length !== b.mat.length) return false;
  for (let i = 0; i < a.mat.length; i++) {
    if (a.mat[i] !== b.mat[i]) return false;
  }
  if (a.hidden.length !== b.hidden.length) return false;
  for (let i = 0; i < a.hidden.length; i++) {
    if (a.hidden[i] !== b.hidden[i]) return false;
  }
  return true;
}

export function materialName(id: number): string {
  return MATERIALS.find((m) => m.id === id)?.name ?? '空';
}

export function materialShort(id: number): string {
  return MATERIALS.find((m) => m.id === id)?.short ?? '—';
}
