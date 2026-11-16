import type { Feature, GridSettings, Pt } from '@shared/types';
import { closestOnSegment, dist, mid } from './math';

export type SnapKind = 'endpoint' | 'midpoint' | 'segment' | 'grid' | 'center' | 'vertex';

export interface SnapHit {
  point: Pt;
  kind: SnapKind;
  distance: number;
  featureId?: string;
  /** for segment snaps, the segment endpoints */
  segment?: [Pt, Pt];
  /** for rings, index of the vertex */
  vertexIndex?: number;
}

export interface SnapSettings extends GridSettings {
  /** extra snap radius in screen px converted to mm by caller */
  extra?: boolean;
}

const keyOf = (x: number, y: number, cell: number): string => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;

/**
 * Immutable snap index built from document features. Vertices/midpoints/segments are
 * bucketed in a uniform grid so dragging stays O(1)-ish even with 10k+ vertices.
 */
export class SnapIndex {
  private cell: number;
  private vertices = new Map<string, { p: Pt; fid: string; idx: number; ring: boolean }[]>();
  private mids = new Map<string, { p: Pt; fid: string; idx: number; ring: boolean }[]>();
  private centers: { p: Pt; fid: string }[] = [];
  private segments: { a: Pt; b: Pt; fid: string }[] = [];
  private settings: GridSettings;
  private featureCount: number;

  constructor(features: Feature[], settings: GridSettings, cell = 500) {
    this.settings = settings;
    this.cell = cell;
    this.featureCount = features.length;
    for (const f of features) {
      if (!f.visible || f.locked) continue;
      for (const line of f.paths) {
        for (let i = 0; i < line.length; i++) {
          this.pushVertex(line[i], f.id, i, false);
          if (i + 1 < line.length) {
            const b = line[i + 1];
            this.pushMid(mid(line[i], b), f.id);
            this.pushSegment(line[i], b, f.id);
          }
        }
      }
      for (const ring of f.rings) {
        if (ring.length < 3) continue;
        for (let i = 0; i < ring.length; i++) {
          this.pushVertex(ring[i], f.id, i, true);
          const b = ring[(i + 1) % ring.length];
          this.pushMid(mid(ring[i], b), f.id);
          this.pushSegment(ring[i], b, f.id);
        }
        let cx = 0;
        let cy = 0;
        for (const p of ring) {
          cx += p.x;
          cy += p.y;
        }
        this.centers.push({ p: { x: cx / ring.length, y: cy / ring.length }, fid: f.id });
      }
    }
  }

  private pushVertex(p: Pt, fid: string, idx: number, ring: boolean) {
    const k = keyOf(p.x, p.y, this.cell);
    const arr = this.vertices.get(k) ?? [];
    arr.push({ p, fid, idx, ring });
    this.vertices.set(k, arr);
  }
  private pushMid(p: Pt, fid: string) {
    const k = keyOf(p.x, p.y, this.cell);
    const arr = this.mids.get(k) ?? [];
    arr.push({ p, fid, idx: -1, ring: false });
    this.mids.set(k, arr);
  }
  private pushSegment(a: Pt, b: Pt, fid: string) {
    this.segments.push({ a, b, fid });
  }

  /** Query nearest snap target within tolerance (mm). */
  query(raw: Pt, tolMm: number, opts: { excludeFeatureIds?: Set<string>; kinds?: SnapKind[] } = {}): SnapHit | null {
    const tol = Math.max(0.5, tolMm);
    const kinds = new Set<SnapKind>(opts.kinds ?? ['endpoint', 'midpoint', 'segment', 'center', 'grid']);
    const exclude = opts.excludeFeatureIds ?? new Set<string>();
    const state: { best: SnapHit | null } = { best: null };

    const push = (h: SnapHit | null) => {
      if (!h || exclude.has(h.featureId ?? '')) return;
      const best = state.best;
      if (!best) {
        state.best = h;
        return;
      }
      // Scale-free preference: a candidate wins when it is closer *after* dividing
      // by its priority. So a midpoint at 50 mm beats a segment point at 30 mm,
      // but a segment point at 5 mm still beats a midpoint at 100 mm.
      const hs = h.distance / priorityWeight(h.kind);
      const cs = best.distance / priorityWeight(best.kind);
      if (hs < cs) state.best = h;
    };

    const scan = (map: Map<string, { p: Pt; fid: string; idx: number; ring: boolean }[]>, kind: SnapKind, priority: number) => {
      const cx = Math.floor(raw.x / this.cell);
      const cy = Math.floor(raw.y / this.cell);
      let found: SnapHit | null = null;
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const list = map.get(`${gx},${gy}`);
          if (!list) continue;
          for (const v of list) {
            if (exclude.has(v.fid)) continue;
            const d = dist(raw, v.p);
            if (d > tol) continue;
            const score = d / priority;
            if (!found || score < found.distance / priorityWeight(found.kind)) {
              found = { point: { x: v.p.x, y: v.p.y }, kind, distance: d, featureId: v.fid, vertexIndex: v.idx };
            }
          }
        }
      }
      return found;
    };

    if (kinds.has('endpoint')) push(scan(this.vertices, 'endpoint', priorityWeight('endpoint')));
    if (kinds.has('midpoint')) push(scan(this.mids, 'midpoint', priorityWeight('midpoint')));
    if (kinds.has('center')) {
      for (const c of this.centers) {
        if (exclude.has(c.fid)) continue;
        const d = dist(raw, c.p);
        if (d <= tol) push({ point: c.p, kind: 'center', distance: d, featureId: c.fid });
      }
    }
    if (kinds.has('segment') && this.settings.snapSegments) {
      for (const s of this.segments) {
        if (exclude.has(s.fid)) continue;
        const r = closestOnSegment(raw, s.a, s.b);
        if (r.dist > tol) continue;
        if (r.t < 0.02 || r.t > 0.98) continue;
        push({ point: r.point, kind: 'segment', distance: r.dist, featureId: s.fid, segment: [s.a, s.b] });
      }
    }
    if (kinds.has('grid') && this.settings.snapGrid) {
      const gp = {
        x: Math.round(raw.x / this.settings.minor) * this.settings.minor,
        y: Math.round(raw.y / this.settings.minor) * this.settings.minor,
      };
      const d = dist(raw, gp);
      if (d <= tol) push({ point: gp, kind: 'grid', distance: d });
    }
    const hit = state.best as SnapHit | null;
    if (hit && hit.distance > tol) return null;
    return hit;
  }

  get size(): number {
    return this.featureCount;
  }
}

function priorityWeight(kind: SnapKind): number {
  switch (kind) {
    case 'endpoint':
      return 3;
    case 'midpoint':
      return 2;
    case 'center':
      return 1.6;
    case 'segment':
      return 1;
    case 'grid':
      return 0.7;
    default:
      return 1;
  }
}
