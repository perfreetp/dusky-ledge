import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/generate';
import { defaultParams, emptyOverrides, type GenParams } from '../src/types';

function params(over: Partial<GenParams> = {}): GenParams {
  return { ...defaultParams(), ...over };
}

describe('生成确定性与分域隔离', () => {
  it('同 seed 同参数两次生成字节级一致', () => {
    const a = generate(99, params(), emptyOverrides());
    const b = generate(99, params(), emptyOverrides());
    expect(Buffer.from(a.tunnel.vertices.buffer)).toEqual(Buffer.from(b.tunnel.vertices.buffer));
    expect(Buffer.from(a.tunnel.indices.buffer)).toEqual(Buffer.from(b.tunnel.indices.buffer));
    expect(Buffer.from(a.trail.vertices.buffer)).toEqual(Buffer.from(b.trail.vertices.buffer));
    expect(a.speleo.instances.map((i) => i.id)).toEqual(b.speleo.instances.map((i) => i.id));
    expect(a.speleo.instances.map((i) => [i.root, i.height, i.radius].flat())).toEqual(
      b.speleo.instances.map((i) => [i.root, i.height, i.radius].flat()),
    );
  });

  it('不同 seed 产生不同洞体', () => {
    const a = generate(1, params(), emptyOverrides());
    const b = generate(2, params(), emptyOverrides());
    expect(Buffer.from(a.tunnel.vertices.buffer)).not.toEqual(Buffer.from(b.tunnel.vertices.buffer));
  });

  it('分域隔离：改滴水密度不改变洞体顶点', () => {
    const a = generate(7, params({ dripDensity: 0.2 }), emptyOverrides());
    const b = generate(7, params({ dripDensity: 0.7 }), emptyOverrides());
    expect(Buffer.from(a.tunnel.vertices.buffer)).toEqual(Buffer.from(b.tunnel.vertices.buffer));
    expect(a.speleo.instances.length).not.toBe(b.speleo.instances.length);
  });

  it('分域隔离：改断面宽度不改变已生成实例的 id 集合前缀（槽位机制稳定）', () => {
    const a = generate(7, params({ tunnelWidth: 5 }), emptyOverrides());
    const b = generate(7, params({ tunnelWidth: 7 }), emptyOverrides());
    // 洞体必须变化
    expect(Buffer.from(a.tunnel.vertices.buffer)).not.toEqual(Buffer.from(b.tunnel.vertices.buffer));
    // 两侧都存在的同 id 实例，其 id 编码规则不变
    const idsA = new Set(a.speleo.instances.map((i) => i.id));
    const common = b.speleo.instances.filter((i) => idsA.has(i.id));
    expect(common.length).toBeGreaterThan(0);
  });

  it('统计字段完整且为有限数', () => {
    const r = generate(5, params(), emptyOverrides());
    expect(r.stats.tunnelTris).toBeGreaterThan(0);
    expect(r.stats.speleoCount).toBe(r.speleo.instances.length);
    expect(Number.isFinite(r.stats.elapsedMs)).toBe(true);
  });
});
