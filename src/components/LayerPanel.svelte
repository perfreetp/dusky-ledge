<script lang="ts">
  import { LAYERS } from '../lib/config';
  import type { LayerId } from '../lib/types';

  let {
    layerOn,
    onToggle,
    visibleCount,
    totalCount,
    fps
  }: {
    layerOn: Record<LayerId, boolean>;
    onToggle: (id: LayerId, on: boolean) => void;
    visibleCount: number;
    totalCount: number;
    fps: number;
  } = $props();
</script>

<div class="panel">
  <h3>图层开关（关闭后不参与拾取）</h3>
  <div class="panel-body col">
    {#each LAYERS as l (l.id)}
      <label class="layer-row" style:--dot={l.cssColor}>
        <input
          type="checkbox"
          checked={layerOn[l.id]}
          onchange={(e) => onToggle(l.id, e.currentTarget.checked)}
        />
        <span class="dot"></span>
        <span>{l.name}图层</span>
      </label>
    {/each}
    <div class="stats muted">
      视口内绘制 <strong>{visibleCount.toLocaleString()}</strong> / {totalCount.toLocaleString()} 个实例
      <span class="spacer"></span>
      {fps} FPS
    </div>
  </div>
</div>

<style>
  .layer-row {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 0;
  }
  .layer-row input {
    width: auto;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--dot);
  }
  .stats {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--border);
    padding-top: 8px;
    font-size: 12px;
  }
  .stats strong {
    color: var(--accent);
  }
</style>
