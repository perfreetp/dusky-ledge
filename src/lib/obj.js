// 从贪心减面结果导出 OBJ + MTL（同色面使用同一材质组）
import { PALETTE } from './palette.js'
import { boundsOf } from './voxel.js'

const AXIS_U = [[0, 1, 0], [0, 0, 1], [1, 0, 0]]
const AXIS_V = [[0, 0, 1], [1, 0, 0], [0, 1, 0]]
const AXIS_D = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]

export function exportObj (model, mesh, baseName = 'voxel-model') {
  const b = boundsOf(model)
  const ox = b ? (b.minX + b.maxX + 1) / 2 : 0
  const oy = b ? (b.minY + b.maxY + 1) / 2 : 0
  const used = [...new Set(mesh.quads.map(q => q.color))].sort((a, c) => a - c)

  const mtl = used.map(c => {
    const { r, g, b: bl } = hex01(PALETTE[c % PALETTE.length].hex)
    return `newmtl color_${c}\nKd ${r} ${g} ${bl}\nKa 0.1 0.1 0.1\nKs 0.05 0.05 0.05\n`
  }).join('\n')

  let obj = `# 方块工坊导出 - ${baseName}\n# 体素数: ${model.voxels.size}  合并后面数: ${mesh.quads.length}\nmtllib ${baseName}.mtl\n`
  let vertexCount = 0
  for (const color of used) {
    obj += `\nusemtl color_${color}\n`
    for (const q of mesh.quads) {
      if (q.color !== color) continue
      const u = AXIS_U[q.axis], v = AXIS_V[q.axis], d = AXIS_D[q.axis]
      const O = [q.x - ox, q.y - oy, q.z]
      const p1 = add(O, scale(u, q.w)), p2 = add(p1, scale(v, q.h)), p3 = add(O, scale(v, q.h))
      const corners = q.sign > 0 ? [O, p1, p2, p3] : [O, p3, p2, p1]
      for (const p of corners) obj += `v ${p[0].toFixed(3)} ${p[1].toFixed(3)} ${p[2].toFixed(3)}\n`
      const s = vertexCount
      if (q.sign > 0) obj += `f ${s + 1} ${s + 2} ${s + 3} ${s + 4}\n`
      else obj += `f ${s + 1} ${s + 2} ${s + 3} ${s + 4}\n`
      vertexCount += 4
    }
  }
  return { obj, mtl, mtlName: `${baseName}.mtl`, objName: `${baseName}.obj` }
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a, n) => [a[0] * n, a[1] * n, a[2] * n]
function hex01 (hex) {
  const n = parseInt(hex.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

export function downloadText (filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
