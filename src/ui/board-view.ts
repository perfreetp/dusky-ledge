// ===== 看板：只看各人完成量与返工次数 =====
import { BaseComponent } from './base';
import { store } from '../core/store';
import type { User } from '../core/types';

export class BoardView extends BaseComponent {
  protected render() {
    const animators = store.users('animator');
    const orders = store.orders();
    const rows = animators.map((u) => {
      const mine = orders.filter((o) => o.assigneeId === u.id);
      const done = mine.filter((o) => o.status === 'approved').length;
      const rework = mine.reduce((s, o) => s + o.reworkCount, 0);
      const active = mine.filter((o) => ['assigned', 'in_progress', 'submitted', 'rejected'].includes(o.status)).length;
      return { user: u, done, rework, active, total: mine.length };
    });
    const maxDone = Math.max(1, ...rows.map((r) => r.done));
    const maxRework = Math.max(1, ...rows.map((r) => r.rework));

    this.shell(`
      <div class="wrap scroll">
        <h2>团队看板</h2>
        <p class="small">仅统计各人完成量与返工次数，不展示订单细节</p>
        <div class="cards">
          ${rows.map((r) => `
            <div class="card">
              <div class="head">
                <strong>${r.user.name}</strong>
                <span class="tag">${r.active} 单进行中</span>
              </div>
              <div class="metric done">
                <span class="num">${r.done}</span><span class="lbl">完成量</span>
                <div class="bar"><i style="width:${(r.done / maxDone) * 100}%"></i></div>
              </div>
              <div class="metric rework">
                <span class="num">${r.rework}</span><span class="lbl">返工次数</span>
                <div class="bar"><i style="width:${(r.rework / maxRework) * 100}%"></i></div>
              </div>
              <div class="small">累计接单 ${r.total} · 已通过 ${r.done}</div>
            </div>
          `).join('')}
        </div>
        <hr>
        <h3>整体汇总</h3>
        <div class="summary">
          <div>完成总量 <b>${rows.reduce((s, r) => s + r.done, 0)}</b></div>
          <div>返工总次数 <b class="rw">${rows.reduce((s, r) => s + r.rework, 0)}</b></div>
          <div>在制订单 <b>${rows.reduce((s, r) => s + r.active, 0)}</b></div>
        </div>
      </div>
    `, `
      .wrap { padding:22px; height:100%; }
      .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; margin-top:16px; }
      .card { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:16px; display:flex; flex-direction:column; gap:12px; }
      .head { display:flex; justify-content:space-between; align-items:center; }
      .metric { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
      .num { font-size:26px; font-weight:700; min-width:42px; }
      .done .num { color:var(--accent2); }
      .rework .num { color:var(--danger); }
      .lbl { color:var(--muted); font-size:12px; }
      .bar { flex-basis:100%; height:7px; background:var(--panel2); border-radius:99px; overflow:hidden; }
      .bar i { display:block; height:100%; border-radius:99px; background:var(--accent); }
      .rework .bar i { background:var(--danger); }
      .summary { display:flex; gap:30px; margin-top:10px; font-size:14px; color:var(--muted); }
      .summary b { color:var(--text); font-size:18px; margin-left:6px; }
      .summary .rw { color:var(--danger); }
    `);
  }
}
