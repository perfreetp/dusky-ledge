import { launch, startServer } from './harness.mjs';

const { server, url } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);

// 造一个错误模型：漏掉第 3 层、镜像不对称、面数超预算
const r = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  m.assignment = { ...m.assignment, mirrorRequired: true, faceBudget: 30 };
  m.loadProject({ dims: { nx: 12, ny: 12, nz: 12 }, layerRows: [3, 3, 3, 3] }, m.assignment, '');
  const mats = [1, 2, 3, 5];
  m.layers.forEach((l) => {
    if (l.index === 2) return; // 故意漏第 3 层
    for (let y = l.start; y < l.start + l.rows; y++)
      for (let z = 0; z < m.dims.nz; z++)
        for (let x = 0; x < 6; x++) m.grid.setMaterial(x, y, z, mats[l.index]);
  });
  // 不对称：右侧只补一部分
  for (let y = 9; y < 12; y++) for (let z = 0; z < 4; z++) for (let x = 6; x < 9; x++) m.grid.setMaterial(x, y, z, 1);
  m.mark({ grid: true, view: true });
  const g = m.grade();
  return {
    filled: m.filledCount, tris: m.mesh.triCount, mirror: m.stats.mirrorRatio,
    total: g.total, checks: g.checks.map(c => [c.label, c.score, c.max, c.pass]),
    issues: g.issues.map(i => [i.code, i.detail]),
  };
});
console.log(JSON.stringify(r, null, 1));

// 减面
const dec = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  const d = m.decimate(30);
  return { before: d.trianglesBefore, after: d.trianglesAfter, factor: d.factor, achieved: d.achieved };
});
console.log('decimate:', JSON.stringify(dec));
await page.screenshot({ path: 'tools/shot-broken.png' });

// OBJ 导出内容抽检
const obj = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  const o = m.buildObj(false);
  const lines = o.obj.split('\n');
  return {
    head: lines.slice(0, 6),
    vCount: lines.filter(l => l.startsWith('v ')).length,
    fCount: lines.filter(l => l.startsWith('f ')).length,
    materials: [...new Set(lines.filter(l => l.startsWith('usemtl')).map(l => l.slice(7)))],
    mtl: o.mtl.split('\n').filter(l => l.startsWith('newmtl') || l.startsWith('Kd')).slice(0, 6),
    triangles: o.triangles,
  };
});
console.log('obj:', JSON.stringify(obj, null, 1));
console.log('errors:', errors);
await browser.close(); server.close();
