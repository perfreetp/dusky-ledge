import { createSignal } from 'solid-js';

export type TabKey = 'editor' | 'assembly' | 'orders';

export const TAB_LABELS: Record<TabKey, string> = {
  editor: '花型编辑',
  assembly: '装配预览',
  orders: '订单交付',
};

const [tab, setTab] = createSignal<TabKey>('editor');
export { tab, setTab };
