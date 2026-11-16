// 轨道相机控制器：左键旋转、右键/中键平移、滚轮缩放，带阻尼，保证拖动缩放跟手
import { clamp, orbitEye, v3Dist, type OrbitState } from '../core/math';
import type { Vec3 } from '../core/types';

const MIN_RADIUS = 8;
const MAX_RADIUS = 12000;

export class OrbitController {
  cam: OrbitState;
  private target0: OrbitState;
  private mode: 'none' | 'rotate' | 'pan' = 'none';
  private lastX = 0;
  private lastY = 0;
  private downX = 0;
  private downY = 0;
  private moved = false;
  private el: HTMLElement;
  onPick?: (ndcX: number, ndcY: number) => void;
  onChange?: () => void;

  constructor(el: HTMLElement, initial: OrbitState) {
    this.el = el;
    this.cam = { ...initial, target: [...initial.target] as Vec3 };
    this.target0 = structuredClone(this.cam);
    this.bind();
  }

  private bind() {
    this.el.addEventListener('pointerdown', this.handleDown);
    window.addEventListener('pointermove', this.handleMove);
    window.addEventListener('pointerup', this.handleUp);
    this.el.addEventListener('wheel', this.handleWheel, { passive: false });
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  destroy() {
    this.el.removeEventListener('pointerdown', this.handleDown);
    window.removeEventListener('pointermove', this.handleMove);
    window.removeEventListener('pointerup', this.handleUp);
    this.el.removeEventListener('wheel', this.handleWheel);
  }

  private ndc(x: number, y: number): [number, number] {
    const r = this.el.getBoundingClientRect();
    return [((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1)];
  }

  private handleDown = (e: PointerEvent) => {
    this.el.setPointerCapture?.(e.pointerId);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.moved = false;
    this.mode = e.button === 2 || e.button === 1 ? 'pan' : 'rotate';
  };

  private handleMove = (e: PointerEvent) => {
    if (this.mode === 'none') return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 4) this.moved = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.mode === 'rotate') {
      this.cam.yaw -= dx * 0.005;
      this.cam.pitch = clamp(this.cam.pitch - dy * 0.005, -1.45, 1.45);
    } else {
      // 平移：屏幕位移按当前视距折算成世界位移
      const scale = this.cam.radius * 0.0016;
      const eye = orbitEye(this.cam);
      const fwd: Vec3 = [
        this.cam.target[0] - eye[0],
        this.cam.target[1] - eye[1],
        this.cam.target[2] - eye[2],
      ];
      const fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1;
      const f: Vec3 = [fwd[0] / fl, fwd[1] / fl, fwd[2] / fl];
      const right: Vec3 = [f[1], -f[0], 0];
      const rl = Math.hypot(right[0], right[1]) || 1;
      right[0] /= rl; right[1] /= rl;
      const up: Vec3 = [
        f[1] * right[2] - f[2] * right[1],
        f[2] * right[0] - f[0] * right[2],
        f[0] * right[1] - f[1] * right[0],
      ];
      this.cam.target[0] += (-dx * right[0] - dy * up[0]) * scale;
      this.cam.target[1] += (-dx * right[1] - dy * up[1]) * scale;
      this.cam.target[2] += (-dx * right[2] - dy * up[2]) * scale;
    }
    this.onChange?.();
  };

  private handleUp = (e: PointerEvent) => {
    if (this.mode !== 'none' && !this.moved && e.button === 0) {
      const [nx, ny] = this.ndc(e.clientX, e.clientY);
      this.onPick?.(nx, ny);
    }
    this.mode = 'none';
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    // 指数缩放，跟手且远近都顺滑
    const factor = Math.exp(e.deltaY * 0.0012);
    this.cam.radius = clamp(this.cam.radius * factor, MIN_RADIUS, MAX_RADIUS);
    this.onChange?.();
  };

  frame(target: Vec3, radius: number) {
    this.cam.target = [...target] as Vec3;
    this.cam.radius = clamp(radius, MIN_RADIUS, MAX_RADIUS);
    this.onChange?.();
  }

  reset() {
    this.cam = structuredClone(this.target0);
    this.onChange?.();
  }

  get isInteracting(): boolean {
    return this.mode !== 'none';
  }

  distanceTo(p: Vec3): number {
    return v3Dist(orbitEye(this.cam), p);
  }
}
