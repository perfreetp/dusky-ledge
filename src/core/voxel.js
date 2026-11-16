// 体素模型:三维 Uint8 网格,0=空,其余为石材材质 id
export const CELL_SIZES = [0.05, 0.1, 0.2] // 5cm / 10cm / 20cm
const MAX_VOXELS = 8_000_000

export class VoxelModel {
  constructor(nx = 64, ny = 40, nz = 64, cell = 0.1) {
    this.nx = nx
    this.ny = ny
    this.nz = nz
    this.cell = cell
    this.data = new Uint8Array(nx * ny * nz)
  }

  index(x, y, z) {
    return (y * this.nz + z) * this.nx + x
  }

  inBounds(x, y, z) {
    return x >= 0 && x < this.nx && y >= 0 && y < this.ny && z >= 0 && z < this.nz
  }

  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return 0
    return this.data[this.index(x, y, z)]
  }

  set(x, y, z, m) {
    if (this.inBounds(x, y, z)) this.data[this.index(x, y, z)] = m
  }

  // 带镜像的写入:X 镜像 = nx-1-x,Z 镜像 = nz-1-z,两者可同时开
  setMirrored(x, y, z, m, mirrorX, mirrorZ) {
    const xs = mirrorX ? [x, this.nx - 1 - x] : [x]
    const zs = mirrorZ ? [z, this.nz - 1 - z] : [z]
    for (const px of xs) for (const pz of zs) this.set(px, y, pz, m)
  }

  count() {
    let n = 0
    const d = this.data
    for (let i = 0; i < d.length; i++) if (d[i]) n++
    return n
  }

  // 体积,立方米
  volume() {
    const c = this.cell
    return this.count() * c * c * c
  }

  clear() {
    this.data.fill(0)
  }

  layerClear(y) {
    if (y < 0 || y >= this.ny) return
    this.data.fill(0, y * this.nz * this.nx, (y + 1) * this.nz * this.nx)
  }

  // 整层平移,越界体素丢弃
  layerTranslate(y, dx, dz) {
    if (y < 0 || y >= this.ny || (!dx && !dz)) return
    const { nx, nz } = this
    const src = this.data.slice(y * nz * nx, (y + 1) * nz * nx)
    const dst = new Uint8Array(nx * nz)
    for (let z = 0; z < nz; z++) {
      const tz = z + dz
      if (tz < 0 || tz >= nz) continue
      for (let x = 0; x < nx; x++) {
        const tx = x + dx
        if (tx < 0 || tx >= nx) continue
        dst[tz * nx + tx] = src[z * nx + x]
      }
    }
    this.data.set(dst, y * nz * nx)
  }

  // 整层绕中心旋转 90°(dir=1 顺时针俯视,-1 逆时针),越界丢弃
  layerRotate(y, dir) {
    if (y < 0 || y >= this.ny) return
    const { nx, nz } = this
    const src = this.data.slice(y * nz * nx, (y + 1) * nz * nx)
    const dst = new Uint8Array(nx * nz)
    const cx = (nx - 1) / 2
    const cz = (nz - 1) / 2
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const v = src[z * nx + x]
        if (!v) continue
        const ddx = x - cx
        const ddz = z - cz
        // 俯视顺时针: (dx,dz) -> (-dz, dx)
        const tx = Math.round(cx + (dir > 0 ? -ddz : ddz))
        const tz = Math.round(cz + (dir > 0 ? ddx : -ddx))
        if (tx >= 0 && tx < nx && tz >= 0 && tz < nz) dst[tz * nx + tx] = v
      }
    }
    this.data.set(dst, y * nz * nx)
  }

  // 复制单层内矩形选区(含边界)
  copyRegion(y, x0, z0, x1, z1) {
    const w = x1 - x0 + 1
    const h = z1 - z0 + 1
    const cells = new Uint8Array(w * h)
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) cells[j * w + i] = this.get(x0 + i, y, z0 + j)
    return { w, h, cells }
  }

  // 在 (x0,z0) 处粘贴选区;镜像开启时同步粘贴镜像位置
  pasteRegion(y, clip, x0, z0, mirrorX, mirrorZ) {
    const { w, h, cells } = clip
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const v = cells[j * w + i]
        if (!v) continue
        const xs = [x0 + i]
        const zs = [z0 + j]
        if (mirrorX) xs.push(this.nx - 1 - (x0 + i))
        if (mirrorZ) zs.push(this.nz - 1 - (z0 + j))
        for (const px of xs) for (const pz of zs) this.set(px, y, pz, v)
      }
    }
  }

  // 切换体素尺寸(5/10/20cm),按最近邻重采样保持外形
  resample(newCell) {
    if (newCell === this.cell) return
    const px = this.nx * this.cell
    const py = this.ny * this.cell
    const pz = this.nz * this.cell
    let nx = Math.max(1, Math.round(px / newCell))
    let ny = Math.max(1, Math.round(py / newCell))
    let nz = Math.max(1, Math.round(pz / newCell))
    // 超上限时等比收缩
    while (nx * ny * nz > MAX_VOXELS) {
      nx = Math.max(1, Math.floor(nx * 0.9))
      ny = Math.max(1, Math.floor(ny * 0.9))
      nz = Math.max(1, Math.floor(nz * 0.9))
    }
    const next = new Uint8Array(nx * ny * nz)
    const ratio = newCell / this.cell
    if (ratio > 1) {
      // 粗化:新格子覆盖范围内任一旧体素非空即保留(避免跳格丢形)
      for (let y = 0; y < ny; y++) {
        const y0 = Math.floor(y * ratio), y1 = Math.min(this.ny, Math.ceil((y + 1) * ratio))
        for (let z = 0; z < nz; z++) {
          const z0 = Math.floor(z * ratio), z1 = Math.min(this.nz, Math.ceil((z + 1) * ratio))
          for (let x = 0; x < nx; x++) {
            const x0 = Math.floor(x * ratio), x1 = Math.min(this.nx, Math.ceil((x + 1) * ratio))
            let v = 0
            outer: for (let oy = y0; oy < y1; oy++)
              for (let oz = z0; oz < z1; oz++)
                for (let ox = x0; ox < x1; ox++) {
                  const s = this.data[this.index(ox, oy, oz)]
                  if (s) { v = s; break outer }
                }
            if (v) next[(y * nz + z) * nx + x] = v
          }
        }
      }
    } else {
      // 细化:最近邻采样
      for (let y = 0; y < ny; y++) {
        const oy = Math.min(this.ny - 1, Math.floor(((y + 0.5) * newCell) / this.cell))
        for (let z = 0; z < nz; z++) {
          const oz = Math.min(this.nz - 1, Math.floor(((z + 0.5) * newCell) / this.cell))
          for (let x = 0; x < nx; x++) {
            const ox = Math.min(this.nx - 1, Math.floor(((x + 0.5) * newCell) / this.cell))
            const v = this.data[this.index(ox, oy, oz)]
            if (v) next[(y * nz + z) * nx + x] = v
          }
        }
      }
    }
    this.nx = nx
    this.ny = ny
    this.nz = nz
    this.cell = newCell
    this.data = next
  }

  serialize() {
    return {
      nx: this.nx,
      ny: this.ny,
      nz: this.nz,
      cell: this.cell,
      data: this.data.slice().buffer
    }
  }

  static deserialize(o) {
    const m = new VoxelModel(o.nx, o.ny, o.nz, o.cell)
    m.data = new Uint8Array(o.data)
    return m
  }

  // 点云粗格化:按包围盒建网格,落入格子即置为当前材质
  static fromPoints(points, cell, material, maxDim = 200) {
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (let i = 0; i < points.length; i += 3) {
      const x = points[i], y = points[i + 1], z = points[i + 2]
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (z < minZ) minZ = z
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (z > maxZ) maxZ = z
    }
    if (!isFinite(minX)) throw new Error('点云为空')
    const pad = cell
    minX -= pad; minY -= pad; minZ -= pad
    maxX += pad; maxY += pad; maxZ += pad
    const clamp = (n) => Math.max(1, Math.min(maxDim, Math.ceil(n)))
    const nx = clamp((maxX - minX) / cell)
    const ny = clamp((maxY - minY) / cell)
    const nz = clamp((maxZ - minZ) / cell)
    const m = new VoxelModel(nx, ny, nz, cell)
    for (let i = 0; i < points.length; i += 3) {
      const x = Math.floor((points[i] - minX) / cell)
      const y = Math.floor((points[i + 1] - minY) / cell)
      const z = Math.floor((points[i + 2] - minZ) / cell)
      m.set(
        Math.min(nx - 1, Math.max(0, x)),
        Math.min(ny - 1, Math.max(0, y)),
        Math.min(nz - 1, Math.max(0, z)),
        material
      )
    }
    return m
  }
}
