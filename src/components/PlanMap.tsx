import { createMemo, createSignal } from 'solid-js';
import { actions, state } from '../state/store';

import { css } from '../ui/style';
const W = 250;
const H = 250;
const PAD = 18;

/** 俯视平面图：x/z 平面内增删拖拽控制点，选中点的高程单独调。 */
export default function PlanMap() {
  const [selected, setSelected] = createSignal(0);
  const [drag, setDrag] = createSignal<number | null>(null);
  const [svgEl, setSvgEl] = createSignal<SVGSVGElement | null>(null);

  const bounds = createMemo(() => {
    const pts = state.params.controlPoints;
    const xs = pts.map((p) => p.x);
    const zs = pts.map((p) => p.z);
    return {
      minX: Math.min(...xs) - 6,
      maxX: Math.max(...xs) + 6,
      minZ: Math.min(...zs) - 6,
      maxZ: Math.max(...zs) + 6,
    };
  });

  const toSvg = (x: number, z: number): [number, number] => {
    const b = bounds();
    const sx = (W - PAD * 2) / (b.maxX - b.minX);
    const sy = (H - PAD * 2) / (b.maxZ - b.minZ);
    const s = Math.min(sx, sy);
    return [PAD + (x - b.minX) * s, PAD + (z - b.minZ) * s];
  };

  const toWorld = (cx: number, cy: number): [number, number] => {
    const b = bounds();
    const sx = (W - PAD * 2) / (b.maxX - b.minX);
    const sy = (H - PAD * 2) / (b.maxZ - b.minZ);
    const s = Math.min(sx, sy);
    return [b.minX + (cx - PAD) / s, b.minZ + (cy - PAD) / s];
  };

  const onPointerMove = (e: PointerEvent) => {
    const idx = drag();
    const svg = svgEl();
    if (idx === null || !svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * W;
    const cy = ((e.clientY - rect.top) / rect.height) * H;
    const [x, z] = toWorld(cx, cy);
    actions.updateControlPoint(idx, { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 });
  };

  const polyline = createMemo(() =>
    state.params.controlPoints.map((p) => toSvg(p.x, p.z).map((n) => n.toFixed(1)).join(',')).join(' '),
  );

  return (
    <div>
      <svg
        ref={setSvgEl}
        viewBox={`0 0 ${W} ${H}`}
        style={css({ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', 'border-radius': 6 })}         onPointerMove={onPointerMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        <polyline points={polyline()} fill="none" stroke="var(--accent-2)" stroke-width={2} />
        {state.params.controlPoints.map((p, i) => {
          const [cx, cy] = toSvg(p.x, p.z);
          return (
            <g>
              <circle
                cx={cx}
                cy={cy}
                r={selected() === i ? 7 : 5}
                fill={selected() === i ? 'var(--accent)' : 'var(--panel-2)'}
                stroke="var(--text)"
                stroke-width={1}
                style={css({ cursor: 'grab' })}                 onPointerDown={(e) => {
                  e.preventDefault();
                  setSelected(i);
                  setDrag(i);
                }}
              />
              <text x={cx + 9} y={cy + 3} fill="var(--text-dim)" font-size="9">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div class="row" style={css({ margin: '8px 0' })}>
        <button onClick={() => actions.addControlPoint()}>加控制点</button>
        <button onClick={() => actions.removeControlPoint(selected())}>删选中点</button>
      </div>
      <div class="field">
        <label>
          选中点 {selected() + 1} 高程 y = {state.params.controlPoints[selected()]?.y.toFixed(1)} m
        </label>
        <input
          type="range"
          min={-5}
          max={10}
          step={0.1}
          value={state.params.controlPoints[selected()]?.y ?? 0}
          onInput={(e) => actions.updateControlPoint(selected(), { y: Number(e.currentTarget.value) })}
        />
      </div>
    </div>
  );
}
