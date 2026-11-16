import { actions, state } from '../state/store';

import { css } from '../ui/style';
/** 对比模式浮层：提示左右版本与相机联动开关，退出回到工作视口。 */
export default function CompareOverlay() {
  const left = () => state.versions.find((v) => v.id === state.compare.leftVersionId);
  const right = () => state.versions.find((v) => v.id === state.compare.rightVersionId);

  return (
    <div class="overlay-card" style={css({ top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, 'align-items': 'center' })}>
      <strong style={css({ color: 'var(--accent-2)' })}>{left()?.label ?? '左版本'}</strong>
      <span class="muted">⇄</span>
      <strong style={css({ color: 'var(--accent)' })}>{right()?.label ?? '右版本'}</strong>
      <label class="checkline" style={css({ margin: 0 })}>
        <input
          type="checkbox"
          checked={state.compare.linkedCamera}
          onChange={() => actions.toggleLinkedCamera()}
        />
        相机联动
      </label>
      <button onClick={() => actions.closeCompare()}>退出对比</button>
    </div>
  );
}
