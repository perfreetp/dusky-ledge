/// <reference types="@webgpu/types" />

import type { Feature, Pt } from '@shared/types';
import earcut from 'earcut';
import { generateHatchVariants } from '@/core/hatch';
import { featureRings } from '@/core/feature';
import { groupRings, type Rect } from '@/core/math';
import { strokeTriangles } from '@/core/stroke';

export interface SceneCamera {
  /** world units (mm) per CSS pixel */
  scale: number;
  /** world coordinate of the canvas top-left */
  tx: number;
  ty: number;
  /** CSS pixel size */
  width: number;
  height: number;
}

export interface SceneStats {
  triangles: number;
  segments: number;
  hatchStripes: number;
  batches: number;
  buildMs: number;
  gpu: boolean;
  adapterInfo: string;
}

interface Batch {
  fill: Float32Array;
  stroke: Float32Array;
  hatch: Float32Array;
  hatchColorA: [number, number, number, number];
  hatchColorB: [number, number, number, number] | null;
  hatchWidth: number;
  bounds: Rect;
}

interface GpuBatch {
  fill: GPUBuffer | null;
  stroke: GPUBuffer | null;
  hatch: GPUBuffer | null;
  fillVerts: number;
  strokeVerts: number;
  hatchInstances: number;
}

const MSAA = 4;
const MAX_HATCH_INSTANCES = 900_000;

const SHADER = /* wgsl */ `
struct Uniforms {
  scale: vec2f,
  translate: vec2f,
  resolution: vec2f,
  lineWidth: f32,
  pad: f32,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec4f,
};

fn worldToClip(p: vec2f) -> vec4f {
  let screen = vec2f(p.x * u.scale.x + u.translate.x, p.y * u.scale.y + u.translate.y);
  let ndc = vec2f(screen.x / u.resolution.x * 2.0 - 1.0, 1.0 - screen.y / u.resolution.y * 2.0);
  return vec4f(ndc, 0.0, 1.0);
}

@vertex fn vsSolid(@location(0) pos: vec2f, @location(1) color: vec4f) -> VOut {
  var o: VOut;
  o.pos = worldToClip(pos);
  o.color = color;
  return o;
}

@fragment fn fsSolid(@location(0) color: vec4f) -> @location(0) vec4f {
  return color;
}

struct HatchOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec4f,
};

// One instance = one stripe, expanded to a quad on the GPU. This is why tens of
// thousands of stripes stay a single draw call.
@vertex fn vsHatch(
  @builtin(vertex_index) vi: u32,
  @location(0) seg: vec4f,
  @location(1) color: vec4f,
  @location(2) width: f32,
) -> HatchOut {
  var corner = vec2f(0.0, 0.0);
  switch (vi) {
    case 0u: { corner = vec2f(0.0, -0.5); }
    case 1u: { corner = vec2f(1.0, -0.5); }
    case 2u: { corner = vec2f(0.0, 0.5); }
    case 3u: { corner = vec2f(1.0, 0.5); }
    case 4u: { corner = vec2f(0.0, 0.5); }
    default: { corner = vec2f(1.0, -0.5); }
  }
  let a = seg.xy;
  let b = seg.zw;
  var d = b - a;
  if (length(d) < 1e-5) { d = vec2f(1.0, 0.0); }
  let n = normalize(vec2f(-d.y, d.x));
  let p = mix(a, b, corner.x) + n * (corner.y * width);
  var o: HatchOut;
  o.pos = worldToClip(p);
  o.color = color;
  return o;
}

@fragment fn fsHatch(@location(0) color: vec4f) -> @location(0) vec4f {
  return color;
}
`;

// Triangle winding for the quad above: 0,1,2 / 3,4,5 must both be counter-clockwise
// in clip space to satisfy backface culling; we use cullMode 'none' anyway.
const VERTEX_LAYOUT: GPUVertexBufferLayout = {
  arrayStride: 24,
  attributes: [
    { shaderLocation: 0, offset: 0, format: 'float32x2' },
    { shaderLocation: 1, offset: 8, format: 'float32x4' },
  ],
};

