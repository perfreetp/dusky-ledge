import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { modelStore } from '../store/model';
import { evaluated } from '../store/evaluated';
import type { FaceRef, Feature, PrimitiveType, SnapPoint, Vec3Tuple } from '../core/types';
import {
  ATTR_CAP,
  ATTR_SEL,
  collectSnapPoints,
  createPrimitiveGeometry,
  defaultDims,
  dimensionForFace,
  faceNormal,
  nearestSnap,
  readFaceRef,
  resizeByFace,
  vec3,
} from '../core/geometry';
import { makeHatchTexture } from '../core/csg';

function defaultDragDims(t: PrimitiveType) {
  return defaultDims(t);
}

export type InteractionMode = 'select' | 'move' | 'resize' | 'clip';
export type DropPayload = PrimitiveType | 'feature';

// dragover 阶段 dataTransfer.getData 不可用，用模块级变量传递拖入类型
let draggedPrimitive: PrimitiveType | null = null;
export function setDraggedPrimitive(t: PrimitiveType | null): void {
  draggedPrimitive = t;
}

const SNAP_PX = 22;
const SNAP_COLORS: Record<SnapPoint['kind'], number> = {
  vertex: 0xffb020,
  'edge-mid': 0x37b6ff,
  'face-center': 0x46d160,
};

