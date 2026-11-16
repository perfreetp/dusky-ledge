import * as THREE from 'three';
import type { Dims, Feature, FaceRef, FrustumDims, PrimitiveType, SnapPoint, Vec3Tuple } from './types';
import { FACE_BOTTOM, FACE_SIDE, FACE_TOP } from './types';

// 自定义顶点属性：aFeature(特征编码) aFace(面编号) aCap(剖切面标记) aSel(选中高亮)
export const ATTR_FEATURE = 'aFeature';
export const ATTR_FACE = 'aFace';
export const ATTR_CAP = 'aCap';
export const ATTR_SEL = 'aSel';

export function vec3(t: Vec3Tuple): THREE.Vector3 {
  return new THREE.Vector3(t[0], t[1], t[2]);
}

export function tuple(v: THREE.Vector3): Vec3Tuple {
  return [v.x, v.y, v.z];
}

/** 创建位于原点、轴向为 Y 的基础几何体（含分组，便于按面打属性） */
export function createPrimitiveGeometry(type: PrimitiveType, dims: Dims): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry;
  if (type === 'box') {
    const d = dims as Extract<Dims, { width: number }>;
    geo = new THREE.BoxGeometry(d.width, d.height, d.depth);
  } else if (type === 'cylinder') {
    const d = dims as Extract<Dims, { radius: number }>;
    geo = new THREE.CylinderGeometry(d.radius, d.radius, d.height, d.segments, 1, false);
  } else {
    const d = dims as FrustumDims;
    // segments=4 时 thetaStart 转 45°，保证四棱台的棱面与 X/Z 轴对齐
    const thetaStart = d.segments === 4 ? Math.PI / 4 : 0;
    geo = new THREE.CylinderGeometry(d.top, d.bottom, d.height, d.segments, 1, false, thetaStart);
  }
  tagFaceAttributes(geo);
  return geo;
}

/** 按 geometry.groups 的三角面范围写入 aFace（每组即一个语义面） */
function tagFaceAttributes(geo: THREE.BufferGeometry): void {
  const count = geo.attributes.position.count;
  const faceAttr = new THREE.BufferAttribute(new Float32Array(count), 1);
  const capAttr = new THREE.BufferAttribute(new Float32Array(count), 1);
  const selAttr = new THREE.BufferAttribute(new Float32Array(count), 1);
  for (const g of geo.groups) {
    for (let i = g.start; i < g.start + g.count; i++) {
      const idx = geo.index!.getX(i);
      faceAttr.setX(idx, g.materialIndex ?? 0);
    }
  }
  geo.setAttribute(ATTR_FACE, faceAttr);
  geo.setAttribute(ATTR_CAP, capAttr);
  geo.setAttribute(ATTR_SEL, selAttr);
}

export function defaultDims(type: PrimitiveType): Dims {
  if (type === 'box') return { width: 40, height: 40, depth: 40 };
  if (type === 'cylinder') return { radius: 20, height: 40, segments: 32 };
  return { bottom: 30, top: 18, height: 40, segments: 4 };
}

export function featureLabel(type: PrimitiveType, n: number): string {
  const base = type === 'box' ? '长方体' : type === 'cylinder' ? '圆柱' : '棱台';
  return `${base} ${n}`;
}

/** 面的语义名称 */
export function faceName(type: PrimitiveType, faceId: number, isCap: boolean): string {
  if (isCap) return '剖切面';
  if (type === 'box') return ['+X 面', '-X 面', '+Y 面', '-Y 面', '+Z 面', '-Z 面'][faceId] ?? `面 ${faceId}`;
  return ['侧面', '顶面', '底面'][faceId] ?? `面 ${faceId}`;
}

/**
 * 面的外法线（模型坐标系；特征只有平移没有旋转）。
 * 曲面需要命中点 localPoint 来确定周向角度。
 */
