import type { Dims, LayerSpec } from './layers';
import type { VoxelGrid } from './voxelGrid';

export interface MeshBatch {
  material: number;
  /** 每四边形 4 个顶点，交错布局 [px,py,pz, nx,ny,nz] */
  vertices: Float32Array;
  /** Uint32 索引，每四边形 6 个 */
  indices: Uint32Array;
  quadCount: number;
}

export interface MeshResult {
  batches: MeshBatch[];
  quadCount: number;
  triCount: number;
  vertexCount: number;
}

export interface MeshOptions {
  /** 层可见性过滤（层索引集合）；null 表示全部可见 */
  visibleLayers?: ReadonlySet<number> | null;
  layers?: readonly LayerSpec[];
}

/** 供 GPU 重建使用的可见性遮罩：0 表示该格不渲染。 */
export function buildVisibility(grid: VoxelGrid, opts: MeshOptions = {}): Uint8Array {
  const mask = new Uint8Array(grid.mat.length);
  const { nx, ny, nz } = grid.dims;
  const nxz = nx * nz;
  const layers = opts.layers;
  const visible = opts.visibleLayers;
  if (!layers || !visible) {
    for (let i = 0; i < grid.mat.length; i++) mask[i] = grid.hidden[i] ? 0 : grid.mat[i];
    return mask;
  }
  const visibleRows = new Uint8Array(ny);
  for (const layer of layers) {
    if (!visible.has(layer.index)) continue;
    for (let y = layer.start; y < layer.start + layer.rows; y++) visibleRows[y] = 1;
  }
  for (let y = 0; y < ny; y++) {
    const base = y * nxz;
    for (let k = 0; k < nxz; k++) {
      const i = base + k;
      mask[i] = visibleRows[y] && !grid.hidden[i] ? grid.mat[i] : 0;
    }
  }
  return mask;
}

interface QuadBuild {
  material: number;
  pos: number[];
  nor: number[];
}

export interface ClipRegion {
  /** 含：格子坐标 [x0,y0,z0] */
  start: [number, number, number];
  /** 不含：[x1,y1,z1] */
  end: [number, number, number];
}

/**
 * 贪心网格化：单面剔除（被相邻实体挡住的面不生成），
 * 再把同材质、同朝向、共面的相邻面合并为尽可能大的矩形。
 *
 * clip 参数用于分块网格化：喂进整块邻域做剔除判断，
 * 但只输出落在 clip 范围内的面，从而保证块之间不产生重复面、也不漏面。
 */
