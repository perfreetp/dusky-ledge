import type { VoxelGrid } from './voxelGrid';
import type { LayerSpec } from './layers';

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export function normalizeBox(a: Box): Box {
  return {
    x0: Math.min(a.x0, a.x1),
    x1: Math.max(a.x0, a.x1),
    y0: Math.min(a.y0, a.y1),
    y1: Math.max(a.y0, a.y1),
    z0: Math.min(a.z0, a.z1),
    z1: Math.max(a.z0, a.z1),
  };
}

export function clampBox(box: Box, grid: VoxelGrid): Box {
  const { nx, ny, nz } = grid.dims;
  const b = normalizeBox(box);
  return {
    x0: Math.max(0, Math.min(nx - 1, b.x0)),
    x1: Math.max(0, Math.min(nx - 1, b.x1)),
    y0: Math.max(0, Math.min(ny - 1, b.y0)),
    y1: Math.max(0, Math.min(ny - 1, b.y1)),
    z0: Math.max(0, Math.min(nz - 1, b.z0)),
    z1: Math.max(0, Math.min(nz - 1, b.z1)),
  };
}

export function boxVolume(box: Box): number {
  const b = normalizeBox(box);
  return (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) * (b.z1 - b.z0 + 1);
}

export function boxVoxelCount(grid: VoxelGrid, box: Box): number {
  const b = clampBox(box, grid);
  let n = 0;
  for (let y = b.y0; y <= b.y1; y++)
    for (let z = b.z0; z <= b.z1; z++)
      for (let x = b.x0; x <= b.x1; x++) if (grid.materialAt(x, y, z)) n++;
  return n;
}

export interface EditContext {
  grid: VoxelGrid;
  mirror: boolean;
  /** 镜像轴：nx 为偶数时无中轴，镜像格为 nx-1-x */
  mirrorTargets(x: number): number[];
}

export function makeEditContext(grid: VoxelGrid, mirror: boolean): EditContext {
  return {
    grid,
    mirror,
    mirrorTargets(x: number): number[] {
      if (!mirror) return [x];
      const mx = grid.mirrorX(x);
      return mx === x ? [x] : [x, mx];
    },
  };
}

/** 放置体素，返回实际改变的体素索引。镜像开启时两侧同时落块。 */
export function placeVoxel(ctx: EditContext, x: number, y: number, z: number, material: number): number[] {
  const changed: number[] = [];
  for (const tx of ctx.mirrorTargets(x)) {
    if (!ctx.grid.inBounds(tx, y, z)) continue;
    if (ctx.grid.setMaterial(tx, y, z, material)) changed.push(ctx.grid.index(tx, y, z));
  }
  return changed;
}

export function eraseVoxel(ctx: EditContext, x: number, y: number, z: number): number[] {
  const changed: number[] = [];
  for (const tx of ctx.mirrorTargets(x)) {
    if (!ctx.grid.inBounds(tx, y, z)) continue;
    if (ctx.grid.setMaterial(tx, y, z, 0)) changed.push(ctx.grid.index(tx, y, z));
  }
  return changed;
}

export function hideVoxel(ctx: EditContext, x: number, y: number, z: number, hidden = true): number[] {
  const changed: number[] = [];
  for (const tx of ctx.mirrorTargets(x)) {
    if (!ctx.grid.inBounds(tx, y, z)) continue;
    if (ctx.grid.setHidden(tx, y, z, hidden)) changed.push(ctx.grid.index(tx, y, z));
  }
  return changed;
}

export function unhideAll(grid: VoxelGrid): void {
  grid.hidden.fill(0);
  grid.touchAll();
}

export function hiddenCount(grid: VoxelGrid): number {
  let n = 0;
  for (let i = 0; i < grid.hidden.length; i++) if (grid.hidden[i]) n++;
  return n;
}

/** 同类土色整片替换（可限定范围内）。 */
export function replaceMaterial(
  grid: VoxelGrid,
  from: number,
  to: number,
  scope?: Box,
): number {
  if (!from || from === to) return 0;
  const b = scope ? clampBox(scope, grid) : { x0: 0, y0: 0, z0: 0, x1: grid.dims.nx - 1, y1: grid.dims.ny - 1, z1: grid.dims.nz - 1 };
  let n = 0;
  for (let y = b.y0; y <= b.y1; y++) {
    for (let z = b.z0; z <= b.z1; z++) {
      for (let x = b.x0; x <= b.x1; x++) {
        const i = grid.index(x, y, z);
        if (grid.mat[i] !== from) continue;
        grid.mat[i] = to;
        grid.touchIndex(i);
        n++;
      }
    }
  }
  return n;
}

