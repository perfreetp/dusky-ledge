// ===== 最小自研线性代数库：vec3 / quat / mat4（列主序，与 WebGL 一致）=====

export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type Mat4 = Float32Array; // 16 元素列主序
export type Quat = [number, number, number, number]; // xyzw

export const v3 = {
  create: (x = 0, y = 0, z = 0): Vec3 => [x, y, z],
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross(a: Vec3, b: Vec3): Vec3 {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  },
  len: (a: Vec3): number => Math.hypot(a[0], a[1], a[2]),
  normalize(a: Vec3): Vec3 {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  copy: (a: Vec3): Vec3 => [a[0], a[1], a[2]],
  lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
};

export const q = {
  identity: (): Quat => [0, 0, 0, 1],
  copy: (a: Quat): Quat => [a[0], a[1], a[2], a[3]],
  // 欧拉角（弧度，XYZ 顺序）转四元数
  fromEuler(x: number, y: number, z: number): Quat {
    const cx = Math.cos(x / 2), sx = Math.sin(x / 2);
    const cy = Math.cos(y / 2), sy = Math.sin(y / 2);
    const cz = Math.cos(z / 2), sz = Math.sin(z / 2);
    return [
      sx * cy * cz - cx * sy * sz,
      cx * sy * cz + sx * cy * sz,
      cx * cy * sz - sx * sy * cz,
      cx * cy * cz + sx * sy * sz
    ];
  },
  toEuler(q: Quat): Vec3 {
    const [x, y, z, w] = q;
    const sinp = 2 * (w * y - z * x);
    const pitch = Math.asin(Math.max(-1, Math.min(1, sinp)));
    const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
    const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
    return [roll, pitch, yaw];
  },
  mul(a: Quat, b: Quat): Quat {
    const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
    return [
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz
    ];
  },
  conjugate(a: Quat): Quat {
    return [-a[0], -a[1], -a[2], a[3]];
  },
  normalize(a: Quat): Quat {
    const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l, a[3] / l];
  },
  // 球面线性插值
  slerp(a: Quat, b: Quat, t: number): Quat {
    let cosom = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    let b1 = b;
    if (cosom < 0) {
      cosom = -cosom;
      b1 = [-b[0], -b[1], -b[2], -b[3]];
    }
    if (cosom > 0.9995) {
      return q.normalize([
        a[0] + t * (b1[0] - a[0]),
        a[1] + t * (b1[1] - a[1]),
        a[2] + t * (b1[2] - a[2]),
        a[3] + t * (b1[3] - a[3])
      ]);
    }
    const omega = Math.acos(cosom);
    const sinom = Math.sin(omega);
    const s0 = Math.sin((1 - t) * omega) / sinom;
    const s1 = Math.sin(t * omega) / sinom;
    return [
      s0 * a[0] + s1 * b1[0],
      s0 * a[1] + s1 * b1[1],
      s0 * a[2] + s1 * b1[2],
      s0 * a[3] + s1 * b1[3]
    ];
  }
};

export const m4 = {
  identity(): Mat4 {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },
  multiply(a: Mat4, b: Mat4): Mat4 {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
    return out;
  },
  fromTranslation(p: Vec3): Mat4 {
    const m = m4.identity();
    m[12] = p[0]; m[13] = p[1]; m[14] = p[2];
    return m;
  },
  fromQuat(qu: Quat): Mat4 {
    const [x, y, z, w] = qu;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const m = new Float32Array(16);
    m[0] = 1 - (yy + zz); m[1] = xy + wz; m[2] = xz - wy; m[3] = 0;
    m[4] = xy - wz; m[5] = 1 - (xx + zz); m[6] = yz + wx; m[7] = 0;
    m[8] = xz + wy; m[9] = yz - wx; m[10] = 1 - (xx + yy); m[11] = 0;
    m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
    return m;
  },
  compose(pos: Vec3, qu: Quat): Mat4 {
    const t = m4.fromTranslation(pos);
    const r = m4.fromQuat(qu);
    return m4.multiply(t, r);
  },
  perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) * nf;
    m[11] = -1;
    m[14] = 2 * far * near * nf;
    return m;
  },
  lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
    const z = v3.normalize(v3.sub(eye, center));
    const x = v3.normalize(v3.cross(up, z));
    const y = v3.cross(z, x);
    const m = new Float32Array(16);
    m[0] = x[0]; m[1] = y[0]; m[2] = z[0]; m[3] = 0;
    m[4] = x[1]; m[5] = y[1]; m[6] = z[1]; m[7] = 0;
    m[8] = x[2]; m[9] = y[2]; m[10] = z[2]; m[11] = 0;
    m[12] = -v3.dot(x, eye);
    m[13] = -v3.dot(y, eye);
    m[14] = -v3.dot(z, eye);
    m[15] = 1;
    return m;
  },
  invert(a: Mat4): Mat4 {
    const out = new Float32Array(16);
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return m4.identity();
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  },
  // 取平移分量
  getTranslation(m: Mat4): Vec3 {
    return [m[12], m[13], m[14]];
  },
  // 变换点（含平移）
  transformPoint(m: Mat4, p: Vec3): Vec3 {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    const inv = w || 1;
    return [
      (m[0] * x + m[4] * y + m[8] * z + m[12]) / inv,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) / inv,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / inv
    ];
  },
  // 变换方向（不含平移）
  transformVec(m: Mat4, p: Vec3): Vec3 {
    const x = p[0], y = p[1], z = p[2];
    return [
      m[0] * x + m[4] * y + m[8] * z,
      m[1] * x + m[5] * y + m[9] * z,
      m[2] * x + m[6] * y + m[10] * z
    ];
  }
};

// ===== CSS cubic-bezier 风格缓动：x 轴为时间参数，求 t 使 x(t)=u，再取 y(t)=eased =====
export function solveBezierEase(u: number, x1: number, x2: number): number {
  // P0=(0,0) P1=(x1,0) P2=(x2,1) P3=(1,1)
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 0, by = 3 - 3 * 0, ay = 1 - by - cy; // y1=0,y2=1
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  // 牛顿迭代
  let t = u;
  for (let i = 0; i < 8; i++) {
    const x = sampleX(t) - u;
    if (Math.abs(x) < 1e-6) return sampleY(t);
    const dx = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(dx) < 1e-6) break;
    t -= x / dx;
  }
  // 二分兜底
  let lo = 0, hi = 1;
  t = u;
  while (lo < hi) {
    const x = sampleX(t);
    if (Math.abs(x - u) < 1e-6) return sampleY(t);
    if (u < x) hi = t; else lo = t;
    t = (lo + hi) / 2;
  }
  return sampleY(t);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
