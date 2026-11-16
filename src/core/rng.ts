/**
 * 确定性随机数与分域子流。
 *
 * 铁律：生成管线内禁止使用 Math.random / Date.now / crypto，
 * 所有随机都必须来自经种子派生的本模块函数，保证 (seed, domain, id) 完全可复现。
 */

/** 32 位整数全混洗（SplitMix32 的常量混合），用于把任意整数 id 散列为均匀种子。 */
export function splitmix32(z: number): number {
  z = (z + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

/** mulberry32：返回一个产生 [0,1) 浮点的确定性 PRNG 函数。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 字符串 → 32 位 hash（FNV-1a 风格），用于把版本标签等文本纳入种子域。 */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/** 生成阶段域。不同阶段使用不同 domain，互不扰动（分域隔离不变量）。 */
export const Domain = {
  CENTERLINE: 0x1000,
  WALL: 0x2000,
  SCATTER: 0x3000,
  SHAPE: 0x4000,
  LIGHTS: 0x5000,
  TRAIL: 0x6000,
} as const;

export type DomainId = (typeof Domain)[keyof typeof Domain];

/** 由主种子 + 域 + 稳定 id 派生独立 PRNG。id 必须是稳定标识（站号/槽位 hash），禁止用数组下标。 */
export function substream(seed: number, domain: DomainId, id: number): () => number {
  return mulberry32(splitmix32((seed ^ domain) + splitmix32(id)));
}

/** 确定性从 [0,1) 流中取 [min,max) 浮点。 */
export function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** 确定性从 [0,1) 流中取整数 [min,max]。 */
export function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 由两个整数组合出稳定 id（Cantor 配对的 32 位安全变体）。 */
export function pairId(a: number, b: number): number {
  return splitmix32(Math.imul(a, 0x9e3779b1) ^ splitmix32(b));
}
