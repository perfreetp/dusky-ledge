// ===== 订单工作流视图：教练建单/分派，动画师制作/送审，团长抽查/打回 =====
import { BaseComponent, modal, toast } from './base';
import { store } from '../core/store';
import { STATUS_LABEL, DIFFICULTIES } from './shared';
import { createProject } from '../core/project';
import type { Order } from '../core/types';

export class OrdersView extends BaseComponent {
  protected render() {
    const user = store.currentUser;
    const orders = store.orders();
    this.shell(`
      <div class="wrap scroll">
        <div class="top">
          <h2>订单工作流</h2>
          ${user?.role === 'coach' ? '<button id="newOrder" class="primary">+ 新建动作订单</button>' : ''}
        </div>
        <div class="filters" id="filters"></div>
        <div class="list" id="list"></div>
      </div>
    `, `
      .wrap { padding:22px; height:100%; }
      .top { display:flex; justify-content:space-between; align-items:center; }
      .filters { display:flex; gap:8px; margin:16px 0; flex-wrap:wrap; }
      .filters button.active { background:var(--accent); border-color:var(--accent); color:#fff; }
      .list { display:flex; flex-direction:column; gap:12px; }
      .order { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:16px; }
      .order.rejected { border-color:var(--danger); }
      .order-head { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
      .meta { display:flex; gap:10px; flex-wrap:wrap; margin:10px 0; color:var(--muted); font-size:12px; }
      .points { background:var(--panel2); border-radius:6px; padding:10px; white-space:pre-wrap; line-height:1.6; }
      .actions { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
      .reject-box { background:rgba(239,95,107,.1); border:1px solid var(--danger); border-radius:6px; padding:8px 10px; margin-top:10px; font-size:12px; color:#ffb3b8; }
      .empty { color:var(--muted); padding:40px; text-align:center; }
    `);

    const f = this.$('#filters')!;
    const filters = ['all', 'todo', 'mine'] as const;
    const flabel: Record<string, string> = { all: '全部', todo: '待我处理', mine: '与我相关' };
    let current = (this as unknown as { _filter?: string })._filter ?? 'all';
    f.innerHTML = filters.map((x) =>
      `<button data-f="${x}" class="${x === current ? 'active' : ''}">${flabel[x]}</button>`).join('');
    f.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      current = (b as HTMLElement).dataset.f!;
      (this as unknown as { _filter?: string })._filter = current;
      this.render();
    }));

    const nameOf = (id: string | null) => store.users().find((u) => u.id === id)?.name ?? '—';
    let shown = orders;
    if (current === 'todo') {
      shown = orders.filter((o) => this.todoStatuses().includes(o.status));
    } else if (current === 'mine') {
      shown = orders.filter((o) => o.creatorId === user?.id || o.assigneeId === user?.id);
    }

    const list = this.$('#list')!;
    if (!shown.length) {
      list.innerHTML = '<div class="empty">暂无订单</div>';
    } else {
      list.innerHTML = shown.map((o) => `
        <div class="order ${o.status === 'rejected' ? 'rejected' : ''}" data-id="${o.id}">
          <div class="order-head">
            <div>
              <h3>${o.title}</h3>
              <div class="meta">
                <span class="tag ${o.status}">${STATUS_LABEL[o.status]}</span>
                <span>难度：<b>${o.difficulty}</b></span>
                <span>教练：${nameOf(o.creatorId)}</span>
                <span>动画师：${nameOf(o.assigneeId)}</span>
                <span>返工 <b style="color:var(--danger)">${o.reworkCount}</b> 次</span>
              </div>
            </div>
          </div>
          <div class="points">${o.points}</div>
          ${o.status === 'rejected' ? `<div class="reject-box">打回原因：${o.rejectReason || '（未填写）'}</div>` : ''}
          <div class="actions" data-id="${o.id}"></div>
        </div>
      `).join('');
    }

    this.$('#newOrder')?.addEventListener('click', () => this.openCreate());
    list.querySelectorAll('.order').forEach((card) => {
      const id = (card as HTMLElement).dataset.id!;
      const order = store.orders().find((o) => o.id === id)!;
      const box = card.querySelector('.actions')!;
      this.buildActions(order, box as HTMLElement);
    });
  }

  private todoStatuses(): string[] {
    const role = store.currentUser?.role;
    if (role === 'coach') return ['draft'];
    if (role === 'animator') return ['assigned', 'rejected'];
    if (role === 'director') return ['submitted'];
    return [];
  }

  private buildActions(o: Order, box: HTMLElement) {
    const role = store.currentUser?.role;
    const add = (label: string, cls: string, fn: () => void) => {
      const b = document.createElement('button');
      b.className = cls; b.textContent = label;
      b.addEventListener('click', fn);
      box.appendChild(b);
    };

    if (role === 'coach' && o.status === 'draft') {
      add('分派给动画师', 'primary', () => this.openAssign(o));
      add('删除', 'danger', () => {
        store.deleteOrder(o.id);
      });
    }
    if (role === 'animator' && (o.status === 'assigned' || o.status === 'rejected')) {
      add('进入编辑器制作', 'primary', () => this.enterEditor(o));
    }
    if (role === 'animator' && o.status === 'in_progress') {
      add('打开编辑器', '', () => this.enterEditor(o));
      add('选版本送审', 'success', () => this.openSubmit(o));
    }
    if (role === 'director' && o.status === 'submitted') {
      add('通过归档', 'success', () => { store.approveOrder(o.id); toast('抽查通过，已归档', 'ok'); });
      add('打回返工', 'danger', () => this.openReject(o));
    }
    if (role === 'director' && o.status === 'approved') {
      add('查看项目（只读）', 'ghost', () => {
        if (o.projectId) window.dispatchEvent(new CustomEvent('open-project', { detail: { projectId: o.projectId, readonly: true } }));
      });
    }
    if (role === 'coach' && o.projectId && o.status !== 'draft') {
      add('查看项目', 'ghost', () =>
        window.dispatchEvent(new CustomEvent('open-project', { detail: { projectId: o.projectId, readonly: true } })));
    }
  }

  private openCreate() {
    const m = modal('新建动作订单', `
      <div class="col">
        <div><label>动作名称</label><input id="t" placeholder="例如：绸吊单腿倒挂接转体"></div>
        <div><label>难度等级</label><select id="d">${DIFFICULTIES.map((d) => `<option>${d}</option>`).join('')}</select></div>
        <div><label>动作要点</label><textarea id="p" rows="6" placeholder="起势、空中姿态、衔接、落地要求、安全注意事项…"></textarea></div>
        <div class="row" style="justify-content:flex-end"><button id="cancel">取消</button><button id="ok" class="primary">创建</button></div>
      </div>`);
    m.root.querySelector('#cancel')!.addEventListener('click', m.close);
    m.root.querySelector('#ok')!.addEventListener('click', () => {
      const title = (m.root.querySelector('#t') as HTMLInputElement).value.trim();
      const points = (m.root.querySelector('#p') as HTMLTextAreaElement).value.trim();
      const difficulty = (m.root.querySelector('#d') as HTMLSelectElement).value as Order['difficulty'];
      if (!title || !points) { toast('名称和动作要点必填', 'err'); return; }
      store.createOrder(title, points, difficulty);
      m.close();
      toast('订单已创建，待分派', 'ok');
    });
  }

  private openAssign(o: Order) {
    const animators = store.users('animator');
    const m = modal(`分派订单 · ${o.title}`, `
      <div class="col">
        <div><label>选择动画师</label>
          <select id="a">${animators.map((u) => `<option value="${u.id}">${u.name}</option>`).join('')}</select>
        </div>
        <div class="row" style="justify-content:flex-end"><button id="cancel">取消</button><button id="ok" class="primary">确认分派并建项目</button></div>
      </div>`);
    m.root.querySelector('#cancel')!.addEventListener('click', m.close);
    m.root.querySelector('#ok')!.addEventListener('click', () => {
      const assigneeId = (m.root.querySelector('#a') as HTMLSelectElement).value;
      const project = createProject(o.title, o.id);
      store.saveProject(project);
      store.assignOrder(o.id, assigneeId, project.id);
      m.close();
      toast(`已分派给 ${animators.find((u) => u.id === assigneeId)?.name}，项目已创建`, 'ok');
    });
  }

  private enterEditor(o: Order) {
    let projectId = o.projectId;
    if (!projectId) {
      const p = createProject(o.title, o.id);
      store.saveProject(p);
      projectId = p.id;
      store.updateOrder(o.id, { projectId: p.id });
    }
    if (o.status === 'assigned' || o.status === 'rejected') {
      store.setOrderStatus(o.id, 'in_progress');
    }
    window.dispatchEvent(new CustomEvent('open-project', { detail: { projectId, readonly: false } }));
  }

  private openSubmit(o: Order) {
    const project = o.projectId ? store.getProject(o.projectId) : null;
    if (!project || !project.versions.length) { toast('项目里还没有动作版本，无法送审', 'err'); return; }
    const m = modal('选择送审版本', `
      <div class="col">
        <div class="small">送审后当前版本将锁定，团长抽查不合格会累计一次返工。</div>
        <select id="v" size="5" style="height:auto">
          ${project.versions.map((v) =>
            `<option value="${v.id}" ${v.id === project.activeVersionId ? 'selected' : ''}>${v.label} · ${new Date(v.createdAt).toLocaleString()} · ${v.exports.length ? v.exports[v.exports.length - 1].frameCount + '帧已导出' : '未导出'}</option>`
          ).join('')}
        </select>
        <div class="row" style="justify-content:flex-end"><button id="cancel">取消</button><button id="ok" class="success">确认送审</button></div>
      </div>`);
    m.root.querySelector('#cancel')!.addEventListener('click', m.close);
    m.root.querySelector('#ok')!.addEventListener('click', () => {
      const vid = (m.root.querySelector('#v') as HTMLSelectElement).value;
      project.versions.forEach((v) => (v.submittedForReview = v.id === vid));
      store.setActiveVersion(project.id, vid);
      store.setOrderStatus(o.id, 'submitted');
      m.close();
      toast('已送审，等待团长抽查', 'ok');
    });
  }

  private openReject(o: Order) {
    const m = modal(`打回订单 · ${o.title}`, `
      <div class="col">
        <div><label>不合格原因（动画师可见）</label>
          <textarea id="r" rows="5" placeholder="例如：第 36 帧脚底穿地、转体缓动不自然、绸吊抓握姿态要点未体现…"></textarea></div>
        <div class="row" style="justify-content:flex-end"><button id="cancel">取消</button><button id="ok" class="danger">确认打回</button></div>
      </div>`);
    m.root.querySelector('#cancel')!.addEventListener('click', m.close);
    m.root.querySelector('#ok')!.addEventListener('click', () => {
      const reason = (m.root.querySelector('#r') as HTMLTextAreaElement).value.trim();
      if (!reason) { toast('请填写打回原因', 'err'); return; }
      store.rejectOrder(o.id, reason);
      m.close();
      toast('已打回，返工次数 +1', 'ok');
    });
  }
}
