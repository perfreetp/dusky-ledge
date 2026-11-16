<script lang="ts">
  import type { InteractionMode } from '../lib/three/SceneEngine';
  import type { MeasurePoint } from '../lib/types';
  import { fmtMeters } from '../lib/utils/format';

  let {
    mode,
    onMode,
    measureA,
    measureB,
    measureDist,
    onClearMeasure,
    onResetView
  }: {
    mode: InteractionMode;
    onMode: (m: InteractionMode) => void;
    measureA: MeasurePoint | null;
    measureB: MeasurePoint | null;
    measureDist: number | null;
    onClearMeasure: () => void;
    onResetView: () => void;
  } = $props();

  const tools: { id: InteractionMode; label: string; hint: string }[] = [
    { id: 'select', label: '点选/框选', hint: '单击选要素，双击飞过去' },
    { id: 'box', label: '框选改图层', hint: '拖拽框选一片要素' },
    { id: 'measure', label: '水平量距', hint: '依次点击两个点' },
    { id: 'circle', label: '圈退回位', hint: '主管在视口圈位置' }
  ];
</script>

<div class="panel">
  <h3>交互工具</h3>
  <div class="panel-body col">
    <div class="tool-grid">
      {#each tools as t (t.id)}
        <button class={mode === t.id ? 'toggled' : ''} onclick={() => onMode(t.id)}>
          {t.label}
        </button>
      {/each}
    </div>
    <p class="hint muted">{tools.find((t) => t.id === mode)?.hint}</p>

    {#if mode === 'measure'}
      <div class="measure-box">
        <div>起点：{measureA ? `(${measureA.x.toFixed(1)}, ${measureA.z.toFixed(1)})` : '待点击'}</div>
        <div>终点：{measureB ? `(${measureB.x.toFixed(1)}, ${measureB.z.toFixed(1)})` : '待点击'}</div>
        {#if measureDist !== null}
          <div class="dist">水平距离：<strong>{fmtMeters(measureDist)}</strong></div>
        {/if}
        <button onclick={onClearMeasure}>清空测距</button>
      </div>
    {/if}

    <button onclick={onResetView}>复位视角</button>
  </div>
</div>

<style>
  .tool-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .hint {
    margin: 0;
    font-size: 12px;
  }
  .measure-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    font-size: 13px;
  }
  .dist strong {
    color: var(--accent);
    font-size: 15px;
  }
</style>
