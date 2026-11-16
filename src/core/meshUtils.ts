/** 网格构造工具：由位置数组 + 索引生成带平滑法线与包围盒的 Mesh。 */
import type { Mesh, Vec3 } from './geometry';

function computeBbox(positions: Float32Array): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k]!;
      if (v < min[k]!) min[k] = v;
      if (v > max[k]!) max[k] = v;
    }
  }
  return { min, max };
}

/**
 * 由位置（紧凑 xyz）与索引构造 Mesh。
 * 法线按面法线面积加权平均；若检测到绕序朝内则整体翻转。
 */
export function makeMesh(positions: Float32Array, indices: Uint32Array, outwardHint?: Vec3): Mesh {
  const normals = new Float32Array(positions.length);
  const flip = needsFlip(positions, indices, outwardHint);
  const triCount = indices.length / 3;
  for (let t = 0; t < triCount; t++) {
    const ia = indices[t * 3]! * 3;
    const ib = indices[t * 3 + 1]! * 3;
    const ic = indices[t * 3 + 2]! * 3;
    const ax = positions[ib]! - positions[ia]!;
    const ay = positions[ib + 1]! - positions[ia + 1]!;
    const az = positions[ib + 2]! - positions[ia + 2]!;
    const bx = positions[ic]! - positions[ia]!;
    const by = positions[ic + 1]! - positions[ia + 1]!;
    const bz = positions[ic + 2]! - positions[ia + 2]!;
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    if (flip) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    for (const vi of [ia, ib, ic]) {
      normals[vi] += nx;
      normals[vi + 1] += ny;
      normals[vi + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!) || 1;
    normals[i] /= l;
    normals[i + 1] /= l;
    normals[i + 2] /= l;
  }
  const vertices = new Float32Array(positions.length * 2);
  for (let i = 0; i < positions.length / 3; i++) {
    vertices.set(positions.subarray(i * 3, i * 3 + 3), i * 6);
    vertices.set(normals.subarray(i * 3, i * 3 + 3), i * 6 + 3);
  }
  const finalIndices = flip ? flipWinding(indices) : indices;
  return { vertices, indices: finalIndices, bbox: computeBbox(positions) };
}

function needsFlip(positions: Float32Array, indices: Uint32Array, hint?: Vec3): boolean {
  if (!hint) return false;
  let dot = 0;
  const checks = Math.min(64, indices.length / 3);
  for (let t = 0; t < checks; t++) {
    const ia = indices[t * 3]! * 3;
    const ib = indices[t * 3 + 1]! * 3;
    const ic = indices[t * 3 + 2]! * 3;
    const cx = (positions[ia]! + positions[ib]! + positions[ic]!) / 3;
    const cy = (positions[ia + 1]! + positions[ib + 1]! + positions[ic + 1]!) / 3;
    const cz = (positions[ia + 2]! + positions[ib + 2]! + positions[ic + 2]!) / 3;
    const ax = positions[ib]! - positions[ia]!;
    const ay = positions[ib + 1]! - positions[ia + 1]!;
    const az = positions[ib + 2]! - positions[ia + 2]!;
    const bx = positions[ic]! - positions[ia]!;
    const by = positions[ic + 1]! - positions[ia + 1]!;
    const bz = positions[ic + 2]! - positions[ia + 2]!;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    dot += nx * (cx - hint[0]) + ny * (cy - hint[1]) + nz * (cz - hint[2]);
  }
  return dot < 0;
}

function flipWinding(indices: Uint32Array): Uint32Array {
  const out = new Uint32Array(indices.length);
  for (let t = 0; t < indices.length; t += 3) {
    out[t] = indices[t]!;
    out[t + 1] = indices[t + 2]!;
    out[t + 2] = indices[t + 1]!;
  }
  return out;
}

export function mergePositionsAndIndices(parts: { positions: Float32Array; indices: Uint32Array }[]): {
  positions: Float32Array;
  indices: Uint32Array;
} {
  const posLen = parts.reduce((n, p) => n + p.positions.length, 0);
  const idxLen = parts.reduce((n, p) => n + p.indices.length, 0);
  const positions = new Float32Array(posLen);
  const indices = new Uint32Array(idxLen);
  let po = 0;
  let io = 0;
  let vertexBase = 0;
  for (const part of parts) {
    positions.set(part.positions, po);
    for (let i = 0; i < part.indices.length; i++) indices[io + i] = part.indices[i]! + vertexBase;
    po += part.positions.length;
    io += part.indices.length;
    vertexBase += part.positions.length / 3;
  }
  return { positions, indices };
}
