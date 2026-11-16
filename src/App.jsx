// 应用外壳:顶栏 + 三个页面(编辑器 / 动作库 / 质检)
import { Show, For, createSignal } from 'solid-js';
import { state, setState, newAnimation, addImportedPart, persist } from './state/store.js';
import { exportSequence, downloadBlob } from './core/exporter.js';
import { viewportApi } from './components/Viewport.jsx';
import Viewport from './components/Viewport.jsx';
import SkeletonTree from './components/SkeletonTree.jsx';
import Inspector from './components/Inspector.jsx';
import Timeline from './components/Timeline.jsx';
import CurveEditor from './components/CurveEditor.jsx';
import Library from './components/Library.jsx';
import QcPage from './components/QcPage.jsx';

function TopBar() {
  const [exporting, setExporting] = createSignal(null);
  let fileInput;

  const doExport = async () => {
    if (!viewportApi.renderAt || exporting()) return;
    setState('ui', 'playing', false);
    setExporting({ done: 0, total: state.anim.loop[1] - state.anim.loop[0] + 1 });
    try {
      const zip = await exportSequence(
        state.anim,
        (f) => viewportApi.renderAt(f),
        viewportApi.canvas,
        (done, total) => setExporting({ done, total })
      );
      downloadBlob(zip, `${state.anim.name}_序列帧.zip`);
    } finally {
      setExporting(null);
    }
  };

  const onImport = (e) => {
    const file = e.currentTarget.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      addImportedPart(file.name.replace(/\.obj$/i, ''), `obj:${Date.now()}`, reader.result);
    };
    reader.readAsText(file);
    e.currentTarget.value = '';
  };

  return (
    <div class="topbar">
      <div class="brand">🦁 醒狮骨骼动画编辑器</div>
      <div class="tabs">
        <For each={[['editor', '编辑器'], ['library', '动作库'], ['qc', '质检']]}>
          {([id, label]) => (
            <button
              class={`tab ${state.ui.tab === id ? 'active' : ''}`}
              onClick={() => setState('ui', 'tab', id)}
            >
              {label}
            </button>
          )}
        </For>
      </div>
      <Show when={state.ui.tab === 'editor'}>
        <div class="top-actions">
          <input
            class="text slim" style={{ width: '140px' }} value={state.anim.name}
            onInput={(e) => { setState('anim', 'name', e.currentTarget.value); persist(); }}
            title="动画名称"
          />
          <button class="btn small" onClick={newAnimation}>新建动画</button>
          <button class="btn small" onClick={() => fileInput.click()}>导入部件(OBJ)</button>
          <input ref={fileInput} type="file" accept=".obj" style={{ display: 'none' }} onChange={onImport} />
          <button class="btn small primary" disabled={!!exporting()} onClick={doExport}>
            {exporting() ? `导出中 ${exporting().done}/${exporting().total}` : '导出序列帧打包'}
          </button>
        </div>
      </Show>
    </div>
  );
}

function EditorPage() {  const [bottom, setBottom] = createSignal('timeline');
  return (
    <div class="editor-layout">
      <div class="sidebar">
        <div class="mode-bar">
          <button
            class={`btn small ${state.ui.mode === 'anim' ? 'primary' : ''}`}
            onClick={() => setState('ui', 'mode', 'anim')}
          >动画编辑</button>
          <button
            class={`btn small ${state.ui.mode === 'rest' ? 'primary' : ''}`}
            onClick={() => setState('ui', 'mode', 'rest')}
          >静止姿态</button>
        </div>
        <div class="mode-bar">
          <label class="chk"><input type="checkbox" checked={state.ui.enforceLimits}
            onChange={(e) => setState('ui', 'enforceLimits', e.currentTarget.checked)} />强制限位</label>
          <label class="chk"><input type="checkbox" checked={state.ui.showBones}
            onChange={(e) => setState('ui', 'showBones', e.currentTarget.checked)} />骨骼</label>
          <label class="chk"><input type="checkbox" checked={state.ui.showGrid}
            onChange={(e) => setState('ui', 'showGrid', e.currentTarget.checked)} />地面</label>
        </div>
        <SkeletonTree />
        <Inspector />
      </div>
      <div class="center">
        <Viewport />
        <div class="bottom-panel">
          <div class="bottom-tabs">
            <button class={`tab ${bottom() === 'timeline' ? 'active' : ''}`} onClick={() => setBottom('timeline')}>时间轴</button>
            <button class={`tab ${bottom() === 'curve' ? 'active' : ''}`} onClick={() => setBottom('curve')}>曲线编辑</button>
          </div>
          <Show when={bottom() === 'timeline'}><Timeline /></Show>
          <Show when={bottom() === 'curve'}><CurveEditor /></Show>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div class="app">
      <TopBar />
      <Show when={state.ui.tab === 'editor'}><EditorPage /></Show>
      <Show when={state.ui.tab === 'library'}><Library /></Show>
      <Show when={state.ui.tab === 'qc'}><QcPage /></Show>
    </div>
  );
}
