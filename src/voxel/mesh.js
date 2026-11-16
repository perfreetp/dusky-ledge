import { CELL_SIZE, cellGroup, cellMat, cellAlphaQ } from './model.js'
import { GROUPS, MATERIAL_BY_ID, qToAlpha } from '../store/materials.js'
import { hexToLinearRgba } from '../render/math.js'

const GROUP_LINEAR = GROUPS.map((g) => hexToLinearRgba(g.color, 1))
const AXIS_NAME = ['x', 'y', 'z']

export function cellColor(cell) {
  const g = cellGroup(cell)
  const mat = MATERIAL_BY_ID[cellMat(cell)]
  const base = mat && mat.color ? hexToLinearRgba(mat.color) : GROUP_LINEAR[g]
  const alpha = qToAlpha(cellAlphaQ(cell))
  return [base[0], base[1], base[2], alpha]
}

const packColor = (c) => {
  // 8 bit per channel is plenty for a merged-face key
  const r = Math.round(Math.min(1, Math.max(0, c[0])) * 255)
  const g = Math.round(Math.min(1, Math.max(0, c[1])) * 255)
  const b = Math.round(Math.min(1, Math.max(0, c[2])) * 255)
  const a = Math.round(Math.min(1, Math.max(0, c[3])) * 255)
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0
}
const unpackColor = (k) => [
  ((k >>> 24) & 255) / 255,
  ((k >>> 16) & 255) / 255,
  ((k >>> 8) & 255) / 255,
  (k & 255) / 255,
]

/**
 * 合并一组体素为外观面网格。
 * 相邻内部面直接剔除；同色同朝向的共面格子再做贪心矩形合并。
 */
export function buildMesh(model, opts = {}) {
  const dims = [model.sx, model.sy, model.sz]
  const visibleGroups = opts.visibleGroups ?? new Set([0, 1, 2, 3])
  const clip = opts.clip ?? null // {x,y,z} 为各轴保留的最大格坐标（含），null 表示不切
  const groupFilter = opts.groupFilter ?? null // 只为某一组出网格（导出用）
  const cutTint = opts.cutTint ?? 1
  const offset = [-model.sx / 2, 0, -model.sz / 2]

  // clip: { x: {at, dir} } —— dir 'min' 保留 <= at，'max' 保留 >= at
  const clipped = (x, y, z) => {
    if (!clip) return false
    for (let i = 0; i < 3; i++) {
      const c = clip[AXIS_NAME[i]]
      if (!c) continue
      const v = i === 0 ? x : i === 1 ? y : z
      if (c.dir === 'min' ? v > c.at : v < c.at) return true
    }
    return false
  }
  const usable = (x, y, z) => {
    const c = model.get(x, y, z)
    if (c === undefined) return undefined
    const g = cellGroup(c)
    if (!visibleGroups.has(g)) return undefined
    if (groupFilter != null && g !== groupFilter) return undefined
    if (clipped(x, y, z)) return undefined
    return c
  }

  const positions = []
  const normals = []
  const colors = []
  const indices = []
  const triByGroup = [0, 0, 0, 0]
  const quadByGroup = [0, 0, 0, 0]
  const rawFaceByGroup = [0, 0, 0, 0]
  const tPositions = []
  const tNormals = []
  const tColors = []
  const tQuads = []
  // 每组独立缓冲，供 glb 按组拆网格（同一次合并，组间相邻面已被剔除）
  const groupBuffers = [0, 1, 2, 3].map(() => ({ pos: [], nrm: [], col: [], idx: [] }))

  // 每个方向的 (u,v) 轴
  const UV = [
    [1, 2],
    [2, 0],
    [0, 1],
  ]

  const pushQuad = (axis, dir, n, u0, v0, w, h, color, group) => {
    const [b, c] = UV[axis]
    const p = n + (dir > 0 ? 1 : 0)
    const P = (uu, vv) => {
      const pos = [0, 0, 0]
      pos[axis] = p
      pos[b] = uu
      pos[c] = vv
      return [
        (pos[0] + offset[0]) * CELL_SIZE,
        (pos[1] + offset[1]) * CELL_SIZE,
        (pos[2] + offset[2]) * CELL_SIZE,
      ]
    }
    const u1 = u0 + w
    const v1 = v0 + h
    const q = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]
    if (dir < 0) q.reverse()
    const nrm = [0, 0, 0]
    nrm[axis] = dir
    const isTransparent = color[3] < 0.985
    const posArr = isTransparent ? tPositions : positions
    const nrmArr = isTransparent ? tNormals : normals
    const colArr = isTransparent ? tColors : colors
    const base = posArr.length / 3
    for (const pt of q) {
      posArr.push(pt[0], pt[1], pt[2])
      nrmArr.push(nrm[0], nrm[1], nrm[2])
      colArr.push(color[0], color[1], color[2], color[3])
    }
    const gb = groupBuffers[group]
    const gbase = gb.pos.length / 3
    for (const pt of q) {
      gb.pos.push(pt[0], pt[1], pt[2])
      gb.nrm.push(nrm[0], nrm[1], nrm[2])
      gb.col.push(color[0], color[1], color[2], color[3])
    }
    if (isTransparent) {
      tQuads.push([base, base + 1, base + 2, base + 3])
    } else {
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
      triByGroup[group] += 2
    }
    gb.idx.push(gbase, gbase + 1, gbase + 2, gbase, gbase + 2, gbase + 3)
    quadByGroup[group] += 1
  }

  for (let axis = 0; axis < 3; axis++) {
    const [ua, va] = UV[axis]
    const dimU = dims[ua]
    const dimV = dims[va]
    const dimN = dims[axis]
    for (const dir of [1, -1]) {
      for (let n = 0; n < dimN; n++) {
        const mask = new Float64Array(dimU * dimV)
        const cellAt = [0, 0, 0]
        cellAt[axis] = n
        for (let v = 0; v < dimV; v++) {
          for (let u = 0; u < dimU; u++) {
            cellAt[ua] = u
            cellAt[va] = v
            const cell = usable(cellAt[0], cellAt[1], cellAt[2])
            if (cell === undefined) continue
            const nb = [cellAt[0], cellAt[1], cellAt[2]]
            nb[axis] = n + dir
            const inGrid =
              nb[0] >= 0 && nb[1] >= 0 && nb[2] >= 0 && nb[0] < dims[0] && nb[1] < dims[1] && nb[2] < dims[2]
            if (inGrid && usable(nb[0], nb[1], nb[2]) !== undefined) continue
            let color = cellColor(cell)
            const cut = inGrid && clipped(nb[0], nb[1], nb[2]) && model.has(nb[0], nb[1], nb[2])
            if (cut) {
              // 剖切面：去饱和提亮成「切开的新断面」，与外观面区分
              const l = 0.55
              const lum = color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722
              color = [
                (color[0] * 0.35 + lum * 0.65) * 0.55 + l * 0.55,
                (color[1] * 0.35 + lum * 0.65) * 0.55 + l * 0.55,
                (color[2] * 0.35 + lum * 0.65) * 0.55 + l * 0.55,
                color[3],
              ].map((c) => Math.min(1.6, c))
            }
            const g = cellGroup(cell)
            rawFaceByGroup[g] += 1
            const key = packColor(color) * 32 + g * 2 + (cut ? 1 : 0)
            mask[v * dimU + u] = key
          }
        }
        // 贪心合并共面同色格子
        for (let v = 0; v < dimV; v++) {
          for (let u = 0; u < dimU; u++) {
            const key = mask[v * dimU + u]
            if (!key) continue
            let w = 1
            while (u + w < dimU && mask[v * dimU + u + w] === key) w++
            let h = 1
            outer: while (v + h < dimV) {
              for (let k = 0; k < w; k++) {
                if (mask[(v + h) * dimU + u + k] !== key) break outer
              }
              h++
            }
            for (let vv = 0; vv < h; vv++)
              for (let uu = 0; uu < w; uu++) mask[(v + vv) * dimU + u + uu] = 0
            const colorKey = Math.floor(key / 32)
            const group = Math.floor((key % 32) / 2)
            pushQuad(axis, dir, n, u, v, w, h, unpackColor(colorKey), group)
          }
        }
      }
    }
  }

  const quadCenters = new Float32Array(tQuads.length * 3)
  tQuads.forEach((q, i) => {
    let cx = 0, cy = 0, cz = 0
    for (const vi of q) {
      cx += tPositions[vi * 3]
      cy += tPositions[vi * 3 + 1]
      cz += tPositions[vi * 3 + 2]
    }
    quadCenters[i * 3] = cx / 4
    quadCenters[i * 3 + 1] = cy / 4
    quadCenters[i * 3 + 2] = cz / 4
  })

  return {
    byGroup: {
      triByGroup,
      quadByGroup,
      rawFaceByGroup,
    },
    groupBuffers,
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    vertexCount: positions.length / 3,
    triCount: indices.length / 3,
    quadCount: indices.length / 6,
    triByGroup,
    quadByGroup,
    rawFaceByGroup,
    rawFaceCount: rawFaceByGroup.reduce((a, b) => a + b, 0),
    transparent: {
      positions: new Float32Array(tPositions),
      normals: new Float32Array(tNormals),
      colors: new Float32Array(tColors),
      quads: tQuads,
      centers: quadCenters,
      count: tQuads.length,
    },
  }
}

