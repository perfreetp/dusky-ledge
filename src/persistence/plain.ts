/**
 * 把 Solid 响应式代理转成可被 IndexedDB 结构化克隆的纯对象。
 * 本项目数据仅含 number/string/boolean/普通数组与对象，JSON 往返无损，
 * 且能彻底剥离 Solid 的 Proxy 包装（structuredClone 对深层代理仍会抛 DataCloneError）。
 */
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
