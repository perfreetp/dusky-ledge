import { state } from '../state/store';
import { SPELEO_TIERS } from '../core/geometry';

/** 角落 HUD：洞体面数、单次生成耗时、钟乳石统计。 */
export default function Hud() {
  return (
    <div class="hud">
      <div>
        洞体面数：<b>{state.stats ? state.stats.tunnelTris.toLocaleString() : '—'}</b> triangles
      </div>
      <div>
        单次生成耗时：<b>{state.stats ? `${state.stats.elapsedMs.toFixed(2)} ms` : '—'}</b>
      </div>
      <div>
        钟乳石：<b>{state.stats?.speleoCount ?? 0}</b> 株
        {state.stats && (
          <span class="muted">
            {' '}
           （{SPELEO_TIERS.map((t, i) => `${t.label.split(' ')[0]} ${state.stats!.speleoByTier[i]}`).join(' / ')}）
          </span>
        )}
      </div>
      {state.stats && state.stats.rejectedByClearance > 0 && (
        <div class="muted">净空避让剔除：{state.stats.rejectedByClearance} 株</div>
      )}
    </div>
  );
}