// One instance = 9 floats: seg.xyzw | colour.rgba | width. Both buffers are bound to
// the same GPU buffer with the same stride so the width attribute lives at +32 B.
const HATCH_STRIDE = 36;
const HATCH_LAYOUTS: GPUVertexBufferLayout[] = [
  {
    arrayStride: HATCH_STRIDE,
    stepMode: 'instance',
    attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x4' },
      { shaderLocation: 1, offset: 16, format: 'float32x4' },
    ],
  },
  {
    arrayStride: HATCH_STRIDE,
    stepMode: 'instance',
    attributes: [{ shaderLocation: 2, offset: 32, format: 'float32' }],
  },
];

export function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  let h = (hex || '#000').trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h.slice(0, 6) || '000000', 16) || 0;
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255, alpha];
}

function triangulateRings(rings: Pt[][]): number[] {
  const groups = groupRings(rings);
  const tris: number[] = [];
  for (const g of groups) {
    const flat: number[] = [];
    const holes: number[] = [];
    for (const p of g.outer) flat.push(p.x, p.y);
    for (const h of g.holes) {
      holes.push(flat.length / 2);
      for (const p of h) flat.push(p.x, p.y);
    }
    if (flat.length < 6) continue;
    const idx = earcut(flat, holes, 2);
    for (let i = 0; i < idx.length; i += 3) {
      tris.push(flat[idx[i] * 2], flat[idx[i] * 2 + 1], flat[idx[i + 1] * 2], flat[idx[i + 1] * 2 + 1], flat[idx[i + 2] * 2], flat[idx[i + 2] * 2 + 1]);
    }
  }
  return tris;
}

function pushColored(target: number[], tris: number[], rgba: [number, number, number, number]) {
  for (let i = 0; i < tris.length; i += 2) {
    target.push(tris[i], tris[i + 1], rgba[0], rgba[1], rgba[2], rgba[3]);
  }
}

/**
 * GPU scene renderer.
 *
 * Everything is baked to world-space triangles (fills, outlines, dash patterns) plus
 * per-stripe hatch instances. One pipeline per geometry class means the whole
 * document renders in a handful of draw calls; the hatch pass is a single instanced
 * draw no matter how many stripes the 斜纹 fills produce.
 */
