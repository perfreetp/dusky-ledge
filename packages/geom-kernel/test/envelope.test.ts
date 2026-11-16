import { describe, it, expect } from 'vitest';
import type { ControlPoint } from '@pg/shared';
import { evaluateSpline } from '../src/spline/evaluator.js';
import { checkEnvelope, type JointEnvelope } from '../src/envelope.js';

const cp = (pos: [number, number, number], jointId: string, i: number): ControlPoint => ({
  id: `p${i}`,
  position: pos,
  weight: 1,
  jointId,
});

const envelope: JointEnvelope = {
  jointId: 'J1',
  axisOrigin: [0, 0, 0],
  axisDir: [1, 0, 0],
  radius: 60,
  halfLength: 120,
};

describe('joint envelope check', () => {
  it('points inside cylindrical envelope pass', () => {
    const points = [
      cp([0, 0, 0], 'J1', 0),
      cp([50, 30, 0], 'J1', 1),
      cp([100, 20, 10], 'J1', 2),
    ];
    const r = evaluateSpline('linear', points, { samples: 60 });
    const res = checkEnvelope(r, points, [envelope]);
    expect(res.violations).toHaveLength(0);
    expect(res.insideFlags.every(Boolean)).toBe(true);
  });

  it('points outside envelope produce violation with t range and length', () => {
    const points = [
      cp([0, 0, 0], 'J1', 0),
      cp([50, 0, 0], 'J1', 1),
      cp([100, 0, 0], 'J1', 2),
      cp([150, 200, 0], 'J1', 3), // 明显越界（半径 200 > 60）
    ];
    const r = evaluateSpline('linear', points, { samples: 120 });
    const res = checkEnvelope(r, points, [envelope]);
    expect(res.violations.length).toBeGreaterThan(0);
    const v = res.violations[0]!;
    expect(v.jointId).toBe('J1');
    expect(v.tEnd).toBeGreaterThan(v.tStart);
    expect(v.length).toBeGreaterThan(0);
  });

  it('joints without configured envelope are not judged', () => {
    const points = [cp([0, 0, 0], 'J9', 0), cp([999, 999, 999], 'J9', 1)];
    const r = evaluateSpline('linear', points, { samples: 20 });
    const res = checkEnvelope(r, points, [envelope]);
    expect(res.violations).toHaveLength(0);
  });
});
