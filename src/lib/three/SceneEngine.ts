import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DEFAULT_CAMERA, LOD, SCENE } from '../config';
import type { Feature, LayerId, MeasurePoint, ReworkCircle } from '../types';
import { buildBucketGeometries, type BucketGeometry, type LodLevel } from './geometry';
import { buildMaterials, type EngineMaterials } from './materials';
import { FeatureArrays, TYPE_ORDER, bucketSlot } from './featureArrays';

export type InteractionMode = 'select' | 'box' | 'circle' | 'measure';

export interface EngineCallbacks {
  onPick?: (feature: Feature | null, screenX: number, screenY: number) => void;
  onBoxSelect?: (features: Feature[]) => void;
  onMeasure?: (a: MeasurePoint | null, b: MeasurePoint | null, distance: number | null) => void;
  onCircle?: (circle: ReworkCircle | null) => void;
  onStats?: (visible: number, total: number, fps: number) => void;
}

interface PartMesh {
  mesh: THREE.InstancedMesh;
  typeIndex: number;
  lod: LodLevel;
  part: number;
  transparent: boolean;
}

const RENDER_ORDER = {
  box: 10,
  net: 11,
  wall: 12,
  plane: 13,
  highlight: 30
};

const UP = new THREE.Vector3(0, 1, 0);

