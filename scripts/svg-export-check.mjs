import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
await page.goto('http://127.0.0.1:5180/', { waitUntil: 'networkidle' });
await page.waitForSelector('.palette-item');

await page.evaluate(() => {
  const { modelStore } = window.__mc3d;
  modelStore.loadModel({
    featureSeq: 0,
    features: [],
    clip: { enabled: false, point: [0, 0, 0], normal: [0, -1, 0], showHatch: true, hatchGap: 6 },
  });
  modelStore.addFeature('box', [0, 20, 0]);
  const c = modelStore.addFeature('cylinder', [0, 30, 0], 'subtract');
  modelStore.updateFeature(c.id, { dims: { radius: 10, height: 60, segments: 48 } });
  // 加一个四棱台并集，丰富视图
  const f = modelStore.addFeature('frustum', [40, 15, 0], 'add');
  modelStore.updateFeature(f.id, { dims: { bottom: 24, top: 12, height: 30, segments: 4 } });
});
await page.waitForTimeout(300);

const svgNoClip = await page.evaluate(() => window.__mc3d.generateSVG());
const svgClip = await page.evaluate(() => {
  const { modelStore } = window.__mc3d;
  modelStore.setClip({ enabled: true, point: [0, 22, 0], normal: [0, -1, 0] });
  const r = window.__mc3d.generateSVG();
  modelStore.setClip({ enabled: false });
  return r.svg;
});
const { writeFileSync } = await import('node:fs');
writeFileSync('scripts/view-no-clip.svg', svgNoClip.svg);
writeFileSync('scripts/view-with-clip.svg', svgClip);
console.log('no-clip views:', JSON.stringify(svgNoClip.views));
console.log('clip lines:', (svgClip.match(/<line/g) || []).length, 'polygons:', (svgClip.match(/<polygon/g) || []).length);

// 三视图弹窗截图
await page.click('button:has-text("生成三视图")');
await page.waitForSelector('.modal svg');
await page.waitForTimeout(300);
await page.screenshot({ path: 'scripts/shot-3-modal.png' });
await browser.close();
