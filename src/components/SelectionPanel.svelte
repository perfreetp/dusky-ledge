<script lang="ts">
  import { LAYERS, FEATURE_TYPES } from '../lib/config';
  import type { Feature, LayerId } from '../lib/types';

  let {
    features,
    role,
    onAssign,
    onClear
  }: {
    features: Feature[];
    role: 'maker' | 'supervisor';
    onAssign: (layer: LayerId) => void;
    onClear: () => void;
  } = $props();

  // 按当前图层归属统计
  const byLayer = $derived.by(() => {
    const m: Record<LayerId, number> = { cage: 0, chain: 0, warning: 0, channel: 0 };
    for (const f of features) m[f.layer]++;
    return m;
  });
</script>

<div class="panel">
  <h3>框选结果与图层归属</h3>
  <div class="panel-body col">
    {#if features.length === 0}
      <p class="muted">使用「框选改图层」工具在视口里拖拽框选一片要素，可批量调整其图层归属。</p>
    {:else}
      <div class="summary">
        已选 <strong>{features.length}</strong> 个要素
      </div>
      <div class="counts">
        {#each LAYERS as l (l.id)}
          <div class="count-row">
            <span>{l.name}图层</span>
            <strong>{byLayer[l.id]}</strong>
          </div>
        {/each}
      </div>
      <div class="types muted">
        {#each [...new Set(features.map((f) => f.type))] as t}
          <span class="tag">{FEATURE_TYPES[t].label}</span>
        {/each}
      </div>
      {#if role === 'maker'}
        <div class="assign">
          <span class="muted">批量改归属到：</span>
          <div class="row">
            {#each LAYERS as l (l.id)}
              <button onclick={() => onAssign(l.id)}>{l.name}</button>
            {/each}
          </div>
        </div>
      {:else}
        <p class="muted">主管角色只读，图层归属调整由制作员执行。</p>
      {/if}
      <button onclick={onClear}>清除选择</button>
    {/if}
  </div>
</div>

<style>
  .summary strong {
    color: var(--accent);
    font-size: 16px;
  }
  .counts {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .count-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
  .types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .assign {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
