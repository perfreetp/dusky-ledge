import { createSignal, For } from 'solid-js';
import { actions, state } from '../state/store';

import { css } from '../ui/style';
/** 版本列表面板：提交、载入、删除、选择两版进入对比。 */
export default function VersionPanel() {
  const [label, setLabel] = createSignal('');
  const [pick, setPick] = createSignal<[string?, string?]>([]);

  const togglePick = (id: string) => {
    const [a, b] = pick();
    if (!a) setPick([id, undefined]);
    else if (!b) setPick([a, id]);
    else setPick([id, undefined]);
  };

  return (
    <>
      <div class="section-title">版本管理</div>
      <div class="row" style={css({ 'margin-bottom': 8 })}>
        <input
          placeholder={`版本说明，如 v${state.versions.length + 1} 初评`}
          value={label()}
          onInput={(e) => setLabel(e.currentTarget.value)}
        />
        <button
          class="primary"
          style={css({ flex: 'none' })}           onClick={async () => {
            await actions.commitVersion(label() || `v${state.versions.length + 1}`);
            setLabel('');
          }}
        >
          提交
        </button>
      </div>
      <For each={[...state.versions].reverse()}>
        {(v) => (
          <div
            class="version-item"
            style={css({ 'border-color': state.activeVersionId === v.id ? 'var(--accent)' : 'var(--border)' })}          >
            <div class="row">
              <strong>{v.label}</strong>
              <span class="muted" style={css({ flex: 'none', 'font-size': 11 })}>
                {new Date(v.createdAt).toLocaleString()}
              </span>
            </div>
            <div class="muted" style={css({ 'font-size': 11, margin: '4px 0' })}>
              面数 {v.stats.tunnelTris.toLocaleString()} · 钟乳石 {v.stats.speleoCount} · {v.stats.elapsedMs}ms
            </div>
            <div class="row">
              <button onClick={() => actions.checkoutVersion(v)}>载入此版</button>
              <button onClick={() => togglePick(v.id)} classList={{ primary: pick().includes(v.id) }}>
                {pick().includes(v.id) ? '✓ 已选对比' : '选来对比'}
              </button>
              <button
                style={css({ color: 'var(--danger)', flex: 'none' })}                 onClick={() => {
                  if (confirm(`删除版本 ${v.label}？其批注将一并删除。`)) actions.deleteVersion(v.id);
                }}
              >
                删
              </button>
            </div>
          </div>
        )}
      </For>
      <button
        style={css({ width: '100%' })}         disabled={!pick()[0] || !pick()[1]}
        onClick={() => actions.openCompare(pick()[0]!, pick()[1]!)}
      >
        并排对比选中的两版
      </button>
    </>
  );
}
