import { describe, expect, it } from 'vitest';
import { mulberry32, splitmix32, substream, Domain, hashString, pairId } from '../src/core/rng';

describe('rng 确定性', () => {
  it('同种子 mulberry32 序列完全一致', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 32 }, a);
    const seqB = Array.from({ length: 32 }, b);
    expect(seqA).toEqual(seqB);
  });

  it('golden 值守门（防止算法被悄悄改动）', () => {
    expect(splitmix32(0)).toBe(0x92ca2f0e);
    const r = mulberry32(42);
    expect(r()).toBeCloseTo(0.6011037519201636, 15);
    expect(r()).toBeCloseTo(0.44829055899754167, 15);
    expect(hashString('cave')).toBe(hashString('cave'));
  });

  it('不同域 / 不同 id 产生不同子流', () => {
    const r1 = substream(1, Domain.WALL, 7);
    const r2 = substream(1, Domain.SCATTER, 7);
    const r3 = substream(1, Domain.WALL, 8);
    expect(r1()).not.toBe(r2());
    expect(r1()).not.toBe(r3());
  });

  it('pairId 稳定且对称输入不撞 id', () => {
    expect(pairId(3, 9)).toBe(pairId(3, 9));
    expect(pairId(3, 9)).not.toBe(pairId(9, 3));
  });
});
