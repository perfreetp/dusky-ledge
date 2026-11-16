/**
 * 纯函数向量/矩阵数学（无 DOM 依赖，核心层与渲染层共用）。
 * 列主序 mat4，与 WebGPU 一致。
 */
import type { Vec3 } from './geometry';

export const v3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a: Vec3): number => Math.hypot(a[0], a[1], a[2]),
  dist: (a: Vec3, b: Vec3): number => v3.len(v3.sub(a, b)),
  normalize(a: Vec3): Vec3 {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ],
};

/** 四元数 [x,y,z,w] 工具，用于平行传输标架旋转。 */
export const quat = {
  fromUnitVectors(a: Vec3, b: Vec3): [number, number, number, number] {
    const d = Math.min(1, Math.max(-1, v3.dot(a, b)));
    if (d > 0.999999) return [0, 0, 0, 1];
    if (d < -0.999999) {
      // 反向：任选一个正交轴旋转 180°
      const axis = v3.normalize(v3.cross(Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], a));
      return [axis[0], axis[1], axis[2], 0];
    }
    const axis = v3.normalize(v3.cross(a, b));
    const ang = Math.acos(d);
    const s = Math.sin(ang / 2);
    return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(ang / 2)];
  },
  rotate(q: [number, number, number, number], v: Vec3): Vec3 {
    // q v q* 的展开形式
    const [x, y, z, w] = q;
    const qv: Vec3 = [x, y, z];
    const t = v3.scale(v3.cross(qv, v), 2);
    return v3.add(v3.add(v, v3.scale(t, w)), v3.cross(qv, t));
  },
};

export type Mat4 = Float32Array;

export function mat4Identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r]! * b[c * 4]! +
        a[4 + r]! * b[c * 4 + 1]! +
        a[8 + r]! * b[c * 4 + 2]! +
        a[12 + r]! * b[c * 4 + 3]!;
    }
  }
  return out;
}

export function mat4Perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = far / (near - far);
  m[11] = -1;
  m[14] = (far * near) / (near - far);
  return m;
}

export function mat4LookAt(eye: Vec3, target: Vec3, worldUp: Vec3 = [0, 1, 0]): Mat4 {
  const f = v3.normalize(v3.sub(target, eye));
  const s = v3.normalize(v3.cross(f, worldUp));
  const u = v3.cross(s, f);
  const m = mat4Identity();
  m[0] = s[0]; m[4] = s[1]; m[8] = s[2];
  m[1] = u[0]; m[5] = u[1]; m[9] = u[2];
  m[2] = -f[0]; m[6] = -f[1]; m[10] = -f[2];
  m[12] = -v3.dot(s, eye);
  m[13] = -v3.dot(u, eye);
  m[14] = v3.dot(f, eye);
  return m;
}

/** 平移 + 四元数旋转 + 缩放组合。 */
export function mat4Compose(pos: Vec3, q: [number, number, number, number], scale: Vec3): Mat4 {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const m = mat4Identity();
  m[0] = (1 - (yy + zz)) * scale[0];
  m[1] = (xy + wz) * scale[0];
  m[2] = (xz - wy) * scale[0];
  m[4] = (xy - wz) * scale[1];
  m[5] = (1 - (xx + zz)) * scale[1];
  m[6] = (yz + wx) * scale[1];
  m[8] = (xz + wy) * scale[2];
  m[9] = (yz - wx) * scale[2];
  m[10] = (1 - (xx + yy)) * scale[2];
  m[12] = pos[0]; m[13] = pos[1]; m[14] = pos[2];
  return m;
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  const x = p[0], y = p[1], z = p[2];
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  const inv = w || 1;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / inv,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / inv,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / inv,
  ];
}

export interface Ray {
  origin: Vec3;
  dir: Vec3;
}

/** 射线 vs AABB（slab 法），返回 t 或 null。 */
export function rayAABB(ray: Ray, min: Vec3, max: Vec3): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    const inv = 1 / (ray.dir[i] || 1e-12);
    let t1 = (min[i] - ray.origin[i]) * inv;
    let t2 = (max[i] - ray.origin[i]) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  }
  return tmax >= Math.max(tmin, 0) ? Math.max(tmin, 0) : null;
}
