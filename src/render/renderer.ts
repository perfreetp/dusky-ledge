import type { MeshResult } from '../core/mesher';
import type { Dims } from '../core/layers';
import { getMaterial, hexToRgb } from '../core/materials';

const VERT_SRC = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
uniform mat4 uViewProj;
out vec3 vNormal;
out vec3 vWorld;
void main() {
  vNormal = aNormal;
  vWorld = aPos;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vWorld;
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform float uAlpha;
uniform vec3 uCamera;
uniform float uMeshGrid;
out vec4 outColor;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.71, 0.37));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 n = normalize(vNormal);
  float diffuse = max(dot(n, normalize(uLightDir)), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  float grain = hash(floor(vWorld * 3.7)) * 0.14;
  float edge = 0.0;
  if (uMeshGrid > 0.5) {
    vec3 fw = max(fwidth(vWorld), vec3(1e-4));
    vec3 grid = abs(fract(vWorld - 0.5) - 0.5) / fw;
    float line = min(min(grid.x, grid.y), grid.z);
    edge = 1.0 - smoothstep(0.0, 1.25, line);
  }
  float ao = 1.0 - edge * 0.20;
  float light = 0.40 + 0.60 * diffuse * (0.70 + 0.30 * hemi);
  vec3 col = uColor * (light * (0.92 + grain) * ao);
  float dist = length(vWorld - uCamera);
  float fog = clamp(1.0 - (dist - 10.0) / 200.0, 0.60, 1.0);
  col *= fog;
  outColor = vec4(col, uAlpha);
}`;

interface GpuBatch {
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer | null;
  mode: number;
  count: number;
  quads: number;
  color: [number, number, number];
  alpha: number;
}

export interface Box {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  color?: [number, number, number];
  alpha?: number;
}

export interface RenderOptions {
  showGround?: boolean;
  meshGrid?: boolean;
  highlight?: Box | null;
  /** 悬停格 */
  hover?: Box | null;
  selection?: Box | null;
  ghost?: Box | null;
}

/**
 * WebGL2 渲染器
 * - 单面剔除（gl.CULL_FACE / BACK），不会绘制朝向内部的背面
 * - 同材质合并：贪心网格化后每个材质一个 VBO，一次 drawElements
 */
export class VoxelRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private meshes: GpuBatch[] = [];
  private overlays: GpuBatch[] = [];
  private dynamic: GpuBatch | null = null;
  private dims: Dims = { nx: 1, ny: 1, nz: 1 };
  private disposed = false;
  /** 最近一帧绘制的三角面数（仅网格，不含辅助线框） */
  triangles = 0;
  drawCalls = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('当前浏览器不支持 WebGL2，请使用新版 Chrome / Edge / Firefox。');
    this.gl = gl;
    this.initProgram();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.078, 0.082, 0.086, 1);
  }

  private initProgram(): void {
    const gl = this.gl;
    const compile = (type: number, src: string): WebGLShader => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('着色器编译失败：' + log);
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('着色器链接失败：' + gl.getProgramInfoLog(prog));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.program = prog;
    for (const name of ['uViewProj', 'uColor', 'uLightDir', 'uAlpha', 'uCamera', 'uMeshGrid']) {
      this.loc[name] = gl.getUniformLocation(prog, name);
    }
  }

  setDims(dims: Dims): void {
    this.dims = { ...dims };
  }

  private createBatch(
    data: Float32Array,
    indices: Uint32Array | null,
    color: [number, number, number],
    alpha: number,
    mode: 'tri' | 'line',
  ): GpuBatch {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    let ibo: WebGLBuffer | null = null;
    if (indices) {
      ibo = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }
    gl.bindVertexArray(null);
    return {
      vao,
      vbo,
      ibo,
      mode: mode === 'tri' ? gl.TRIANGLES : gl.LINES,
      count: indices ? indices.length : data.length / 6,
      quads: indices ? indices.length / 6 : 0,
      color,
      alpha,
    };
  }

  private destroyBatch(b: GpuBatch): void {
    const gl = this.gl;
    gl.deleteVertexArray(b.vao);
    gl.deleteBuffer(b.vbo);
    if (b.ibo) gl.deleteBuffer(b.ibo);
  }

  /** 上传主网格：每材质一张合并网格 */
  uploadMesh(mesh: MeshResult): void {
    for (const b of this.meshes) this.destroyBatch(b);
    this.meshes = [];
    for (const batch of mesh.batches) {
      if (!batch.quadCount) continue;
      const color = hexToRgb(getMaterial(batch.material).hex);
      this.meshes.push(this.createBatch(batch.vertices, batch.indices, color, 1, 'tri'));
    }
    this.meshes.sort((a, b) => a.color[0] - b.color[0]);
  }

  /**
   * 高亮覆盖层：单独一组半透明网格（框选预览、被隐藏体素的“显形”显示）。
   * 传入 tint 时统一着色，否则按土色着色。
   */
  uploadOverlay(mesh: MeshResult, opts: { color?: [number, number, number]; alpha?: number } = {}, append = false): void {
    if (!append) this.clearOverlay();
    const alpha = opts.alpha ?? 0.45;
    for (const batch of mesh.batches) {
      if (!batch.quadCount) continue;
      const color = opts.color ?? hexToRgb(getMaterial(batch.material).hex);
      this.overlays.push(this.createBatch(batch.vertices, batch.indices, color, alpha, 'tri'));
    }
  }

  clearOverlay(): void {
    for (const b of this.overlays) this.destroyBatch(b);
    this.overlays = [];
  }

  resize(): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      return true;
    }
    return false;
  }

  render(
    viewProj: Float32Array,
    cameraPos: { x: number; y: number; z: number },
    opts: RenderOptions = {},
  ): void {
    if (this.disposed) return;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.loc.uViewProj!, false, viewProj);
    gl.uniform3f(this.loc.uLightDir!, 0.42, 1.0, 0.38);
    gl.uniform3f(this.loc.uCamera!, cameraPos.x, cameraPos.y, cameraPos.z);
    gl.uniform1f(this.loc.uAlpha!, 1);
    gl.uniform1f(this.loc.uMeshGrid!, opts.meshGrid === false ? 0 : 1);

    let calls = 0;
    if (opts.showGround !== false) {
      this.drawGround();
      calls++;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    let tris = 0;
    for (const b of this.meshes) {
      gl.uniform3f(this.loc.uColor!, b.color[0], b.color[1], b.color[2]);
      gl.bindVertexArray(b.vao);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_INT, 0);
      tris += b.quads * 2;
      calls++;
    }

    if (this.overlays.length) {
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      for (const ov of this.overlays) {
        gl.uniform3f(this.loc.uColor!, ov.color[0], ov.color[1], ov.color[2]);
        gl.uniform1f(this.loc.uAlpha!, ov.alpha);
        gl.uniform1f(this.loc.uMeshGrid!, 0);
        gl.bindVertexArray(ov.vao);
        gl.drawElements(gl.TRIANGLES, ov.count, gl.UNSIGNED_INT, 0);
        calls++;
      }
      gl.enable(gl.CULL_FACE);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    for (const box of [opts.highlight, opts.hover, opts.selection, opts.ghost]) {
      if (!box || this.disposed) continue;
      this.drawBox(box);
      calls += 2;
    }

    gl.bindVertexArray(null);
    this.triangles = tris;
    this.drawCalls = calls;
  }

  private drawGround(): void {
    const gl = this.gl;
    const { nx, nz } = this.dims;
    const pad = 1.2;
    const data = new Float32Array([
      -pad, 0, -pad, 0, 1, 0,
      nx + pad, 0, -pad, 0, 1, 0,
      nx + pad, 0, nz + pad, 0, 1, 0,
      -pad, 0, -pad, 0, 1, 0,
      nx + pad, 0, nz + pad, 0, 1, 0,
      -pad, 0, nz + pad, 0, 1, 0,
    ]);
    this.drawDynamic(data, null, 'tri', [0.132, 0.138, 0.142], 1, false);

    const lines: number[] = [];
    const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
      lines.push(ax, ay, az, 0, 1, 0, bx, by, bz, 0, 1, 0);
    };
    for (let x = 4; x < nx; x += 4) seg(x, 0.004, 0, x, 0.004, nz);
    for (let z = 4; z < nz; z += 4) seg(0, 0.004, z, nx, 0.004, z);
    // 探方边框
    seg(0, 0.006, 0, nx, 0.006, 0);
    seg(nx, 0.006, 0, nx, 0.006, nz);
    seg(nx, 0.006, nz, 0, 0.006, nz);
    seg(0, 0.006, nz, 0, 0.006, 0);
    // 镜像中轴
    seg(nx / 2, 0.006, 0, nx / 2, 0.006, nz);
    this.drawDynamic(new Float32Array(lines), null, 'line', [0.38, 0.44, 0.40], 1, false);
  }

  private boxEdges(b: Box): Float32Array {
    const c: [number, number, number][] = [
      [b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y0, b.z1],
      [b.x1, b.y0, b.z1], [b.x0, b.y0, b.z1], [b.x0, b.y0, b.z1], [b.x0, b.y0, b.z0],
      [b.x0, b.y1, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, b.z1],
      [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1], [b.x0, b.y1, b.z1], [b.x0, b.y1, b.z0],
      [b.x0, b.y0, b.z0], [b.x0, b.y1, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0],
      [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y0, b.z1], [b.x0, b.y1, b.z1],
    ];
    const out = new Float32Array(c.length * 6);
    for (let i = 0; i < c.length; i++) {
      out[i * 6] = c[i][0];
      out[i * 6 + 1] = c[i][1];
      out[i * 6 + 2] = c[i][2];
      out[i * 6 + 3] = 0;
      out[i * 6 + 4] = 1;
      out[i * 6 + 5] = 0;
    }
    return out;
  }

  private drawBox(b: Box): void {
    const gl = this.gl;
    const color = b.color ?? [1.0, 0.78, 0.22];
    const e = 0.02;
    const { x0, y0, z0, x1, y1, z1 } = b;
    // 六个面的半透明填充
    const faces: number[] = [];
    const quad = (a: number[], c: number[], d: number[], f: number[]) => {
      faces.push(...a, 0, 1, 0, ...c, 0, 1, 0, ...d, 0, 1, 0, ...a, 0, 1, 0, ...d, 0, 1, 0, ...f, 0, 1, 0);
    };
    void e;
    quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
    quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]);
    quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]);
    quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]);
    quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);

    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.uniform1f(this.loc.uAlpha!, b.alpha ?? 0.16);
    gl.uniform1f(this.loc.uMeshGrid!, 0);
    this.drawDynamic(new Float32Array(faces), null, 'tri', color, b.alpha ?? 0.16, false);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    this.drawDynamic(this.boxEdges(b), null, 'line', color, 1, false);
  }

  private drawDynamic(
    data: Float32Array,
    indices: Uint32Array | null,
    mode: 'tri' | 'line',
    color: [number, number, number],
    alpha: number,
    depth: boolean,
  ): void {
    if (this.disposed || data.length === 0) return;
    const gl = this.gl;
    if (!this.dynamic) {
      this.dynamic = this.createBatch(data, indices, color, alpha, mode);
    } else {
      const b = this.dynamic;
      if (b.mode !== (mode === 'tri' ? gl.TRIANGLES : gl.LINES)) {
        this.destroyBatch(b);
        this.dynamic = this.createBatch(data, indices, color, alpha, mode);
      } else {
        gl.bindVertexArray(b.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, b.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        b.count = data.length / 6;
      }
    }
    const b = this.dynamic;
    gl.bindVertexArray(b.vao);
    gl.uniform3f(this.loc.uColor!, color[0], color[1], color[2]);
    gl.uniform1f(this.loc.uAlpha!, alpha);
    if (!depth) gl.disable(gl.DEPTH_TEST);
    if (mode === 'line') gl.disable(gl.CULL_FACE);
    gl.drawArrays(mode === 'tri' ? gl.TRIANGLES : gl.LINES, 0, data.length / 6);
    if (!depth) gl.enable(gl.DEPTH_TEST);
    if (mode === 'line') gl.enable(gl.CULL_FACE);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    for (const b of this.meshes) this.destroyBatch(b);
    this.meshes = [];
    for (const ov of this.overlays) this.destroyBatch(ov);
    this.overlays = [];
    if (this.dynamic) this.destroyBatch(this.dynamic);
    this.dynamic = null;
    gl.deleteProgram(this.program);
  }
}

/** 供 UI 构造单格高亮盒 */
export function voxelBox(x: number, y: number, z: number, color?: [number, number, number], alpha = 0.35): Box {
  return { x0: x, y0: y, z0: z, x1: x + 1, y1: y + 1, z1: z + 1, color, alpha };
}
