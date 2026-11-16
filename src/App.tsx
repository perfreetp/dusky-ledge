import { For } from 'solid-js';
import { tab, setTab, TAB_LABELS, type TabKey } from './store/nav';
import PatternEditor from './pages/PatternEditor';
import AssemblyPreview from './pages/AssemblyPreview';
import OrderDelivery from './pages/OrderDelivery';

const TABS: TabKey[] = ['editor', 'assembly', 'orders'];

export default function App() {
  return (
    <div class="app-shell">
      <header class="app-header">
        <h1>铝艺庭院门 · 镂空花板设计工作台</h1>
        <nav class="tab-bar">
          <For each={TABS}>
            {(t) => (
              <button
                class={`tab ${tab() === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
              </button>
            )}
          </For>
        </nav>
      </header>
      <main class="app-main">
        <div class="tab-page" classList={{ hidden: tab() !== 'editor' }}>
          <PatternEditor />
        </div>
        <div class="tab-page" classList={{ hidden: tab() !== 'assembly' }}>
          <AssemblyPreview />
        </div>
        <div class="tab-page" classList={{ hidden: tab() !== 'orders' }}>
          <OrderDelivery />
        </div>
      </main>
    </div>
  );
}
