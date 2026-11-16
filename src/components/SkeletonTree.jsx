// 骨架树:拖拽调整父子层级,部件挂载展示
import { For, Show, createMemo } from 'solid-js';
import { state, selectBone, selectPart, reparentBone } from '../state/store.js';

function BoneNode(props) {
  const kids = createMemo(() =>
    state.boneOrder.filter((id) => state.bones[id].parentId === props.id));
  const attached = createMemo(() =>
    state.partOrder.filter((pid) => state.parts[pid].boneId === props.id));

  let dropTarget = false;
  const setDrop = (v) => { dropTarget = v; };

  return (
    <div class="tree-node">
      <div
        class={`tree-row ${state.ui.selectedBone === props.id ? 'sel' : ''}`}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/bone', props.id);
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('text/bone')) {
            e.preventDefault();
            e.currentTarget.classList.add('drop');
          }
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drop')}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.classList.remove('drop');
          const bid = e.dataTransfer.getData('text/bone');
          if (bid && bid !== props.id) reparentBone(bid, props.id);
        }}
        onClick={() => selectBone(props.id)}
      >
        <span class="tree-ico">🦴</span>
        <span>{state.bones[props.id].name}</span>
      </div>
      <For each={attached()}>
        {(pid) => (
          <div
            class={`tree-row part ${state.ui.selectedPart === pid ? 'sel' : ''}`}
            style={{ 'padding-left': '28px' }}
            onClick={() => selectPart(pid)}
          >
            <span class="tree-ico">🧩</span>
            <span>{state.parts[pid].name}</span>
            <Show when={state.parts[pid].kind === 'cloth'}>
              <span class="tag">双骨架蒙皮</span>
            </Show>
          </div>
        )}
      </For>
      <div class="tree-children">
        <For each={kids()}>{(id) => <BoneNode id={id} depth={props.depth + 1} />}</For>
      </div>
    </div>
  );
}

export default function SkeletonTree() {
  const roots = createMemo(() => state.boneOrder.filter((id) => !state.bones[id].parentId));
  const unbound = createMemo(() =>
    state.partOrder.filter((pid) => !state.parts[pid].boneId && state.parts[pid].kind !== 'cloth'));
  return (
    <div class="panel tree-panel">
      <div class="panel-title">骨架树 <span class="hint">拖到目标骨骼上即设为其子级</span></div>
      <For each={roots()}>{(id) => <BoneNode id={id} depth={0} />}</For>
      <Show when={unbound().length}>
        <div class="panel-sub">未绑定部件</div>
        <For each={unbound()}>
          {(pid) => (
            <div
              class={`tree-row part ${state.ui.selectedPart === pid ? 'sel' : ''}`}
              onClick={() => selectPart(pid)}
            >
              <span class="tree-ico">🧩</span>
              <span>{state.parts[pid].name}</span>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
