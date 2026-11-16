import type { Vec3 } from '@pg/shared';
import { vec3 } from '../math/vec3.js';

/** 折线线性插值（全局 t 按段均分） */
export function evalLinear(points: Vec3[], t: number): Vec3 {
  if (points.length < 2) return points[0]!;
  const clamped = Math.min(1, Math.max(0, t));
  const segCount = points.length - 1;
  const f = clamped * segCount;
  const seg = Math.min(segCount - 1, Math.floor(f));
  const localT = f - seg;
  return vec3.lerp(points[seg]!, points[seg + 1]!, localT);
}
