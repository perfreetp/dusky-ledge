import { cloneJson } from './clone';
import type { Feature, PlanDoc, Pt } from '@shared/types';
import { booleanPolygons, mergeOpenPaths, type BoolOp, unionPolygons } from './clipper';
import { createFeature, featureRings, KIND_PRESETS } from './feature';
import { dist, pointInRing, ringArea, simplifyCollinear, dedupeLine, type Rect } from './math';

export interface OpResult {
  doc: PlanDoc;
  message?: string;
  error?: string;
  /** ids to select after the operation */
  select?: string[];
}

const withFeatures = (doc: PlanDoc, features: Feature[]): PlanDoc => ({ ...doc, features });

export function addFeature(doc: PlanDoc, feature: Feature): PlanDoc {
  return withFeatures(doc, [...doc.features, feature]);
}

export function addFeatures(doc: PlanDoc, features: Feature[]): PlanDoc {
  return withFeatures(doc, [...doc.features, ...features]);
}

export function removeFeatures(doc: PlanDoc, ids: string[]): PlanDoc {
  const set = new Set(ids);
  return withFeatures(
    doc,
    doc.features.filter((f) => !set.has(f.id))
  );
}

export function patchFeature(doc: PlanDoc, id: string, patch: Partial<Feature>): PlanDoc {
  return withFeatures(
    doc,
    doc.features.map((f) => (f.id === id ? { ...f, ...patch } : f))
  );
}

export function updateFeatureFn(doc: PlanDoc, id: string, fn: (f: Feature) => Feature): PlanDoc {
  return withFeatures(
    doc,
    doc.features.map((f) => (f.id === id ? fn(f) : f))
  );
}

export function moveFeatureToIndex(doc: PlanDoc, id: string, index: number): PlanDoc {
  const list = [...doc.features];
  const i = list.findIndex((f) => f.id === id);
  if (i < 0) return doc;
  const [f] = list.splice(i, 1);
  const target = Math.max(0, Math.min(list.length, index));
  list.splice(target, 0, f);
  return withFeatures(doc, list);
}

export function duplicateFeatures(doc: PlanDoc, ids: string[]): OpResult {
  const set = new Set(ids);
  const copies = doc.features
    .filter((f) => set.has(f.id))
    .map((f) => {
      const c = cloneJson(f);
      c.id = createFeature(f.kind).id;
      c.name = `${f.name} 副本`;
      c.paths = c.paths.map((p) => p.map((q) => ({ x: q.x + 200, y: q.y + 200 })));
      c.rings = c.rings.map((p) => p.map((q) => ({ x: q.x + 200, y: q.y + 200 })));
      return c;
    });
  if (!copies.length) return { doc, error: '没有可复制的对象' };
  return { doc: withFeatures(doc, [...doc.features, ...copies]), select: copies.map((c) => c.id), message: `已复制 ${copies.length} 个对象` };
}

/** Delete confirmed via caller; returns doc without features. */
export function deleteFeatures(doc: PlanDoc, ids: string[]): OpResult {
  if (!ids.length) return { doc, error: '没有选中对象' };
  return { doc: removeFeatures(doc, ids), message: `已删除 ${ids.length} 个对象`, select: [] };
}

/** Reflect a selected feature inside its own bounds. */
export function reversePath(f: Feature): Feature {
  return { ...f, paths: f.paths.map((p) => [...p].reverse()) };
}

// ---------------------------------------------------------------------------
// Boolean operations
// ---------------------------------------------------------------------------

function ringsOf(f: Feature): Pt[][] {
  if (f.geom === 'area') return f.rings;
  return featureRings(f);
}

/**
 * Boolean of selected features. Areas are treated as closed polygon sets, path
 * features are first expanded to their stroke bands. The result is always an
 * area feature with validated closed rings.
 */
