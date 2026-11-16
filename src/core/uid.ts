let seq = 0;

/** 稳定的短 id（时间戳 + 进程内序号 + 随机后缀） */
export function uid(prefix = 'f'): string {
  seq += 1;
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now().toString(36)}_${seq}_${rand}`;
}
