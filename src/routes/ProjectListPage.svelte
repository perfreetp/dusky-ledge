<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '../lib/data/store';
  import { MAX_REWORK } from '../lib/config';
  import type { ProjectMeta } from '../lib/types';
  import { deadlineState, fmtDate, STATUS_LABEL } from '../lib/utils/format';
  import { role } from '../lib/stores/session';

  let { onOpen }: { onOpen: (m: ProjectMeta) => void } = $props();

  let projects = $state<ProjectMeta[]>([]);
  let showCreate = $state(false);
  let zoneName = $state('');
  let deadlineDays = $state(14);

  function refresh() {
    projects = projectStore.list();
  }
  onMount(refresh);

  function create() {
    const name = zoneName.trim() || `养殖区 ${projects.length + 1} 号`;
    const meta = projectStore.create(name, deadlineDays);
    zoneName = '';
    showCreate = false;
    refresh();
    onOpen(meta);
  }

  function remove(p: ProjectMeta, e: MouseEvent) {
    e.stopPropagation();
    if (confirm(`确认删除项目「${p.zone}」？该项目所有返工记录与图层调整将一并清除。`)) {
      projectStore.remove(p.id);
      refresh();
    }
  }

  function counts(p: ProjectMeta) {
    return projectStore.loadFeatures(p).length;
  }
</script>

<div class="list-page">
  <div class="toolbar">
    <h2>养殖区项目{#if $role === 'supervisor'}（主管视图）{:else}（制作员视图）{/if}</h2>
    <div class="spacer"></div>
    {#if $role === 'maker'}
      <button class="primary" onclick={() => (showCreate = true)}>+ 立新项目（一个养殖区一个项目）</button>
    {/if}
  </div>

  <div class="grid">
    {#each projects as p (p.id)}
      {@const dl = deadlineState(p.deadline)}
      <div
        class="card panel"
        role="button"
        tabindex="0"
        onclick={() => onOpen(p)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(p)}
      >
        <div class="card-head">
          <strong>{p.zone}</strong>
          <span class={`tag ${p.status}`}>{STATUS_LABEL[p.status]}</span>
        </div>
        <div class="card-meta muted">
          <div>项目编号：{p.id}</div>
          <div>要素总数：{counts(p).toLocaleString()} 个</div>
          <div>立项日期：{fmtDate(p.createdAt)}</div>
          <div>
            交付截止：{fmtDate(p.deadline)}
            <span class={dl.overdue ? 'overdue' : dl.urgent ? 'urgent' : 'muted'}>（{dl.text}）</span>
          </div>
          <div>
            返工：{p.reworks.length} / {MAX_REWORK}
            {#if p.reworks.length >= MAX_REWORK}<span class="overdue"> · 次数已用尽</span>{/if}
          </div>
        </div>
        {#if p.reworks.length > 0}
          <div class="last-rework muted">
            最近退回：{p.reworks[p.reworks.length - 1].reason.slice(0, 26)}
            {p.reworks[p.reworks.length - 1].reason.length > 26 ? '…' : ''}
          </div>
        {/if}
        {#if $role === 'maker'}
          <button class="danger small" onclick={(e) => remove(p, e)}>删除项目</button>
        {/if}
      </div>
    {/each}

    {#if projects.length === 0}
      <div class="empty panel">
        <p>暂无项目。{#if $role === 'maker'}点击右上角为一个养殖区立新项目。{:else}请等待制作员提交项目。{/if}</p>
      </div>
    {/if}
  </div>
</div>

{#if showCreate}
  <div
    class="modal-mask"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && (showCreate = false)}
    onkeydown={(e) => e.key === 'Escape' && (showCreate = false)}
  >
    <div class="modal panel">
      <h3>新建立体总图项目</h3>
      <div class="panel-body col">
        <label class="col">
          <span class="muted">养殖区名称</span>
          <input bind:value={zoneName} placeholder="例如：南海一号深远海养殖区" />
        </label>
        <label class="col">
          <span class="muted">交付截止（天后）</span>
          <input type="number" min="1" max="365" bind:value={deadlineDays} />
        </label>
        <div class="row">
          <div class="spacer"></div>
          <button onclick={() => (showCreate = false)}>取消</button>
          <button class="primary" onclick={create}>建立项目</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .list-page {
    height: 100%;
    overflow: auto;
    padding: 20px 24px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px;
  }
  .card {
    padding: 14px 16px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card:hover {
    border-color: var(--accent);
  }
  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 13px;
  }
  .small {
    align-self: flex-end;
    padding: 3px 10px;
    font-size: 12px;
  }
  .overdue {
    color: var(--danger);
  }
  .urgent {
    color: var(--warn);
  }
  .empty {
    grid-column: 1 / -1;
    padding: 48px;
    text-align: center;
    color: var(--fg-dim);
  }
</style>
