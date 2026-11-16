import type { PlanDoc } from '@shared/types';

export interface HistoryEntry {
  label: string;
  doc: PlanDoc;
  /** ms timestamp, used for coalescing successive micro-edits */
  time: number;
  selection: string[];
}

export interface HistoryOptions {
  /** maximum retained entries; spec requires at least 50 — default well above */
  limit?: number;
}

/**
 * Snapshot-based undo stack on immutable documents. Keeping whole doc snapshots is
 * cheap here because documents are plain JSON (features are small) and every edit
 * already produces a new object. Coalescing makes dragging produce one undo step.
 */
export class History {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private limit: number;
  private coalesceKey: string | null = null;
  private coalesceUntil = 0;

  constructor(opts: HistoryOptions = {}) {
    this.limit = Math.max(50, opts.limit ?? 200);
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  get undoLabel(): string | null {
    return this.past.length ? this.past[this.past.length - 1].label : null;
  }
  get redoLabel(): string | null {
    return this.future.length ? this.future[this.future.length - 1].label : null;
  }
  get depth(): number {
    return this.past.length;
  }

  /** Record the state *before* an edit. */
  push(label: string, doc: PlanDoc, selection: string[], coalesceKey?: string, now = Date.now()): void {
    if (coalesceKey && this.coalesceKey === coalesceKey && now <= this.coalesceUntil && this.past.length > 0) {
      // collapse a continuous gesture into one entry
      this.coalesceUntil = now + 600;
      this.future = [];
      return;
    }
    this.past.push({ label, doc, time: now, selection: [...selection] });
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    this.coalesceKey = coalesceKey ?? null;
    this.coalesceUntil = now + (coalesceKey ? 600 : 0);
  }

  /** Break coalescing, e.g. on pointer-up. */
  commit(): void {
    this.coalesceKey = null;
    this.coalesceUntil = 0;
  }

  undo(current: PlanDoc, selection: string[]): { doc: PlanDoc; selection: string[]; label: string } | null {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.push({ label: entry.label, doc: current, time: Date.now(), selection: [...selection] });
    this.commit();
    return { doc: entry.doc, selection: entry.selection, label: entry.label };
  }

  redo(current: PlanDoc, selection: string[]): { doc: PlanDoc; selection: string[]; label: string } | null {
    const entry = this.future.pop();
    if (!entry) return null;
    this.past.push({ label: entry.label, doc: current, time: Date.now(), selection: [...selection] });
    this.commit();
    return { doc: entry.doc, selection: entry.selection, label: entry.label };
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.commit();
  }

  /** Serializable summary for the UI. */
  list(): { label: string; canRedo: boolean }[] {
    return this.past.map((p) => ({ label: p.label, canRedo: false }));
  }
}
