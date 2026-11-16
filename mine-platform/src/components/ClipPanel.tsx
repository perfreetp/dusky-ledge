import type { ClipPlane } from '../renderer/WebGPURenderer';
import type { MineDataset, Vec3 } from '../core/types';

interface Props {
  enabled: boolean;
  progress: number; // 0~1 沿整体走向
  axis: 'x' | 'y' | 'z';
  datasets: MineDataset[];
  onToggle: (v: boolean) => void;
  onProgress: (v: number) => void;
  onAxis: (a: 'x' | 'y' | 'z') => void;
  plane: ClipPlane;
}

export function ClipPanel(props: Props) {
  const bounds = props.datasets.reduce(
    (acc, ds) => {
      for (let i = 0; i < 3; i++) {
        acc.min[i] = Math.min(acc.min[i], ds.bounds.min[i]);
        acc.max[i] = Math.max(acc.max[i], ds.bounds.max[i]);
      }
      return acc;
    },
    { min: [Infinity, Infinity, Infinity] as Vec3, max: [-Infinity, -Infinity, -Infinity] as Vec3 },
  );
  const axisIdx = { x: 0, y: 1, z: 2 }[props.axis];
  const pos = bounds.min[axisIdx] + (bounds.max[axisIdx] - bounds.min[axisIdx]) * props.progress;

  return (
    <div className="panel">
      <div className="panel-title">
        剖切面
        <label className="switch">
          <input type="checkbox" checked={props.enabled} onChange={(e) => props.onToggle(e.target.checked)} />
          <span className="slider" />
        </label>
      </div>
      <div className="clip-axis">
        {(['x', 'y', 'z'] as const).map((a) => (
          <button
            key={a}
            className={`seg-btn ${props.axis === a ? 'active' : ''}`}
            onClick={() => props.onAxis(a)}
          >
            {a.toUpperCase()} 轴{ a === 'z' ? '（水平剖切）' : '（竖直剖切）'}
          </button>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(props.progress * 1000)}
        disabled={!props.enabled}
        onChange={(e) => props.onProgress(Number(e.target.value) / 1000)}
      />
      <div className="clip-readout">
        切面 {props.axis.toUpperCase()} = <b>{pos.toFixed(1)} m</b>
        <div className="panel-tip">
          法向 [{props.plane.normal.map((n) => n.toFixed(1)).join(', ')}]，保留法向正侧，拖动滑块沿走向查看巷道内部支护与管线。
        </div>
      </div>
    </div>
  );
}
