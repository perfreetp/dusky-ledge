import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VoxelGrid } from '../src/core/voxelGrid';
import { meshGrid, meshMask } from '../src/core/mesher';
import { ChunkedMesher, CHUNK } from '../src/core/chunkedMesher';

function assertSameShape(a: { triCount: number }, b: { triCount: number }, tolerance = 0.25) {
  const ratio = b.triCount / Math.max(1, a.triCount);
  assert.ok(
    ratio > 1 - tolerance && ratio < 1 + tolerance,
    `面数差异过大：整体 ${a.triCount} vs 分块 ${b.triCount}`,
  );
}

test('clip 只输出范围内的面', () => {
  const dims = { nx: 4, ny: 4, nz: 4 };
  const g = new VoxelGrid(dims);
  for (let x = 0; x < 4; x++) g.setMaterial(x, 0, 0, 1);
  const full = meshGrid(g);
  const clipped = meshMask(dims, g.mat.slice(), true, { start: [0, 0, 0], end: [2, 4, 4] });
  // 左半边的 2 个方块：顶底面被合并成 1 个矩形后又被裁开
  assert.ok(clipped.triCount > 0);
  assert.ok(clipped.triCount < full.triCount * 1.2);
  for (const b of clipped.batches) {
    for (let i = 0; i < b.vertices.length; i += 6) {
      assert.ok(b.vertices[i] <= 2.0001, 'x 超出裁剪范围');
    }
  }
});

test('分块网格与整体网格面数接近', () => {
  const n = 20;
  const g = new VoxelGrid({ nx: n, ny: n, nz: n });
  for (let y = 0; y < n; y++)
    for (let z = 0; z < n; z++)
      for (let x = 0; x < n; x++) if (Math.hypot(x - 10, y - 10, z - 10) < 8) g.setMaterial(x, y, z, 1 + ((x + y) % 2));
  const full = meshGrid(g);
  const mesher = new ChunkedMesher(g.dims);
  const chunked = mesher.build(g);
  assertSameShape(full, chunked, 0.35);
  assert.equal(chunked.batches.length, full.batches.length, '材质数应一致');
});

test('分块网格不产生重复或缺失的面', () => {
  const n = 17;
  const g = new VoxelGrid({ nx: n, ny: n, nz: n });
  for (let y = 0; y < n; y++)
    for (let z = 0; z < n; z++)
      for (let x = 0; x < n; x++) if ((x + y * 2 + z) % 5 !== 0) g.setMaterial(x, y, z, 1);
  const mesher = new ChunkedMesher(g.dims);
  const chunked = mesher.build(g);
  // 用包围盒法核实：所有面都是单位面积、无重叠（按面积总和对比整体网格）
  const areaOf = (res: { batches: { vertices: Float32Array }[] }) => {
    let area = 0;
    for (const b of res.batches) {
      const v = b.vertices;
      const quads = v.length / 24;
      for (let q = 0; q < quads; q++) {
        const o = q * 24;
        const ax = v[o + 6] - v[o];
        const ay = v[o + 7] - v[o + 1];
        const az = v[o + 8] - v[o + 2];
        const bx = v[o + 18] - v[o];
        const by = v[o + 19] - v[o + 1];
        const bz = v[o + 20] - v[o + 2];
        const cx = ay * bz - az * by;
        const cy = az * bx - ax * bz;
        const cz = ax * by - ay * bx;
        area += Math.hypot(cx, cy, cz);
      }
    }
    return area;
  };
  const fullArea = areaOf(meshGrid(g));
  const chunkArea = areaOf(chunked);
  assert.ok(Math.abs(fullArea - chunkArea) < 1e-3, `表面积应完全一致：${fullArea} vs ${chunkArea}`);
});

test('局部编辑只重算附近的块', () => {
  const n = 32;
  const g = new VoxelGrid({ nx: n, ny: n, nz: n });
  for (let y = 0; y < 8; y++)
    for (let z = 0; z < n; z++)
      for (let x = 0; x < n; x++) g.setMaterial(x, y, z, 2);
  const mesher = new ChunkedMesher(g.dims);
  const first = mesher.build(g);
  assert.equal(first.rebuiltChunks, first.totalChunks);
  g.setMaterial(1, 1, 1, 3);
  mesher.invalidateVoxel(1, 1, 1);
  const second = mesher.build(g);
  assert.ok(second.rebuiltChunks <= 8, `应只重算少量块，实际 ${second.rebuiltChunks}`);
  assert.ok(second.rebuiltChunks >= 1);
});

test('层可见性变化会让缓存整体失效', () => {
  const n = 16;
  const g = new VoxelGrid({ nx: n, ny: n, nz: n });
  for (let y = 0; y < n; y++) g.setMaterial(0, y, 0, 1);
  const layers = [
    { index: 0, start: 12, rows: 4 },
    { index: 1, start: 6, rows: 6 },
    { index: 2, start: 0, rows: 6 },
  ];
  const mesher = new ChunkedMesher(g.dims);
  mesher.setVisibility(layers, null);
  const all = mesher.build(g);
  mesher.setVisibility(layers, new Set([2]));
  const solo = mesher.build(g);
  assert.ok(solo.triCount < all.triCount);
  assert.equal(solo.rebuiltChunks, solo.totalChunks);
});

test('分块常数与尺寸互不影响', () => {
  assert.ok(CHUNK >= 4);
  const g = new VoxelGrid({ nx: 5, ny: 5, nz: 5 });
  g.setMaterial(4, 4, 4, 1);
  const mesher = new ChunkedMesher(g.dims);
  const r = mesher.build(g);
  assert.equal(r.triCount, meshGrid(g).triCount);
});
