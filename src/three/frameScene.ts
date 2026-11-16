import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LightMode, MaterialKey, Pt } from '../types';
import { multiPolygonToShapes, patternBounds } from '../geometry/boolean';
import type { MultiPolygon } from 'polygon-clipping';
import { createFrameMaterial, createPanelMaterial } from './materials';
import { createLightRig, type LightRig } from './lights';

const SNAP_TOL = 25; // mm

/** 清空 Group 并释放几何体/材质 */
function clearGroup(g: THREE.Group) {
  g.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.Line ||
      obj instanceof THREE.Points
    ) {
      obj.geometry?.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    }
  });
  g.clear();
}

export interface SnapGuide {
  axis: 'x' | 'y';
  at: number;
}

/**
 * 装配预览场景: 门框(立柱+横档) + 可拖动花板。
 * 拖动花板时与立柱内侧面、横档中线自动对齐并显示参考线。
 */
export class AssemblyScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private frameGroup = new THREE.Group();
  private panelGroup = new THREE.Group();
  private guideGroup = new THREE.Group();
  private lightRig: LightRig;
  private raf = 0;
  private ro: ResizeObserver;
  private openingW = 3000;
  private openingH = 2200;
  private dragging = false;
  private dragOffset = new THREE.Vector2();
  private panelSize = { w: 0, h: 0 };
  onSnap: (guides: SnapGuide[]) => void = () => {};
  onPanelMove: (pos: Pt) => void = () => {};

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x2a2d33);
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 30000);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // 地面与背景墙
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20000, 12000),
      new THREE.MeshStandardMaterial({ color: 0x55524a, roughness: 0.98 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(20000, 8000),
      new THREE.MeshStandardMaterial({ color: 0x7e786c, roughness: 0.95 }),
    );
    wall.position.set(0, 4000, -900);
    wall.receiveShadow = true;
    this.scene.add(wall);

    this.lightRig = createLightRig(new THREE.Vector3(0, 1200, 0));
    this.scene.add(this.lightRig.group);
    this.scene.add(this.frameGroup, this.panelGroup, this.guideGroup);

    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.handleDown);
    el.addEventListener('pointermove', this.handleMove);
    el.addEventListener('pointerup', this.handleUp);
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

  /** 按洞口尺寸重建门框: 两根立柱 + 上/中/下横档 */
  buildFrame(openingW: number, openingH: number) {
    this.openingW = openingW;
    this.openingH = openingH;
    clearGroup(this.frameGroup);
    const mat = createFrameMaterial();
    const postW = 100;
    const postH = openingH + 300;

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(postW, postH, postW),
        mat,
      );
      post.position.set(
        side * (openingW / 2 + postW / 2),
        postH / 2 - 150,
        0,
      );
      post.castShadow = post.receiveShadow = true;
      this.frameGroup.add(post);
    }
    const railH = 90;
    const railYs = [railH / 2, openingH / 2, openingH - railH / 2];
    for (const y of railYs) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(openingW, railH, 70),
        mat,
      );
      rail.position.set(0, y, 0);
      rail.castShadow = rail.receiveShadow = true;
      this.frameGroup.add(rail);
    }

    this.camera.position.set(0, openingH * 0.55, Math.max(openingW, openingH) * 1.5);
    this.controls.target.set(0, openingH / 2, 0);
    this.controls.update();
  }

  /** 设置/替换花板 */
  setPanel(
    mp: MultiPolygon,
    thickness: number,
    material: MaterialKey,
    pos: Pt,
  ) {
    clearGroup(this.panelGroup);
    const shapes = multiPolygonToShapes(mp);
    const bounds = patternBounds(mp);
    if (shapes.length === 0 || !bounds) {
      this.panelSize = { w: 0, h: 0 };
      return;
    }
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 8,
    });
    const mesh = new THREE.Mesh(geo, createPanelMaterial(material));
    mesh.castShadow = mesh.receiveShadow = true;
    // 让花板局部坐标以包围盒中心为原点
    geo.translate(
      -(bounds.min.x + bounds.max.x) / 2,
      -(bounds.min.y + bounds.max.y) / 2,
      -thickness / 2,
    );
    this.panelSize = {
      w: bounds.max.x - bounds.min.x,
      h: bounds.max.y - bounds.min.y,
    };
    this.panelGroup.add(mesh);
    this.panelGroup.position.set(pos.x, pos.y, 0);
  }

  panelPos(): Pt {
    return { x: this.panelGroup.position.x, y: this.panelGroup.position.y };
  }

  private pointerOnPlane(e: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.panelGroup.children, true);
    if (hits.length > 0) return hits[0].point;
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const out = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, out) ? out : null;
  }

  private handleDown = (e: PointerEvent) => {
    if (e.button !== 0 || this.panelGroup.children.length === 0) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.panelGroup.children, true);
    if (hits.length === 0) return;
    this.dragging = true;
    this.controls.enabled = false;
    this.dragOffset.set(
      hits[0].point.x - this.panelGroup.position.x,
      hits[0].point.y - this.panelGroup.position.y,
    );
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  private handleMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const p = this.pointerOnPlane(e);
    if (!p) return;
    let nx = p.x - this.dragOffset.x;
    let ny = p.y - this.dragOffset.y;

    // 与立柱内侧面、横档中线对齐吸附
    const guides: SnapGuide[] = [];
    const halfW = this.panelSize.w / 2;
    const halfH = this.panelSize.h / 2;
    const xTargets = [
      -this.openingW / 2 + halfW, // 左边贴左立柱内侧面
      0, // 水平居中
      this.openingW / 2 - halfW, // 右边贴右立柱内侧面
    ];
    const railMid = [45, this.openingH / 2, this.openingH - 45];
    const yTargets = railMid.flatMap((c) => [c - halfH, c, c + halfH]);
    yTargets.push(this.openingH / 2); // 垂直居中

    for (const t of xTargets) {
      if (Math.abs(nx - t) < SNAP_TOL) {
        nx = t;
        guides.push({ axis: 'x', at: t });
        break;
      }
    }
    for (const t of yTargets) {
      if (Math.abs(ny - t) < SNAP_TOL) {
        ny = t;
        guides.push({ axis: 'y', at: t });
        break;
      }
    }
    this.panelGroup.position.set(nx, ny, 0);
    this.drawGuides(guides);
    this.onSnap(guides);
  };

  private handleUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.controls.enabled = true;
    this.onPanelMove(this.panelPos());
  };

  private drawGuides(guides: SnapGuide[]) {
    clearGroup(this.guideGroup);
    const mat = new THREE.LineDashedMaterial({
      color: 0x00e5ff,
      dashSize: 60,
      gapSize: 30,
      depthTest: false,
    });
    for (const g of guides) {
      let pts: THREE.Vector3[];
      if (g.axis === 'x') {
        pts = [
          new THREE.Vector3(g.at, -100, 60),
          new THREE.Vector3(g.at, this.openingH + 100, 60),
        ];
      } else {
        pts = [
          new THREE.Vector3(-this.openingW / 2 - 100, g.at, 60),
          new THREE.Vector3(this.openingW / 2 + 100, g.at, 60),
        ];
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        mat,
      );
      line.computeLineDistances();
      line.renderOrder = 50;
      this.guideGroup.add(line);
    }
  }

  setLightMode(mode: LightMode) {
    this.lightRig.setMode(mode);
  }

  /** 导出当前视角装配效果图 PNG */
  exportPng(filename: string) {
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
