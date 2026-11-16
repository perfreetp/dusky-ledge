import { describe, it, expect } from 'vitest';
import type { ControlPoint } from '@pg/shared';
import { evaluateSpline } from '../src/spline/evaluator.js';
import { analyzeCurvature } from '../src/curvature.js';

const cp = (pos: [number, number, number], i: number): ControlPoint => ({
  id: `p${i}`,
  position: pos,
  weight: 1,
  jointId: 'J1',
});

/** 在 z=0 平面用密集控制点构造半径 R 的近似圆弧 */
function arcPoints(radius: number, startDeg: number, endDeg: number, count: number): ControlPoint[] {
  const pts: ControlPoint[] = [];
  for (let i = 0; i < count; i++) {
    const ang = (startDeg + ((endDeg - startDeg) * i) / (count - 1)) * (Math.PI / 180);
    pts.push(cp([radius * Math.cos(ang), radius * Math.sin(ang), 0], i));
  }
  return pts;
}

describe('curvature analysis', () => {
  it('straight line has zero curvature and infinite bend radius', () => {
    const points = [cp([0, 0, 0], 0), cp([100, 0, 0], 1), cp([200, 0, 0], 2)];
    const r = evaluateSpline('linear', points, { samples: 100 });
    const c = analyzeCurvature(r, { minBendRadius: 50 });
    expect(c.maxCurvature).toBeCloseTo(0, 8);
    expect(c.minBendRadius).toBe(Infinity);
    expect(c.violations).toHaveLength(0);
  });

  it('circular arc curvature ≈ 1/R', () => {
    const R = 80;
    const points = arcPoints(R, 0, 90, 40);
    const r = evaluateSpline('catmullRom', points, { samples: 400 });
    const c = analyzeCurvature(r, { minBendRadius: 40 });
    // 取中段（避开端点效应）
    const mid = r.samples.slice(100, 300);
    const meanK = mid.reduce((s, x) => s + x.curvature, 0) / mid.length;
    expect(meanK).toBeCloseTo(1 / R, 1); // 10% 容差（离散近似）
    expect(c.violations).toHaveLength(0);
  });

  it('tight bend below minBendRadius produces violation segments', () => {
    const R = 20;
    const points = arcPoints(R, 0, 90, 40);
    const r = evaluateSpline('catmullRom', points, { samples: 400 });
    const c = analyzeCurvature(r, { minBendRadius: 100 });
    expect(c.violations.length).toBeGreaterThan(0);
    const v = c.violations[0]!;
    expect(v.length).toBeGreaterThan(0);
    expect(v.maxCurvature).toBeGreaterThan(1 / 100);
    expect(v.tEnd).toBeGreaterThan(v.tStart);
  });
});
