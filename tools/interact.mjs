import { launch, startServer } from './harness.mjs';

const { server, url } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(700);

const S = () => page.evaluate(() => {
  const shell = document.querySelector('app-shell');
  const vp = shell.shadowRoot.querySelector('voxel-viewport');
  const m = vp.model;
  return {
    filled: m.filledCount,
    tris: m.mesh.triCount,
    mirror: m.mirror,
    tool: m.tool,
    layer: m.currentLayerIndex,
    selection: m.selection,
    hidden: m.hiddenVoxels,
    canvas: (() => { const r = vp.shadowRoot.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
  };
});

const click = async (fx, fy) => {
  const s = await S();
  await page.mouse.click(s.canvas.x + s.canvas.w * fx, s.canvas.y + s.canvas.h * fy);
  await page.waitForTimeout(140);
};

console.log('start:', JSON.stringify(await S()));
await click(0.5, 0.55);
console.log('after 1 place:', (await S()).filled);

// mirror on, place again
await page.keyboard.press('m');
await click(0.42, 0.55);
const s2 = await S();
console.log('mirror on:', s2.mirror, 'filled:', s2.filled);

// undo twice
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
console.log('after undo x2:', (await S()).filled);

// paint a run of voxels
await page.keyboard.press('m'); // mirror off
const s3 = await S();
await page.mouse.move(s3.canvas.x + s3.canvas.w * 0.5, s3.canvas.y + s3.canvas.h * 0.52);
await page.mouse.down();
for (let i = 0; i < 6; i++) {
  await page.mouse.move(s3.canvas.x + s3.canvas.w * (0.5 + i * 0.02), s3.canvas.y + s3.canvas.h * 0.52);
  await page.waitForTimeout(60);
}
await page.mouse.up();
await page.waitForTimeout(200);
const s4 = await S();
console.log('stroke filled:', s4.filled, 'tris:', s4.tris);

// toolbar states
const tools = await page.evaluate(() => {
  const shell = document.querySelector('app-shell');
  const tb = shell.shadowRoot.querySelector('editor-toolbar');
  return Array.from(tb.shadowRoot.querySelectorAll('button.tool')).map(b => b.textContent.trim());
});
console.log('toolbar:', tools);

// layer panel: solo layer 2 by dblclick
await page.evaluate(() => {
  const shell = document.querySelector('app-shell');
  const lp = shell.shadowRoot.querySelector('layer-panel');
  const items = lp.shadowRoot.querySelectorAll('.item');
  items[1].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
});
await page.waitForTimeout(200);
const soloState = await page.evaluate(() => {
  const shell = document.querySelector('app-shell');
  const vp = shell.shadowRoot.querySelector('voxel-viewport');
  return { solo: vp.model.soloLayer, tris: vp.model.mesh.triCount };
});
console.log('solo:', JSON.stringify(soloState));
await page.screenshot({ path: 'tools/shot-solo.png' });

// box select
await page.evaluate(() => {
  const shell = document.querySelector('app-shell');
  shell.shadowRoot.querySelector('voxel-viewport').model.showAllLayers();
});
await page.keyboard.press('r');
const s5 = await S();
await page.mouse.move(s5.canvas.x + s5.canvas.w * 0.45, s5.canvas.y + s5.canvas.h * 0.5);
await page.mouse.down();
await page.mouse.move(s5.canvas.x + s5.canvas.w * 0.6, s5.canvas.y + s5.canvas.h * 0.62, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
console.log('selection:', JSON.stringify((await S()).selection));
await page.screenshot({ path: 'tools/shot-select.png' });

console.log('errors:', errors);
await browser.close();
server.close();
