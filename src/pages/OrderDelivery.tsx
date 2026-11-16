import { createSignal, For, Show } from 'solid-js';
import type { GateType, Order } from '../types';
import { GATE_TYPES, MATERIAL_LABELS } from '../types';
import { appStore, type Role } from '../store/appStore';
import { editorStore } from '../store/editorStore';
import { setTab } from '../store/nav';
import { buildPattern } from '../geometry/boolean';
import { downloadText, patternToSvg } from '../geometry/svg';

const ROLES: Role[] = ['客户', '制作员', '主管'];

function todayPlus(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

export default function OrderDelivery() {
  const { state, actions } = appStore;
  const role = () => state.role;

  // 客户下单表单
  const [customer, setCustomer] = createSignal('');
  const [gateType, setGateType] = createSignal<GateType>('单开门');
  const [openingW, setOpeningW] = createSignal(3000);
  const [openingH, setOpeningH] = createSignal(2200);
  const [deadline, setDeadline] = createSignal(todayPlus(14));

  // 主管退回表单(按订单 id 展开)
  const [rejectingId, setRejectingId] = createSignal<string | null>(null);
  const [rejectNote, setRejectNote] = createSignal('');
  const [rejectDeadline, setRejectDeadline] = createSignal(todayPlus(7));

  const submitOrder = () => {
    if (!customer().trim()) return;
    actions.addOrder({
      customer: customer().trim(),
      gateType: gateType(),
      openingW: openingW(),
      openingH: openingH(),
      deadline: deadline(),
    });
    setCustomer('');
  };

  const startNewPanel = (order: Order) => {
    const name = `花板 ${order.panels.length + 1}`;
    const panelId = actions.addPanel(order.id, name);
    const p = appStore
      .getOrder(order.id)!
      .panels.find((x) => x.id === panelId)!;
    actions.setActiveOrder(order.id);
    actions.setEditingPanel(panelId);
    editorStore.actions.loadPanel(p);
    setTab('editor');
  };

  const editPanel = (order: Order, panelId: string) => {
    const p = order.panels.find((x) => x.id === panelId);
    if (!p) return;
    actions.setActiveOrder(order.id);
    actions.setEditingPanel(panelId);
    editorStore.actions.loadPanel(p);
    setTab('editor');
  };

  const exportSvg = (order: Order, panelId: string) => {
    const p = order.panels.find((x) => x.id === panelId);
    if (!p) return;
    const svg = patternToSvg(buildPattern(p.contours), p.name);
    if (!svg) return;
    downloadText(
      `切割路径-${order.customer}-${p.name}.svg`,
      svg,
      'image/svg+xml',
    );
  };

  const gotoAssembly = (order: Order) => {
    actions.setActiveOrder(order.id);
    actions.setAssemblyPanel(order.panels[0]?.id ?? null);
    setTab('assembly');
  };

  const statusBadge = (o: Order) => (
    <span class={`badge status-${o.status}`}>{o.status}</span>
  );

  const orderMeta = (o: Order) => (
    <div class="order-meta">
      <span>
        {o.gateType} · 洞口 {o.openingW}×{o.openingH}mm
      </span>
      <span>截止: {o.deadline}</span>
      <span class={o.reworkCount > 0 ? 'warn-text' : ''}>
        返工 {o.reworkCount} 次
      </span>
    </div>
  );

  return (
    <div class="orders-page">
      <div class="role-bar">
        <span>当前角色:</span>
        <For each={ROLES}>
          {(r) => (
            <button
              class={`btn ${role() === r ? 'active' : ''}`}
              onClick={() => actions.setRole(r)}
            >
              {r}
            </button>
          )}
        </For>
      </div>

      {/* ---------- 客户 ---------- */}
      <Show when={role() === '客户'}>
        <section class="card">
          <h3>客户下单</h3>
          <div class="form-grid">
            <label class="field">
              客户名称
              <input
                class="text-input"
                value={customer()}
                placeholder="如: 湖畔别墅 张先生"
                onInput={(e) => setCustomer(e.currentTarget.value)}
              />
            </label>
            <label class="field">
              门型
              <select
                value={gateType()}
                onChange={(e) => setGateType(e.currentTarget.value as GateType)}
              >
                <For each={GATE_TYPES}>{(t) => <option>{t}</option>}</For>
              </select>
            </label>
            <label class="field">
              洞口宽 (mm)
              <input
                type="number"
                class="text-input"
                min="600"
                max="8000"
                value={openingW()}
                onInput={(e) => setOpeningW(+e.currentTarget.value)}
              />
            </label>
            <label class="field">
              洞口高 (mm)
              <input
                type="number"
                class="text-input"
                min="600"
                max="4000"
                value={openingH()}
                onInput={(e) => setOpeningH(+e.currentTarget.value)}
              />
            </label>
            <label class="field">
              交付截止
              <input
                type="date"
                class="text-input"
                value={deadline()}
                onInput={(e) => setDeadline(e.currentTarget.value)}
              />
            </label>
            <button
              class="btn primary"
              disabled={!customer().trim()}
              onClick={submitOrder}
            >
              提交订单
            </button>
          </div>
        </section>
        <section class="card">
          <h3>我的订单</h3>
          <Show
            when={state.orders.length > 0}
            fallback={<p class="dim">暂无订单。</p>}
          >
            <For each={state.orders}>
              {(o) => (
                <div class="order-row">
                  <b>{o.customer}</b> {statusBadge(o)} {orderMeta(o)}
                  <Show when={o.reviewNote}>
                    <p class="warn-text">主管意见: {o.reviewNote}</p>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </section>
      </Show>

      {/* ---------- 制作员 ---------- */}
      <Show when={role() === '制作员'}>
        <section class="card">
          <h3>制作任务</h3>
          <Show
            when={state.orders.length > 0}
            fallback={<p class="dim">暂无订单,请切换到「客户」角色下单。</p>}
          >
            <For each={state.orders}>
              {(o) => (
                <div class="order-card">
                  <div class="order-head">
                    <b>{o.customer}</b> {statusBadge(o)} {orderMeta(o)}
                  </div>
                  <Show when={o.reviewNote}>
                    <p class="warn-text">退回原因: {o.reviewNote}</p>
                  </Show>
                  <div class="panel-list">
                    <For each={o.panels}>
                      {(p) => (
                        <div class="panel-row">
                          <span>
                            {p.name} · {p.contours.length}个轮廓 · {p.thickness}
                            mm · {MATERIAL_LABELS[p.material]}
                          </span>
                          <Show when={o.status !== '待审核' && o.status !== '已通过'}>
                            <button
                              class="btn small"
                              onClick={() => editPanel(o, p.id)}
                            >
                              编辑
                            </button>
                            <button
                              class="btn small danger"
                              onClick={() => actions.deletePanel(o.id, p.id)}
                            >
                              删除
                            </button>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                  <div class="row">
                    <Show
                      when={o.status === '待制作' || o.status === '制作中' || o.status === '已退回'}
                    >
                      <button class="btn" onClick={() => startNewPanel(o)}>
                        + 绘制花板
                      </button>
                      <button
                        class="btn primary"
                        disabled={o.panels.length === 0}
                        onClick={() => actions.submitOrder(o.id)}
                      >
                        提交审核
                      </button>
                    </Show>
                    <Show when={o.status === '已通过'}>
                      <button class="btn" onClick={() => gotoAssembly(o)}>
                        查看装配效果
                      </button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </section>
      </Show>

      {/* ---------- 主管 ---------- */}
      <Show when={role() === '主管'}>
        <section class="card">
          <h3>审核队列</h3>
          <Show
            when={state.orders.some((o) => o.status === '待审核')}
            fallback={<p class="dim">没有待审核的订单。</p>}
          >
            <For each={state.orders.filter((o) => o.status === '待审核')}>
              {(o) => (
                <div class="order-card">
                  <div class="order-head">
                    <b>{o.customer}</b> {statusBadge(o)} {orderMeta(o)}
                  </div>
                  <div class="panel-list">
                    <For each={o.panels}>
                      {(p) => (
                        <div class="panel-row">
                          <span>
                            {p.name} · {p.thickness}mm ·{' '}
                            {MATERIAL_LABELS[p.material]}
                          </span>
                          <button class="btn small" onClick={() => editPanel(o, p.id)}>
                            查看花型
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                  <div class="row">
                    <button
                      class="btn primary"
                      onClick={() => actions.approveOrder(o.id)}
                    >
                      ✓ 通过
                    </button>
                    <button
                      class="btn danger"
                      onClick={() =>
                        setRejectingId(rejectingId() === o.id ? null : o.id)
                      }
                    >
                      ✗ 退回
                    </button>
                    <button class="btn" onClick={() => gotoAssembly(o)}>
                      装配预览
                    </button>
                  </div>
                  <Show when={rejectingId() === o.id}>
                    <div class="reject-form">
                      <label class="field">
                        退回原因
                        <input
                          class="text-input"
                          value={rejectNote()}
                          placeholder="如: 花型密度过高,边框强度不足"
                          onInput={(e) => setRejectNote(e.currentTarget.value)}
                        />
                      </label>
                      <label class="field">
                        返工截止
                        <input
                          type="date"
                          class="text-input"
                          value={rejectDeadline()}
                          onInput={(e) => setRejectDeadline(e.currentTarget.value)}
                        />
                      </label>
                      <button
                        class="btn danger"
                        disabled={!rejectNote().trim()}
                        onClick={() => {
                          actions.rejectOrder(
                            o.id,
                            rejectNote().trim(),
                            rejectDeadline(),
                          );
                          setRejectingId(null);
                          setRejectNote('');
                        }}
                      >
                        确认退回(返工 +1)
                      </button>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </section>

        <section class="card">
          <h3>已通过订单 · 交付导出</h3>
          <Show
            when={state.orders.some((o) => o.status === '已通过')}
            fallback={<p class="dim">暂无已通过的订单。</p>}
          >
            <For each={state.orders.filter((o) => o.status === '已通过')}>
              {(o) => (
                <div class="order-card">
                  <div class="order-head">
                    <b>{o.customer}</b> {statusBadge(o)} {orderMeta(o)}
                  </div>
                  <div class="panel-list">
                    <For each={o.panels}>
                      {(p) => (
                        <div class="panel-row">
                          <span>
                            {p.name} · {p.thickness}mm ·{' '}
                            {MATERIAL_LABELS[p.material]}
                          </span>
                          <button
                            class="btn small primary"
                            onClick={() => exportSvg(o, p.id)}
                          >
                            导出 SVG 切割路径
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                  <button class="btn" onClick={() => gotoAssembly(o)}>
                    导出装配效果图 →
                  </button>
                </div>
              )}
            </For>
          </Show>
        </section>
      </Show>
    </div>
  );
}