export function meshMask(
  dims: Dims,
  mask: Uint8Array,
  greedy = true,
  clip?: ClipRegion,
): MeshResult {
  const { nx, ny, nz } = dims;
  const size = [nx, ny, nz];
  const batches = new Map<number, QuadBuild>();
  const lo = clip ? clip.start : null;
  const hi = clip ? clip.end : null;

  const get = (x: number, y: number, z: number): number => {
    if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return 0;
    return mask[(y * nz + z) * nx + x];
  };
  /** 该格是否属于本块（clip 之外一律不输出） */
  const inClip = (c: number[]): boolean => {
    if (!lo || !hi) return true;
    return c[0] >= lo[0] && c[0] < hi[0] && c[1] >= lo[1] && c[1] < hi[1] && c[2] >= lo[2] && c[2] < hi[2];
  };

  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [1, -1]) {
      const u = sign > 0 ? (axis + 1) % 3 : (axis + 2) % 3;
      const v = sign > 0 ? (axis + 2) % 3 : (axis + 1) % 3;
      const dimU = size[u];
      const dimV = size[v];
      const dimA = size[axis];
      const plane: number[] = [0, 0, 0];

      for (let a = 0; a < dimA; a++) {
        const m = new Uint8Array(dimU * dimV);
        // 生成这一层的 2D 遮罩
        for (let j = 0; j < dimV; j++) {
          for (let i = 0; i < dimU; i++) {
            plane[axis] = a;
            plane[u] = i;
            plane[v] = j;
            const cur = get(plane[0], plane[1], plane[2]);
            if (!cur) continue;
            if (!inClip(plane)) continue;
            plane[axis] = a + sign;
            const nb = get(plane[0], plane[1], plane[2]);
            if (!nb) m[j * dimU + i] = cur;
          }
        }
        if (!m.length) continue;

        const merged = new Uint8Array(dimU * dimV);
        for (let j = 0; j < dimV; j++) {
          for (let i = 0; i < dimU; i++) {
            const cell = m[j * dimU + i];
            if (!cell || merged[j * dimU + i]) continue;
            let w = 1;
            if (greedy) {
              while (i + w < dimU && m[j * dimU + i + w] === cell && !merged[j * dimU + i + w]) w++;
            }
            let h = 1;
            if (greedy) {
              outer: while (j + h < dimV) {
                for (let k = 0; k < w; k++) {
                  const idx = (j + h) * dimU + i + k;
                  if (m[idx] !== cell || merged[idx]) break outer;
                }
                h++;
              }
            }
            for (let jj = 0; jj < h; jj++) {
              for (let ii = 0; ii < w; ii++) merged[(j + jj) * dimU + i + ii] = 1;
            }

            let batch = batches.get(cell);
            if (!batch) {
              batch = { material: cell, pos: [], nor: [] };
              batches.set(cell, batch);
            }
            const normal: number[] = [0, 0, 0];
            normal[axis] = sign;
            const base: number[] = [0, 0, 0];
            base[axis] = a + (sign > 0 ? 1 : 0);
            base[u] = i;
            base[v] = j;

            // 四个角：(0,0) (u) (u+v) (v)，该顺序在 u×v 方向下朝外
            const corners: Array<[number, number]> = [
              [0, 0],
              [w, 0],
              [w, h],
              [0, h],
            ];
            for (const [du, dv] of corners) {
              const p: number[] = [base[0], base[1], base[2]];
              p[u] += du;
              p[v] += dv;
              batch.pos.push(p[0], p[1], p[2]);
              batch.nor.push(normal[0], normal[1], normal[2]);
            }
          }
        }
      }
    }
  }

  const out: MeshBatch[] = [];
  let quadCount = 0;
  let vertexCount = 0;
  for (const [material, batch] of batches) {
    const quads = batch.pos.length / 12;
    if (!quads) continue;
    const vertices = new Float32Array(quads * 24);
    for (let q = 0; q < quads; q++) {
      const pBase = q * 12;
      const vBase = q * 24;
      vertices[vBase + 0] = batch.pos[pBase + 0];
      vertices[vBase + 1] = batch.pos[pBase + 1];
      vertices[vBase + 2] = batch.pos[pBase + 2];
      vertices[vBase + 3] = batch.nor[pBase + 0];
      vertices[vBase + 4] = batch.nor[pBase + 1];
      vertices[vBase + 5] = batch.nor[pBase + 2];
      vertices[vBase + 6] = batch.pos[pBase + 3];
      vertices[vBase + 7] = batch.pos[pBase + 4];
      vertices[vBase + 8] = batch.pos[pBase + 5];
      vertices[vBase + 9] = batch.nor[pBase + 3];
      vertices[vBase + 10] = batch.nor[pBase + 4];
      vertices[vBase + 11] = batch.nor[pBase + 5];
      vertices[vBase + 12] = batch.pos[pBase + 6];
      vertices[vBase + 13] = batch.pos[pBase + 7];
      vertices[vBase + 14] = batch.pos[pBase + 8];
      vertices[vBase + 15] = batch.nor[pBase + 6];
      vertices[vBase + 16] = batch.nor[pBase + 7];
      vertices[vBase + 17] = batch.nor[pBase + 8];
      vertices[vBase + 18] = batch.pos[pBase + 9];
      vertices[vBase + 19] = batch.pos[pBase + 10];
      vertices[vBase + 20] = batch.pos[pBase + 11];
      vertices[vBase + 21] = batch.nor[pBase + 9];
      vertices[vBase + 22] = batch.nor[pBase + 10];
      vertices[vBase + 23] = batch.nor[pBase + 11];
    }
    const indices = new Uint32Array(quads * 6);
    for (let q = 0; q < quads; q++) {
      const v = q * 4;
      const o = q * 6;
      indices[o] = v;
      indices[o + 1] = v + 1;
      indices[o + 2] = v + 2;
      indices[o + 3] = v;
      indices[o + 4] = v + 2;
      indices[o + 5] = v + 3;
    }
    out.push({ material, vertices, indices, quadCount: quads });
    quadCount += quads;
    vertexCount += quads * 4;
  }

  out.sort((a, b) => a.material - b.material);
  return { batches: out, quadCount, triCount: quadCount * 2, vertexCount };
}

export function meshGrid(grid: VoxelGrid, opts: MeshOptions = {}): MeshResult {
  const mask = buildVisibility(grid, opts);
  return meshMask(grid.dims, mask, true);
}

/** 仅保留选中体素的网格，用于高亮覆盖层。 */
export function meshSelection(grid: VoxelGrid, indices: Iterable<number>, material = 255): MeshResult {
  const mask = new Uint8Array(grid.mat.length);
  for (const i of indices) mask[i] = material;
  return meshMask(grid.dims, mask, true);
}

/** 体积占比（各层已填体素 / 总已填体素）。 */
export function volumeShares(grid: VoxelGrid, layers: readonly LayerSpec[]): number[] {
  const counts = grid.countsByLayer(layers);
  const total = counts.reduce((a, b) => a + b, 0);
  return Array.from(counts, (c) => (total ? c / total : 0));
}
