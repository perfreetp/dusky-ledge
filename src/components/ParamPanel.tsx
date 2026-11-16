import { actions, state } from '../state/store';
import PlanMap from './PlanMap';
import LayerPanel from './LayerPanel';
import SectionView from './SectionView';

import { css } from '../ui/style';
export default function ParamPanel() {
  const p = () => state.params;
  return (
    <div class="panel">
      <div class="section-title">种子（确定性）</div>
      <div class="row">
        <input
          type="number"
          value={state.seed}
          onInput={(e) => actions.setSeed(Number(e.currentTarget.value) >>> 0)}
        />
        <button style={css({ flex: 'none' })}  onClick={() => actions.reseed()}>
          换一个
        </button>
      </div>
      <p class="muted" style={css({ 'font-size': 11, 'margin-top': 4 })}>
        同种子 + 同参数 + 同覆盖数据，生成结果字节级一致。
      </p>

      <div class="section-title">断面尺寸与滴水</div>
      <div class="field">
        <label>洞道宽度 {p().tunnelWidth.toFixed(1)} m</label>
        <input
          type="range"
          min={3}
          max={12}
          step={0.1}
          value={p().tunnelWidth}
          onInput={(e) => actions.updateParams({ tunnelWidth: Number(e.currentTarget.value) })}
        />
      </div>
      <div class="field">
        <label>洞道高度 {p().tunnelHeight.toFixed(1)} m</label>
        <input
          type="range"
          min={2.5}
          max={8}
          step={0.1}
          value={p().tunnelHeight}
          onInput={(e) => actions.updateParams({ tunnelHeight: Number(e.currentTarget.value) })}
        />
      </div>
      <div class="field">
        <label>滴水密度 {(p().dripDensity * 100).toFixed(0)}%</label>
        <input
          type="range"
          min={0.02}
          max={1}
          step={0.01}
          value={p().dripDensity}
          onInput={(e) => actions.updateParams({ dripDensity: Number(e.currentTarget.value) })}
        />
      </div>
      <div class="field">
        <label>步道净宽 {p().trailWidth.toFixed(1)} m（净空 2.2m 自动避让）</label>
        <input
          type="range"
          min={0.8}
          max={3}
          step={0.1}
          value={p().trailWidth}
          onInput={(e) => actions.updateParams({ trailWidth: Number(e.currentTarget.value) })}
        />
      </div>
      <div class="row">
        <div class="field">
          <label>环顶点数</label>
          <input
            type="number"
            min={12}
            max={48}
            step={4}
            value={p().ringSegments}
            onInput={(e) => actions.updateParams({ ringSegments: Number(e.currentTarget.value) })}
          />
        </div>
        <div class="field">
          <label>站间距 (m)</label>
          <input
            type="number"
            min={0.6}
            max={3}
            step={0.1}
            value={p().stationStep}
            onInput={(e) => actions.updateParams({ stationStep: Number(e.currentTarget.value) })}
          />
        </div>
      </div>

      <div class="section-title">洞道走向（俯视平面图）</div>
      <PlanMap />

      <LayerPanel />
      <SectionView />
    </div>
  );
}
