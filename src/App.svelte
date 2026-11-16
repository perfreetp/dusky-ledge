<script lang="ts">
  import ProjectListPage from './routes/ProjectListPage.svelte';
  import ProjectWorkbench from './routes/ProjectWorkbench.svelte';
  import { role } from './lib/stores/session';
  import type { ProjectMeta, UserRole } from './lib/types';

  let view = $state<'list' | 'project'>('list');
  let activeId = $state<string | null>(null);

  function openProject(meta: ProjectMeta) {
    activeId = meta.id;
    view = 'project';
  }
  function back() {
    view = 'list';
    activeId = null;
  }
  function switchRole(r: UserRole) {
    role.set(r);
  }
</script>

<div class="app-shell">
  <header class="topbar">
    <div class="brand">
      <span class="logo">🌊</span>
      <strong>深远海养殖平台 · 三维总图浏览与图层管理系统</strong>
    </div>
    <div class="spacer"></div>
    <div class="role-switch">
      <span class="muted">当前角色</span>
      <button class={$role === 'maker' ? 'toggled' : ''} onclick={() => switchRole('maker')}>
        制作员
      </button>
      <button
        class={$role === 'supervisor' ? 'toggled' : ''}
        onclick={() => switchRole('supervisor')}
      >
        主管
      </button>
    </div>
  </header>

  <main>
    {#if view === 'list'}
      <ProjectListPage onOpen={openProject} />
    {:else if activeId}
      {#key activeId}
        <ProjectWorkbench projectId={activeId} onBack={back} />
      {/key}
    {/if}
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 18px;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo {
    font-size: 20px;
  }
  .role-switch {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  main {
    flex: 1;
    min-height: 0;
    position: relative;
  }
</style>
