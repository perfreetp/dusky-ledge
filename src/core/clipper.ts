import ClipperLib, { type IntPoint } from 'clipper-lib';
import type { Pt } from '@shared/types';
import { groupRings, type Rect, rectFromPoints, segIntersect } from './math';

/**
 * Clipper works in integer space. Values are multiplied by 100 (0.01 mm resolution),
 * which is far below any real marking tolerance but safely inside int32 for a
 * 20 km workshop floor.
 */
export const SCALE = 100;

const toPath = (pts: Pt[]): IntPoint[] => pts.map((p) => ({ X: Math.round(p.x * SCALE), Y: Math.round(p.y * SCALE) }));
const fromPath = (path: IntPoint[]): Pt[] => path.map((p) => ({ x: p.X / SCALE, y: p.Y / SCALE }));

export type BoolOp = 'union' | 'intersection' | 'difference' | 'xor';

const clipTypeFor = (op: BoolOp) => {
  const T = ClipperLib.ClipType;
  switch (op) {
    case 'union':
      return T.ctUnion;
    case 'intersection':
      return T.ctIntersection;
    case 'difference':
      return T.ctDifference;
    case 'xor':
      return T.ctXor;
  }
};

export interface BoolInput {
  /** subject polygons as flat rings (even-odd within subject) */
  subject: Pt[][];
  /** clip polygons */
  clip?: Pt[][];
  op: BoolOp;
}

/** Run a boolean on closed polygons. Returns closed rings (outers + holes). */
export function booleanPolygons({ subject, clip = [], op }: BoolInput): Pt[][] {
  if (subject.length === 0) {
    if (op === 'union' || op === 'xor') return clip.map((r) => fromPath(toPath(r)));
    return [];
  }
  const c = new ClipperLib.Clipper();
  const subj = subject.map(toPath).filter((p) => p.length >= 3);
  const clp = clip.map(toPath).filter((p) => p.length >= 3);
  if (!subj.length) return [];
  c.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
  if (clp.length) c.AddPaths(clp, ClipperLib.PolyType.ptClip, true);
  const tree = new ClipperLib.PolyTree();
  const ok = c.Execute(
    clipTypeFor(op),
    tree,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );
  if (!ok) return [];
  const exps = ClipperLib.JS.PolyTreeToExPolygons(tree);
  const rings: Pt[][] = [];
  for (const ex of exps) {
    if (ex.outer && ex.outer.length >= 3) rings.push(fromPath(ex.outer));
    for (const h of ex.holes ?? []) if (h.length >= 3) rings.push(fromPath(h));
  }
  return rings;
}

export function unionPolygons(subject: Pt[][], clip: Pt[][] = []): Pt[][] {
  return booleanPolygons({ subject, clip, op: 'union' });
}

export function differencePolygons(subject: Pt[][], clip: Pt[][]): Pt[][] {
  return booleanPolygons({ subject, clip, op: 'difference' });
}

export function intersectPolygons(subject: Pt[][], clip: Pt[][]): Pt[][] {
  return booleanPolygons({ subject, clip, op: 'intersection' });
}

export interface OffsetOptions {
  join?: 'miter' | 'round' | 'square';
  miterLimit?: number;
  closed?: boolean;
  /** end cap for open paths */
  end?: 'butt' | 'round' | 'square';
}

/** Offset polygons by delta mm (positive = outward for closed paths). */
export function offsetPolygons(rings: Pt[][], delta: number, opts: OffsetOptions = {}): Pt[][] {
  if (rings.length === 0) return [];
  const J = ClipperLib.JoinType;
  const E = ClipperLib.EndType;
  const join = opts.join === 'round' ? J.jtRound : opts.join === 'square' ? J.jtSquare : J.jtMiter;
  const end = opts.end === 'round' ? E.etOpenRound : opts.end === 'square' ? E.etOpenSquare : E.etOpenButt;
  const co = new ClipperLib.ClipperOffset(opts.miterLimit ?? 2, 0.05 * SCALE);
  co.AddPaths(
    rings.filter((r) => r.length >= (opts.closed === false ? 2 : 3)).map(toPath),
    join,
    opts.closed === false ? end : E.etClosedPolygon
  );
  const sol = new ClipperLib.Paths();
  co.Execute(sol, delta * SCALE);
  const paths = sol.map(fromPath).filter((p) => p.length >= 3);
  return groupRings(paths).flatMap((g) => [g.outer, ...g.holes]);
}

/** Offset an open polyline into a closed band outline (stroke geometry). */
export function strokeOutline(lines: Pt[][], width: number, opts: OffsetOptions = {}): Pt[][] {
  const half = width / 2;
  if (half <= 0) return [];
  const co = new ClipperLib.ClipperOffset(2, 0.05 * SCALE);
  const E = ClipperLib.EndType;
  const J =
    opts.join === 'square'
      ? ClipperLib.JoinType.jtSquare
      : opts.join === 'round'
        ? ClipperLib.JoinType.jtRound
        : ClipperLib.JoinType.jtMiter;
  const end = opts.end === 'round' ? E.etOpenRound : opts.end === 'square' ? E.etOpenSquare : E.etOpenButt;
  const valid = lines.filter((l) => l.length >= 2);
  if (!valid.length) return [];
  co.AddPaths(valid.map(toPath), J, end);
  const sol = new ClipperLib.Paths();
  co.Execute(sol, half * SCALE);
  return sol.map(fromPath).filter((p) => p.length >= 3);
}

