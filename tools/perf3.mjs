import { launch, startServer } from './harness.mjs';
const { server, url } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);
const r = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  m.loadProject({ dims: { nx: 32, ny: 24, nz: 32 }, layerRows: [6,6,6,6] }, null, '');
  // 造一个有起伏的地表：每列高度随机
  let seed = 7;
  const rnd = () => { seed = (seed*1103515245+12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let z=0;z<32;z++) for (let x=0;x<32;x++) {
    const top = m.layers[0].start + m.layers[0].rows - 1 - Math.floor(rnd()*3);
    for (let y=m.layers[3].start; y<=top; y++) m.grid.setMaterial(x,y,z, 1+((x+z+y)%4));
  }
  m.grid.touchAll();
  const t0 = performance.now();
  m.mark({grid:true});
  const mesh = m.mesh;
  const tFull = performance.now()-t0;
  const tris = mesh.triCount;
  // 30 步单列编辑（含网格重算）
  const t1 = performance.now();
  for (let i=0;i<30;i++) {
    m.beginStroke('x'); m.placeColumn(i%32, (i*3)%32); m.endStroke();
    void m.mesh;
  }
  const t30 = performance.now()-t1;
  return { tFull: Math.round(tFull), tris, voxels: m.filledCount, avgPerEdit: +(t30/30).toFixed(2) };
});
console.log(JSON.stringify(r));
await browser.close(); server.close();