/** 透明面按相机距离从远到近排序，返回索引缓冲 */
export function sortTransparent(mesh, eye) {
  const t = mesh.transparent
  if (!t.count) return new Uint32Array(0)
  const order = new Array(t.count)
  for (let i = 0; i < t.count; i++) order[i] = i
  const d = (i) => {
    const dx = t.centers[i * 3] - eye[0]
    const dy = t.centers[i * 3 + 1] - eye[1]
    const dz = t.centers[i * 3 + 2] - eye[2]
    return dx * dx + dy * dy + dz * dz
  }
  const dists = new Float32Array(t.count)
  for (let i = 0; i < t.count; i++) dists[i] = d(i)
  order.sort((a, b) => dists[b] - dists[a])
  const idx = new Uint32Array(t.count * 6)
  for (let i = 0; i < t.count; i++) {
    const q = t.quads[order[i]]
    idx[i * 6 + 0] = q[0]
    idx[i * 6 + 1] = q[1]
    idx[i * 6 + 2] = q[2]
    idx[i * 6 + 3] = q[0]
    idx[i * 6 + 4] = q[2]
    idx[i * 6 + 5] = q[3]
  }
  return idx
}

/** 统计：体素数、按组体素数、包围盒 */
export function modelStats(model) {
  const byGroup = [0, 0, 0, 0]
  const byMat = {}
  model.forEach((x, y, z, cell) => {
    byGroup[cellGroup(cell)]++
    const m = cellMat(cell)
    byMat[m] = (byMat[m] || 0) + 1
  })
  return { count: model.count, byGroup, byMat, bounds: model.bounds() }
}

export function groupPercentages(mesh) {
  const total = mesh.triCount || 1
  return mesh.triByGroup.map((n) => (n / total) * 100)
}
