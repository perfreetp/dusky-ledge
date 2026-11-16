// ===== WebGL2 渲染器：相机、网格蒙皮、骨骼、Gizmo、射线拾取、穿地检测 =====
import type { Bone, MeshData } from '../core/types';
import { m4, q, v3, type Mat4, type Vec3, type Quat } from '../core/math';
import { computeOffsetMatrices, computeWorldMatrices, type Pose } from '../core/skeleton';
import { MESH_VS, MESH_FS, BASIC_VS, BASIC_FS } from './shaders';

const MAX_BONES = 48;

interface Program {
  prog: WebGLProgram;
  locs: Record<string, WebGLUniformLocation | null>;
}

interface MeshGPU {
  vao: WebGLVertexArrayObject;
  indexCount: number;
  vcount: number;
  posBuffer: WebGLBuffer;
  weightBuffer: WebGLBuffer;
  boneBuffer: WebGLBuffer;
}

export type GizmoMode = 'translate' | 'rotate';
export type PickResult =
  | { kind: 'bone'; boneId: string; point: Vec3 }
  | { kind: 'vertex'; vertex: number; point: Vec3 }
  | { kind: 'gizmo'; axis: 0 | 1 | 2 }
  | null;

export interface RenderOptions {
  showBones: boolean;
  showMesh: boolean;
  weightMode: boolean;
  showUnpainted: boolean;
  showPenetration: boolean;
  selectedBoneId: string | null;
  gizmoMode: GizmoMode;
  showGizmo: boolean;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('着色器编译失败: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

function makeProgram(gl: WebGL2RenderingContext, vs: string, fs: string): Program {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('程序链接失败: ' + gl.getProgramInfoLog(prog));
  }
  const locs: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(prog, i)!;
    const name = info.name.replace(/\[0\]$/, '');
    locs[name] = gl.getUniformLocation(prog, name);
  }
  return { prog, locs };
}

// 八面体（骨骼关节）几何
function octahedron(radius: number): { p: number[]; i: number[] } {
  const r = radius;
  const p = [
    r, 0, 0, -r, 0, 0,
    0, r, 0, 0, -r, 0,
    0, 0, r, 0, 0, -r
  ];
  const i = [
    2, 0, 4, 2, 4, 1, 2, 1, 5, 2, 5, 0,
    3, 4, 0, 3, 1, 4, 3, 5, 1, 3, 0, 5
  ];
  return { p, i };
}

function unitCylinder(): { p: number[]; i: number[] } {
  // 沿 +Y 的单位圆柱（半径1，高1），8 段
  const seg = 8;
  const p: number[] = [];
  const i: number[] = [];
  for (let ring = 0; ring <= 1; ring++) {
    const y = ring;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      p.push(Math.cos(a), y, Math.sin(a));
    }
  }
  for (let s = 0; s < seg; s++) {
    const a = s, b = seg + 1 + s;
    i.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { p, i };
}

export class Renderer {
  gl: WebGL2RenderingContext;
  private meshProg: Program;
  private basicProg: Program;
  private meshGPU: MeshGPU | null = null;
  private mesh: MeshData | null = null;
  private octGeo: { vao: WebGLVertexArrayObject; count: number };
  private cylGeo: { vao: WebGLVertexArrayObject; count: number };
  private gridVao: WebGLVertexArrayObject;
  private gridCount: number;

  // 相机
  cameraTarget: Vec3 = [0, 1.0, 0];
  cameraDistance = 3.2;
  cameraYaw = 0.6;
  cameraPitch = 0.35;
  private fov = Math.PI / 4;

