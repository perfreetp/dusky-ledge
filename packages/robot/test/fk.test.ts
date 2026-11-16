import { describe, it, expect } from 'vitest';
import { DEFAULT_6AXIS_ROBOT } from '../src/default-robot.js';
import {
  forwardKinematics,
  findOutOfRangeJoints,
  dhTransform,
  identity,
  multiply,
  transformPoint,
} from '../src/fk.js';
import { buildEnvelopes } from '../src/envelope-builder.js';

describe('robot forward kinematics', () => {
  it('returns 6 joint poses plus tool position', () => {
    const fk = forwardKinematics(DEFAULT_6AXIS_ROBOT, {});
    expect(fk.poses).toHaveLength(6);
    expect(fk.poses.every((p) => p.inRange)).toBe(true);
    expect(fk.toolPosition.length).toBe(3);
  });

  it('zero configuration base joint sits at base origin with world z axis', () => {
    const fk = forwardKinematics(DEFAULT_6AXIS_ROBOT, { J1: 0 });
    expect(fk.poses[0]!.origin).toEqual([0, 0, 0]);
    expect(fk.poses[0]!.axisDir[2]).toBeCloseTo(1, 9);
  });

  it('rotating J1 moves downstream joints around z', () => {
    const zero = forwardKinematics(DEFAULT_6AXIS_ROBOT, { J1: 0 });
    const rotated = forwardKinematics(DEFAULT_6AXIS_ROBOT, { J1: Math.PI / 2 });
    const j2zero = zero.poses[1]!.origin;
    const j2rot = rotated.poses[1]!.origin;
    // x 分量转到 y 方向
    expect(j2rot[0]).toBeCloseTo(-j2zero[1], 6);
    expect(j2rot[1]).toBeCloseTo(j2zero[0], 6);
    expect(j2rot[2]).toBeCloseTo(j2zero[2], 6);
  });

  it('detects out-of-range joint angles', () => {
    const bad = findOutOfRangeJoints(DEFAULT_6AXIS_ROBOT, { J2: Math.PI });
    expect(bad).toContain('J2');
    const ok = findOutOfRangeJoints(DEFAULT_6AXIS_ROBOT, { J2: 0.3 });
    expect(ok).toHaveLength(0);
  });

  it('DH identity at zero parameters', () => {
    const m = dhTransform(0, 0, 0, 0);
    const eye = identity();
    m.forEach((v, i) => expect(v).toBeCloseTo(eye[i]!, 10));
    expect(transformPoint(m, [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('matrix multiplication associativity sanity', () => {
    const a = dhTransform(0.3, 10, 5, 0.7);
    const b = dhTransform(-0.2, 20, 0, 1.1);
    const c = identity();
    const ab = multiply(a, b);
    const abc1 = multiply(ab, c);
    const abc2 = multiply(a, multiply(b, c));
    for (let i = 0; i < 16; i++) expect(abc1[i]).toBeCloseTo(abc2[i]!, 10);
  });

  it('builds one envelope per joint with sane geometry', () => {
    const envs = buildEnvelopes(DEFAULT_6AXIS_ROBOT, {});
    expect(envs).toHaveLength(6);
    for (const e of envs) {
      const axisLen = Math.hypot(...e.axisDir);
      expect(axisLen).toBeCloseTo(1, 9);
      expect(e.radius).toBeGreaterThan(0);
      expect(e.halfLength).toBeGreaterThan(0);
    }
  });
});
