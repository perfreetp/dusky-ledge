/**
 * 样式辅助：Solid 的 CSSProperties 只接受字符串值，数字需带单位。
 * 统一用 px() 把数字转成 'Npx'，避免到处写模板字符串。
 */
export function px(n: number): string {
  return `${n}px`;
}

/** 批量构造 style 对象，数字值自动加 px，字符串原样保留。 */
export function css(s: Record<string, string | number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s)) {
    out[k] = typeof v === 'number' ? `${v}px` : v;
  }
  return out;
}
