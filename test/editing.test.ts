import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VoxelGrid } from '../src/core/voxelGrid';
import { raycast, intersectPlaneY } from '../src/core/picker';
import { placeVoxel, eraseVoxel, makeEditContext, moveBoxToLayer, replaceMaterial, extractBox, hideVoxel, clearBox, hiddenCount } from '../src/core/operations';
import { buildLayers } from '../src/core/layers';

const dims = { nx: 8, ny: 8, nz: 8 };

test('射线按体素逐格推进，命中第一个实体', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(5, 4, 4, 1);
  const solid = (x: number, y: number, z: number) => g.materialAt(x, y, z) > 0;
  const hit = raycast(g, { x: 0.5, y: 4.5, z: 4.5 }, { x: 1, y: 0, z: 0 }, solid);
  assert.ok(hit);
  assert.equal(hit!.x, 5);
  assert.equal(hit!.y, 4);
  assert.equal(hit!.z, 4);
  assert.equal(hit!.normal.x, -1);
  assert.deepEqual(hit!.place, { x: 4, y: 4, z: 4 });
});

test('射线不穿过不相交的网格', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(5, 4, 4, 1);
  const solid = (x: number, y: number, z: number) => g.materialAt(x, y, z) > 0;
  assert.equal(raycast(g, { x: -3, y: -3, z: -3 }, { x: 1, y: 0, z: 0 }, solid), null);
});

test('射线从网格内部起点命中', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(2, 2, 2, 1);
  const solid = (x: number, y: number, z: number) => g.materialAt(x, y, z) > 0;
  const hit = raycast(g, { x: 2.5, y: 2.5, z: 2.5 }, { x: 0, y: 1, z: 0 }, solid);
  assert.ok(hit);
  assert.equal(hit!.x, 2);
  assert.equal(hit!.y, 2);
});

test('平面求交用于空网格落块', () => {
  const r = intersectPlaneY({ x: 0.5, y: 10, z: 0.5 }, { x: 0, y: -1, z: 0 }, 0);
  assert.ok(r);
  assert.ok(Math.abs(r!.x - 0.5) < 1e-9);
});

test('镜像一次编辑两侧同时落块', () => {
  const g = new VoxelGrid(dims);
  const ctx = makeEditContext(g, true);
  const changed = placeVoxel(ctx, 1, 2, 3, 4);
  assert.equal(changed.length, 2);
  assert.equal(g.materialAt(1, 2, 3), 4);
  assert.equal(g.materialAt(6, 2, 3), 4);
});

test('奇数宽度时中轴格只落一块', () => {
  const g = new VoxelGrid({ nx: 7, ny: 4, nz: 4 });
  const ctx = makeEditContext(g, true);
  const changed = placeVoxel(ctx, 3, 1, 1, 2);
  assert.equal(changed.length, 1);
});

test('镜像删除同时清两侧', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(1, 1, 1, 2);
  g.setMaterial(6, 1, 1, 2);
  const changed = eraseVoxel(makeEditContext(g, true), 1, 1, 1);
  assert.equal(changed.length, 2);
  assert.equal(g.filled(), 0);
});

test('框选复制并整体平移到别的地层', () => {
  const layers = buildLayers([2, 2, 2, 2]);
  const g = new VoxelGrid({ nx: 4, ny: 8, nz: 4 });
  // 第 4 层（y=0..1）放一个 2×1×2 块
  g.setMaterial(0, 0, 0, 5);
  g.setMaterial(0, 1, 0, 5);
  g.setMaterial(1, 0, 0, 5);
  g.setMaterial(1, 1, 0, 5);
  const box = { x0: 0, y0: 0, z0: 0, x1: 1, y1: 1, z1: 0 };
  const res = moveBoxToLayer(g, box, layers, { targetLayer: 0, mirror: false, keepSource: false });
  assert.equal(res.moved, 4);
  assert.equal(res.skipped, 0);
  // 源清空
  assert.equal(g.materialAt(0, 0, 0), 0);
  // 目标层 y=6..7
  assert.equal(g.materialAt(0, 6, 0), 5);
  assert.equal(g.materialAt(1, 7, 0), 5);
});

test('平移到层外时跳过而不污染相邻层', () => {
  const layers = buildLayers([2, 2, 2]);
  const g = new VoxelGrid({ nx: 4, ny: 6, nz: 4 });
  for (let y = 0; y < 4; y++) g.setMaterial(0, y, 0, 2);
  const res = moveBoxToLayer(g, { x0: 0, y0: 0, z0: 0, x1: 0, y1: 3, z1: 0 }, layers, {
    targetLayer: 1,
    mirror: false,
    keepSource: true,
  });
  assert.equal(res.moved, 2);
  assert.equal(res.skipped, 2);
  // 上层（y=4,5）未被写入
  assert.equal(g.materialAt(0, 4, 0), 0);
});

test('同类土色整片替换', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(0, 0, 0, 1);
  g.setMaterial(1, 0, 0, 1);
  g.setMaterial(2, 0, 0, 2);
  assert.equal(replaceMaterial(g, 1, 7), 2);
  assert.equal(g.materialAt(0, 0, 0), 7);
  assert.equal(g.materialAt(2, 0, 0), 2);
});

test('局部范围替换', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(0, 0, 0, 1);
  g.setMaterial(7, 7, 7, 1);
  assert.equal(replaceMaterial(g, 1, 4, { x0: 0, y0: 0, z0: 0, x1: 3, y1: 3, z1: 3 }), 1);
  assert.equal(g.materialAt(7, 7, 7), 1);
});

test('提取框选数据保持相对结构', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(1, 1, 1, 3);
  g.setMaterial(2, 2, 1, 4);
  const ex = extractBox(g, { x0: 1, y0: 1, z0: 1, x1: 2, y1: 2, z1: 1 });
  assert.equal(ex.count, 2);
  assert.equal(ex.data[0], 3);
  assert.equal(ex.data[(1 * 1 + 0) * 2 + 1], 4);
});

test('单独隐藏与恢复', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(1, 1, 1, 2);
  hideVoxel(makeEditContext(g, false), 1, 1, 1);
  assert.equal(hiddenCount(g), 1);
  assert.ok(g.isHidden(1, 1, 1));
  // 删除后隐藏标记一并清除
  g.setMaterial(1, 1, 1, 0);
  assert.equal(hiddenCount(g), 0);
});

test('清除框选', () => {
  const g = new VoxelGrid(dims);
  for (let x = 0; x < 4; x++) g.setMaterial(x, 0, 0, 1);
  assert.equal(clearBox(g, { x0: 1, y0: 0, z0: 0, x1: 2, y1: 0, z1: 0 }), 2);
  assert.equal(g.filled(), 2);
});
