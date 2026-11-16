// ===== 3D 视口：渲染循环、相机、拾取、Gizmo 拖拽、权重笔刷 =====
import type { Bone, MeshData, Project } from '../core/types';
import type { Pose } from '../core/skeleton';
import { Renderer, type GizmoMode } from '../renderer/renderer';
import { paintWeight, normalizeVertex, countUnpainted } from '../core/mesh';
import { q } from '../core/math';

export interface ViewportState {
  mode: 'rig' | 'paint' | 'animate';
  pose: Pose;
  selectedBoneId: string | null;
  gizmoMode: GizmoMode;
  brushBoneIndex: number;
  brushValue: number;
  brushReplace: boolean;
}

export class EditorViewport {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  private project: Project;
  private state: ViewportState;
  private raf = 0;
  private dirty = true;
  private dragging: 'orbit' | 'pan' | 'gizmo' | 'paint' | null = null;
  private lastX = 0;
  private lastY = 0;
  private downX = 0;
  private downY = 0;
  private gizmoAxis: 0 | 1 | 2 | null = null;
  onChange: (kind: string, payload?: unknown) => void = () => {};
  private currentMesh: MeshData | null;

  constructor(canvas: HTMLCanvasElement, project: Project, state: ViewportState) {
    this.canvas = canvas;
    this.project = project;
    this.state = state;
    this.renderer = new Renderer(canvas);
    this.currentMesh = project.mesh;
    if (project.mesh) this.renderer.setMesh(project.mesh);
    this.bindEvents();
    this.loop();
  }

  updateProject(p: Project) {
    this.project = p;
    if (p.mesh !== this.currentMesh) {
      this.renderer.setMesh(p.mesh);
      this.currentMesh = p.mesh;
    }
    this.dirty = true;
  }

  updateState(s: ViewportState) {
    this.state = s;
    this.dirty = true;
  }

  /** 仅替换当前采样姿势（导出逐帧驱动用） */
  setPose(pose: Pose) {
    this.state = { ...this.state, pose };
    this.dirty = true;
  }

  getState(): ViewportState {
    return this.state;
  }

  requestRender() { this.dirty = true; }

  private bindEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.renderer.zoom(e.deltaY);
      this.dirty = true;
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onDown(e: PointerEvent) {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.lastX = this.downX = e.clientX;
    this.lastY = this.downY = e.clientY;

    if (e.button === 2 || e.shiftKey) { this.dragging = 'pan'; return; }
    if (e.button === 1) { this.dragging = 'orbit'; return; }
    if (e.button !== 0) return;

    // 动画/绑定模式：先试 Gizmo 轴
    if (this.state.mode !== 'paint' && this.state.selectedBoneId) {
      const axis = this.renderer.pickGizmoAxis(e.clientX, e.clientY, this.state.selectedBoneId);
      if (axis !== null) {
        this.dragging = 'gizmo';
        this.gizmoAxis = axis;
        return;
      }
    }

    if (this.state.mode === 'paint') {
      this.dragging = 'paint';
      this.applyBrush(e.clientX, e.clientY);
      return;
    }

    // rig/animate 选骨骼
    const hit = this.renderer.pick(e.clientX, e.clientY, false);
    if (hit && hit.kind === 'bone') {
      this.onChange('select-bone', hit.boneId);
      this.dragging = 'gizmo'; // 按下骨骼即可开始整体拖拽（轴由移动方向决定，这里默认绕 Y / 平移用屏幕投影）
      this.gizmoAxis = null;
    } else {
      this.dragging = 'orbit';
    }
  }

  private onMove(e: PointerEvent) {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.dragging === 'orbit') {
      this.renderer.orbit(dx, dy);
      this.dirty = true;
    } else if (this.dragging === 'pan') {
      this.renderer.pan(dx, dy);
      this.dirty = true;
    } else if (this.dragging === 'paint') {
      this.applyBrush(e.clientX, e.clientY);
    } else if (this.dragging === 'gizmo' && this.state.selectedBoneId) {
      const res = this.renderer.dragGizmo(
        this.state.selectedBoneId, this.gizmoAxis,
        this.state.gizmoMode,
        this.downX, this.downY, e.clientX, e.clientY
      );
      if (res) this.onChange('gizmo-transform', res);
    }
  }

  private onUp(e: PointerEvent) {
    if (this.dragging === 'gizmo') {
      const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
      if (moved > 2) this.onChange('gizmo-end');
    }
    this.dragging = null;
    this.gizmoAxis = null;
  }

  private applyBrush(clientX: number, clientY: number) {
    const mesh = this.project.mesh;
    if (!mesh) return;
    const hit = this.renderer.pick(clientX, clientY, true);
    if (!hit || hit.kind !== 'vertex') return;
    paintWeight(mesh, hit.vertex, this.state.brushBoneIndex, this.state.brushValue, this.state.brushReplace);
    normalizeVertex(mesh, hit.vertex);
    this.renderer.refreshMeshDynamic(mesh);
    this.onChange('weight-painted', { unpainted: countUnpainted(mesh) });
    this.dirty = true;
  }

  /** 笔刷影响范围提示：返回当前选中骨骼颜色 */
  boneColorHex(index: number): string {
    const b: Bone | undefined = this.project.skeleton[index];
    if (!b) return '#888';
    const c = b.color;
    return '#' + c.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  }

  resetCamera() { this.renderer.resetCamera(); this.dirty = true; }

  penetration() {
    if (!this.project.mesh) return null;
    return this.renderer.penetrationStats(
      this.project.mesh, this.project.skeleton, this.state.pose, this.project.groundY
    );
  }

  dispose() {
    cancelAnimationFrame(this.raf);
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.dirty) return;
    this.dirty = false;
    const p = this.project;
    this.renderer.render(p.skeleton, this.state.pose, {
      showBones: p.showBones,
      showMesh: p.showMesh,
      weightMode: p.showWeightColor || this.state.mode === 'paint',
      showUnpainted: this.state.mode === 'paint' || p.showWeightColor,
      showPenetration: p.showPenetration,
      selectedBoneId: this.state.selectedBoneId,
      gizmoMode: this.state.gizmoMode,
      showGizmo: this.state.mode !== 'paint' && !!this.state.selectedBoneId
    }, p.groundY);
  };

  get canvasEl(): HTMLCanvasElement { return this.canvas; }
}
