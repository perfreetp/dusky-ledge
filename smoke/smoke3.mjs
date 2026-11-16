// 交互测试:拖动旋转手柄 -> 应产生旋转关键帧;时间轴镜像按钮应改变关键帧值
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const errors = [];
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));

// 新建空动画,选中颈骨骼(默认已选 neck),拖到第 10 帧
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent === '新建动画').click();
});
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => {
  const input = [...document.querySelectorAll('.transport label input')][0];
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '10');
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 200));

// 读取手柄屏幕坐标,在 Y 环(水平面)上拖动
const g = await page.evaluate(() => {
  const mod = window;
  return mod.__vp ? mod.__vp.gizmoScreen('neck') : null;
});
console.log('gizmo:', JSON.stringify(g));
if (!g) {
  errors.push('gizmoScreen hook missing');
} else {
  // Y 环在水平面:环上点 (cx + r, cy) 附近;向下拖 1/4 圆弧
  const start = { x: g.cx + g.r, y: g.cy };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    await page.mouse.move(g.cx + g.r * Math.cos(a), g.cy + g.r * Math.sin(a) * 0.6);
    await new Promise((r) => setTimeout(r, 16));
  }
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 800)); // 等 persist 落盘

  const tracks = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('liondance.project.v1'));
    return p.anim.tracks;
  });
  const rotKeys = tracks?.neck?.rot || [];
  console.log('neck rot keys after drag:', JSON.stringify(rotKeys.map((k) => [k.f, ...k.v.map((v) => +v.toFixed(1))])));
  if (!rotKeys.length) errors.push('gizmo drag did not create rot keyframe');
  else {
    const k = rotKeys.find((x) => x.f === 10);
    if (!k) errors.push('keyframe not at frame 10');
    else if (Math.max(...k.v.map(Math.abs)) < 5) errors.push(`expected significant rotation, got ${JSON.stringify(k.v)}`);
  }
}

// 时间轴:先打几个关键帧再测镜像
await page.evaluate(() => {
  // 给左前肢打关键帧:选中骨骼树里的 左前肢
  const rows = [...document.querySelectorAll('.tree-row')];
  rows.find((r) => r.textContent.includes('左前肢'))?.click();
});
await new Promise((r) => setTimeout(r, 200));
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent === 'K 旋转关键帧')?.click();
});
await new Promise((r) => setTimeout(r, 600));
const mirrored = await page.evaluate(() => {
  const before = JSON.parse(localStorage.getItem('liondance.project.v1')).anim.tracks;
  [...document.querySelectorAll('button')].find((b) => b.textContent === '左右镜像')?.click();
  return new Promise((res) => setTimeout(() => {
    const after = JSON.parse(localStorage.getItem('liondance.project.v1')).anim.tracks;
    res({ before: before.frontLegL?.rot?.length || 0, afterL: after.frontLegL?.rot?.length || 0, afterR: after.frontLegR?.rot?.length || 0 });
  }, 700));
});
console.log('mirror:', JSON.stringify(mirrored));
if (mirrored.before > 0 && mirrored.afterR === 0) errors.push('mirror did not swap to right bone');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
await browser.close();
process.exit(errors.length ? 1 : 0);
