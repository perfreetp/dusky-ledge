// ===== 应用根：路由与布局 =====
import { BaseComponent } from './base';
import { store } from '../core/store';
import { TopBar } from './top-bar';
import { BoardView } from './board-view';
import { OrdersView } from './orders-view';
import { EditorWorkspace } from '../editor/editor-workspace';

export class AppRoot extends BaseComponent {
  private view: 'board' | 'orders' | 'editor' = 'board';
  private editorProjectId: string | null = null;
  private editorReadonly = false;
  private topBar: TopBar | null = null;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('navigate', this.onNavigate);
    window.addEventListener('open-project', this.onOpenProject);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('navigate', this.onNavigate);
    window.removeEventListener('open-project', this.onOpenProject);
  }

  private onNavigate = (e: Event) => {
    const detail = (e as CustomEvent).detail as { view: string };
    this.view = detail.view === 'board' ? 'board' : 'orders';
    this.render();
  };

  private onOpenProject = (e: Event) => {
    const detail = (e as CustomEvent).detail as { projectId: string; readonly: boolean };
    this.editorProjectId = detail.projectId;
    this.editorReadonly = detail.readonly;
    this.view = 'editor';
    this.render();
  };

  protected render() {
    if (!store.currentUser) {
      this.shell(`
        <div class="login">
          <div class="login-card">
            <h1>🎪 绸吊飞人动作教学系统</h1>
            <p class="small">三维角色骨骼动画编辑器 · 请选择身份进入</p>
            <div id="users" class="col"></div>
          </div>
        </div>
      `, `
        .login { height:100vh; display:flex; align-items:center; justify-content:center;
          background:radial-gradient(circle at 50% 30%, #2b333e, #1a1e24); }
        .login-card { background:var(--panel); border:1px solid var(--line); border-radius:14px;
          padding:36px 40px; width:min(440px,92vw); text-align:center; }
        .login-card h1 { font-size:20px; margin-bottom:8px; }
        #users { margin-top:22px; gap:10px; }
        #users button { padding:12px; font-size:14px; }
      `);
      const roleLabel: Record<string, string> = { coach: '教练', animator: '动画师', director: '团长' };
      const box = this.$('#users')!;
      store.users().forEach((u) => {
        const b = document.createElement('button');
        b.textContent = `${roleLabel[u.role]} · ${u.name}`;
        b.addEventListener('click', () => { store.switchUser(u.id); });
        box.appendChild(b);
      });
      return;
    }

    this.shell(`
      <div class="app">
        <top-bar></top-bar>
        <main id="content" class="content"></main>
      </div>
    `, `
      .app { display:flex; flex-direction:column; height:100vh; }
      .content { flex:1; min-height:0; }
    `);

    this.topBar = this.root.querySelector('top-bar') as TopBar;
    customElements.whenDefined('top-bar').then(() => this.topBar?.setView(this.view));
    const content = this.$('#content')!;
    content.innerHTML = '';

    if (this.view === 'board') {
      content.appendChild(document.createElement('board-view'));
    } else if (this.view === 'orders') {
      content.appendChild(document.createElement('orders-view'));
    } else if (this.view === 'editor' && this.editorProjectId) {
      const ws = document.createElement('editor-workspace') as EditorWorkspace;
      content.appendChild(ws);
      customElements.whenDefined('editor-workspace').then(() => ws.init(this.editorProjectId!, this.editorReadonly));
    }
  }
}
