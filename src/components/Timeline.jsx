// 时间轴:关键帧拖动/选择/复制/镜像,循环区间,播放控制
import { For, Show, createMemo, createSignal } from 'solid-js';
import {
  state, setState, moveKey, deleteSelectedKeys, copySelectedKeys, pasteKeys,
  mirrorAnim, setAnimProp, persist,
} from '../state/store.js';

const PPF = 12; // 每帧像素

export default function Timeline() {
  const [dragKey, setDragKey] = createSignal(null); // {boneId,kind,fromF,curF,moved}
  const [loopDrag, setLoopDrag] = createSignal(null); // {mode:'l'|'r'|'move', x0, loop0}
  let rulerEl;

  const rows = createMemo(() => {
    const out = [];
    for (const id of state.boneOrder) {
      const tr = state.anim.tracks[id];
      const has = tr && ((tr.pos && tr.pos.length) || (tr.rot && tr.rot.length));
      if (!has && id !== state.ui.selectedBone) continue;
      out.push({ boneId: id, kind: 'rot', label: '旋转', keys: tr?.rot || [] });
      out.push({ boneId: id, kind: 'pos', label: '位移', keys: tr?.pos || [] });
    }
    return out;
  });

  const isSel = (boneId, kind, f) =>
    state.ui.timelineSel.some((s) => s.boneId === boneId && s.kind === kind && Math.abs(s.f - f) < 1e-4);

  const frameAt = (clientX) => {
    const rect = rulerEl.getBoundingClientRect();
    const x = clientX - rect.left + rulerEl.scrollLeft;
    return Math.max(0, Math.min(state.anim.frames, Math.round(x / PPF)));
  };

  function onRulerDown(e) {
    const f = frameAt(e.clientX);
    setState('ui', 'frame', f);
    const move = (ev) => setState('ui', 'frame', frameAt(ev.clientX));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function onKeyDown(e, boneId, kind, f) {
    e.stopPropagation();
    let sel = state.ui.timelineSel;
    const hit = { boneId, kind, f };
    if (e.shiftKey) {
      sel = isSel(boneId, kind, f) ? sel.filter((s) => !(s.boneId === boneId && s.kind === kind && Math.abs(s.f - f) < 1e-4)) : [...sel, hit];
    } else if (!isSel(boneId, kind, f)) {
      sel = [hit];
    }
    setState('ui', 'timelineSel', sel);
    setDragKey({ boneId, kind, fromF: f, curF: f, moved: false });
    const move = (ev) => {
      const nf = frameAt(ev.clientX);
      setDragKey((d) => (d ? { ...d, curF: nf, moved: d.moved || nf !== d.fromF } : d));
    };
    const up = () => {
      const d = dragKey();
      if (d && d.moved) {
        const delta = d.curF - d.fromF;
        const targets = sel.length > 1 && isSel(d.boneId, d.kind, d.fromF)
          ? sel
          : [{ boneId: d.boneId, kind: d.kind, f: d.fromF }];
        // 从后往前移动避免碰撞
        const sorted = [...targets].sort((a, b) => (delta > 0 ? b.f - a.f : a.f - b.f));
        const newSel = [];
        for (const t of sorted) {
          const to = Math.max(0, Math.min(state.anim.frames, t.f + delta));
          moveKey(t.boneId, t.kind, t.f, to);
          newSel.push({ boneId: t.boneId, kind: t.kind, f: to });
        }
        setState('ui', 'timelineSel', newSel);
      }
      setDragKey(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function onLoopDown(e, mode) {
    e.stopPropagation();
    const x0 = e.clientX;
    const loop0 = [...state.anim.loop];
    setLoopDrag({ mode });
    const move = (ev) => {
      const df = Math.round((ev.clientX - x0) / PPF);
      let [a, b] = loop0;
      if (mode === 'l') a = Math.max(0, Math.min(b, loop0[0] + df));
      else if (mode === 'r') b = Math.min(state.anim.frames, Math.max(a, loop0[1] + df));
      else {
        const w = loop0[1] - loop0[0];
        a = Math.max(0, Math.min(state.anim.frames - w, loop0[0] + df));
        b = a + w;
      }
      setState('anim', 'loop', [a, b]);
    };
    const up = () => {
      setLoopDrag(null);
      persist();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const trackWidth = createMemo(() => (state.anim.frames + 4) * PPF);

  return (
    <div class="timeline">
      <div class="transport">
        <button class="btn" onClick={() => setState('ui', 'frame', state.anim.loop[0])}>⏮</button>
        <button class="btn play" onClick={() => setState('ui', 'playing', !state.ui.playing)}>
          {state.ui.playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button class="btn" onClick={() => setState('ui', 'frame', state.anim.loop[1])}>⏭</button>
        <label>帧 <input class="num" type="number" value={Math.floor(state.ui.frame)}
          onInput={(e) => setState('ui', 'frame', Math.max(0, Math.min(state.anim.frames, +e.currentTarget.value || 0)))} /></label>
        <label>帧率 <input class="num" type="number" min="1" max="120" value={state.anim.fps}
          onInput={(e) => setAnimProp('fps', Math.max(1, +e.currentTarget.value || 24))} /> fps</label>
        <label>总长 <input class="num" type="number" min="1" value={state.anim.frames}
          onInput={(e) => setAnimProp('frames', Math.max(1, Math.round(+e.currentTarget.value || 1)))} /> 帧</label>
        <span class="loop-info">循环 [{state.anim.loop[0]} ~ {state.anim.loop[1]}]</span>
        <span class="spacer" />
        <button class="btn small" onClick={copySelectedKeys}>复制关键帧</button>
        <button class="btn small" disabled={!state.ui.keyClipboard} onClick={pasteKeys}>粘贴到当前帧</button>
        <button class="btn small" onClick={deleteSelectedKeys}>删除</button>
        <button class="btn small" onClick={mirrorAnim}>左右镜像</button>
      </div>
      <div class="tl-body">
        <div class="tl-labels">
          <div class="tl-ruler-spacer" />
          <For each={rows()}>
            {(r) => (
              <div class="tl-label" classList={{ 'sel-bone': r.boneId === state.ui.selectedBone }}>
                {state.bones[r.boneId].name} · {r.label}
              </div>
            )}
          </For>
        </div>
        <div class="tl-scroll">
          <div class="tl-ruler" ref={rulerEl} onPointerDown={onRulerDown} style={{ width: `${trackWidth()}px` }}>
            <For each={Array.from({ length: state.anim.frames + 1 }, (_, i) => i)}>
              {(f) => (
                <Show when={f % 6 === 0}>
                  <span class="tick" style={{ left: `${f * PPF}px` }}>{f}</span>
                </Show>
              )}
            </For>
            <div
              class="loop-region"
              style={{ left: `${state.anim.loop[0] * PPF}px`, width: `${(state.anim.loop[1] - state.anim.loop[0]) * PPF}px` }}
              onPointerDown={(e) => onLoopDown(e, 'move')}
            >
              <div class="loop-handle l" onPointerDown={(e) => onLoopDown(e, 'l')} />
              <div class="loop-handle r" onPointerDown={(e) => onLoopDown(e, 'r')} />
            </div>
            <div class="playhead" style={{ left: `${state.ui.frame * PPF}px` }} />
          </div>
          <For each={rows()}>
            {(r) => (
              <div class="tl-track" style={{ width: `${trackWidth()}px` }}>
                <div class="playhead-line" style={{ left: `${state.ui.frame * PPF}px` }} />
                <For each={r.keys}>
                  {(k) => {
                    const dragging = () => {
                      const d = dragKey();
                      return d && d.boneId === r.boneId && d.kind === r.kind && Math.abs(d.fromF - k.f) < 1e-4;
                    };
                    const left = () => (dragging() ? dragKey().curF : k.f) * PPF;
                    return (
                      <div
                        class={`key ${isSel(r.boneId, r.kind, k.f) ? 'sel' : ''} mode-${k.mode || 'bezier'}`}
                        style={{ left: `${left()}px` }}
                        title={`第 ${k.f} 帧 · ${k.mode === 'linear' ? '线性' : k.mode === 'ease' ? '缓入缓出' : '贝塞尔'}`}
                        onPointerDown={(e) => onKeyDown(e, r.boneId, r.kind, k.f)}
                        onDblClick={() => setState('ui', 'curve', { boneId: r.boneId, kind: r.kind, comp: state.ui.curve.comp })}
                      />
                    );
                  }}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>
      <div class="tl-foot hint">单击选关键帧(Shift 多选)· 拖动移动 · 双击跳到曲线编辑 · 菱形颜色:黄=贝塞尔 蓝=线性 绿=缓入缓出</div>
    </div>
  );
}