export function faceNormal(f: Feature, faceId: number, localPoint?: THREE.Vector3): THREE.Vector3 {
  if (f.type === 'box') {
    const signs: Vec3Tuple[] = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    return vec3(signs[faceId]);
  }
  if (faceId === FACE_TOP) return new THREE.Vector3(0, 1, 0);
  if (faceId === FACE_BOTTOM) return new THREE.Vector3(0, -1, 0);
  // 侧面
  const lp = localPoint ?? new THREE.Vector3(0, 0, 0);
  const theta = Math.atan2(lp.z, lp.x);
  if (f.type === 'cylinder') return new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
  const d = f.dims as FrustumDims;
  const slope = (d.top - d.bottom) / d.height; // dr/dy
  return new THREE.Vector3(Math.cos(theta), -slope, Math.sin(theta)).normalize();
}

export interface DimensionHandle {
  key: string;
  label: string;
  value: number;
}

/** 某个面可驱动的尺寸维度（拖拽与面板共用） */
export function dimensionForFace(f: Feature, faceId: number): { key: string; label: string } | null {
  if (f.type === 'box') {
    const map = [
      ['width', '宽度 X'],
      ['width', '宽度 X'],
      ['height', '高度 Y'],
      ['height', '高度 Y'],
      ['depth', '深度 Z'],
      ['depth', '深度 Z'],
    ] as const;
    return { key: map[faceId][0], label: map[faceId][1] };
  }
  if (f.type === 'cylinder') {
    if (faceId === FACE_SIDE) return { key: 'radius', label: '半径 R' };
    return { key: 'height', label: '高度 H' };
  }
  // 棱台：侧面平行偏移（上下底同增量，保斜率）；顶/底面分别改顶/底
  if (faceId === FACE_SIDE) return { key: 'sides', label: '上下底外接尺寸' };
  if (faceId === FACE_TOP) return { key: 'top', label: '上底尺寸' };
  return { key: 'bottom', label: '下底尺寸' };
}

/**
 * 按面拖动改尺寸。delta 是沿面法线方向的位移（模型单位）。
 * 直接返回新的 dims/position（不可变更新由 store 层做）。
 */
export function resizeByFace(
  f: Feature,
  faceId: number,
  delta: number,
): { dims: Dims; position: Vec3Tuple } {
  const dims = { ...f.dims } as Dims;
  const position: Vec3Tuple = [...f.position];
  const minSize = 1;

  if (f.type === 'box') {
    const d = dims as Extract<Dims, { width: number }>;
    const old = f.dims as Extract<Dims, { width: number }>;
    if (faceId <= 1) {
      d.width = Math.max(minSize, d.width + delta);
      position[0] += (faceId === 0 ? 0.5 : -0.5) * (d.width - old.width);
    } else if (faceId <= 3) {
      d.height = Math.max(minSize, d.height + delta);
      position[1] += (faceId === 2 ? 0.5 : -0.5) * (d.height - old.height);
    } else {
      d.depth = Math.max(minSize, d.depth + delta);
      position[2] += (faceId === 4 ? 0.5 : -0.5) * (d.depth - old.depth);
    }
    return { dims, position };
  }

  if (f.type === 'cylinder') {
    const d = dims as Extract<Dims, { radius: number }>;
    const old = f.dims as Extract<Dims, { radius: number }>;
    if (faceId === FACE_SIDE) {
      d.radius = Math.max(minSize / 2, d.radius + delta);
    } else {
      d.height = Math.max(minSize, d.height + delta);
      position[1] += (faceId === FACE_TOP ? 0.5 : -0.5) * (d.height - old.height);
    }
    return { dims, position };
  }

  // 棱台：半径语义（外接圆半径 = 边长/2）
  const fd = dims as FrustumDims;
  if (faceId === FACE_SIDE) {
    const nd = Math.max(minSize / 2, fd.bottom + delta);
    const real = nd - fd.bottom;
    fd.bottom = nd;
    fd.top = Math.max(minSize / 2, fd.top + real);
  } else if (faceId === FACE_TOP) {
    fd.top = Math.max(minSize / 2, fd.top + delta);
  } else {
    const old = fd.bottom;
    fd.bottom = Math.max(minSize / 2, fd.bottom + delta);
    position[1] += -0.5 * (fd.bottom - old);
  }
  return { dims, position };
}

