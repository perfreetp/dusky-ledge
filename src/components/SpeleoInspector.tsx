import { actions, currentResult, state } from '../state/store';
import { SPELEO_TIERS } from '../core/geometry';

import { css } from '../ui/style';
/** 单株钟乳石检查器：拾取后显示属性，执行替换/删除/恢复。 */
export default function SpeleoInspector() {
  const selected = () => {
    const result = currentResult();
    if (!result || !state.selectedSpeleoId) return null;
    return result.speleo.instances.find((i) => i.id === state.selectedSpeleoId) ?? null;
  };

  return (
    <div
      class="overlay-card"
      style={css({ right: 12, top: 12, width: 230, display: selected() ? 'block' : 'none' })}    >
      {selected() && (
        <>
          <div class="section-title" style={css({ margin: '0 0 6px' })}>
            钟乳石 · 单株编辑
          </div>
          <div class="muted" style={css({ 'font-size': 11, 'word-break': 'break-all' })}>
            id: {selected()!.id}
          </div>
          <div style={css({ margin: '6px 0' })}>
            <span class={`tag ${SPELEO_TIERS[selected()!.tierIndex]!.key}`}>
              {SPELEO_TIERS[selected()!.tierIndex]!.label}
            </span>
          </div>
          <div>高度：{selected()!.height.toFixed(2)} m</div>
          <div>根部半径：{selected()!.radius.toFixed(2)} m</div>
          <div class="muted" style={css({ 'font-size': 11, margin: '4px 0 8px' })}>
            替换只改变该株形态，布点/档位/尺寸及其它钟乳石均不变。
          </div>
          <div class="row">
            <button class="primary" onClick={() => actions.replaceSpeleo(selected()!.id)}>
              替换形态
            </button>
            <button
              onClick={() => actions.deleteSpeleo(selected()!.id)}
              style={css({ color: 'var(--danger)' })}            >
              删除
            </button>
          </div>
          <button style={css({ width: '100%', 'margin-top': 6 })}  onClick={() => actions.selectSpeleo(null)}>
            取消选择
          </button>
        </>
      )}
    </div>
  );
}
