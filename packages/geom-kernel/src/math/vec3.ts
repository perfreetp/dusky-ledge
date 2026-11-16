import type { Vec3 } from '@pg/shared';

export const vec3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  length: (a: Vec3): number => Math.hypot(a[0], a[1], a[2]),
  lengthSq: (a: Vec3): number => a[0] ** 2 + a[1] ** 2 + a[2] ** 2,
  normalize(a: Vec3): Vec3 {
    const l = vec3.length(a);
    return l < 1e-12 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ],
  distance: (a: Vec3, b: Vec3): number => vec3.length(vec3.sub(a, b)),
  /** 绕任意单位轴旋转（罗德里格斯公式），angle 为弧度 */
  rotateAxis(a: Vec3, axis: Vec3, angle: number): Vec3 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const k = axis;
    const dot = vec3.dot(k, a);
    const cross = vec3.cross(k, a);
    return vec3.add(
      vec3.add(vec3.scale(a, c), vec3.scale(k, dot * (1 - c))),
      vec3.scale(cross, s),
    );
  },
};

export const EPS = 1e-9;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function nearlyEqual(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) <= tol;
}