export function combineFeatures(doc: PlanDoc, ids: string[], op: BoolOp): OpResult {
  const selected = doc.features.filter((f) => ids.includes(f.id) && f.visible && !f.locked);
  if (selected.length < 2) return { doc, error: '请至少选择两个对象再执行布尔运算' };
  if (op === 'difference' && selected.length < 2) return { doc, error: '差集需要一个主体和一个裁剪对象' };

  const subjectRings: Pt[][] = [];
  for (const f of selected) subjectRings.push(...ringsOf(f));
  let subj: Pt[][];
  let clip: Pt[][];
  if (op === 'difference') {
    subj = ringsOf(selected[0]);
    clip = selected.slice(1).flatMap(ringsOf);
  } else {
    subj = subjectRings;
    clip = [];
  }
  const rings = booleanPolygons({ subject: subj, clip, op });
  const cleaned = rings.map((r) => simplifyCollinear(r, 0.005, true)).filter((r) => r.length >= 3);
  if (!cleaned.length) {
    return { doc, error: '布尔运算结果为空（对象可能互不相交或差集被完全裁剪）' };
  }
  const base = selected[0];
  const result: Feature = {
    ...cloneJson(base),
    id: createFeature(base.kind).id,
    name: `${KIND_PRESETS[base.kind].label}·${opLabel(op)}`,
    geom: 'area',
    paths: [],
    rings: cleaned,
    meta: {
      ...(base.meta ?? {}),
      booleanOp: op,
      sources: selected.map((f) => f.id),
      sourceNames: selected.map((f) => f.name),
    },
  };
  // Areas keep their style; path bands take the area-ish preset fill of their kind
  if (base.geom === 'path') {
    result.fillColor = base.strokeColor;
    result.fillOpacity = 0.16;
    result.outlineWidth = base.lineWidth;
    result.lineWidth = base.lineWidth;
  }
  const ids2 = new Set(ids);
  const features = [...doc.features.filter((f) => !ids2.has(f.id)), result];
  return {
    doc: withFeatures(doc, features),
    message: `${opLabel(op)}完成：${cleaned.length} 条闭合轮廓，面积 ${(Math.abs(cleaned.reduce((a, r) => a + ringArea(r), 0)) / 1e6).toFixed(2)} ㎡`,
    select: [result.id],
  };
}

const opLabel = (op: BoolOp): string =>
  ({ union: '并集', intersection: '交集', difference: '差集', xor: '异或' })[op];

/**
 * Union overlapping areas *in place*: keeps the style of the first selected feature
 * and folds the others into it (no extra layer). Useful when cleaning up duplicated
 * zones.
 */
export function unionInPlace(doc: PlanDoc, ids: string[]): OpResult {
  const selected = doc.features.filter((f) => ids.includes(f.id) && f.visible && !f.locked);
  if (selected.length < 2) return { doc, error: '请选择至少两个区域' };
  const rings = unionPolygons(selected.flatMap(ringsOf));
  if (!rings.length) return { doc, error: '并集结果为空' };
  const base = selected[0];
  const keep: Feature = { ...base, geom: 'area', paths: [], rings, name: `${base.name}（已合并）` };
  const removed = new Set(selected.slice(1).map((f) => f.id));
  return {
    doc: withFeatures(doc, doc.features.filter((f) => !removed.has(f.id)).map((f) => (f.id === base.id ? keep : f))),
    message: `已将 ${selected.length} 个区域合并为 1 个闭合区域`,
    select: [base.id],
  };
}

/**
 * Merge open centerlines into continuous assembly lines ("流水线").
 * Intersecting or touching lines become one polyline, preferring the straightest
 * continuation at junctions.
 */
