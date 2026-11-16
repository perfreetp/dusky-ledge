<script>
  import { batch, pushHistory, saveLocal } from '../store.js'

  const lvName = { 1: '一级 · 支点干涉', 2: '二级 · 锚栓压板缝', 3: '三级 · 超高支点' }
  let rejectDraft = {}   // itemId -> 正在填写的驳回原因

  $: b = $batch
  $: allConfirmed = b.items.every(i => i.status === 'confirmed')
  $: anyRejected = b.items.some(i => i.status === 'rejected')
  $: canRelease = b.status === 'submitted' && allConfirmed
  $: canReturn = b.status === 'submitted' && anyRejected

  function confirmItem(id) {
    batch.update(x => ({ ...x, items: x.items.map(i => i.id === id ? { ...i, status: 'confirmed', reason: '' } : i) }))
    delete rejectDraft[id]; rejectDraft = rejectDraft
    saveLocal()
  }
  function resetItem(id) {
    batch.update(x => ({ ...x, items: x.items.map(i => i.id === id ? { ...i, status: 'pending', reason: '' } : i) }))
    saveLocal()
  }
  function doReject(id) {
    const reason = (rejectDraft[id] || '').trim()
    if (!reason) { alert('驳回必须填写原因'); return }
    batch.update(x => ({ ...x, items: x.items.map(i => i.id === id ? { ...i, status: 'rejected', reason } : i) }))
    delete rejectDraft[id]; rejectDraft = rejectDraft
    saveLocal()
  }

  function release() {
    batch.update(x => ({ ...x, status: 'approved' }))
    pushHistory('整批放行', '全部检查项达标,复核员放行')
    saveLocal()
  }
  function returnBatch() {
    const reasons = b.items.filter(i => i.status === 'rejected').map(i => `[${i.type}] ${i.message}:${i.reason}`).join(';')
    batch.update(x => ({ ...x, status: 'returned' }))
    pushHistory('整批退回', reasons)
    saveLocal()
  }
</script>

<div class="review">
  <div class="panel">
    <h3>复核台</h3>
    {#if b.status === 'submitted'}
      <div class="hint">共 {b.items.length} 项待处理:逐条「确认」或「驳回」(驳回必填原因)。全部确认达标后才可整批放行。</div>
    {:else if b.status === 'approved'}
      <div class="ok-text">✓ 本批次已放行。</div>
    {:else if b.status === 'returned'}
      <div class="bad-text">✗ 本批次已退回定线员修改,修改后需重新提交检查。</div>
    {:else}
      <div class="hint">批次尚未提交,请先在「提交检查」界面提交。</div>
    {/if}
    <div class="row">
      <button class="ok" disabled={!canRelease} on:click={release}>✓ 整批放行</button>
      <button class="danger" disabled={!canReturn} on:click={returnBatch}>✗ 整批退回(含驳回原因)</button>
    </div>
  </div>

  {#each [1, 2, 3] as lv}
    {@const items = b.items.filter(i => i.level === lv)}
    {#if items.length}
      <div class="panel">
        <h3 class="lv{lv}">{lvName[lv]}</h3>
        {#each items as item}
          <div class="item">
            <div class="main">
              <div><b>{item.message}</b></div>
              <div class="detail">{item.detail}</div>
              {#if item.status === 'rejected'}
                <div class="reason">驳回原因:{item.reason}</div>
              {/if}
              {#if rejectDraft[item.id] !== undefined}
                <textarea rows="2" placeholder="填写驳回原因(必填)" bind:value={rejectDraft[item.id]}></textarea>
                <div class="row">
                  <button class="danger" on:click={() => doReject(item.id)}>确认驳回</button>
                  <button on:click={() => { delete rejectDraft[item.id]; rejectDraft = rejectDraft }}>取消</button>
                </div>
              {/if}
            </div>
            <div class="ops">
              {#if b.status === 'submitted'}
                {#if item.status !== 'confirmed'}
                  <button class="ok" on:click={() => confirmItem(item.id)}>确认</button>
                {/if}
                {#if item.status !== 'rejected'}
                  <button class="danger" on:click={() => { rejectDraft[item.id] = ''; rejectDraft = rejectDraft }}>驳回</button>
                {/if}
                {#if item.status !== 'pending'}
                  <button on:click={() => resetItem(item.id)}>撤销</button>
                {/if}
              {/if}
              <span class="st {item.status}">{{ pending: '待复核', confirmed: '已确认', rejected: '已驳回' }[item.status]}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/each}

  {#if b.history.length}
    <div class="panel">
      <h3>批次流转记录</h3>
      {#each b.history as h}
        <div class="hist"><span class="t">{h.time}</span><b>{h.action}</b><span class="detail">{h.note}</span></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .review { padding: 14px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; height: 100%; }
  .row { display: flex; gap: 10px; margin-top: 8px; }
  .hint { font-size: 13px; color: #9aa0a6; }
  .ok-text { color: #69f0ae; }
  .bad-text { color: #ff8a80; }
  .item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px dashed #3a3e45; }
  .main { flex: 1; min-width: 0; }
  .detail { color: #9aa0a6; font-size: 12px; }
  .reason { color: #ff8a80; font-size: 13px; margin-top: 4px; }
  textarea { width: 100%; margin-top: 6px; resize: vertical; }
  .ops { display: flex; align-items: center; gap: 6px; flex: none; }
  .st { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
  .st.pending { background: #ef6c00; }
  .st.confirmed { background: #2e7d32; }
  .st.rejected { background: #b71c1c; }
  .hist { display: flex; gap: 10px; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed #333; }
  .t { color: #9aa0a6; flex: none; }
</style>
