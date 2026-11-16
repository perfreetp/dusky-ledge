import { createSignal } from 'solid-js';
import { eduStore } from '../store/education';
import type { AssignmentSpec, BoolOp } from '../core/types';

export default function AssignmentModal(props: { onClose: () => void }) {
  const [title, setTitle] = createSignal('阶梯轴布尔建模练习');
  const [description, setDescription] = createSignal(
    '使用长方体与圆柱，通过并集与差集完成带孔阶梯块；剖切后输出三视图。',
  );
  const [targetVolume, setTargetVolume] = createSignal(40000);
  const [tolerance, setTolerance] = createSignal(0.05);
  const [requireThreeViews, setRequireThreeViews] = createSignal(true);
  const [minFeatures, setMinFeatures] = createSignal(2);
  const [ops, setOps] = createSignal<BoolOp[]>(['add', 'subtract']);

  const toggleOp = (op: BoolOp) => {
    setOps((arr) => (arr.includes(op) ? arr.filter((x) => x !== op) : [...arr, op]));
  };

  const submit = () => {
    if (!title().trim()) return;
    const spec: Omit<AssignmentSpec, 'id' | 'createdAt'> = {
      title: title().trim(),
      description: description().trim(),
      targetVolume: Math.max(0, targetVolume()),
      volumeTolerance: Math.min(1, Math.max(0.001, tolerance())),
      requireThreeViews: requireThreeViews(),
      requiredOps: ops(),
      minFeatures: Math.max(1, minFeatures()),
    };
    eduStore.createAssignment(spec);
    props.onClose();
  };

  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div class="modal">
        <h2>布置新作业（尺寸要求）</h2>
        <label class="field">
          <span>作业标题</span>
          <input value={title()} onInput={(e) => setTitle(e.currentTarget.value)} />
        </label>
        <label class="field">
          <span>作业说明</span>
          <textarea rows="3" value={description()} onInput={(e) => setDescription(e.currentTarget.value)} />
        </label>
        <div class="dim-grid">
          <label class="field">
            <span>目标体积 (mm³)</span>
            <input type="number" value={targetVolume()} onInput={(e) => setTargetVolume(parseFloat(e.currentTarget.value) || 0)} />
          </label>
          <label class="field">
            <span>体积允许偏差（相对）</span>
            <input
              type="number"
              step="0.01"
              min="0.001"
              max="1"
              value={tolerance()}
              onInput={(e) => setTolerance(parseFloat(e.currentTarget.value) || 0.05)}
            />
          </label>
          <label class="field">
            <span>最少体块数量</span>
            <input type="number" min="1" value={minFeatures()} onInput={(e) => setMinFeatures(parseInt(e.currentTarget.value) || 1)} />
          </label>
          <label class="field">
            <span>要求三视图</span>
            <select value={requireThreeViews() ? '1' : '0'} onChange={(e) => setRequireThreeViews(e.currentTarget.value === '1')}>
              <option value="1">是（主/俯/左）</option>
              <option value="0">否</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span>要求使用的布尔运算</span>
          <div class="row">
            {(['add', 'subtract', 'intersect'] as BoolOp[]).map((op) => (
              <button
                classList={{ toggled: ops().includes(op) }}
                onClick={() => toggleOp(op)}
                type="button"
              >
                {op === 'add' ? '并集' : op === 'subtract' ? '差集' : '交集'}
              </button>
            ))}
          </div>
        </label>
        <div class="actions">
          <button onClick={props.onClose}>取消</button>
          <button class="primary" onClick={submit}>发布作业</button>
        </div>
      </div>
    </div>
  );
}
