// ===== 顶栏：角色切换、导航 =====
import { BaseComponent } from './base';
import { store } from '../core/store';
import type { Role } from '../core/types';

const ROLE_LABEL: Record<Role, string> = {
  coach: '教练', animator: '动画师', director: '团长'
};

export class TopBar extends BaseComponent {
  private view: string;

  constructor() {
    super();
    this.view = 'board';
  }

  setView(v: string) { this.view = v; this.render(); }

  protected render() {
    const user = store.currentUser;
    const opts = store.users().map((u) =>
      `<option value="${u.id}" ${user?.id === u.id ? 'selected' : ''}>${ROLE_LABEL[u.role]} · ${u.name}</option>`
    ).join('');
    this.shell(`
      <header>
        <div class="brand">🎪 绸吊飞人动作编辑器</div>
        <nav>
          <button data-v="board" class="${this.view === 'board' ? 'primary' : ''}">看板</button>
          <button data-v="orders" class="${this.view === 'orders' ? 'primary' : ''}">订单</button>
        </nav>
        <div class="role">
          <span class="small">当前身份</span>
          <select id="roleSel">${opts}</select>
        </div>
      </header>
    `, `
      header { display:flex; align-items:center; gap:18px; padding:0 18px; height:52px;
        background:#22272e; border-bottom:1px solid var(--line); }
      .brand { font-weight:700; font-size:15px; white-space:nowrap; }
      nav { display:flex; gap:8px; flex:1; }
      .role { display:flex; align-items:center; gap:8px; }
      select { width:auto; min-width:150px; }
    `);
    this.$all('nav button').forEach((b) => b.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { view: (b as HTMLElement).dataset.v } }));
    }));
    this.$('#roleSel')!.addEventListener('change', (e) => {
      store.switchUser((e.target as HTMLSelectElement).value);
    });
  }
}
