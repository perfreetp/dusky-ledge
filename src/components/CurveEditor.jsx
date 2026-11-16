// 曲线编辑器:贝塞尔手柄 / 线性 / 缓入缓出
import { For, Show, createMemo, createSignal } from 'solid-js';
import { state, setState, setKeyMode, setKeyHandle, updateTracks } from '../state/store.js';
import { evalTrack } from '../core/animation.js';

const W = 720, H = 210, PAD = 28;

export default function CurveEditor() {
  const [selF, setSelF] = createSignal(null);
  let svgEl;

  const cur = () => state.ui.curve;
  const keys = createMemo(() => state.anim.tracks[cur().boneId]?.[cur().kind] || []);
  const comp = () => cur().comp;

  const range = createMemo(() => {
    const ks = keys();
    let mn = -10, mx = 10;
    if (ks.length) {
      mn = Math.min(...ks.map((k) => k.v[comp()]));
      mx = Math.max(...ks.map((k) => k.v[comp()]));
      const pad = Math.max(5, (mx - mn) * 0.2);
      mn -= pad; mx += pad;
    }
    return { mn, mx };
  });

  const X = (f) => PAD + (f / Math.max(1, state.anim.frames)) * (W - PAD * 2);
  const Y = (v) => {
    const { mn, mx } = range();
    return H - PAD - ((v - mn) / (mx - mn)) * (H - PAD * 2);
  };
  const invX = (x) => ((x - PAD) / (W - PAD * 2)) * state.anim.frames;
  const invY = (y) => {
    const { mn, mx } = range();
    return mn + ((H - PAD - y) / (H - PAD * 2)) * (mx - mn);
  };

  const samples = createMemo(() => {
    const ks = keys();
    if (!ks.length) return '';
    const pts = [];
    for (let f = 0; f <= state.anim.frames; f += 1) {
      const v = evalTrack(ks, f);
      pts.push(`${X(f).toFixed(1)},${Y(v[comp()]).toFixed(1)}`);
    }
    return pts.join(' ');
  });

  const selKey = createMemo(() => keys().find((k) => Math.abs(k.f - selF()) < 1e-4) || null);

  function svgPoint(e) {
    const r = svgEl.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
  }

  function dragKeyValue(e, k) {
    e.stopPropagation();
    setSelF(k.f);
    let curF = k.f;
    const move = (ev) => {
      const [x, y] = svgPoint(ev);
      const nf = Math.max(0, Math.min(state.anim.frames, Math.round(invX(x))));
      const nv = invY(y);
      updateTracks((tracks) => {
        const arr = tracks[cur().boneId]?.[cur().kind];
        if (!arr) return;
        const t = arr.find((q) => Math.abs(q.f - curF) < 1e-4);
        if (!t) return;
        if (!arr.some((q) => q !== t && Math.abs(q.f - nf) < 1e-4)) {
          t.f = nf;
          curF = nf;
        }
        t.v = t.v.map((v, i) => (i === comp() ? nv : v));
        arr.sort((a, b) => a.f - b.f);
      });
      setSelF(curF);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function dragHandle(e, k, which) {
    e.stopPropagation();
    const move = (ev) => {
      const [x, y] = svgPoint(ev);
      const df = invX(x) - k.f;
      const dv = invY(y) - k.v[comp()];
      setKeyHandle(cur().boneId, cur().kind, k.f, which, df, dv, comp());
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const applyMode = (mode) => {
    const ks = keys();
    if (selKey()) setKeyMode(cur().boneId, cur().kind, selKey().f, mode);
    else for (const k of ks) setKeyMode(cur().boneId, cur().kind, k.f, mode);
  };

  return (
    <div class="curve-editor">
      <div class="ce-head">
        <select
          value={cur().boneId}
          onChange={(e) => { setState('ui', 'curve', { ...cur(), boneId: e.currentTarget.value }); setSelF(null); }}
        >
          <For each={state.boneOrder}>
            {(id) => <option value={id}>{state.bones[id].name}</option>}
          </For>
        </select>
        <select
          value={cur().kind}
          onChange={(e) => setState('ui', 'curve', { ...cur(), kind: e.currentTarget.value })}
        >
          <option value="rot">旋转</option>
          <option value="pos">位移</option>
        </select>
        <select
          value={cur().comp}
          onChange={(e) => setState('ui', 'curve', { ...cur(), comp: +e.currentTarget.value })}
        >
          <option value={0}>X 分量</option>
          <option value={1}>Y 分量</option>
          <option value={2}>Z 分量</option>
        </select>
        <span class="spacer" />
        <span class="hint">缓动:</span>
        <button class="btn small" onClick={() => applyMode('bezier')}>贝塞尔</button>
        <button class="btn small" onClick={() => applyMode('linear')}>线性</button>
        <button class="btn small" onClick={() => applyMode('ease')}>缓入缓出</button>
      </div>
      <Show when={keys().length} fallback={<div class="hint-block">该通道暂无关键帧 —— 在时间轴或检查器中打关键帧</div>}>
        <svg ref={svgEl} viewBox={`0 0 ${W} ${H}`} class="ce-svg" preserveAspectRatio="none">
          {/* 网格 */}
          <For each={[0, 0.25, 0.5, 0.75, 1]}>
            {(t) => (
              <line x1={PAD} x2={W - PAD} y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)} class="ce-grid" />
            )}
          </For>
          {/* 循环区间 */}
          <rect
            x={X(state.anim.loop[0])} y={PAD}
            width={X(state.anim.loop[1]) - X(state.anim.loop[0])} height={H - PAD * 2}
            class="ce-loop"
          />
          {/* 当前帧 */}
          <line x1={X(state.ui.frame)} x2={X(state.ui.frame)} y1={PAD} y2={H - PAD} class="ce-playhead" />
          {/* 曲线 */}
          <polyline points={samples()} class="ce-curve" />
          {/* 选中关键帧的贝塞尔手柄 */}
          <Show when={selKey() && (selKey().mode || 'bezier') === 'bezier'}>
            {(() => {
              const k = selKey();
              return (
                <g>
                  <line x1={X(k.f)} y1={Y(k.v[comp()])} x2={X(k.f + k.hin.df)} y2={Y(k.v[comp()] + k.hin.dv[comp()])} class="ce-handle-line" />
                  <line x1={X(k.f)} y1={Y(k.v[comp()])} x2={X(k.f + k.hout.df)} y2={Y(k.v[comp()] + k.hout.dv[comp()])} class="ce-handle-line" />
                  <rect
                    x={X(k.f + k.hin.df) - 5} y={Y(k.v[comp()] + k.hin.dv[comp()]) - 5} width={10} height={10}
                    class="ce-handle" onPointerDown={(e) => dragHandle(e, k, 'hin')}
                  />
                  <rect
                    x={X(k.f + k.hout.df) - 5} y={Y(k.v[comp()] + k.hout.dv[comp()]) - 5} width={10} height={10}
                    class="ce-handle" onPointerDown={(e) => dragHandle(e, k, 'hout')}
                  />
                </g>
              );
            })()}
          </Show>
          {/* 关键帧点 */}
          <For each={keys()}>
            {(k) => (
              <circle
                cx={X(k.f)} cy={Y(k.v[comp()])} r={5}
                class={`ce-key ${Math.abs(k.f - (selF() ?? -1)) < 1e-4 ? 'sel' : ''}`}
                onPointerDown={(e) => dragKeyValue(e, k)}
              />
            )}
          </For>
        </svg>
        <div class="hint">拖动圆点改帧/值 · 选中贝塞尔关键帧后拖动方形手柄调缓动 · 缓动按钮作用于选中关键帧(未选中则作用于全部)</div>
      </Show>
    </div>
  );
}
