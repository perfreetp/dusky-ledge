import { launch, startServer } from './harness.mjs';
const { server, url } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  m.toggleMirror();
  m.setMaterial(2);
  // 画一条不对称的带子，镜像应同时在右侧出现
  for (let z = 2; z < 9; z++) {
    m.beginStroke('放置体素');
    m.placeColumn(1, z);
    m.placeColumn(2, z);
    m.endStroke();
  }
  m.setMaterial(3);
  for (let z = 3; z < 8; z++) {
    m.beginStroke('放置体素');
    m.placeColumn(0, z);
    m.endStroke();
  }
});
await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  const left = [], right = [];
  for (let z=0;z<m.dims.nz;z++) for (let x=0;x<m.dims.nx;x++) {
    if (m.grid.materialAt(x, m.layers[0].start+2, z)) (x < 6 ? left : right).push([x,z]);
  }
  return { mirror: m.mirror, filled: m.filledCount, leftCount: left.length, rightCount: right.length, ratio: m.stats.mirrorRatio };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: 'tools/shot-mirror.png' });
await browser.close(); server.close();