// ---------------- 捕捉点（顶点 / 边中点 / 面心） ----------------

const q = (n: number) => Math.round(n * 1e4);

/** 单个特征在模型坐标系下的全部捕捉点 */
export function collectSnapPoints(f: Feature): SnapPoint[] {
  const geo = createPrimitiveGeometry(f.type, f.dims);
  const pos = geo.attributes.position;
  const idx = geo.index!;
  const off = vec3(f.position);
  const out: SnapPoint[] = [];

  // 顶点去重
  const verts = new Map<string, THREE.Vector3>();
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).add(off);
    const key = `${q(v.x)},${q(v.y)},${q(v.z)}`;
    if (!verts.has(key)) verts.set(key, v);
  }
  for (const v of verts.values()) out.push({ p: tuple(v), kind: 'vertex' });

  // 真实棱边中点：EdgesGeometry 按面法线夹角剔除三角面内部缝合边
  const edgeGeo = new THREE.EdgesGeometry(geo, 10);
  const edgeIdx = edgeGeo.index ?? (() => {
    const n = edgeGeo.attributes.position.count;
    const arr = new Uint16Array(n);
    for (let i = 0; i < n; i++) arr[i] = i;
    return new THREE.BufferAttribute(arr, 1);
  })();
  const edgePos = edgeGeo.attributes.position;
  const seenEdge = new Set<string>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < edgeIdx.count; i += 2) {
    a.fromBufferAttribute(edgePos, edgeIdx.getX(i)).add(off);
    b.fromBufferAttribute(edgePos, edgeIdx.getX(i + 1)).add(off);
    const ka = `${q(a.x)},${q(a.y)},${q(a.z)}`;
    const kb = `${q(b.x)},${q(b.y)},${q(b.z)}`;
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    if (seenEdge.has(key)) continue;
    seenEdge.add(key);
    out.push({ p: tuple(a.clone().add(b).multiplyScalar(0.5)), kind: 'edge-mid' });
  }
  edgeGeo.dispose();

  // 面心：每个 group 顶点求平均
  for (const g of geo.groups) {
    const ids = new Set<number>();
    for (let i = g.start; i < g.start + g.count; i++) ids.add(idx.getX(i));
    const c = new THREE.Vector3();
    for (const id of ids) c.add(new THREE.Vector3().fromBufferAttribute(pos, id));
    c.divideScalar(ids.size).add(off);
    out.push({ p: tuple(c), kind: 'face-center' });
  }

  geo.dispose();
  return out;
}

/** 最近捕捉点；threshold 为屏幕距离阈值（像素），由调用方换算 */
export function nearestSnap(
  points: SnapPoint[],
  worldTarget: THREE.Vector3,
): { snap: SnapPoint; dist: number } | null {
  let best: { snap: SnapPoint; dist: number } | null = null;
  for (const s of points) {
    const d = vec3(s.p).distanceTo(worldTarget);
    if (!best || d < best.dist) best = { snap: s, dist: d };
  }
  return best;
}

/** 由射线命中的三角面索引读取 FaceRef */
export function readFaceRef(
  geo: THREE.BufferGeometry,
  triangleIndex: number,
  codeToFeature: Map<number, string>,
): FaceRef | null {
  const fAttr = geo.getAttribute(ATTR_FEATURE);
  const faceAttr = geo.getAttribute(ATTR_FACE);
  const capAttr = geo.getAttribute(ATTR_CAP);
  if (!fAttr || !faceAttr) return null;
  const vi = geo.index!.getX(triangleIndex * 3);
  const code = Math.round(fAttr.getX(vi));
  const faceId = Math.round(faceAttr.getX(vi));
  const isCap = capAttr ? capAttr.getX(vi) > 0.5 : false;
  const featureId = codeToFeature.get(code);
  if (!featureId) return { featureId: '', faceId, isCap: true };
  return { featureId, faceId, isCap };
}
