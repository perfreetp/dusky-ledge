import type { TubeMesh } from './tube.js';

export interface GapCheckResult {
  /** 实测最小层间间隙 (mm) */
  minMeasuredGap: number;
  /** 配置允许的最小间隙 (mm) */
  requiredMinGap: number;
  pass: boolean;
  /** 最小间隙出现位置（外层顶点索引） */
  atVertexIndex: number;
  /** 内偏置是否自交（弯曲半径 < 内半径 时必然发生） */
  innerSelfIntersect: boolean;
  /** 自交风险出现的最小弯曲半径阈值（=内半径） */
  selfIntersectRadiusLimit: number;
}

/**
 * 层间间隙检查。
 * 同参数位置的内外层顶点径向对齐，逐点测量距离；
 * 另检测内偏置自交：任意采样点弯曲半径 < 内半径即失效。
 */
export function checkLayerGap(
  inner: TubeMesh,
  outer: TubeMesh,
  requiredMinGap: number,
  minBendRadiusAlongCurve: number,
): GapCheckResult {
  const count = Math.min(inner.positions.length, outer.positions.length) / 3;
  let minGap = Infinity;
  let atIdx = 0;
  for (let i = 0; i < count; i++) {
    const dx = outer.positions[i * 3]! - inner.positions[i * 3]!;
    const dy = outer.positions[i * 3 + 1]! - inner.positions[i * 3 + 1]!;
    const dz = outer.positions[i * 3 + 2]! - inner.positions[i * 3 + 2]!;
    const d = Math.hypot(dx, dy, dz);
    if (d < minGap) {
      minGap = d;
      atIdx = i;
    }
  }

  const selfIntersect = minBendRadiusAlongCurve < inner.radius;
  return {
    minMeasuredGap: minGap,
    requiredMinGap,
    pass: minGap >= requiredMinGap && !selfIntersect,
    atVertexIndex: atIdx,
    innerSelfIntersect: selfIntersect,
    selfIntersectRadiusLimit: inner.radius,
  };
}
