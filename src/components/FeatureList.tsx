import { modelStore } from '../store/model';
import type { BoolOp, Feature } from '../core/types';

const OP_LABEL: Record<BoolOp, string> = {
  add: '并集',
  subtract: '差集',
  intersect: '交集',
};

export default function FeatureList() {
  const { model, selectedFeatureId, setSelectedFeatureId } = modelStore;

  const changeOp = (f: Feature, op: BoolOp) => {
    modelStore.updateFeature(f.id, { op });
  };

  return (
    <div>
      {model.features.length === 0 && <p class="muted">尚无体块，从上方拖入第一个体块开始建模。</p>}
      {model.features.map((f, i) => (
        <div
          classList={{ 'feature-row': true, selected: selectedFeatureId() === f.id }}
          onClick={() => setSelectedFeatureId(f.id)}
        >
          <div style={{ flex: 1, 'min-width': 0 }}>
            <div class="fname">
              {i + 1}. {f.name}
            </div>
            {i === 0 ? (
              <span class="op-badge add">基体</span>
            ) : (
              <select
                value={f.op}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => changeOp(f, e.currentTarget.value as BoolOp)}
                style={{ width: '86px', 'margin-top': '3px', padding: '2px 4px', 'font-size': '12px' }}
              >
                <option value="add">{OP_LABEL.add}</option>
                <option value="subtract">{OP_LABEL.subtract}</option>
                <option value="intersect">{OP_LABEL.intersect}</option>
              </select>
            )}
          </div>
          <button
            class="danger"
            title="删除该特征"
            onClick={(e) => {
              e.stopPropagation();
              modelStore.removeFeature(f.id);
            }}
          >
            删除
          </button>
        </div>
      ))}
    </div>
  );
}
