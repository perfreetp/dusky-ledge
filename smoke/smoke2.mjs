// 负向测试:空动画应被质检拦截 + 序列帧导出应产生 ZIP
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5173/';
const errors = [];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));

// 新建空动画 -> 保存 -> 送质检
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent === '新建动画').click();
});
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => {
  [...document.querySelectorAll('.tabs .tab')].find((b) => b.textContent === '动作库').click();
});
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent === '保存条目').click();
});
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => {
  const cb = document.querySelector('.tbl tbody input[type=checkbox]');
  cb.click();
});
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent.includes('送质检')).click();
});
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent.includes('运行自动检查')).click();
});
await new Promise((r) => setTimeout(r, 1200));
const qc = await page.evaluate(() => {
  const s = document.querySelector('.qc-summary');
  const release = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('整批放行'));
  return { summary: s ? s.textContent.replace(/\s+/g, ' ').trim() : null, releaseDisabled: release?.disabled };
});
console.log('empty-anim qc:', JSON.stringify(qc));
await page.screenshot({ path: 'smoke/07-qc-negative.png' });
if (!qc.releaseDisabled) { console.log('FAIL: 放行按钮应被禁用'); errors.push('release should be disabled'); }

// 确认一条严重问题 -> 仍不能放行
await page.evaluate(() => {
  const tr = document.querySelector('tr.sev-error');
  [...tr.querySelectorAll('button')].find((b) => b.textContent === '确认').click();
});
await new Promise((r) => setTimeout(r, 200));
const stillBlocked = await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.includes('整批放行')).disabled);
console.log('blocked after confirm:', stillBlocked);
if (!stillBlocked) errors.push('confirmed error should block release');

// 退回重做
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent.includes('退回重新制作')).click();
});
await new Promise((r) => setTimeout(r, 200));
const returned = await page.evaluate(() => document.body.textContent.includes('已退回'));
console.log('returned:', returned);

// 导出序列帧(CDP 接管下载)
fs.mkdirSync('smoke/downloads', { recursive: true });
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: path.resolve('smoke/downloads') });
await page.evaluate(() => {
  [...document.querySelectorAll('.tabs .tab')].find((b) => b.textContent === '编辑器').click();
});
await new Promise((r) => setTimeout(r, 500));
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent.includes('导出序列帧打包')).click();
});
// 等待导出完成(72 帧)
let zip = null;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 500));
  const files = fs.readdirSync('smoke/downloads').filter((f) => f.endsWith('.zip'));
  if (files.length) { zip = files[0]; break; }
}
console.log('export zip:', zip);
if (zip) {
  const size = fs.statSync(`smoke/downloads/${zip}`).size;
  console.log('zip size:', size);
  if (size < 10000) errors.push('zip too small');
} else {
  errors.push('no zip exported');
}

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
await browser.close();
process.exit(errors.length ? 1 : 0);
