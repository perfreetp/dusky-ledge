<script lang="ts">
  import { MAX_REWORK } from '../lib/config';
  import type { ProjectMeta, UserRole } from '../lib/types';
  import { fmtDateTime, deadlineState, STATUS_LABEL } from '../lib/utils/format';

  let {
    meta,
    role,
    onSubmit,
    onReturn,
    onApprove,
    onDeliver
  }: {
    meta: ProjectMeta;
    role: UserRole;
    onSubmit: () => void;
    onReturn: (reason: string) => void;
    onApprove: () => void;
    onDeliver: () => void;
  } = $props();

  let reason = $state('');
  let showReturn = $state(false);
  const dl = $derived(deadlineState(meta.deadline));
  const reworkLeft = $derived(MAX_REWORK - meta.reworks.length);
  const canResubmit =
    $derived(meta.status === 'returned' && meta.reworks.length < MAX_REWORK);

  function submitReturn() {
    if (!reason.trim()) {
      alert('请填写返工原因');
      return;
    }
    onReturn(reason.trim());
    reason = '';
    showReturn = false;
  }
</script>

<div class="panel">
  <h3>项目流程</h3>
  <div class="panel-body col">
    <div class="flow-row">
      <span class="muted">状态</span>
      <span class={`tag ${meta.status}`}>{STATUS_LABEL[meta.status]}</span>
      <span class="spacer"></span>
      <span class={dl.overdue ? 'overdue' : dl.urgent ? 'urgent' : 'muted'}>{dl.text}</span>
    </div>

    <div class="muted small">
      返工 {meta.reworks.length}/{MAX_REWORK}（剩余 {reworkLeft} 次）
      {#if reworkLeft === 0}<span class="overdue"> · 已达上限，项目关闭</span>{/if}
    </div>

    {#if role === 'maker'}
      {#if meta.status === 'editing' || canResubmit}
        <button
          class="primary"
          onclick={onSubmit}
          disabled={dl.overdue || reworkLeft === 0 && meta.status === 'returned'}
        >
          {meta.status === 'returned' ? '修改后重新提交' : '提交主管审核'}
        </button>
        {#if dl.overdue}<p class="overdue small">已超过截止时间，不能再提交。</p>{/if}
      {:else if meta.status === 'submitted'}
        <p class="muted small">已提交，等待主管在视口审核。</p>
      {:else if meta.status === 'approved'}
        <p class="ok small">主管已通过，可在截止前打包交付。</p>
      {:else if meta.status === 'delivered'}
        <p class="ok small">交付包已生成，流程结束。</p>
      {/if}
    {/if}

    {#if role === 'supervisor'}
      {#if meta.status === 'submitted'}
        <button class="warn" onclick={() => (showReturn = true)}>视口圈位退回返工</button>
        <button class="primary" onclick={onApprove}>审核通过</button>
      {:else}
        <p class="muted small">
          {meta.status === 'editing' ? '制作员尚未提交。' : '当前状态无需审核操作。'}
        </p>
      {/if}
    {/if}

    {#if role === 'maker' && meta.status === 'approved'}
      <button class="primary" onclick={onDeliver} disabled={dl.overdue}>
        {dl.overdue ? '已超期，无法交付' : '截止前打包交付（ZIP）'}
      </button>
    {/if}

    <div class="reworks">
      <strong class="small">返工记录</strong>
      {#each meta.reworks as r, idx (r.id)}
        <div class="rework-item">
          <div class="row">
            <span class="tag returned">第 {idx + 1} 次 · {r.id}</span>
            <span class="spacer"></span>
            <span class="muted small">{fmtDateTime(r.at)}</span>
          </div>
          <p>{r.reason}</p>
          <p class="muted small">
            圈位中心 ({r.circle.x.toFixed(0)}, {r.circle.z.toFixed(0)})，半径 {r.circle.radius} m
          </p>
        </div>
      {:else}
        <p class="muted small">暂无返工记录。</p>
      {/each}
    </div>
  </div>
</div>

{#if showReturn}
  <div
    class="modal-mask"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && (showReturn = false)}
    onkeydown={(e) => e.key === 'Escape' && (showReturn = false)}
  >
    <div class="modal panel">
      <h3>退回返工（第 {meta.reworks.length + 1} 次）</h3>
      <div class="panel-body col">
        <p class="muted small">
          先关闭本框，用左侧「圈退回位」工具在视口点击问题位置（红圈），再回来填写原因并确认退回。
          已圈位置会随退回记录一并保存。
        </p>
        <label class="col">
          <span class="muted">返工原因</span>
          <textarea bind:value={reason} placeholder="例如：该区域网箱排布与航道安全间距不足，请整体东移 60 米"></textarea>
        </label>
        <div class="row">
          <div class="spacer"></div>
          <button onclick={() => (showReturn = false)}>取消</button>
          <button class="warn" onclick={submitReturn}>确认退回</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .flow-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .small {
    font-size: 12px;
  }
  .overdue {
    color: var(--danger);
  }
  .urgent {
    color: var(--warn);
  }
  .ok {
    color: var(--ok);
  }
  .reworks {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px solid var(--border);
    padding-top: 10px;
  }
  .rework-item {
    background: var(--bg);
    border: 1px solid var(--border);
    border-left: 3px solid var(--danger);
    border-radius: 6px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rework-item p {
    margin: 0;
    font-size: 13px;
  }
</style>
