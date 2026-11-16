import type { InterpolationType, Vec3 } from '@pg/shared';
import type { ControlPoint } from '@pg/shared';
import { vec3, clamp } from '../math/vec3.js';
import { evalLinear } from './linear.js';
import { evalCatmullRom } from './catmull-rom.js';
import { evalPiecewiseBezier } from './bezier.js';
import { evalNurbs } from './nurbs.js';
import type { FrameSample, SplineEvaluation } from './types.js';

export interface EvaluateOptions {
  /** 纵向采样数（不含端点额外点） */
  samples?: number;
}

function makePositionFn(
  type: InterpolationType,
  points: ControlPoint[],
): (t: number) => Vec3 {
  const positions = points.map((p) => p.position);
  const weights = points.map((p) => p.weight);
  switch (type) {
    case 'linear':
      return (t) => evalLinear(positions, t);
    case 'catmullRom':
      return (t) => evalCatmullRom(positions, t);
    case 'bezier':
      return (t) => evalPiecewiseBezier(positions, weights, t);
    case 'nurbs':
      return (t) =>
        evalNurbs(
          positions.map((position, i) => ({ position, weight: weights[i] ?? 1 })),
          t,
        );
  }
}

/** 中心差分切向 */
function tangentAt(fn: (t: number) => Vec3, t: number): Vec3 {
  const h = 1e-4;
  const a = fn(clamp(t - h, 0, 1));
  const b = fn(clamp(t + h, 0, 1));
  const d = vec3.sub(b, a);
  const len = vec3.length(d);
  if (len < 1e-12) return [1, 0, 0];
  return vec3.scale(d, 1 / len);
}

function arbitraryPerpendicular(tangent: Vec3): Vec3 {
  const ref: Vec3 = Math.abs(tangent[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return vec3.normalize(vec3.cross(tangent, ref));
}

/**
 * 平行传输标架（Rotation-minimizing frame）：
 * 沿曲线把初始法向逐段旋转到下一切向，避免 Frenet 标架在拐点翻转。
 */
export function evaluateSpline(
  type: InterpolationType,
  points: ControlPoint[],
  options: EvaluateOptions = {},
): SplineEvaluation {
  const n = options.samples ?? 200;
  if (points.length === 0) {
    throw new Error('evaluateSpline: 至少需要 1 个控制点');
  }
  const positionFn = makePositionFn(type, points);
  const count = n + 1;
  const ts = Array.from({ length: count }, (_, i) => i / n);
  const positions = ts.map((t) => positionFn(t));
  const tangents = ts.map((t) => tangentAt(positionFn, t));

  // 累计弧长
  const arc: number[] = [0];
  for (let i = 1; i < count; i++) {
    arc[i] = arc[i - 1]! + vec3.distance(positions[i - 1]!, positions[i]!);
  }
  const totalLength = arc[count - 1]!;

  // 曲率（弦长参数化的三点圆曲率近似）κ = 2|(p1-p0)×(p2-p0)| / (|p1-p0||p2-p0||p2-p1|)
  const curvatures: number[] = new Array(count).fill(0);
  for (let i = 1; i < count - 1; i++) {
    const p0 = positions[i - 1]!;
    const p1 = positions[i]!;
    const p2 = positions[i + 1]!;
    const a = vec3.sub(p1, p0);
    const b = vec3.sub(p2, p0);
    const c = vec3.sub(p2, p1);
    const la = vec3.length(a);
    const lb = vec3.length(b);
    const lc = vec3.length(c);
    const denom = la * lb * lc;
    if (denom < 1e-14) {
      curvatures[i] = 0;
      continue;
    }
    curvatures[i] = (2 * vec3.length(vec3.cross(a, b))) / denom;
  }

  // 平行传输标架
  const normals: Vec3[] = [];
  const binormals: Vec3[] = [];
  let normal = arbitraryPerpendicular(tangents[0]!);
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      const tPrev = tangents[i - 1]!;
      const tCur = tangents[i]!;
      const axis = vec3.cross(tPrev, tCur);
      const sinAngle = vec3.length(axis);
      const cosAngle = clamp(vec3.dot(tPrev, tCur), -1, 1);
      if (sinAngle > 1e-9) {
        const angle = Math.atan2(sinAngle, cosAngle);
        normal = vec3.normalize(vec3.rotateAxis(normal, vec3.scale(axis, 1 / sinAngle), angle));
      }
      // 数值正交化，防止漂移
      normal = vec3.normalize(
        vec3.sub(normal, vec3.scale(tCur, vec3.dot(normal, tCur))),
      );
      if (vec3.length(normal) < 1e-9) normal = arbitraryPerpendicular(tCur);
    }
    normals[i] = normal;
    binormals[i] = vec3.normalize(vec3.cross(tangents[i]!, normal));
  }

  const samples: FrameSample[] = ts.map((t, i) => ({
    t,
    s: arc[i]!,
    position: positions[i]!,
    tangent: tangents[i]!,
    normal: normals[i]!,
    binormal: binormals[i]!,
    curvature: curvatures[i]!,
  }));

  const arcLut = ts.map((t, i) => ({ t, s: arc[i]! }));

  const sToT = (s: number): number => {
    if (s <= 0) return 0;
    if (s >= totalLength) return 1;
    // 二分查找弧长区间
    let lo = 0;
    let hi = count - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (arc[mid]! <= s) lo = mid;
      else hi = mid;
    }
    const s0 = arc[lo]!;
    const s1 = arc[hi]!;
    const f = s1 - s0 < 1e-12 ? 0 : (s - s0) / (s1 - s0);
    return ts[lo]! + f * (ts[hi]! - ts[lo]!);
  };

  return {
    samples,
    totalLength,
    arcLut,
    evaluatePosition: positionFn,
    sToT,
  };
}
