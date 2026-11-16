import type { Pt, StrokeStyleType } from '@shared/types';
import { dist } from './math';

export interface StrokeTriangleData {
  /** x,y triples (world mm) */
  positions: number[];
}

/**
 * Expand a polyline (open or closed) into world-space triangles for a stroke of the
 * given width. Solid strokes become mitred quads per segment; dashes/dots are laid
 * out along arc length so the pattern is exact at any zoom and in the SVG export.
 */
export function strokeTriangles(
  lines: { pts: Pt[]; closed: boolean }[],
  width: number,
  style: StrokeStyleType = 'solid',
  scale = 1
): StrokeTriangleData {
  const w = Math.max(0.01, width);
  const out: number[] = [];
  for (const { pts, closed } of lines) {
    if (pts.length < 2) continue;
    if (style === 'solid') {
      solidPath(out, pts, closed, w);
    } else {
      const dashLen = style === 'dotted' ? w : w * 6 * scale;
      const gapLen = style === 'dotted' ? w * 1.6 : w * 3 * scale;
      dashedPath(out, pts, closed, w, dashLen, gapLen, style === 'dotted');
    }
  }
  return { positions: out };
}

function quad(out: number[], a: Pt, b: Pt, w: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy);
  if (l < 1e-9) return;
  const nx = (-dy / l) * (w / 2);
  const ny = (dx / l) * (w / 2);
  const p1 = { x: a.x + nx, y: a.y + ny };
  const p2 = { x: b.x + nx, y: b.y + ny };
  const p3 = { x: b.x - nx, y: b.y - ny };
  const p4 = { x: a.x - nx, y: a.y - ny };
  out.push(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p1.x, p1.y, p3.x, p3.y, p4.x, p4.y);
}

function solidPath(out: number[], pts: Pt[], closed: boolean, w: number) {
  const n = pts.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) quad(out, pts[i], pts[(i + 1) % n], w);
  // a small disc at every vertex hides wedge gaps between adjacent quads
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) continue;
    disc(out, pts[i], w / 2);
  }
}

function disc(out: number[], p: Pt, r: number) {
  const steps = 8;
  for (let k = 0; k < steps; k++) {
    const a0 = (k / steps) * Math.PI * 2;
    const a1 = ((k + 1) / steps) * Math.PI * 2;
    out.push(
      p.x,
      p.y,
      p.x + Math.cos(a0) * r,
      p.y + Math.sin(a0) * r,
      p.x + Math.cos(a1) * r,
      p.y + Math.sin(a1) * r
    );
  }
}

function dashedPath(out: number[], pts: Pt[], closed: boolean, w: number, dash: number, gap: number, dotted: boolean) {
  const n = pts.length;
  const segs = closed ? n : n - 1;
  const period = dash + gap;
  let travelled = 0;
  for (let i = 0; i < segs; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const segLen = dist(a, b);
    if (segLen < 1e-9) continue;
    let t = 0;
    while (t < segLen - 1e-9) {
      const phase = travelled % period;
      const inDash = phase < dash;
      const remain = inDash ? dash - phase : period - phase;
      const take = Math.min(remain, segLen - t);
      if (inDash && take > 1e-6) {
        const p0 = { x: a.x + ((b.x - a.x) * t) / segLen, y: a.y + ((b.y - a.y) * t) / segLen };
        const p1 = {
          x: a.x + ((b.x - a.x) * (t + take)) / segLen,
          y: a.y + ((b.y - a.y) * (t + take)) / segLen,
        };
        if (dotted) {
          // square dot centred on the dash midpoint
          const mx = (p0.x + p1.x) / 2;
          const my = (p0.y + p1.y) / 2;
          const r = w / 2;
          out.push(mx - r, my - r, mx + r, my - r, mx + r, my + r, mx - r, my - r, mx + r, my + r, mx - r, my + r);
        } else {
          quad(out, p0, p1, w);
        }
      }
      travelled += take;
      t += take;
    }
  }
}

/** Build a closed ring set's outline as stroke triangles (for area borders). */
export function outlineTriangles(rings: Pt[][], width: number, style: StrokeStyleType = 'solid'): StrokeTriangleData {
  return strokeTriangles(
    rings.map((r) => ({ pts: r, closed: true })),
    width,
    style
  );
}
