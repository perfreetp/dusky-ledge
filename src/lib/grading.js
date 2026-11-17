// 自动考评：体素总数、对称度、悬空检测、初评分；常见错法汇总
import { keyOf, parseKey, symmetryScore } from './voxel.js'

const requiredAxes = (mirror) => {
  if (mirror === 'x') return ['x']
  if (mirror === 'y') return ['y']
  if (mirror === 'both') return ['x', 'y']
  return []
}

/** 找悬空体素（z>0 且正下方无体素） */
export function findSuspended (model) {
  const out = []
  for (const k of model.voxels.keys()) {
    const { x, y, z } = parseKey(k)
    if (z > 0 && !model.voxels.has(keyOf(x, y, z - 1))) out.push(k)
  }
  return out
}

function distinctColors (model) {
  return new Set(model.voxels.values()).size
}

/** 学员提交时的机器初评 */
export function evaluate (model, task) {
  const axes = requiredAxes(task.mirror)
  const perAxis = {}
  for (const a of axes) perAxis[a] = symmetryScore(model, [a])
  const symmetry = axes.length ? axes.reduce((s, a) => s + perAxis[a], 0) / axes.length : 1
  const suspended = findSuspended(model)
  const colors = distinctColors(model)
  const overLimit = task.maxVoxels > 0 && model.voxels.size > task.maxVoxels

  let score = 100
  const notes = []
  if (overLimit) {
    score -= 20
    notes.push(`超出体素上限 ${model.voxels.size - task.maxVoxels} 块（-20）`)
  }
  for (const a of axes) {
    const miss = 1 - perAxis[a]
    if (miss > 0.05) {
      const deduct = Math.round(25 * miss)
      score -= deduct
      notes.push(`${a.toUpperCase()} 轴对称度 ${(perAxis[a] * 100).toFixed(1)}% 不达标（-${deduct}）`)
    }
  }
  if (suspended.length) {
    const deduct = Math.min(20, suspended.length * 2)
    score -= deduct
    notes.push(`存在 ${suspended.length} 块悬空体素（-${deduct}）`)
  }
  if (colors > 8) {
    score -= 5
    notes.push(`用色 ${colors} 种过于杂乱（-5）`)
  }
  if (!notes.length) notes.push('各项指标达标，等待老师复核')
  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    voxelCount: model.voxels.size,
    symmetry,
    perAxis,
    requiredAxes: axes,
    suspendedCount: suspended.length,
    suspendedKeys: suspended.slice(0, 200),
    colorCount: colors,
    overLimit,
    autoScore: score,
    notes
  }
}

/** 常见错法汇总（跨全部提交），按出现频次降序 */
export function mistakeSummary (submissions, tasks) {
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const stats = [
    { key: 'overLimit', label: '体素超上限', count: 0 },
    { key: 'symmetry', label: '对称度不达标', count: 0 },
    { key: 'suspended', label: '悬空体素', count: 0 },
    { key: 'colors', label: '用色过杂(>8种)', count: 0 },
    { key: 'empty', label: '空作品/体素过少', count: 0 }
  ]
  const map = Object.fromEntries(stats.map(s => [s.key, s]))
  let n = 0
  for (const sub of submissions) {
    const task = taskMap.get(sub.taskId)
    if (!task) continue
    n++
    const e = sub.eval
    if (!e) continue
    if (e.overLimit) map.overLimit.count++
    if (e.requiredAxes?.some(a => (e.perAxis?.[a] ?? 1) < 0.95)) map.symmetry.count++
    if (e.suspendedCount > 0) map.suspended.count++
    if (e.colorCount > 8) map.colors.count++
    if (e.voxelCount < 8) map.empty.count++
  }
  return {
    total: n,
    items: stats.map(s => ({ ...s, ratio: n ? s.count / n : 0 })).sort((a, b) => b.count - a.count)
  }
}
