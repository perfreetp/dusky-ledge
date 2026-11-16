import type { Contour, Pt } from '../types';

export type SnapKind = 'endpoint' | 'midpoint' | 'edge' | 'grid' | 'none';

export interface SnapResult {
  point: Pt;
  kind: SnapKind;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** 点到线段最近点(投影),返回投影点与距离 */
function closestOnSegment(p: Pt, a: Pt, b: Pt): { pt: Pt; d: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-9) return { pt: a, d: dist(p, a) };
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const pt = { x: a.x + t * abx, y: a.y + t * aby };
  return { pt, d: dist(p, pt) };
}

/**
 * 吸附按优先级逐级判定: 端点 > 中线(中点) > 相邻边投影 > 网格。
 * 同一优先级内取最近者;spacing 为网格间距(默认10mm,可调到2mm),tol 为对象吸附容差(mm)。
 */
export function snapPoint(
  raw: Pt,
  contours: Contour[],
  draft: Pt[],
  spacing: number,
  tol = 8,
): SnapResult {
  const allContours: { points: Pt[]; closed: boolean }[] = [
    ...contours.map((c) => ({ points: c.points, closed: c.closed })),
    { points: draft, closed: false },
  ];

  const nearest = (
    candidates: { pt: Pt; kind: SnapKind }[],
    maxTol: number,
  ): SnapResult | null => {
    let best: SnapResult | null = null;
    let bestD = maxTol;
    for (const { pt, kind } of candidates) {
      const d = dist(raw, pt);
      if (d <= bestD) {
        bestD = d;
        best = { point: { x: pt.x, y: pt.y }, kind };
      }
    }
    return best;
  };

  const endpoints: { pt: Pt; kind: SnapKind }[] = [];
  const midpoints: { pt: Pt; kind: SnapKind }[] = [];
  const edges: { pt: Pt; kind: SnapKind }[] = [];

  for (const c of allContours) {
    const pts = c.points;
    for (const p of pts) endpoints.push({ pt: p, kind: 'endpoint' });
    const segCount = c.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < segCount; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      midpoints.push({
        pt: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        kind: 'midpoint',
      });
      edges.push({ pt: closestOnSegment(raw, a, b).pt, kind: 'edge' });
    }
  }

  return (
    nearest(endpoints, tol) ??
    nearest(midpoints, tol) ??
    nearest(edges, tol * 0.75) ?? {
      // 网格吸附
      point: {
        x: Math.round(raw.x / spacing) * spacing,
        y: Math.round(raw.y / spacing) * spacing,
      },
      kind: 'grid',
    }
  );
}
