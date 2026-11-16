import type { Feature, Pt } from '@shared/types';
import { boundsOfFeatures, featureBoundsInclStroke } from './feature';
import { rotatePoint, type Rect, rectCenter } from './math';

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

export interface TransformContext {
  /** optional per-feature bounds, e.g. for "align to selected key object" */
  referenceRect?: Rect;
}

function translateFeature(f: Feature, dx: number, dy: number): Feature {
  if (dx === 0 && dy === 0) return f;
  return {
    ...f,
    paths: f.paths.map((line) => line.map((p) => ({ x: p.x + dx, y: p.y + dy }))),
    rings: f.rings.map((ring) => ring.map((p) => ({ x: p.x + dx, y: p.y + dy }))),
  };
}

/**
 * Align features by their bounds. When `referenceRect` is given (the key object of a
 * multi-selection), the other features move to it; otherwise to the union bounds.
 */
export function alignFeatures(
  features: Feature[],
  ids: string[],
  mode: AlignMode,
  ctx: TransformContext = {}
): Feature[] {
  const selected = features.filter((f) => ids.includes(f.id));
  if (selected.length < 2) return features;
  const target = ctx.referenceRect ?? boundsOfFeatures(selected);
  const idSet = new Set(ids);
  return features.map((f) => {
    if (!idSet.has(f.id)) return f;
    const b = featureBoundsInclStroke(f);
    let dx = 0;
    let dy = 0;
    switch (mode) {
      case 'left':
        dx = target.minX - b.minX;
        break;
      case 'right':
        dx = target.maxX - b.maxX;
        break;
      case 'hcenter':
        dx = rectCenter(target).x - rectCenter(b).x;
        break;
      case 'top':
        dy = target.minY - b.minY;
        break;
      case 'bottom':
        dy = target.maxY - b.maxY;
        break;
      case 'vcenter':
        dy = rectCenter(target).y - rectCenter(b).y;
        break;
    }
    return translateFeature(f, dx, dy);
  });
}

export type DistributeMode = 'horizontal' | 'vertical';

/**
 * Distribute features so the gaps between their bounding boxes are equal.
 * Fewer than 3 features is a no-op (a pair has only one gap).
 */
export function distributeFeatures(features: Feature[], ids: string[], mode: DistributeMode): Feature[] {
  const selected = features.filter((f) => ids.includes(f.id));
  if (selected.length < 3) return features;
  const withBounds = selected.map((f) => ({ f, b: featureBoundsInclStroke(f) }));
  const horizontal = mode === 'horizontal';
  withBounds.sort((u, v) => (horizontal ? u.b.minX - v.b.minX : u.b.minY - v.b.minY));

  const first = withBounds[0].b;
  const last = withBounds[withBounds.length - 1].b;
  const span = horizontal ? last.maxX - first.minX : last.maxY - first.minY;
  const totalSize = withBounds.reduce((acc, w) => acc + (horizontal ? w.b.maxX - w.b.minX : w.b.maxY - w.b.minY), 0);
  const gap = (span - totalSize) / (withBounds.length - 1);

  const moves = new Map<string, { dx: number; dy: number }>();
  let cursor = horizontal ? first.minX : first.minY;
  for (const w of withBounds) {
    const size = horizontal ? w.b.maxX - w.b.minX : w.b.maxY - w.b.minY;
    const current = horizontal ? w.b.minX : w.b.minY;
    const delta = cursor - current;
    moves.set(w.f.id, horizontal ? { dx: delta, dy: 0 } : { dx: 0, dy: delta });
    cursor += size + gap;
  }
  return features.map((f) => {
    const m = moves.get(f.id);
    return m ? translateFeature(f, m.dx, m.dy) : f;
  });
}

/** Even spacing measured between centres (useful for identical-sized objects). */
export function distributeCenters(features: Feature[], ids: string[], mode: DistributeMode): Feature[] {
  const selected = features.filter((f) => ids.includes(f.id));
  if (selected.length < 3) return features;
  const horizontal = mode === 'horizontal';
  const items = selected
    .map((f) => ({ f, c: rectCenter(featureBoundsInclStroke(f)) }))
    .sort((u, v) => (horizontal ? u.c.x - v.c.x : u.c.y - v.c.y));
  const start = horizontal ? items[0].c.x : items[0].c.y;
  const end = horizontal ? items[items.length - 1].c.x : items[items.length - 1].c.y;
  const step = (end - start) / (items.length - 1);
  const moves = new Map<string, { dx: number; dy: number }>();
  items.forEach((it, i) => {
    const target = start + step * i;
    const cur = horizontal ? it.c.x : it.c.y;
    moves.set(it.f.id, horizontal ? { dx: target - cur, dy: 0 } : { dx: 0, dy: target - cur });
  });
  return features.map((f) => {
    const m = moves.get(f.id);
    return m ? translateFeature(f, m.dx, m.dy) : f;
  });
}

/** Rotate features around a pivot by degrees. */
export function rotateFeatures(features: Feature[], ids: string[], center: Pt, degrees: number): Feature[] {
  const rad = (degrees * Math.PI) / 180;
  const idSet = new Set(ids);
  const mapPt = (p: Pt): Pt => rotatePoint(p, center, rad);
  return features.map((f) =>
    idSet.has(f.id)
      ? { ...f, paths: f.paths.map((l) => l.map(mapPt)), rings: f.rings.map((r) => r.map(mapPt)) }
      : f
  );
}

/** Mirror features horizontally or vertically about their own bounds centre. */
export function flipFeatures(features: Feature[], ids: string[], axis: 'h' | 'v'): Feature[] {
  const idSet = new Set(ids);
  return features.map((f) => {
    if (!idSet.has(f.id)) return f;
    const b = featureBoundsInclStroke(f);
    const c = rectCenter(b);
    const mapPt = (p: Pt): Pt => (axis === 'h' ? { x: 2 * c.x - p.x, y: p.y } : { x: p.x, y: 2 * c.y - p.y });
    return { ...f, paths: f.paths.map((l) => l.map(mapPt)), rings: f.rings.map((r) => r.map(mapPt)) };
  });
}

/** Scale features about a pivot. */
export function scaleFeatures(features: Feature[], ids: string[], center: Pt, sx: number, sy: number): Feature[] {
  const idSet = new Set(ids);
  const mapPt = (p: Pt): Pt => ({ x: center.x + (p.x - center.x) * sx, y: center.y + (p.y - center.y) * sy });
  return features.map((f) =>
    idSet.has(f.id)
      ? { ...f, paths: f.paths.map((l) => l.map(mapPt)), rings: f.rings.map((r) => r.map(mapPt)) }
      : f
  );
}
