import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VoxelGrid, mirrorConsistency, encodeRle, decodeRle } from '../src/core/voxelGrid';
import { meshGrid, meshMask, buildVisibility, volumeShares } from '../src/core/mesher';
import { buildLayers } from '../src/core/layers';
import { MATERIAL_MAX } from '../src/core/materials';

const dims = { nx: 4, ny: 4, nz: 4 };

test('网格索引与坐标互逆', () => {
  const g = new VoxelGrid(dims);
  for (let y = 0; y < 4; y++)
    for (let z = 0; z < 4; z++)
      for (let x = 0; x < 4; x++) {
        const i = g.index(x, y, z);
        assert.deepEqual(g.coords(i), { x, y, z });
      }
});

test('单个体素生成 6 个面 12 个三角面', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(1, 1, 1, 2);
  const m = meshGrid(g);
  assert.equal(m.quadCount, 6);
  assert.equal(m.triCount, 12);
  assert.equal(m.batches.length, 1);
  assert.equal(m.batches[0].material, 2);
});

test('相邻体素之间剔除共享面，同材质共面合并', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(1, 1, 1, 1);
  g.setMaterial(2, 1, 1, 1);
  const m = meshGrid(g);
  // 并集为 2×1×1 盒体，共 6 个外表面
  assert.equal(m.quadCount, 6);
});

test('不同材质的相邻面不被合并', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(0, 0, 0, 1);
  g.setMaterial(1, 0, 0, 2);
  const m = meshGrid(g);
  assert.equal(m.batches.length, 2);
  assert.equal(m.quadCount, 10);
});

test('贪心合并：2×2 平面只出 1 个四边形', () => {
  const g = new VoxelGrid(dims);
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) g.setMaterial(x, y, 0, 3);
  const m = meshGrid(g);
  // 一个 2×2×1 盒体：顶/底各 1 quad，四侧面各 1 quad = 6
  assert.equal(m.quadCount, 6);
});

test('贪心关闭时每个格子单独出四边形', () => {
  const g = new VoxelGrid(dims);
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) g.setMaterial(x, y, 0, 3);
  const mask = buildVisibility(g);
  const m = meshMask(dims, mask, false);
  // 2×2×1 盒体逐格出四边形：上下各 4 + 前后各 4 + 左右各 2 = 16
  assert.equal(m.quadCount, 16);
});

test('单面剔除后法线朝向外部', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(0, 0, 0, 1);
  const m = meshGrid(g);
  const v = m.batches[0].vertices;
  const normals = new Set<string>();
  for (let i = 3; i < v.length; i += 6) normals.add(`${v[i]},${v[i + 1]},${v[i + 2]}`);
  assert.deepEqual(
    [...normals].sort(),
    ['-1,0,0', '0,-1,0', '0,0,-1', '0,0,1', '0,1,0', '1,0,0'],
  );
});

test('镜像一致性计算', () => {
  const g = new VoxelGrid(dims);
  for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) {
    g.setMaterial(0, y, z, 1);
    g.setMaterial(3, y, z, 1);
  }
  assert.equal(mirrorConsistency(g).ratio, 1);
  g.setMaterial(3, 0, 0, 2);
  const r = mirrorConsistency(g);
  assert.ok(r.ratio < 1);
  assert.equal(r.total, 32);
});

test('体积占比归一化', () => {
  const layers = buildLayers([2, 2]);
  const g = new VoxelGrid({ nx: 2, ny: 4, nz: 2 });
  // 上层（y=2,3）填 3 格；下层（y=0,1）填满 8 格
  g.setMaterial(0, 3, 0, 1);
  g.setMaterial(1, 2, 0, 1);
  g.setMaterial(0, 2, 1, 1);
  for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) for (let x = 0; x < 2; x++) g.setMaterial(x, y, z, 2);
  const shares = volumeShares(g, layers);
  assert.equal(Math.round(shares.reduce((a, b) => a + b, 0) * 1000), 1000);
  assert.ok(shares[1] > shares[0]);
});

test('RLE 编解码往返', () => {
  const bytes = new Uint8Array(5000);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 7 === 0 ? 0 : (i * 13) % 9;
  const enc = encodeRle(bytes);
  const dec = decodeRle(enc, bytes.length);
  assert.deepEqual(Array.from(dec), Array.from(bytes));
  const g = new VoxelGrid({ nx: 8, ny: 8, nz: 8 });
  g.setMaterial(2, 3, 4, MATERIAL_MAX);
  const restored = VoxelGrid.deserialize(g.serialize());
  assert.equal(restored.materialAt(2, 3, 4), MATERIAL_MAX);
});

test('隐藏体素不进入网格', () => {
  const g = new VoxelGrid(dims);
  g.setMaterial(0, 0, 0, 1);
  g.setMaterial(3, 3, 3, 1);
  g.setHidden(3, 3, 3, true);
  const m = meshGrid(g);
  assert.equal(m.quadCount, 6);
});

test('只显示某一层', () => {
  const layers = buildLayers([1, 1, 1, 1]);
  const g = new VoxelGrid({ nx: 1, ny: 4, nz: 1 });
  for (let y = 0; y < 4; y++) g.setMaterial(0, y, 0, 1);
  const m = meshGrid(g, { layers, visibleLayers: new Set([2]) });
  assert.equal(m.quadCount, 6);
  assert.equal(m.triCount, 12);
});
