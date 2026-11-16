import { actions, state } from '../state/store';

import { css } from '../ui/style';
/** 步道编辑辅助卡片：列出手动锚点、支持清空回到自动布线。 */
export default function TrailEditor(props: { visible: boolean }) {
  return (
    <div
      class="overlay-card"
      style={css({
        left: 12,
        bottom: 12,
        width: 250,
        display: props.visible ? 'block' : 'none',
      })}    >
      <div class="section-title" style={css({ margin: '0 0 6px' })}>
        步道手动改点
      </div>
      <p class="muted" style={css({ margin: '0 0 8px', 'font-size': 11 })}>
        在步道面上点击即可添加控制点并拖拽改线。锚点按里程保存，参数微调重新生成后自动保留。
      </p>
      <div class="muted">当前手动锚点：{state.overrides.trail.length} 个</div>
      <div style={css({ 'max-height': 120, overflow: 'auto', margin: '6px 0' })}>
        {state.overrides.trail.map((t, i) => (
          <div class="muted" style={css({ 'font-size': 11 })}>
            #{i + 1} 里程 {(t.s * 100).toFixed(1)}% · 横移 {t.lateral.toFixed(2)}m · 竖移 {t.up.toFixed(2)}m
          </div>
        ))}
      </div>
      <button
        style={css({ width: '100%' })}         disabled={state.overrides.trail.length === 0}
        onClick={() => {
          actions.clearTrailOverrides();
          actions.regenerate();
        }}
      >
        清空改点，恢复自动布线
      </button>
    </div>
  );
}
