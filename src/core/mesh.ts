// ===== 网格：程序化人形网格、OBJ 导入、权重工具 =====
import type { Bone, MeshData } from './types';
import { v3, type Vec3 } from './math';
import { boneWorldPositions } from './skeleton';

interface GeoBuilder {
  positions: number[];
  normals: number[];
  indices: number[];
}

function newBuilder(): GeoBuilder {
  return { positions: [], normals: [], indices: [] };
}

function addSphere(g: GeoBuilder, center: Vec3, radius: number, seg = 10, rings = 7) {
  const base = g.positions.length / 3;
  for (let r = 0; r <= rings; r++) {
    const theta = (r / rings) * Math.PI;
    for (let s = 0; s <= seg; s++) {
      const phi = (s / seg) * Math.PI * 2;
      const nx = Math.sin(theta) * Math.cos(phi);
      const ny = Math.cos(theta);
      const nz = Math.sin(theta) * Math.sin(phi);
      g.positions.push(center[0] + nx * radius, center[1] + ny * radius, center[2] + nz * radius);
      g.normals.push(nx, ny, nz);
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < seg; s++) {
      const a = base + r * (seg + 1) + s;
      const b = a + seg + 1;
      g.indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
}

function addCylinder(g: GeoBuilder, p0: Vec3, p1: Vec3, radius: number, seg = 10) {
  const axis = v3.sub(p1, p0);
  const len = v3.len(axis) || 0.0001;
  const dir = v3.scale(axis, 1 / len);
  const ref: Vec3 = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = v3.normalize(v3.cross(dir, ref));
  const v = v3.normalize(v3.cross(u, dir));
  const base = g.positions.length / 3;
  for (let ring = 0; ring <= 1; ring++) {
    const c = ring === 0 ? p0 : p1;
    for (let s = 0; s <= seg; s++) {
      const phi = (s / seg) * Math.PI * 2;
      const n = v3.add(v3.scale(u, Math.cos(phi)), v3.scale(v, Math.sin(phi)));
      g.positions.push(c[0] + n[0] * radius, c[1] + n[1] * radius, c[2] + n[2] * radius);
      g.normals.push(n[0], n[1], n[2]);
    }
  }
  for (let s = 0; s < seg; s++) {
    const a = base + s, b = base + (seg + 1) + s;
    g.indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // 两端封口
  const cap0 = g.positions.length / 3;
  g.positions.push(...p0); g.normals.push(...v3.scale(dir, -1));
  const cap1 = g.positions.length / 3;
  g.positions.push(...p1); g.normals.push(...dir);
  for (let s = 0; s < seg; s++) {
    g.indices.push(cap0, base + s + 1, base + s);
    const o = base + (seg + 1);
    g.indices.push(cap1, o + s, o + s + 1);
  }
}

function radiusFor(boneName: string): number {
  if (boneName.includes('大腿') || boneName.includes('小腿')) return 0.075;
  if (boneName.includes('上臂') || boneName.includes('前臂')) return 0.055;
  if (boneName.includes('脚')) return 0.06;
  if (boneName.includes('手')) return 0.045;
  if (boneName.includes('头')) return 0.115;
  if (boneName.includes('颈')) return 0.05;
  if (boneName.includes('锁骨')) return 0.04;
  return 0.10; // 躯干
}

/** 依据骨架生成低模人形网格，并按最近骨段自动刷初始权重 */
export function buildDefaultMesh(bones: Bone[]): MeshData {
  const g = newBuilder();
  const world = boneWorldPositions(bones);
  const byId = new Map(bones.map((b) => [b.id, b]));

  for (const b of bones) {
    const p1 = world.get(b.id)!;
    if (b.parentId && byId.has(b.parentId)) {
      const p0 = world.get(b.parentId)!;
      addCylinder(g, p0, p1, radiusFor(b.name));
    }
    if (b.name.includes('头')) addSphere(g, v3.add(p1, [0, 0.06, 0]), 0.13, 12, 9);
    if (b.name === '骨盆' || b.name === '胸腔') addSphere(g, p1, radiusFor(b.name) * 1.15, 10, 7);
    if (b.name.includes('手')) addSphere(g, p1, 0.05, 8, 6);
    if (b.name.includes('脚')) addSphere(g, p1, 0.065, 8, 6);
  }

  const vcount = g.positions.length / 3;
  const mesh: MeshData = {
    name: '默认人形网格',
    positions: new Float32Array(g.positions),
    normals: new Float32Array(g.normals),
    indices: new Uint32Array(g.indices),
    weights: new Float32Array(vcount * 4),
    boneIdx: new Int32Array(vcount * 4).fill(-1)
  };
  autoWeight(mesh, bones);
  return mesh;
}

// 点到线段距离平方
function distToSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = v3.sub(b, a);
  const t = Math.max(0, Math.min(1, v3.dot(v3.sub(p, a), ab) / (v3.dot(ab, ab) || 1)));
  return v3.len(v3.sub(p, v3.add(a, v3.scale(ab, t))));
}

/** 每顶点取最近骨段，权重 100% 给该骨骼 */
export function autoWeight(mesh: MeshData, bones: Bone[]) {
  const world = boneWorldPositions(bones);
  const vcount = mesh.positions.length / 3;
  for (let i = 0; i < vcount; i++) {
    const p: Vec3 = [mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]];
    let best = 0;
    let bestD = Infinity;
    bones.forEach((b, bi) => {
      const p1 = world.get(b.id)!;
      const p0 = b.parentId ? world.get(b.parentId)! : p1;
      const d = distToSegment(p, p0, p1);
      if (d < bestD) { bestD = d; best = bi; }
    });
    mesh.boneIdx[i * 4] = best;
    mesh.weights[i * 4] = 1;
    mesh.boneIdx[i * 4 + 1] = -1;
    mesh.weights[i * 4 + 1] = 0;
  }
}

// ===== OBJ 导入（v / vn / f，支持 v/vt/vn 全格式）=====
export function parseOBJ(text: string, name: string): MeshData {
  const pos: number[] = [];
  const nrm: number[] = [];
  const outP: number[] = [];
  const outN: number[] = [];
  const idx: number[] = [];
  const remap = new Map<string, number>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/);
      pos.push(+x, +y, +z);
    } else if (line.startsWith('vn ')) {
      const [, x, y, z] = line.split(/\s+/);
      nrm.push(+x, +y, +z);
    } else if (line.startsWith('f ')) {
      const parts = line.split(/\s+/).slice(1);
      const face: number[] = [];
      for (const part of parts) {
        const tokens = part.split('/');
        const vi = parseInt(tokens[0], 10) - 1;
        const ni = tokens[2] ? parseInt(tokens[2], 10) - 1 : -1;
        const key = `${vi}_${ni}`;
        let oi = remap.get(key);
        if (oi === undefined) {
          oi = outP.length / 3;
          remap.set(key, oi);
          outP.push(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]);
          if (ni >= 0) outN.push(nrm[ni * 3], nrm[ni * 3 + 1], nrm[ni * 3 + 2]);
          else outN.push(0, 1, 0);
        }
        face.push(oi);
      }
      for (let i = 1; i < face.length - 1; i++) idx.push(face[0], face[i], face[i + 1]);
    }
  }

  const vcount = outP.length / 3;
  return {
    name,
    positions: new Float32Array(outP),
    normals: new Float32Array(outN),
    indices: new Uint32Array(idx),
    weights: new Float32Array(vcount * 4),
    boneIdx: new Int32Array(vcount * 4).fill(-1)
  };
}

