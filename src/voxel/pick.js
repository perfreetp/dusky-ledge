import { CELL_SIZE } from './model.js'

const OFFSETS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

export function worldToVoxel(model, p) {
  const ox = -model.sx / 2
  const oz = -model.sz / 2
  return [
    Math.floor(p[0] / CELL_SIZE - ox),
    Math.floor(p[1] / CELL_SIZE),
    Math.floor(p[2] / CELL_SIZE - oz),
  ]
}

export function voxelToWorld(model, v, center = false) {
  const ox = -model.sx / 2
  const oz = -model.sz / 2
  const c = center ? 0.5 : 0
  return [(v[0] + c + ox) * CELL_SIZE, (v[1] + c) * CELL_SIZE, (v[2] + c + oz) * CELL_SIZE]
}

/**
 * DDA 体素遍历拾取：返回命中的体素坐标与法线（用于相邻放置）
 */
export function raycastVoxel(model, origin, dir, opts = {}) {
  const maxDist = opts.maxDist ?? 400
  // clip: {x:{at,dir}} —— 与渲染用同一套裁剪规则，切掉的部分不参与拾取
  const clip = opts.clip ?? null
  const visibleGroups = opts.visibleGroups ?? null
  const accepted = (cell, x, y, z) => {
    if (cell === undefined) return false
    if (visibleGroups && !visibleGroups.has(cell & 7)) return false
    if (clip) {
      for (let i = 0; i < 3; i++) {
        const c = clip[i === 0 ? 'x' : i === 1 ? 'y' : 'z']
        if (!c) continue
        const v = i === 0 ? x : i === 1 ? y : z
        if (c.dir === 'min' ? v > c.at : v < c.at) return false
      }
    }
    return true
  }
  const ox = -model.sx / 2
  const oz = -model.sz / 2
  const o = [origin[0] / CELL_SIZE - ox, origin[1] / CELL_SIZE, origin[2] / CELL_SIZE - oz]
  const dims = [model.sx, model.sy, model.sz]

  // 先用 AABB 求进入点与进入面
  let tmin = 0
  let tmax = maxDist
  let enterAxis = -1
  let enterSign = 0
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dir[i]) < 1e-9) {
      if (o[i] < 0 || o[i] > dims[i]) return null
      continue
    }
    const inv = 1 / dir[i]
    let t1 = (0 - o[i]) * inv
    let t2 = (dims[i] - o[i]) * inv
    if (t1 > t2) {
      const t = t1
      t1 = t2
      t2 = t
    }
    if (t1 > tmin) {
      tmin = t1
      enterAxis = i
      enterSign = dir[i] > 0 ? -1 : 1
    }
    if (t2 < tmax) tmax = t2
    if (tmin > tmax) return null
  }
  if (tmin > maxDist) return null

  const cell = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    const v = Math.floor(o[i] + dir[i] * tmin)
    cell[i] = Math.min(dims[i] - 1, Math.max(0, v))
  }

  let normal = [0, 0, 0]
  if (enterAxis >= 0) normal[enterAxis] = enterSign

  const step = [0, 0, 0]
  const tDelta = [Infinity, Infinity, Infinity]
  const tNext = [Infinity, Infinity, Infinity]
  for (let i = 0; i < 3; i++) {
    if (dir[i] > 1e-9) {
      step[i] = 1
      tDelta[i] = 1 / dir[i]
      tNext[i] = (cell[i] + 1 - o[i]) / dir[i]
    } else if (dir[i] < -1e-9) {
      step[i] = -1
      tDelta[i] = -1 / dir[i]
      tNext[i] = (cell[i] - o[i]) / dir[i]
    }
  }

  let t = tmin
  let guard = 0
  while (guard++ < 8192) {
    if (cell[0] < 0 || cell[1] < 0 || cell[2] < 0 || cell[0] >= dims[0] || cell[1] >= dims[1] || cell[2] >= dims[2]) {
      break
    }
    if (accepted(model.get(cell[0], cell[1], cell[2]), cell[0], cell[1], cell[2])) {
      return { voxel: cell.slice(), normal: normal.slice(), t, inside: enterAxis < 0 }
    }
    let axis = 0
    if (tNext[1] < tNext[axis]) axis = 1
    if (tNext[2] < tNext[axis]) axis = 2
    t = tNext[axis]
    if (t > maxDist) break
    tNext[axis] += tDelta[axis]
    cell[axis] += step[axis]
    normal = [0, 0, 0]
    normal[axis] = -step[axis]
  }
  return null
}

/** 沿地面平面 y=0 求交，用于空白处的落点 */
export function raycastGround(model, origin, dir) {
  if (Math.abs(dir[1]) < 1e-6) return null
  const t = -origin[1] / dir[1]
  if (t <= 0) return null
  const p = [origin[0] + dir[0] * t, 0, origin[2] + dir[2] * t]
  const v = worldToVoxel(model, p)
  v[1] = 0
  if (v[0] < 0 || v[2] < 0 || v[0] >= model.sx || v[2] >= model.sz) return null
  return { voxel: v, normal: [0, 1, 0], t, ground: true }
}
