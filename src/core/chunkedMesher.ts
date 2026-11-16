import type { MeshBatch, MeshResult } from '../core/mesher';
import { meshMask, buildVisibility } from '../core/mesher';
import type { Dims, LayerSpec } from '../core/layers';
import type { VoxelGrid } from '../core/voxelGrid';

/**
 * 分块增量网格化：把探方切成 CHUNK³ 的小块，每块单独贪心合并。
 * 编辑时只重算被改动的块（及其邻块），其余块缓存复用，
 * 使拖拽绘制时的每帧重算量从“整个探方”降到“一个块”。
 *
 * 代价：贪心合并不跨块，面数略高于整体合并；块边界处会多出少量分段。
 */
export const CHUNK = 8;

interface ChunkEntry {
  batches: MeshBatch[];
}

export interface ChunkedMeshResult extends MeshResult {
  rebuiltChunks: number;
  totalChunks: number;
}

export class ChunkedMesher {
  private dims: Dims;
  private chunks: Array<ChunkEntry | null>;
  private counts = { cx: 0, cy: 0, cz: 0 };
  private layers: readonly LayerSpec[] | null | undefined = undefined;
  private visible: ReadonlySet<number> | null = null;
  private visibleKey = '';

  constructor(dims: Dims) {
    this.dims = { ...dims };
    this.counts = chunkCounts(dims);
    this.chunks = new Array(this.counts.cx * this.counts.cy * this.counts.cz).fill(null);
  }

  reset(dims: Dims): void {
    this.dims = { ...dims };
    this.counts = chunkCounts(dims);
    this.chunks = new Array(this.counts.cx * this.counts.cy * this.counts.cz).fill(null);
    this.visibleKey = '';
  }

  private idx(cx: number, cy: number, cz: number): number {
    return (cy * this.counts.cz + cz) * this.counts.cx + cx;
  }

  invalidateAll(): void {
    this.chunks.fill(null);
  }

  /** 让包含该体素的块及其 26 邻块失效（边界剔除与合并依赖邻块） */
  invalidateVoxel(x: number, y: number, z: number): void {
    const cx = Math.floor(x / CHUNK);
    const cy = Math.floor(y / CHUNK);
    const cz = Math.floor(z / CHUNK);
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const ax = cx + dx;
          const ay = cy + dy;
          const az = cz + dz;
          if (ax < 0 || ay < 0 || az < 0) continue;
          if (ax >= this.counts.cx || ay >= this.counts.cy || az >= this.counts.cz) continue;
          this.chunks[this.idx(ax, ay, az)] = null;
        }
  }

  invalidateVoxels(indices: Iterable<number>, grid: VoxelGrid): void {
    for (const i of indices) {
      const c = grid.coords(i);
      this.invalidateVoxel(c.x, c.y, c.z);
    }
  }

  /** 更新层可见性；变化时整体失效 */
  setVisibility(layers: readonly LayerSpec[], visible: ReadonlySet<number> | null): void {
    const key = visible === null ? 'all' : [...visible].sort((a, b) => a - b).join(',');
    if (this.layers !== layers || key !== this.visibleKey) {
      this.layers = layers;
      this.visible = visible;
      this.visibleKey = key;
      this.invalidateAll();
    }
  }

  build(grid: VoxelGrid): ChunkedMeshResult {
    const visibleMask = buildVisibility(grid, {
      layers: this.layers ?? undefined,
      visibleLayers: this.visible,
    });
    let rebuilt = 0;
    const perMaterial = new Map<number, number[]>();

    for (let cy = 0; cy < this.counts.cy; cy++) {
      for (let cz = 0; cz < this.counts.cz; cz++) {
        for (let cx = 0; cx < this.counts.cx; cx++) {
          const ci = this.idx(cx, cy, cz);
          let entry = this.chunks[ci];
          if (!entry) {
            entry = this.buildChunk(grid, visibleMask, cx, cy, cz);
            this.chunks[ci] = entry;
            rebuilt++;
          }
          for (const b of entry.batches) {
            let agg = perMaterial.get(b.material);
            if (!agg) {
              agg = [];
              perMaterial.set(b.material, agg);
            }
            for (let i = 0; i < b.vertices.length; i++) agg.push(b.vertices[i]);
          }
        }
      }
    }

    const batches: MeshBatch[] = [];
    let quadCount = 0;
    let vertexCount = 0;
    for (const [material, agg] of perMaterial) {
      const quads = agg.length / 24;
      if (!quads) continue;
      const vertices = new Float32Array(agg);
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
      batches.push({ material, vertices, indices, quadCount: quads });
      quadCount += quads;
      vertexCount += quads * 4;
    }
    batches.sort((a, b) => a.material - b.material);

    return {
      batches,
      quadCount,
      triCount: quadCount * 2,
      vertexCount,
      rebuiltChunks: rebuilt,
      totalChunks: this.chunks.length,
    };
  }

  private buildChunk(
    grid: VoxelGrid,
    visibleMask: Uint8Array,
    cx: number,
    cy: number,
    cz: number,
  ): ChunkEntry {
    const { nx, ny, nz } = grid.dims;
    const x0 = cx * CHUNK;
    const y0 = cy * CHUNK;
    const z0 = cz * CHUNK;
    const x1 = Math.min(nx, x0 + CHUNK);
    const y1 = Math.min(ny, y0 + CHUNK);
    const z1 = Math.min(nz, z0 + CHUNK);
    const pad = 1;
    const pw = x1 - x0 + pad * 2;
    const ph = y1 - y0 + pad * 2;
    const pd = z1 - z0 + pad * 2;
    const sub = new Uint8Array(pw * ph * pd);
    for (let y = 0; y < ph; y++) {
      const gy = y0 + y - pad;
      if (gy < 0 || gy >= ny) continue;
      for (let z = 0; z < pd; z++) {
        const gz = z0 + z - pad;
        if (gz < 0 || gz >= nz) continue;
        for (let x = 0; x < pw; x++) {
          const gx = x0 + x - pad;
          if (gx < 0 || gx >= nx) continue;
          sub[(y * pd + z) * pw + x] = visibleMask[(gy * nz + gz) * nx + gx];
        }
      }
    }
    const full = meshMask({ nx: pw, ny: ph, nz: pd }, sub, true, {
      start: [pad, pad, pad],
      end: [pad + (x1 - x0), pad + (y1 - y0), pad + (z1 - z0)],
    });
    // 顶点从 padding 坐标系平移回全局坐标
    const batches: MeshBatch[] = [];
    for (const b of full.batches) {
      const verts = b.vertices;
      for (let i = 0; i < verts.length; i += 6) {
        verts[i] += x0 - pad;
        verts[i + 1] += y0 - pad;
        verts[i + 2] += z0 - pad;
      }
      if (b.quadCount > 0) batches.push(b);
    }
    return { batches };
  }
}

function chunkCounts(dims: Dims) {
  return {
    cx: Math.ceil(dims.nx / CHUNK),
    cy: Math.ceil(dims.ny / CHUNK),
    cz: Math.ceil(dims.nz / CHUNK),
  };
}
