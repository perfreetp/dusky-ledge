import { describe, it, expect } from 'vitest';
import { DEFAULT_PROJECT_RULES, type ControlPoint } from '@pg/shared';
import { runPipeline } from '../src/pipeline.js';
import type { JointEnvelope } from '../src/envelope.js';

const cp = (pos: [number, number, number], jointId: string, i: number): ControlPoint => ({
  id: `p${i}`,
  position: pos,
  weight: 1,
  jointId,
});

const points: ControlPoint[] = [
  cp([0, 0, 0], 'J1', 0),
  cp([60, 0, 0], 'J1', 1),
  cp([120, 40, 0], 'J2', 2),
  cp([120, 100, 0], 'J2', 3),
  cp([80, 160, 30], 'J3', 4),
];

const envelopes: JointEnvelope[] = [
  { jointId: 'J1', axisOrigin: [0, 0, 0], axisDir: [1, 0, 0], radius: 80, halfLength: 120 },
  { jointId: 'J2', axisOrigin: [120, 40, 0], axisDir: [0, 1, 0], radius: 80, halfLength: 100 },
  { jointId: 'J3', axisOrigin: [80, 160, 0], axisDir: [0, 0, 1], radius: 80, halfLength: 100 },
];

describe('runPipeline end-to-end', () => {
  it('produces complete inspection with segments, gap and flat pattern', () => {
    const out = runPipeline({
      controlPoints: points,
      interpolation: 'catmullRom',
      rules: { ...DEFAULT_PROJECT_RULES, radialSegments: 24, tubularSegments: 200 },
      projectCode: 'PRJ-001',
      envelopes,
    });
    expect(out.inspection.totalLength).toBeGreaterThan(200);
    expect(out.inspection.segmentStats).toHaveLength(3);
    expect(out.inspection.segmentStats[0]!.segmentName).toContain('PRJ-001');
    expect(out.inspection.segmentStats[0]!.segmentName).toContain('J1');
    expect(out.inspection.minMeasuredGap).not.toBeNull();
    expect(out.inspection.unfoldAreaErrorPct).not.toBeNull();
    expect(out.inspection.unfoldAreaErrorPct!).toBeLessThan(1);
    expect(out.flatPattern.outline.length).toBeGreaterThan(4);
    // 分段长度之和 ≈ 总长度
    const segSum = out.inspection.segmentStats.reduce((s, x) => s + x.length, 0);
    expect(segSum).toBeCloseTo(out.inspection.totalLength, 6);
  });

  it('NURBS weight changes curve length', () => {
    const base = runPipeline({
      controlPoints: points,
      interpolation: 'nurbs',
      rules: DEFAULT_PROJECT_RULES,
      projectCode: 'P',
    });
    const heavy = runPipeline({
      controlPoints: points.map((p, i) => (i === 2 ? { ...p, weight: 8 } : p)),
      interpolation: 'nurbs',
      rules: DEFAULT_PROJECT_RULES,
      projectCode: 'P',
    });
    expect(Math.abs(heavy.inspection.totalLength - base.inspection.totalLength)).toBeGreaterThan(
      0.01,
    );
  });
});
