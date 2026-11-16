<script>
  import { screen, batch } from './store.js'
  import EditorScreen from './screens/EditorScreen.svelte'
  import ViewsScreen from './screens/ViewsScreen.svelte'
  import CheckScreen from './screens/CheckScreen.svelte'
  import ReviewScreen from './screens/ReviewScreen.svelte'

  const tabs = [
    { id: 'editor', name: '① 线路编辑' },
    { id: 'views',  name: '② 出图与统计' },
    { id: 'check',  name: '③ 提交检查' },
    { id: 'review', name: '④ 复核放行' }
  ]
  const statusName = { draft: '草稿', submitted: '待复核', approved: '已放行', returned: '已退回' }
</script>

<nav class="topnav">
  <span class="title">🧗 攀岩馆线路布置与批次放行</span>
  {#each tabs as t}
    <button class="tab" class:active={$screen === t.id} on:click={() => screen.set(t.id)}>{t.name}</button>
  {/each}
  <span class="badge {$batch.status}">批次状态:{statusName[$batch.status]}</span>
</nav>

<div class="screen">
  {#if $screen === 'editor'}
    <EditorScreen />
  {:else if $screen === 'views'}
    <ViewsScreen />
  {:else if $screen === 'check'}
    <CheckScreen />
  {:else}
    <ReviewScreen />
  {/if}
</div>
