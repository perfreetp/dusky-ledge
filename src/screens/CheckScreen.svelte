<script>
  import { get } from 'svelte/store'
  import { panels, holds, batch, pushHistory, saveLocal, screen } from '../store.js'
  import { runBatchChecks } from '../lib/checks.js'

  function submit() {
    const items = runBatchChecks(get(holds), get(panels))
    batch.update(b => ({ ...b, status: 'submitted', items, submittedAt: new Date().toLocaleString() }))
    pushHistory('提交整批方案', `自动检查出 ${items.length} 项问题`)
    saveLocal()
  }

  $: b = $batch
  $: byLevel = lv => b.items.filter(i => i.level === lv)
  const lvName = { 1: '一级 · 支点干涉', 2: '二级 · 锚栓压板缝', 3: '三级 · 超高支点' }
</script>

<div class="check">
  <div class="panel">
    <h3>整批提交</h3>
    <div class="row">
      <button class="primary" on:click={submit} disabled={!$holds.length}>
        提交整批方案并自动检查
      </button>
      {#if b.status === 'submitted' || b.status === 'approved' || b.status === 'returned'}
        <button on:click={() => screen.set('review')}>前往复核界面 →</button>
      {/if}
    </div>
    <div class="hint">
      提交后自动跑一遍检查: 一级-支点干涉、二级-锚栓落在板缝、三级-超高支点,交复核员逐条确认或驳回。
      {#if b.submittedAt}最近提交: {b.submittedAt}{/if}
    </div>
  </div>

  {#if b.status === 'submitted' || b.status === 'approved' || b.status === 'returned'}
    {#each [1, 2, 3] as lv}
      <div class="panel">
        <h3 class="lv{lv}">{lvName[lv]}({byLevel(lv).length} 项)</h3>
        {#if byLevel(lv).length === 0}
          <div class="ok-text">✓ 无</div>
        {:else}
          {#each byLevel(lv) as item}
            <div class="item">
              <span class="msg">{item.message}</span>
              <span class="detail">{item.detail}</span>
              <span class="st {item.status}">{{ pending: '待复核', confirmed: '已确认', rejected: '已驳回' }[item.status]}</span>
            </div>
          {/each}
        {/if}
      </div>
    {/each}
  {:else}
    <div class="panel hint">当前批次尚未提交。状态: {b.status === 'returned' ? '已退回,请修改后重新提交' : '草稿'}</div>
  {/if}
</div>

<style>
  .check { padding: 14px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; height: 100%; }
  .row { display: flex; gap: 10px; margin-bottom: 8px; }
  .hint { font-size: 12px; color: #9aa0a6; }
  .ok-text { color: #69f0ae; }
  .item { display: flex; gap: 10px; align-items: baseline; padding: 6px 0; border-bottom: 1px dashed #3a3e45; font-size: 14px; }
  .msg { font-weight: 600; }
  .detail { color: #9aa0a6; font-size: 12px; flex: 1; }
  .st { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
  .st.pending { background: #ef6c00; }
  .st.confirmed { background: #2e7d32; }
  .st.rejected { background: #b71c1c; }
</style>
