/**
 * 端到端冒烟测试：用系统 Chrome（headless）驱动真实页面，
 * 覆盖布尔内核、撤销重做、捕捉点、剖切、三视图 SVG、作业提交与看板。
 * 运行：node scripts/smoke.mjs
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:5180/';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name} ${detail}`);
    console.error(`  ✗ ${name} ${detail}`);
  }
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.palette-item');

  console.log('\n[1] 界面外壳');
  check('顶栏标题渲染', (await page.locator('.brand').count()) === 1);
  check('体块库 3 个体块', (await page.locator('.palette-item').count()) === 3);

  const H = () => page.evaluate(() => window.__mc3d);

  console.log('\n[2] 布尔内核（并/差/交 + 体积）');
  const v1 = await page.evaluate(() => {
    const { modelStore, evaluated } = window.__mc3d;
    modelStore.resetModel();
    modelStore.loadModel({
      featureSeq: 0,
      features: [],
      clip: { enabled: false, point: [0, 0, 0], normal: [0, -1, 0], showHatch: true, hatchGap: 6 },
    });
    modelStore.addFeature('box', [0, 20, 0]); // 40×40×40，中心 y=20 → 底面在地面
    return evaluated().result.volume;
  });
  check('单长方体体积 = 64000', Math.abs(v1 - 64000) < 1e-6, `got ${v1}`);

  const v2 = await page.evaluate(() => {
    const { modelStore, evaluated } = window.__mc3d;
    const c = modelStore.addFeature('cylinder', [0, 20, 0], 'subtract');
    modelStore.updateFeature(c.id, { dims: { radius: 10, height: 80, segments: 48 } });
    return evaluated().result.volume;
  });
  // 64000 - π·10²·40（圆柱贯通 40 厚实体的有效高度）
  check('差集体积 ≈ 51433.6', Math.abs(v2 - (64000 - Math.PI * 100 * 40)) < 60, `got ${v2}`);

  const v3 = await page.evaluate(() => {
    const { modelStore, evaluated } = window.__mc3d;
    modelStore.updateFeature(modelStore.model.features[1].id, { op: 'intersect' });
    return evaluated().result.volume;
  });
  check('交集体积 ≈ 圆柱 12566.4', Math.abs(v3 - Math.PI * 100 * 40) < 80, `got ${v3}`);

  const v4 = await page.evaluate(() => {
    const { modelStore, evaluated } = window.__mc3d;
    modelStore.updateFeature(modelStore.model.features[1].id, { op: 'add' });
    return evaluated().result.volume;
  });
  check('并集体积 = 64000 + 上下凸出圆柱', v4 > 64000 && Math.abs(v4 - (64000 + Math.PI * 100 * 40)) < 80, `got ${v4}`);

  console.log('\n[3] 撤销 / 重做');
  const hist = await page.evaluate(() => {
    const { modelStore } = window.__mc3d;
    const before = modelStore.model.features.length; // 2
    let undos = 0;
    // 连续撤销，直到两个特征都被移除（中间夹着 op 变更等历史项）
    while (modelStore.model.features.length > 0 && undos < 10) {
      modelStore.undo();
      undos++;
    }
    const afterUndo = modelStore.model.features.length;
    for (let i = 0; i < undos; i++) modelStore.redo();
    const afterRedo = modelStore.model.features.length;
    return { before, afterUndo, afterRedo };
  });
  check('连续撤销可清空全部特征', hist.afterUndo === 0, JSON.stringify(hist));
  check('对应次数重做恢复全部特征', hist.afterRedo === hist.before, JSON.stringify(hist));

  console.log('\n[4] 捕捉点（顶点/边中点/面心）');
  const snaps = await page.evaluate(() => {
    const { modelStore, collectSnapPoints } = window.__mc3d;
    const f = modelStore.model.features[0];
    const pts = collectSnapPoints(f);
    const count = (k) => pts.filter((p) => p.kind === k).length;
    return { vertex: count('vertex'), edge: count('edge-mid'), face: count('face-center') };
  });
  check('长方体 8 顶点', snaps.vertex === 8, JSON.stringify(snaps));
  check('长方体 12 边中点', snaps.edge === 12, JSON.stringify(snaps));
  check('长方体 6 面心', snaps.face === 6, JSON.stringify(snaps));

  console.log('\n[5] 选面改尺寸');
  const resize = await page.evaluate(() => {
    const { modelStore, evaluated, resizeByFace } = window.__mc3d;
    const box = modelStore.model.features[0];
    modelStore.setSelectedFace({ featureId: box.id, faceId: 0, isCap: false }); // +X 面
    const f0 = evaluated().result.volume;
    // 沿 +X 面外法线拖动 10mm → 宽 40→50，中心 +5，体积 ×1.25
    const next = resizeByFace(box, 0, 10);
    modelStore.updateFeature(box.id, { dims: next.dims, position: next.position });
    const f1 = evaluated().result.volume;
    modelStore.undo();
    return { f0, f1, restored: evaluated().result.volume };
  });
  // 沿 +X 面外法线拖动 10mm → 宽 40→50（中心 +5）；圆柱差集不变，
  // 体积增量 = Δ宽10 × 高40 × 深40 = 16000
  check('改宽后体积增量 = 16000', Math.abs(resize.f1 - resize.f0 - 16000) < 2, JSON.stringify(resize));
  check('改尺寸可撤销恢复', Math.abs(resize.restored - resize.f0) < 1e-6);

  console.log('\n[6] 剖切平面与剖面线');
  const clip = await page.evaluate(() => {
    const { modelStore, evaluated } = window.__mc3d;
    modelStore.setClip({ enabled: true, point: [0, 20, 0], normal: [0, -1, 0] });
    const geo = evaluated().geometry;
    const cap = geo.getAttribute('aCap');
    let capVerts = 0;
    for (let i = 0; i < cap.count; i++) if (cap.getX(i) > 0.5) capVerts++;
    const vol = evaluated().result.volume;
    modelStore.setClip({ enabled: false });
    return { capVerts, vol };
  });
  check('剖切后存在 aCap 剖面顶点', clip.capVerts > 0, JSON.stringify(clip));
  check('剖切保留半空间（体积约为原来一半量级）', clip.vol > 10000 && clip.vol < 70000, `vol=${clip.vol}`);

  console.log('\n[7] 三视图 SVG 线稿');
  const svg = await page.evaluate(() => window.__mc3d.generateSVG());
  check('SVG 非空且含 3 个视图组', !!svg && svg.svg.includes('view-front') && svg.svg.includes('view-top') && svg.svg.includes('view-left'));
  check('SVG 含可见线与隐藏线', svg.svg.includes('stroke-dasharray') && (svg.svg.match(/<line/g)?.length ?? 0) > 10);
  check('视图统计为 3 个', svg.views.length === 3);

  console.log('\n[8] 剖切 + 三视图剖面线');
  const hatchSvg = await page.evaluate(() => {
    const { modelStore } = window.__mc3d;
    modelStore.setClip({ enabled: true, point: [0, 20, 0], normal: [0, -1, 0] });
    const r = window.__mc3d.generateSVG();
    modelStore.setClip({ enabled: false });
    return r.svg.match(/<polygon/g)?.length ?? 0;
  });
  check('三视图含剖面填充多边形', hatchSvg > 0, `polygons=${hatchSvg}`);

  console.log('\n[9] 作业 / 自动核对 / 提交 / 看板 / 打分');
  const edu = await page.evaluate(() => {
    const { eduStore, modelStore, evaluated } = window.__mc3d;
    const asg = eduStore.createAssignment({
      title: '冒烟测试作业',
      description: '测试用',
      targetVolume: evaluated().result.volume,
      volumeTolerance: 0.05,
      requireThreeViews: true,
      requiredOps: ['add'],
      minFeatures: 2,
    });
    const sub = eduStore.submitWork(asg.id, '测试学员');
    eduStore.gradeSubmission(sub.id, 88, '结构正确，注意公差');
    // 打分后再构建看板
    const board = eduStore.buildDashboard().find((r) => r.assignmentId === asg.id);
    const graded = eduStore.submissions().find((s) => s.id === sub.id);
    return {
      checks: sub.checks.map((c) => ({ item: c.item, status: c.status })),
      autoPassed: sub.autoPassed,
      boardTotal: board.total,
      boardAvg: board.avgScore,
      score: graded.score,
      comment: graded.teacherComment,
    };
  });
  check('自动核对全部通过', edu.autoPassed === true && edu.checks.every((c) => c.status === 'pass'), JSON.stringify(edu.checks));
  check('看板聚合到该作业', edu.boardTotal === 1);
  check('老师打分写入', edu.score === 88 && edu.comment === '结构正确，注意公差');
  check('看板平均分 = 88', Math.abs(edu.boardAvg - 88) < 1e-6);

  console.log('\n[10] UI 交互（工具栏 / 弹窗 / 角色切换）');
  await page.locator('button:has-text("生成三视图")').click();
  await page.waitForSelector('.modal');
  check('三视图弹窗打开', (await page.locator('.modal svg').count()) === 1);
  await page.locator('.modal button:has-text("关闭")').click();
  await page.locator('.role-switch button:has-text("老师端")').click();
  await page.waitForSelector('.tabs');
  check('老师端看板标签', (await page.locator('button:has-text("班级看板")').count()) === 1);
  await page.locator('button:has-text("提交复核")').click();
  check('老师端能看到提交记录', (await page.locator('.card').count()) >= 1);
  await page.locator('.role-switch button:has-text("学员端")').click();

  console.log('\n[11] WebGL 渲染与控制台健康度');
  check('视口 canvas 存在', (await page.locator('.viewport canvas').count()) === 1);
  check('无控制台错误', consoleErrors.length === 0, consoleErrors.join(' | '));

  await page.screenshot({ path: 'scripts/smoke-screenshot.png' });
} catch (e) {
  failures.push(`测试异常: ${e.stack || e}`);
  console.error(e);
}

await browser.close();
console.log(`\n结果：${passed} 通过，${failures.length} 失败`);
if (failures.length) {
  console.error('失败项：\n - ' + failures.join('\n - '));
  process.exit(1);
}
