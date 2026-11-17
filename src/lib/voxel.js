// 体素模型核心：Map 存储 + 坐标编解码 + 镜像/层/选区等纯逻辑

export const keyOf = (x, y, z) => `${x},${y},${z}`
export const parseKey = (k) => {
  const [x, y, z] = k.split(',').map(Number)
  return { x, y, z }
}

export function createModel (size = 16) {
  return { size, voxels: new Map() /* key -> colorIndex */ }
}

export function cloneModel (model) {
  return { size: model.size, voxels: new Map(model.voxels) }
}

export function inBounds (model, x, y, z) {
  const n = model.size
  return x >= 0 && y >= 0 && z >= 0 && x < n && y < n && z < n
}

export function getVoxel (model, x, y, z) {
  return model.voxels.get(keyOf(x, y, z))
}

export function setVoxel (model, x, y, z, color) {
  if (!inBounds(model, x, y, z)) return false
  model.voxels.set(keyOf(x, y, z), color)
  return true
}

export function removeVoxel (model, x, y, z) {
  return model.voxels.delete(keyOf(x, y, z))
}

export function boundsOf (model) {
  if (!model.voxels.size) return null
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const k of model.voxels.keys()) {
    const { x, y, z } = parseKey(k)
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

/** 沿某轴的镜像坐标（镜像轴穿过工作区中心） */
export function mirrorCoord (model, axis, coord) {
  return model.size - 1 - coord
}

/** 取一次编辑在镜像设置下应作用到的全部位置（去重） */
export function fanOut (model, x, y, z, mirror) {
  const pts = [[x, y, z]]
  if (mirror === 'x' || mirror === 'both') pts.push([mirrorCoord(model, 'x', x), y, z])
  if (mirror === 'y' || mirror === 'both') pts.push([x, mirrorCoord(model, 'y', y), z])
  if (mirror === 'both') pts.push([mirrorCoord(model, 'x', x), mirrorCoord(model, 'y', y), z])
  const seen = new Set()
  const out = []
  for (const p of pts) {
    const k = keyOf(p[0], p[1], p[2])
    if (!seen.has(k) && inBounds(model, ...p)) { seen.add(k); out.push(p) }
  }
  return out
}

/** 对称度：0-1。统计与镜像位颜色一致的体素占比 */
export function symmetryScore (model, axes) {
  if (!model.voxels.size) return 0
  if (!axes.length) return 1
  const targets = axes.map(a => (a === 'x'
    ? (x, y, z) => [mirrorCoord(model, 'x', x), y, z]
    : (x, y, z) => [x, mirrorCoord(model, 'y', y), z]))
  let total = 0
  let matched = 0
  for (const [k, c] of model.voxels) {
    const { x, y, z } = parseKey(k)
    for (const fn of targets) {
      total++
      const [mx, my, mz] = fn(x, y, z)
      if (model.voxels.get(keyOf(mx, my, mz)) === c) matched++
    }
  }
  return total ? matched / total : 0
}

/** 生成一个示例小房子，作为初始作品（X 轴对称、无悬空） */
export function seedHouse (size = 16) {
  const m = createModel(size)
  const ox = 4, oy = 4
  const W = 8, D = 8, wallH = 4
  const WALL = 9, ROOF = 1, DOOR = 10, GLASS = 11, BASE = 7
  // 底座（墙体完整落在底座上，避免悬空）
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < D; y++) setVoxel(m, ox + x, oy + y, 0, BASE)
  }
  for (let z = 1; z <= wallH; z++) {
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < D; y++) {
        const edge = x === 0 || x === W - 1 || y === 0 || y === D - 1
        if (!edge) continue
        const cx = ox + x, cy = oy + y
        if (z <= 2 && (x === W / 2 - 1 || x === W / 2) && (y === 0 || y === D - 1)) {
          setVoxel(m, cx, cy, z, DOOR) // 双开门，中线两侧各一扇（严格 X 对称）
        } else if (z === 2 && (x === 0 || x === W - 1) && (y === 2 || y === D - 3)) {
          setVoxel(m, cx, cy, z, GLASS) // 窗（成对出现）
        } else {
          setVoxel(m, cx, cy, z, WALL)
        }
      }
    }
  }
  // 内部贯通柱：覆盖各级坡顶的 x 投影（含屋脊），避免高层屋顶悬空
  const colXs = [1, 2, W / 2 - 1, W / 2, W - 3, W - 2]
  for (let z = 1; z <= wallH + W / 2; z++) {
    for (let y = 1; y < D - 1; y++) {
      for (const sx of colXs) setVoxel(m, ox + sx, oy + y, z, WALL)
    }
  }
  // 山墙端柱：前后两面墙（y=0、y=D-1）随屋顶逐级升高，托住每一级坡顶
  for (let t = 0; t < W / 2; t++) {
    const z = wallH + 1 + t
    const xL = t, xR = W - 1 - t
    for (let x = xL; x <= xR; x++) {
      setVoxel(m, ox + x, oy + 0, z, WALL)
      setVoxel(m, ox + x, oy + (D - 1), z, WALL)
    }
  }
  // 双坡屋顶：沿 x 起坡，x 区间与山墙一致，每格正下方（山墙或低一级坡顶）都有支撑
  for (let t = 0; t < W / 2; t++) {
    const z = wallH + 1 + t
    for (let y = 0; y < D; y++) {
      const xL = t
      const xR = W - 1 - t
      setVoxel(m, ox + xL, oy + y, z, ROOF)
      if (xR !== xL) setVoxel(m, ox + xR, oy + y, z, ROOF)
    }
  }
  return m
}

/** 序列化为普通 JSON 对象（Map 转数组） */
export function serialize (model) {
  return { size: model.size, voxels: [...model.voxels.entries()] }
}
export function deserialize (obj) {
  return { size: obj.size, voxels: new Map(obj.voxels) }
}
