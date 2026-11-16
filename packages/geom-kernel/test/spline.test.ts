import { describe, it, expect } from 'vitest';
import type { ControlPoint } from '@pg/shared';
import { evaluateSpline } from '../src/spline/evaluator.js';
import { evalNurbs, buildClampedKnots, basisFunction } from '../src/spline/nurbs.js';

const cp = (pos: [number, number, number], jointId = 'J1'): ControlPoint => ({
  id: `p-${pos.join('-')}-${Math.random()}`,
  position: pos,
  weight: 1,
  jointId,
});

describe('spline evaluator', () => {
  it('linear straight line length equals analytic distance', () => {
    const points = [cp([0, 0, 0]), cp([100, 0, 0]), cp([200, 0, 0])];
    const r = evaluateSpline('linear', points, { samples: 100 });
    expect(r.totalLength).toBeCloseTo(200, 6);
    expect(r.samples[0]!.position).toEqual([0, 0, 0]);
    expect(r.samples.at(-1)!.position[0]).toBeCloseTo(200, 6);
  });

  it('arc length lookup sToT is monotonic and endpoints correct', () => {
    const points = [cp([0, 0, 0]), cp([50, 30, 0]), cp([100, 0, 0]), cp([150, -30, 10])];
    const r = evaluateSpline('catmullRom', points, { samples: 120 });
    expect(r.sToT(0)).toBe(0);
    expect(r.sToT(r.totalLength)).toBe(1);
    const mid = r.sToT(r.totalLength / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('parallel transport frame stays orthonormal along a bend', () => {
    const points = [
      cp([0, 0, 0]),
      cp([50, 0, 0]),
      cp([100, 50, 0]),
      cp([100, 100, 0]),
      cp([50, 150, 0]),
    ];
    const r = evaluateSpline('catmullRom', points, { samples: 150 });
    for (const s of r.samples) {
      expect(vec3Dot(s.tangent, s.normal)).toBeCloseTo(0, 8);
      expect(vec3Length(s.normal)).toBeCloseTo(1, 8);
      expect(vec3Length(s.binormal)).toBeCloseTo(1, 8);
    }
  });

  it('NURBS clamped knots and partition of unity', () => {
    const knots = buildClampedKnots(5, 3);
    expect(knots[0]).toBe(0);
    expect(knots.at(-1)).toBe(1);
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      let sum = 0;
      for (let i = 0; i < 5; i++) sum += basisFunction(i, 3, u, knots);
      expect(sum).toBeCloseTo(1, 9);
    }
  });

  it('NURBS with equal weights passes through endpoints', () => {
    const pts = [
      { position: [0, 0, 0] as [number, number, number], weight: 1 },
      { position: [30, 40, 0] as [number, number, number], weight: 1 },
      { position: [60, 0, 0] as [number, number, number], weight: 1 },
      { position: [90, 40, 0] as [number, number, number], weight: 1 },
    ];
    const start = evalNurbs(pts, 0);
    const end = evalNurbs(pts, 1);
    expect(start[0]).toBeCloseTo(0, 9);
    expect(end[0]).toBeCloseTo(90, 9);
  });

  it('all four interpolation types run and return samples', () => {
    const points = [cp([0, 0, 0]), cp([40, 20, 0]), cp([80, 0, 0]), cp([120, 10, 5])];
    for (const type of ['linear', 'catmullRom', 'bezier', 'nurbs'] as const) {
      const r = evaluateSpline(type, points, { samples: 64 });
      expect(r.samples).toHaveLength(65);
      expect(r.totalLength).toBeGreaterThan(100);
    }
  });
});

function vec3Dot(a: number[], b: number[]): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}
function vec3Length(a: number[]): number {
  return Math.hypot(a[0]!, a[1]!, a[2]!);
}
