import { actions, currentResult, state } from '../state/store';
import { ringPoint } from '../core/tunnel';
import { v3 } from '../core/vec';

import { css } from '../ui/style';
/** 剖切：沿里程移动剖切平面，并在 2D 小窗画该站断面环/步道/附近石尖。 */
export default function SectionView() {
  const result = () => currentResult();
  const stationCount = () => result()?.stations.length ?? 1;

  return (
    <>
      <div class="section-title">剖切视图（沿里程断面）</div>
      <div class="checkline">
        <input
          type="checkbox"
          checked={state.section.enabled}
          onChange={(e) => actions.setSection(e.currentTarget.checked)}
          id="section-en"
        />
        <label for="section-en" style={css({ margin: 0 })}>
          启用剖切平面
        </label>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, stationCount() - 1)}
        step={1}
        value={Math.min(state.section.stationIndex, stationCount() - 1)}
        disabled={!state.section.enabled}
        onInput={(e) => actions.setSection(state.section.enabled, Number(e.currentTarget.value))}
      />
      <SectionCanvas />
    </>
  );
}

function SectionCanvas() {
  const result = () => currentResult();
  if (!result()) return <p class="muted">生成后显示断面。</p>;
  const idx = Math.min(state.section.stationIndex, result()!.stations.length - 1);
  const st = result()!.stations[idx]!;
  const W = 250;
  const H = 180;
  // 断面局部坐标（right/up 张成的平面）→ SVG，统一缩放
  const local = (world: [number, number, number]): [number, number] => {
    const d = v3.sub(world, st.center);
    return [v3.dot(d, st.right), v3.dot(d, st.up)];
  };
  const span = Math.max(state.params.tunnelWidth, state.params.tunnelHeight) * 0.75;
  const scale = Math.min(W, H) / 2 / span;
  const cx = W / 2;
  const cy = H / 2;
  // 与 tunnel.ts 同一 ringPoint 函数重建断面环，保证与三维洞体一致
  const ringPts: [number, number][] = [];
  const M = state.params.ringSegments;
  for (let j = 0; j <= M; j++) {
    const world = ringPoint(st, (j / M) * Math.PI * 2, state.params, state.seed);
    const [lx, ly] = local(world);
    ringPts.push([cx + lx * scale, cy - ly * scale]);
  }
  const floorLocalY = st.floorY - st.center[1];
  const nearby = result()!.speleo.instances.filter((ins) => {
    const dx = ins.root[0] - st.center[0];
    const dz = ins.root[2] - st.center[2];
    return dx * dx + dz * dz < 4;
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={css({ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', 'border-radius': 6, 'margin-top': 6 })}    >
      <polyline points={ringPts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--accent-2)" stroke-width={1.5} />
      {/* 步道带（位于压平洞底） */}
      <rect
        x={cx - (state.params.trailWidth / 2) * scale}
        y={cy - floorLocalY * scale - 5}
        width={state.params.trailWidth * scale}
        height={5}
        fill="var(--accent)"
        opacity={0.85}
      />
      {/* 2.2m 净空线 */}
      <line
        x1={cx - (state.params.trailWidth / 2 + 0.3) * scale}
        x2={cx + (state.params.trailWidth / 2 + 0.3) * scale}
        y1={cy - (floorLocalY + 2.2) * scale - 5}
        y2={cy - (floorLocalY + 2.2) * scale - 5}
        stroke="var(--danger)"
        stroke-dasharray="4 3"
        stroke-width={1}
      />
      {nearby.map((ins) => {
        const [rx, ry] = local(ins.root);
        const tip = v3.add(ins.root, v3.scale(ins.axis, ins.height));
        const [tx, ty] = local(tip);
        return (
          <line
            x1={cx + rx * scale}
            y1={cy - ry * scale}
            x2={cx + tx * scale}
            y2={cy - ty * scale}
            stroke="#e0c39a"
            stroke-width={Math.max(1, ins.radius * scale)}
          />
        );
      })}
    </svg>
  );
}
