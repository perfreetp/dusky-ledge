import type { Pt } from '@shared/types';

export const EPS = 1e-7;

export function polylinesBounds(paths: Pt[][]): Rect {
  const all: Pt[] = [];
  for (const p of paths) all.push(...p);
  return rectFromPoints(all);
}

export const pt = (x: number, y: number): Pt => ({ x, y });

export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, s: number): Pt => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y;
export const cross = (a: Pt, b: Pt): number => a.x * b.y - a.y * b.x;
export const len = (a: Pt): number => Math.hypot(a.x, a.y);
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a: Pt, b: Pt): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const norm = (a: Pt): Pt => {
  const l = len(a);
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
export const perp = (a: Pt): Pt => ({ x: -a.y, y: a.x });
export const angleOf = (a: Pt): number => Math.atan2(a.y, a.x);
export const roundTo = (v: number, step: number): number => (step > 0 ? Math.round(v / step) * step : v);

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const emptyRect = (): Rect => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

export function rectFromPoints(points: Pt[]): Rect {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function rectsUnion(rects: Rect[]): Rect {
  const r = emptyRect();
  for (const b of rects) {
    r.minX = Math.min(r.minX, b.minX);
    r.minY = Math.min(r.minY, b.minY);
    r.maxX = Math.max(r.maxX, b.maxX);
    r.maxY = Math.max(r.maxY, b.maxY);
  }
  return r;
}

export const unionBounds = rectsUnion;

export const rectW = (r: Rect): number => Math.max(0, r.maxX - r.minX);
export const rectH = (r: Rect): number => Math.max(0, r.maxY - r.minY);
export const rectCenter = (r: Rect): Pt => ({ x: (r.minX + r.maxX) / 2, y: (r.minY + r.maxY) / 2 });

export function rectContains(r: Rect, p: Pt): boolean {
  return p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

export function rectExpand(r: Rect, amount: number): Rect {
  return { minX: r.minX - amount, minY: r.minY - amount, maxX: r.maxX + amount, maxY: r.maxY + amount };
}

/** Distance from point p to segment ab; also returns projection parameter t in [0,1]. */
export function closestOnSegment(p: Pt, a: Pt, b: Pt): { point: Pt; t: number; dist: number } {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  let t = l2 < EPS ? 0 : dot(sub(p, a), ab) / l2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const q = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return { point: q, t, dist: dist(p, q) };
}

export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  return closestOnSegment(p, a, b).dist;
}

export function distToPolyline(p: Pt, line: Pt[], closed = false): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return dist(p, line[0]);
  let best = Infinity;
  const n = line.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const d = distToSegment(p, line[i], line[(i + 1) % n]);
    if (d < best) best = d;
  }
  return best;
}

/** Signed area; positive for clockwise in screen coords (y down) when using standard shoelace. */
export function ringArea(ring: Pt[]): number {
  let a = 0;
  const n = ring.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export const ringAreaAbs = (ring: Pt[]): number => Math.abs(ringArea(ring));

export function polygonsArea(rings: Pt[][]): number {
  let sum = 0;
  for (const r of rings) sum += ringArea(r);
  return Math.abs(sum);
}

export function pointInRing(p: Pt, ring: Pt[]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.y > p.y !== b.y > p.y) {
      const xInt = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
      if (p.x < xInt) inside = !inside;
    }
  }
  return inside;
}

/** Even-odd containment across multiple rings. */
export function pointInRings(p: Pt, rings: Pt[][]): boolean {
  let inside = false;
  for (const ring of rings) {
    if (pointInRing(p, ring)) inside = !inside;
  }
  return inside;
}

