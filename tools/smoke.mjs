import { launch, startServer } from './harness.mjs';

const { server, url } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(900);

const info = await page.evaluate(() => {
  const shell = document.querySelector('app-shell');
  const vp = shell?.shadowRoot?.querySelector('voxel-viewport');
  const canvas = vp?.shadowRoot?.querySelector('canvas');
  const gl = canvas?.getContext('webgl2');
  const stage = shell?.shadowRoot?.querySelector('.stage')?.getBoundingClientRect();
  return {
    shell: !!shell,
    viewport: !!vp,
    canvas: canvas ? { w: canvas.width, h: canvas.height, cw: canvas.clientWidth, ch: canvas.clientHeight } : null,
    gl: !!gl,
    glErr: vp?.glError ?? null,
    stage: stage ? { w: Math.round(stage.width), h: Math.round(stage.height) } : null,
  };
});
console.log(JSON.stringify(info, null, 2));
console.log('errors:', errors);

await page.screenshot({ path: 'tools/shot-initial.png' });
await browser.close();
server.close();
