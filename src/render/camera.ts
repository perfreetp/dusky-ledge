import type { Mat4, Vec3 } from './math';
import { identity } from './math';

/**
 * 相机：绕探方中心旋转的轨道相机。使用球坐标，yaw/pitch 为弧度。
 * 世界坐标：x 向右（探方东西），y 向上（深度），z 向屏幕内（南北）。
 */
export class OrbitCamera {
  target: Vec3 = { x: 0, y: 0, z: 0 };
  distance = 20;
  yaw = -0.65;
  pitch = 0.8;
  fov = (48 * Math.PI) / 180;
  near = 0.1;
  far = 500;
  minDistance = 3;
  maxDistance = 160;

  eye(): Vec3 {
    const cp = Math.cos(this.pitch);
    return {
      x: this.target.x + this.distance * cp * Math.sin(this.yaw),
      y: this.target.y + this.distance * Math.sin(this.pitch),
      z: this.target.z + this.distance * cp * Math.cos(this.yaw),
    };
  }

  forward(): Vec3 {
    const e = this.eye();
    const fx = this.target.x - e.x;
    const fy = this.target.y - e.y;
    const fz = this.target.z - e.z;
    const l = Math.hypot(fx, fy, fz) || 1;
    return { x: fx / l, y: fy / l, z: fz / l };
  }

  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.006;
    this.pitch = clampAngle(this.pitch - dy * 0.006);
  }

  pan(dx: number, dy: number, viewportHeight: number): void {
    const f = this.forward();
    const right = normalize3({ x: f.z, y: 0, z: -f.x });
    const upScreen = normalize3({
      x: right.y * f.z - right.z * f.y,
      y: right.z * f.x - right.x * f.z,
      z: right.x * f.y - right.y * f.x,
    });
    const scale = (this.distance * Math.tan(this.fov / 2) * 2) / Math.max(1, viewportHeight);
    this.target = {
      x: this.target.x - (right.x * dx - upScreen.x * dy) * scale,
      y: this.target.y - (right.y * dx - upScreen.y * dy) * scale,
      z: this.target.z - (right.z * dx - upScreen.z * dy) * scale,
    };
  }

  zoom(delta: number): void {
    const factor = Math.exp(delta * 0.0015);
    this.distance = Math.min(this.maxDistance, Math.max(this.minDistance, this.distance * factor));
  }

  viewMatrix(): Mat4 {
    return lookAtSimple(this.eye(), this.target, { x: 0, y: 1, z: 0 });
  }

  projection(aspect: number): Mat4 {
    return perspectiveSimple(this.fov, aspect, this.near, this.far);
  }

  /** 屏幕像素坐标 -> 世界空间射线 */
  rayFromScreen(
    px: number,
    py: number,
    width: number,
    height: number,
  ): { origin: Vec3; dir: Vec3 } {
    const ndcX = (px / width) * 2 - 1;
    const ndcY = 1 - (py / height) * 2;
    const aspect = width / height;
    const tanHalf = Math.tan(this.fov / 2);
    // 相机基向量
    const f = this.forward();
    const rightRaw = crossSimple(f, { x: 0, y: 1, z: 0 });
    const right = normalize3(rightRaw);
    const up = crossSimple(right, f);
    const dir = normalize3({
      x: f.x + right.x * ndcX * tanHalf * aspect + up.x * ndcY * tanHalf,
      y: f.y + right.y * ndcX * tanHalf * aspect + up.y * ndcY * tanHalf,
      z: f.z + right.z * ndcX * tanHalf * aspect + up.z * ndcY * tanHalf,
    });
    return { origin: this.eye(), dir };
  }

  frame(nx: number, ny: number, nz: number, focusY = ny * 0.5): void {
    const radius = Math.max(nx, ny, nz);
    this.target = { x: nx / 2, y: focusY, z: nz / 2 };
    // 以“对角线半径 / sin(半视角)”估算，保证整个探方都在视口内
    const diag = Math.hypot(nx, ny, nz) * 0.5;
    this.distance = Math.max(diag / Math.sin(this.fov * 0.5), radius * 1.1) * 0.92;
    this.minDistance = Math.max(2, radius * 0.22);
    this.maxDistance = radius * 10;
  }

  /** 当前编辑层变化时，把视线中心移到该层，保证该层平面大部分落在视口内 */
  focusLayer(startY: number, rows: number, nx: number, ny: number, nz: number): void {
    const radius = Math.max(nx, ny, nz);
    const top = Math.min(ny, startY + rows);
    this.target = { x: nx / 2, y: top - rows * 0.5, z: nz / 2 };
    if (this.distance > radius * 3) this.frame(nx, ny, nz, top - rows * 0.5);
  }
}

function clampAngle(v: number): number {
  const lo = -1.45;
  const hi = 1.45;
  return v < lo ? lo : v > hi ? hi : v;
}

function crossSimple(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function normalize3(v: Vec3): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function lookAtSimple(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const z = normalize3({ x: eye.x - center.x, y: eye.y - center.y, z: eye.z - center.z });
  const x = normalize3(crossSimple(up, z));
  const y = crossSimple(z, x);
  const m = identity();
  m[0] = x.x;
  m[1] = y.x;
  m[2] = z.x;
  m[4] = x.y;
  m[5] = y.y;
  m[6] = z.y;
  m[8] = x.z;
  m[9] = y.z;
  m[10] = z.z;
  m[12] = -(x.x * eye.x + x.y * eye.y + x.z * eye.z);
  m[13] = -(y.x * eye.x + y.y * eye.y + y.z * eye.z);
  m[14] = -(z.x * eye.x + z.y * eye.y + z.z * eye.z);
  return m;
}

function perspectiveSimple(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}
