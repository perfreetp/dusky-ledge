// 逐层拼搭清单：每层砖块数、颜色分布、整模型用色汇总
import { PALETTE } from './palette.js'
import { parseKey } from './voxel.js'

export function buildList (model) {
  const layers = new Map() // z -> Map(color -> count)
  let maxZ = -1
  for (const [k, color] of model.voxels) {
    const { z } = parseKey(k)
    maxZ = Math.max(maxZ, z)
    if (!layers.has(z)) layers.set(z, new Map())
    const m = layers.get(z)
    m.set(color, (m.get(color) || 0) + 1)
  }
  const rows = []
  const colorTotals = new Map()
  for (let z = 0; z <= maxZ; z++) {
    const m = layers.get(z)
    if (!m) continue
    const colors = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([color, count]) => {
        colorTotals.set(color, (colorTotals.get(color) || 0) + count)
        return { color, count, name: PALETTE[color % PALETTE.length].name, hex: PALETTE[color % PALETTE.length].hex }
      })
    rows.push({ z, total: colors.reduce((s, c) => s + c.count, 0), colors })
  }
  const summary = [...colorTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, count, name: PALETTE[color % PALETTE.length].name, hex: PALETTE[color % PALETTE.length].hex }))
  return { rows, totalVoxels: model.voxels.size, layerCount: rows.length, summary }
}

export function buildListText (model, title = '逐层拼搭清单') {
  const list = buildList(model)
  const lines = []
  lines.push(`===== ${title} =====`)
  lines.push(`体素总数: ${list.totalVoxels}  层数: ${list.layerCount}`)
  lines.push('')
  for (const row of list.rows) {
    lines.push(`第 ${row.z + 1} 层 (z=${row.z}) —— 砖块 ${row.total} 块`)
    for (const c of row.colors) lines.push(`   · ${c.name} x${c.count}`)
  }
  lines.push('')
  lines.push('--- 全模型用色汇总 ---')
  for (const c of list.summary) lines.push(`· ${c.name} 共 ${c.count} 块`)
  return lines.join('\n')
}
