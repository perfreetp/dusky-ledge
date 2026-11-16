import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/generate';
import { defaultParams, emptyOverrides, type GenParams, type Overrides } from '../src/types';
import { TRAIL_CLEARANCE_M } from '../src/core/geometry';
import { v3 } from '../src/core/vec';

function params(over: Partial<GenParams> = {}): GenParams {
  return { ...defaultParams(), ...over };
}

describe('钟乳石净空与编辑不变量', () => {
  it('所有石尖均不侵入步道 2.2m 净空走廊', () => {
    const r = generate(11, params({ dripDensity: 0.9, trailWidth: 2 }), emptyOverrides());
    expect(r.speleo.instances.length).toBeGreaterThan(10);
    for (const ins of r.speleo.instances) {
      const tip = v3.add(ins.root, v3.scale(ins.axis, ins.height));
      let nearest = Infinity;
      let nearestPoint = r.trailPath.points[0]!;
      for (const p of r.trailPath.points) {
        const d = v3.dist(p, tip);
        if (d < nearest) {
          nearest = d;
          nearestPoint = p;
        }
      }
      const horiz = Math.hypot(tip[0] - nearestPoint[0], tip[2] - nearestPoint[2]);
      // 在步道横向范围内时，石尖必须高于 步道面 + 2.2m
      if (horiz < r.trailPath.width / 2 + 0.3) {
        expect(tip[1]).toBeGreaterThanOrEqual(nearestPoint[1] + TRAIL_CLEARANCE_M - 1e-6);
      }
    }
    expect(r.stats.rejectedByClearance).toBeGreaterThan(0);
  });

  it('三档分级的高度落在各自区间', () => {
    const r = generate(11, params({ dripDensity: 0.8 }), emptyOverrides());
    const bounds = [
      [0.3, 1.0],
      [1.0, 2.5],
      [2.5, 5.0],
    ] as const;
    for (const ins of r.speleo.instances) {
      const [lo, hi] = bounds[ins.tierIndex]!;
      expect(ins.height).toBeGreaterThanOrEqual(lo);
      expect(ins.height).toBeLessThanOrEqual(hi);
    }
  });

  it('删除单株后其余实例保持字节级不变', () => {
    const base = generate(13, params(), emptyOverrides());
    const victim = base.speleo.instances[0]!;
    const ov: Overrides = {
      trail: [],
      speleo: { deleted: [victim.id], replaced: [] },
    };
    const next = generate(13, params(), ov);
    expect(next.speleo.instances.find((i) => i.id === victim.id)).toBeUndefined();
    const baseRest = base.speleo.instances.filter((i) => i.id !== victim.id);
    expect(next.speleo.instances.length).toBe(baseRest.length);
    for (const ins of next.speleo.instances) {
      const old = baseRest.find((i) => i.id === ins.id)!;
      expect(old.root).toEqual(ins.root);
      expect(old.height).toBe(ins.height);
      expect(old.radius).toBe(ins.radius);
      expect(old.tierIndex).toBe(ins.tierIndex);
    }
  });

  it('替换单株只改该株的 shapeSeed，布点与档位不变', () => {
    const base = generate(13, params(), emptyOverrides());
    const target = base.speleo.instances[1]!;
    const ov: Overrides = {
      trail: [],
      speleo: { deleted: [], replaced: [{ id: target.id, seed: 777777 }] },
    };
    const next = generate(13, params(), ov);
    const replaced = next.speleo.instances.find((i) => i.id === target.id)!;
    expect(replaced.root).toEqual(target.root);
    expect(replaced.tierIndex).toBe(target.tierIndex);
    expect(replaced.shapeSeed).toBe(777777);
  });
});

describe('步道 override 保留', () => {
  it('参数微调重生成后，手动锚点偏移仍作用于对应里程', () => {
    const ov: Overrides = {
      trail: [{ s: 0.5, lateral: 1.5, up: 0.2 }],
      speleo: { deleted: [], replaced: [] },
    };
    const a = generate(21, params({ tunnelWidth: 6 }), ov);
    const b = generate(21, params({ tunnelWidth: 7.2 }), ov);
    const midA = a.trailPath.points[Math.floor(a.trailPath.points.length / 2)]!;
    const midB = b.trailPath.points[Math.floor(b.trailPath.points.length / 2)]!;
    // 两次生成在中点都应出现横向偏移（与零偏移的自动线位拉开距离）
    const autoA = generate(21, params({ tunnelWidth: 6 }), emptyOverrides());
    const autoMid = autoA.trailPath.points[Math.floor(autoA.trailPath.points.length / 2)]!;
    expect(v3.dist(midA, autoMid)).toBeGreaterThan(1.0);
    expect(v3.dist(midB, midA)).toBeLessThan(3.0); // 几何连续，没有跳变
  });
});
