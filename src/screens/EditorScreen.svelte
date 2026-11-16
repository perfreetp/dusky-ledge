<script>
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import {
    panels, routes, holds, violations, selectedHoldId, activeRouteId,
    holdTypes, holdType, saveLocal, markDirty, loadLocal
  } from '../store.js'
  import { initScene, rebuildPanels, syncHolds, selectHold, placeTypeAt, recolorHolds } from '../lib/scene.js'
  import { sampleLayout, sampleRoutes, sampleHolds } from '../lib/sampleData.js'

  let canvas
  let unsubs = []
  const palette = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#fb8c00', '#00acc1', '#f06292']

  onMount(() => {
    // 先恢复本地数据, 没有则给示例
    if (!loadLocal() || get(panels).length === 0) {
      panels.set(sampleLayout())
      routes.set(sampleRoutes())
      holds.set(sampleHolds())
    }
    if (!get(activeRouteId) && get(routes).length) activeRouteId.set(get(routes)[0].id)

    initScene(canvas)
    rebuildPanels()
    syncHolds()

    unsubs.push(panels.subscribe(() => { rebuildPanels(); }))
    unsubs.push(holds.subscribe(() => { syncHolds(); }))
    unsubs.push(selectedHoldId.subscribe(() => recolorHolds()))
  })
  onDestroy(() => unsubs.forEach(u => u()))

  // ---------- 岩板排布导入/导出 ----------
  function loadSample() {
    panels.set(sampleLayout())
    if (get(routes).length === 0) routes.set(sampleRoutes())
    markDirty(); saveLocal()
  }
  function importLayout(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        const list = Array.isArray(data) ? data : data.panels
        if (!Array.isArray(list) || !list.length) throw new Error('空')
        panels.set(list.map((p, i) => ({
          id: p.id || 'P' + (i + 1), name: p.name || '板-' + (i + 1),
          x: +p.x || 0, y: +p.y || 0, z: +p.z || 0,
          width: +p.width || 1.22, height: +p.height || 2.44,
          angleY: +p.angleY || 0, thickness: +p.thickness || 0.018
        })))
        markDirty(); saveLocal()
      } catch (err) { alert('排布文件解析失败: ' + err.message) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }
  function exportPlan() {
    const data = { panels: get(panels), routes: get(routes), holds: get(holds) }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = '线路方案.json'
    a.click()
  }

  // ---------- 支点库拖放 ----------
  function onDragStart(e, typeId) {
    e.dataTransfer.setData('text/holdtype', typeId)
    e.dataTransfer.effectAllowed = 'copy'
  }
  function onDrop(e) {
    e.preventDefault()
    const typeId = e.dataTransfer.getData('text/holdtype')
    if (!typeId) return
    if (!get(activeRouteId)) { alert('请先在左下角选择一条线路'); return }
    const rect = canvas.getBoundingClientRect()
    placeTypeAt(typeId, e.clientX - rect.left, e.clientY - rect.top, get(activeRouteId))
  }

  // ---------- 线路 ----------
  function addRoute() {
    const n = get(routes).length
    const id = 'R' + Date.now().toString(36)
    routes.update(list => [...list, { id, name: `新线路 ${n + 1}`, color: palette[n % palette.length], grade: 'V?' }])
    activeRouteId.set(id)
    markDirty(); saveLocal()
  }
  function removeRoute(id) {
    routes.update(list => list.filter(r => r.id !== id))
    holds.update(list => list.filter(h => h.routeId !== id))
    markDirty(); saveLocal()
  }

  // ---------- 选中支点 ----------
  $: sel = $selectedHoldId ? $holds.find(h => h.id === $selectedHoldId) : null
  function setSelRoute(e) {
    const routeId = e.target.value
    holds.update(list => list.map(h => h.id === sel.id ? { ...h, routeId } : h))
    markDirty(); saveLocal()
  }
  function deleteSelected() {
    holds.update(list => list.filter(h => h.id !== sel.id))
    selectHold(null)
    markDirty(); saveLocal()
  }
</script>

