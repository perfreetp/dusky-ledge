// 切片、框选、落点碰撞等几何辅助
export function cellKey(x, y, z) {
  return x + ',' + y + ',' + z
}

/** 由两个体素点构造包含端点的选区盒 */
export function boxFromPoints(a, b) {
  const min = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])]
  const max = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])]
  return { min, max }
}

export function boxContains(box, p) {
  return (
    p[0] >= box.min[0] && p[0] <= box.max[0] &&
    p[1] >= box.min[1] && p[1] <= box.max[1] &&
    p[2] >= box.min[2] && p[2] <= box.max[2]
  )
}

export function boxSize(box) {
  return [box.max[0] - box.min[0] + 1, box.max[1] - box.min[1] + 1, box.max[2] - box.min[2] + 1]
}

export function boxCenter(box) {
  return [
    (box.min[0] + box.max[0]) / 2,
    (box.min[1] + box.max[1]) / 2,
    (box.min[2] + box.max[2]) / 2,
  ]
}

/** 收集盒内已存在体素（按组过滤） */
export function collectVoxels(model, box, groupFilter = null) {
  const out = []
  for (let z = box.min[2]; z <= box.max[2]; z++)
    for (let y = box.min[1]; y <= box.max[1]; y++)
      for (let x = box.min[0]; x <= box.max[0]; x++) {
        if (!model.inside(x, y, z)) continue
        const v = model.get(x, y, z)
        if (v === undefined) continue
        if (groupFilter != null && (v & 7) !== groupFilter) continue
        out.push([x, y, z])
      }
  return out
}

/** 剪贴板落到 target 处时，检测与已有体素冲突的格数 */
export function checkClipboardCollision(model, clip, target, mirror, dims) {
  if (!clip) return { total: 0, hits: [] }
  const occupied = new Set()
  for (const item of clip.items) {
    const x = target[0] + item.d[0]
    const y = target[1] + item.d[1]
    const z = target[2] + item.d[2]
    if (model.get(x, y, z) !== undefined) occupied.add(cellKey(x, y, z))
    if (mirror.on) {
      const mx = mirror.axis === 'x' ? dims.x - 1 - x : x
      const my = mirror.axis === 'y' ? dims.y - 1 - y : y
      const mz = mirror.axis === 'z' ? dims.z - 1 - z : z
      if (model.get(mx, my, mz) !== undefined) occupied.add(cellKey(mx, my, mz))
    }
  }
  return { total: clip.items.length, hits: [...occupied] }
}

/** 剪贴板目标点是否越界 */
export function clipboardInBounds(clip, target, dims) {
  if (!clip) return false
  return (
    target[0] >= 0 &&
    target[1] >= 0 &&
    target[2] >= 0 &&
    target[0] + clip.size[0] <= dims.x &&
    target[1] + clip.size[1] <= dims.y &&
    target[2] + clip.size[2] <= dims.z
  )
}

/**
 * 把切片设置转成渲染/拾取用的裁剪描述。
 * section.x = { at, dir }，dir='min' 保留 <= at，dir='max' 保留 >= at
 */
export function clipFromSection(section) {
  const clip = { x: null, y: null, z: null }
  for (const k of ['x', 'y', 'z']) {
    const s = section[k]
    if (s) clip[k] = { at: s.at, dir: s.dir || 'min' }
  }
  return clip
}

export function sectionActive(section) {
  return !!(section.x || section.y || section.z)
}

/**
 * 坐标 → 3D 盒角点（用于叠加框线）。
 * 返回世界坐标的 8 个角点。
 */
export function boxCornersWorld(model, box, CELL_SIZE, pad = 0) {
  const ox = -model.sx / 2
  const oz = -model.sz / 2
  const x0 = (box.min[0] + ox) * CELL_SIZE - pad
  const y0 = box.min[1] * CELL_SIZE - pad
  const z0 = (box.min[2] + oz) * CELL_SIZE - pad
  const x1 = (box.max[0] + 1 + ox) * CELL_SIZE + pad
  const y1 = (box.max[1] + 1) * CELL_SIZE + pad
  const z1 = (box.max[2] + 1 + oz) * CELL_SIZE + pad
  return [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
  ]
}

export const BOX_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
]
