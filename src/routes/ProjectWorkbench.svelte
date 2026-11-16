<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SceneEngine, type InteractionMode } from '../lib/three/SceneEngine';
  import { projectStore } from '../lib/data/store';
  import { buildDeliveryPackage, downloadBlob } from '../lib/data/exporter';
  import { LAYERS, MAX_REWORK } from '../lib/config';
  import type { Feature, LayerId, MeasurePoint, ProjectMeta, ReworkCircle } from '../lib/types';
  import { role } from '../lib/stores/session';
  import LayerPanel from '../components/LayerPanel.svelte';
  import ToolbarPanel from '../components/ToolbarPanel.svelte';
  import SelectionPanel from '../components/SelectionPanel.svelte';
  import WorkflowPanel from '../components/WorkflowPanel.svelte';
  import FeaturePopup from '../components/FeaturePopup.svelte';

  let { projectId, onBack }: { projectId: string; onBack: () => void } = $props();

  let viewport = $state<HTMLDivElement>();
  let engine = $state<SceneEngine | null>(null);

  let meta = $state<ProjectMeta>(loadMeta());
  let features = $state<Feature[]>([]);

  function loadMeta(): ProjectMeta {
    return projectStore.get(projectId)!;
  }

  let mode = $state<InteractionMode>('select');
  let layerOn = $state<Record<LayerId, boolean>>({ cage: true, chain: true, warning: true, channel: true });
  let stats = $state({ visible: 0, total: 0, fps: 0 });

  let popup = $state<{ feature: Feature; x: number; y: number } | null>(null);
  let boxSelection = $state<Feature[]>([]);
  let measure = $state<{ a: MeasurePoint | null; b: MeasurePoint | null; dist: number | null }>({
    a: null,
    b: null,
    dist: null
  });
  let pendingCircle = $state<ReworkCircle | null>(null);
  let delivering = $state(false);

  function reloadMeta() {
    const m = projectStore.get(projectId);
    if (m) meta = m;
  }

  onMount(() => {
    if (!viewport) return;
    features = projectStore.loadFeatures(meta);
    const eng = new SceneEngine(viewport, {
      onPick: (f, x, y) => {
        if (f) {
          popup = { feature: f, x, y };
        } else {
          popup = null;
        }
        boxSelection = [];
      },
      onBoxSelect: (fs) => {
        boxSelection = fs;
        popup = null;
      },
      onMeasure: (a, b, dist) => {
        measure = { a, b, dist };
      },
      onCircle: (c) => {
        pendingCircle = c;
      },
      onStats: (visible, total, fps) => {
        stats = { visible, total, fps };
      }
    });
    eng.loadProject(features);
    // 已有返工记录的圈位重新画出来
    for (const r of meta.reworks) eng.addReworkCircle(r.circle);
    engine = eng;

    window.addEventListener('keydown', onKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', onKeydown);
    engine?.dispose();
    engine = null;
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setMode('select');
      popup = null;
    }
  }

  // ---------------------------------------------------------------- 图层

  function toggleLayer(id: LayerId, on: boolean) {
    layerOn = { ...layerOn, [id]: on };
    engine?.setLayerVisible(id, on);
  }

  function setMode(m: InteractionMode) {
    mode = m;
    engine?.setMode(m);
    if (m !== 'measure') popup = null;
    if (m !== 'circle') pendingCircle = null;
  }

  function assignLayer(layer: LayerId) {
    if (boxSelection.length === 0) return;
    const ids = boxSelection.map((f) => f.id);
    const updated = projectStore.setLayerOverride(projectId, ids, layer);
    if (updated) {
      features = projectStore.loadFeatures(meta);
      engine?.applyLayerChange(ids, layer);
      // 保留选择高亮
      boxSelection = features.filter((f) => ids.includes(f.id));
      engine?.getSelectedFeatures(); // no-op，确保选择集仍在引擎内
    }
  }

  function clearSelection() {
    boxSelection = [];
    engine?.clearSelection();
  }

  function flyTo(f: Feature) {
    engine?.flyToFeature(f);
  }

  // ---------------------------------------------------------------- 流程

  function submit() {
    projectStore.submit(projectId);
    reloadMeta();
  }

  function returnProject(reason: string) {
    if (!pendingCircle) {
      alert('请先用「圈退回位」工具在视口里圈出问题位置。');
      return;
    }
    if (meta.reworks.length >= MAX_REWORK) {
      alert('返工次数已达 3 次上限。');
      return;
    }
    projectStore.returnForRework(projectId, { reason, circle: pendingCircle });
    pendingCircle = null;
    setMode('select');
    reloadMeta();
  }

  function approve() {
    projectStore.approve(projectId);
    reloadMeta();
  }

  async function deliver() {
    if (delivering) return;
    if (Date.now() > meta.deadline) {
      alert('已超过交付截止时间，不能打包交付。');
      return;
    }
    delivering = true;
    try {
      const blob = await buildDeliveryPackage(meta, features);
      downloadBlob(blob, `${meta.id}_${meta.zone}_交付包.zip`);
      projectStore.markDelivered(projectId);
      reloadMeta();
    } finally {
      delivering = false;
    }
  }

  function clearMeasure() {
    engine?.clearMeasure();
  }
</script>

<div class="workbench">
  <aside class="sidebar left">
    <div class="back-row">
      <button onclick={onBack}>← 返回项目列表</button>
      <div class="spacer"></div>
      <span class="tag {meta.status}">{meta.zone}</span>
    </div>

    <LayerPanel
      {layerOn}
      onToggle={toggleLayer}
      visibleCount={stats.visible}
      totalCount={stats.total}
      fps={stats.fps}
    />

    <ToolbarPanel
      {mode}
      onMode={setMode}
      measureA={measure.a}
      measureB={measure.b}
      measureDist={measure.dist}
      onClearMeasure={clearMeasure}
      onResetView={() => engine?.resetView()}
    />

    <SelectionPanel
      features={boxSelection}
      role={$role}
      onAssign={assignLayer}
      onClear={clearSelection}
    />
  </aside>

  <section class="viewport-wrap">
    <div class="viewport" bind:this={viewport}></div>

    {#if mode === 'circle' && $role === 'supervisor'}
      <div class="hint-bar">
        主管审核：在视口点击要退回的位置生成红圈，然后在右侧填写返工原因
        {#if pendingCircle}<span class="ok"> · 已圈定位置 ✓</span>{/if}
      </div>
    {/if}
    {#if mode === 'circle' && $role !== 'supervisor'}
      <div class="hint-bar danger">圈退回位仅主管角色可用，请在右上角切换角色。</div>
    {/if}

    {#if popup}
      <FeaturePopup
        feature={popup.feature}
        x={popup.x}
        y={popup.y}
        onClose={() => (popup = null)}
        onFly={flyTo}
      />
    {/if}

    <div class="lod-legend">
      <span>LOD 三档（按相机距离自动切换）</span>
      <div class="lod-item"><i class="box"></i> 远 · 仅包围盒（&gt;1500m）</div>
      <div class="lod-item"><i class="simple"></i> 中 · 简化网衣（450–1500m）</div>
      <div class="lod-item"><i class="full"></i> 近 · 完整网格（≤450m）</div>
    </div>
  </section>

  <aside class="sidebar right">
    <WorkflowPanel
      {meta}
      role={$role}
      onSubmit={submit}
      onReturn={returnProject}
      onApprove={approve}
      onDeliver={deliver}
    />
    <div class="panel legend-panel">
      <h3>要素图例（共 {features.length.toLocaleString()} 个，全部实例化）</h3>
      <div class="panel-body col legend">
        {#each LAYERS as l (l.id)}
          <div><span class="dot" style:background={l.cssColor}></span>{l.name}图层要素</div>
        {/each}
        <p class="muted small">
          单击高亮描边并查看编号/投放日期；双击飞行定位；框选可批量改图层归属；
          关闭的图层不参与拾取。
        </p>
      </div>
    </div>
  </aside>
</div>

<style>
  .workbench {
    display: grid;
    grid-template-columns: 280px 1fr 300px;
    height: 100%;
    gap: 10px;
    padding: 10px;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: auto;
    min-height: 0;
  }
  .back-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .viewport-wrap {
    position: relative;
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--bg);
  }
  .viewport {
    position: absolute;
    inset: 0;
  }
  .hint-bar {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(13, 42, 66, 0.92);
    border: 1px solid var(--warn);
    color: var(--warn);
    border-radius: 999px;
    padding: 6px 16px;
    font-size: 13px;
    pointer-events: none;
    white-space: nowrap;
  }
  .hint-bar.danger {
    border-color: var(--danger);
    color: var(--danger);
  }
  .hint-bar .ok {
    color: var(--ok);
  }
  .lod-legend {
    position: absolute;
    left: 12px;
    bottom: 12px;
    background: rgba(13, 42, 66, 0.88);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    pointer-events: none;
  }
  .lod-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--fg-dim);
  }
  .lod-item i {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    display: inline-block;
  }
  .lod-item .box {
    border: 1px dashed var(--fg-dim);
  }
  .lod-item .simple {
    border: 1px solid var(--accent-warm);
    background: rgba(255, 154, 60, 0.25);
  }
  .lod-item .full {
    background: repeating-linear-gradient(45deg, var(--accent-warm) 0 2px, transparent 2px 5px);
  }
  .legend-panel .legend {
    font-size: 13px;
  }
  .legend .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
  }
  .small {
    font-size: 12px;
  }
</style>
