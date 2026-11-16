/**
 * WebGPU 主渲染器：
 *  - 四条图层（洞体/钟乳石/步道/灯光）独立开关
 *  - 钟乳石三档原型 + 实例化 storage buffer
 *  - 全局剖切平面（fragment discard）
 *  - 单 canvas 双视口对比，相机可联动
 *  - 按场景 id LRU 缓存 GPU 资源（最近 3 个场景）
 */
import type { GenResult, LayerVisibility } from '../types';
import type { LightEntity, SpeleoInstance, Vec3 } from '../core/geometry';
import type { OrbitCamera } from './camera';
import type { GpuContext } from './gpu';
import type { GpuMesh } from './buffers';
import { INSTANCE_STRIDE, GIZMO_STRIDE, makeUniformBuffer, uploadMesh, writeGizmos, writeSpeleoInstances } from './buffers';
import { BASIC_MESH_WGSL } from './shaders/basicMesh.wgsl';
import { SPELEO_WGSL } from './shaders/speleo.wgsl';
import { GIZMO_WGSL } from './shaders/gizmo.wgsl';
import { mat4Identity } from '../core/vec';

export interface ClipState {
  enabled: boolean;
  point: Vec3;
  normal: Vec3;
}

export interface RenderScene {
  id: string;
  result: GenResult;
}

interface SceneResources {
  id: string;
  tunnel: GpuMesh;
  trail: GpuMesh;
  prototypes: GpuMesh[];
  instanceBuffer: GPUBuffer;
  instanceCount: number;
  gizmoBuffer: GPUBuffer;
  gizmoCount: number;
  /** 每实例渲染数据（与 buffer 同序），拾取走 JS 侧实例数组。 */
  instances: SpeleoInstance[];
}

const MAX_SCENES = 3;
// 布局：viewProj(64) + eye(12)+pad(4) + clipEnabled+3pad(16) + clipPoint(12)+pad(4)
//       + clipNormal(12)+lightCount+2pad(16) + 8 灯 × 32 字节 = 320
const GLOBALS_SIZE = 64 + 16 + 16 + 16 + 16 + 8 * 32;
const MODEL_SIZE = 80; // mat4(64) + vec4(16)
const TIER_COLORS: [number, number, number][] = [
  [0.72, 0.6, 0.48],
  [0.78, 0.66, 0.52],
  [0.85, 0.74, 0.6],
];

export class CaveRenderer {
  private ctx: GpuContext;
  private canvas: HTMLCanvasElement;
  private depthView!: GPUTextureView;
  private basicPipeline!: GPURenderPipeline;
  private speleoPipeline!: GPURenderPipeline;
  private gizmoPipeline!: GPURenderPipeline;
  private globalsBuffer: GPUBuffer;
  private modelBuffer: GPUBuffer;
  private samplerlessBindGroupLayout!: GPUBindGroupLayout;
  private scenes = new Map<string, SceneResources>();
  private lru: string[] = [];
  private quadBuffer!: GPUBuffer;

