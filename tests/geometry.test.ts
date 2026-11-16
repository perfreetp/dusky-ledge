import { describe, expect, it } from 'vitest';
import {
  booleanPolygons,
  differencePolygons,
  intersectPolygons,
  mergeOpenPaths,
  offsetPolygons,
  strokeOutline,
  unionPolygons,
} from '../src/core/clipper';
import { ringArea, pointInRings, ringAreaAbs } from '../src/core/math';
import type { Pt } from '../shared/types';

const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

const signedArea = (rings: Pt[][]) => rings.reduce((a, r) => a + ringArea(r), 0);

describe('clipper booleans', () => {
  it('unions two overlapping squares into one closed ring with correct area', () => {
    const r = unionPolygons([rect(0, 0, 100, 100), rect(50, 50, 100, 100)]);
    expect(r.length).toBe(1);
    expect(Math.abs(ringArea(r[0]))).toBeCloseTo(17500, 0);
    // closed: last != first, >= 3 points, no duplicate consecutive points
    expect(r[0].length).toBeGreaterThanOrEqual(6);
  });

  it('intersection of two overlapping squares is a closed square', () => {
    const r = intersectPolygons([rect(0, 0, 100, 100)], [rect(50, 50, 100, 100)]);
    expect(r.length).toBe(1);
    expect(Math.abs(ringArea(r[0]))).toBeCloseTo(2500, 0);
  });

  it('difference produces a polygon with a hole (2 closed rings)', () => {
    const outer = rect(0, 0, 300, 300);
    const inner = rect(100, 100, 100, 100);
    const r = differencePolygons([outer], [inner]);
    expect(r.length).toBe(2);
    const total = Math.abs(signedArea(r));
    expect(total).toBeCloseTo(300 * 300 - 100 * 100, 0);
    // hole centre must be outside the even-odd set, ring border inside
    expect(pointInRings({ x: 150, y: 150 }, r)).toBe(false);
    expect(pointInRings({ x: 50, y: 150 }, r)).toBe(true);
  });

  it('difference of disjoint polygons returns the subject unchanged', () => {
    const r = differencePolygons([rect(0, 0, 100, 100)], [rect(500, 500, 100, 100)]);
    expect(r.length).toBe(1);
    expect(Math.abs(ringArea(r[0]))).toBeCloseTo(10000, 0);
  });

  it('xor of identical shapes is empty', () => {
    const r = booleanPolygons({ subject: [rect(0, 0, 100, 100)], clip: [rect(0, 0, 100, 100)], op: 'xor' });
    expect(r.length).toBe(0);
  });

  it('union of multi-part input keeps disjoint outers and merges touching ones', () => {
    const r = unionPolygons([rect(0, 0, 100, 100), rect(200, 0, 100, 100), rect(300, 0, 100, 100)]);
    expect(r.length).toBe(2);
    const areas = r.map(ringAreaAbs).sort((a, b) => a - b);
    expect(areas[0]).toBeCloseTo(10000, 0);
    expect(areas[1]).toBeCloseTo(20000, 0);
  });

  it('keeps rings closed and simple after union of many shapes', () => {
    const shapes: Pt[][] = [];
    for (let i = 0; i < 12; i++) shapes.push(rect(i * 40, (i % 3) * 30, 120, 120));
    const r = unionPolygons(shapes);
    for (const ring of r) {
      expect(ring.length).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(1e-6);
      }
      expect(Math.abs(ringArea(ring))).toBeGreaterThan(1e-6);
    }
    // sanity: total area at most sum of inputs, at least area of one
    const total = Math.abs(signedArea(r));
    expect(total).toBeGreaterThan(120 * 120);
    expect(total).toBeLessThan(12 * 120 * 120);
  });
});

describe('offset / stroke', () => {
  it('buffer outward a square grows it by the offset area', () => {
    const r = offsetPolygons([rect(0, 0, 100, 100)], 10, { join: 'miter' });
    expect(r.length).toBe(1);
    expect(Math.abs(ringArea(r[0]))).toBeCloseTo(120 * 120, 0);
  });

  it('stroke outline of a straight line has width*length area', () => {
    const r = strokeOutline([[{ x: 0, y: 0 }, { x: 1000, y: 0 }]], 100, { end: 'butt', join: 'miter' });
    expect(r.length).toBe(1);
    expect(Math.abs(ringArea(r[0]))).toBeCloseTo(1000 * 100, 0);
  });

  it('stroke outline of an L-shaped centerline is one closed ring', () => {
    const r = strokeOutline(
      [
        [
          { x: 0, y: 0 },
          { x: 500, y: 0 },
          { x: 500, y: 500 },
        ],
      ],
      100,
      { join: 'miter', end: 'butt' }
    );
    expect(r.length).toBe(1);
    expect(Math.abs(ringArea(r[0]))).toBeCloseTo(100000, 0);
  });

  it('two crossing channels union into a single closed cross shape', () => {
    const h = strokeOutline([[{ x: -500, y: 0 }, { x: 500, y: 0 }]], 100, { end: 'butt' });
    const v = strokeOutline([[{ x: 0, y: -500 }, { x: 0, y: 500 }]], 100, { end: 'butt' });
    const u = unionPolygons([...h, ...v]);
    expect(u.length).toBe(1);
    expect(Math.abs(ringArea(u[0]))).toBeCloseTo(2 * 1000 * 100 - 100 * 100, 0);
  });
});

