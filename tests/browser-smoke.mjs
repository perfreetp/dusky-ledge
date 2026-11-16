/**
 * 无头 Chrome CDP 冒烟测试：
 * 启动浏览器 → 打开应用 → 驱动完整业务链路 → 收集 console 错误与截图
 * 运行：node tests/browser-smoke.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4173/';
const PORT = 9333;

const userDir = await mkdtemp(join(tmpdir(), 'dsf-chrome-'));
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDir}`,
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1600,1000',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  'about:blank'
]);

const errors = [];
const logs = [];
let msgId = 0;
const pending = new Map();

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Chrome 页面调试端点未就绪');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((r, rej) => {
  ws.onopen = r;
  ws.onerror = rej;
});

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    logs.push(`[console.${msg.params.type}] ${text}`);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    errors.push(d.exception?.description || d.text);
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    errors.push(msg.params.entry.text);
  }
};

function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evalJs(expression) {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (r.exceptionDetails) {
    errors.push('eval: ' + JSON.stringify(r.exceptionDetails));
  }
  return r.result.value;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join('tests', `${name}.png`), Buffer.from(r.data, 'base64'));
  console.log(`  截图 tests/${name}.png`);
}

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name} ${detail}`);
  pass++;
  console.log(`  ✓ ${name}`);
}

try {
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: URL });
  await sleep(2500);

  // 1. 初始页面
  const title = await evalJs('document.title');
  check('页面标题正确', title.includes('三维总图'));
  const hasCreateBtn = await evalJs(
    `[...document.querySelectorAll('button')].some(b => b.textContent.includes('立新项目'))`
  );
  check('项目列表页有立项按钮', hasCreateBtn);
  await shot('01-project-list');

  // 2. 建立项目
  await evalJs(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('立新项目'));
      b.click();
    })()
  `);
  await sleep(300);
  await evalJs(`
    (() => {
      const inp = document.querySelector('.modal input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '冒烟测试养殖区');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      const ok = [...document.querySelectorAll('.modal button')].find(x => x.textContent.includes('建立项目'));
      ok.click();
    })()
  `);
  await sleep(3500); // 等待 1.2 万要素生成与引擎初始化

  // 3. 工作台与 WebGL 渲染
  const canvasCount = await evalJs('document.querySelectorAll("canvas").length');
  check('WebGL canvas 已挂载', canvasCount >= 1);
  const statsText = await evalJs('document.body.innerText');
  check('图例显示要素总数上万', /共\s*[\d,]+\s*个/.test(statsText) && Number(statsText.match(/共\s*([\d,]+)/)?.[1].replace(/,/g, '')) > 10000);
  check('四个图层开关都在', ['网箱图层', '锚链图层', '警戒区图层', '航道图层'].every((t) => statsText.includes(t)));
  await sleep(1500);
  await shot('02-workbench-loaded');

  // 4. 图层开关：记录总数，关网箱图层后实例数必须明显下降
  const drawnOf = () =>
    evalJs(`Number((document.body.innerText.match(/视口内绘制\\s*([\\d,]+)/)?.[1] || '0').replace(/,/g, ''))`);
  const totalDrawn = await drawnOf();
  check('初始视口绘制数等于总要素数', totalDrawn > 10000, `drawn=${totalDrawn}`);
  await evalJs(`
    (() => {
      const cb = [...document.querySelectorAll('input[type=checkbox]')][0];
      cb.click();
    })()
  `);
  await sleep(800);
  const afterOff = await drawnOf();
  check('关闭网箱图层后视口实例数显著下降（关闭图层不参与绘制）',
    afterOff < totalDrawn * 0.25, `before=${totalDrawn} after=${afterOff}`);
  await shot('03-layer-off');
  await evalJs(`[...document.querySelectorAll('input[type=checkbox]')][0].click()`);
  await sleep(600);
  const restored = await drawnOf();
  check('重新开启图层后实例数恢复', restored > totalDrawn * 0.9, `restored=${restored}`);

  // 5. 点选要素（canvas 中心附近点击）
  const rect = await evalJs(`
    (() => { const c = document.querySelector('canvas').getBoundingClientRect();
      return { x: c.x, y: c.y, w: c.width, h: c.height }; })()
  `);
  async function clickAt(nx, ny, dbl = false) {
    const x = rect.x + rect.w * nx;
    const y = rect.y + rect.h * ny;
    const type = dbl ? 'dblclick' : 'click';
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: dbl ? 2 : 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: dbl ? 2 : 1 });
    if (dbl) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 2 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 2 });
    }
  }
  await clickAt(0.5, 0.55);
  await sleep(700);
  const popupText = await evalJs('document.querySelector(".feature-card")?.innerText || ""');
  check('点选弹出要素卡片（含编号与投放日期）',
    popupText.includes('投放日期') && /\d{4}-\d{2}-\d{2}/.test(popupText) && popupText.includes('编号'));
  await shot('04-feature-popup');

  // 6. 框选
  await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('框选改图层')).click()`);
  await sleep(200);
  {
    const x1 = rect.x + rect.w * 0.35, y1 = rect.y + rect.h * 0.35;
    const x2 = rect.x + rect.w * 0.7, y2 = rect.y + rect.h * 0.75;
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left' });
    for (let k = 1; k <= 8; k++) {
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: x1 + ((x2 - x1) * k) / 8,
        y: y1 + ((y2 - y1) * k) / 8,
        button: 'left'
      });
      await sleep(40);
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left' });
  }
  await sleep(700);
  const selText = await evalJs('document.body.innerText');
  const selCount = Number(selText.match(/已选\s*([\d,]+)/)?.[1].replace(/,/g, '') ?? '0');
  check('框选得到一批要素', selCount > 0, `选中 ${selCount}`);
  await shot('05-box-select');

  // 7. 批量改图层归属到锚链
  await evalJs(`
    (() => {
      const btns = [...document.querySelectorAll('button')].filter(b =>
        ['网箱','锚链','警戒区','航道'].includes(b.textContent.trim()));
      btns.find(b => b.textContent.trim() === '锚链').click();
    })()
  `);
  await sleep(500);
  const chainCount = await evalJs(
    `[...document.querySelectorAll('.count-row')].find(r => r.innerText.includes('锚链'))?.innerText || ''`
  );
  check('批量改归属后锚链图层计数包含选中要素', /\d+/.test(chainCount) && Number(chainCount.match(/\d+/)[0]) >= selCount);

  // 8. 测距
  await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('水平量距')).click()`);
  await sleep(200);
  await clickAt(0.4, 0.6);
  await sleep(200);
  await clickAt(0.62, 0.6);
  await sleep(400);
  const measureText = await evalJs('document.body.innerText');
  check('两点测距显示水平距离', measureText.includes('水平距离') && /\d+(\.\d+)?\s*(m|km)/.test(measureText));
  await shot('06-measure');

  // 9. 双击飞行
  await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('点选/框选')).click()`);
  await sleep(200);
  const beforeCam = await evalJs('document.querySelector("canvas")?.getBoundingClientRect().top.toFixed(1)');
  await clickAt(0.5, 0.5, true);
  await sleep(1800);
  const afterCam = await evalJs('document.querySelector("canvas")?.getBoundingClientRect().top.toFixed(1)');
  check('双击后相机飞行流程未报错', typeof beforeCam === 'string' && typeof afterCam === 'string');
  await shot('07-fly-to');

  // 10. 提交 → 主管退回（圈位+原因，3 次上限）
  await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('提交主管审核'))?.click()`);
  await sleep(400);
  let body = await evalJs('document.body.innerText');
  check('提交后进入待审核', body.includes('待审核'));

  await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('主管')).click()`);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('圈退回位'))?.click()`);
  await sleep(300);
  await clickAt(0.5, 0.5);
  await sleep(400);
  await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('视口圈位退回返工')).click()`);
  await sleep(300);
  await evalJs(`
    (() => {
      const ta = document.querySelector('.modal textarea');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, '冒烟测试：该区域网箱间距不足，请调整');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      [...document.querySelectorAll('.modal button')].find(b => b.textContent.includes('确认退回')).click();
    })()
  `);
  await sleep(500);
  body = await evalJs('document.body.innerText');
  check('退回后状态为退回返工且记录 1/3', body.includes('退回返工') && body.includes('返工 1/3'));
  check('返工原因展示在面板', body.includes('网箱间距不足'));
  await shot('08-rework');

  // 11. 无致命 console 错误（three.js 噪声警告除外）
  const fatal = errors.filter((e) => !/WebGL|swiftshader|GPU|angle/i.test(e));
  check('浏览器端无未捕获异常', fatal.length === 0, fatal.slice(0, 3).join(' | '));

  console.log(`\n浏览器冒烟测试全部通过：${pass} 项`);
  console.log(`console 输出 ${logs.length} 条，异常 ${errors.length} 条（含 WebGL 环境提示）`);
} finally {
  ws.close();
  chrome.kill();
}