export function ringCentroid(ring: Pt[]): Pt {
  let a = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    const f = p.x * q.y - q.x * p.y;
    a += f;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  if (Math.abs(a) < EPS) {
    // degenerate: average vertices
    let x = 0;
    let y = 0;
    for (const p of ring) {
      x += p.x;
      y += p.y;
    }
    return { x: x / Math.max(1, n), y: y / Math.max(1, n) };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

export function lineIntersection(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const r = sub(a2, a1);
  const s = sub(b2, b1);
  const d = cross(r, s);
  if (Math.abs(d) < 1e-12) return null;
  const t = cross(sub(b1, a1), s) / d;
  const u = cross(sub(b1, a1), r) / d;
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
  return { x: a1.x + r.x * t, y: a1.y + r.y * t };
}

/** Intersection of two segments including endpoints; null when parallel or outside. */
export function segIntersect(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / den;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a1.x + d1x * t, y: a1.y + d1y * t };
}

/** Proper crossing (interiors intersect), excluding shared endpoints. */
export function segmentsProperlyCross(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const p = lineIntersection(a1, a2, b1, b2);
  if (!p) return null;
  const near = (u: Pt, v: Pt) => Math.abs(u.x - v.x) < 1e-7 && Math.abs(u.y - v.y) < 1e-7;
  if (near(p, a1) || near(p, a2) || near(p, b1) || near(p, b2)) return null;
  return p;
}

export function segmentsIntersect(a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean {
  return lineIntersection(a1, a2, b1, b2) !== null;
}

export function polylineLength(line: Pt[], closed = false): number {
  let l = 0;
  const n = line.length;
  if (n < 2) return 0;
  const end = closed ? n : n - 1;
  for (let i = 0; i < end; i++) l += dist(line[i], line[(i + 1) % n]);
  return l;
}

/** Remove consecutive duplicate points, optionally forcing ring closure. */
export function dedupeLine(line: Pt[], closeRing = false): Pt[] {
  const out: Pt[] = [];
  for (const p of line) {
    const prev = out[out.length - 1];
    if (!prev || dist(prev, p) > 1e-9) out.push({ x: p.x, y: p.y });
  }
  if (closeRing && out.length > 2 && dist(out[0], out[out.length - 1]) < 1e-9) out.pop();
  return out;
}

/** Drop vertices that are collinear within tolerance. */
export function simplifyCollinear(line: Pt[], tol = 0.01, closed = false): Pt[] {
  const pts = dedupeLine(line, closed);
  if (pts.length < 3) return pts;
  const out: Pt[] = [];
  const n = pts.length;
  const keep = (i: number) => pts[i];
  if (!closed) {
    out.push(keep(0));
    for (let i = 1; i < n - 1; i++) {
      const a = out[out.length - 1];
      const b = pts[i];
      const c = pts[i + 1];
      const ab = sub(b, a);
      const bc = sub(c, b);
      const area = Math.abs(cross(ab, bc)) / (len(ab) + len(bc) + 1e-12);
      if (area > tol) out.push(b);
    }
    out.push(pts[n - 1]);
    return out;
  }
  // closed: test every vertex against neighbours in a ring
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const b = pts[i];
    const c = pts[(i + 1) % n];
    const ab = sub(b, a);
    const bc = sub(c, b);
    const area = Math.abs(cross(ab, bc)) / (len(ab) + len(bc) + 1e-12);
    if (area > tol) out.push(b);
  }
  return out.length >= 3 ? out : pts;
}

export function rotatePoint(p: Pt, center: Pt, radians: number): Pt {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return { x: center.x + dx * c - dy * s, y: center.y + dx * s + dy * c };
}

export function transformPoints(points: Pt[], fn: (p: Pt) => Pt): Pt[] {
  return points.map(fn);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Group flat rings (even-odd) into outer polygons with holes by containment depth. */
export function groupRings(rings: Pt[][]): { outer: Pt[]; holes: Pt[][] }[] {
  const items = rings
    .filter((r) => r.length >= 3 && Math.abs(ringArea(r)) > 1e-9)
    .map((r) => ({ ring: r, area: Math.abs(ringArea(r)), rep: r[0] }));
  items.sort((a, b) => b.area - a.area);
  const depth = new Array(items.length).fill(0);
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      if (items[j].area <= items[i].area) continue;
      if (pointInRing(items[i].rep, items[j].ring)) depth[i]++;
    }
  }
  const out: { outer: Pt[]; holes: Pt[][] }[] = [];
  const indexOfOuter: number[] = [];
  for (let i = 0; i < items.length; i++) {
    if (depth[i] % 2 === 0) {
      indexOfOuter[i] = out.length;
      out.push({ outer: items[i].ring, holes: [] });
    }
  }
  for (let i = 0; i < items.length; i++) {
    if (depth[i] % 2 === 1) {
      let best = -1;
      let bestArea = Infinity;
      for (let j = 0; j < items.length; j++) {
        if (depth[j] % 2 !== 0) continue;
        if (items[j].area < items[i].area || items[j].area >= bestArea) continue;
        if (pointInRing(items[i].rep, items[j].ring)) {
          best = j;
          bestArea = items[j].area;
        }
      }
      if (best >= 0) out[indexOfOuter[best]].holes.push(items[i].ring);
    }
  }
  return out;
}

/** Is point inside a grouped polygon set (even-odd per group)? */
export function pointInGrouped(p: Pt, groups: { outer: Pt[]; holes: Pt[][] }[]): boolean {
  for (const g of groups) {
    if (pointInRing(p, g.outer) && !g.holes.some((h) => pointInRing(p, h))) return true;
  }
  return false;
}

export function bboxOfGroups(groups: { outer: Pt[]; holes: Pt[][] }[]): Rect {
  const all: Pt[] = [];
  for (const g of groups) {
    all.push(...g.outer);
    for (const h of g.holes) all.push(...h);
  }
  return rectFromPoints(all);
}

export function roundPt(p: Pt, digits = 3): Pt {
  const f = 10 ** digits;
  return { x: Math.round(p.x * f) / f, y: Math.round(p.y * f) / f };
}