<div class="editor">
  <!-- 左栏 -->
  <div class="side">
    <div class="panel">
      <h3>岩板排布</h3>
      <div class="row">
        <button on:click={loadSample}>加载示例排布</button>
        <label class="filebtn">导入排布 JSON<input type="file" accept=".json" on:change={importLayout} hidden /></label>
      </div>
      <div class="row">
        <button on:click={exportPlan}>导出方案 JSON</button>
      </div>
      <div class="hint">共 {$panels.length} 块岩板</div>
    </div>

    <div class="panel">
      <h3>支点库(拖入场景)</h3>
      <div class="lib">
        {#each holdTypes as t}
          <div class="libitem" draggable="true" on:dragstart={e => onDragStart(e, t.id)}>
            <b>{t.name}</b>
            <span>{(t.w * 100).toFixed(0)}×{(t.h * 100).toFixed(0)}cm · {t.bolts} 栓</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="panel">
      <h3>线路(一条线一个颜色)</h3>
      {#each $routes as r}
        <div class="route" class:active={$activeRouteId === r.id}>
          <input type="color" bind:value={r.color} on:change={() => { routes.set($routes); markDirty(); saveLocal() }} />
          <input class="rname" bind:value={r.name} on:change={() => { routes.set($routes); saveLocal() }} />
          <button on:click={() => activeRouteId.set(r.id)}>当前</button>
          <button class="danger" on:click={() => removeRoute(r.id)}>删</button>
        </div>
      {/each}
      <button on:click={addRoute}>+ 新增线路</button>
    </div>
  </div>

  <!-- 中间 3D 画布 -->
  <div class="canvaswrap" on:dragover|preventDefault on:drop={onDrop}>
    <canvas bind:this={canvas}></canvas>
    <div class="overlay hint">
      左键点选支点(包围盒拾取)→ 三轴手柄平移/旋转,松手自动沿板面法线吸附贴紧;空白处拖动旋转视角,滚轮缩放
    </div>
  </div>

  <!-- 右栏 -->
  <div class="side">
    <div class="panel vio">
      <h3>实时碰撞检测({$violations.length})</h3>
      {#if $violations.length === 0}
        <div class="ok-text">✓ 无超限</div>
      {:else}
        {#each $violations as v}
          <div class="vioitem">{v.msg}</div>
        {/each}
      {/if}
    </div>

    <div class="panel">
      <h3>选中支点</h3>
      {#if sel}
        <div class="kv"><span>编号</span><b>{sel.id}</b></div>
        <div class="kv"><span>类型</span><b>{holdType(sel.typeId).name}</b></div>
        <div class="kv"><span>岩板</span><b>{sel.panelId || '—'}</b></div>
        <div class="kv"><span>位置</span><b>({sel.x.toFixed(2)}, {sel.y.toFixed(2)}, {sel.z.toFixed(2)})</b></div>
        <div class="kv"><span>所属线路</span>
          <select value={sel.routeId} on:change={setSelRoute}>
            {#each $routes as r}<option value={r.id}>{r.name}</option>{/each}
          </select>
        </div>
        <button class="danger" on:click={deleteSelected}>删除该支点</button>
      {:else}
        <div class="hint">未选中。点击场景中的支点即可选中并显示三轴手柄。</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .editor { display: flex; height: 100%; min-height: 0; }
  .side { width: 290px; flex: none; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
  .canvaswrap { flex: 1; position: relative; min-width: 0; }
  canvas { width: 100%; height: 100%; display: block; touch-action: none; outline: none; }
  .overlay { position: absolute; left: 10px; bottom: 8px; right: 10px; pointer-events: none; }
  .row { display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
  .hint { font-size: 12px; color: #9aa0a6; }
  .filebtn { font: inherit; cursor: pointer; border: 1px solid #444; background: #2c2f34; border-radius: 6px; padding: 6px 12px; }
  .filebtn:hover { background: #3a3e45; }
  .lib { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .libitem { background: #2a2e34; border: 1px solid #3d424a; border-radius: 6px; padding: 6px 8px; cursor: grab; display: flex; flex-direction: column; }
  .libitem span { font-size: 11px; color: #9aa0a6; }
  .libitem:active { cursor: grabbing; }
  .route { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
  .route.active { outline: 1px solid #64b5f6; border-radius: 6px; }
  .route input[type=color] { width: 30px; height: 26px; padding: 0; border: none; background: none; }
  .rname { flex: 1; min-width: 0; }
  .kv { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; font-size: 13px; }
  .vioitem { color: #ff8a80; font-size: 13px; margin-bottom: 5px; }
  .ok-text { color: #69f0ae; }
</style>
