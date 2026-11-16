import type { LayerId } from '../core/types';
import { LAYER_META, LAYER_ORDER } from '../core/types';

interface Props {
  enabled: Record<LayerId, boolean>;
  solo: LayerId | null;
  onToggle: (id: LayerId) => void;
  onSolo: (id: LayerId | null) => void;
}

export function LayerPanel({ enabled, solo, onToggle, onSolo }: Props) {
  return (
    <div className="panel">
      <div className="panel-title">图层控制</div>
      <div className="layer-list">
        {LAYER_ORDER.map((id) => {
          const meta = LAYER_META[id];
          const isOn = solo ? solo === id : enabled[id];
          return (
            <div key={id} className={`layer-row ${isOn ? '' : 'off'} ${solo === id ? 'solo' : ''}`}>
              <label className="layer-check">
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={solo !== null && solo !== id}
                  onChange={() => onToggle(id)}
                />
                <span className="layer-swatch" style={{ background: meta.color }} />
                <span className="layer-name">{meta.name}</span>
              </label>
              <button
                className={`solo-btn ${solo === id ? 'active' : ''}`}
                title="单层独显 / 恢复"
                onClick={() => onSolo(solo === id ? null : id)}
              >
                独
              </button>
            </div>
          );
        })}
      </div>
      {solo && (
        <button className="btn ghost full" onClick={() => onSolo(null)}>
          退出单层独显
        </button>
      )}
      <div className="panel-tip">支护与螺栓在视距超过 420 m 时自动降级为简模，拉近自动补回。</div>
    </div>
  );
}
