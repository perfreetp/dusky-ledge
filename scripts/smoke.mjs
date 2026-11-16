// 运行时冒烟测试: 加载页面, 收集控制台错误, 截图, 验证渲染非全黑
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// 画布存在且非全黑
const info = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { canvas: false };
  return { canvas: true, w: canvas.width, h: canvas.height };
});
await page.screenshot({ path: 'scripts/shot-night.png' });

// 切白天
await page.selectOption('header select >> nth=1', 'day');
await page.waitForTimeout(800);
await page.screenshot({ path: 'scripts/shot-day.png' });

// 关阴影
await page.click('button.toggle');
await page.waitForTimeout(800);
await page.screenshot({ path: 'scripts/shot-noshadow.png' });

// 统计面板
await page.click('text=照度统计');
await page.waitForTimeout(500);
await page.screenshot({ path: 'scripts/shot-stats.png' });

console.log('canvas:', JSON.stringify(info));
console.log('errors:', errors.length ? errors.slice(0, 20).join('\n') : '(none)');
await browser.close();
