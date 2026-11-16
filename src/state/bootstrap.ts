import { makeId, type Assignment } from './assignment';

/** 默认示例题目：12×12 格探方，4 层堆积，镜像不计分 */
export function defaultAssignment(): Assignment {
  return {
    id: makeId('task'),
    title: 'T0601 南段 · 地层建模练习',
    brief:
      '按探方西壁实际堆积自第 1 层向下逐层建模：层与层之间不得留空，每层应铺满当前探方。' +
      '建议先用「俯视」确认边界，再用「框选 + 平移到本层」补齐。',
    nx: 12,
    ny: 12,
    nz: 12,
    layerRows: [3, 3, 3, 3],
    mirrorRequired: false,
    faceBudget: 6000,
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    allowLate: true,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
}
