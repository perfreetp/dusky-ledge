/** 轨道相机：球面坐标环绕 target，输出 viewProj；负责 NDC→世界射线。 */
import { mat4LookAt, mat4Multiply, mat4Perspective, v3, type Mat4, type Ray } from '../core/vec';
import type { Vec3 } from '../core/geometry';

export class OrbitCamera {
  target: Vec3 = [8, 1, 20];
  radius = 42;
  yaw = 0.6;
  pitch = 0.35;
  fovy = Math.PI / 4;
  near = 0.1;
  far = 500;
  aspect = 1;

  eye(): Vec3 {
    const cp = Math.cos(this.pitch);
    return [
      this.target[0] + this.radius * cp * Math.sin(this.yaw),
      this.target[1] + this.radius * Math.sin(this.pitch),
      this.target[2] + this.radius * cp * Math.cos(this.yaw),
    ];
  }

  viewProj(): Mat4 {
    const view = mat4LookAt(this.eye(), this.target);
    const proj = mat4Perspective(this.fovy, this.aspect, this.near, this.far);
    return mat4Multiply(proj, view);
  }

  rotate(dx: number, dy: number): void {
    this.yaw -= dx * 0.006;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dy * 0.006));
  }

  pan(dx: number, dy: number): void {
    const eye = this.eye();
    const forward = v3.normalize(v3.sub(this.target, eye));
    const right = v3.normalize(v3.cross(forward, [0, 1, 0]));
    const up = v3.cross(right, forward);
    const scale = this.radius * 0.0016;
    this.target = v3.add(this.target, v3.add(v3.scale(right, -dx * scale), v3.scale(up, dy * scale)));
  }

  zoom(delta: number): void {
    this.radius = Math.max(3, Math.min(220, this.radius * (1 + delta * 0.0012)));
  }

  /** 屏幕 NDC（x,y ∈ [-1,1]，y 向上）→ 世界射线。 */
  ndcRay(ndcX: number, ndcY: number): Ray {
    const eye = this.eye();
    const forward = v3.normalize(v3.sub(this.target, eye));
    const right = v3.normalize(v3.cross(forward, [0, 1, 0]));
    const up = v3.cross(right, forward);
    const tanHalf = Math.tan(this.fovy / 2);
    const dir = v3.normalize(
      v3.add(
        v3.add(forward, v3.scale(right, ndcX * tanHalf * this.aspect)),
        v3.scale(up, ndcY * tanHalf),
      ),
    );
    return { origin: eye, dir };
  }

  /** 序列化（双视口联动相机用）。 */
  serialize() {
    return { target: [...this.target] as Vec3, radius: this.radius, yaw: this.yaw, pitch: this.pitch };
  }

  apply(s: { target: Vec3; radius: number; yaw: number; pitch: number }): void {
    this.target = [...s.target] as Vec3;
    this.radius = s.radius;
    this.yaw = s.yaw;
    this.pitch = s.pitch;
  }
}
