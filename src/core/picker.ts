import type { VoxelGrid } from './voxelGrid';
import type { Vec3 } from '../render/math';

export interface RayHit {
  x: number;
  y: number;
  z: number;
  index: number;
  material: number;
  /** 命中面的外法线，朝向射线来向 */
  normal: Vec3;
  /** 命中点到射线原点的距离 */
  distance: number;
  /** 沿法线向外的相邻空格，放置时使用 */
  place: { x: number; y: number; z: number };
}

export type SolidQuery = (x: number, y: number, z: number) => boolean;

/**
 * 按体素逐格推进（Amanatides–Woo DDA）的射线拾取。
 * 从射线进入网格的格子开始，不跨格采样，命中第一个满足 solid 的体素。
 */
export function raycast(
  grid: VoxelGrid,
  origin: Vec3,
  dir: Vec3,
  solid: SolidQuery,
  maxDistance = Infinity,
): RayHit | null {
  const { nx, ny, nz } = grid.dims;
  const bounds = [nx, ny, nz];
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];

  // 求射线与整个网格包围盒的最近交点，作为推进起点
  let tEnter = -Infinity;
  let tExit = Infinity;
  let enterAxis = -1;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) {
      if (o[a] < 0 || o[a] > bounds[a]) return null;
      continue;
    }
    let t0 = (0 - o[a]) / d[a];
    let t1 = (bounds[a] - o[a]) / d[a];
    if (t0 > t1) {
      const tmp = t0;
      t0 = t1;
      t1 = tmp;
    }
    if (t0 > tEnter) {
      tEnter = t0;
      enterAxis = a;
    }
    if (t1 < tExit) tExit = t1;
  }
  const tStart = Math.max(tEnter, 0);
  if (tExit < tStart - 1e-9 || tStart > maxDistance) return null;

  const p = [o[0] + d[0] * tStart, o[1] + d[1] * tStart, o[2] + d[2] * tStart];
  const cell = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const v = Math.floor(p[a]);
    cell[a] = v < 0 ? 0 : v >= bounds[a] ? bounds[a] - 1 : v;
  }

  const step = [0, 0, 0];
  const tMax = [Infinity, Infinity, Infinity];
  const tDelta = [Infinity, Infinity, Infinity];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) continue;
    step[a] = d[a] > 0 ? 1 : -1;
    tDelta[a] = Math.abs(1 / d[a]);
    const nextBoundary = d[a] > 0 ? cell[a] + 1 : cell[a];
    tMax[a] = tStart + Math.abs((nextBoundary - p[a]) / d[a]);
  }

  let normal: Vec3 =
    tEnter > 0 && enterAxis >= 0
      ? {
          x: enterAxis === 0 ? -Math.sign(d[0]) : 0,
          y: enterAxis === 1 ? -Math.sign(d[1]) : 0,
          z: enterAxis === 2 ? -Math.sign(d[2]) : 0,
        }
      : { x: 0, y: 0, z: 0 };
  let t = tStart;

  for (let guard = 0; guard < nx + ny + nz + 4; guard++) {
    if (solid(cell[0], cell[1], cell[2])) {
      let n = normal;
      if (n.x === 0 && n.y === 0 && n.z === 0) {
        // 射线起点位于实体内部：取与视线相反的主轴作为法线
        let axis = 0;
        for (let a = 1; a < 3; a++) if (Math.abs(d[a]) > Math.abs(d[axis])) axis = a;
        n = { x: 0, y: 0, z: 0 };
        if (axis === 0) n.x = d[0] > 0 ? -1 : 1;
        else if (axis === 1) n.y = d[1] > 0 ? -1 : 1;
        else n.z = d[2] > 0 ? -1 : 1;
      }
      return {
        x: cell[0],
        y: cell[1],
        z: cell[2],
        index: grid.index(cell[0], cell[1], cell[2]),
        material: grid.mat[grid.index(cell[0], cell[1], cell[2])],
        normal: n,
        distance: t,
        place: { x: cell[0] + n.x, y: cell[1] + n.y, z: cell[2] + n.z },
      };
    }

    // 推进到下一个格子
    let axis = 0;
    if (tMax[1] < tMax[axis]) axis = 1;
    if (tMax[2] < tMax[axis]) axis = 2;
    if (!Number.isFinite(tMax[axis])) return null;
    t = tMax[axis];
    if (t > maxDistance) return null;
    cell[axis] += step[axis];
    tMax[axis] += tDelta[axis];
    if (cell[axis] < 0 || cell[axis] >= bounds[axis]) return null;
    const stepDir = step[axis];
    normal = { x: 0, y: 0, z: 0 };
    if (axis === 0) normal.x = -stepDir;
    else if (axis === 1) normal.y = -stepDir;
    else normal.z = -stepDir;
  }
  return null;
}

/** 射线与水平面 y = planeY 求交，返回格子坐标；用于在空地/层底面上落第一块。 */export function intersectPlaneY(
  origin: Vec3,
  dir: Vec3,
  planeY: number,
): { x: number; z: number; t: number } | null {
  if (Math.abs(dir.y) < 1e-9) return null;
  const t = (planeY - origin.y) / dir.y;
  if (t <= 0) return null;
  return { x: origin.x + dir.x * t, z: origin.z + dir.z * t, t };
}

/** 射线与轴对齐盒求交，返回进入点的参数 t（射线起点在盒内时返回 0）。 */
export function intersectBox(
  origin: Vec3,
  dir: Vec3,
  min: Vec3,
  max: Vec3,
): { tEnter: number; tExit: number; axis: number; sign: number } | null {
  let tEnter = -Infinity;
  let tExit = Infinity;
  let axis = -1;
  let sign = 0;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const lo = [min.x, min.y, min.z];
  const hi = [max.x, max.y, max.z];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) {
      if (o[a] < lo[a] || o[a] > hi[a]) return null;
      continue;
    }
    let t0 = (lo[a] - o[a]) / d[a];
    let t1 = (hi[a] - o[a]) / d[a];
    let s = -1;
    if (t0 > t1) {
      const tmp = t0;
      t0 = t1;
      t1 = tmp;
      s = 1;
    }
    if (t0 > tEnter) {
      tEnter = t0;
      axis = a;
      sign = s;
    }
    if (t1 < tExit) tExit = t1;
  }
  if (tExit < tEnter) return null;
  if (tExit < 0) return null;
  return { tEnter: Math.max(0, tEnter), tExit, axis, sign };
}
