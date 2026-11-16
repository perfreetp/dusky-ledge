// 动作库:条目(时长/帧数/状态),批量送质检
import { For, Show, createSignal } from 'solid-js';
import {
  state, saveToLibrary, loadLibraryEntry, deleteLibraryEntry, sendToQc, setState,
} from '../state/store.js';

const STATUS = {
  draft: ['草稿', 'st-draft'],
  qc: ['质检中', 'st-qc'],
  released: ['已放行', 'st-released'],
  returned: ['已退回', 'st-returned'],
};

export default function Library() {
  const [name, setName] = createSignal('');
  const [picked, setPicked] = createSignal([]);

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const doSave = () => {
    saveToLibrary(name() || state.anim.name);
    setName('');
  };

  const doSendQc = () => {
    if (!picked().length) return;
    sendToQc(picked());
    setPicked([]);
  };

  return (
    <div class="page">
      <div class="panel">
        <div class="panel-title">保存当前动画到动作库</div>
        <div class="row">
          <input
            class="text" placeholder={`名称(默认:${state.anim.name})`}
            value={name()} onInput={(e) => setName(e.currentTarget.value)}
          />
          <button class="btn primary" onClick={doSave}>保存条目</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">
          动作库
          <span class="spacer" />
          <button class="btn small primary" disabled={!picked().length} onClick={doSendQc}>
            将选中 {picked().length} 条送质检
          </button>
        </div>
        <Show when={state.library.length} fallback={<div class="hint-block">暂无条目,先保存一个动画</div>}>
          <table class="tbl">
            <thead>
              <tr><th></th><th>名称</th><th>帧数</th><th>帧率</th><th>时长(s)</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              <For each={state.library}>
                {(e) => (
                  <tr>
                    <td><input type="checkbox" checked={picked().includes(e.id)} onChange={() => toggle(e.id)} /></td>
                    <td>{e.name}</td>
                    <td>{e.frames}</td>
                    <td>{e.fps}</td>
                    <td>{e.duration}</td>
                    <td><span class={`badge ${STATUS[e.status]?.[1] || ''}`}>{STATUS[e.status]?.[0] || e.status}</span></td>
                    <td>
                      <button class="btn small" onClick={() => loadLibraryEntry(e.id)}>载入编辑</button>
                      <button class="btn small danger" onClick={() => deleteLibraryEntry(e.id)}>删除</button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  );
}