  constructor(canvas: HTMLCanvasElement, ctx: GpuContext) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.globalsBuffer = makeUniformBuffer(ctx.device, GLOBALS_SIZE);
    this.modelBuffer = makeUniformBuffer(ctx.device, MODEL_SIZE);
    this.initPipelines();
    this.initQuad();
    this.resize();
  }

  private initQuad(): void {
    // billboard 四角（xy），实例化绘制
    const corners = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.quadBuffer = this.ctx.device.createBuffer({
      size: corners.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.ctx.device.queue.writeBuffer(this.quadBuffer, 0, corners);
  }

  private initPipelines(): void {
    const device = this.ctx.device;
    const format = this.ctx.format;
    this.samplerlessBindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      ],
    });
    const uniformOnlyLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const basicModule = device.createShaderModule({ code: BASIC_MESH_WGSL.vertex + '\n' + BASIC_MESH_WGSL.fragment });
    this.basicPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [uniformOnlyLayout] }),
      vertex: {
        module: basicModule,
        buffers: [
          {
            arrayStride: 24,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 12, format: 'float32x3' },
            ],
          },
        ],
      },
      fragment: { module: basicModule, targets: [{ format }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' },
    });

    const speleoModule = device.createShaderModule({ code: SPELEO_WGSL.vertex + '\n' + SPELEO_WGSL.fragment });
    this.speleoPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.samplerlessBindGroupLayout] }),
      vertex: {
        module: speleoModule,
        buffers: [
          {
            arrayStride: 24,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' },
              { shaderLocation: 1, offset: 12, format: 'float32x3' },
            ],
          },
        ],
      },
      fragment: { module: speleoModule, targets: [{ format }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' },
    });

    const gizmoModule = device.createShaderModule({ code: GIZMO_WGSL.vertex + '\n' + GIZMO_WGSL.fragment });
    this.gizmoPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.samplerlessBindGroupLayout] }),
      vertex: {
        module: gizmoModule,
        buffers: [{ arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }] }],
      },
      fragment: { module: gizmoModule, targets: [{ format }] },
      primitive: { topology: 'triangle-strip' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'less' },
    });
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    const depth = this.ctx.device.createTexture({
      size: [w, h],
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthView = depth.createView();
  }

  get canvasSize(): { w: number; h: number } {
    return { w: this.canvas.width, h: this.canvas.height };
  }

  private touchLru(id: string): void {
    this.lru = [id, ...this.lru.filter((x) => x !== id)];
    while (this.lru.length > MAX_SCENES) {
      const evict = this.lru.pop()!;
      if (evict === id) continue;
      const res = this.scenes.get(evict);
      if (res) {
        res.tunnel.destroy();
        res.trail.destroy();
        res.prototypes.forEach((p) => p.destroy());
        res.instanceBuffer.destroy();
        res.gizmoBuffer.destroy();
        this.scenes.delete(evict);
      }
    }
  }

  /** 上传/取回某场景的 GPU 资源（含 LRU 淘汰）。 */
  private ensureScene(scene: RenderScene): SceneResources {
    const existing = this.scenes.get(scene.id);
    if (existing) {
      this.touchLru(scene.id);
      return existing;
    }
    const { device } = this.ctx;
    const { result } = scene;
    const instances = result.speleo.instances;
    const instanceData = instances.map((ins) => ({
      root: ins.root,
      axis: ins.axis,
      height: ins.height,
      radius: ins.radius,
      color: TIER_COLORS[ins.tierIndex]!,
      shapeSeed: ins.shapeSeed,
    }));
    const gizmos = result.lights.map((l: LightEntity) => ({
      position: l.position,
      radius: 0.28,
      color: [l.color[0], l.color[1], l.color[2], 1] as [number, number, number, number],
    }));
    const res: SceneResources = {
      id: scene.id,
      tunnel: uploadMesh(device, result.tunnel),
      trail: uploadMesh(device, result.trail),
      prototypes: result.speleo.prototypes.map((m) => uploadMesh(device, m)),
      instanceBuffer: writeSpeleoInstances(device, instanceData),
      instanceCount: instances.length,
      gizmoBuffer: writeGizmos(device, gizmos),
      gizmoCount: gizmos.length,
      instances,
    };
    this.scenes.set(scene.id, res);
    this.touchLru(scene.id);
    return res;
  }

  private writeGlobals(camera: OrbitCamera, clip: ClipState, lights: LightEntity[]): void {
    const data = new Float32Array(GLOBALS_SIZE / 4);
    data.set(camera.viewProj(), 0);
    const eye = camera.eye();
    data.set(eye, 16);
    data[19] = 0; // pad
    data[20] = clip.enabled ? 1 : 0;
    data[24] = clip.point[0];
    data[25] = clip.point[1];
    data[26] = clip.point[2];
    data[28] = clip.normal[0];
    data[29] = clip.normal[1];
    data[30] = clip.normal[2];
    data[31] = Math.min(8, lights.length);
    lights.slice(0, 8).forEach((l, i) => {
      const o = 32 + i * 8;
      data[o] = l.position[0];
      data[o + 1] = l.position[1];
      data[o + 2] = l.position[2];
      data[o + 3] = l.intensity;
      data[o + 4] = l.color[0];
      data[o + 5] = l.color[1];
      data[o + 6] = l.color[2];
    });
    this.ctx.device.queue.writeBuffer(this.globalsBuffer, 0, data);
  }

  private writeModel(color: [number, number, number, number]): GPUBindGroup {
    const data = new Float32Array(MODEL_SIZE / 4);
    data.set(mat4Identity(), 0);
    data.set(color, 16);
    this.ctx.device.queue.writeBuffer(this.modelBuffer, 0, data);
    return this.ctx.device.createBindGroup({
      layout: this.basicPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.globalsBuffer } },
        { binding: 1, resource: { buffer: this.modelBuffer } },
      ],
    });
  }

  private drawBasic(pass: GPURenderPassEncoder, mesh: GpuMesh, color: [number, number, number, number]): void {
    const bg = this.writeModel(color);
    pass.setPipeline(this.basicPipeline);
    pass.setBindGroup(0, bg);
    pass.setVertexBuffer(0, mesh.vertexBuffer);
    pass.setIndexBuffer(mesh.indexBuffer, 'uint32');
    pass.drawIndexed(mesh.indexCount);
  }

  private drawScene(
    pass: GPURenderPassEncoder,
    scene: RenderScene,
    layers: LayerVisibility,
    camera: OrbitCamera,
    clip: ClipState,
    highlightIds: Set<string>,
    dimOthers: boolean,
  ): void {
    const res = this.ensureScene(scene);
    this.writeGlobals(camera, clip, scene.result.lights);

    if (layers.tunnel) {
      this.drawBasic(pass, res.tunnel, [0.42, 0.34, 0.28, 1]);
    }
    if (layers.trail) {
      this.drawBasic(pass, res.trail, [0.55, 0.45, 0.32, 1]);
    }
    if (layers.speleo) {
      const bg = this.ctx.device.createBindGroup({
        layout: this.speleoPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.globalsBuffer } },
          { binding: 1, resource: { buffer: res.instanceBuffer } },
        ],
      });
      pass.setPipeline(this.speleoPipeline);
      pass.setBindGroup(0, bg);
      // 三档原型分别绘制，按 tier 统计实例偏移
      let offset = 0;
      res.prototypes.forEach((proto, tier) => {
        const count = res.instances.filter((i) => i.tierIndex === tier).length;
        if (count > 0) {
          pass.setVertexBuffer(0, proto.vertexBuffer);
          pass.setIndexBuffer(proto.indexBuffer, 'uint32');
          pass.drawIndexed(proto.indexCount, count, 0, 0, offset);
        }
        offset += count;
      });
      void highlightIds;
      void dimOthers;
    }
    if (layers.lights) {
      const bg = this.ctx.device.createBindGroup({
        layout: this.gizmoPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.globalsBuffer } },
          { binding: 1, resource: { buffer: res.gizmoBuffer } },
        ],
      });
      pass.setPipeline(this.gizmoPipeline);
      pass.setBindGroup(0, bg);
      pass.setVertexBuffer(0, this.quadBuffer);
      pass.draw(4, res.gizmoCount);
    }
  }

  /** 单视口渲染。 */
  render(
    scene: RenderScene,
    camera: OrbitCamera,
    layers: LayerVisibility,
    clip: ClipState,
    annotationGizmos: { position: Vec3; color: [number, number, number, number] }[] = [],
  ): void {
    this.resize();
    camera.aspect = this.canvas.width / this.canvas.height;
    const encoder = this.ctx.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: this.ctx.context.getCurrentTexture().createView(), clearValue: { r: 0.06, g: 0.07, b: 0.09, a: 1 }, loadOp: 'clear', storeOp: 'store' },
      ],
      depthStencilAttachment: { view: this.depthView, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    this.drawScene(pass, scene, layers, camera, clip, new Set(), false);
    if (annotationGizmos.length > 0) this.drawAnnotations(pass, camera, clip, scene.result.lights, annotationGizmos);
    pass.end();
    this.ctx.device.queue.submit([encoder.finish()]);
  }

  private drawAnnotations(
    pass: GPURenderPassEncoder,
    camera: OrbitCamera,
    clip: ClipState,
    lights: LightEntity[],
    gizmos: { position: Vec3; color: [number, number, number, number] }[],
  ): void {
    this.writeGlobals(camera, clip, lights);
    const buffer = writeGizmos(this.ctx.device, gizmos.map((g) => ({ position: g.position, radius: 0.35, color: g.color })));
    const bg = this.ctx.device.createBindGroup({
      layout: this.gizmoPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.globalsBuffer } },
        { binding: 1, resource: { buffer } },
      ],
    });
    pass.setPipeline(this.gizmoPipeline);
    pass.setBindGroup(0, bg);
    pass.setVertexBuffer(0, this.quadBuffer);
    pass.draw(4, gizmos.length);
    // 临时缓冲本帧结束后即可回收（GC 跟踪 GPUBuffer 生命周期）
    buffer.destroy();
  }

  /** 双视口并排对比：左 A 右 B，相机联动（传入同一组 orbit 参数快照）。 */
  renderSplit(
    left: RenderScene,
    right: RenderScene,
    camera: OrbitCamera,
    layers: LayerVisibility,
    clip: ClipState,
  ): void {
    this.resize();
    const halfW = Math.floor(this.canvas.width / 2);
    const encoder = this.ctx.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: this.ctx.context.getCurrentTexture().createView(), clearValue: { r: 0.06, g: 0.07, b: 0.09, a: 1 }, loadOp: 'clear', storeOp: 'store' },
      ],
      depthStencilAttachment: { view: this.depthView, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    camera.aspect = halfW / this.canvas.height;
    pass.setViewport(0, 0, halfW, this.canvas.height, 0, 1);
    this.drawScene(pass, left, layers, camera, clip, new Set(), false);
    pass.setViewport(halfW, 0, this.canvas.width - halfW, this.canvas.height, 0, 1);
    this.drawScene(pass, right, layers, camera, clip, new Set(), false);
    pass.end();
    this.ctx.device.queue.submit([encoder.finish()]);
  }

  getSceneInstances(id: string): SpeleoInstance[] | undefined {
    return this.scenes.get(id)?.instances;
  }

  destroyScene(id: string): void {
    const res = this.scenes.get(id);
    if (!res) return;
    res.tunnel.destroy();
    res.trail.destroy();
    res.prototypes.forEach((p) => p.destroy());
    res.instanceBuffer.destroy();
    res.gizmoBuffer.destroy();
    this.scenes.delete(id);
    this.lru = this.lru.filter((x) => x !== id);
  }
}

export { INSTANCE_STRIDE, GIZMO_STRIDE };
