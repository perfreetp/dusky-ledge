import { actions, state } from '../state/store';

import { css } from '../ui/style';
export default function Toolbar(props: { onExport: () => void; onImport: () => void }) {
  return (
    <div
      style={css({
        display: 'flex',
        'align-items': 'center',
        gap: 12,
        padding: '0 14px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
      })}    >
      <strong style={css({ color: 'var(--accent)' })}>喀斯特溶洞设计工作台</strong>
      <span class="muted">Karst Cave Studio</span>
      <div style={css({ flex: 1 })}/>
      <div class="row" style={css({ flex: 'none' })}>
        <span class="muted">角色</span>
        <button
          classList={{ 'pill-role': true, active: state.role === 'reviewer' }}
          onClick={() => actions.setRole('reviewer')}
        >
          审核人
        </button>
        <button
          classList={{ 'pill-role': true, active: state.role === 'maker' }}
          onClick={() => actions.setRole('maker')}
        >
          制作方
        </button>
      </div>
      <button class="primary" onClick={() => actions.regenerate()} disabled={state.generating}>
        {state.dirty ? '重新生成 *' : '生成'}
      </button>
      <button onClick={() => actions.commitVersion(`v${state.versions.length + 1}`)}>提交新版本</button>
      <button onClick={props.onExport}>导出备份</button>
      <button onClick={props.onImport}>导入备份</button>
    </div>
  );
}
