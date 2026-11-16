import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 确定性守门：核心生成层（src/core）禁止出现任何非确定随机/时间源。
 * UI/持久化层允许 Date.now（用于时间戳与 id），但核心层几何决策必须纯函数化。
 */
const CORE_DIR = join(__dirname, '..', 'src', 'core');
const FORBIDDEN = [/Math\.random\s*\(/, /\bnew Date\s*\(/, /Date\.now\s*\(/, /crypto\.getRandomValues/];

function collectTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? collectTs(full) : entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('确定性守门：核心层禁用非确定源', () => {
  it('src/core 下不存在 Math.random / Date / crypto 随机调用', () => {
    const violations: string[] = [];
    for (const file of collectTs(CORE_DIR)) {
      const src = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN) {
        if (pattern.test(src)) violations.push(`${file} 命中 ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('performance.now 只用于统计，不进入几何返回值（生成结果不含时间派生数据）', () => {
    const generate = readFileSync(join(CORE_DIR, 'generate.ts'), 'utf8');
    // elapsedMs 是唯一允许的时间出口，且仅写入 stats
    expect(generate).toContain('performance.now()');
    expect(generate.indexOf('elapsedMs')).toBeGreaterThan(generate.indexOf('performance.now()'));
  });
});
