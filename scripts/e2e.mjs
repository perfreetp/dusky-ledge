import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Browser smoke test for the editor. Requires a dev server (vite on :5199) and the
 * API (on :8787). Each step prints PASS/FAIL so `npm run e2e` can be used as a gate.
 */
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE_URL ?? 'http://localhost:5199';
const OUT = resolve('artifacts');
mkdirSync(OUT, { recursive: true });

let failures = 0;
const results = [];
function check(name, cond, detail = '') {
  const ok = !!cond;
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const BLANK_DOC = {
  schema: 1,
  name: 'blank',
  workshopId: null,
  width: 36000,
  height: 24000,
  background: null,
  features: [],
  settings: {
    grid: { minor: 500, major: 2000, show: true, snapGrid: true, snapEndpoints: true, snapMidpoints: true, snapSegments: true },
    showDimensions: true,
  },
};

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--enable-unsafe-webgpu'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
  });

  try {
    // ---- create a plan with the sample workshop -------------------------
    await page.goto(BASE + '/plans', { waitUntil: 'networkidle' });
    check('plans page loads', (await page.getByRole('button', { name: '新建方案' }).count()) === 1);
    await page.getByRole('button', { name: '新建方案' }).click();
    await page.locator('.modal input[type=text]').first().fill('E2E 车间');
    await page.locator('.modal-footer').getByRole('button', { name: '载入示例车间' }).click();
    await page.waitForURL(/\/editor\//, { timeout: 20000 });
    await page.waitForTimeout(1600);
    check('editor opens with sample', (await page.locator('canvas.gpu-layer').count()) === 1);

    const stats = await page.evaluate(() => ({ ...window.__marking.store.gpuStats }));
    check('WebGPU active', stats.gpu === true, stats.adapterInfo);
    check('hatch stripes generated', stats.hatchStripes > 0, `${stats.hatchStripes} stripes`);

    // ---- snapping -------------------------------------------------------
    const snap = await page.evaluate(() => {
      const s = window.__marking.store;
      const line = s.doc.value.features.find((f) => f.kind === 'main-channel');
      const p = line.paths[0][1];
      const r = s.snapPoint({ x: p.x + 40, y: p.y + 25 }, 14);
      return { kind: r.hit?.kind, dx: r.p.x - p.x, dy: r.p.y - p.y };
    });
    check('endpoint snap locks on', snap.kind === 'endpoint' && snap.dx === 0 && snap.dy === 0, JSON.stringify(snap));

    const midSnap = await page.evaluate(() => {
      const s = window.__marking.store;
      const st = s.doc.value.features.find((f) => f.kind === 'station');
      const ring = st.rings[0];
      const mid = { x: (ring[0].x + ring[1].x) / 2, y: (ring[0].y + ring[1].y) / 2 };
      const r = s.snapPoint({ x: mid.x + 25, y: mid.y + 20 }, 14);
      return { kind: r.hit?.kind, dx: r.p.x - mid.x, dy: r.p.y - mid.y };
    });
    check('midpoint snap locks on', midSnap.kind === 'midpoint' && midSnap.dx === 0 && midSnap.dy === 0, JSON.stringify(midSnap));

    const gridSnap = await page.evaluate(() => {
      const s = window.__marking.store;
      // far bottom-right corner of the sheet, away from all sample geometry
      const r = s.snapPoint({ x: 32813, y: 22611 }, 14);
      return { kind: r.hit?.kind, x: r.p.x, y: r.p.y };
    });
    check('grid snap rounds to node', gridSnap.kind === 'grid' && gridSnap.x % 100 === 0, JSON.stringify(gridSnap));

    // ---- draw a channel with the mouse ----------------------------------
    const box = await page.locator('.canvas-wrap').boundingBox();
    const S = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
    await page.keyboard.press('Escape');
    await page.keyboard.press('c');
    const before = await page.evaluate(() => window.__marking.store.doc.value.features.length);
    for (const [x, y] of [[0.15, 0.62], [0.42, 0.62]]) {
      const q = S(x, y);
      await page.mouse.click(q.x, q.y);
      await page.waitForTimeout(180);
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.__marking.store.doc.value.features.length);
    check('draw channel commits a feature', after === before + 1, `${before} -> ${after}`);

    // ---- merge two touching channels ------------------------------------
    await page.keyboard.press('c');
    for (const [x, y] of [[0.42, 0.62], [0.62, 0.62]]) {
      const q = S(x, y);
      await page.mouse.click(q.x, q.y);
      await page.waitForTimeout(180);
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const s = window.__marking.store;
      const cands = s.doc.value.features.filter((f) => f.kind === 'main-channel' && !f.name.includes('流水线'));
      s.select(cands.slice(-2).map((f) => f.id));
    });
    await page.waitForTimeout(250);
    await page.locator('.editor-toolbar').getByRole('button', { name: '合并流水线' }).click();
    await page.waitForTimeout(700);
    const merged = await page.evaluate(() => {
      const s = window.__marking.store;
      const f = s.doc.value.features.find((x) => x.name.includes('流水线'));
      return f ? { paths: f.paths.length, verts: f.paths[0].length } : null;
    });
    check('two channels merge into one polyline', merged && merged.paths === 1 && merged.verts >= 3, JSON.stringify(merged));

    // ---- boolean union --------------------------------------------------
    const readings = await page.evaluate(() => {
      const s = window.__marking.store;
      const np = s.doc.value.features.filter((f) => f.kind === 'no-park');
      s.select(np.map((f) => f.id));
      const t0 = performance.now();
      s.booleanOp('union');
      return { rings: s.doc.value.features.filter((f) => f.kind === 'no-park').map((f) => f.rings.length), ms: performance.now() - t0 };
    });
    check('boolean union produces a closed zone', readings.rings.length >= 1 && readings.rings[0] >= 1, JSON.stringify(readings));

    // ---- undo depth -----------------------------------------------------
    const undo = await page.evaluate(() => {
      const s = window.__marking.store;
      const id = s.doc.value.features[0].id;
      s.select([id]);
      for (let i = 0; i < 60; i++) s.patch(id, { name: `n${i}` }, `rename-${i}`);
      const depth = s.history.depth;
      let undone = 0;
      for (let i = 0; i < 55; i++) {
        if (!s.history.canUndo) break;
        s.undo();
        undone++;
      }
      const restored = s.doc.value.features.find((f) => f.id === id)?.name;
      for (let i = 0; i < 55; i++) s.redo();
      return { depth, undone, restored, back: s.doc.value.features.find((f) => f.id === id)?.name };
    });
    check('undo retains 50+ steps', undo.depth >= 60 && undo.undone === 55, JSON.stringify(undo));
    check('undo actually rewinds', undo.restored === 'n4', undo.restored);
    check('redo restores the latest state', undo.back === 'n59', undo.back);

    // ---- SVG export -----------------------------------------------------
    const svg = await page.evaluate(async () => {
      const mod = await import('/src/core/svg.ts');
      return mod.exportSvg(window.__marking.store.doc.value, { includeDimensions: true });
    });
    check('SVG has mm units + viewBox', /width="\d+mm"/.test(svg) && /viewBox=/.test(svg));
    check('SVG declares the inkscape namespace', svg.includes('xmlns:inkscape='));
    check('SVG emits hatch clip paths', svg.includes('<clipPath') && svg.includes('data-role="hatch"'));

    const parsed = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const err = doc.querySelector('parsererror');
      return { ok: !err, message: err?.textContent?.slice(0, 160) ?? '', paths: doc.querySelectorAll('path').length };
    }, svg);
    check('SVG parses without errors', parsed.ok, parsed.message);
    check('SVG contains geometry', parsed.paths > 5, `${parsed.paths} paths`);

    // ---- version publishing ---------------------------------------------
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await page.waitForTimeout(400);
    await page.locator('.modal input[type=text]').nth(1).fill('E2E 版本');
    await page.getByRole('button', { name: '保存并发布版本' }).click();
    await page.waitForTimeout(1400);
    const planId = await page.evaluate(() => window.__marking.store.planId.value);
    const versions = await page.evaluate(async (id) => (await fetch(`/api/plans/${id}/versions`)).json(), planId);
    check('version published', versions.length >= 2, `${versions.length} versions`);

    // ---- restore an older version into the editor -----------------------
    const headCount = await page.evaluate(() => window.__marking.store.doc.value.features.length);
    await page.goto(BASE + '/versions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    page.once('dialog', (d) => d.accept());
    await page.locator('table.table tbody tr').filter({ hasText: 'v1' }).getByRole('button', { name: '恢复' }).click();
    await page.waitForURL(/\/editor\//, { timeout: 15000 });
    await page.waitForTimeout(1300);
    const restored = await page.evaluate(() => ({
      n: window.__marking.store.doc.value.features.length,
      dirty: window.__marking.store.docDirty.value,
    }));
    check('restored version loads as unsaved snapshot', restored.n !== headCount && restored.dirty === true, JSON.stringify({ head: headCount, restored }));

    // ---- training flow --------------------------------------------------
    const task = await page.evaluate(async (blank) => {
      const tasks = await fetch('/api/tasks?role=teacher').then((r) => r.json());
      if (tasks.length) return tasks[0];
      return fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'E2E 考核',
          baseDoc: blank,
          referenceDoc: window.__marking.store.doc.value,
          requirements: { expected: {}, positionTolerance: 300, widthTolerance: 0.15, weights: { coverage: 0.5, width: 0.3, closure: 0.2 }, notes: '' },
          published: true,
        }),
      }).then((r) => r.json());
    }, BLANK_DOC);
    check('training task available', !!task?.id, task?.title);
    await page.goto(BASE + '/training', { waitUntil: 'networkidle' });
    check('training list renders', (await page.locator('.card').count()) >= 1);
    await page.goto(BASE + '/summary/' + task.id, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    check('summary page renders stats', (await page.locator('.score').count()) >= 3);

    // ---- phone-width layout ---------------------------------------------
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(BASE + '/plans', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('no horizontal overflow at phone width', overflow <= 0, `${overflow}px`);
    await page.setViewportSize({ width: 1600, height: 1000 });

    check('no console errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));

    // ---- clean up the artefacts this run created ------------------------
    const removed = await page.evaluate(async () => {
      const plans = await fetch('/api/plans').then((r) => r.json());
      let n = 0;
      for (const p of plans) {
        if (p.name === 'E2E 车间') {
          await fetch('/api/plans/' + p.id, { method: 'DELETE' });
          n++;
        }
      }
      const subs = await fetch('/api/submissions').then((r) => r.json());
      for (const s of subs) {
        if (s.studentName?.startsWith('E2E')) {
          await fetch('/api/submissions/' + s.id, { method: 'DELETE' });
          n++;
        }
      }
      return n;
    });
    console.log(`  (cleaned ${removed} test artefacts)`);
  } catch (e) {
    check('unexpected failure', false, e.message);
  } finally {
    await page.screenshot({ path: resolve(OUT, 'e2e-final.png') }).catch(() => {});
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  if (failures) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
