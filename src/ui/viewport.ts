import { BaseElement, define } from './base';
import { OrbitCamera } from '../render/camera';
import { VoxelRenderer, voxelBox, type Box as RenderBox } from '../render/renderer';
import { raycast, intersectPlaneY, intersectBox, type RayHit } from '../core/picker';
import { layerAtY } from '../core/layers';
import { EditorModel } from '../state/editor';
import { h } from './dom';

type DragMode = 'none' | 'orbit' | 'pan' | 'paint' | 'erase' | 'hide' | 'marquee';

const CSS = `
:host { position: relative; display: block; width: 100%; height: 100%; overflow: hidden; background: #0f1114; }
canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
.hud {
  position: absolute; pointer-events: none; user-select: none;
  font-family: var(--mono); font-size: 11px; color: #cfd3d8;
}
.top-left { top: 10px; left: 12px; display: flex; flex-direction: column; gap: 4px; }
.bottom-left { bottom: 10px; left: 12px; }
.bottom-right { bottom: 10px; right: 12px; text-align: right; }
.chip {
  background: rgba(15,17,20,.72); border: 1px solid #2c323a; border-radius: 5px;
  padding: 3px 7px; backdrop-filter: blur(6px);
}
.hint {
  position: absolute; left: 50%; top: 12px; transform: translateX(-50%);
  background: rgba(15,17,20,.82); border: 1px solid #333a43; color: #cfd3d8;
  border-radius: 6px; padding: 5px 12px; font-size: 11px; pointer-events: none;
  opacity: 0; transition: opacity .2s;
}
.hint.show { opacity: 1; }
.crosshair {
  position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px;
  pointer-events: none; opacity: 0;
}
.crosshair::before, .crosshair::after {
  content: ''; position: absolute; background: rgba(240,200,120,.9);
}
.crosshair::before { left: 5px; top: 0; width: 2px; height: 12px; }
.crosshair::after { top: 5px; left: 0; height: 2px; width: 12px; }
.axis {
  position: absolute; right: 13px; top: 12px; width: 62px; height: 62px;
  pointer-events: none;
}
.fail {
  position: absolute; inset: 0; display: none; place-content: center; padding: 30px;
  text-align: center; color: #f0a8b5; background: #170f12; font-size: 13px; line-height: 1.8;
}
.fail.show { display: grid; }
`;