/**
 * Merge open paths into longer polylines ("两条线相交合并成一条流水线").
 *
 * Build a planar graph: endpoints within `tolerance` snap to one node and paths are
 * split at their crossings with other paths. Then walk the graph, preferring the
 * straightest continuation at every junction. Chains that collapse into a loop are
 * returned closed (last point repeated).
 */
export function mergeOpenPaths(lines: Pt[][], tolerance = 0.5): { paths: Pt[][]; mergedGroups: number[][] } {
  const tol = Math.max(1e-6, tolerance);
  const valid = lines.filter((l) => l.length >= 2);
  if (!valid.length) return { paths: [], mergedGroups: [] };

  const nodes: Pt[] = [];
  const nodeIndex = (p: Pt): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (Math.abs(nodes[i].x - p.x) <= tol && Math.abs(nodes[i].y - p.y) <= tol) return i;
    }
    nodes.push({ x: p.x, y: p.y });
    return nodes.length - 1;
  };

  interface Edge {
    a: number;
    b: number;
    src: number;
  }
  const edges: Edge[] = [];

  for (let si = 0; si < valid.length; si++) {
    const line = valid[si];
    const splits: { t: number; p: Pt }[] = [];
    splits.push({ t: 0, p: line[0] });
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i];
      const b = line[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      for (let sj = 0; sj < valid.length; sj++) {
        if (sj === si) continue;
        const other = valid[sj];
        for (let j = 0; j + 1 < other.length; j++) {
          const hit = segIntersect(a, b, other[j], other[j + 1]);
          if (!hit) continue;
          const t = l2 < 1e-12 ? 0 : ((hit.x - a.x) * dx + (hit.y - a.y) * dy) / l2;
          if (t > 1e-9 && t < 1 - 1e-9) splits.push({ t: i + t, p: hit });
        }
      }
    }
    splits.push({ t: line.length - 1, p: line[line.length - 1] });
    splits.sort((u, v) => u.t - v.t);

    const chain: { t: number; n: number }[] = [];
    for (const s of splits) {
      const n = nodeIndex(s.p);
      if (chain.length && chain[chain.length - 1].n === n) continue;
      chain.push({ t: s.t, n });
    }
    for (let i = 0; i + 1 < chain.length; i++) {
      if (chain[i].n === chain[i + 1].n) continue;
      edges.push({ a: chain[i].n, b: chain[i + 1].n, src: si });
    }
  }

  const adj: { edge: number; other: number }[][] = nodes.map(() => []);
  edges.forEach((e, i) => {
    adj[e.a].push({ edge: i, other: e.b });
    adj[e.b].push({ edge: i, other: e.a });
  });

  const used = new Array(edges.length).fill(false);
  const out: Pt[][] = [];
  const groups: number[][] = [];

  const walk = (startNode: number, startEdge: number): { chain: Pt[]; srcs: number[] } => {
    const pts: Pt[] = [{ ...nodes[startNode] }];
    const srcs: number[] = [];
    let curEdge = startEdge;
    let curNode = startNode;
    let inDir = { x: 0, y: 0 };
    for (;;) {
      used[curEdge] = true;
      const e = edges[curEdge];
      srcs.push(e.src);
      const next = e.a === curNode ? e.b : e.a;
      inDir = norm({ x: nodes[next].x - nodes[curNode].x, y: nodes[next].y - nodes[curNode].y });
      pts.push({ ...nodes[next] });
      curNode = next;
      let bestEdge = -1;
      let bestScore = -Infinity;
      for (const cand of adj[curNode]) {
        if (used[cand.edge]) continue;
        const e2 = edges[cand.edge];
        const b2 = e2.a === curNode ? e2.b : e2.a;
        const outDir = norm({ x: nodes[b2].x - nodes[curNode].x, y: nodes[b2].y - nodes[curNode].y });
        const score = inDir.x * outDir.x + inDir.y * outDir.y;
        if (score > bestScore) {
          bestScore = score;
          bestEdge = cand.edge;
        }
      }
      if (bestEdge < 0) break;
      if (bestScore < -0.98) break;
      curEdge = bestEdge;
    }
    return { chain: pts, srcs };
  };

  const starts: number[] = [];
  // endpoints of chains first, then junctions (loop-only graphs)
  for (let i = 0; i < nodes.length; i++) if (adj[i].length % 2 === 1) starts.push(i);
  for (let i = 0; i < nodes.length; i++) if (adj[i].length % 2 === 0) starts.push(i);

  for (const s of starts) {
    for (const cand of adj[s]) {
      if (used[cand.edge]) continue;
      const { chain, srcs } = walk(s, cand.edge);
      if (chain.length >= 2) {
        out.push(dedupe(chain));
        groups.push([...new Set(srcs)]);
      }
    }
  }
  return { paths: out, mergedGroups: groups };
}

function dedupe(pts: Pt[]): Pt[] {
  const o: Pt[] = [];
  for (const p of pts) {
    const l = o[o.length - 1];
    if (!l || Math.hypot(l.x - p.x, l.y - p.y) > 1e-7) o.push(p);
  }
  return o;
}

function norm(p: Pt): Pt {
  const l = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / l, y: p.y / l };
}

/** Bounding box of a set of polylines. */
export function pathsBounds(paths: Pt[][]): Rect {
  const all: Pt[] = [];
  for (const p of paths) all.push(...p);
  return rectFromPoints(all);
}

export { toPath, fromPath };
