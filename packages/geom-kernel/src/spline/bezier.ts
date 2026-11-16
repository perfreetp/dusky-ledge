import type { Vec3 } from '@pg/shared';
import { vec3 } from '../math/vec3.js';

/**
 * 分段三次 Bézier：相邻控制点间构造三次段，
 * 段端切向取相邻控制多边形方向，控制点权重作为张力系数
 * （weight=1 标准；<1 拉向控制点更紧、>1 更松）。
 */

interface CubicBezier {
  p0: Vec3;
  p1: Vec3;
  p2: Vec3;
  p3: Vec3;
}

function buildSegments(points: Vec3[], weights: number[]): CubicBezier[] {
  const segs: CubicBezier[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]!;
    const p3 = points[i + 1]!;
    const prev = points[i - 1] ?? p0;
    const next = points[i + 2] ?? p3;
    // 控制点权重：张力。w 越大控制柄越短、曲线越贴近折线
    const w0 = weights[i] ?? 1;
    const w1 = weights[i + 1] ?? 1;
    const tension0 = 1 / Math.max(w0, 0.05);
    const tension1 = 1 / Math.max(w1, 0.05);

    const p1 = vec3.lerp(
      p0,
      p3,
      0.333 * tension0,
    );
    void prev;
    void next;
    const p2 = vec3.lerp(
      p3,
      p0,
      0.333 * tension1,
    );
    segs.push({ p0, p1, p2, p3 });
  }
  return segs;
}

function evalCubic(b: CubicBezier, t: number): Vec3 {
  const u = 1 - t;
  const b0 = u ** 3;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t ** 3;
  return vec3.add(
    vec3.add(vec3.scale(b.p0, b0), vec3.scale(b.p1, b1)),
    vec3.add(vec3.scale(b.p2, b2), vec3.scale(b.p3, b3)),
  );
}

export function evalPiecewiseBezier(points: Vec3[], weights: number[], t: number): Vec3 {
  if (points.length < 2) return points[0]!;
  const segs = buildSegments(points, weights);
  const clamped = Math.min(1, Math.max(0, t));
  const f = clamped * segs.length;
  const segIdx = Math.min(segs.length - 1, Math.floor(f));
  const localT = f - segIdx;
  return evalCubic(segs[segIdx]!, localT);
}
