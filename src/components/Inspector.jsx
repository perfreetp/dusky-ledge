// 检查器:骨骼静止姿态/关节限位,部件绑定与偏移
import { Show, For, Index } from 'solid-js';
import {
  state, setState, setBoneRest, setBoneLimit, setPartBone, setPartOffset,
  removePart, keyBone, persist,
} from '../state/store.js';

function Vec3Input(props) {
  const arr = () => props.value();
  const set = (i, v) => {
    const nv = [...arr()];
    nv[i] = parseFloat(v) || 0;
    props.onChange(nv);
  };
  return (
    <div class="vec3">
      <For each={['X', 'Y', 'Z']}>
        {(label, i) => (
          <label>
            <span>{label}</span>
            <input
              type="number" step="0.05"
              value={+arr()[i()].toFixed(3)}
              onInput={(e) => set(i(), e.currentTarget.value)}
            />
          </label>
        )}
      </For>
    </div>
  );
}

function BoneInspector(props) {
  const bone = () => state.bones[props.id];
  return (
    <div class="panel">
      <div class="panel-title">骨骼 · {bone().name}</div>
      <div class="row">
        <button class="btn small" onClick={() => keyBone(props.id, ['rot'])}>K 旋转关键帧</button>
        <button class="btn small" onClick={() => keyBone(props.id, ['pos'])}>K 位移关键帧</button>
        <button class="btn small" onClick={() => keyBone(props.id, ['pos', 'rot'])}>K 全部</button>
      </div>
      <div class="field">
        <div class="field-label">静止位置</div>
        <Vec3Input value={() => bone().pos} onChange={(v) => setBoneRest(props.id, 'pos', v)} />
      </div>
      <div class="field">
        <div class="field-label">静止旋转(°)</div>
        <Vec3Input value={() => bone().rot} onChange={(v) => setBoneRest(props.id, 'rot', v)} />
      </div>
      <div class="field">
        <div class="field-label">关节活动范围(°)</div>
        <For each={['x', 'y', 'z']}>
          {(axis) => (
            <div class="limit-row">
              <span class="axis-tag">{axis.toUpperCase()}</span>
              <input
                type="number" value={bone().limits[axis][0]}
                onInput={(e) => setBoneLimit(props.id, axis, 0, parseFloat(e.currentTarget.value) || 0)}
              />
              <span>~</span>
              <input
                type="number" value={bone().limits[axis][1]}
                onInput={(e) => setBoneLimit(props.id, axis, 1, parseFloat(e.currentTarget.value) || 0)}
              />
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

function PartInspector(props) {
  const part = () => state.parts[props.id];
  return (
    <div class="panel">
      <div class="panel-title">部件 · {part().name}</div>
      <Show when={part().kind !== 'cloth'} fallback={
        <div class="hint-block">狮被为蒙皮部件,由狮头骨架链与狮尾骨架链共同驱动,无需绑定单根骨骼。</div>
      }>
        <div class="field">
          <div class="field-label">绑定骨骼</div>
          <select
            value={part().boneId || ''}
            onChange={(e) => setPartBone(props.id, e.currentTarget.value || null)}
          >
            <option value="">(未绑定)</option>
            <For each={state.boneOrder}>
              {(id) => <option value={id}>{state.bones[id].name}</option>}
            </For>
          </select>
        </div>
        <div class="field">
          <div class="field-label">绑定点偏移 · 位置</div>
          <Vec3Input value={() => part().offsetPos} onChange={(v) => setPartOffset(props.id, 'offsetPos', v)} />
        </div>
        <div class="field">
          <div class="field-label">绑定点偏移 · 旋转(°)</div>
          <Vec3Input value={() => part().offsetRot} onChange={(v) => setPartOffset(props.id, 'offsetRot', v)} />
        </div>
      </Show>
      <div class="row">
        <label class="chk">
          <input
            type="checkbox" checked={part().visible}
            onChange={(e) => { setState('parts', props.id, 'visible', e.currentTarget.checked); persist(); }}
          />
          显示
        </label>
        <Show when={part().kind === 'custom'}>
          <button class="btn small danger" onClick={() => removePart(props.id)}>移除部件</button>
        </Show>
      </div>
    </div>
  );
}

export default function Inspector() {
  return (
    <div class="inspector">
      <Show when={state.ui.selectedBone}>
        {(id) => <BoneInspector id={id()} />}
      </Show>
      <Show when={state.ui.selectedPart}>
        {(id) => <PartInspector id={id()} />}
      </Show>
      <Show when={!state.ui.selectedBone && !state.ui.selectedPart}>
        <div class="panel"><div class="hint-block">在视口或骨架树中选择骨骼 / 部件</div></div>
      </Show>
    </div>
  );
}
