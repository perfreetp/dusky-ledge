import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VoxelGrid } from '../src/core/voxelGrid';
import { mergeBlocks, decimateToBudget } from '../src/core/simplify';
import { meshGrid } from '../src/core/mesher';
import { meshToObj, countObj, meshToMtl } from '../src/core/exportObj';

function filledSphere(n: number, r: number, striped = false): VoxelGrid {
  const g = new VoxelGrid({ nx: n, ny: n, nz: n });
  const c = n / 2;
  for (let y = 0; y < n; y++)
    for (let z = 0; z < n; z++)
      for (let x = 0; x < n; x++) {
        const d = Math.hypot(x + 0.5 - c, y + 0.5 - c, z + 0.5 - c);
        if (d < r) g.setMaterial(x, y, z, striped ? 1 + ((x + y + z) % 3) : 1);
      }
  return g;
}

test('块合并按多数材质取样', () => {
  const g = new VoxelGrid({ nx: 4, ny: 4, nz: 4 });
  g.setMaterial(0, 0, 0, 1);
  g.setMaterial(1, 0, 0, 1);
  g.setMaterial(0, 1, 0, 1);
  g.setMaterial(1, 1, 0, 2);
  const m = mergeBlocks(g, 2);
  assert.deepEqual(m.dims, { nx: 2, ny: 2, nz: 2 });
  assert.equal(m.materialAt(0, 0, 0), 1);
  assert.equal(m.filled(), 1);
});

test('块合并后单元数与面数都下降', () => {
  const g = filledSphere(16, 6.5);
  const before = meshGrid(g);
  const merged = mergeBlocks(g, 2);
  const after = meshGrid(merged);
  assert.equal(merged.dims.nx, 8);
  assert.ok(merged.filled() < g.filled() / 4, `单元数应下降：${g.filled()} -> ${merged.filled()}`);
  assert.ok(after.triCount < before.triCount, `面数应下降：${before.triCount} -> ${after.triCount}`);
});

test('factor=1 为恒等', () => {
  const g = filledSphere(6, 2.2);
  const m = mergeBlocks(g, 1);
  assert.deepEqual(Array.from(m.mat), Array.from(g.mat));
});

test('合并后的粗体素整体填实（减少洞）', () => {
  const g = filledSphere(16, 6.5, true);
  const rough2 = meshGrid(mergeBlocks(g, 2)).triCount;
  const rough4 = meshGrid(mergeBlocks(g, 4)).triCount;
  const plain = meshGrid(g).triCount;
  assert.ok(rough4 < rough2, `${rough4} vs ${rough2}`);
  assert.ok(rough4 < plain);
});

test('按预算减面会找到可达的级别', () => {
  const g = filledSphere(24, 10);
  const full = meshGrid(g).triCount;
  const budget = Math.floor(full / 3);
  const r = decimateToBudget(g, budget);
  assert.ok(r.achieved, `应能找到满足预算的级别（预算 ${budget}，得到 ${r.trianglesAfter}）`);
  assert.ok(r.trianglesAfter <= budget);
  assert.ok(r.factor >= 2);
  assert.equal(r.sourceDims.nx, 24);
  // 不改动原网格
  assert.equal(meshGrid(g).triCount, full);
});

test('预算宽松时不做减面', () => {
  const g = filledSphere(8, 3);
  const full = meshGrid(g).triCount;
  const r = decimateToBudget(g, full + 10);
  assert.equal(r.factor, 1);
  assert.equal(r.trianglesAfter, full);
  assert.equal(r.achieved, true);
});

test('导出时按 factor 放大，模型外形尺寸不变', () => {
  const g = filledSphere(16, 6.5);
  const r = decimateToBudget(g, 200);
  const obj = meshToObj(r.mesh, r.grid.dims, { scale: r.factor });
  const counts = countObj(obj);
  assert.equal(counts.triangles, r.mesh.triCount);
  let maxX = 0;
  for (const line of obj.split('\n')) {
    if (!line.startsWith('v ')) continue;
    const x = Number(line.split(' ')[1]);
    if (Number.isFinite(x) && x > maxX) maxX = x;
  }
  assert.ok(maxX <= 16 + 1e-6 && maxX >= 16 - r.factor * 2, `导出尺寸应接近原网格：${maxX}`);
});

test('MTL 包含每种土色', () => {
  const g = filledSphere(8, 3, true);
  const mesh = meshGrid(g);
  const mtl = meshToMtl(mesh);
  for (const b of mesh.batches) {
    assert.match(mtl, /newmtl /);
  }
  assert.match(mtl, /Kd /);
});
