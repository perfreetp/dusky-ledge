import { createRoot, createEffect } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type { GateType, Order, PanelDesign, Pt } from '../types';
import { uid } from '../types';

export type Role = '客户' | '制作员' | '主管';

interface AppState {
  orders: Order[];
  role: Role;
  activeOrderId: string | null; // 编辑器/装配页当前关联的订单
  editingPanelId: string | null; // 编辑器正在编辑的花板
  assemblyPanelId: string | null; // 装配预览当前摆放的花板
  panelPos: Pt; // 装配预览中花板位置
}

const STORAGE_KEY = 'alu-gate-orders-v1';

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: Order[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    /* 存储不可用时静默 */
  }
}

function createAppStore() {
  const [state, setState] = createStore<AppState>({
    orders: loadOrders(),
    role: '制作员',
    activeOrderId: null,
    editingPanelId: null,
    assemblyPanelId: null,
    panelPos: { x: 0, y: 1100 },
  });

  createEffect(() => saveOrders(state.orders));

  const getOrder = (id: string | null) =>
    state.orders.find((o) => o.id === id) ?? null;

  const actions = {
    setRole(role: Role) {
      setState('role', role);
    },
    setActiveOrder(id: string | null) {
      setState('activeOrderId', id);
    },
    setEditingPanel(id: string | null) {
      setState('editingPanelId', id);
    },
    setAssemblyPanel(id: string | null) {
      setState('assemblyPanelId', id);
    },
    setPanelPos(p: Pt) {
      setState('panelPos', p);
    },

    addOrder(input: {
      customer: string;
      gateType: GateType;
      openingW: number;
      openingH: number;
      deadline: string;
    }): string {
      const order: Order = {
        id: uid(),
        customer: input.customer,
        gateType: input.gateType,
        openingW: input.openingW,
        openingH: input.openingH,
        createdAt: new Date().toISOString(),
        status: '待制作',
        panels: [],
        reworkCount: 0,
        deadline: input.deadline,
        reviewNote: '',
      };
      setState('orders', (os) => [...os, order]);
      return order.id;
    },

    /** 在订单下新建一块花板,返回花板 id */
    addPanel(orderId: string, name: string): string {
      const panel: PanelDesign = {
        id: uid(),
        name,
        contours: [],
        thickness: 4,
        material: 'matte-black',
        updatedAt: new Date().toISOString(),
      };
      setState(
        'orders',
        (o) => o.id === orderId,
        produce((o) => {
          o.panels.push(panel);
          if (o.status === '待制作') o.status = '制作中';
        }),
      );
      return panel.id;
    },

    savePanel(orderId: string, panel: PanelDesign) {
      setState(
        'orders',
        (o) => o.id === orderId,
        produce((o) => {
          const i = o.panels.findIndex((p) => p.id === panel.id);
          const next = { ...panel, updatedAt: new Date().toISOString() };
          if (i >= 0) o.panels[i] = next;
          else o.panels.push(next);
        }),
      );
    },

    deletePanel(orderId: string, panelId: string) {
      setState(
        'orders',
        (o) => o.id === orderId,
        produce((o) => {
          o.panels = o.panels.filter((p) => p.id !== panelId);
        }),
      );
    },

    /** 制作员提交审核 */
    submitOrder(orderId: string) {
      setState(
        'orders',
        (o) => o.id === orderId,
        produce((o) => {
          o.status = '待审核';
          o.reviewNote = '';
        }),
      );
    },

    /** 主管审核通过 */
    approveOrder(orderId: string) {
      setState(
        'orders',
        (o) => o.id === orderId,
        produce((o) => {
          o.status = '已通过';
          o.reviewNote = '';
        }),
      );
    },

    /** 主管退回: 记录返工次数与新的截止时间 */
    rejectOrder(orderId: string, note: string, deadline: string) {
      setState(
        'orders',
        (o) => o.id === orderId,
        produce((o) => {
          o.status = '已退回';
          o.reworkCount += 1;
          o.reviewNote = note;
          if (deadline) o.deadline = deadline;
        }),
      );
    },

    deleteOrder(orderId: string) {
      setState('orders', (os) => os.filter((o) => o.id !== orderId));
      if (state.activeOrderId === orderId) {
        setState('activeOrderId', null);
        setState('editingPanelId', null);
        setState('assemblyPanelId', null);
      }
    },
  };

  return { state, actions, getOrder };
}

export const appStore = createRoot(createAppStore);
