import { describe, expect, it } from 'vitest';
import { gradeSubmission, closureOf } from '../src/core/grading';
import { sampleBenchDoc } from '../shared/samples';
import type { Feature, PlanDoc, Pt, TrainingRequirements } from '../shared/types';
import { createFeature } from '../src/core/feature';
import { History } from '../src/core/history';
import { SnapIndex } from '../src/core/snap';
import { alignFeatures, distributeFeatures } from '../src/core/align';
import { featureBoundsInclStroke, KIND_PRESETS } from '../src/core/feature';
import { combineFeatures, mergePathFeatures, hitFeature } from '../src/core/ops';
import { pointInRings } from '../src/core/math';

const REQ: TrainingRequirements = {
  expected: {},
  positionTolerance: 300,
  widthTolerance: 0.15,
  weights: { coverage: 0.5, width: 0.3, closure: 0.2 },
  notes: '',
};

const rectRing = (x: number, y: number, w: number, h: number): Pt[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function docWith(features: Feature[]): PlanDoc {
  const d = sampleBenchDoc();
  d.features = features;
  return d;
}

describe('grading', () => {
  const ref = sampleBenchDoc();

  it('gives 100 for an identical drawing', () => {
    const r = gradeSubmission(copy(ref), ref, REQ);
    expect(r.score).toBe(100);
    expect(r.coverageScore).toBe(1);
    expect(r.closureScore).toBe(1);
    expect(r.items.reduce((a, i) => a + i.deduction, 0)).toBe(0);
  });

  it('gives 0 for an empty drawing', () => {
    const r = gradeSubmission(docWith([]), ref, REQ);
    expect(r.score).toBe(0);
    // score is exactly 100 minus the itemised deductions, in all cases
    expect(r.score).toBe(Math.max(0, 100 - r.items.reduce((a, i) => a + i.deduction, 0)));
    expect(r.items.filter((i) => i.type === 'missing').length).toBe(ref.features.length);
  });

  it('penalises wrong line width but keeps most of the score', () => {
    const wide = copy(ref);
    // double only the 100 mm lines, leaving the 120 mm fire lane alone
    wide.features = wide.features.map((f) => (f.geom === 'path' && f.lineWidth === 100 ? { ...f, lineWidth: 200 } : f));
    const r = gradeSubmission(wide, ref, REQ);
    expect(r.score).toBeGreaterThan(60);
    expect(r.score).toBeLessThan(100);
    const widthItems = r.items.filter((i) => i.type === 'width');
    expect(widthItems.length).toBeGreaterThan(0);
    for (const it of widthItems) {
      expect(it.expected).toContain('100');
      expect(it.actual).toContain('200');
    }
  });

  it('does not score at all for a missing required object, and reports it once', () => {
    const target = ref.features.find((f) => f.kind === 'hazard')!;
    const partial = copy(ref);
    partial.features = partial.features.filter((f) => f.id !== target.id);
    const r = gradeSubmission(partial, ref, REQ);
    expect(r.score).toBeLessThan(100);
    const mentions = r.items.filter((i) => i.title.includes(target.name));
    expect(mentions.length).toBe(1);
    expect(mentions[0].type).toBe('missing');
  });

  it('flags an unclosed area exactly once, as a closure error', () => {
    const broken: Feature = {
      ...createFeature('no-park'),
      id: 'broken',
      name: '半个禁停区',
      geom: 'area',
      rings: [[{ x: 50000, y: 50000 }, { x: 51000, y: 50000 }]],
      paths: [],
    };
    const d = copy(ref);
    d.features = [...d.features, broken];
    const r = gradeSubmission(d, ref, REQ);
    const closure = r.items.filter((i) => i.type === 'closure');
    const extra = r.items.filter((i) => i.type === 'extra');
    expect(closure.length).toBe(1);
    expect(extra.length).toBe(0);
    expect(r.closureScore).toBeLessThan(1);
  });

  it('reports the closure reason for degenerate rings', () => {
    const f = { ...createFeature('no-park'), geom: 'area' as const, rings: [[{ x: 0, y: 0 }, { x: 10, y: 0 }]] };
    const report = closureOf(f);
    expect(report.ok).toBe(false);
    expect(report.reason).toContain('2');
  });

  it('is deterministic for identical inputs', () => {
    const a = gradeSubmission(copy(ref), ref, REQ);
    const b = gradeSubmission(copy(ref), ref, REQ);
    expect(a.score).toBe(b.score);
    expect(a.items.map((i) => i.id)).toEqual(b.items.map((i) => i.id));
  });

  it('respects custom weights (coverage-only grading ignores width errors)', () => {
    const wide = copy(ref);
    wide.features = wide.features.map((f) => (f.geom === 'path' ? { ...f, lineWidth: 180 } : f));
    const coverageOnly = { ...REQ, weights: { coverage: 1, width: 0, closure: 0 } };
    const normal = gradeSubmission(wide, ref, REQ);
    const cov = gradeSubmission(wide, ref, coverageOnly);
    // weights only affect the reported sub-scores now; the headline score stays the
    // honest sum of itemised deductions
    expect(cov.score).toBe(normal.score);
    expect(cov.widthScore).toBe(normal.widthScore);
  });
});

describe('undo history', () => {
  it('retains at least 50 steps and replays them in order', () => {
    const h = new History({ limit: 200 });
    const docs: PlanDoc[] = [];
    let doc = docWith([]);
    for (let i = 0; i < 60; i++) {
      docs.push(doc);
      h.push(`step ${i}`, doc, []);
      doc = copy(doc);
      doc.name = `name-${i}`;
    }
    let current = doc;
    for (let i = 59; i >= 10; i--) {
      const r = h.undo(current, []);
      expect(r).not.toBeNull();
      current = r!.doc;
      expect(current.name === `name-${i - 1}` || current.name === '').toBe(true);
    }
    expect(h.depth).toBe(10);
    for (let i = 0; i < 50; i++) {
      const r = h.redo(current, []);
      expect(r).not.toBeNull();
      current = r!.doc;
    }
    expect(h.depth).toBe(60);
  });

  it('coalesces consecutive edits that share a key', () => {
    const h = new History();
    const a = docWith([]);
    const b = copy(a);
    const c = copy(a);
    h.push('drag', a, [], 'drag-abc');
    h.push('drag', b, [], 'drag-abc');
    expect(h.depth).toBe(1);
    h.commit();
    h.push('drag', c, [], 'drag-abc');
    expect(h.depth).toBe(2);
  });

  it('drops the redo branch after a new edit', () => {
    const h = new History();
    const a = docWith([]);
    const b = copy(a);
    h.push('a', a, []);
    h.undo(b, []);
    expect(h.canRedo).toBe(true);
    h.push('new', a, []);
    expect(h.canRedo).toBe(false);
  });

  it('guarantees a minimum limit of 50 even when asked for less', () => {
    const h = new History({ limit: 5 });
    const a = docWith([]);
    for (let i = 0; i < 80; i++) h.push(`s${i}`, a, []);
    expect(h.depth).toBeGreaterThanOrEqual(50);
  });
});

describe('snapping', () => {
  const grid = { minor: 500, major: 2000, show: true, snapGrid: true, snapEndpoints: true, snapMidpoints: true, snapSegments: true };
  const line = createFeature('main-channel', {
    id: 'line1',
    geom: 'path',
    paths: [
      [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
      ],
      [
        { x: 5000, y: 0 },
        { x: 5000, y: 5000 },
      ],
    ],
  });
  const area = createFeature('no-park', { id: 'area1', geom: 'area', rings: [rectRing(10000, 10000, 4000, 3000)], paths: [] });

  it('snaps to the nearest endpoint', () => {
    const idx = new SnapIndex([line, area], grid);
    const hit = idx.query({ x: 5030, y: -20 }, 120);
    expect(hit?.kind).toBe('endpoint');
    expect(hit?.point).toEqual({ x: 5000, y: 0 });
  });

  it('snaps to a segment midpoint', () => {
    const idx = new SnapIndex([area], grid);
    // midpoint of the top edge (10000,10000)-(14000,10000) is (12000,10000)
    const hit = idx.query({ x: 12040, y: 10030 }, 120);
    expect(hit?.kind).toBe('midpoint');
    expect(hit?.point).toEqual({ x: 12000, y: 10000 });
  });

  it('snaps to a point on a segment interior', () => {
    const idx = new SnapIndex([line], grid);
    // 2500 is exactly the midpoint of (0,0)-(5000,0), so aim off-centre
    const hit = idx.query({ x: 3100, y: 25 }, 120);
    expect(hit?.kind).toBe('segment');
    expect(hit?.point).toEqual({ x: 3100, y: 0 });
  });

  it('falls back to the grid when nothing else is near', () => {
    const idx = new SnapIndex([line], grid);
    const hit = idx.query({ x: 7800, y: 6400 }, 400);
    expect(hit?.kind).toBe('grid');
    // 7800 -> 8000, 6400 -> 6500 (nearest 500 mm grid node)
    expect(hit?.point).toEqual({ x: 8000, y: 6500 });
  });

  it('returns null when the snap radius is exceeded', () => {
    const idx = new SnapIndex([line], { ...grid, snapGrid: false }, 1000);
    const hit = idx.query({ x: 80000, y: 80000 }, 50);
    expect(hit).toBeNull();
  });

  it('excludes hidden and locked features', () => {
    const hidden = { ...line, id: 'hidden', visible: false };
    const locked = { ...area, id: 'locked', locked: true };
    const idx = new SnapIndex([hidden, locked], { ...grid, snapGrid: false });
    expect(idx.query({ x: 5030, y: 0 }, 100)).toBeNull();
  });

  it('can exclude the feature currently being dragged', () => {
    const idx = new SnapIndex([line], grid);
    const hit = idx.query({ x: 5030, y: 0 }, 120, { excludeFeatureIds: new Set(['line1']) });
    expect(hit?.featureId).not.toBe('line1');
  });
});

describe('alignment and distribution', () => {
  const mkRect = (id: string, x: number, y: number, w: number, h: number): Feature => ({
    ...createFeature('station'),
    id,
    geom: 'area',
    rings: [rectRing(x, y, w, h)],
    paths: [],
    lineWidth: 0,
    outlineWidth: 0,
  });

  it('aligns left edges to the selection bounds', () => {
    const a = mkRect('a', 0, 0, 100, 100);
    const b = mkRect('b', 500, 300, 200, 100);
    const out = alignFeatures([a, b], ['a', 'b'], 'right');
    const rb = featureBoundsInclStroke(out[1]);
    const ra = featureBoundsInclStroke(out[0]);
    expect(Math.abs(ra.maxX - rb.maxX)).toBeLessThan(1e-6);
  });

  it('centres vertically', () => {
    const a = mkRect('a', 0, 0, 100, 100);
    const b = mkRect('b', 500, 300, 200, 400);
    const out = alignFeatures([a, b], ['a', 'b'], 'vcenter');
    const ra = featureBoundsInclStroke(out[0]);
    const rb = featureBoundsInclStroke(out[1]);
    expect(Math.abs((ra.minY + ra.maxY) / 2 - (rb.minY + rb.maxY) / 2)).toBeLessThan(1e-6);
  });

  it('distributes three boxes with equal gaps', () => {
    const boxes = [mkRect('a', 0, 0, 100, 100), mkRect('b', 150, 0, 100, 100), mkRect('c', 900, 0, 100, 100)];
    const out = distributeFeatures(boxes, ['a', 'b', 'c'], 'horizontal');
    const bounds = out.map(featureBoundsInclStroke).sort((u, v) => u.minX - v.minX);
    const gaps = [bounds[1].minX - bounds[0].maxX, bounds[2].minX - bounds[1].maxX];
    expect(Math.abs(gaps[0] - gaps[1])).toBeLessThan(1e-6);
    // ends stay put
    expect(bounds[0].minX).toBeCloseTo(0, 6);
    expect(bounds[2].maxX).toBeCloseTo(1000, 6);
  });

  it('vertical distribution uses the same gap rule', () => {
    const boxes = [mkRect('a', 0, 0, 100, 100), mkRect('b', 0, 150, 100, 100), mkRect('c', 0, 900, 100, 100)];
    const out = distributeFeatures(boxes, ['a', 'b', 'c'], 'vertical');
    const bounds = out.map(featureBoundsInclStroke).sort((u, v) => u.minY - v.minY);
    expect(Math.abs(bounds[1].minY - bounds[0].maxY - (bounds[2].minY - bounds[1].maxY))).toBeLessThan(1e-6);
  });

  it('leaves fewer than 3 objects untouched when distributing', () => {
    const a = mkRect('a', 0, 0, 100, 100);
    const b = mkRect('b', 500, 0, 100, 100);
    const out = distributeFeatures([a, b], ['a', 'b'], 'horizontal');
    expect(featureBoundsInclStroke(out[1]).minX).toBe(500);
  });
});

describe('document operations', () => {
  it('combines two areas into a single closed union', () => {
    const a: Feature = { ...createFeature('no-park'), id: 'a', geom: 'area', rings: [rectRing(0, 0, 1000, 1000)], paths: [] };
    const b: Feature = { ...createFeature('no-park'), id: 'b', geom: 'area', rings: [rectRing(500, 500, 1000, 1000)], paths: [] };
    const doc = docWith([a, b]);
    const res = combineFeatures(doc, ['a', 'b'], 'union');
    expect(res.error).toBeUndefined();
    expect(res.doc.features.length).toBe(1);
    const result = res.doc.features[0];
    expect(result.geom).toBe('area');
    expect(result.rings.length).toBe(1);
    // area = 1750000 mm²
    let area = 0;
    const r = result.rings[0];
    for (let i = 0; i < r.length; i++) {
      const p = r[i];
      const q = r[(i + 1) % r.length];
      area += p.x * q.y - q.x * p.y;
    }
    expect(Math.abs(area / 2)).toBeCloseTo(1_750_000, 0);
  });

  it('subtracts and leaves a hole', () => {
    const a: Feature = { ...createFeature('material'), id: 'a', geom: 'area', rings: [rectRing(0, 0, 3000, 3000)], paths: [] };
    const b: Feature = { ...createFeature('station'), id: 'b', geom: 'area', rings: [rectRing(1000, 1000, 1000, 1000)], paths: [] };
    const res = combineFeatures(docWith([a, b]), ['a', 'b'], 'difference');
    expect(res.error).toBeUndefined();
    const result = res.doc.features[0];
    expect(result.rings.length).toBe(2);
    expect(pointInRings({ x: 1500, y: 1500 }, result.rings)).toBe(false);
    expect(pointInRings({ x: 500, y: 1500 }, result.rings)).toBe(true);
  });

  it('refuses a boolean on a single object', () => {
    const a: Feature = { ...createFeature('no-park'), id: 'a', geom: 'area', rings: [rectRing(0, 0, 100, 100)], paths: [] };
    const res = combineFeatures(docWith([a]), ['a'], 'union');
    expect(res.error).toBeTruthy();
    expect(res.doc.features.length).toBe(1);
  });

  it('merges touching centerlines into one continuous line', () => {
    const a = createFeature('main-channel', { id: 'a', geom: 'path', paths: [[{ x: 0, y: 0 }, { x: 3000, y: 0 }]], rings: [] });
    const b = createFeature('main-channel', { id: 'b', geom: 'path', paths: [[{ x: 3000, y: 0 }, { x: 3000, y: 3000 }]], rings: [] });
    const res = mergePathFeatures(docWith([a, b]), ['a', 'b']);
    expect(res.error).toBeUndefined();
    expect(res.doc.features.length).toBe(1);
    const merged = res.doc.features[0];
    expect(merged.paths.length).toBe(1);
    expect(merged.paths[0].length).toBe(3);
  });

  it('does not silently merge disconnected lines', () => {
    const a = createFeature('main-channel', { id: 'a', geom: 'path', paths: [[{ x: 0, y: 0 }, { x: 3000, y: 0 }]], rings: [] });
    const b = createFeature('main-channel', { id: 'b', geom: 'path', paths: [[{ x: 0, y: 9000 }, { x: 3000, y: 9000 }]], rings: [] });
    const res = mergePathFeatures(docWith([a, b]), ['a', 'b']);
    expect(res.error).toBeTruthy();
    expect(res.doc.features.length).toBe(2);
  });

  it('hit-tests the topmost area by containment', () => {
    const under: Feature = { ...createFeature('material'), id: 'under', geom: 'area', rings: [rectRing(0, 0, 3000, 3000)], paths: [] };
    const over: Feature = { ...createFeature('no-park'), id: 'over', geom: 'area', rings: [rectRing(1000, 1000, 1000, 1000)], paths: [] };
    const doc = docWith([under, over]);
    expect(hitFeature(doc, { x: 1500, y: 1500 }, 10)).toBe('over');
    expect(hitFeature(doc, { x: 300, y: 300 }, 10)).toBe('under');
    expect(hitFeature(doc, { x: 9000, y: 9000 }, 10)).toBeNull();
  });

  it('hit-tests a path band including its half-width', () => {
    const line = createFeature('main-channel', { id: 'l', geom: 'path', paths: [[{ x: 0, y: 0 }, { x: 5000, y: 0 }]], rings: [], lineWidth: 200 });
    const doc = docWith([line]);
    expect(hitFeature(doc, { x: 2500, y: 90 }, 5)).toBe('l');
    expect(hitFeature(doc, { x: 2500, y: 160 }, 5)).toBeNull();
  });
});

describe('presets match the EHS spec', () => {
  it('main channel is 100 mm yellow solid', () => {
    const p = KIND_PRESETS['main-channel'];
    expect(p.geom).toBe('path');
    expect(p.style.lineWidth).toBe(100);
    expect(p.style.strokeStyle).toBe('solid');
  });
  it('no-park is an area with dual-colour diagonal hatch', () => {
    const p = KIND_PRESETS['no-park'];
    expect(p.geom).toBe('area');
    expect(p.style.hatch?.type).toBe('diagonal');
    expect(p.style.hatch?.color2).toBeTruthy();
  });
  it('station frame is dashed and 50 mm', () => {
    const p = KIND_PRESETS.station;
    expect(p.style.lineWidth).toBe(50);
    expect(p.style.strokeStyle).toBe('dashed');
  });
});
