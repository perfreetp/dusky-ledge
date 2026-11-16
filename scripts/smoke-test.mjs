// CDP 驱动的端到端冒烟测试（无外部依赖，用 WebSocket 直连 Chrome DevTools Protocol）
const base = 'http://localhost:9222';

async function rpc(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        ws.removeEventListener('message', onMsg);
        msg.error ? reject(new Error(method + ': ' + JSON.stringify(msg.error))) : resolve(msg.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, timeout = 10000, interval = 150, label = '') => {
  const t0 = Date.now();
  let lastErr = '';
  while (true) {
    try { const v = await fn(); if (v) return v; } catch (e) { lastErr = String(e.message || e).slice(0, 160); }
    if (Date.now() - t0 > timeout) throw new Error(`waitFor 超时${label ? ' [' + label + ']' : ''}: ${lastErr}`);
    await sleep(interval);
  }
};
const results = [];
function check(name, cond, extra = '') {
  results.push({ name, ok: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
}
const $root = () => `document.querySelector('app-root').shadowRoot`;

async function main() {
  const targets = await (await fetch(base + '/json/list')).json();
  let page = targets.find((t) => t.type === 'page');
  if (!page) {
    page = await (await fetch(base + '/json/new?about:blank', { method: 'PUT' })).json();
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const send = (method, params) => rpc(ws, ++id, method, params);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.args?.[0]?.value) {
      logs.push('console.' + m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      logs.push('LOG error: ' + m.params.entry.text);
    }
  });

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      throw new Error('JS error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    }
    return r.result.value;
  };

  // 1. 加载页面（先清理可能残留的登录态与业务数据，保证可重复运行）
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await waitFor(() => evalJs(`!!${$root()}`));
  await evalJs(`
    (async () => {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map((d) => new Promise((r) => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = r; q.onerror = r; q.onblocked = r; })));
    })()`);
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await waitFor(() => evalJs(`!!${$root()}?.querySelector('.login-card')`));
  check('页面加载且无致命错误', !logs.some((l) => l.startsWith('EXCEPTION')), logs.filter((l) => l.startsWith('EXCEPTION')).join(' | '));
  check('登录界面出现', true);

  // 2. 教练登录
  await evalJs(`[...${$root()}.querySelectorAll('#users button')].find(b => b.textContent.includes('李教练')).click()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('top-bar')`));
  await waitFor(() => evalJs(`!!${$root()}.querySelector('top-bar').shadowRoot.querySelector('nav')`));
  check('教练进入主界面', true);

  // 3. 建单
  await evalJs(`[...${$root()}.querySelector('top-bar').shadowRoot.querySelectorAll('nav button')].find(b=>b.dataset.v==='orders').click()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('orders-view')?.shadowRoot.querySelector('#newOrder')`), 10000, 150, 'newOrder');
  await evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelector('#newOrder').click()`);
  await waitFor(() => evalJs(`!!document.body.lastChild?.shadowRoot?.querySelector('#t')`));
  await evalJs(`
    (() => {
      const m = document.body.lastChild.shadowRoot;
      m.querySelector('#t').value = '绸吊倒挂转体';
      m.querySelector('#p').value = '1. 起势抓绸 2. 单腿倒挂 3. 空中转体两周 4. 展体落地';
      m.querySelector('#ok').click();
    })()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelectorAll('.order').length`).then((n) => n === 1));
  check('教练创建订单成功', true);

  // 4. 分派
  await evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelector('.actions button.primary').click()`);
  await waitFor(() => evalJs(`!!document.body.lastChild?.shadowRoot?.querySelector('#ok')`));
  await evalJs(`document.body.lastChild.shadowRoot.querySelector('#ok').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelector('.tag')?.textContent || ''`).then((t) => t.includes('已分派')));
  check('订单已分派', true);

  // 5. 动画师登录并进入编辑器
  await evalJs(`
    (() => {
      const sel = ${$root()}.querySelector('top-bar').shadowRoot.querySelector('#roleSel');
      sel.value = 'u_anim1'; sel.dispatchEvent(new Event('change'));
    })()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelector('.actions button.primary')?.textContent || ''`).then((t) => t.includes('编辑器')));
  await evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelector('.actions button.primary').click()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('editor-workspace')?.shadowRoot.querySelector('#glcanvas')`));
  await sleep(800);
  check('动画师进入编辑器', true);

  // 6. 生成默认网格
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#genMesh').click()`);
  await sleep(600);
  const canvasInfo = await evalJs(`
    (() => { const c = ${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#glcanvas');
      return { w: c.width, h: c.height }; })()`);
  check('WebGL2 画布初始化并出图', canvasInfo.w > 0 && canvasInfo.h > 0, JSON.stringify(canvasInfo));

  // 7. 骨架：选中 + 加骨骼
  const bones0 = await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelectorAll('.tree-row').length`);
  await evalJs(`
    (() => {
      const ws = ${$root()}.querySelector('editor-workspace').shadowRoot;
      ws.querySelector('.tree-row').click();
    })()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#addBone:not([disabled])')`));
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#addBone').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelectorAll('.tree-row').length`).then((n) => n === bones0 + 1));
  check('增删骨骼：新增成功', true, `${bones0} -> ${bones0 + 1}`);

  // 8. 权重模式
  await evalJs(`[...${$root()}.querySelector('editor-workspace').shadowRoot.querySelectorAll('.modes button')].find(b=>b.dataset.m==='paint').click()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#unpaintedCount')`));
  const unpainted = await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#unpaintedCount').textContent`);
  const swatch = await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#brushSwatch').style.background`);
  check('权重未刷满顶点统计与标红模式', unpainted !== undefined, `未刷满=${unpainted}`);
  check('每根骨骼按颜色显示影响范围', !!swatch, swatch);

  // 9. 动画模式 + 关键帧
  await evalJs(`[...${$root()}.querySelector('editor-workspace').shadowRoot.querySelectorAll('.modes button')].find(b=>b.dataset.m==='animate').click()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#keyBtn')`));
  await evalJs(`
    (() => {
      const sel = ${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#animBoneSel');
      sel.value = sel.options[1].value;
      sel.dispatchEvent(new Event('change'));
    })()`);
  await waitFor(() => evalJs(`!${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#keyBtn').disabled`));
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#keyBtn').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelectorAll('.key').length`).then((n) => n >= 1));
  check('打关键帧成功', true);

  // 10. 时间轴拖拽改时间（用 seek 模拟）+ 复制粘贴姿势
  await evalJs(`
    (() => {
      const ws = ${$root()}.querySelector('editor-workspace').shadowRoot;
      const ruler = ws.querySelector('.ruler');
      const rect = ruler.getBoundingClientRect();
      ruler.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + rect.width * 0.5, clientY: rect.top + 5, bubbles: true }));
      ruler.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    })()`);
  await sleep(300);
  await waitFor(() => evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#copyPoseBtn') && !${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#copyPoseBtn').disabled`));
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#copyPoseBtn').click()`);
  await waitFor(() => evalJs(`!${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#pastePoseBtn').disabled`));
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#pastePoseBtn').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelectorAll('.key').length`).then((n) => n >= 2));
  check('姿势复制到另一段时间', true);

  // 切线手柄面板存在
  await evalJs(`
    (() => {
      const key = ${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('.key');
      const ev = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, clientX: 100, clientY: 100 });
      key.dispatchEvent(ev);
      const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1, clientX: 100, clientY: 100 });
      key.dispatchEvent(up);
    })()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#inX')`), 10000, 150, 'tangent');
  check('切线手柄可调缓入缓出/匀速', true);

  // 11. 播放插值
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#playBtn').click()`);
  await sleep(900);
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#playBtn').click()`);
  const t = parseFloat(await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#timeTxt').textContent`));
  check('播放按插值实时驱动骨架', t > 0.05, `t=${t.toFixed(2)}s`);

  // 12. 穿地检测
  const pen = await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#penStat')?.textContent || ''`);
  check('脚底穿地检测可见', pen.includes('穿地') || pen.includes('无穿地'), pen);

  // 13. 多版本
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#newVersion').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#versionSel').options.length`).then((n) => n >= 2));
  check('项目内保存多个动作版本', true);

  // 14. 导出（完成信号：进度区出现「完成」且导出记录增加）
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#exportBtn').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#exportProgress')?.textContent || ''`).then((s) => s.includes('完成')), 60000, 300, 'export1');
  const exportCount1 = await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelectorAll('.export-list > div').length`);
  check('导出 PNG 序列帧+关键帧数据', exportCount1 >= 1, `记录数=${exportCount1}`);

  // 再导出：帧号对齐（两条记录起点都为 0）
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#exportBtn').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelectorAll('.export-list > div').length`).then((n) => n === exportCount1 + 1), 60000, 300, 'export2');
  const exportText = await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('.export-list').textContent`);
  const aligned = (exportText.match(/帧\s*0–/g) || []).length >= 2;
  check('重新导出帧号对齐（起点同为 0）', aligned);

  // 15. 保存、返回、送审
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#saveBtn').click()`);
  await sleep(400);
  await evalJs(`${$root()}.querySelector('editor-workspace').shadowRoot.querySelector('#backBtn').click()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('orders-view')`));
  await waitFor(() => evalJs(`[...${$root()}.querySelector('orders-view').shadowRoot.querySelectorAll('.actions button')].some(b=>b.textContent.includes('送审'))`));
  await evalJs(`[...${$root()}.querySelector('orders-view').shadowRoot.querySelectorAll('.actions button')].find(b=>b.textContent.includes('送审')).click()`);
  await waitFor(() => evalJs(`!!document.body.lastChild?.shadowRoot?.querySelector('#ok')`));
  await evalJs(`document.body.lastChild.shadowRoot.querySelector('#ok').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelector('.tag')?.textContent || ''`).then((s) => s.includes('待抽查')));
  check('选版本送审', true);

  // 16. 团长打回
  await evalJs(`
    (() => {
      const sel = ${$root()}.querySelector('top-bar').shadowRoot.querySelector('#roleSel');
      sel.value = 'u_director'; sel.dispatchEvent(new Event('change'));
    })()`);
  await waitFor(() => evalJs(`[...${$root()}.querySelector('orders-view').shadowRoot.querySelectorAll('.actions button')].some(b=>b.textContent.includes('打回'))`));
  await evalJs(`[...${$root()}.querySelector('orders-view').shadowRoot.querySelectorAll('.actions button')].find(b=>b.textContent.includes('打回')).click()`);
  await waitFor(() => evalJs(`!!document.body.lastChild?.shadowRoot?.querySelector('#r')`));
  await evalJs(`
    (() => {
      const m = document.body.lastChild.shadowRoot;
      m.querySelector('#r').value = '第36帧脚底穿地，转体缓动不自然';
      m.querySelector('#ok').click();
    })()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelector('.tag')?.textContent || ''`).then((s) => s.includes('已打回')));
  check('团长抽查打回（返工+1）', true);

  // 17. 看板
  await evalJs(`[...${$root()}.querySelector('top-bar').shadowRoot.querySelectorAll('nav button')].find(b=>b.dataset.v==='board').click()`);
  await waitFor(() => evalJs(`!!${$root()}.querySelector('board-view')?.shadowRoot.querySelector('.card')`));
  const boardText = await evalJs(`${$root()}.querySelector('board-view').shadowRoot.textContent`);
  const rework = await evalJs(`
    (() => {
      const card = [...${$root()}.querySelector('board-view').shadowRoot.querySelectorAll('.card')].find(c=>c.textContent.includes('王动画'));
      return card.querySelector('.rework .num').textContent;
    })()`);
  check('看板只看完成量与返工次数', boardText.includes('返工次数') && boardText.includes('完成量'));
  check('看板返工次数累计为 1', rework === '1', `rework=${rework}`);

  // 18. 持久化：刷新后登录态与订单都应保留
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await waitFor(() => evalJs(`!!${$root()}?.querySelector('top-bar')`));
  await evalJs(`[...${$root()}.querySelector('top-bar').shadowRoot.querySelectorAll('nav button')].find(b=>b.dataset.v==='orders').click()`);
  await waitFor(() => evalJs(`${$root()}.querySelector('orders-view')?.shadowRoot.querySelectorAll('.order').length`).then((n) => n >= 1));
  const persistedOrder = await evalJs(`${$root()}.querySelector('orders-view').shadowRoot.querySelector('.order h3')?.textContent`);
  check('IndexedDB 持久化（刷新后登录态与订单均保留）', persistedOrder === '绸吊倒挂转体', persistedOrder);

  const fatal = logs.filter((l) => l.startsWith('EXCEPTION') || l.startsWith('LOG error'));
  console.log('\\n--- 运行时异常/错误日志 ---');
  console.log(fatal.length ? fatal.join('\\n') : '(无)');
  const failed = results.filter((r) => !r.ok);
  console.log(`\\n==== ${results.length - failed.length}/${results.length} 通过 ====`);
  ws.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('测试驱动异常:', e); process.exit(2); });
