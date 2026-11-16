import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Contour, LightMode, MaterialKey, Pt } from '../types';
import type { ContourIssue } from '../geometry/validate';
import { contourSegments } from '../geometry/validate';
import { multiPolygonToShapes } from '../geometry/boolean';
import type { MultiPolygon } from 'polygon-clipping';
import { createPanelMaterial } from './materials';
import { createLightRig, type LightRig } from './lights';
import type { SnapKind } from '../geometry/snap';

export const DESIGN_HALF = 700; // 设计区半宽 mm (1400×1400)

/** 清空 Group 并释放几何体/材质 */
function clearGroup(g: THREE.Group) {
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry?.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    }
  });
  g.clear();
}

const SNAP_COLORS: Record<SnapKind, number> = {
  endpoint: 0x00e5ff,
  midpoint: 0xffc107,
  edge: 0x7cff6b,
  grid: 0xffffff,
  none: 0xffffff,
};

export class EditorScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private gridGroup = new THREE.Group();
  private drawLayer = new THREE.Group();
  private solidGroup = new THREE.Group();
  private snapMarker: THREE.Mesh;
  private lightRig: LightRig;
  private raf = 0;
  private ro: ResizeObserver;
  private downPos: { x: number; y: number } | null = null;

  onPlaneClick: (pt: Pt) => void = () => {};
  onPlaneMove: (pt: Pt) => void = () => {};

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x23262b);
    this.scene.fog = new THREE.Fog(0x23262b, 5000, 12000);

    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);
    this.camera.position.set(0, 0, 2100);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    // 左键平移 / 中键缩放 / 右键旋转,左键单击留给绘制
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    // 背墙与地台,承接镂空投影
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 4000),
      new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.95 }),
    );
    wall.position.set(0, 0, -700);
    wall.receiveShadow = true;
    this.scene.add(wall);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 3000),
      new THREE.MeshStandardMaterial({ color: 0x5b584f, roughness: 0.98 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -DESIGN_HALF - 2, 300);
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.lightRig = createLightRig(new THREE.Vector3(0, 0, 0));
    this.scene.add(this.lightRig.group);

    this.scene.add(this.gridGroup, this.drawLayer, this.solidGroup);

    // 吸附指示环
    this.snapMarker = new THREE.Mesh(
      new THREE.RingGeometry(6, 9, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.snapMarker.renderOrder = 999;
    this.snapMarker.visible = false;
    this.scene.add(this.snapMarker);

    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.handleDown);
    el.addEventListener('pointerup', this.handleUp);
    el.addEventListener('pointermove', this.handleMove);
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.loop();
  }

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private toPlane(e: PointerEvent): Pt | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const out = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.plane, out)) return null;
    return { x: out.x, y: out.y };
  }

  private handleDown = (e: PointerEvent) => {
    if (e.button === 0) this.downPos = { x: e.clientX, y: e.clientY };
  };

  private handleUp = (e: PointerEvent) => {
    if (e.button !== 0 || !this.downPos) return;
    const moved = Math.hypot(
      e.clientX - this.downPos.x,
      e.clientY - this.downPos.y,
    );
    this.downPos = null;
    if (moved > 5) return; // 拖动视为平移,不绘制
    const pt = this.toPlane(e);
    if (pt) this.onPlaneClick(pt);
  };

  private handleMove = (e: PointerEvent) => {
    const pt = this.toPlane(e);
    if (pt) this.onPlaneMove(pt);
  };

  /** 重建网格: 细线 = 吸附间距, 粗线 = 10倍间距 */
  setGrid(spacing: number) {
    clearGroup(this.gridGroup);
    const half = DESIGN_HALF;
    const mkLines = (step: number, color: number, opacity: number) => {
      const verts: number[] = [];
      for (let x = -half; x <= half + 1e-6; x += step) {
        verts.push(x, -half, -1, x, half, -1);
      }
      for (let y = -half; y <= half + 1e-6; y += step) {
        verts.push(-half, y, -1, half, y, -1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(verts, 3),
      );
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
      });
      this.gridGroup.add(new THREE.LineSegments(geo, mat));
    };
    mkLines(spacing, 0x4a4f57, 0.5);
    mkLines(spacing * 10, 0x6b7280, 0.85);
    // 设计区边框
    const border = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-half, -half, -1),
        new THREE.Vector3(half, -half, -1),
        new THREE.Vector3(half, half, -1),
        new THREE.Vector3(-half, half, -1),
      ]),
      new THREE.LineBasicMaterial({ color: 0x9aa4b2 }),
    );
    this.gridGroup.add(border);
  }

  setLightMode(mode: LightMode) {
    this.lightRig.setMode(mode);
  }

  setSnapMarker(pt: Pt | null, kind: SnapKind = 'none') {
    if (!pt) {
      this.snapMarker.visible = false;
      return;
    }
    this.snapMarker.visible = true;
    this.snapMarker.position.set(pt.x, pt.y, 2);
    (this.snapMarker.material as THREE.MeshBasicMaterial).color.setHex(
      SNAP_COLORS[kind],
    );
  }

  /** 重绘轮廓线、顶点、错误段与正在绘制的草稿 */
  updateDrawing(
    contours: Contour[],
    issues: Map<string, ContourIssue[]>,
    draft: Pt[],
    cursor: Pt | null,
    thickness: number,
  ) {
    clearGroup(this.drawLayer);
    const zLine = Math.max(thickness, 2) + 2;

    for (const c of contours) {
      const bad = (issues.get(c.id) ?? []).length > 0;
      const color = bad ? 0xff3b30 : 0x4da3ff;
      const pts3 = c.points.map((p) => new THREE.Vector3(p.x, p.y, zLine));
      if (pts3.length >= 2) {
        const geo = new THREE.BufferGeometry().setFromPoints(pts3);
        const line = c.closed
          ? new THREE.LineLoop(
              geo,
              new THREE.LineBasicMaterial({ color, depthTest: false }),
            )
          : new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({ color, depthTest: false }),
            );
        line.renderOrder = 100;
        this.drawLayer.add(line);
      }
      // 顶点
      if (pts3.length > 0) {
        const geo = new THREE.BufferGeometry().setFromPoints(pts3);
        const pts = new THREE.Points(
          geo,
          new THREE.PointsMaterial({
            color,
            size: 7,
            sizeAttenuation: false,
            depthTest: false,
          }),
        );
        pts.renderOrder = 101;
        this.drawLayer.add(pts);
      }
      // 自交错误段标红加粗(用短划线强调)
      const iss = issues.get(c.id) ?? [];
      const segs = contourSegments(c);
      for (const issue of iss) {
        if (issue.type !== 'self-intersect') continue;
        for (const idx of [issue.segA, issue.segB]) {
          if (idx === undefined || !segs[idx]) continue;
          const [a, b] = segs[idx];
          const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(a.x, a.y, zLine + 1),
            new THREE.Vector3(b.x, b.y, zLine + 1),
          ]);
          const line = new THREE.Line(
            geo,
            new THREE.LineDashedMaterial({
              color: 0xff3b30,
              dashSize: 12,
              gapSize: 6,
              depthTest: false,
            }),
          );
          line.computeLineDistances();
          line.renderOrder = 102;
          this.drawLayer.add(line);
        }
      }
    }

    // 草稿(正在绘制的轮廓) + 橡皮筋
    if (draft.length > 0) {
      const pts3 = draft.map((p) => new THREE.Vector3(p.x, p.y, zLine));
      if (cursor) pts3.push(new THREE.Vector3(cursor.x, cursor.y, zLine));
      if (pts3.length >= 2) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts3),
          new THREE.LineBasicMaterial({ color: 0xffe082, depthTest: false }),
        );
        line.renderOrder = 100;
        this.drawLayer.add(line);
      }
      const dots = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints(
          draft.map((p) => new THREE.Vector3(p.x, p.y, zLine)),
        ),
        new THREE.PointsMaterial({
          color: 0xffe082,
          size: 7,
          sizeAttenuation: false,
          depthTest: false,
        }),
      );
      dots.renderOrder = 101;
      this.drawLayer.add(dots);
    }
  }

  /** 更新挤出实体 */
  updateSolid(mp: MultiPolygon, thickness: number, material: MaterialKey) {
    clearGroup(this.solidGroup);
    const shapes = multiPolygonToShapes(mp);
    if (shapes.length === 0) return;
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 8,
    });
    const mesh = new THREE.Mesh(geo, createPanelMaterial(material));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.solidGroup.add(mesh);
  }

  resetCamera() {
    this.camera.position.set(0, 0, 2100);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
