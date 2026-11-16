import { launch, startServer } from './harness.mjs';
import assert from 'node:assert/strict';

const { server, url } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);

const ev = (fn, arg) => page.evaluate(fn, arg);
const M = `document.querySelector('app-shell').shadowRoot.querySelector('voxel-viewport').model`;

// ── 1. 图层可见性 ──
const vis = await ev(new Function(`
  const m = ${M};
  const mats=[1,2,3,5];
  m.layers.forEach(l=>{for(let y=l.start;y<l.start+l.rows;y++)for(let z=0;z<m.dims.nz;z++)for(let x=0;x<m.dims.nx;x++) m.grid.setMaterial(x,y,z,mats[l.index]);});
  m.mark({grid:true,view:true});
  const all = m.mesh.triCount;
  m.setSoloLayer(2);
  const solo = m.mesh.triCount;
  m.setSoloLayer(null);
  m.toggleLayer(0);
  const hiddenTop = m.mesh.triCount;
  m.toggleLayer(0);
  return { all, solo, hiddenTop };
`));
console.log('visibility:', JSON.stringify(vis));
assert.ok(vis.solo > 0 && vis.solo < vis.all, '单层显示应减少面数');
assert.ok(vis.hiddenTop < vis.all, '隐藏一层应减少面数');

// ── 2. 框选 → 平移到别的地层 ──
const moved = await ev(new Function(`
  const m = ${M};
  m.loadProject({dims:{nx:8,ny:8,nz:8},layerRows:[2,2,2,2]}, null, '');
  const L = m.layers;
  // 第 1 层放 2x2 块
  for (const y of [L[0].start, L[0].start+1]) for (let z=0;z<2;z++) for (let x=0;x<2;x++) m.grid.setMaterial(x,y,z,4);
  m.mark({grid:true});
  m.setSelection({x0:0,y0:L[0].start,z0:0,x1:1,y1:L[0].start+1,z1:1});
  const before = m.filledCount;
  const copied = m.copySelection();
  const r = m.pasteToLayer(3, false);
  const topLayerFilled = (()=>{let n=0;for(let y=L[3].start;y<L[3].start+L[3].rows;y++)for(let z=0;z<8;z++)for(let x=0;x<8;x++) if(m.grid.materialAt(x,y,z)) n++;return n;})();
  const srcFilled = (()=>{let n=0;for(let y=L[0].start;y<L[0].start+L[0].rows;y++)for(let z=0;z<8;z++)for(let x=0;x<8;x++) if(m.grid.materialAt(x,y,z)) n++;return n;})();
  return { before, copied, moved: r.moved, topLayerFilled, srcFilled, total: m.filledCount };
`));
console.log('move to layer:', JSON.stringify(moved));
assert.equal(moved.copied, 8);
assert.equal(moved.moved, 8);
assert.equal(moved.topLayerFilled, 8);
assert.equal(moved.srcFilled, 0, '剪切后源区域应为空');
assert.equal(moved.total, 8);

// ── 3. 同类土色整片替换 ──
const rep = await ev(new Function(`
  const m = ${M};
  const n = m.replaceAll(4, 6);
  const counts = m.grid.countsByMaterial();
  return { n, m4: counts[4], m6: counts[6] };
`));
console.log('replace:', JSON.stringify(rep));
assert.equal(rep.n, 8);
assert.equal(rep.m6, 8);

// ── 4. 隐藏/删除单个体素 ──
const hid = await ev(new Function(`
  const m = ${M};
  const L = m.layers[3];
  const y = L.start;
  // 找第一个实体
  let found=null;
  outer: for (let yy=0; yy<m.dims.ny; yy++) for (let z=0;z<m.dims.nz;z++) for (let x=0;x<m.dims.nx;x++) {
    if (m.grid.materialAt(x,yy,z)) { found={x,y:yy,z}; break outer; }
  }
  const hit = { x: found.x, y: found.y, z: found.z, index: m.grid.index(found.x,found.y,found.z), material: m.grid.materialAt(found.x,found.y,found.z), normal:{x:0,y:1,z:0}, distance:1, place:{x:found.x,y:found.y+1,z:found.z} };
  const trisBefore = m.mesh.triCount;
  m.toggleHiddenAt(hit);
  const afterHide = { hidden: m.hiddenVoxels, tris: m.mesh.triCount };
  m.toggleHiddenAt({...hit, index: -999}); // 命中同一格（射线无法命中已隐藏格，这里直接调用以恢复）
  const afterShow = { hidden: m.hiddenVoxels };
  m.erase(hit);
  return { trisBefore, afterHide, afterShow, filledAfterErase: m.filledCount };
`));
console.log('hide/erase:', JSON.stringify(hid));
assert.equal(hid.afterHide.hidden, 1);
assert.equal(hid.afterShow.hidden, 0, '再次点击应恢复显示');
assert.equal(hid.filledAfterErase, 7);

// ── 5. 撤销/重做覆盖真实操作 ──
const undo = await ev(new Function(`
  const m = ${M};
  const base = m.filledCount;
  // 再放一块（可撤销的放置操作）
  const L = m.layers[2];
  m.beginStroke('放置体素');
  m.placeColumn(5, 5);
  m.endStroke();
  const afterPlace = m.filledCount;
  m.undo();
  const afterUndo = m.filledCount;
  m.redo();
  const afterRedo = m.filledCount;
  // 整片替换也应可撤销
  m.replaceAll(m.material, 7);
  const afterReplace7 = m.grid.countsByMaterial()[7];
  m.undo();
  const afterUndoReplace = m.grid.countsByMaterial()[7];
  return { base, afterPlace, afterUndo, afterRedo, afterReplace7, afterUndoReplace, canUndo: m.canUndo };
`));
console.log('undo/redo:', JSON.stringify(undo));
assert.equal(undo.afterPlace, undo.base + 1, '放置应 +1');
assert.equal(undo.afterUndo, undo.base, '撤销应回到放置前');
assert.equal(undo.afterRedo, undo.afterPlace, '重做应恢复到放置后');
assert.ok(undo.afterReplace7 > 0);
assert.equal(undo.afterUndoReplace, 0, '撤销替换应清除材质 7');

// ── 6. 键盘快捷键（材质 / 工具 / 镜像） ──
await page.locator('body').click({ position: { x: 400, y: 300 } });
await page.keyboard.press('3');
const kb = await ev(new Function(`
  const m = ${M}; return { material: m.material, tool: m.tool, mirror: m.mirror };
`));
console.log('after key 3:', JSON.stringify(kb));
assert.equal(kb.material, 3);

console.log('errors:', errors);
await browser.close();
server.close();
console.log('ALL PASSED');
