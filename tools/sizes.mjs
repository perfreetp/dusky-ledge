import { launch, startServer } from './harness.mjs';
const { server, url } = await startServer();
const browser = await launch();
for (const [w,h] of [[1024,700],[820,700]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const s = document.querySelector('app-shell');
    const m = s.shadowRoot.querySelector('voxel-viewport').model;
    m.layers.forEach(l=>{for(let y=l.start;y<l.start+l.rows;y++)for(let z=0;z<m.dims.nz;z++)for(let x=0;x<m.dims.nx;x++) m.grid.setMaterial(x,y,z,1);});
    m.mark({grid:true,view:true});
  });
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const s = document.querySelector('app-shell');
    const vp = s.shadowRoot.querySelector('voxel-viewport');
    const c = vp.shadowRoot.querySelector('canvas').getBoundingClientRect();
    return { canvasW: Math.round(c.width), canvasH: Math.round(c.height), overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  console.log(w, h, JSON.stringify(info));
  await page.screenshot({ path: `tools/shot-${w}.png` });
  await page.close();
}
await browser.close(); server.close();
