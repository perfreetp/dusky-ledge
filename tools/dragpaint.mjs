import { launch, startServer } from './harness.mjs';
const { server, url } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', e => console.log('ERR', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);
// 视角调成接近俯视，便于拖拽覆盖地表
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const vp = s.shadowRoot.querySelector('voxel-viewport');
  vp.setView('top');
});
await page.waitForTimeout(200);
const r0 = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const vp = s.shadowRoot.querySelector('voxel-viewport');
  const c = vp.shadowRoot.querySelector('canvas').getBoundingClientRect();
  return { x: c.x, y: c.y, w: c.width, h: c.height };
});
// 在画布中部来回拖拽
await page.mouse.move(r0.x + r0.w*0.5, r0.y + r0.h*0.45);
await page.mouse.down();
for (let i=0;i<18;i++){
  await page.mouse.move(r0.x + r0.w*(0.42 + i*0.012), r0.y + r0.h*(0.42 + (i%5)*0.02));
  await page.waitForTimeout(30);
}
await page.mouse.up();
await page.waitForTimeout(300);
const r1 = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const vp = s.shadowRoot.querySelector('voxel-viewport');
  const m = vp.model;
  return { filled: m.filledCount, tris: m.mesh.triCount, undoLabel: m.undoLabel, canUndo: m.canUndo };
});
console.log(JSON.stringify(r1));
// 一次拖拽应只产生一步撤销
await page.keyboard.press('Control+z');
await page.waitForTimeout(200);
const r2 = await page.evaluate(() => document.querySelector('app-shell').shadowRoot.querySelector('voxel-viewport').model.filledCount);
console.log('after 1 undo:', r2);
await page.screenshot({ path: 'tools/shot-drag.png' });
await browser.close(); server.close();
