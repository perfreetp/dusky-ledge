import { describe, it, expect } from 'vitest';
import type { ControlPoint } from '@pg/shared';
import { evaluateSpline } from '../src/spline/evaluator.js';
import { buildTube, tubeSurfaceArea } from '../src/tube.js';
import { checkLayerGap } from '../src/gap.js';

const cp = (pos: [number, number, number], i: number): ControlPoint => ({
  id: `p${i}`,
  position: pos,
  weight: 1,
  jointId: 'J1',
});

describe('tube mesh and layer gap', () => {
  it('straight tube surface area ≈ 2πrL', () => {
    const points = [cp([0, 0, 0], 0), cp([100, 0, 0], 1), cp([200, 0, 0], 2)];
    const r = evaluateSpline('linear', points, { samples: 100 });
    const tube = buildTube(r, {
      radius: 15,
      radialSegments: 32,
      tubularSegments: 200,
      layer: 'outer',
    });
    const area = tubeSurfaceArea(tube);
    const analytic = 2 * Math.PI * 15 * 200;
    // 离散棱面近似的系统偏差，断言相对误差 < 0.5%
    expect(Math.abs(area - analytic) / analytic).toBeLessThan(0.005);
  });

  it('radial vertex distance from centerline equals radius', () => {
    const points = [cp([0, 0, 0], 0), cp([100, 50, 0], 1), cp([200, 0, 0], 2)];
    const r = evaluateSpline('catmullRom', points, { samples: 80 });
    const tube = buildTube(r, {
      radius: 12,
      radialSegments: 16,
      tubularSegments: 80,
      layer: 'outer',
    });
    const cols = 17;
    const idx = 40 * cols + 7;
    const smp = r.samples[40]!;
    const d = Math.hypot(
      tube.positions[idx * 3]! - smp.position[0],
      tube.positions[idx * 3 + 1]! - smp.position[1],
      tube.positions[idx * 3 + 2]! - smp.position[2],
    );
    expect(d).toBeCloseTo(12, 6);
  });

  it('gap check passes for straight concentric layers: gap = rOut - rIn', () => {
    const points = [cp([0, 0, 0], 0), cp([100, 0, 0], 1), cp([200, 0, 0], 2)];
    const r = evaluateSpline('linear', points, { samples: 100 });
    const outer = buildTube(r, { radius: 15, radialSegments: 24, tubularSegments: 100, layer: 'outer' });
    const inner = buildTube(r, { radius: 13, radialSegments: 24, tubularSegments: 100, layer: 'inner' });
    const gap = checkLayerGap(inner, outer, 1.5, Infinity);
    expect(gap.minMeasuredGap).toBeCloseTo(2, 8);
    expect(gap.pass).toBe(true);
    expect(gap.innerSelfIntersect).toBe(false);
  });

  it('gap check fails and reports numeric value when layers too close', () => {
    const points = [cp([0, 0, 0], 0), cp([100, 0, 0], 1)];
    const r = evaluateSpline('linear', points, { samples: 50 });
    const outer = buildTube(r, { radius: 15, radialSegments: 16, tubularSegments: 50, layer: 'outer' });
    const inner = buildTube(r, { radius: 14.2, radialSegments: 16, tubularSegments: 50, layer: 'inner' });
    const gap = checkLayerGap(inner, outer, 1.5, Infinity);
    expect(gap.minMeasuredGap).toBeCloseTo(0.8, 8);
    expect(gap.pass).toBe(false);
  });

  it('inner offset self-intersects when bend radius < inner radius', () => {
    const points = [cp([0, 0, 0], 0), cp([50, 0, 0], 1), cp([50, 50, 0], 2)];
    const r = evaluateSpline('catmullRom', points, { samples: 120 });
    const outer = buildTube(r, { radius: 15, radialSegments: 16, tubularSegments: 120, layer: 'outer' });
    const inner = buildTube(r, { radius: 14, radialSegments: 16, tubularSegments: 120, layer: 'inner' });
    const gap = checkLayerGap(inner, outer, 1, 8); // 最小弯曲半径 8 < 内半径 14
    expect(gap.innerSelfIntersect).toBe(true);
    expect(gap.pass).toBe(false);
  });
});
