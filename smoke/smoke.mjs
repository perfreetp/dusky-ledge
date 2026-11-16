// 冒烟测试:加载编辑器,切换页面,跑质检流程,收集报错并截图
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5173/';

const errors = [];
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1600,900'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: 'smoke/01-editor.png' });

// 检查 WebGL 画布确实在绘制(非纯黑)
const gl = await page.evaluate(() => {
  const c = document.querySelector('canvas.viewport');
  return c ? { w: c.width, h: c.height } : null;
});
console.log('canvas:', JSON.stringify(gl));

// 播放几秒
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const play = btns.find((b) => b.textContent.includes('播放'));
  if (play) play.click();
});
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: 'smoke/02-playing.png' });
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const pause = btns.find((b) => b.textContent.includes('暂停'));
  if (pause) pause.click();
});

// 曲线编辑页
await page.evaluate(() => {
  const t = [...document.querySelectorAll('.bottom-tabs .tab')].find((b) => b.textContent === '曲线编辑');
  if (t) t.click();
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: 'smoke/03-curve.png' });

// 动作库:保存条目
await page.evaluate(() => {
  [...document.querySelectorAll('.tabs .tab')].find((b) => b.textContent === '动作库').click();
});
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent === '保存条目');
  btn.click();
});
await new Promise((r) => setTimeout(r, 300));
const libCount = await page.evaluate(() => document.querySelectorAll('.tbl tbody tr').length);
console.log('library entries:', libCount);

// 勾选并送质检
await page.evaluate(() => {
  const cb = document.querySelector('.tbl tbody input[type=checkbox]');
  if (cb) cb.click();
});
await new Promise((r) => setTimeout(r, 200));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('送质检'));
  if (btn) btn.click();
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: 'smoke/04-qc.png' });

// 运行检查
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('运行自动检查'));
  if (btn) btn.click();
});
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: 'smoke/05-qc-result.png' });
const qcInfo = await page.evaluate(() => {
  const s = document.querySelector('.qc-summary');
  return s ? s.textContent.replace(/\s+/g, ' ').trim() : '(no summary)';
});
console.log('qc summary:', qcInfo);

// 复核:驳回全部严重问题,然后放行
await page.evaluate(() => {
  for (const tr of document.querySelectorAll('tr.sev-error')) {
    const btn = [...tr.querySelectorAll('button')].find((b) => b.textContent === '驳回');
    if (btn) btn.click();
  }
});
await new Promise((r) => setTimeout(r, 300));
const canRelease = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('整批放行'));
  if (!btn) return 'no-button';
  const disabled = btn.disabled;
  if (!disabled) btn.click();
  return disabled ? 'disabled' : 'clicked';
});
console.log('release:', canRelease);
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: 'smoke/06-qc-done.png' });

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
await browser.close();
process.exit(errors.length ? 1 : 0);
