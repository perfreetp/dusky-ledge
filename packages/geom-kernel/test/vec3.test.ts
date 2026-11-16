import { describe, it, expect } from 'vitest';
import { vec3 } from '../src/math/vec3.js';

describe('vec3 math', () => {
  it('cross product of basis axes', () => {
    expect(vec3.cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });

  it('rotateAxis rotates 90° around z', () => {
    const r = vec3.rotateAxis([1, 0, 0], [0, 0, 1], Math.PI / 2);
    expect(r[0]).toBeCloseTo(0, 10);
    expect(r[1]).toBeCloseTo(1, 10);
    expect(r[2]).toBeCloseTo(0, 10);
  });

  it('normalize zero vector stays zero', () => {
    expect(vec3.normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });
});
