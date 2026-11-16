import { launch, startServer } from './harness.mjs';
import fs from 'node:fs';

const { server, url } = await startServer();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(600);

const shell = () => page.evaluate(() => {
  const s = document.querySelector('app-shell');
  return { mode: s.mode };
});

// 1. 程序化建一个完整模型：4 层，每层 3 行铺满
const built = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const vp = s.shadowRoot.querySelector('voxel-viewport');
  const m = vp.model;
  const mats = [1, 2, 3, 5];
  m.layers.forEach((layer) => {
    for (let y = layer.start; y < layer.start + layer.rows; y++)
      for (let z = 0; z < m.dims.nz; z++)
        for (let x = 0; x < m.dims.nx; x++) m.grid.setMaterial(x, y, z, mats[layer.index]);
  });
  m.mark({ grid: true, view: true });
  return { filled: m.filledCount, tris: m.mesh.triCount, share: m.stats.shares, mirror: m.stats.mirrorRatio };
});
console.log('model built:', JSON.stringify(built));
await page.waitForTimeout(400);
await page.screenshot({ path: 'tools/shot-full.png' });

const grade = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  const g = m.grade();
  return { total: g.total, max: g.max, checks: g.checks.map(c => [c.label, c.score, c.max, c.pass]), issues: g.issues.map(i => i.code) };
});
console.log('grade:', JSON.stringify(grade));

// 2. 面数超预算场景 → 减面
const decim = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  m.assignment = { ...m.assignment, faceBudget: 200 };
  m.mark({});
  const before = m.mesh.triCount;
  const r = m.decimate(200);
  return { before, factor: r.factor, after: r.trianglesAfter, achieved: r.achieved };
});
console.log('decimate:', JSON.stringify(decim));

// 3. 提交
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const m = s.shadowRoot.querySelector('voxel-viewport').model;
  m.assignment = { ...m.assignment, faceBudget: 6000 };
});
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const btns = Array.from(s.shadowRoot.querySelectorAll('.bottom-actions button'));
  btns.find(b => b.textContent.includes('提交作业')).click();
});
await page.waitForTimeout(300);
const modalOpen = await page.evaluate(() => {
  const m = document.querySelector('modal-dialog');
  return { open: m?.hasAttribute('open'), title: m?.shadowRoot?.querySelector('.title')?.textContent, text: m?.shadowRoot?.querySelector('.body')?.textContent?.slice(0, 300) };
});
console.log('submit modal:', JSON.stringify(modalOpen));

await page.evaluate(() => {
  const m = document.querySelector('modal-dialog');
  const inp = m.shadowRoot.querySelector('input');
  inp.value = '学员甲';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  const btns = Array.from(m.shadowRoot.querySelectorAll('button'));
  btns.find(b => b.textContent.trim() === '确认提交').click();
});
await page.waitForTimeout(400);
const subs = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('strata-voxel-lab/v2'));
  return raw.submissions.map(s => ({ student: s.student, auto: s.autoScore, max: s.autoMax, issues: s.issues.map(i => i.code), checks: s.checks.map(c => [c.label, c.score]) }));
});
console.log('submissions:', JSON.stringify(subs));

// 4. 教师端
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  Array.from(s.shadowRoot.querySelectorAll('.nav button')).find(b => b.textContent.includes('教师')).click();
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'tools/shot-teacher.png' });
const teacher = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const tv = s.shadowRoot.querySelector('teacher-view');
  return {
    cards: tv.shadowRoot.querySelectorAll('.card').length,
    rows: tv.shadowRoot.querySelectorAll('.srow').length,
    text: tv.shadowRoot.textContent.replace(/\s+/g, ' ').slice(0, 260),
  };
});
console.log('teacher:', JSON.stringify(teacher));

// 复核
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const tv = s.shadowRoot.querySelector('teacher-view');
  const btn = Array.from(tv.shadowRoot.querySelectorAll('.srow button')).find(b => b.textContent.includes('复核'));
  btn.click();
});
await page.waitForTimeout(400);
const review = await page.evaluate(() => {
  const m = document.querySelector('modal-dialog');
  return { open: m.hasAttribute('open'), title: m.shadowRoot.querySelector('.title').textContent, text: m.shadowRoot.querySelector('.body').textContent.replace(/\s+/g, ' ').slice(0, 400) };
});
console.log('review modal:', JSON.stringify(review));
await page.screenshot({ path: 'tools/shot-review.png' });

await page.evaluate(() => {
  const m = document.querySelector('modal-dialog');
  const btns = Array.from(m.shadowRoot.querySelectorAll('button'));
  btns.find(b => b.textContent.trim() === '提交评分').click();
});
await page.waitForTimeout(300);
const reviewed = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('strata-voxel-lab/v2'));
  return raw.submissions.map(s => s.review && { score: s.review.score, comment: s.review.comment });
});
console.log('reviewed:', JSON.stringify(reviewed));

// 5. 看板
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  Array.from(s.shadowRoot.querySelectorAll('.nav button')).find(b => b.textContent.includes('看板')).click();
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'tools/shot-dashboard.png' });
const dash = await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const dv = s.shadowRoot.querySelector('dashboard-view');
  return {
    kpis: Array.from(dv.shadowRoot.querySelectorAll('.kpi')).map(k => k.textContent.replace(/\s+/g, ' ').trim()),
    sections: Array.from(dv.shadowRoot.querySelectorAll('.section h3')).map(h => h.textContent.replace(/\s+/g, ' ').trim()),
    bars: dv.shadowRoot.querySelectorAll('.bar-row').length,
  };
});
console.log('dashboard:', JSON.stringify(dash, null, 1));

console.log('errors:', errors);
await browser.close();
server.close();
