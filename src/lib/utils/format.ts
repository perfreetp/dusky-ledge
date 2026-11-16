export function fmtDateTime(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('zh-CN', { hour12: false });
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN');
}

export function fmtMeters(m: number): string {
  if (m >= 1000) return (m / 1000).toFixed(2) + ' km';
  return m.toFixed(1) + ' m';
}

export function deadlineState(deadline: number): { text: string; overdue: boolean; urgent: boolean } {
  const ms = deadline - Date.now();
  const overdue = ms < 0;
  const days = Math.floor(Math.abs(ms) / 86400000);
  const hours = Math.floor((Math.abs(ms) % 86400000) / 3600000);
  const text = overdue
    ? `已超期 ${days}天${hours}时`
    : `剩 ${days}天${hours}时`;
  return { text, overdue, urgent: !overdue && ms < 2 * 86400000 };
}

export const STATUS_LABEL: Record<string, string> = {
  editing: '制作中',
  submitted: '待审核',
  returned: '退回返工',
  approved: '已通过',
  delivered: '已交付'
};