export class SceneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';
  private pipeSolid: GPURenderPipeline | null = null;
  private pipeHatch: GPURenderPipeline | null = null;
  private uniforms: GPUBuffer | null = null;
  private bindGroups: { solid: GPUBindGroup; hatch: GPUBindGroup } | null = null;
  private msaa: GPUTexture | null = null;
  private batches: Batch[] = [];
  private gpuBatches: GpuBatch[] = [];
  private gpuReady = false;
  private adapterInfo = '';
  private stats: SceneStats = {
    triangles: 0,
    segments: 0,
    hatchStripes: 0,
    batches: 0,
    buildMs: 0,
    gpu: false,
    adapterInfo: '',
  };
  private quality = 1;
  /** device pixels per world unit for the last rendered frame (for hatch LOD) */
  private pixelScale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      this.init2d();
      return false;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) {
        this.init2d();
        return false;
      }
      const device = await adapter.requestDevice();
      device.lost.then((info) => {
        if (info.reason !== 'destroyed') {
          console.warn('[webgpu] device lost:', info.message);
          this.gpuReady = false;
          this.init2d();
        }
      });
      this.device = device;
      const info: any = (adapter as any).info;
      this.adapterInfo = info?.description || info?.architecture || info?.vendor || 'WebGPU';
      const ctx = this.canvas.getContext('webgpu') as GPUCanvasContext | null;
      if (!ctx) {
        this.device = null;
        this.init2d();
        return false;
      }
      this.context = ctx;
      this.format = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({ device, format: this.format, alphaMode: 'premultiplied' });

      const module = device.createShaderModule({ code: SHADER });
      const target: GPUColorTargetState = {
        format: this.format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      };
      this.pipeSolid = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vsSolid', buffers: [VERTEX_LAYOUT] },
        fragment: { module, entryPoint: 'fsSolid', targets: [target] },
        primitive: { topology: 'triangle-list', cullMode: 'none' },
        multisample: { count: MSAA },
      });
      this.pipeHatch = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vsHatch', buffers: HATCH_LAYOUTS },
        fragment: { module, entryPoint: 'fsHatch', targets: [target] },
        primitive: { topology: 'triangle-list', cullMode: 'none' },
        multisample: { count: MSAA },
      });

      this.uniforms = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.bindGroups = {
        solid: device.createBindGroup({
          layout: this.pipeSolid.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: this.uniforms } }],
        }),
        hatch: device.createBindGroup({
          layout: this.pipeHatch.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: this.uniforms } }],
        }),
      };
      this.gpuReady = true;
      return true;
    } catch (err) {
      console.warn('[webgpu] init failed:', err);
      this.init2d();
      return false;
    }
  }

  private init2d() {
    this.gpuReady = false;
    if (!this.ctx2d) this.ctx2d = this.canvas.getContext('2d');
  }

  get isGpu(): boolean {
    return this.gpuReady;
  }
  get info(): string {
    return this.adapterInfo;
  }
  get lastStats(): SceneStats {
    return this.stats;
  }
  /** 1 = full detail, lower values decimate hatch stripes while previewing. */
  setQuality(q: number) {
    this.quality = Math.max(0.1, Math.min(1, q));
  }

  /** Rebuild geometry from the immutable document. */
  build(features: Feature[]): SceneStats {
    const t0 = performance.now();
    this.releaseGpuBatches();
    this.batches = [];
    let triangles = 0;
    let hatchStripes = 0;

    for (const f of features) {
      if (!f.visible) continue;
      if (f.geom === 'area' && !f.rings.length) continue;
      if (f.geom === 'path' && !f.paths.some((p) => p.length >= 2)) continue;

      const batch: Batch = {
        fill: new Float32Array(0),
        stroke: new Float32Array(0),
        hatch: new Float32Array(0),
        hatchColorA: [0, 0, 0, 1],
        hatchColorB: null,
        hatchWidth: 1,
        bounds: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      };
      const fillData: number[] = [];
      const strokeData: number[] = [];
      const inner: Pt[][] = f.geom === 'area' ? f.rings : featureRings(f);

      // fill
      if (inner.length && (f.geom === 'area' ? f.fillColor : true)) {
        const tris = triangulateRings(inner);
        const color: [number, number, number, number] =
          f.geom === 'area'
            ? hexToRgba(f.fillColor ?? f.strokeColor, Math.max(0, f.fillOpacity))
            : hexToRgba(f.strokeColor, 1);
        if (color[3] > 0.003) pushColored(fillData, tris, color);
        triangles += tris.length / 6;
      }

      // outline
      const strokeWidth = f.geom === 'area' ? f.outlineWidth || f.lineWidth : f.lineWidth;
      if (strokeWidth > 0) {
        const tri = strokeTriangles(
          inner.map((ring) => ({ pts: ring, closed: true })),
          strokeWidth,
          f.geom === 'area' ? f.strokeStyle : 'solid'
        );
        const sTri = tri.positions;
        if (sTri.length) {
          pushColored(strokeData, sTri, hexToRgba(f.strokeColor, 1));
          triangles += sTri.length / 6;
        }
      }

      // hatch
      if (f.hatch && inner.length) {
        // Screen-space LOD: when the stripe pitch shrinks to a few pixels the pattern
        // becomes visual noise and costs fill rate, so draw every Nth stripe at low
        // zoom. The pitch in px is spacing * mmPerPx.
        const pxPerMm = this.pixelScale > 0 ? 1 / this.pixelScale : 0;
        const pitchPx = f.hatch.spacing * pxPerMm;
        let stride = 1;
        if (pitchPx < 2.5) stride = 4;
        else if (pitchPx < 5) stride = 2;
        if (this.quality <= 0.35) stride = Math.max(stride, 2);
        const stripes = generateHatchVariants(inner, f.hatch, stride);
        const limit = Math.min(stripes.length, Math.floor(MAX_HATCH_INSTANCES));
        const arr = new Float32Array(limit * 4);
        for (let i = 0; i < limit; i++) {
          arr[i * 4] = stripes[i].x0;
          arr[i * 4 + 1] = stripes[i].y0;
          arr[i * 4 + 2] = stripes[i].x1;
          arr[i * 4 + 3] = stripes[i].y1;
        }
        batch.hatch = arr;
        batch.hatchColorA = hexToRgba(f.hatch.color, f.hatch.alpha);
        batch.hatchColorB = f.hatch.color2 ? hexToRgba(f.hatch.color2, f.hatch.alpha) : null;
        batch.hatchWidth = f.hatch.lineWidth;
        hatchStripes += limit;
      }

      if (!fillData.length && !strokeData.length && !batch.hatch.length) continue;
      batch.fill = new Float32Array(fillData);
      batch.stroke = new Float32Array(strokeData);
      batch.bounds = boundsOfBatch(batch, f);
      this.batches.push(batch);
    }

    this.stats = {
      triangles,
      segments: 0,
      hatchStripes,
      batches: this.batches.length,
      buildMs: performance.now() - t0,
      gpu: this.gpuReady,
      adapterInfo: this.adapterInfo,
    };
    return this.stats;
  }

  private releaseGpuBatches() {
    for (const g of this.gpuBatches) {
      g.fill?.destroy();
      g.stroke?.destroy();
      g.hatch?.destroy();
    }
    this.gpuBatches = [];
  }

  private ensureGpuBatch(i: number): GpuBatch | null {
    const device = this.device;
    if (!device) return null;
    if (this.gpuBatches[i]) return this.gpuBatches[i];
    const batch = this.batches[i];
    const g: GpuBatch = { fill: null, stroke: null, hatch: null, fillVerts: 0, strokeVerts: 0, hatchInstances: 0 };
    if (batch.fill.length) {
      g.fill = device.createBuffer({ size: batch.fill.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(g.fill, 0, batch.fill as Float32Array<ArrayBuffer>);
      g.fillVerts = batch.fill.length / 6;
    }
    if (batch.stroke.length) {
      g.stroke = device.createBuffer({ size: batch.stroke.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(g.stroke, 0, batch.stroke as Float32Array<ArrayBuffer>);
      g.strokeVerts = batch.stroke.length / 6;
    }
    if (batch.hatch.length) {
      const count = batch.hatch.length / 4;
      const data = new Float32Array(count * 9);
      const a = batch.hatchColorA;
      const b = batch.hatchColorB;
      for (let k = 0; k < count; k++) {
        const o = k * 9;
        data[o] = batch.hatch[k * 4];
        data[o + 1] = batch.hatch[k * 4 + 1];
        data[o + 2] = batch.hatch[k * 4 + 2];
        data[o + 3] = batch.hatch[k * 4 + 3];
        const c = b ? (k % 2 === 0 ? a : b) : a;
        data[o + 4] = c[0];
        data[o + 5] = c[1];
        data[o + 6] = c[2];
        data[o + 7] = c[3];
        data[o + 8] = batch.hatchWidth;
      }
      g.hatch = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(g.hatch, 0, data as Float32Array<ArrayBuffer>);
      g.hatchInstances = count;
    }
    this.gpuBatches[i] = g;
    return g;
  }

  private ensureTargets(w: number, h: number) {
    if (!this.device) return;
    if (!this.msaa || this.msaa.width !== w || this.msaa.height !== h) {
      this.msaa?.destroy();
      this.msaa = this.device.createTexture({
        size: [w, h],
        sampleCount: MSAA,
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
  }

  render(camera: SceneCamera) {
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const w = Math.max(1, Math.round(camera.width * dpr));
    const h = Math.max(1, Math.round(camera.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    if (!this.gpuReady) {
      this.render2d(camera, dpr);
      return;
    }
    this.renderGpu(camera, dpr, w, h);
  }

  private renderGpu(camera: SceneCamera, dpr: number, w: number, h: number) {
    const device = this.device;
    if (!device || !this.context || !this.pipeSolid || !this.pipeHatch || !this.uniforms || !this.bindGroups) return;
    this.ensureTargets(w, h);

    // world -> clip: scale in device px per world unit, offset in device px
    const viewScale = dpr / camera.scale;
    this.pixelScale = viewScale;
    device.queue.writeBuffer(
      this.uniforms,
      0,
      new Float32Array([viewScale, viewScale, -camera.tx * viewScale, -camera.ty * viewScale, w, h, 1, 0])
    );

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.msaa!.createView(),
          resolveTarget: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'discard',
        },
      ],
    });

    const visible: Rect = {
      minX: camera.tx,
      minY: camera.ty,
      maxX: camera.tx + camera.width * camera.scale,
      maxY: camera.ty + camera.height * camera.scale,
    };
    const margin = camera.scale * 2;

    pass.setPipeline(this.pipeSolid);
    pass.setBindGroup(0, this.bindGroups.solid);
    const solidDraws: { g: GpuBatch; kind: 'fill' | 'stroke' }[] = [];
    for (let i = 0; i < this.batches.length; i++) {
      const b = this.batches[i];
      if (
        b.bounds.maxX < visible.minX - margin ||
        b.bounds.minX > visible.maxX + margin ||
        b.bounds.maxY < visible.minY - margin ||
        b.bounds.minY > visible.maxY + margin
      )
        continue;
      const g = this.ensureGpuBatch(i);
      if (!g) continue;
      if (g.fillVerts) solidDraws.push({ g, kind: 'fill' });
      if (g.strokeVerts) solidDraws.push({ g, kind: 'stroke' });
    }
    for (const { g, kind } of solidDraws) {
      if (kind === 'fill' && g.fill) {
        pass.setVertexBuffer(0, g.fill);
        pass.draw(g.fillVerts);
      } else if (kind === 'stroke' && g.stroke) {
        pass.setVertexBuffer(0, g.stroke);
        pass.draw(g.strokeVerts);
      }
    }

    pass.setPipeline(this.pipeHatch);
    pass.setBindGroup(0, this.bindGroups.hatch);
    for (let i = 0; i < this.batches.length; i++) {
      if (!this.batches[i].hatch.length) continue;
      const g = this.gpuBatches[i];
      if (!g?.hatch) continue;
      pass.setVertexBuffer(0, g.hatch);
      pass.setVertexBuffer(1, g.hatch);
      pass.draw(6, g.hatchInstances);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  private render2d(camera: SceneCamera, dpr: number) {
    const ctx = this.ctx2d;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#0e1116';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const s = 1 / camera.scale / dpr;
    ctx.setTransform(s, 0, 0, s, -camera.tx / camera.scale / dpr, -camera.ty / camera.scale / dpr);
    const conv = (r: [number, number, number, number]) =>
      `rgba(${Math.round(r[0] * 255)},${Math.round(r[1] * 255)},${Math.round(r[2] * 255)},${r[3]})`;
    for (const batch of this.batches) {
      if (batch.fill.length) {
        const c = batch.fill.length >= 6 ? [batch.fill[2], batch.fill[3], batch.fill[4], batch.fill[5]] : [0, 0, 0, 1];
        ctx.fillStyle = conv(c as [number, number, number, number]);
        ctx.beginPath();
        for (let i = 0; i < batch.fill.length; i += 18) {
          if (i + 17 >= batch.fill.length) break;
          ctx.moveTo(batch.fill[i], batch.fill[i + 1]);
          ctx.lineTo(batch.fill[i + 6], batch.fill[i + 7]);
          ctx.lineTo(batch.fill[i + 12], batch.fill[i + 13]);
          ctx.closePath();
        }
        ctx.fill();
      }
      if (batch.stroke.length) {
        const c = [batch.stroke[2], batch.stroke[3], batch.stroke[4], batch.stroke[5]];
        ctx.fillStyle = conv(c as [number, number, number, number]);
        ctx.beginPath();
        for (let i = 0; i < batch.stroke.length; i += 18) {
          if (i + 17 >= batch.stroke.length) break;
          ctx.moveTo(batch.stroke[i], batch.stroke[i + 1]);
          ctx.lineTo(batch.stroke[i + 6], batch.stroke[i + 7]);
          ctx.lineTo(batch.stroke[i + 12], batch.stroke[i + 13]);
          ctx.closePath();
        }
        ctx.fill();
      }
      if (batch.hatch.length) {
        const a = batch.hatchColorA;
        const b = batch.hatchColorB;
        ctx.lineWidth = batch.hatchWidth;
        ctx.lineCap = 'butt';
        for (let k = 0; k < batch.hatch.length / 4; k++) {
          const c = b && k % 2 === 1 ? b : a;
          ctx.strokeStyle = conv(c);
          ctx.beginPath();
          ctx.moveTo(batch.hatch[k * 4], batch.hatch[k * 4 + 1]);
          ctx.lineTo(batch.hatch[k * 4 + 2], batch.hatch[k * 4 + 3]);
          ctx.stroke();
        }
      }
    }
  }

  destroy() {
    this.releaseGpuBatches();
    this.msaa?.destroy();
    this.device?.destroy();
    this.device = null;
  }
}

function boundsOfBatch(batch: Batch, f: Feature): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const scan = (arr: Float32Array, stride: number) => {
    for (let i = 0; i < arr.length; i += stride) {
      const x = arr[i];
      const y = arr[i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  };
  scan(batch.fill, 6);
  scan(batch.stroke, 6);
  if (!Number.isFinite(minX)) {
    for (const ring of f.geom === 'area' ? f.rings : f.paths)
      for (const p of ring) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
  }
  const pad = 20;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}
