import * as THREE from 'three';
import type { ControlPoint, Vec3 } from '@pg/shared';

const JOINT_COLORS: Record<string, number> = {
  J0: 0x909399,
  J1: 0x409eff,
  J2: 0x67c23a,
  J3: 0xe6a23c,
  J4: 0xf56c6c,
  J5: 0x9b59b6,
  J6: 0x1abc9c,
};

export interface GizmoHandle {
  id: string;
  mesh: THREE.Mesh;
  controlPoint: ControlPoint;
}

/** 控制点小球的创建、拾取与拖拽（相机平面投影） */
export class GizmoController {
  readonly group = new THREE.Group();
  private handles = new Map<string, GizmoHandle>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();
  private selectedId: string | null = null;
  private dragging = false;

  onDrag: ((id: string, position: Vec3) => void) | null = null;
  onSelect: ((id: string | null) => void) | null = null;
  onRequestAdd: ((() => void) | null) = null;

  constructor(private camera: THREE.Camera, private dom: HTMLElement) {
    dom.addEventListener('pointerdown', this.handleDown);
    dom.addEventListener('pointermove', this.handleMove);
    dom.addEventListener('pointerup', this.handleUp);
    dom.addEventListener('dblclick', this.handleDoubleClick as EventListener);
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.handleDown);
    this.dom.removeEventListener('pointermove', this.handleMove);
    this.dom.removeEventListener('pointerup', this.handleUp);
    this.dom.removeEventListener('dblclick', this.handleDoubleClick);
  }

  sync(points: ControlPoint[]): void {
    const seen = new Set<string>();
    for (const cp of points) {
      seen.add(cp.id);
      let h = this.handles.get(cp.id);
      if (!h) {
        const geo = new THREE.SphereGeometry(6, 20, 20);
        const mat = new THREE.MeshStandardMaterial({
          color: JOINT_COLORS[cp.jointId] ?? 0x409eff,
          depthTest: false,
          transparent: true,
          opacity: 0.95,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 10;
        mesh.userData.pointId = cp.id;
        this.group.add(mesh);
        h = { id: cp.id, mesh, controlPoint: cp };
        this.handles.set(cp.id, h);
      }
      h.controlPoint = cp;
      h.mesh.position.set(...cp.position);
      const mat = h.mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(JOINT_COLORS[cp.jointId] ?? 0x409eff);
      mat.emissive.set(this.selectedId === cp.id ? 0x332200 : 0x000000);
    }
    for (const [id, h] of this.handles) {
      if (!seen.has(id)) {
        this.group.remove(h.mesh);
        h.mesh.geometry.dispose();
        (h.mesh.material as THREE.Material).dispose();
        this.handles.delete(id);
      }
    }
  }

  select(id: string | null): void {
    this.selectedId = id;
    for (const h of this.handles.values()) {
      const mat = h.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.set(id === h.id ? 0x332200 : 0x000000);
    }
    this.onSelect?.(id);
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pick(): GizmoHandle | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.handles.values()].map((h) => h.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    return this.handles.get((hit.object.userData as { pointId: string }).pointId) ?? null;
  }

  private handleDown = (event: PointerEvent): void => {
    this.updatePointer(event);
    const h = this.pick();
    if (!h) {
      this.select(null);
      return;
    }
    this.select(h.id);
    this.dragging = true;
    this.dom.setPointerCapture?.(event.pointerId);
    // 拖拽平面：过控制点、垂直于当前视线
    const viewDir = new THREE.Vector3();
    this.camera.getWorldDirection(viewDir);
    this.dragPlane.setFromNormalAndCoplanarPoint(viewDir, h.mesh.position);
    const intersection = new THREE.Vector3();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    this.dragOffset.copy(h.mesh.position).sub(intersection);
  };

  private handleMove = (event: PointerEvent): void => {
    this.updatePointer(event);
    if (!this.dragging || !this.selectedId) return;
    const h = this.handles.get(this.selectedId);
    if (!h) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersection = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) return;
    intersection.add(this.dragOffset);
    const pos: Vec3 = [intersection.x, intersection.y, intersection.z];
    h.mesh.position.set(...pos);
    this.onDrag?.(h.id, pos);
  };

  private handleUp = (): void => {
    this.dragging = false;
  };

  private handleDoubleClick = (event: MouseEvent): void => {
    // 空白处双击 → 请求在样条上插入幽灵点
    this.updatePointer(event as unknown as PointerEvent);
    if (!this.pick()) this.onRequestAdd?.();
  };
}
