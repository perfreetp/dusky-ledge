import type { HatchStyle, Pt } from '@shared/types';
import { pointInRings, ringArea } from './math';

export interface Stripe {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** stripe line width in mm */
  width: number;
  /** stroke colour, already resolved (color or color2) */
  color: string;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Generate clipped hatch stripes for an even-odd ring set.
 *
 * Stripes are defined in a rotated frame (u along the stripe, v across). For every
 * v = k*spacing we intersect the stripe with all ring edges, sort the crossings by u
 * and pair them up even-odd. This is exact (no rasterisation), produces real geometry
 * for SVG export, and the whole set is uploaded as one instanced draw.
 */
export function generateHatch(rings: Pt[][], hatch: HatchStyle, opts: { maxStripes?: number } = {}): Stripe[] {
  const out: Stripe[] = [];
  if (!rings.length || hatch.spacing <= 0) return out;
  const angle = toRad(hatch.angle);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // world -> stripe frame: u along stripe direction is (cos,sin) in world; v across is (-sin,cos)
  const toU = (p: Pt) => p.x * cos + p.y * sin;
  const toV = (p: Pt) => -p.x * sin + p.y * cos;
  const toWorld = (u: number, v: number): Pt => ({ x: u * cos - v * sin, y: u * sin + v * cos });

  let minV = Infinity;
  let maxV = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      const v = toV(p);
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  if (!Number.isFinite(minV)) return out;

  const spacing = hatch.spacing;
  const k0 = Math.ceil(minV / spacing);
  const k1 = Math.floor(maxV / spacing);
  const maxStripes = opts.maxStripes ?? 400_000;
  if (k1 - k0 > maxStripes) return out;

  const dedupe = (a: number, b: number) => Math.abs(a - b) < 1e-7;
  const twoColors = !!hatch.color2;

  let idx = 0;
  for (let k = k0; k <= k1; k++, idx++) {
    const v = k * spacing;
    const xs: number[] = [];
    for (const ring of rings) {
      const n = ring.length;
      if (n < 3) continue;
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        const va = toV(a);
        const vb = toV(b);
        // half-open rule avoids double counting shared vertices
        if (va <= v && vb > v) {
          const t = (v - va) / (vb - va);
          xs.push(toU(a) + (toU(b) - toU(a)) * t);
        } else if (vb <= v && va > v) {
          const t = (v - va) / (vb - va);
          xs.push(toU(a) + (toU(b) - toU(a)) * t);
        }
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    const color = twoColors ? (idx % 2 === 0 ? hatch.color : hatch.color2!) : hatch.color;
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (dedupe(xs[i], xs[i + 1])) continue;
      const p0 = toWorld(xs[i], v);
      const p1 = toWorld(xs[i + 1], v);
      out.push({ x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, width: hatch.lineWidth, color });
    }
  }
  return out;
}

/** Cross-hatch / grid / dots variants are built from rotated stripe passes. */
export function generateHatchVariants(rings: Pt[][], hatch: HatchStyle, stride = 1): Stripe[] {
  const all = generateHatchVariantsFull(rings, hatch);
  if (stride <= 1) return all;
  return all.filter((_, i) => i % stride === 0);
}

function generateHatchVariantsFull(rings: Pt[][], hatch: HatchStyle): Stripe[] {
  switch (hatch.type) {
    case 'diagonal':
      return generateHatch(rings, hatch);
    case 'cross': {
      const a = generateHatch(rings, hatch);
      const b = generateHatch(rings, { ...hatch, angle: hatch.angle + 90 });
      return [...a, ...b];
    }
    case 'grid': {
      const a = generateHatch(rings, { ...hatch, angle: 0 });
      const b = generateHatch(rings, { ...hatch, angle: 90 });
      return [...a, ...b];
    }
    case 'dots': {
      // dots: short vertical strokes laid on a lattice
      const out: Stripe[] = [];
      const step = Math.max(1, hatch.spacing);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const ring of rings)
        for (const p of ring) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
      if (!Number.isFinite(minX)) return out;
      const r = hatch.lineWidth / 2;
      for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
        for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
          if (pointInRings({ x, y }, rings)) {
            out.push({ x0: x - r, y0: y, x1: x + r, y1: y, width: hatch.lineWidth, color: hatch.color });
          }
        }
      }
      return out;
    }
  }
}

/** Count stripes without keeping them (for the UI badge). */
export function countHatch(rings: Pt[][], hatch: HatchStyle): number {
  return generateHatchVariants(rings, hatch).length;
}

/** Area of a ring set (even-odd). */
export function ringsArea(rings: Pt[][]): number {
  let total = 0;
  for (const r of rings) total += ringArea(r);
  return Math.abs(total);
}
