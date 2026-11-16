// 真实浏览器 WebGPU 端到端冒烟（Playwright + 全量 Chromium，SwiftShader/ANGLE 软件渲染）
import { chromium } from 'playwright';

const EXE = process.env.CHROME_PATH ??
  'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://127.0.0.1:5173/';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name} ${extra}`); }
  else { fail++; console.error(`  ✗ ${name} ${extra}`); }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: EXE,
  args: [
    '--enable-webgpu-developer-features',
    '--ignore-gpu-blocklist',
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const consoleErrors: string[] = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const gpu = await page.evaluate(() => !!navigator.gpu);
  check('浏览器暴露 navigator.gpu', gpu);

  const errPanel = await page.locator('.viewport-error').count();
  check('无 WebGPU 初始化错误面板', errPanel === 0);

  const stats = await page.waitForFunction(
    () => {
      const s = (window as unknown as { __gpuStats?: { drawCalls: number; visibleSegments: number; frameMs: number } }).__gpuStats;
      return s && s.drawCalls > 0 ? s : null;
    },
    { timeout: 15000 },
  );
  const s = await stats.jsonValue() as { drawCalls: number; visibleSegments: number; totalSegments: number; visibleIndices: number; frameMs: number };
  check('WebGPU 实际产出绘制调用', s.drawCalls > 0, `(${s.drawCalls} calls)`);
  check('视锥裁剪生效（可见段 < 总段数）', s.visibleSegments < s.totalSegments, `(${s.visibleSegments}/${s.totalSegments})`);
  check('可见索引数量级合理', s.visibleIndices > 1000, `(${s.visibleIndices.toLocaleString()})`);
  check('帧耗时 < 100ms（软件渲染）', s.frameMs < 100, `(${s.frameMs.toFixed(1)} ms)`);

  // 点选巷道 → 属性卡（全景视角下多点尝试）
  const pickPoints: [number, number][] = [
    [800, 500], [600, 400], [1000, 600], [700, 650], [950, 350], [500, 500], [1100, 450],
  ];
  let picked = false;
  for (const [x, y] of pickPoints) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(250);
    if ((await page.locator('.property-card').count()) > 0) { picked = true; break; }
  }
  if (picked) {
    check('点选弹出巷道属性卡', true);
    check('属性卡含断面参数', (await page.locator('.property-card', { hasText: '断面参数' }).count()) === 1);
    check('属性卡含标高区间', (await page.locator('.property-card', { hasText: '标高区间' }).count()) === 1);
    await page.locator('.property-card .icon-btn').click();
  } else {
    check('点选弹出巷道属性卡', false, '（多个采样点均未命中）');
  }

  // LOD：全景初始视距 >420m，支护为简模；拉近补高模，再拉远重新降级
  const lodAt = async () => page.evaluate(() => {
    const el = document.querySelector('.hud-stats')?.textContent ?? '';
    return el.includes('简模') ? 'low' : 'high';
  });
  check('全景初始视距支护为简模', (await lodAt()) === 'low');
  const box = await page.locator('canvas').boundingBox();
  // 拉近到 LOD 阈值之内，高模（拱架+锚杆/螺栓）补回
  for (let i = 0; i < 14; i++) {
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(500);
  check('拉近后支护/螺栓恢复高模', (await lodAt()) === 'high');
  // 拉远重新降级为简模
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(500);
  check('拉远后支护/螺栓降级简模', (await lodAt()) === 'low');

  // 拖动跟手：旋转后视口持续有帧输出且无错误
  await page.mouse.move(800, 500);
  await page.mouse.down();
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(800 + i * 25, 500 + Math.sin(i) * 15, { steps: 2 });
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  const dragStats = await page.evaluate(() => (window as unknown as { __gpuStats: { drawCalls: number; visibleSegments: number } }).__gpuStats);
  check('拖动旋转后渲染持续正常', dragStats.drawCalls > 0 && dragStats.visibleSegments > 0, `(${dragStats.drawCalls} calls)`);

  // 图层开关：关掉支护后绘制调用应下降
  const callsBefore = s.drawCalls;
  await page.locator('.layer-row', { hasText: '支护' }).locator('input').uncheck();
  await page.waitForTimeout(800);
  const afterOff = await page.evaluate(() => (window as unknown as { __gpuStats: { drawCalls: number } }).__gpuStats.drawCalls);
  check('图层关闭减少绘制调用', afterOff < callsBefore, `(${callsBefore} → ${afterOff})`);
  await page.locator('.layer-row', { hasText: '支护' }).locator('input').check();

  // 单层独显
  await page.locator('.solo-btn', { hasText: '独' }).first().click();
  await page.waitForTimeout(500);
  check('单层独显按钮激活', (await page.locator('.solo-btn.active').count()) >= 1);
  await page.getByRole('button', { name: '退出单层独显' }).click();

  // 剖切面开关（input 视觉隐藏且在侧边栏滚动区，直接触发原生 click 切换）
  await page.locator('.switch input').first().evaluate((el) => el.click());
  await page.waitForTimeout(500);
  check('剖切面可启用', (await page.locator('.clip-readout b').count()) >= 1);
  const clippedStats = await page.evaluate(() => (window as unknown as { __gpuStats: { drawCalls: number; visibleIndices: number } }).__gpuStats);
  check('剖切启用后渲染继续', clippedStats.drawCalls > 0 && clippedStats.visibleIndices > 0);
  // 拖动剖切滑块不报错
  await page.locator('input[type="range"]').first().fill('750');
  await page.waitForTimeout(300);

  // 两期分屏
  await page.getByRole('button', { name: '两期分屏' }).click();
  await page.waitForTimeout(1500);
  const canvases = await page.locator('canvas').count();
  check('分屏渲染两个 WebGPU 画布', canvases === 2, `(${canvases})`);
  const splitStats = await page.evaluate(() => (window as unknown as { __gpuStats: { drawCalls: number } }).__gpuStats);
  check('分屏仍有绘制输出', splitStats.drawCalls > 0);

  // 档案建档 → 加工 → 差异报告流程
  await page.getByRole('button', { name: '两期分屏' }).click();
  await page.getByRole('button', { name: '测量建档' }).click();
  await page.getByRole('button', { name: '建档编号' }).first().click();
  await page.getByRole('button', { name: '建档编号' }).first().click();
  await page.waitForTimeout(300);
  check('生成测量档案编号', (await page.locator('.record-id', { hasText: 'CL-' }).count()) >= 2);
  await page.getByRole('button', { name: '加工为图档版本' }).first().click();
  await page.getByRole('button', { name: '加工为图档版本' }).first().click();
  await page.getByRole('button', { name: '差异报告' }).click();
  await page.locator('.diff-pick select').first().selectOption({ index: 1 });
  await page.locator('.diff-pick select').nth(1).selectOption({ index: 2 });
  await page.getByRole('button', { name: '执行版本比对' }).click();
  await page.waitForTimeout(400);
  check('版本比对产出差异报告', (await page.locator('.diff-summary').count()) === 1);
  check('差异报告含新增/废弃统计', (await page.locator('.chip.added').count()) >= 1 && (await page.locator('.chip.removed').count()) >= 1);

  // 归档检索
  await page.getByRole('button', { name: '归档检索' }).click();
  await page.locator('.field').first().fill('巷');
  await page.getByRole('button', { name: '检索并在视口定位' }).click();
  await page.waitForTimeout(500);
  check('检索返回命中列表', (await page.locator('.search-hit').count()) > 0);

  // 控制台无 WebGPU/WGSL 致命错误（device destroyed 是浏览器关闭/StrictMode 双挂载的良性竞态）
  const fatal = consoleErrors.filter((e) =>
    !/WebGL|GPU stall|swiftshader|SwiftShader|device was destroyed|device lost/i.test(e) &&
    /GPU|WGSL|shader|pipeline|TypeError|undefined is not/i.test(e),
  );
  check('无 GPU/WGSL 致命控制台错误', fatal.length === 0, fatal.length ? `\n     ${fatal.slice(0, 3).join('\n     ')}` : '');
} catch (e) {
  check(`测试流程未抛异常: ${(e as Error).message}`, false);
} finally {
  await browser.close();
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