export interface ExtractResult {
  box: Box;
  /** 尺寸 w×h×d 的材质数组，按 y,z,x 排列 */
  data: Uint8Array;
  hidden: Uint8Array;
  count: number;
}

export function extractBox(grid: VoxelGrid, rawBox: Box): ExtractResult {
  const box = clampBox(rawBox, grid);
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const d = box.z1 - box.z0 + 1;
  const data = new Uint8Array(w * h * d);
  const hidden = new Uint8Array(w * h * d);
  let count = 0;
  for (let y = 0; y < h; y++) {
    for (let z = 0; z < d; z++) {
      for (let x = 0; x < w; x++) {
        const src = grid.index(box.x0 + x, box.y0 + y, box.z0 + z);
        const dst = (y * d + z) * w + x;
        data[dst] = grid.mat[src];
        hidden[dst] = grid.hidden[src];
        if (grid.mat[src]) count++;
      }
    }
  }
  return { box, data, hidden, count };
}

export function clearBox(grid: VoxelGrid, rawBox: Box): number {
  const box = clampBox(rawBox, grid);
  let n = 0;
  for (let y = box.y0; y <= box.y1; y++)
    for (let z = box.z0; z <= box.z1; z++)
      for (let x = box.x0; x <= box.x1; x++) if (grid.setMaterial(x, y, z, 0)) n++;
  return n;
}

export interface PasteOptions {
  /** 目标层索引；粘贴后选区底部对齐到该层底部 */
  targetLayer: number;
  mirror: boolean;
  /** true = 复制（保留源），false = 剪切（清空源） */
  keepSource: boolean;
  /** 在 y 方向上的额外偏移（行），用来在同一层内微调 */
  yOffset?: number;
}

export interface PasteResult {
  moved: number;
  skipped: number;
  box: Box;
}

/**
 * 把框选出的体素整体平移到另一地层。
 * 源区域按 keepSource 决定是否清空；镜像开启时同时粘贴镜像副本。
 */
export function moveBoxToLayer(
  grid: VoxelGrid,
  rawBox: Box,
  layers: readonly LayerSpec[],
  opts: PasteOptions,
): PasteResult {
  const layer = layers[opts.targetLayer];
  if (!layer) return { moved: 0, skipped: 0, box: rawBox };
  const src = extractBox(grid, rawBox);
  const { box, data } = src;
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const d = box.z1 - box.z0 + 1;

  const baseY = layer.start + (opts.yOffset ?? 0);
  const layerTop = layer.start + layer.rows;
  const targets: number[] = [box.x0];
  if (opts.mirror) {
    const mirrored = grid.mirrorX(box.x1); // 镜像后的左边界，保持整块对称
    if (mirrored !== box.x0) targets.push(mirrored);
  }

  if (!opts.keepSource) clearBox(grid, box);

  let moved = 0;
  let skipped = 0;
  for (const baseX of targets) {
    for (let y = 0; y < h; y++) {
      const ty = baseY + y;
      // 块高超过目标层厚时，超出的行被跳过（避免污染相邻地层）
      if (ty < 0 || ty >= grid.dims.ny || ty < layer.start || ty >= layerTop) {
        skipped++;
        continue;
      }
      for (let z = 0; z < d; z++) {
        for (let x = 0; x < w; x++) {
          const val = data[(y * d + z) * w + x];
          if (!val) continue;
          const tx = baseX + x;
          if (!grid.inBounds(tx, ty, box.z0 + z)) {
            skipped++;
            continue;
          }
          grid.setMaterial(tx, ty, box.z0 + z, val);
          if (src.hidden[(y * d + z) * w + x]) grid.setHidden(tx, ty, box.z0 + z, true);
          moved++;
        }
      }
    }
  }

  const outBox: Box = {
    x0: Math.min(...targets),
    x1: Math.max(...targets) + w - 1,
    y0: baseY,
    y1: baseY + h - 1,
    z0: box.z0,
    z1: box.z1,
  };
  return { moved, skipped, box: outBox };
}

/** 在当前层内清除一圈（用于“清空本层”）。 */
export function clearLayer(grid: VoxelGrid, layer: LayerSpec): number {
  let n = 0;
  const nxz = grid.dims.nx * grid.dims.nz;
  for (let y = layer.start; y < layer.start + layer.rows; y++) {
    const base = y * nxz;
    for (let k = 0; k < nxz; k++) {
      const i = base + k;
      if (grid.mat[i]) {
        grid.mat[i] = 0;
        grid.hidden[i] = 0;
        grid.touchIndex(i);
        n++;
      }
    }
  }
  return n;
}
