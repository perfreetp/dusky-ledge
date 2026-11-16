// 体素数据模型：Map<(packedKey), packedCell>
// cell 位布局：组(3bit) | 材质+1(4bit) | 透明度档(4bit)
export const CELL_SIZE = 0.5 // 米 / 格

export const packCell = (g, m = -1, a = 15) =>
  (g & 7) | (((m + 1) & 15) << 3) | ((Math.max(1, Math.min(15, a)) & 15) << 7)
export const cellGroup = (v) => v & 7
export const cellMat = (v) => ((v >> 3) & 15) - 1
export const cellAlphaQ = (v) => ((v >> 7) & 15) || 15

export class VoxelModel {
  constructor(sx, sy, sz) {
    this.sx = sx
    this.sy = sy
    this.sz = sz
    this.map = new Map()
  }

  key(x, y, z) {
    return x + this.sx * (y + this.sy * z)
  }

  coords(key) {
    const x = key % this.sx
    const y = Math.floor(key / this.sx) % this.sy
    const z = Math.floor(key / (this.sx * this.sy))
    return [x, y, z]
  }

  inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz
  }

  get(x, y, z) {
    if (!this.inside(x, y, z)) return undefined
    return this.map.get(this.key(x, y, z))
  }

  set(x, y, z, value) {
    if (!this.inside(x, y, z)) return false
    const k = this.key(x, y, z)
    if (value === undefined || value === null) {
      if (!this.map.has(k)) return false
      this.map.delete(k)
      return true
    }
    if (this.map.get(k) === value) return false
    this.map.set(k, value)
    return true
  }

  remove(x, y, z) {
    return this.set(x, y, z, undefined)
  }

  has(x, y, z) {
    return this.get(x, y, z) !== undefined
  }

  get count() {
    return this.map.size
  }

  clear() {
    this.map.clear()
  }

  bounds() {
    if (!this.map.size) return null
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (const k of this.map.keys()) {
      const [x, y, z] = this.coords(k)
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (z < minZ) minZ = z
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (z > maxZ) maxZ = z
    }
    return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] }
  }

  forEach(fn) {
    for (const [k, v] of this.map) {
      const [x, y, z] = this.coords(k)
      fn(x, y, z, v, k)
    }
  }

  snapshot() {
    return new Map(this.map)
  }

  restore(snap) {
    this.map = new Map(snap)
  }

  serialize() {
    return Array.from(this.map.entries())
  }

  deserialize(entries) {
    this.map = new Map(entries)
  }
}

export const MIRROR_AXES = [
  { axis: 'x', index: 0, label: 'X' },
  { axis: 'y', index: 1, label: 'Y' },
  { axis: 'z', index: 2, label: 'Z' },
]

export function mirrorPoint(dims, p, axis) {
  if (axis === 'x') return [dims.x - 1 - p[0], p[1], p[2]]
  if (axis === 'y') return [p[0], dims.y - 1 - p[1], p[2]]
  return [p[0], p[1], dims.z - 1 - p[2]]
}
