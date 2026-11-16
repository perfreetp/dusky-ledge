import { launch, startServer } from './harness.mjs';

const { server, url } = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  Array.from(s.shadowRoot.querySelectorAll('.nav button')).find(b => b.textContent.includes('教师')).click();
});
await page.waitForTimeout(250);
await page.evaluate(() => {
  const s = document.querySelector('app-shell');
  const tv = s.shadowRoot.querySelector('teacher-view');
  Array.from(tv.shadowRoot.querySelectorAll('.toolbar button')).find(b => b.textContent.includes('新建题目')).click();
});
await page.waitForTimeout(250);
const dump = await page.evaluate(() => {
  const md = document.querySelector('modal-dialog');
  const body = md.shadowRoot.querySelector('.body');
  return {
    title: md.shadowRoot.querySelector('.title').textContent,
    fields: Array.from(body.querySelectorAll('input,textarea')).map(i => ({ type: i.type, val: i.value, ph: i.placeholder, min: i.min })),
    layerRows: Array.from(body.querySelectorAll('.layer-row')).map(r => r.textContent.replace(/\s+/g,' ').trim()),
    hint: Array.from(body.querySelectorAll('.hintline')).map(h => h.textContent),
    buttons: Array.from(body.querySelectorAll('button')).map(b => b.textContent.trim()),
  };
});
console.log(JSON.stringify(dump, null, 1));
await page.screenshot({ path: 'tools/shot-newtask.png' });

// 填表：3 层，改层厚
await page.evaluate(() => {
  const md = document.querySelector('modal-dialog');
  const body = md.shadowRoot.querySelector('.body');
  const inputs = body.querySelectorAll('input');
  inputs[0].value = '测试探方 T1';
  const nums = Array.from(inputs).filter(i => i.type === 'number');
  // nums: [nx, nz, budget, ...layerRows]
  nums[0].value = '8';
  nums[1].value = '10';
  const layerInputs = nums.slice(3);
  layerInputs.forEach((inp, i) => {
    inp.value = String([2, 4, 5][i] ?? 2);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  Array.from(body.querySelectorAll('button')).find(b => b.textContent.includes('发布题目')).click();
});
await page.waitForTimeout(300);
const saved = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('strata-voxel-lab/v2'));
  return raw.assignments.map(a => ({ title: a.title, nx: a.nx, ny: a.ny, nz: a.nz, rows: a.layerRows }));
});
console.log('saved:', JSON.stringify(saved));
console.log('errors:', errors);
await browser.close(); server.close();