describe('mergeOpenPaths (流水线合并)', () => {
  it('joins two collinear segments sharing an endpoint into one path', () => {
    const { paths } = mergeOpenPaths(
      [
        [{ x: 0, y: 0 }, { x: 500, y: 0 }],
        [{ x: 500, y: 0 }, { x: 1000, y: 0 }],
      ],
      1
    );
    expect(paths.length).toBe(1);
    expect(paths[0].length).toBe(3);
  });

  it('joins segments with a small gap within tolerance', () => {
    const { paths } = mergeOpenPaths(
      [
        [{ x: 0, y: 0 }, { x: 500, y: 0 }],
        [{ x: 500.4, y: 0.2 }, { x: 1000, y: 0 }],
      ],
      1
    );
    expect(paths.length).toBe(1);
  });

  it('does NOT join parallel lines far apart', () => {
    const { paths } = mergeOpenPaths(
      [
        [{ x: 0, y: 0 }, { x: 500, y: 0 }],
        [{ x: 0, y: 200 }, { x: 500, y: 200 }],
      ],
      1
    );
    expect(paths.length).toBe(2);
  });

  it('keeps each of two crossing lines whole (straightest continuation at the crossing)', () => {
    const { paths } = mergeOpenPaths(
      [
        [{ x: -500, y: 0 }, { x: 500, y: 0 }],
        [{ x: 0, y: -500 }, { x: 0, y: 500 }],
      ],
      1
    );
    // The crossing is a 4-way junction; going straight means the two original lines
    // survive intact rather than being chopped into 4 stubs.
    expect(paths.length).toBe(2);
    const keys = paths.map((p) => `${p[0].x},${p[0].y}->${p[p.length - 1].x},${p[p.length - 1].y}`).sort();
    expect(keys).toEqual(['-500,0->500,0', '0,-500->0,500']);
    for (const p of paths) expect(p.length).toBe(3);
  });

  it('keeps the through-line whole at a T-junction and leaves the spur as its own path', () => {
    const { paths } = mergeOpenPaths(
      [
        [{ x: 0, y: 0 }, { x: 1000, y: 0 }],
        [{ x: 500, y: 0 }, { x: 500, y: 800 }],
      ],
      1
    );
    expect(paths.length).toBe(2);
    const byLen = [...paths].sort((a, b) => b.length - a.length);
    expect(byLen[0].length).toBe(3);
    expect(byLen[0][0]).toEqual({ x: 0, y: 0 });
    expect(byLen[0][2]).toEqual({ x: 1000, y: 0 });
    expect(byLen[1].length).toBe(2);
  });

  it('chains three connected segments end to end', () => {
    const { paths } = mergeOpenPaths(
      [
        [{ x: 0, y: 0 }, { x: 300, y: 0 }],
        [{ x: 600, y: 0 }, { x: 300, y: 0 }],
        [{ x: 600, y: 0 }, { x: 600, y: 400 }],
      ],
      1
    );
    expect(paths.length).toBe(1);
    expect(paths[0].length).toBe(4);
    // endpoints must be the two free ends
    const ends = [paths[0][0], paths[0][paths[0].length - 1]];
    const asSet = ends.map((p) => `${p.x},${p.y}`).sort();
    expect(asSet).toEqual(['0,0', '600,400']);
  });

  it('preserves geometry through a junction, not just counts', () => {
    const { paths } = mergeOpenPaths(
      [
        [{ x: 0, y: 0 }, { x: 400, y: 0 }],
        [{ x: 400, y: 0 }, { x: 400, y: 400 }],
      ],
      1
    );
    expect(paths.length).toBe(1);
    const p = paths[0];
    expect(p[0]).toEqual({ x: 0, y: 0 });
    expect(p[1]).toEqual({ x: 400, y: 0 });
    expect(p[2]).toEqual({ x: 400, y: 400 });
  });
});
