import type { InterpolationType, Vec3 } from '@pg/shared';

export interface SplinePoint {
  position: Vec3;
  weight: number;
}

export interface FrameSample {
  /** 全局参数 t ∈ [0,1] */
  t: number;
  /** 累计弧长 s (mm) */
  s: number;
  position: Vec3;
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
  /** 曲率 κ (1/mm)，直线段为 0 */
  curvature: number;
}

export interface SplineEvaluation {
  samples: FrameSample[];
  totalLength: number;
  /** t -> 累计弧长 查找表（与 samples 对齐） */
  arcLut: { t: number; s: number }[];
  evaluatePosition: (t: number) => Vec3;
  /** 按弧长查参数 t */
  sToT: (s: number) => number;
}

export type SplineType = InterpolationType;