// ===== 权重工具 =====
export function weightSum(mesh: MeshData, vertex: number): number {
  let s = 0;
  for (let k = 0; k < 4; k++) s += mesh.weights[vertex * 4 + k];
  return s;
}

export function isWeightFull(mesh: MeshData, vertex: number, eps = 0.01): boolean {
  return Math.abs(weightSum(mesh, vertex) - 1) <= eps;
}

/** 统计未刷满顶点数 */
export function countUnpainted(mesh: MeshData): number {
  const n = mesh.positions.length / 3;
  let c = 0;
  for (let i = 0; i < n; i++) if (!isWeightFull(mesh, i)) c++;
  return c;
}

/** 给顶点某骨骼刷权重；replace=true 时清空其它槽 */
export function paintWeight(mesh: MeshData, vertex: number, boneIndex: number, value: number, replace: boolean) {
  const base = vertex * 4;
  if (replace) {
    mesh.boneIdx.fill(-1, base, base + 4);
    mesh.weights.fill(0, base, base + 4);
    mesh.boneIdx[base] = boneIndex;
    mesh.weights[base] = Math.max(0, Math.min(1, value));
    return;
  }
  let slot = -1;
  for (let k = 0; k < 4; k++) if (mesh.boneIdx[base + k] === boneIndex) { slot = k; break; }
  if (slot < 0) {
    for (let k = 0; k < 4; k++) if (mesh.boneIdx[base + k] < 0) { slot = k; break; }
  }
  if (slot < 0) slot = 3; // 槽位满则覆盖最后一个
  mesh.boneIdx[base + slot] = boneIndex;
  mesh.weights[base + slot] = Math.max(0, Math.min(1, value));
}

/** 归一化某顶点权重使其和为 1（无有效槽则跳过） */
export function normalizeVertex(mesh: MeshData, vertex: number) {
  const base = vertex * 4;
  let s = 0;
  for (let k = 0; k < 4; k++) if (mesh.boneIdx[base + k] >= 0) s += mesh.weights[base + k];
  if (s <= 1e-6) return;
  for (let k = 0; k < 4; k++) mesh.weights[base + k] = mesh.boneIdx[base + k] >= 0 ? mesh.weights[base + k] / s : 0;
}

export function normalizeAll(mesh: MeshData) {
  const n = mesh.positions.length / 3;
  for (let i = 0; i < n; i++) normalizeVertex(mesh, i);
}
