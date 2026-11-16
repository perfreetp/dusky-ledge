import { VoxelGrid } from './voxelGrid';
import type { Dims } from './layers';
import { meshGrid, type MeshResult } from './mesher';

/**
 * 体素块合并（减面）：
 * 把 factor³ 的体素块按“多数材质”压缩成一个更大的体素，网格尺寸整体缩小 factor 倍。
 * 因为每个合并后的体素在导出时按 factor 放大，模型外形不变，
 * 但单元数按 factor³ 下降、面数大致按 factor² 下降。
 */
export function mergeBlocks(grid: VoxelGrid, factor: number): VoxelGrid {
  const f = Math.max(1, Math.floor(factor));
  if (f === 1) return grid.clone();
  const { nx, ny, nz } = grid.dims;
  const dims: Dims = { nx: Math.ceil(nx / f), ny: Math.ceil(ny / f), nz: Math.ceil(nz / f) };
  const out = new VoxelGrid(dims);
  const counts = new Uint32Array(16);
  for (let by = 0; by < dims.ny; by++) {
    for (let bz = 0; bz < dims.nz; bz++) {
      for (let bx = 0; bx < dims.nx; bx++) {
        counts.fill(0);
        let total = 0;
        for (let y = by * f; y < Math.min(by * f + f, ny); y++) {
          for (let z = bz * f; z < Math.min(bz * f + f, nz); z++) {
            for (let x = bx * f; x < Math.min(bx * f + f, nx); x++) {
              const m = grid.mat[grid.index(x, y, z)];
              if (m) {
                counts[m]++;
                total++;
              }
            }
          }
        }
        const vol =
          Math.min(f, nx - bx * f) * Math.min(f, ny - by * f) * Math.min(f, nz - bz * f);
        // 实体占块体积一半以上才保留，避免把零散碎屑放大成实心
        if (!total || total * 2 < vol) continue;
        let best = 1;
        for (let m = 2; m < counts.length; m++) if (counts[m] > counts[best]) best = m;
        out.setMaterial(bx, by, bz, best);
      }
    }
  }
  return out;
}

export interface DecimateResult {
  /** 减面后的（更粗的）网格 */
  grid: VoxelGrid;
  mesh: MeshResult;
  /** 每个粗体素对应的原体素边长 */
  factor: number;
  /** 减面前原始尺寸，用于导出时换算真实尺度 */
  sourceDims: Dims;
  trianglesBefore: number;
  trianglesAfter: number;
  achieved: boolean;
}

/** 逐级减面直到三角面数 ≤ 预算；预算极小（达不到）时返回最粗一级并标记 false。 */
export function decimateToBudget(
  grid: VoxelGrid,
  budget: number,
  maxFactor = 8,
): DecimateResult {
  const before = meshGrid(grid);
  if (budget <= 0 || before.triCount <= budget) {
    return {
      grid: grid.clone(),
      mesh: before,
      factor: 1,
      sourceDims: { ...grid.dims },
      trianglesBefore: before.triCount,
      trianglesAfter: before.triCount,
      achieved: true,
    };
  }
  let last: DecimateResult | null = null;
  for (let f = 2; f <= maxFactor; f++) {
    if (grid.dims.nx < f * 2 && grid.dims.ny < f * 2 && grid.dims.nz < f * 2) break;
    const g = mergeBlocks(grid, f);
    const mesh = meshGrid(g);
    last = {
      grid: g,
      mesh,
      factor: f,
      sourceDims: { ...grid.dims },
      trianglesBefore: before.triCount,
      trianglesAfter: mesh.triCount,
      achieved: mesh.triCount <= budget,
    };
    if (mesh.triCount <= budget) return last;
  }
  if (last) return last;
  const g = mergeBlocks(grid, 2);
  const mesh = meshGrid(g);
  return {
    grid: g,
    mesh,
    factor: 2,
    sourceDims: { ...grid.dims },
    trianglesBefore: before.triCount,
    trianglesAfter: mesh.triCount,
    achieved: mesh.triCount <= budget,
  };
}