export function mergePathFeatures(doc: PlanDoc, ids: string[]): OpResult {
  const selected = doc.features.filter((f) => ids.includes(f.id) && f.geom === 'path' && f.paths.length);
  if (selected.length < 1) return { doc, error: '请选择至少一条中心线（通道/人行/消防线）' };
  const lines: Pt[][] = [];
  for (const f of selected) lines.push(...f.paths);
  if (lines.length < 2) return { doc, error: '所选对象没有可合并的线段（至少需要两条线段）' };
  const { paths, mergedGroups } = mergeOpenPaths(lines, 0.75);
  const valid = paths.filter((p) => p.length >= 2);
  if (!valid.length) return { doc, error: '合并失败：没有有效线段' };
  if (valid.length >= lines.length && mergedGroups.length >= lines.length) {
    const anyBetter = valid.some((p) => p.length > 2) || valid.length < lines.length;
    if (!anyBetter) {
      return {
        doc,
        error: '这些线段没有相交或相接，无需合并；请把线端吸附到已有端点上再试',
      };
    }
  }
  const base = selected[0];
  const result: Feature = {
    ...cloneJson(base),
    id: createFeature(base.kind).id,
    name: `${base.name.replace(/（已合并）$/, '')} 流水线`,
    geom: 'path',
    paths: valid,
    rings: [],
    meta: {
      ...(base.meta ?? {}),
      mergedFrom: selected.map((f) => f.id),
      mergedCount: lines.length,
    },
  };
  const idSet = new Set(selected.map((f) => f.id));
  const features = [...doc.features.filter((f) => !idSet.has(f.id)), result];
  const longest = Math.round(
    valid.reduce((acc, p) => acc + p.slice(1).reduce((a, q, i) => a + dist(p[i], q), 0), 0)
  );
  return {
    doc: withFeatures(doc, features),
    message: `已合并为 ${valid.length} 条流水线，总长 ${longest} mm`,
    select: [result.id],
  };
}

/** Append a path to an existing feature (used when auto-continuing a centerline). */
export function appendPath(doc: PlanDoc, featureId: string, line: Pt[]): OpResult {
  if (line.length < 2) return { doc };
  return {
    doc: updateFeatureFn(doc, featureId, (f) => ({ ...f, paths: [...f.paths, line] })),
    select: [featureId],
  };
}

// ---------------------------------------------------------------------------
// Vertex editing (paths and rings)
// ---------------------------------------------------------------------------

export type SubPath = { type: 'path'; index: number } | { type: 'ring'; index: number };

function getSub(f: Feature, which: SubPath): Pt[] | null {
  return which.type === 'path' ? f.paths[which.index] ?? null : f.rings[which.index] ?? null;
}

function setSub(f: Feature, which: SubPath, line: Pt[]): Feature {
  if (which.type === 'path') {
    const paths = f.paths.map((p, i) => (i === which.index ? line : p));
    return { ...f, paths };
  }
  const rings = f.rings.map((p, i) => (i === which.index ? line : p));
  return { ...f, rings };
}

export function moveVertex(f: Feature, which: SubPath, index: number, p: Pt): Feature {
  const line = getSub(f, which);
  if (!line || index < 0 || index >= line.length) return f;
  const next = line.map((q, i) => (i === index ? { x: p.x, y: p.y } : q));
  return setSub(f, which, next);
}

export function insertVertex(f: Feature, which: SubPath, afterIndex: number, p: Pt): Feature {
  const line = getSub(f, which);
  if (!line) return f;
  const next = [...line.slice(0, afterIndex + 1), { x: p.x, y: p.y }, ...line.slice(afterIndex + 1)];
  return setSub(f, which, next);
}

export function deleteVertex(f: Feature, which: SubPath, index: number): Feature {
  const line = getSub(f, which);
  if (!line) return f;
  const min = which.type === 'ring' ? 3 : 2;
  if (line.length <= min) return f;
  return setSub(f, which, line.filter((_, i) => i !== index));
}

export function moveVertices(f: Feature, verts: { which: SubPath; index: number }[], delta: Pt): Feature {
  let out = f;
  for (const v of verts) {
    const line = getSub(out, v.which);
    if (!line || v.index < 0 || v.index >= line.length) continue;
    const p = line[v.index];
    out = moveVertex(out, v.which, v.index, { x: p.x + delta.x, y: p.y + delta.y });
  }
  return out;
}

/** Translate every vertex of a feature. */
export function shiftFeature(f: Feature, delta: Pt): Feature {
  return {
    ...f,
    paths: f.paths.map((l) => l.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y }))),
    rings: f.rings.map((l) => l.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y }))),
  };
}

