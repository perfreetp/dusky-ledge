import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION, computeMeshVolume } from 'three-bvh-csg';
import type { BoolOp, ClipState, Feature } from './types';
import { ATTR_CAP, ATTR_FACE, ATTR_FEATURE, ATTR_SEL, createPrimitiveGeometry, vec3 } from './geometry';

const CSG_ATTRS = ['position', 'normal', 'uv', ATTR_FEATURE, ATTR_FACE, ATTR_CAP, ATTR_SEL];

export interface CsgResult {
  geometry: THREE.BufferGeometry;
  codeToFeature: Map<number, string>;
  featureToCode: Map<string, number>;
  volume: number;
  empty: boolean;
}

function opToCsg(op: BoolOp) {
  if (op === 'add') return ADDITION;
  if (op === 'subtract') return SUBTRACTION;
  return INTERSECTION;
}

function makeBrush(f: Feature, code: number): Brush {
  const geo = createPrimitiveGeometry(f.type, f.dims);
  const count = geo.attributes.position.count;
  geo.setAttribute(ATTR_FEATURE, new THREE.BufferAttribute(new Float32Array(count).fill(code), 1));
  // 基础体块的平面 UV（剖面不使用它，仅满足属性一致）
  const uv = new Float32Array(count * 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < count; i++) {
    uv[i * 2] = pos.getX(i) / 40;
    uv[i * 2 + 1] = pos.getZ(i) / 40;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const brush = new Brush(geo);
  brush.position.copy(vec3(f.position));
  brush.updateMatrixWorld(true);
  return brush;
}

/** 剖切盒：保留 (x - point)·normal <= 0 的半空间，盒面即剖切面，aCap=1 */
function makeClipBrush(clip: ClipState): Brush {
  const HALF = 5000;
  const n = vec3(clip.normal).normalize();
  const p = vec3(clip.point);
  const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(n, up).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();

  const geo = new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2);
  const count = geo.attributes.position.count;
  geo.setAttribute(ATTR_CAP, new THREE.BufferAttribute(new Float32Array(count).fill(1), 1));
  geo.setAttribute(ATTR_FACE, new THREE.BufferAttribute(new Float32Array(count).fill(0), 1));
  geo.setAttribute(ATTR_FEATURE, new THREE.BufferAttribute(new Float32Array(count).fill(0), 1));
  geo.setAttribute(ATTR_SEL, new THREE.BufferAttribute(new Float32Array(count), 1));

  const uv = new Float32Array(count * 2);
  const pos = geo.attributes.position;
  const gap = Math.max(0.5, clip.hatchGap);
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    uv[i * 2] = (x * u.x + y * u.y + z * u.z) / gap;
    uv[i * 2 + 1] = (x * v.x + y * v.y + z * v.z) / gap;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  const brush = new Brush(geo);
  brush.position.copy(p).addScaledVector(n, -HALF);
  brush.updateMatrixWorld(true);
  return brush;
}

/** 对特征树求值，输出带面属性的模型坐标几何体 */
export function evaluateCsg(features: Feature[], clip: ClipState): CsgResult {
  const codeToFeature = new Map<number, string>();
  const featureToCode = new Map<string, number>();
  features.forEach((f, i) => {
    codeToFeature.set(i + 1, f.id);
    featureToCode.set(f.id, i + 1);
  });

  const evaluator = new Evaluator();
  evaluator.attributes = CSG_ATTRS;
  evaluator.useGroups = false;

  let acc: Brush | null = null;
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const brush = makeBrush(f, i + 1);
    if (!acc) {
      acc = brush;
      continue;
    }
    const next: Brush = evaluator.evaluate(acc, brush, opToCsg(f.op));
    acc.geometry.dispose();
    brush.geometry.dispose();
    acc = next;
  }

  if (acc && clip.enabled) {
    const clipBrush = makeClipBrush(clip);
    const next = evaluator.evaluate(acc, clipBrush, INTERSECTION);
    acc.geometry.dispose();
    clipBrush.geometry.dispose();
    acc = next;
  }

  if (!acc || acc.geometry.attributes.position.count === 0) {
    acc?.geometry.dispose();
    return {
      geometry: new THREE.BufferGeometry(),
      codeToFeature,
      featureToCode,
      volume: 0,
      empty: true,
    };
  }

  // 烘焙平移到模型坐标
  const geometry = acc.geometry.clone();
  geometry.applyMatrix4(acc.matrixWorld);
  acc.geometry.dispose();

  const volume = Math.abs(computeMeshVolume(geometry));
  return { geometry, codeToFeature, featureToCode, volume, empty: false };
}

/** 按选中面重写 aSel 属性（1 = 选中），返回新几何体 */
export function applyFaceSelection(
  geometry: THREE.BufferGeometry,
  selected: { featureId: string; faceId: number; isCap: boolean } | null,
  featureToCode: Map<string, number>,
): THREE.BufferGeometry {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr) return geometry; // 空模型：无可着色顶点
  const count = posAttr.count;
  const sel = new Float32Array(count);
  if (selected) {
    const code = selected.isCap ? 0 : featureToCode.get(selected.featureId);
    const fAttr = geometry.getAttribute(ATTR_FEATURE);
    const faceAttr = geometry.getAttribute(ATTR_FACE);
    const capAttr = geometry.getAttribute(ATTR_CAP);
    const idx = geometry.index;
    if (fAttr && faceAttr && idx) {
      for (let t = 0; t < idx.count / 3; t++) {
        const vi = idx.getX(t * 3);
        const match = selected.isCap
          ? capAttr && capAttr.getX(vi) > 0.5
          : Math.round(fAttr.getX(vi)) === code && Math.round(faceAttr.getX(vi)) === selected.faceId;
        if (match) {
          for (let k = 0; k < 3; k++) sel[idx.getX(t * 3 + k)] = 1;
        }
      }
    }
  }
  geometry.setAttribute(ATTR_SEL, new THREE.BufferAttribute(sel, 1));
  return geometry;
}

/** 生成剖面线纹理：白底 + 单条 45° 斜线，配合 RepeatWrapping 平铺 */
export function makeHatchTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, size + 8);
  ctx.lineTo(size + 8, -8);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