  // 每帧缓存，供拾取使用
  private bones: Bone[] = [];
  private pose: Pose = { positions: new Map(), rotations: new Map() };
  private worldMats: Mat4[] = [];
  private viewProj: Mat4 = m4.identity();
  private groundY = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('当前浏览器不支持 WebGL2');
    this.gl = gl;
    this.meshProg = makeProgram(gl, MESH_VS, MESH_FS);
    this.basicProg = makeProgram(gl, BASIC_VS, BASIC_FS);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.13, 0.15, 0.18, 1);

    this.octGeo = this.uploadSimple(octahedron(1).p, octahedron(1).i);
    this.cylGeo = this.uploadSimple(unitCylinder().p, unitCylinder().i);
    const grid = this.buildGrid(6, 0.5);
    this.gridVao = grid.vao;
    this.gridCount = grid.count;
  }

  private uploadSimple(p: number[], idx: number[]) {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const pb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: idx.length };
  }

  private buildGrid(size: number, step: number) {
    const lines: number[] = [];
    const n = Math.round(size / step);
    for (let i = -n; i <= n; i++) {
      const v = i * step;
      lines.push(-size, 0, v, size, 0, v);
      lines.push(v, 0, -size, v, 0, size);
    }
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const pb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return { vao, count: lines.length / 3 };
  }

  setMesh(mesh: MeshData | null) {
    const gl = this.gl;
    if (this.meshGPU) {
      gl.deleteVertexArray(this.meshGPU.vao);
      gl.deleteBuffer(this.meshGPU.posBuffer);
      gl.deleteBuffer(this.meshGPU.weightBuffer);
      gl.deleteBuffer(this.meshGPU.boneBuffer);
    }
    this.mesh = mesh;
    if (!mesh) { this.meshGPU = null; return; }

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const nb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const weightBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, weightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.weights, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);

    const boneBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, boneBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.boneIdx, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribIPointer(3, 4, gl.INT, 0, 0);

    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    this.meshGPU = {
      vao, indexCount: mesh.indices.length,
      vcount: mesh.positions.length / 3,
      posBuffer, weightBuffer, boneBuffer
    };
  }

  /** 权重/索引变化后刷新 GPU 缓冲 */
  refreshMeshDynamic(mesh: MeshData) {
    if (!this.meshGPU || this.mesh !== mesh) { this.setMesh(mesh); return; }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.meshGPU.weightBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.weights);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.meshGPU.boneBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.boneIdx);
  }

  resize() {
    const c = this.gl.canvas as HTMLCanvasElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(c.clientWidth * dpr));
    const h = Math.max(1, Math.floor(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    this.gl.viewport(0, 0, c.width, c.height);
  }

  get cameraPos(): Vec3 {
    const cp = Math.cos(this.cameraPitch);
    return [
      this.cameraTarget[0] + this.cameraDistance * cp * Math.sin(this.cameraYaw),
      this.cameraTarget[1] + this.cameraDistance * Math.sin(this.cameraPitch),
      this.cameraTarget[2] + this.cameraDistance * cp * Math.cos(this.cameraYaw)
    ];
  }

  orbit(dx: number, dy: number) {
    this.cameraYaw -= dx * 0.008;
    this.cameraPitch = Math.max(-1.3, Math.min(1.3, this.cameraPitch + dy * 0.008));
  }

  zoom(delta: number) {
    this.cameraDistance = Math.max(0.8, Math.min(12, this.cameraDistance * (1 + delta * 0.001)));
  }

  pan(dx: number, dy: number) {
    const eye = this.cameraPos;
    const fwd = v3.normalize(v3.sub(this.cameraTarget, eye));
    const right = v3.normalize(v3.cross(fwd, [0, 1, 0]));
    const up = v3.cross(right, fwd);
    const s = this.cameraDistance * 0.0015;
    this.cameraTarget = v3.add(this.cameraTarget, v3.add(v3.scale(right, -dx * s), v3.scale(up, dy * s)));
  }

  resetCamera() {
    this.cameraTarget = [0, 1, 0];
    this.cameraDistance = 3.2;
    this.cameraYaw = 0.6;
    this.cameraPitch = 0.35;
  }

  private computeSkinMatrices(): Mat4[] {
    const offsets = computeOffsetMatrices(this.bones);
    return this.bones.map((_, i) => m4.multiply(this.worldMats[i], offsets[i]));
  }

  render(bones: Bone[], pose: Pose, opts: RenderOptions, groundY: number) {
    const gl = this.gl;
    this.bones = bones;
    this.pose = pose;
    this.groundY = groundY;
    this.resize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = (gl.canvas as HTMLCanvasElement).width / (gl.canvas as HTMLCanvasElement).height;
    const proj = m4.perspective(this.fov, aspect, 0.05, 100);
    const view = m4.lookAt(this.cameraPos, this.cameraTarget, [0, 1, 0]);
    this.viewProj = m4.multiply(proj, view);
    this.worldMats = computeWorldMatrices(bones, pose);

    this.drawGrid(groundY);

    if (opts.showMesh && this.meshGPU && this.mesh) {
      this.drawMesh(opts);
    }
    if (opts.showBones) {
      this.drawBones(opts.selectedBoneId);
    }
    if (opts.showGizmo && opts.selectedBoneId) {
      this.drawGizmo(opts.selectedBoneId, opts.gizmoMode);
    }
  }

  private setUniforms(p: Program, entries: [string, number | Float32Array | boolean | number[]][]) {
    const gl = this.gl;
    for (const [name, val] of entries) {
      const loc = p.locs[name];
      if (!loc) continue;
      if (typeof val === 'boolean') gl.uniform1i(loc, val ? 1 : 0);
      else if (typeof val === 'number') gl.uniform1f(loc, val);
      else if (val instanceof Float32Array) {
        if (val.length === 16) gl.uniformMatrix4fv(loc, false, val);
        else gl.uniform3fv(loc, val);
      } else gl.uniform3fv(loc, val);
    }
  }

  private drawGrid(groundY: number) {
    const gl = this.gl;
    gl.useProgram(this.basicProg.prog);
    gl.uniformMatrix4fv(this.basicProg.locs.uViewProj, false, this.viewProj);
    const model = m4.fromTranslation([0, groundY, 0]);
    gl.uniformMatrix4fv(this.basicProg.locs.uModel, false, model);
    gl.uniform4f(this.basicProg.locs.uColor, 0.35, 0.38, 0.42, 1);
    gl.bindVertexArray(this.gridVao);
    gl.drawArrays(gl.LINES, 0, this.gridCount);
    gl.bindVertexArray(null);
  }

  private drawMesh(opts: RenderOptions) {
    const gl = this.gl;
    const gpu = this.meshGPU!;
    gl.useProgram(this.meshProg.prog);
    const p = this.meshProg;
    gl.uniformMatrix4fv(p.locs.uViewProj, false, this.viewProj);
    gl.uniformMatrix4fv(p.locs.uModel, false, m4.identity());

    const colors = new Float32Array(MAX_BONES * 3);
    this.bones.forEach((b, i) => {
      if (i >= MAX_BONES) return;
      colors[i * 3] = b.color[0]; colors[i * 3 + 1] = b.color[1]; colors[i * 3 + 2] = b.color[2];
    });
    gl.uniform3fv(p.locs.uBoneColors, colors);
    gl.uniform3f(p.locs.uBaseColor, 0.72, 0.74, 0.78);
    gl.uniform1i(p.locs.uSkinned, 1);
    gl.uniform1i(p.locs.uWeightMode, opts.weightMode ? 1 : 0);
    gl.uniform1i(p.locs.uShowUnpainted, opts.showUnpainted ? 1 : 0);
    gl.uniform1i(p.locs.uShowPenetration, opts.showPenetration ? 1 : 0);
    gl.uniform1f(p.locs.uGroundY, this.groundY);
    gl.uniform3fv(p.locs.uCameraPos, new Float32Array(this.cameraPos));

    const skins = this.computeSkinMatrices();
    const flat = new Float32Array(MAX_BONES * 16);
    skins.forEach((m, i) => { if (i < MAX_BONES) flat.set(m, i * 16); });
    gl.uniformMatrix4fv(p.locs.uBones, false, flat);

    gl.bindVertexArray(gpu.vao);
    gl.drawElements(gl.TRIANGLES, gpu.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }

  private drawBones(selectedId: string | null) {
    const gl = this.gl;
    gl.useProgram(this.basicProg.prog);
    gl.uniformMatrix4fv(this.basicProg.locs.uViewProj, false, this.viewProj);
    const byId = new Map(this.bones.map((b) => [b.id, b]));

    for (let i = 0; i < this.bones.length; i++) {
      const b = this.bones[i];
      const wpos = m4.getTranslation(this.worldMats[i]);
      const selected = b.id === selectedId;

      // 关节八面体
      const scale = m4.identity();
      const r = selected ? 0.055 : 0.038;
      scale[0] = r; scale[5] = r; scale[10] = r;
      const model = m4.multiply(m4.fromTranslation(wpos), scale);
      gl.uniformMatrix4fv(this.basicProg.locs.uModel, false, model);
      gl.uniform4f(this.basicProg.locs.uColor, b.color[0], b.color[1], b.color[2], 1);
      gl.bindVertexArray(this.octGeo.vao);
      gl.drawElements(gl.TRIANGLES, this.octGeo.count, gl.UNSIGNED_SHORT, 0);

      // 骨段圆柱：从父关节连到本关节
      if (b.parentId && byId.has(b.parentId)) {
        const pi = this.bones.findIndex((x) => x.id === b.parentId);
        const p0 = m4.getTranslation(this.worldMats[pi]);
        const dir = v3.sub(wpos, p0);
        const len = v3.len(dir);
        if (len > 1e-5) {
          const yAxis: Vec3 = [0, 1, 0];
          const n = v3.normalize(dir);
          const axis = v3.cross(yAxis, n);
          const ang = Math.acos(Math.max(-1, Math.min(1, v3.dot(yAxis, n))));
          const rotQ: Quat = v3.len(axis) < 1e-5 ? q.identity() : q.normalize([axis[0], axis[1], axis[2], 0].map((x, k) => k < 3 ? x * Math.sin(ang / 2) : Math.cos(ang / 2)) as Quat);
          const s = m4.identity();
          const rad = selected ? 0.018 : 0.012;
          s[0] = rad; s[5] = len; s[10] = rad;
          const cylModel = m4.multiply(m4.multiply(m4.fromTranslation(p0), m4.fromQuat(rotQ)), s);
          gl.uniformMatrix4fv(this.basicProg.locs.uModel, false, cylModel);
          gl.uniform4f(this.basicProg.locs.uColor, b.color[0] * 0.7, b.color[1] * 0.7, b.color[2] * 0.7, 1);
          gl.bindVertexArray(this.cylGeo.vao);
          gl.drawElements(gl.TRIANGLES, this.cylGeo.count, gl.UNSIGNED_SHORT, 0);
        }
      }
    }
    gl.bindVertexArray(null);
  }

  private drawGizmo(boneId: string, mode: GizmoMode) {
    const gl = this.gl;
    const idx = this.bones.findIndex((b) => b.id === boneId);
    if (idx < 0) return;
    const wpos = m4.getTranslation(this.worldMats[idx]);
    gl.useProgram(this.basicProg.prog);
    gl.uniformMatrix4fv(this.basicProg.locs.uViewProj, false, this.viewProj);

    if (mode === 'translate') {
      const axes: [Vec3, [number, number, number, number]][] = [
        [[1, 0, 0], [0.95, 0.3, 0.3, 1]],
        [[0, 1, 0], [0.3, 0.9, 0.3, 1]],
        [[0, 0, 1], [0.3, 0.5, 0.95, 1]]
      ];
      for (const [dir, color] of axes) {
        const len = 0.35;
        const model = this.cylinderBetween(wpos, v3.add(wpos, v3.scale(dir, len)), 0.008);
        gl.uniformMatrix4fv(this.basicProg.locs.uModel, false, model);
        gl.uniform4f(this.basicProg.locs.uColor, ...color);
        gl.bindVertexArray(this.cylGeo.vao);
        gl.drawElements(gl.TRIANGLES, this.cylGeo.count, gl.UNSIGNED_SHORT, 0);
      }
    } else {
      // 旋转模式：三个彩色圆环用线段近似
      const rings: [Vec3, [number, number, number, number]][] = [
        [[1, 0, 0], [0.95, 0.3, 0.3, 1]],
        [[0, 1, 0], [0.3, 0.9, 0.3, 1]],
        [[0, 0, 1], [0.3, 0.5, 0.95, 1]]
      ];
      const pts: number[] = [];
      const radius = 0.22;
      for (const [axis, color] of rings) {
        const ref: Vec3 = Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const u = v3.normalize(v3.cross(axis, ref));
        const v = v3.normalize(v3.cross(axis, u));
        for (let k = 0; k <= 32; k++) {
          const a0 = (k / 32) * Math.PI * 2;
          const a1 = ((k + 1) / 32) * Math.PI * 2;
          const p0 = v3.add(wpos, v3.add(v3.scale(u, Math.cos(a0) * radius), v3.scale(v, Math.sin(a0) * radius)));
          const p1 = v3.add(wpos, v3.add(v3.scale(u, Math.cos(a1) * radius), v3.scale(v, Math.sin(a1) * radius)));
          pts.push(...p0, ...p1);
        }
        const vao = this.tempLines(pts);
        gl.uniformMatrix4fv(this.basicProg.locs.uModel, false, m4.identity());
        gl.uniform4f(this.basicProg.locs.uColor, ...color);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, pts.length / 3);
        gl.deleteVertexArray(vao);
      }
    }
    gl.bindVertexArray(null);
  }

  private tempLineBuffer: WebGLBuffer | null = null;
  private tempLines(points: number[]): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    if (!this.tempLineBuffer) this.tempLineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tempLineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    return vao;
  }

  private cylinderBetween(p0: Vec3, p1: Vec3, radius: number): Mat4 {
    const dir = v3.sub(p1, p0);
    const len = v3.len(dir);
    const n = v3.normalize(dir);
    const axis = v3.cross([0, 1, 0], n);
    const ang = Math.acos(Math.max(-1, Math.min(1, v3.dot([0, 1, 0], n))));
    const rotQ: Quat = v3.len(axis) < 1e-5
      ? q.identity()
      : q.normalize([axis[0] * Math.sin(ang / 2), axis[1] * Math.sin(ang / 2), axis[2] * Math.sin(ang / 2), Math.cos(ang / 2)]);
    const s = m4.identity();
    s[0] = radius; s[5] = len; s[10] = radius;
    return m4.multiply(m4.multiply(m4.fromTranslation(p0), m4.fromQuat(rotQ)), s);
  }

  // ===== 射线拾取 =====
  screenRay(clientX: number, clientY: number): { origin: Vec3; dir: Vec3 } {
    const c = this.gl.canvas as HTMLCanvasElement;
    const rect = c.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    const invVP = m4.invert(this.viewProj);
    const near = m4.transformPoint(invVP, [nx, ny, -1]);
    const far = m4.transformPoint(invVP, [nx, ny, 1]);
    const origin = this.cameraPos;
    const dir = v3.normalize(v3.sub(far, near));
    return { origin, dir };
  }

  private raySphere(origin: Vec3, dir: Vec3, center: Vec3, radius: number): number {
    const oc = v3.sub(origin, center);
    const b = v3.dot(oc, dir);
    const cc = v3.dot(oc, oc) - radius * radius;
    const disc = b * b - cc;
    if (disc < 0) return Infinity;
    const t = -b - Math.sqrt(disc);
    return t > 0 ? t : Infinity;
  }

  pick(clientX: number, clientY: number, wantVertex: boolean): PickResult {
    if (!this.worldMats.length) return null;
    const { origin, dir } = this.screenRay(clientX, clientY);

    let best: PickResult = null;
    let bestT = Infinity;

    if (wantVertex && this.mesh) {
      const mesh = this.mesh;
      const skins = this.computeSkinMatrices();
      for (let vi = 0; vi < this.meshGPU!.vcount; vi++) {
        let p: Vec3 = [mesh.positions[vi * 3], mesh.positions[vi * 3 + 1], mesh.positions[vi * 3 + 2]];
        // 蒙皮到当前姿势
        let out: Vec3 = [0, 0, 0];
        for (let k = 0; k < 4; k++) {
          const bi = mesh.boneIdx[vi * 4 + k];
          const w = mesh.weights[vi * 4 + k];
          if (bi >= 0 && w > 0) {
            const wp = m4.transformPoint(skins[bi], p);
            out = v3.add(out, v3.scale(wp, w));
          }
        }
        if (v3.len(out) < 1e-6) out = p;
        const t = this.raySphere(origin, dir, out, 0.03);
        if (t < bestT) { bestT = t; best = { kind: 'vertex', vertex: vi, point: out }; }
      }
    }

    for (let i = 0; i < this.bones.length; i++) {
      const center = m4.getTranslation(this.worldMats[i]);
      const t = this.raySphere(origin, dir, center, 0.07);
      if (t < bestT) { bestT = t; best = { kind: 'bone', boneId: this.bones[i].id, point: center }; }
    }
    return best;
  }

  /** 拾取 Gizmo 轴（translate 模式） */
  pickGizmoAxis(clientX: number, clientY: number, boneId: string): 0 | 1 | 2 | null {
    const idx = this.bones.findIndex((b) => b.id === boneId);
    if (idx < 0) return null;
    const { origin, dir } = this.screenRay(clientX, clientY);
    const wpos = m4.getTranslation(this.worldMats[idx]);
    const axes: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    let best: 0 | 1 | 2 | null = null;
    let bestT = Infinity;
    axes.forEach((a, ai) => {
      const end = v3.add(wpos, v3.scale(a, 0.35));
      // 射线到线段
      const ab = v3.sub(end, wpos);
      const ao = v3.sub(origin, wpos);
      const t = Math.max(0, Math.min(1, -v3.dot(ao, v3.scale(ab, 1 / (v3.dot(ab, ab) || 1)))));
      const closest = v3.add(wpos, v3.scale(ab, t));
      const hit = this.raySphere(origin, dir, closest, 0.05);
      if (hit < bestT) { bestT = hit; best = ai as 0 | 1 | 2; }
    });
    return best;
  }

  /** Gizmo 拖拽：把鼠标移动投影到轴（平移）或绕轴旋转，返回新的局部 pos/rot */
  dragGizmo(
    boneId: string,
    axis: 0 | 1 | 2 | null,
    mode: GizmoMode,
    startX: number, startY: number,
    curX: number, curY: number
  ): { pos: Vec3; rot: Quat } | null {
    const idx = this.bones.findIndex((b) => b.id === boneId);
    if (idx < 0) return null;
    const bone = this.bones[idx];
    const curPos = this.pose.positions.get(bone.id) ?? bone.localPos;
    const curRot = this.pose.rotations.get(bone.id) ?? bone.localRot;
    const wpos = m4.getTranslation(this.worldMats[idx]);

    if (mode === 'translate' && axis !== null) {
      const ax: Vec3 = axis === 0 ? [1, 0, 0] : axis === 1 ? [0, 1, 0] : [0, 0, 1];
      const r0 = this.screenRay(startX, startY);
      const r1 = this.screenRay(curX, curY);
      // 在过关节、垂直于视线的平面上求射线交点，再投影到轴
      const planeN = v3.normalize(v3.sub(r0.origin, wpos));
      const intersect = (r: { origin: Vec3; dir: Vec3 }) => {
        const denom = v3.dot(planeN, r.dir);
        if (Math.abs(denom) < 1e-5) return wpos;
        const t = v3.dot(v3.sub(wpos, r.origin), planeN) / denom;
        return v3.add(r.origin, v3.scale(r.dir, t));
      };
      const p0 = intersect(r0);
      const p1 = intersect(r1);
      const delta = v3.dot(v3.sub(p1, p0), ax);
      const worldNew = v3.add(wpos, v3.scale(ax, delta));
      // 转回局部（父世界矩阵取当前姿势）
      const local = bone.parentId
        ? m4.transformPoint(m4.invert(this.worldMats[this.bones.findIndex((b) => b.id === bone.parentId)]), worldNew)
        : worldNew;
      return { pos: local, rot: curRot };
    }

    if (mode === 'rotate') {
      const dx = curX - startX;
      const ang = dx * 0.01;
      const ax: Vec3 = axis !== null
        ? (axis === 0 ? [1, 0, 0] : axis === 1 ? [0, 1, 0] : [0, 0, 1])
        : [0, 1, 0];
      const dq: Quat = [ax[0] * Math.sin(ang / 2), ax[1] * Math.sin(ang / 2), ax[2] * Math.sin(ang / 2), Math.cos(ang / 2)];
      return { pos: curPos, rot: q.normalize(q.mul(dq, curRot)) };
    }
    return null;
  }

  // ===== 穿地检测：返回低于地面的顶点数与最低点 =====
  penetrationStats(mesh: MeshData, bones: Bone[], pose: Pose, groundY: number) {
    const skins = (() => {
      const wm = computeWorldMatrices(bones, pose);
      const offsets = computeOffsetMatrices(bones);
      return bones.map((_, i) => m4.multiply(wm[i], offsets[i]));
    })();
    let count = 0;
    let minY = Infinity;
    const n = mesh.positions.length / 3;
    for (let vi = 0; vi < n; vi++) {
      const p: Vec3 = [mesh.positions[vi * 3], mesh.positions[vi * 3 + 1], mesh.positions[vi * 3 + 2]];
      let out: Vec3 = [0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const bi = mesh.boneIdx[vi * 4 + k];
        const w = mesh.weights[vi * 4 + k];
        if (bi >= 0 && w > 0) out = v3.add(out, v3.scale(m4.transformPoint(skins[bi], p), w));
      }
      if (v3.len(out) < 1e-6) out = p;
      minY = Math.min(minY, out[1]);
      if (out[1] < groundY - 1e-4) count++;
    }
    return { count, minY };
  }
}