export class VoxelViewport extends BaseElement {
  private canvas!: HTMLCanvasElement;
  private renderer: VoxelRenderer | null = null;
  private camera = new OrbitCamera();
  private model: EditorModel | null = null;
  private drag: DragMode = 'none';
  private lastPointer = { x: 0, y: 0 };
  private pointerDownAt = { x: 0, y: 0, t: 0 };
  private movedEnough = false;
  private marqueeAnchor: { x: number; y: number; z: number } | null = null;
  private marqueeYRange: { y0: number; y1: number } | null = null;
  private needsRender = true;
  private raf = 0;
  private unsubscribe: (() => void) | null = null;
  private lastMeshTick = -1;
  private lastSelectionTick = -1;
  private hintEl!: HTMLElement;
  private hudEl!: HTMLElement;
  private cross!: HTMLElement;
  private error: string | null = null;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);
    this.canvas = h('canvas', { tabindex: '0' });
    this.hintEl = h('div', { class: 'hint' });
    this.hudEl = h('div', { class: 'hud bottom-left' });
    this.cross = h('div', { class: 'crosshair' });
    const fail = h('div', { class: 'fail' });
    this.root.append(this.canvas, this.hintEl, this.hudEl, this.cross, fail);
    try {
      this.renderer = new VoxelRenderer(this.canvas);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error = msg;
      fail.textContent = '三维视图初始化失败：' + msg;
      fail.classList.add('show');
      return;
    }
    this.bind();
    this.loop();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.observeResize();
  }

  override disconnectedCallback(): void {
    cancelAnimationFrame(this.raf);
    this.unsubscribe?.();
    this.renderer?.dispose();
    this.renderer = null;
    this.resizeObserver?.disconnect();
    super.disconnectedCallback();
  }

  private resizeObserver: ResizeObserver | null = null;
  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => {
      this.renderer?.resize();
      this.needsRender = true;
    });
    this.resizeObserver.observe(this.canvas);
  }

  get glError(): string | null {
    return this.error;
  }

  attach(model: EditorModel): void {
    this.unsubscribe?.();
    this.model = model;
    let lastLayer = model.currentLayerIndex;
    let lastDimsKey = `${model.dims.nx}x${model.dims.ny}x${model.dims.nz}:${model.layers.length}`;
    this.unsubscribe = model.subscribe(() => {
      this.needsRender = true;
      // 切换到另一层时把视线带到该层，否则深层会被上层挡住、无从下手
      const dimsKey = `${model.dims.nx}x${model.dims.ny}x${model.dims.nz}:${model.layers.length}`;
      if (dimsKey !== lastDimsKey) {
        lastDimsKey = dimsKey;
        this.applyDims();
        this.camera.frame(model.dims.nx, model.dims.ny, model.dims.nz);
        lastLayer = model.currentLayerIndex;
        return;
      }
      if (model.currentLayerIndex !== lastLayer) {
        lastLayer = model.currentLayerIndex;
        const l = model.currentLayer;
        this.camera.focusLayer(l.start, l.rows, model.dims.nx, model.dims.ny, model.dims.nz);
      }
    });
    this.applyDims();
    this.camera.frame(model.dims.nx, model.dims.ny, model.dims.nz);
    this.needsRender = true;
  }

  private applyDims(): void {
    if (!this.model || !this.renderer) return;
    this.renderer.setDims(this.model.dims);
    this.renderer.resize();
  }

  /** 供测试与工具栏调用 */
  setView(preset: 'iso' | 'front' | 'top' | 'side'): void {
    if (!this.model) return;
    const { nx, ny, nz } = this.model.dims;
    this.camera.frame(nx, ny, nz);
    if (preset === 'front') {
      this.camera.yaw = 0;
      this.camera.pitch = 0.12;
    } else if (preset === 'top') {
      this.camera.yaw = 0;
      this.camera.pitch = 1.44;
    } else if (preset === 'side') {
      this.camera.yaw = -Math.PI / 2;
      this.camera.pitch = 0.1;
    } else {
      this.camera.yaw = -0.72;
      this.camera.pitch = 0.58;
    }
    this.needsRender = true;
  }

  focusAll(): void {
    if (!this.model) return;
    this.camera.frame(this.model.dims.nx, this.model.dims.ny, this.model.dims.nz);
    this.needsRender = true;
  }

  // ── 事件绑定 ──
  private bind(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    c.addEventListener('pointermove', (e) => this.onPointerMove(e));
    c.addEventListener('pointerup', (e) => this.onPointerUp(e));
    c.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    c.addEventListener('pointerleave', () => {
      this.model?.setHover(null);
      this.cross.style.opacity = '0';
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.zoom(e.deltaY);
      this.needsRender = true;
    }, { passive: false });
    c.addEventListener('dblclick', () => this.focusAll());
  }

  private canvasRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  private rayAt(e: PointerEvent | MouseEvent): { origin: { x: number; y: number; z: number }; dir: { x: number; y: number; z: number }; ndcX: number; ndcY: number } {
    const rect = this.canvasRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const ray = this.camera.rayFromScreen(px, py, rect.width, rect.height);
    return { ...ray, ndcX: px, ndcY: py };
  }

  private pick(e: PointerEvent | MouseEvent): RayHit | null {
    if (!this.model) return null;
    const { origin, dir } = this.rayAt(e);
    return raycast(this.model.grid, origin, dir, (x, y, z) => this.model!.isPickable(x, y, z));
  }

  /** 空处落点：当前层范围内、射线最先进入的格子 */
  private pickPlane(e: PointerEvent | MouseEvent): { x: number; z: number } | null {
    if (!this.model) return null;
    const m = this.model;
    const { origin, dir } = this.rayAt(e);
    const layer = m.currentLayer;
    const topY = layer.start + layer.rows;

    // 优先与层顶面求交（俯视落块最自然）
    if (dir.y < -1e-6) {
      const hit = intersectPlaneY(origin, dir, topY);
      if (hit) {
        const x = Math.floor(hit.x);
        const z = Math.floor(hit.z);
        if (x >= 0 && z >= 0 && x < m.dims.nx && z < m.dims.nz) return { x, z };
      }
    }
    // 否则取射线进入“当前层薄盒”的位置
    const box = intersectBox(
      origin,
      dir,
      { x: 0, y: layer.start, z: 0 },
      { x: m.dims.nx, y: topY, z: m.dims.nz },
    );
    if (!box) return null;
    const px = origin.x + dir.x * box.tEnter;
    const pz = origin.z + dir.z * box.tEnter;
    const x = Math.min(m.dims.nx - 1, Math.max(0, Math.floor(px)));
    const z = Math.min(m.dims.nz - 1, Math.max(0, Math.floor(pz)));
    return { x, z };
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.model || !this.renderer) return;
    this.canvas.focus();
    this.canvas.setPointerCapture(e.pointerId);
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.pointerDownAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.movedEnough = false;
    const m = this.model;
    const alt = e.altKey;
    const middle = e.button === 1;
    const right = e.button === 2;
    const shift = e.shiftKey;

    if (middle || right || alt) {
      this.drag = shift ? 'pan' : 'orbit';
      return;
    }
    if (e.button !== 0) return;

    if (m.tool === 'orbit') {
      this.drag = shift ? 'pan' : 'orbit';
      return;
    }
    if (m.tool === 'select') {
      const hit = this.pick(e);
      const cell = hit ? { x: hit.x, z: hit.z } : this.pickPlane(e);
      if (!cell) {
        this.drag = 'orbit';
        return;
      }
      this.drag = 'marquee';
      this.marqueeAnchor = {
        x: cell.x,
        y: hit ? hit.y : m.currentLayer.start,
        z: cell.z,
      };
      this.marqueeYRange = null;
      this.updateMarquee(e, shift);
      return;
    }

    // 绘制类工具
    const hit = this.pick(e);
    m.beginStroke(m.tool === 'erase' ? '擦除' : m.tool === 'hide' ? '隐藏/显示体素' : '放置体素');
    if (m.tool === 'place') {
      this.drag = 'paint';
      // 单击也按列落位：命中实体时落在其上方，空格落在当前层顶部
      const startCell = this.pickPlane(e);
      if (startCell) {
        this.lastPaintCell = startCell;
        const placed = m.placeColumn(startCell.x, startCell.z);
        if (!placed && this.layerColumnFull(startCell.x, startCell.z)) {
          this.showHint(`第 ${m.currentLayerIndex + 1} 层此列已填满，换一层或先用「擦除」腾出空间`);
        }
      }
    } else if (m.tool === 'erase') {
      this.drag = 'erase';
      if (hit) m.erase(hit);
    } else if (m.tool === 'hide') {
      this.drag = 'hide';
      if (hit) m.toggleHiddenAt(hit);
    } else if (m.tool === 'eyedrop') {
      m.pickMaterial(hit);
      this.drag = 'none';
      m.endStroke();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.model || !this.renderer) return;
    const m = this.model;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    if (this.drag === 'none') {
      this.updateHover(e);
      return;
    }
    if (Math.abs(e.clientX - this.pointerDownAt.x) > 2 || Math.abs(e.clientY - this.pointerDownAt.y) > 2) {
      this.movedEnough = true;
    }
    this.lastPointer = { x: e.clientX, y: e.clientY };

    if (this.drag === 'orbit') {
      this.camera.orbit(dx, dy);
      this.needsRender = true;
      return;
    }
    if (this.drag === 'pan') {
      this.camera.pan(dx, dy, this.canvasRect().height);
      this.needsRender = true;
      return;
    }
    if (this.drag === 'marquee') {
      this.updateMarquee(e, e.shiftKey);
      return;
    }
    if (this.drag === 'paint' || this.drag === 'erase' || this.drag === 'hide') {
      if (this.drag === 'paint') {
        // 拖拽绘制：按列填充当前层，避免射线总是命中刚放下的那一格
        const plane = this.pickPlane(e);
        if (plane && (plane.x !== this.lastPaintCell?.x || plane.z !== this.lastPaintCell?.z)) {
          this.lastPaintCell = plane;
          m.placeColumn(plane.x, plane.z);
        }
      } else {
        const hit = this.pick(e);
        if (hit) {
          const same =
            m.hover &&
            m.hover.x === hit.x &&
            m.hover.y === hit.y &&
            m.hover.z === hit.z;
          if (!same) {
            if (this.drag === 'erase') m.erase(hit);
            else m.toggleHiddenAt(hit);
          }
        }
      }
      this.updateHover(e);
    }
  }
  private lastPaintCell: { x: number; z: number } | null = null;

  private layerColumnFull(x: number, z: number): boolean {
    if (!this.model) return false;
    const layer = this.model.currentLayer;
    for (let y = layer.start; y < layer.start + layer.rows; y++) {
      if (!this.model.grid.materialAt(x, y, z)) return false;
    }
    return true;
  }

  private updateHover(e: PointerEvent): void {
    if (!this.model) return;
    const hit = this.pick(e);
    this.model.setHover(hit);
    if (hit) {
      const rect = this.canvasRect();
      this.cross.style.opacity = '1';
      this.cross.style.left = `${e.clientX - rect.left}px`;
      this.cross.style.top = `${e.clientY - rect.top}px`;
    } else {
      this.cross.style.opacity = '0';
    }
    this.needsRender = true;
  }

  private updateMarquee(e: PointerEvent, acrossLayers: boolean): void {
    if (!this.model || !this.marqueeAnchor) return;
    const hit = this.pick(e);
    const cell = hit ? { x: hit.x, z: hit.z } : this.pickPlane(e);
    const target = cell ?? { x: this.marqueeAnchor.x, z: this.marqueeAnchor.z };
    const a = this.marqueeAnchor;
    const layer = this.model.currentLayer;
    let y0 = layer.start;
    let y1 = layer.start + layer.rows - 1;
    if (acrossLayers && hit) {
      y0 = Math.min(a.y, hit.y);
      y1 = Math.max(a.y, hit.y);
    }
    this.marqueeYRange = { y0, y1 };
    this.model.setSelection({
      x0: Math.min(a.x, target.x),
      x1: Math.max(a.x, target.x),
      z0: Math.min(a.z, target.z),
      z1: Math.max(a.z, target.z),
      y0,
      y1,
    });
    this.needsRender = true;
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.model) return;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (this.drag === 'paint' || this.drag === 'erase' || this.drag === 'hide') {
      this.model.endStroke();
      this.emit('edit-commit');
    }
    if (this.drag === 'marquee') {
      const box = this.model.selection;
      if (box) {
        const volume = (box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1) * (box.z1 - box.z0 + 1);
        this.showHint(`已框选 ${volume} 格（${box.x1 - box.x0 + 1}×${box.y1 - box.y0 + 1}×${box.z1 - box.z0 + 1}）`);
      }
    }
    this.drag = 'none';
    this.marqueeAnchor = null;
    this.needsRender = true;
  }

  private showHint(text: string): void {
    this.hintEl.textContent = text;
    this.hintEl.classList.add('show');
    if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hintEl.classList.remove('show'), 2200);
  }
  private hintTimer: ReturnType<typeof setTimeout> | null = null;

  // ── 渲染循环 ──
  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.renderer || !this.model) return;
    const resized = this.renderer.resize();
    if (!this.needsRender && !resized) return;
    this.needsRender = false;
    const m = this.model;
    if (this.lastMeshTick !== m.tick) {
      this.renderer.uploadMesh(m.mesh);
      this.lastMeshTick = m.tick;
    }
    if (this.lastSelectionTick !== m.tick) {
      // 覆盖层同时包含框选高亮与“显形”的被隐藏体素
      const hidden = m.hiddenMesh;
      const sel = m.selectionMesh;
      if (hidden) {
        this.renderer.uploadOverlay(hidden, { color: [0.55, 0.75, 1.0], alpha: 0.34 });
        if (sel) this.renderer.uploadOverlay(sel, { color: [1, 0.82, 0.3], alpha: 0.45 }, true);
      } else if (sel) {
        this.renderer.uploadOverlay(sel, { color: [1, 0.82, 0.3], alpha: 0.45 });
      } else {
        this.renderer.clearOverlay();
      }
      this.lastSelectionTick = m.tick;
    }

    const rect = this.canvasRect();
    const aspect = Math.max(0.1, rect.width / Math.max(1, rect.height));
    const view = this.camera.viewMatrix();
    const proj = this.camera.projection(aspect);
    const vp = multiplyMat4(proj, view);
    const highlight = m.hover ? renderBoxForVoxel(m.hover.x, m.hover.y, m.hover.z, m.tool) : null;
    const selBox = m.selection ? this.selectionRenderBox(m.selection) : null;
    this.renderer.render(vp, this.camera.eye(), {
      showGround: true,
      highlight,
      selection: selBox,
      meshGrid: true,
    });
    this.emit('render-stats', {
      triangles: this.renderer.triangles,
      drawCalls: this.renderer.drawCalls,
      canvas: this.renderer.canvas,
    });
    this.updateHud();
  };

  private selectionRenderBox(b: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }): RenderBox {
    return {
      x0: b.x0,
      y0: b.y0,
      z0: b.z0,
      x1: b.x1 + 1,
      y1: b.y1 + 1,
      z1: b.z1 + 1,
      color: [1, 0.78, 0.28],
      alpha: 0.10,
    };
  }

  private updateHud(): void {
    if (!this.model) return;
    const hover = this.model.hover;
    if (!hover) {
      this.hudEl.textContent = '';
      return;
    }
    const layer = layerAtY(this.model.layers, hover.y);
    this.hudEl.innerHTML = '';
    this.hudEl.append(
      h('span', { class: 'chip' }, `x ${hover.x}  y ${hover.y}  z ${hover.z}  ·  L${layer + 1}`),
    );
  }

  /** 测试辅助：把模型坐标投影到画布像素 */
  projectVoxel(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    const rect = this.canvasRect();
    const aspect = rect.width / Math.max(1, rect.height);
    const vp = multiplyMat4(this.camera.projection(aspect), this.camera.viewMatrix());
    const cx = x + 0.5;
    const cy = y + 0.5;
    const cz = z + 0.5;
    const w = vp[3] * cx + vp[7] * cy + vp[11] * cz + vp[15];
    if (w <= 0) return { x: 0, y: 0, visible: false };
    const nx = (vp[0] * cx + vp[4] * cy + vp[8] * cz + vp[12]) / w;
    const ny = (vp[1] * cx + vp[5] * cy + vp[9] * cz + vp[13]) / w;
    return {
      x: rect.left + ((nx + 1) / 2) * rect.width,
      y: rect.top + ((1 - ny) / 2) * rect.height,
      visible: true,
    };
  }

  /** 测试辅助：在指定体素前方（朝相机方向）取一个可点击的像素点 */
  clickPointForVoxel(x: number, y: number, z: number): { x: number; y: number } | null {
    const p = this.projectVoxel(x, y, z);
    if (!p.visible) return null;
    const rect = this.canvasRect();
    return { x: p.x, y: p.y };
  }

  get cameraState(): OrbitCamera {
    return this.camera;
  }
}

function renderBoxForVoxel(x: number, y: number, z: number, tool: string): RenderBox {
  const color: [number, number, number] =
    tool === 'erase' ? [1, 0.4, 0.42] : tool === 'hide' ? [0.55, 0.75, 1] : [1, 0.85, 0.35];
  return {
    ...voxelBox(x, y, z),
    color,
    alpha: 0.26,
  };
}

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

define('voxel-viewport', VoxelViewport);
