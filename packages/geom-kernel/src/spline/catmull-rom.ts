import type { Vec3 } from '@pg/shared';
import { vec3 } from '../math/vec3.js';

/** 向心（alpha=0.5）Catmull-Rom，避免尖角处自相交 */

function tj(ti: number, pi: Vec3, pj: Vec3, alpha: number): number {
  const d = vec3.distance(pi, pj);
  return ti + Math.pow(Math.max(d, 1e-12), alpha);
}

function crPoint(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const alpha = 0.5;
  const t0 = 0;
  const t1 = tj(t0, p0, p1, alpha);
  const t2 = tj(t1, p1, p2, alpha);
  const t3 = tj(t2, p2, p3, alpha);

  const t10 = t1 - t0;
  const t21 = t2 - t1;
  const t32 = t3 - t2;
  const t20 = t2 - t0;
  const t31 = t3 - t1;

  const a1 = vec3.add(
    vec3.scale(p0, (t1 - t) / t10),
    vec3.scale(p1, (t - t0) / t10),
  );
  const a2 = vec3.add(
    vec3.scale(p1, (t2 - t) / t21),
    vec3.scale(p2, (t - t1) / t21),
  );
  const a3 = vec3.add(
    vec3.scale(p2, (t3 - t) / t32),
    vec3.scale(p3, (t - t2) / t32),
  );
  const b1 = vec3.add(
    vec3.scale(a1, (t2 - t) / t20),
    vec3.scale(a2, (t - t0) / t20),
  );
  const b2 = vec3.add(
    vec3.scale(a2, (t3 - t) / t31),
    vec3.scale(a3, (t - t1) / t31),
  );
  return vec3.add(
    vec3.scale(b1, (t2 - t) / t21),
    vec3.scale(b2, (t - t1) / t21),
  );
}

/**
 * 全局 t ∈ [0,1] 的向心 Catmull-Rom 评估。
 * 端点处复制首尾控制点。
 */
export function evalCatmullRom(points: Vec3[], t: number): Vec3 {
  if (points.length < 2) return points[0]!;
  const clamped = Math.min(1, Math.max(0, t));
  const segCount = points.length - 1;
  const f = clamped * segCount;
  const seg = Math.min(segCount - 1, Math.floor(f));
  const localT = f - seg;

  const p1 = points[seg]!;
  const p2 = points[seg + 1]!;
  const p0 = points[seg - 1] ?? p1;
  const p3 = points[seg + 2] ?? p2;

  // 段内重新做向心参数化，localT 映射到 [t1,t2]
  const alpha = 0.5;
  const t1 = Math.pow(Math.max(vec3.distance(p0, p1), 1e-12), alpha);
  const t2 = t1 + Math.pow(Math.max(vec3.distance(p1, p2), 1e-12), alpha);
  const u = t1 + localT * (t2 - t1);
  return crPoint(p0, p1, p2, p3, u);
}
