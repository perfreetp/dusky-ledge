import type { Vec3 } from '@pg/shared';
import { vec3 } from '../math/vec3.js';

/**
 * 三次（p=3）clamped NURBS。
 * 控制点权重即 rational weight；节点矢量为 clamped 均匀分布。
 */

export function buildClampedKnots(controlCount: number, degree = 3): number[] {
  const n = controlCount - 1;
  const knots: number[] = [];
  for (let i = 0; i <= degree; i++) knots.push(0);
  const interiorCount = n - degree;
  for (let j = 1; j <= interiorCount; j++) knots.push(j / (n - degree + 1));
  for (let i = 0; i <= degree; i++) knots.push(1);
  return knots;
}

/** Cox–de Boor 基函数 */
export function basisFunction(i: number, p: number, u: number, knots: number[]): number {
  if (p === 0) {
    const uI = knots[i]!;
    const uNext = knots[i + 1]!;
    // 末端闭区间处理
    if (uNext === 1 && u >= uI && u <= uNext) return 1;
    return u >= uI && u < uNext ? 1 : 0;
  }
  const uI = knots[i]!;
  const uIp = knots[i + p]!;
  const uI1 = knots[i + 1]!;
  const uIp1 = knots[i + p + 1]!;

  const denom1 = uIp - uI;
  const denom2 = uIp1 - uI1;
  const a = denom1 === 0 ? 0 : ((u - uI) / denom1) * basisFunction(i, p - 1, u, knots);
  const b = denom2 === 0 ? 0 : ((uIp1 - u) / denom2) * basisFunction(i + 1, p - 1, u, knots);
  return a + b;
}

export interface NurbsPoint {
  position: Vec3;
  weight: number;
}

export function evalNurbs(points: NurbsPoint[], u: number, degree = 3): Vec3 {
  const knots = buildClampedKnots(points.length, degree);
  let numerator: Vec3 = [0, 0, 0];
  let denominator = 0;
  for (let i = 0; i < points.length; i++) {
    const N = basisFunction(i, degree, u, knots);
    const w = points[i]!.weight > 0 ? points[i]!.weight : 1;
    const rational = N * w;
    numerator = vec3.add(numerator, vec3.scale(points[i]!.position, rational));
    denominator += rational;
  }
  if (denominator < 1e-12) return points[0]!.position;
  return vec3.scale(numerator, 1 / denominator);
}