export class SceneEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private materials: EngineMaterials;
  private frustum = new THREE.Frustum();
  private projScreen = new THREE.Matrix4();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private rayNdc = new THREE.Vector2();
  private callbacks: EngineCallbacks;

  private features: Feature[] = [];
  private arrays!: FeatureArrays;
  private partMeshes: PartMesh[] = [];
  private pickMeshes: THREE.InstancedMesh[] = [];
  private highlightMesh!: THREE.InstancedMesh;
  private selected = new Set<number>();

  private mode: InteractionMode = 'select';
  private downX = 0;
  private downY = 0;
  private dragging = false;
  private dragDiv?: HTMLDivElement;

  private measureGroup = new THREE.Group();
  private measureA: MeasurePoint | null = null;
  private measureB: MeasurePoint | null = null;
  private reworkGroup = new THREE.Group();

  private flying = false;
  private flyT = 0;
  private flyFromPos = new THREE.Vector3();
  private flyToPos = new THREE.Vector3();
  private flyFromTarget = new THREE.Vector3();
  private flyToTarget = new THREE.Vector3();

  private lastCamPos = new THREE.Vector3(Infinity, Infinity, Infinity);
  private lastCamZoom = -1;
  /** 图层开关/归属变更后强制重算一次剔除，即使相机没动 */
  private needsRefresh = false;
  private raf = 0;
  private lastFrame = performance.now();
  private fpsAcc = 0;
  private fpsFrames = 0;
  private fpsLast = performance.now();
  private lastFps = 0;
  private statsVisible = 0;
  private resizeObs?: ResizeObserver;
  private disposed = false;

  // 复用临时对象，帧循环零分配
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private s = new THREE.Vector3();
  private color = new THREE.Color();
  private sortList: { mesh: THREE.InstancedMesh; d: number }[] = [];

  constructor(container: HTMLElement, callbacks: EngineCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(SCENE.fogColor);
    this.scene.fog = new THREE.Fog(SCENE.fogColor, SCENE.fogNear, SCENE.fogFar);

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      1,
      12000
    );
    this.camera.position.set(...DEFAULT_CAMERA.position);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...DEFAULT_CAMERA.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 7000;
    this.controls.update();

    this.materials = buildMaterials();
    this.buildEnvironment();
    this.buildHighlight();
    this.scene.add(this.measureGroup, this.reworkGroup);

    this.bindEvents();
    this.resizeObs = new ResizeObserver(() => this.onResize());
    this.resizeObs.observe(container);

    this.loop();
  }

  // ---------------------------------------------------------------- 环境

  private buildEnvironment() {
    const hemi = new THREE.HemisphereLight(0xbfe4ff, 0x0a2238, 1.1);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(1200, 1800, 800);
    this.scene.add(hemi, dir);

    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(20000, 20000),
      new THREE.MeshLambertMaterial({ color: SCENE.seaColor, transparent: true, opacity: 0.92 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = SCENE.floorY;
    this.scene.add(sea);

    const grid = new THREE.GridHelper(9000, 90, 0x2a6f9e, 0x174a6b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = SCENE.floorY + 0.2;
    this.scene.add(grid);
  }

  private buildHighlight() {
    this.highlightMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.highlight,
      1000
    );
    this.highlightMesh.count = 0;
    this.highlightMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.highlightMesh.frustumCulled = false;
    this.highlightMesh.renderOrder = RENDER_ORDER.highlight;
    this.scene.add(this.highlightMesh);
  }

  // ---------------------------------------------------------------- 数据装载

  loadProject(features: Feature[]) {
    // 清理旧桶
    for (const p of this.partMeshes) {
      this.scene.remove(p.mesh);
      p.mesh.dispose();
    }
    this.partMeshes = [];
    this.pickMeshes = [];
    this.selected.clear();
    this.clearMeasure();
    this.clearReworkCircles();

    this.features = features;
    this.arrays = new FeatureArrays(features);
    const buckets = buildBucketGeometries();

    for (const bucket of buckets) {
      bucket.parts.forEach((part, partIndex) => {
        const mat = this.materialFor(part.wireframe, part.transparent, bucket.type, partIndex);
        const mesh = new THREE.InstancedMesh(part.geometry, mat, features.length);
        mesh.count = 0;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false; // 逐要素视锥剔除由我们自己做
        mesh.userData = { typeIndex: TYPE_ORDER.indexOf(bucket.type), lod: bucket.lod, part: partIndex };
        if (part.transparent) {
          mesh.renderOrder = this.orderFor(bucket.type, partIndex, part.wireframe);
        }
        this.scene.add(mesh);
        const pm: PartMesh = {
          mesh,
          typeIndex: TYPE_ORDER.indexOf(bucket.type),
          lod: bucket.lod,
          part: partIndex,
          transparent: part.transparent
        };
        this.partMeshes.push(pm);
        this.pickMeshes.push(mesh);
      });
    }
    this.refreshHighlights();
  }

  private materialFor(wireframe: boolean, transparent: boolean, type: Feature['type'], part: number): THREE.Material {
    if (!transparent) return this.materials.solid;
    if (wireframe) {
      // 包围盒与网衣线框分开材质，便于调透明度
      return this.materials.net;
    }
    if (type === 'channel') return this.materials.plane;
    return this.materials.wall;
  }

  private orderFor(type: Feature['type'], part: number, wireframe: boolean): number {
    if (type === 'channel') return RENDER_ORDER.plane;
    if (wireframe) return RENDER_ORDER.net;
    return RENDER_ORDER.wall;
  }

  setLayerVisible(layer: LayerId, on: boolean) {
    if (!this.arrays) return;
    this.arrays.setLayerOn(layer, on);
    this.selected.forEach((idx) => {
      if (!this.arrays.visible[idx]) this.selected.delete(idx);
    });
    this.refreshHighlights();
    this.needsRefresh = true;
  }

  /** 框选改图层归属：同步引擎内部索引 */
  applyLayerChange(featureIds: string[], layer: LayerId) {
    if (!this.arrays) return;
    for (const id of featureIds) {
      const idx = this.arrays.idToIndex.get(id);
      if (idx !== undefined) this.arrays.setLayerOf(idx, layer);
    }
    this.refreshHighlights();
    this.needsRefresh = true;
  }

  // ---------------------------------------------------------------- 事件

  private bindEvents() {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('dblclick', this.onDblClick);
    el.addEventListener('contextmenu', this.onContext);
  }

  private onContext = (e: Event) => e.preventDefault();

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && this.mode !== 'circle') return;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.dragging = true;

    if (this.mode === 'box') {
      this.dragDiv = document.createElement('div');
      this.dragDiv.className = 'box-select-rect';
      this.dragDiv.style.left = e.clientX + 'px';
      this.dragDiv.style.top = e.clientY + 'px';
      document.body.appendChild(this.dragDiv);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging || this.mode !== 'box' || !this.dragDiv) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x1 = Math.min(this.downX, e.clientX) - rect.left;
    const y1 = Math.min(this.downY, e.clientY) - rect.top;
    const x2 = Math.max(this.downX, e.clientX) - rect.left;
    const y2 = Math.max(this.downY, e.clientY) - rect.top;
    this.dragDiv.style.left = this.downX + 'px';
    this.dragDiv.style.top = this.downY + 'px';
    this.dragDiv.style.width = '0px';
    this.dragDiv.style.height = '0px';
    requestAnimationFrame(() => {
      if (!this.dragDiv) return;
      this.dragDiv.style.left = rect.left + x1 + 'px';
      this.dragDiv.style.top = rect.top + y1 + 'px';
      this.dragDiv.style.width = x2 - x1 + 'px';
      this.dragDiv.style.height = y2 - y1 + 'px';
    });
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    const dx = Math.abs(e.clientX - this.downX);
    const dy = Math.abs(e.clientY - this.downY);
    const isClick = dx < 5 && dy < 5;

    if (this.mode === 'box' && this.dragDiv) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      if (!isClick) this.doBoxSelect(this.downX - rect.left, this.downY - rect.top, e.clientX - rect.left, e.clientY - rect.top);
      this.dragDiv.remove();
      this.dragDiv = undefined;
      return;
    }

    if (isClick && (this.mode === 'select' || this.mode === 'measure' || this.mode === 'circle')) {
      this.handleClick(e);
    }
  };

  private handleClick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (this.mode === 'measure') {
      const p = this.pickGroundPoint(e, rect);
      if (!p) return;
      if (!this.measureA || this.measureB) {
        this.measureA = p;
        this.measureB = null;
      } else {
        this.measureB = p;
      }
      this.renderMeasure();
      this.emitMeasure();
      return;
    }

    if (this.mode === 'circle') {
      const p = this.pickGroundPoint(e, rect);
      if (!p) return;
      const circle: ReworkCircle = { x: p.x, y: p.y, z: p.z, radius: 120 };
      this.addReworkCircle(circle);
      this.callbacks.onCircle?.(circle);
      return;
    }

    // select：实例化射线拾取，关闭图层的网格不在 pickMeshes 可见集合里
    const feature = this.pickFeature(e, rect);
    if (feature) {
      this.selected.clear();
      this.selected.add(this.arrays.idToIndex.get(feature.id)!);
      this.refreshHighlights();
    } else {
      this.selected.clear();
      this.refreshHighlights();
    }
    this.callbacks.onPick?.(feature ?? null, e.clientX, e.clientY);
  }

  private onDblClick = (e: MouseEvent) => {
    if (this.mode !== 'select') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const feature = this.pickFeature(e as PointerEvent, rect);
    if (feature) {
      this.selected.clear();
      this.selected.add(this.arrays.idToIndex.get(feature.id)!);
      this.refreshHighlights();
      this.callbacks.onPick?.(feature, e.clientX, e.clientY);
      this.flyToFeature(feature);
    }
  };

  // ---------------------------------------------------------------- 拾取

  private setRay(e: { clientX: number; clientY: number }, rect: DOMRect) {
    this.rayNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.rayNdc, this.camera);
  }

  /** 只对 count>0 且所在图层开启的桶做射线检测 */
  private pickFeature(e: { clientX: number; clientY: number }, rect: DOMRect): Feature | null {
    this.setRay(e, rect);
    const meshes = this.pickMeshes.filter((m) => m.count > 0);
    const hits = this.raycaster.intersectObjects(meshes, false);
    for (const hit of hits) {
      const mesh = hit.object as THREE.InstancedMesh;
      const instanceId = hit.instanceId;
      if (instanceId === undefined) continue;
      const { arr } = this.arrays.listFor(
        (mesh.userData as { typeIndex: number }).typeIndex,
        (mesh.userData as { lod: LodLevel }).lod
      );
      const featureIndex = arr[instanceId];
      const f = this.features[featureIndex];
      if (f && this.arrays.visible[featureIndex]) return f;
    }
    return null;
  }

  private pickGroundPoint(e: { clientX: number; clientY: number }, rect: DOMRect): THREE.Vector3 | null {
    this.setRay(e, rect);
    this.v.set(0, -1, 0);
    const plane = new THREE.Plane(this.v, -SCENE.floorY);
    const out = new THREE.Vector3();
    const ok = this.raycaster.ray.intersectPlane(plane, out);
    return ok ? out : null;
  }

  // ---------------------------------------------------------------- 框选

  private doBoxSelect(x1: number, y1: number, x2: number, y2: number) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.selected.clear();
    const picked: Feature[] = [];
    this.projScreen.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);

    for (let i = 0; i < this.arrays.count; i++) {
      if (!this.arrays.visible[i]) continue; // 关闭图层/视口外不参与
      this.v.set(this.arrays.cxCenter[i], this.arrays.cyCenter[i], this.arrays.czCenter[i]);
      this.v.applyMatrix4(this.projScreen);
      if (this.v.z < -1 || this.v.z > 1) continue;
      const sx = (this.v.x * 0.5 + 0.5) * w;
      const sy = (-this.v.y * 0.5 + 0.5) * h;
      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        this.selected.add(i);
        picked.push(this.features[i]);
      }
    }
    this.refreshHighlights();
    this.callbacks.onBoxSelect?.(picked);
  }

  // ---------------------------------------------------------------- 高亮

  refreshHighlights() {
    let n = 0;
    this.selected.forEach((idx) => {
      if (n >= 1000) return;
      const a = this.arrays;
      this.v.set(
        (a.bMinX[idx] + a.bMaxX[idx]) / 2,
        (a.bMinY[idx] + a.bMaxY[idx]) / 2,
        (a.bMinZ[idx] + a.bMaxZ[idx]) / 2
      );
      this.s.set(
        (a.bMaxX[idx] - a.bMinX[idx]) * 1.08,
        (a.bMaxY[idx] - a.bMinY[idx]) * 1.08,
        (a.bMaxZ[idx] - a.bMinZ[idx]) * 1.08
      );
      this.q.identity();
      this.m4.compose(this.v, this.q, this.s);
      this.highlightMesh.setMatrixAt(n, this.m4);
      n++;
    });
    this.highlightMesh.count = n;
    this.highlightMesh.instanceMatrix.needsUpdate = true;
  }

  getSelectedFeatures(): Feature[] {
    return [...this.selected].map((i) => this.features[i]);
  }

  clearSelection() {
    this.selected.clear();
    this.refreshHighlights();
  }

  // ---------------------------------------------------------------- 模式

  setMode(mode: InteractionMode) {
    this.mode = mode;
    this.renderer.domElement.style.cursor =
      mode === 'select' ? 'grab' : 'crosshair';
    if (mode !== 'measure') {
      // 保留已完成的测距结果，切换模式不清空，由显式按钮清空
    }
  }

  // ---------------------------------------------------------------- 测距

  clearMeasure() {
    this.measureA = null;
    this.measureB = null;
    this.measureGroup.clear();
    this.callbacks.onMeasure?.(null, null, null);
  }

  private emitMeasure() {
    let dist: number | null = null;
    if (this.measureA && this.measureB) {
      const dx = this.measureB.x - this.measureA.x;
      const dz = this.measureB.z - this.measureA.z;
      dist = Math.sqrt(dx * dx + dz * dz); // 水平距离，忽略高差
    }
    this.callbacks.onMeasure?.(this.measureA, this.measureB, dist);
  }

  private renderMeasure() {
    this.measureGroup.clear();
    const mkPoint = (p: MeasurePoint) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), this.materials.measurePoint);
      dot.position.set(p.x, p.y + 2, p.z);
      return dot;
    };
    if (this.measureA) this.measureGroup.add(mkPoint(this.measureA));
    if (this.measureA && this.measureB) {
      this.measureGroup.add(mkPoint(this.measureB));
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(this.measureA.x, SCENE.floorY + 1, this.measureA.z),
        new THREE.Vector3(this.measureB.x, SCENE.floorY + 1, this.measureB.z)
      ]);
      this.measureGroup.add(new THREE.Line(geo, this.materials.measureLine));
    }
  }

  // ---------------------------------------------------------------- 返工圈

  addReworkCircle(circle: ReworkCircle) {
    const segs = 64;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
      const ang = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        circle.x + Math.cos(ang) * circle.radius,
        SCENE.floorY + 1.5,
        circle.z + Math.sin(ang) * circle.radius
      ));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.materials.reworkLine);
    const diskGeo = new THREE.CircleGeometry(circle.radius, 48);
    diskGeo.rotateX(-Math.PI / 2);
    const disk = new THREE.Mesh(diskGeo, this.materials.reworkDisk);
    disk.position.set(circle.x, SCENE.floorY + 1, circle.z);
    const g = new THREE.Group();
    g.add(line, disk);
    this.reworkGroup.add(g);
  }

  clearReworkCircles() {
    this.reworkGroup.clear();
    this.callbacks.onCircle?.(null);
  }

  // ---------------------------------------------------------------- 相机飞行

  flyToFeature(f: Feature) {
    this.flyFromPos.copy(this.camera.position);
    this.flyFromTarget.copy(this.controls.target);
    this.flyToTarget.set(f.x, Math.max(0, this.arrays.cyCenter[this.arrays.idToIndex.get(f.id)!]), f.z);
    const dist = f.type === 'warningZone' || f.type === 'channel' ? f.radius * 3 : Math.max(60, f.radius * 9);
    this.flyToPos.set(f.x + dist * 0.7, dist * 0.8, f.z + dist * 0.7);
    this.flyT = 0;
    this.flying = true;
    this.controls.enabled = false;
  }

  resetView() {
    this.flyFromPos.copy(this.camera.position);
    this.flyFromTarget.copy(this.controls.target);
    this.flyToPos.set(...DEFAULT_CAMERA.position);
    this.flyToTarget.set(...DEFAULT_CAMERA.target);
    this.flyT = 0;
    this.flying = true;
    this.controls.enabled = false;
  }

  private updateFly(dt: number) {
    if (!this.flying) return;
    this.flyT = Math.min(1, this.flyT + dt / 1.1);
    const t = 1 - Math.pow(1 - this.flyT, 3); // easeOutCubic
    this.camera.position.lerpVectors(this.flyFromPos, this.flyToPos, t);
    this.controls.target.lerpVectors(this.flyFromTarget, this.flyToTarget, t);
    if (this.flyT >= 1) {
      this.flying = false;
      this.controls.enabled = true;
    }
  }

  // ---------------------------------------------------------------- 帧循环

  private onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private cameraMoved(): boolean {
    const moved =
      this.camera.position.distanceToSquared(this.lastCamPos) > 0.5 ||
      this.camera.zoom !== this.lastCamZoom;
    if (moved) {
      this.lastCamPos.copy(this.camera.position);
      this.lastCamZoom = this.camera.zoom;
    }
    return moved;
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    this.controls.update();
    this.updateFly(dt);

    if (this.arrays && (this.cameraMoved() || this.needsRefresh)) {
      this.needsRefresh = false;
      this.camera.updateMatrixWorld();
      this.projScreen.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.projScreen);
      this.statsVisible = this.arrays.cullAndLod(this.camera, this.frustum);
      this.fillInstances();
      this.sortTransparent();
    }

    // FPS：每 20 帧上报一次，相机移动只更新可见数、不把 FPS 冲成 0
    this.fpsFrames++;
    this.fpsAcc += now - this.fpsLast;
    this.fpsLast = now;
    if (this.fpsFrames >= 20) {
      this.lastFps = Math.round(1000 / (this.fpsAcc / this.fpsFrames));
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }
    if (this.arrays) {
      this.callbacks.onStats?.(this.statsVisible, this.arrays.count, this.lastFps);
    }

    this.renderer.render(this.scene, this.camera);
  };

  // ------------------------------------------------ 实例矩阵：按类型构建

  private fillInstances() {
    const a = this.arrays;
    for (const pm of this.partMeshes) {
      const { arr, count } = a.listFor(pm.typeIndex, pm.lod);
      pm.mesh.count = count;
      if (count === 0) continue;
      const type = TYPE_ORDER[pm.typeIndex];
      for (let k = 0; k < count; k++) {
        const i = arr[k];
        this.buildMatrix(type, pm.lod, pm.part, i);
        pm.mesh.setMatrixAt(k, this.m4);
        this.color.setRGB(a.colors[i * 3], a.colors[i * 3 + 1], a.colors[i * 3 + 2]);
        pm.mesh.setColorAt(k, this.color);
      }
      pm.mesh.instanceMatrix.needsUpdate = true;
      if (pm.mesh.instanceColor) pm.mesh.instanceColor.needsUpdate = true;
    }
  }

  private buildMatrix(type: Feature['type'], lod: LodLevel, part: number, i: number) {
    const a = this.arrays;
    const x = a.x[i];
    const y = a.y[i];
    const z = a.z[i];
    const r = a.radius[i];
    const d = a.depth[i];
    const heading = a.heading[i];

    switch (type) {
      case 'cage':
        if (lod === 0 && part === 0) {
          this.composeBox(i, 1.15);
          return;
        }
        if (part === 0) {
          // 网衣圆柱
          this.q.setFromAxisAngle(UP, heading);
          this.v.set(x, y, z);
          this.s.set(r, d, r);
          this.m4.compose(this.v, this.q, this.s);
          return;
        }
        if (part === 1) {
          // 顶部浮圈
          this.q.setFromAxisAngle(UP, heading);
          this.v.set(x, y + 0.5, z);
          this.s.set(r * 1.05, r * 1.05, r * 1.05);
          this.m4.compose(this.v, this.q, this.s);
          return;
        }
        // part 2：底圈
        this.q.setFromAxisAngle(UP, heading);
        this.v.set(x, y - d, z);
        this.s.set(r, r, r);
        this.m4.compose(this.v, this.q, this.s);
        return;

      case 'buoy':
        if (lod === 0 && part === 0) {
          this.composeBox(i, 1.25);
          return;
        }
        if (lod === 1) {
          this.q.identity();
          this.v.set(x, y + r, z);
          this.s.set(r, r, r);
          this.m4.compose(this.v, this.q, this.s);
          return;
        }
        if (part === 0) {
          this.q.identity();
          this.v.set(x, y + r, z);
          this.s.set(r, r, r);
          this.m4.compose(this.v, this.q, this.s);
        } else {
          // 桅杆
          this.q.identity();
          this.v.set(x, y + r * 2, z);
          this.s.set(r * 0.35, r * 1.6, r * 0.35);
          this.m4.compose(this.v, this.q, this.s);
        }
        return;

      case 'chain': {
        if (lod === 0 && part === 0) {
          this.composeBox(i, 1.05);
          return;
        }
        // 从水面浮点 (x,y,z) 到锚点 (x+ex, y-depth, z+ez) 的圆柱
        this.v2.set(x + a.ex[i], y - d, z + a.ez[i]);
        this.v.set(x, y, z);
        const dir = this.v2.clone().sub(this.v);
        const len = dir.length();
        this.q.setFromUnitVectors(UP, dir.normalize());
        this.v.copy(this.v2).add(this.v).multiplyScalar(0.5);
        this.s.set(0.35, len, 0.35);
        this.m4.compose(this.v, this.q, this.s);
        return;
      }

      case 'marker': {
        if (lod === 0 && part === 0) {
          this.composeBox(i, 1.2);
          return;
        }
        const h = d + r * 1.6;
        if (part === 0) {
          // 桩身
          this.q.identity();
          this.v.set(x, y + h / 2, z);
          this.s.set(r * 0.5, h, r * 0.5);
          this.m4.compose(this.v, this.q, this.s);
          return;
        }
        if (part === 1) {
          // 顶锥
          this.q.identity();
          this.v.set(x, y + h + r * 0.6, z);
          this.s.set(r, r * 1.2, r);
          this.m4.compose(this.v, this.q, this.s);
          return;
        }
        // 顶灯球
        this.q.identity();
        this.v.set(x, y + h + r * 1.5, z);
        this.s.set(r * 0.7, r * 0.7, r * 0.7);
        this.m4.compose(this.v, this.q, this.s);
        return;
      }

      case 'warningZone': {
        if (lod === 0 && part === 0) {
          this.composeBox(i, 1.02);
          return;
        }
        if (lod === 1) {
          this.q.identity();
          this.v.set(x, y, z);
          this.s.set(r, d, r);
          this.m4.compose(this.v, this.q, this.s);
          return;
        }
        if (part === 0) {
          // 完整壁面
          this.q.identity();
          this.v.set(x, y, z);
          this.s.set(r, d, r);
          this.m4.compose(this.v, this.q, this.s);
        } else if (part === 1) {
          this.q.identity();
          this.v.set(x, y + 0.5, z);
          this.s.set(r, r, r);
          this.m4.compose(this.v, this.q, this.s);
        } else {
          this.q.identity();
          this.v.set(x, y - d, z);
          this.s.set(r, r, r);
          this.m4.compose(this.v, this.q, this.s);
        }
        return;
      }

      case 'channel': {
        if (lod === 0 && part === 0) {
          this.composeBox(i, 1.02);
          return;
        }
        const hx = a.sx[i] || r;
        const hz = a.sz[i] || r;
        if (part === 0) {
          // 水面平面
          this.q.identity();
          this.v.set(x, y + 0.2, z);
          this.s.set(hx * 2, 1, hz * 2);
          this.m4.compose(this.v, this.q, this.s);
          return;
        }
        // 两侧边线（细长盒）
        const side = part === 1 ? -1 : 1;
        this.q.setFromAxisAngle(UP, heading);
        this.v.set(x, y + 0.4, z + side * hz);
        this.s.set(hx * 2, 0.6, 1.2);
        this.m4.compose(this.v, this.q, this.s);
        return;
      }
    }
  }

  /** LOD0 包围盒：直接用预计算包围盒缩放单位盒 */
  private composeBox(i: number, grow: number) {
    const a = this.arrays;
    this.q.identity();
    this.v.set(
      (a.bMinX[i] + a.bMaxX[i]) / 2,
      (a.bMinY[i] + a.bMaxY[i]) / 2,
      (a.bMinZ[i] + a.bMaxZ[i]) / 2
    );
    this.s.set(
      (a.bMaxX[i] - a.bMinX[i]) * grow,
      (a.bMaxY[i] - a.bMinY[i]) * grow,
      (a.bMaxZ[i] - a.bMinZ[i]) * grow
    );
    this.m4.compose(this.v, this.q, this.s);
  }

  /**
   * 半透明桶按相机距离背向→前向排序：
   * 透明物体不写深度，靠渲染顺序保证网衣不串色。
   */
  private sortTransparent() {
    this.sortList.length = 0;
    const cam = this.camera.position;
    for (const pm of this.partMeshes) {
      if (!pm.transparent || pm.mesh.count === 0) continue;
      const { arr, count } = this.arrays.listFor(pm.typeIndex, pm.lod);
      let sumD = 0;
      for (let k = 0; k < count; k++) {
        const i = arr[k];
        const dx = this.arrays.x[i] - cam.x;
        const dy = this.arrays.cyCenter[i] - cam.y;
        const dz = this.arrays.z[i] - cam.z;
        sumD += dx * dx + dy * dy + dz * dz;
      }
      this.sortList.push({ mesh: pm.mesh, d: sumD / count });
    }
    this.sortList.sort((a, b) => b.d - a.d);
    // 同类 renderOrder 相同，three 按加入顺序渲染；这里直接给递增顺序值
    let order = RENDER_ORDER.net;
    for (const item of this.sortList) {
      item.mesh.renderOrder = order++;
    }
  }

  // ---------------------------------------------------------------- 销毁

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('dblclick', this.onDblClick);
    el.removeEventListener('contextmenu', this.onContext);
    this.controls.dispose();
    for (const pm of this.partMeshes) pm.mesh.dispose();
    this.highlightMesh.dispose();
    this.renderer.dispose();
    el.remove();
  }
}
