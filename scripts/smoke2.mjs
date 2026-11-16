// 交互流程测试: 拖拽灯、方案对比、工作流、导出
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// 1. 点击灯手柄选中, 然后拖拽
const canvas = await page.locator('canvas').boundingBox();
const handle = await page.evaluate(() => window.__screenLights?.[0]);
console.log('handle pos:', JSON.stringify(handle));
await page.mouse.click(canvas.x + handle.x, canvas.y + handle.y);
await page.waitForTimeout(400);
let selected = await page.locator('.card-title', { hasText: '选中:' }).count();
console.log('select light via click:', selected > 0 ? 'OK' : 'FAIL');

// 拖拽该灯(从手柄位置拖到新位置)
if (selected > 0) {
  await page.mouse.move(canvas.x + handle.x, canvas.y + handle.y);
  await page.mouse.down();
  await page.mouse.move(canvas.x + handle.x + 120, canvas.y + handle.y + 100, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const moved = await page.evaluate(() => window.__screenLights?.[0]);
  console.log('drag light:', JSON.stringify(moved), Math.hypot(moved.x - handle.x - 120, moved.y - handle.y - 100) < 30 ? 'OK' : 'CHECK');
  await page.screenshot({ path: 'scripts/it-drag.png' });
}

// 相机旋转拖拽
await page.mouse.move(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.8);
await page.mouse.down();
await page.mouse.move(canvas.x + canvas.width * 0.65, canvas.y + canvas.height * 0.6, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(400);
await page.screenshot({ path: 'scripts/it-rotate.png' });

// 2. 方案对比: 存 B, 改 A(删一盏灯), 看暗区对比
await page.click('text=方案对比');
await page.click('text=把当前灯位存为方案 B');
await page.waitForTimeout(300);
// 删除当前选中的灯(若选中) — 回到灯光面板
await page.click('button.tab:has-text("灯光")');
const delBtn = page.locator('button.danger:has-text("删除该灯")');
if (await delBtn.count()) { await delBtn.click(); }
await page.waitForTimeout(300);
await page.click('text=方案对比');
await page.waitForTimeout(400);
const cmpText = await page.locator('.cmp-table').innerText().catch(() => 'NO TABLE');
console.log('compare table:\n' + cmpText);
await page.screenshot({ path: 'scripts/it-compare.png' });

// 3. 工作流: 提交审核 -> 主管退回 -> 返工+1 -> 再提交 -> 通过交付
await page.click('button:has-text("提交审核")');
await page.waitForTimeout(200);
await page.selectOption('header select >> nth=0', 'supervisor');
await page.waitForTimeout(200);
await page.click('button:has-text("退回返工")');
await page.waitForTimeout(200);
const rework = await page.locator('.status-row').innerText();
console.log('after reject:', rework.replace(/\n/g, ' '));
// 制作员再提交, 主管通过
await page.selectOption('header select >> nth=0', 'maker');
await page.click('button:has-text("提交审核")');
await page.selectOption('header select >> nth=0', 'supervisor');
await page.waitForTimeout(200);
await page.click('button:has-text("通过并交付")');
await page.waitForTimeout(300);
const badge = await page.locator('.badge').innerText();
console.log('final status:', badge);
await page.screenshot({ path: 'scripts/it-done.png' });

// 4. 导出
await page.click('button.tab:has-text("导出")');
const dl1 = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await page.click('text=导出当前布光图');
console.log('export PNG:', (await dl1) ? 'OK' : 'FAIL');
const dl2 = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await page.click('text=导出灯位表');
console.log('export CSV:', (await dl2) ? 'OK' : 'FAIL');
const dl3 = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await page.click('text=打包交付');
console.log('export package:', (await dl3) ? 'OK' : 'FAIL');

console.log('console errors:', errors.length ? errors.slice(0, 10).join('\n') : '(none)');
await browser.close();
