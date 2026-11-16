// WebGPU 渲染器：视锥裁剪 + 动态索引压缩 + LOD + 剖切 + 高亮/差异着色 + CPU 射线拾取
import type { LayerId, Roadway, Vec3 } from '../core/types';
import { mat4LookAt, mat4Multiply, mat4Perspective, orbitEye, rayAABB, screenRay, type OrbitState } from '../core/math';
import type { CullSegment, RenderMesh, SceneMeshes } from '../core/mesh';
import { LINE_WGSL, SCENE_WGSL } from './shaders';

const MAX_RW = 2048;
const STYLE_BYTES = MAX_RW * 16;
const UNIFORM_BYTES = 112;

// TS 5.7+ 泛型 TypedArray 与 WebGPU 类型桥接
type GPUSrc = Parameters<GPUDevice['queue']['writeBuffer']>[2];
function gpuData(data: ArrayBufferView | ArrayBuffer): GPUSrc {
  return data as GPUSrc;
}

export interface ClipPlane {
  normal: Vec3;
  d: number;
}

export interface RenderStats {
  drawCalls: number;
  visibleSegments: number;
  totalSegments: number;
  visibleIndices: number;
  lod: { high: number; low: number };
  frameMs: number;
}

interface GpuMesh {
  mesh: RenderMesh;
  buffers: GPUBuffer[];
}

interface Plane {
  n: Vec3;
  d: number;
}

export class WebGPURenderer {
  private device!: GPUDevice;
  private destroyed = false;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private triPipeline!: GPURenderPipeline;
  private linePipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private styleBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;
  private dynIndex!: GPUBuffer[];
  private dynCapacity = 0;
  /** 可见索引压缩暂存（每帧复用，避免 GC） */
  private scratchIndex: Uint32Array = new Uint32Array(0);
  private frameParity = 0;
  private gpuMeshes: GpuMesh[] = [];
  private scene: SceneMeshes;
  private canvas: HTMLCanvasElement;
  private layerEnabled: Record<LayerId, boolean> = {
    roadway: true, support: true, pipeline: true, door: true, equipment: true,
  };
  private solo: LayerId | null = null;
  private highlightId: number | null = null;
  private clip: { enabled: boolean; plane: ClipPlane } = {
    enabled: false,
    plane: { normal: [1, 0, 0], d: 0 },
  };
  lastStats: RenderStats = { drawCalls: 0, visibleSegments: 0, totalSegments: 0, visibleIndices: 0, lod: { high: 0, low: 0 }, frameMs: 0 };
  onStats?: (s: RenderStats) => void;

  constructor(canvas: HTMLCanvasElement, scene: SceneMeshes) {
    this.canvas = canvas;
    this.scene = scene;
  }

  static async isSupported(): Promise<boolean> {
    return !!navigator.gpu && (await navigator.gpu.requestAdapter()) != null;
  }