/** 实体材质：剖切面贴剖面线，选中面整体提亮（aSel 驱动） */
function buildSolidMaterial(hatchTex: THREE.Texture): THREE.MeshPhongMaterial {
  const mat = new THREE.MeshPhongMaterial({
    color: 0x9fb8d6,
    specular: 0x223344,
    shininess: 28,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float ${ATTR_CAP};
         attribute float ${ATTR_SEL};
         varying float vCap;
         varying float vSel;
         varying vec2 vHatchUv;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vCap = ${ATTR_CAP};
         vSel = ${ATTR_SEL};
         vHatchUv = uv;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D uHatch;
         varying float vCap;
         varying float vSel;
         varying vec2 vHatchUv;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         {
           vec3 base = gl_FragColor.rgb;
           if (vCap > 0.5) {
             vec3 hatch = texture2D(uHatch, vHatchUv).rgb;
             base = mix(base, hatch, 0.82);
           }
           if (vSel > 0.5) {
             base = mix(base, vec3(1.0, 0.55, 0.12), 0.55);
           }
           gl_FragColor.rgb = base;
         }`,
      );
    shader.uniforms.uHatch = { value: hatchTex };
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => 'mc3d-solid-v1';
  return mat;
}

export class SceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private solidGroup = new THREE.Group();
  private edgeObj: THREE.LineSegments | null = null;
  private snapGroup = new THREE.Group();
  private ghost: THREE.Mesh | null = null;
  private clipGroup = new THREE.Group();
  private clipPlane: THREE.Mesh;
  private clipFrame: THREE.LineSegments;
  private clipNormalArrow: THREE.ArrowHelper;

  private material: THREE.MeshPhongMaterial;
  private solidMesh: THREE.Mesh | null = null;

  mode: InteractionMode = 'select';
  private dragging = false;
  private dragFeatureId: string | null = null;
  private dragFace: FaceRef | null = null;
  private dragStartWorld = new THREE.Vector3();
  private featureStart: Feature | null = null;
  private activeSnap: SnapPoint | null = null;
  private moveAxes: THREE.Vector3[] = [];
  private dropType: PrimitiveType | null = null;
  private currentSnaps: SnapPoint[] = [];

  onPickFace: ((ref: FaceRef | null, featureId: string | null) => void) | null = null;
  onStatus: ((msg: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      20000,
    );
    this.camera.position.set(140, 120, 160);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.target.set(0, 20, 0);

    this.scene.background = new THREE.Color(0xf4f6fa);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb8c2d0, 1.15);
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(120, 200, 90);
    dir.castShadow = true;
    this.scene.add(hemi, dir);

    const grid = new THREE.GridHelper(400, 40, 0x9aa7b8, 0xd3dae4);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    this.scene.add(grid);
    const axes = new THREE.AxesHelper(48);
    this.scene.add(axes);

    this.material = buildSolidMaterial(makeHatchTexture());

    // 剖切可视化（固定 200×200 方框 + 法线箭头）
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    this.clipPlane = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({
        color: 0x2f7de1,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.clipFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(planeGeo),
      new THREE.LineBasicMaterial({ color: 0x1c5fc0 }),
    );
    this.clipNormalArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(),
      26,
      0xd4443a,
      8,
      5,
    );
    this.clipGroup.add(this.clipPlane, this.clipFrame, this.clipNormalArrow);
    this.clipGroup.visible = false;
    this.scene.add(this.clipGroup);

    this.scene.add(this.solidGroup, this.snapGroup);
    this.bindEvents();
    // 容器初始尺寸可能为 0（样式未应用完），下一帧强制校正一次
    requestAnimationFrame(() => this.resize());
    this.loop();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.dragging) {
      // 手势中取消：恢复手势开始时的特征状态（撤销一次手势快照即可）
      this.dragging = false;
      this.dragFeatureId = null;
      this.dragFace = null;
      this.featureStart = null;
      this.controls.enabled = true;
      this.clearSnaps();
      modelStore.undo();
      modelStore.endGesture();
      this.setStatus('已取消');
    }
  };

  // ---------------- 事件绑定 ----------------

  private bindEvents(): void {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    el.addEventListener('dragover', this.onDragOver);
    el.addEventListener('drop', this.onDrop);
    el.addEventListener('dragleave', () => this.removeGhost());
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.container);
    this.unobserve = () => ro.disconnect();
  }
  private unobserve: () => void = () => {};

  setMode(mode: InteractionMode): void {
    this.mode = mode;
    this.dragging = false;
    this.dragFeatureId = null;
    this.dragFace = null;
    this.removeGhost();
    this.clearSnaps();
    const cursor = mode === 'select' ? 'default' : mode === 'clip' ? 'crosshair' : 'move';
    this.renderer.domElement.style.cursor = cursor;
  }

  private updatePointer(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private pickFace(): { ref: FaceRef | null; featureId: string | null; hit: THREE.Intersection | null } {
    if (!this.solidMesh) return { ref: null, featureId: null, hit: null };
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.solidMesh, false);
    if (hits.length === 0) return { ref: null, featureId: null, hit: null };
    const hit = hits[0];
    const entry = evaluated();
    const ref = readFaceRef(
      (hit.object as THREE.Mesh).geometry as THREE.BufferGeometry,
      hit.faceIndex!,
      entry.result.codeToFeature,
    );
    return { ref, featureId: ref && !ref.isCap ? ref.featureId : null, hit };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.updatePointer(e);

    if (this.mode === 'clip') {
      this.beginClipDrag(e);
      return;
    }
    if (this.mode === 'move') {
      const { hit } = this.pickFace();
      if (hit) {
        const fid = this.modelFeatureAt(hit);
        if (fid) this.beginMoveDrag(e, fid, hit);
      }
      return;
    }
    if (this.mode === 'resize') {
      const { ref, hit } = this.pickFace();
      if (ref && hit && !ref.isCap) this.beginResizeDrag(e, ref, hit);
      return;
    }
    // select 模式：按下即拾取（不干扰 OrbitControls 的旋转拖拽）
    const { ref, featureId } = this.pickFace();
    this.onPickFace?.(ref, featureId);
  };

  private modelFeatureAt(hit: THREE.Intersection): string | null {
    const entry = evaluated();
    const geo = (hit.object as THREE.Mesh).geometry as THREE.BufferGeometry;
    const vi = geo.index!.getX(hit.faceIndex! * 3);
    const attr = geo.getAttribute('aFeature');
    if (!attr) return null;
    return entry.result.codeToFeature.get(Math.round(attr.getX(vi))) ?? null;
  }

  // ---------------- 移动拖拽（带捕捉） ----------------

  private beginMoveDrag(e: PointerEvent, featureId: string, hit: THREE.Intersection): void {
    const f = modelStore.model.features.find((x) => x.id === featureId);
    if (!f) return;
    this.dragging = true;
    this.dragFeatureId = featureId;
    this.featureStart = JSON.parse(JSON.stringify(f));
    this.dragStartWorld.copy(hit.point);
    this.controls.enabled = false;
    this.moveAxes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    this.currentSnaps = modelStore.model.features
      .filter((x) => x.id !== featureId)
      .flatMap((x) => collectSnapPoints(x));
    this.showSnapMarkers(this.currentSnaps);
    this.setStatus('拖动体块移动 — 靠近顶点(橙)/边中点(蓝)/面心(绿)自动吸附，Esc 取消');
    this.suppressClick = true;
    void e;
  }

  // ---------------- 面改尺寸拖拽 ----------------

  private beginResizeDrag(e: PointerEvent, ref: FaceRef, hit: THREE.Intersection): void {
    const f = modelStore.model.features.find((x) => x.id === ref.featureId);
    if (!f) return;
    const handle = dimensionForFace(f, ref.faceId);
    if (!handle) return;
    this.dragging = true;
    this.dragFeatureId = f.id;
    this.dragFace = ref;
    this.featureStart = JSON.parse(JSON.stringify(f));
    this.dragStartWorld.copy(hit.point);
    const local = hit.point.clone().sub(vec3(f.position));
    this.moveAxes = [faceNormal(f, ref.faceId, local)];
    this.controls.enabled = false;
    this.setStatus(`沿面法线拖动调整「${handle.label}」— Esc 取消`);
    this.suppressClick = true;
    void e;
  }

  // ---------------- 剖切平面拖拽 ----------------

  private beginClipDrag(e: PointerEvent): void {
    this.dragging = true;
    this.dragFeatureId = null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const n = vec3(modelStore.model.clip.normal).normalize();
    const plane = new THREE.Plane(n, -n.dot(vec3(modelStore.model.clip.point)));
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, p)) return;
    this.dragStartWorld.copy(p);
    this.controls.enabled = false;
    this.setStatus('拖动剖切平面沿法线平移 — Esc 取消');
    this.suppressClick = true;
    void e;
  }

  private suppressClick = false;

  private onPointerMove = (e: PointerEvent): void => {
    this.updatePointer(e);
    if (!this.dragging) {
      this.updateHoverCursor();
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (this.mode === 'clip') {
      this.dragClipPlane();
      return;
    }
    if (!this.dragFeatureId || !this.featureStart) return;

    // 沿约束轴把指针射线投影到位移
    const axis = this.moveAxes[0] ?? new THREE.Vector3(1, 0, 0);
    const refPoint = this.dragStartWorld.clone();
    const perp = new THREE.Plane().setFromNormalAndCoplanarPoint(axis, refPoint);
    const target = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(perp, target)) return;
    const projected = target.clone().sub(refPoint).dot(axis);

    if (this.mode === 'resize' && this.dragFace) {
      const { dims, position } = resizeByFace(this.featureStart, this.dragFace.faceId, projected);
      modelStore.replaceFeature(
        { ...this.featureStart, dims, position },
        true,
      );
      this.setStatus(`Δ = ${projected >= 0 ? '+' : ''}${projected.toFixed(1)} mm`);
      return;
    }

    // 移动：先算无吸附位置，再找最近吸附点
    const base = vec3(this.featureStart.position).addScaledVector(axis, projected);
    let finalPos = base;
    this.activeSnap = null;
    if (modelStore.snappingEnabled() && this.currentSnaps.length > 0) {
      const nearest = nearestSnap(this.currentSnaps, base);
      if (nearest) {
        const screenA = this.toScreen(nearest.snap.p);
        const screenB = this.toScreen([base.x, base.y, base.z]);
        const px = screenA.distanceTo(screenB);
        if (px <= SNAP_PX) {
          this.activeSnap = nearest.snap;
          finalPos = vec3(nearest.snap.p);
        }
      }
    }
    modelStore.moveFeature(this.dragFeatureId, [finalPos.x, finalPos.y, finalPos.z], true);
    this.highlightSnap(this.activeSnap);
  };

  private dragClipPlane(): void {
    const n = vec3(modelStore.model.clip.normal).normalize();
    const perp = new THREE.Plane().setFromNormalAndCoplanarPoint(n, this.dragStartWorld);
    const target = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(perp, target)) return;
    const t = target.clone().sub(this.dragStartWorld).dot(n);
    const p = vec3(modelStore.model.clip.point).addScaledVector(n, t);
    modelStore.setClip({ point: [p.x, p.y, p.z] });
  }

  private onPointerUp = (): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.dragFeatureId = null;
    this.dragFace = null;
    this.featureStart = null;
    this.activeSnap = null;
    this.controls.enabled = true;
    modelStore.endGesture();
    this.clearSnaps();
    this.setStatus('');
  };

  private updateHoverCursor(): void {
    if (this.mode === 'select' || this.mode === 'clip') return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.solidMesh ? this.raycaster.intersectObject(this.solidMesh, false).length > 0 : false;
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
  }

  // ---------------- 捕捉点标记 ----------------

  private showSnapMarkers(points: SnapPoint[]): void {
    this.clearSnaps();
    const groups = new Map<SnapPoint['kind'], THREE.Vector3[]>();
    for (const s of points) {
      const arr = groups.get(s.kind) ?? [];
      arr.push(vec3(s.p));
      groups.set(s.kind, arr);
    }
    for (const [kind, arr] of groups) {
      const geo = new THREE.BufferGeometry().setFromPoints(arr);
      const mat = new THREE.PointsMaterial({
        color: SNAP_COLORS[kind],
        size: kind === 'face-center' ? 9 : 7,
        sizeAttenuation: false,
        depthTest: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.renderOrder = 5;
      this.snapGroup.add(pts);
    }
  }

  private highlightSnap(active: SnapPoint | null): void {
    this.snapGroup.children.forEach((c) => c.visible = !active);
    if (!active) return;
    const existing = this.snapGroup.getObjectByName('active-snap');
    if (existing) this.snapGroup.remove(existing);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4, 6.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xff3b30, side: THREE.DoubleSide, depthTest: false }),
    );
    ring.name = 'active-snap';
    ring.position.copy(vec3(active.p));
    ring.lookAt(this.camera.position);
    ring.renderOrder = 6;
    this.snapGroup.add(ring);
  }

  private clearSnaps(): void {
    for (const c of [...this.snapGroup.children]) {
      this.snapGroup.remove(c);
      if (c instanceof THREE.Points || c instanceof THREE.Mesh) c.geometry.dispose();
    }
  }

  private toScreen(p: Vec3Tuple): THREE.Vector2 {
    const v = vec3(p).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((v.x + 1) / 2) * rect.width, ((-v.y + 1) / 2) * rect.height);
  }

  // ---------------- 体块库拖入 ----------------

  private onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
    this.updatePointerFromClient(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(planeY, p)) return;
    if (!this.ghost && draggedPrimitive) {
      this.dropType = draggedPrimitive;
      const geo = createPrimitiveGeometry(draggedPrimitive, defaultDragDims(draggedPrimitive));
      this.ghost = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x2f7de1, transparent: true, opacity: 0.45, depthWrite: false }),
      );
      this.scene.add(this.ghost);
    }
    if (this.ghost) this.ghost.position.copy(p);
  };

  private updatePointerFromClient(cx: number, cy: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((cx - rect.left) / rect.width) * 2 - 1,
      -((cy - rect.top) / rect.height) * 2 + 1,
    );
  }

  private onDrop = (e: DragEvent): void => {
    e.preventDefault();
    const type = (e.dataTransfer?.getData('application/x-mc3d-primitive') ||
      draggedPrimitive) as PrimitiveType | null;
    if (!type) return;
    this.updatePointerFromClient(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(planeY, p)) return;
    modelStore.addFeature(type, [p.x, 20, p.z]);
    this.removeGhost();
  };

  private removeGhost(): void {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost.geometry.dispose();
      this.ghost = null;
    }
    this.dropType = null;
  }

  // ---------------- 同步 Solid 状态 → 场景 ----------------

  syncFromStore(): void {
    const entry = evaluated();
    const { result, geometry } = entry;

    if (this.solidMesh) {
      this.solidGroup.remove(this.solidMesh);
      this.solidMesh.geometry.dispose();
      this.solidMesh = null;
    }
    if (this.edgeObj) {
      this.solidGroup.remove(this.edgeObj);
      this.edgeObj.geometry.dispose();
      this.edgeObj = null;
    }

    if (!result.empty && geometry.attributes.position) {
      this.solidMesh = new THREE.Mesh(geometry, this.material);
      this.solidMesh.castShadow = true;
      this.solidMesh.receiveShadow = true;
      this.solidGroup.add(this.solidMesh);

      const edges = new THREE.EdgesGeometry(geometry, 28);
      this.edgeObj = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x243044 }),
      );
      this.solidGroup.add(this.edgeObj);
    }

    // 剖切平面可视化
    const clip = modelStore.model.clip;
    this.clipGroup.visible = clip.enabled;
    if (clip.enabled) {
      const n = vec3(clip.normal).normalize();
      const p = vec3(clip.point);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      this.clipPlane.quaternion.copy(q);
      this.clipFrame.quaternion.copy(q);
      this.clipPlane.position.copy(p);
      this.clipFrame.position.copy(p);
      this.clipNormalArrow.position.copy(p);
      this.clipNormalArrow.setDirection(n);
    }
  }

  frameAll(): void {
    const box = new THREE.Box3();
    if (this.solidMesh) box.setFromObject(this.solidMesh);
    if (box.isEmpty()) {
      this.controls.target.set(0, 20, 0);
      this.camera.position.set(140, 120, 160);
    } else {
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const center = sphere.center;
      const dist = sphere.radius * 2.6;
      this.controls.target.copy(center);
      const dir = new THREE.Vector3(0.9, 0.75, 1).normalize();
      this.camera.position.copy(center).addScaledVector(dir, dist);
      this.camera.near = Math.max(0.1, dist / 1000);
      this.camera.far = dist * 100;
      this.camera.updateProjectionMatrix();
    }
    this.controls.update();
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private setStatus(msg: string): void {
    this.onStatus?.(msg);
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.unobserve();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    this.renderer.dispose();
    this.material.dispose();
    this.renderer.domElement.remove();
  }
}