/** Snap a point to 90° increments relative to a pivot when shift is held (straight lines). */
export function constrainAngle(from: Pt, to: Pt, stepDeg = 15): Pt {
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const step = (stepDeg * Math.PI) / 180;
  const snapped = Math.round(a / step) * step;
  const l = dist(from, to);
  return { x: from.x + Math.cos(snapped) * l, y: from.y + Math.sin(snapped) * l };
}

/** Remove collinear/duplicate vertices from all geometry of a feature. */
export function cleanFeature(f: Feature): Feature {
  return {
    ...f,
    paths: f.paths.map((l) => simplifyCollinear(l, 0.01, false)).filter((l) => l.length >= 2),
    rings: f.rings.map((l) => simplifyCollinear(l, 0.01, true)).filter((l) => l.length >= 3),
  };
}

/** Close an open area polygon by appending the first point (ring arrays don't repeat it). */
export function ensureClosedRings(rings: Pt[][]): Pt[][] {
  return rings
    .map((r) => dedupeLine(r, true))
    .filter((r) => r.length >= 3)
    .map((r) => (ringArea(r) < 0 ? [...r].reverse() : r));
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

export function hitFeature(doc: PlanDoc, p: Pt, tolerance: number, opts: { ids?: string[] } = {}): string | null {
  const all = hitFeatureAll(doc, p, tolerance, opts);
  return all.length ? all[0] : null;
}

/**
 * Every feature under the point, topmost first. Shift-clicking repeatedly cycles
 * through stacked features instead of always grabbing the top one.
 */
export function hitFeatureAll(doc: PlanDoc, p: Pt, tolerance: number, opts: { ids?: string[] } = {}): string[] {
  const ids = opts.ids;
  const considered = ids ? doc.features.filter((f) => ids.includes(f.id)) : doc.features;
  const out: string[] = [];
  for (let i = considered.length - 1; i >= 0; i--) {
    const f = considered[i];
    if (!f.visible || f.locked) continue;
    if (f.geom === 'area' && f.rings.length) {
      // even-odd containment, plus near-edge tolerance
      let inside = false;
      for (const ring of f.rings) if (pointInRing(p, ring)) inside = !inside;
      if (inside) {
        out.push(f.id);
        continue;
      }
      for (const ring of f.rings) {
        let hitEdge = false;
        for (let j = 0; j < ring.length; j++) {
          const a = ring[j];
          const b = ring[(j + 1) % ring.length];
          if (pointToSeg(p, a, b) <= tolerance + f.outlineWidth / 2) {
            hitEdge = true;
            break;
          }
        }
        if (hitEdge) {
          out.push(f.id);
          break;
        }
      }
    } else {
      let hit = false;
      for (const line of f.paths) {
        for (let j = 0; j + 1 < line.length; j++) {
          if (pointToSeg(p, line[j], line[j + 1]) <= tolerance + f.lineWidth / 2) {
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      if (hit) out.push(f.id);
    }
  }
  return out;
}

function pointToSeg(p: Pt, a: Pt, b: Pt): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  let t = l2 < 1e-9 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

/** Features whose bounds intersect a rect (marquee selection). */
export function featuresInRect(doc: PlanDoc, rect: Rect, mode: 'intersect' | 'contain' = 'intersect'): string[] {
  const out: string[] = [];
  for (const f of doc.features) {
    if (!f.visible || f.locked) continue;
    const pts = [...f.paths.flat(), ...f.rings.flat()];
    if (!pts.length) continue;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = f.geom === 'path' ? f.lineWidth / 2 : f.outlineWidth / 2;
    const b = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    const contains = b.minX >= rect.minX && b.maxX <= rect.maxX && b.minY >= rect.minY && b.maxY <= rect.maxY;
    const intersects = !(b.maxX < rect.minX || b.minX > rect.maxX || b.maxY < rect.minY || b.minY > rect.maxY);
    if (mode === 'contain' ? contains : contains || intersects) out.push(f.id);
  }
  return out;
}