  async init(): Promise<void> {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('未找到 WebGPU 适配器');
    this.device = await adapter.requestDevice();
    this.device.lost.then((info) => console.error('WebGPU device lost:', info.message));
    this.context = this.canvas.getContext('webgpu')!;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });

    this.uniformBuffer = this.device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.styleBuffer = this.device.createBuffer({
      size: STYLE_BYTES,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const triModule = this.device.createShaderModule({ code: SCENE_WGSL });
    const lineModule = this.device.createShaderModule({ code: LINE_WGSL });
    const bindLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', minBindingSize: UNIFORM_BYTES } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      ],
    });
    const pipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [bindLayout] });
    const vertexBufferLayout: GPUVertexBufferLayout[] = [
      { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
      { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
      { arrayStride: 12, attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x3' }] },
      { arrayStride: 4, attributes: [{ shaderLocation: 3, offset: 0, format: 'uint32' }] },
    ];
    const depthStencil: GPUDepthStencilState = {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    };
    this.triPipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: triModule, entryPoint: 'vs_main', buffers: vertexBufferLayout },
      fragment: { module: triModule, entryPoint: 'fs_main', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list', cullMode: 'none', frontFace: 'ccw' },
      depthStencil,
    });
    this.linePipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: lineModule, entryPoint: 'vs_line', buffers: vertexBufferLayout },
      fragment: { module: lineModule, entryPoint: 'fs_line', targets: [{ format: this.format }] },
      primitive: { topology: 'line-list' },
      depthStencil: { ...depthStencil, depthWriteEnabled: false },
    });
    this.bindGroup = this.device.createBindGroup({
      layout: bindLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.styleBuffer } },
      ],
    });

    // 上传网格
    let totalIndexBytes = 0;
    for (const layerMeshes of Object.values(this.scene.byLayer)) {
      for (const mesh of layerMeshes) {
        const mkBuf = (data: ArrayBufferView, usage: number) => {
          const b = this.device.createBuffer({ size: data.byteLength, usage });
          this.device.queue.writeBuffer(b, 0, gpuData(data));
          return b;
        };
        const buffers = [
          mkBuf(mesh.positions, GPUBufferUsage.VERTEX),
          mkBuf(mesh.normals, GPUBufferUsage.VERTEX),
          mkBuf(mesh.colors, GPUBufferUsage.VERTEX),
          mkBuf(mesh.rwIds, GPUBufferUsage.VERTEX),
        ];
        // 索引不建静态缓冲：每帧按视锥裁剪结果压缩进动态索引区
        this.gpuMeshes.push({ mesh, buffers });
        totalIndexBytes += mesh.indices.byteLength;
      }
    }
    // 双缓冲动态索引区（视锥裁剪后只把可见段索引拷进这里）
    this.dynCapacity = Math.max(1024, totalIndexBytes);
    // 存储缓冲绑定上限保护（style 缓冲固定 32KB，绝大多数适配器 ≥128MB）
    if (this.device.limits.maxStorageBufferBindingSize < STYLE_BYTES) {
      throw new Error('设备 maxStorageBufferBindingSize 不足，无法容纳巷道样式缓冲');
    }
    this.dynIndex = [0, 1].map(() =>
      this.device.createBuffer({ size: this.dynCapacity, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST }),
    );
    this.scratchIndex = new Uint32Array(this.dynCapacity / 4);
    if (this.scene.rwList.length >= MAX_RW) {
      throw new Error(`巷道数量 ${this.scene.rwList.length} 超出样式缓冲容量 ${MAX_RW}`);
    }
    this.refreshStyles();
  }

  setLayers(enabled: Record<LayerId, boolean>, solo: LayerId | null) {
    this.layerEnabled = { ...enabled };
    this.solo = solo;
  }

  setHighlight(rwId: number | null) {
    this.highlightId = rwId;
    this.refreshStyles();
  }

  /** 差异模式着色：new 绿、abandoned 红；null 清除 */
  setDiffTint(map: Record<number, 'new' | 'abandoned' | null> | null) {
    this.diffTint = map;
    this.refreshStyles();
  }
  private diffTint: Record<number, 'new' | 'abandoned' | null> | null = null;

  setClip(enabled: boolean, plane: ClipPlane) {
    this.clip = { enabled, plane };
  }

  private refreshStyles() {
    const data = new Float32Array(MAX_RW * 4);
    if (this.diffTint) {
      for (const [idStr, kind] of Object.entries(this.diffTint)) {
        const id = Number(idStr);
        if (!kind) continue;
        const c = kind === 'new' ? [0.2, 0.9, 0.35] : [0.95, 0.3, 0.25];
        data[id * 4 + 0] = c[0];
        data[id * 4 + 1] = c[1];
        data[id * 4 + 2] = c[2];
        data[id * 4 + 3] = 2; // tint 模式
      }
    }
    if (this.highlightId != null) {
      data[this.highlightId * 4 + 0] = 1.0;
      data[this.highlightId * 4 + 1] = 0.55;
      data[this.highlightId * 4 + 2] = 0.08;
      data[this.highlightId * 4 + 3] = 1; // 高亮脉冲模式
    }
    this.device.queue.writeBuffer(this.styleBuffer, 0, gpuData(data));
  }

  /** 从 viewProj 提取 6 个裁剪面（列主序，NDC z∈[-1,1]） */
  private extractFrustum(m: Float32Array): Plane[] {
    const row = (r: number): Vec3 => [m[r], m[4 + r], m[8 + r]];
    const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
    const w3 = m[15], w0 = m[12], w1 = m[13], w2 = m[14];
    const mk = (x: Vec3, w: number): Plane => {
      const len = Math.hypot(x[0], x[1], x[2]) || 1;
      return { n: [x[0] / len, x[1] / len, x[2] / len], d: w / len };
    };
    const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    return [
      mk(add(r3, r0), w3 + w0),   // left
      mk(sub(r3, r0), w3 - w0),   // right
      mk(add(r3, r1), w3 + w1),   // bottom
      mk(sub(r3, r1), w3 - w1),   // top
      mk(add(r3, r2), w3 + w2),   // near
      mk(sub(r3, r2), w3 - w2),   // far
    ];
  }

  private segmentVisible(seg: CullSegment, planes: Plane[]): boolean {
    for (const p of planes) {
      // AABB 的正顶点
      const vx = p.n[0] >= 0 ? seg.max[0] : seg.min[0];
      const vy = p.n[1] >= 0 ? seg.max[1] : seg.min[1];
      const vz = p.n[2] >= 0 ? seg.max[2] : seg.min[2];
      if (p.n[0] * vx + p.n[1] * vy + p.n[2] * vz + p.d < 0) return false;
    }
    return true;
  }

  render(cam: OrbitState, aspect: number, time: number) {
    if (this.destroyed) return;
    const t0 = performance.now();
    const eye = orbitEye(cam);
    const vp = buildViewProj(cam, aspect);
    const planes = this.extractFrustum(vp);

    const uniform = new ArrayBuffer(UNIFORM_BYTES);
    const f32 = new Float32Array(uniform);
    f32.set(vp, 0);
    f32.set(eye, 16);
    f32[19] = this.clip.enabled ? 1 : 0;
    f32.set(this.clip.plane.normal, 20);
    f32[23] = this.clip.plane.d;
    f32.set([0.055, 0.06, 0.075], 24); // 雾色/背景
    f32[27] = time;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, gpuData(uniform));

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.055, g: 0.06, b: 0.075, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this.ensureDepth(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'discard',
      },
    });
    pass.setBindGroup(0, this.bindGroup);

    const dyn = this.dynIndex[this.frameParity];
    let dynOffset = 0;
    let drawCalls = 0;
    let visibleSegments = 0;
    let totalSegments = 0;
    let visibleIndices = 0;
    const lodCount = { high: 0, low: 0 };

    for (const gm of this.gpuMeshes) {
      const layer = gm.mesh.layer as LayerId;
      if (this.solo !== null) {
        if (layer !== this.solo) continue;
      } else if (!this.layerEnabled[layer]) continue;

      // LOD：支护双网格按相机距离切换
      if (gm.mesh.lodMode === 'nearOnly' && cam.radius > gm.mesh.lodDistance) continue;
      if (gm.mesh.lodMode === 'farOnly' && cam.radius <= gm.mesh.lodDistance) continue;
      if (gm.mesh.lodMode === 'nearOnly') lodCount.high++;
      if (gm.mesh.lodMode === 'farOnly') lodCount.low++;

      // 视锥裁剪 → 收集可见索引区间，相邻区间合并
      type Range = { start: number; count: number };
      const ranges: Range[] = [];
      for (const seg of gm.mesh.segments) {
        totalSegments++;
        if (!this.segmentVisible(seg, planes)) continue;
        visibleSegments++;
        const last = ranges[ranges.length - 1];
        if (last && last.start + last.count === seg.indexStart) {
          last.count += seg.indexCount;
        } else {
          ranges.push({ start: seg.indexStart, count: seg.indexCount });
        }
      }
      if (!ranges.length) continue;

      pass.setPipeline(gm.mesh.primitive === 'line' ? this.linePipeline : this.triPipeline);
      gm.buffers.forEach((b, i) => pass.setVertexBuffer(i, b));

      // 把所有可见区间压缩进一块连续暂存区，每网格仅一次 writeBuffer（拖动跟手的关键）
      const packed = this.scratchIndex;
      let packedCount = 0;
      for (const r of ranges) {
        if (dynOffset + (packedCount + r.count) * 4 > this.dynCapacity) break;
        packed.set(gm.mesh.indices.subarray(r.start, r.start + r.count), packedCount);
        packedCount += r.count;
      }
      if (!packedCount) continue;
      const byteSize = packedCount * 4;
      this.device.queue.writeBuffer(dyn, dynOffset, gpuData(packed.subarray(0, packedCount)));
      pass.setIndexBuffer(dyn, 'uint32', dynOffset, byteSize);

      // 用 drawIndexed 的 indexOffset 区分各区间（区间在暂存区中保持原顺序）
      let localOffset = 0;
      for (const r of ranges) {
        if (localOffset + r.count > packedCount) break;
        pass.drawIndexed(r.count, 1, localOffset, 0, 0);
        localOffset += r.count;
        drawCalls++;
        visibleIndices += r.count;
      }
      dynOffset += byteSize;
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    this.frameParity = 1 - this.frameParity;

    const frameMs = performance.now() - t0;
    this.lastStats = { drawCalls, visibleSegments, totalSegments, visibleIndices, lod: lodCount, frameMs };
    this.onStats?.(this.lastStats);
  }

  private depthTex: GPUTexture | null = null;
  private ensureDepth(): GPUTextureView {
    const w = this.canvas.width, h = this.canvas.height;
    if (!this.depthTex || this.depthTex.width !== w || this.depthTex.height !== h) {
      this.depthTex?.destroy();
      this.depthTex = this.device.createTexture({
        size: [w, h],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    return this.depthTex.createView();
  }

  /** CPU 射线拾取：先粗判巷道整体 AABB，再用体块分段 AABB 精判，返回最近巷道序号 */
  pick(cam: OrbitState, aspect: number, ndcX: number, ndcY: number): number | null {
    const { origin, dir } = screenRay(cam, aspect, ndcX, ndcY);
    const candidates: { id: number; t: number }[] = [];
    this.scene.rwAABB.forEach((box, id) => {
      const t = rayAABB(origin, dir, box.min, box.max);
      if (t != null) candidates.push({ id, t });
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.t - b.t);

    const roadwayMesh = this.scene.byLayer.roadway[0];
    let best: { id: number; t: number } | null = null;
    for (const cand of candidates.slice(0, 32)) {
      let nearest: number | null = null;
      for (const seg of roadwayMesh.segments) {
        if (seg.rwId !== cand.id) continue;
        const t = rayAABB(origin, dir, seg.min, seg.max);
        if (t != null && (nearest == null || t < nearest)) nearest = t;
      }
      if (nearest != null && (!best || nearest < best.t)) best = { id: cand.id, t: nearest };
    }
    return best ? best.id : candidates[0].id;
  }

  getRoadway(id: number): Roadway {
    return this.scene.rwList[id];
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.depthTex?.destroy();
    this.device?.destroy();
  }
}

/** 渲染器内部使用的投影矩阵（远裁剪面收紧到 6 万米，保证深度精度） */
function buildViewProj(cam: OrbitState, aspect: number): Float32Array {
  const eye = orbitEye(cam);
  return mat4Multiply(mat4Perspective(cam.fovy, aspect, 0.5, 60000), mat4LookAt(eye, cam.target, [0, 0, 1]));
}
