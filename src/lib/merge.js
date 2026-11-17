// 减面：同色体素的贪心网格合并（只保留暴露面）+ 大长方体合并
import { keyOf, parseKey, boundsOf } from './voxel.js'

/**
 * 贪心网格合并：遍历三个轴的切片，把同色相邻暴露面合并成大四边形
 * 返回 quads: [{axis(0=x,1=y,2=z), sign(+1/-1), x,y,z, w,h, color}]
 */
export function greedyMesh (model) {
  const b = boundsOf(model)
  if (!b) return { quads: [], exposedFaces: 0, mergedFaces: 0 }
  const { minX, minY, minZ, maxX, maxY, maxZ } = b
  const sx = maxX - minX + 1, sy = maxY - minY + 1, sz = maxZ - minZ + 1
  const at = (x, y, z) => model.voxels.get(keyOf(x, y, z)) // undefined = 空
  const quads = []
  let exposedFaces = 0

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3
    const v = (d + 2) % 3
    const dims = [sx, sy, sz]
    const maskW = dims[u], maskH = dims[v]
    const mask = new Int16Array(maskW * maskH)
    const p = [0, 0, 0]
    const layers = dims[d]

    for (let ld = -1; ld < layers; ld++) {
      // 1) 生成面掩码：两侧颜色不同则成面
      for (let lv = 0; lv < maskH; lv++) {
        for (let lu = 0; lu < maskW; lu++) {
          p[d] = ld; p[u] = lu; p[v] = lv
          const a = at(minX + p[0], minY + p[1], minZ + p[2])
          p[d] = ld + 1
          const bcol = at(minX + p[0], minY + p[1], minZ + p[2])
          const ca = a === undefined ? -1 : a
          const cb = bcol === undefined ? -1 : bcol
          if (ca === cb) {
            mask[lu + lv * maskW] = 0
          } else if (cb !== -1) {
            mask[lu + lv * maskW] = cb + 1 // 正面（+d 方向），值=颜色+1
          } else {
            mask[lu + lv * maskW] = -(ca + 1) // 背面，负值
          }
        }
      }

      // 2) 掩码矩形贪心合并
      let lv = 0
      while (lv < maskH) {
        let lu = 0
        while (lu < maskW) {
          const cur = mask[lu + lv * maskW]
          if (!cur) { lu++; continue }
          // 横向扩宽
          let w = 1
          while (lu + w < maskW && mask[lu + w + lv * maskW] === cur) w++
          // 纵向扩高
          let h = 1
          outer:
          while (lv + h < maskH) {
            for (let k = 0; k < w; k++) {
              if (mask[lu + k + (lv + h) * maskW] !== cur) break outer
            }
            h++
          }
          const sign = cur > 0 ? 1 : -1
          const color = (cur > 0 ? cur - 1 : -cur - 1)
          const origin = [0, 0, 0]
          origin[d] = ld + (sign > 0 ? 1 : 0)
          origin[u] = lu
          origin[v] = lv
          quads.push({
            axis: d, sign,
            x: minX + origin[0], y: minY + origin[1], z: minZ + origin[2],
            w, h, color
          })
          exposedFaces += w * h
          for (let k = 0; k < h; k++) {
            for (let j = 0; j < w; j++) mask[lu + j + (lv + k) * maskW] = 0
          }
          lu += w
        }
        lv++
      }
    }
  }
  return { quads, exposedFaces, mergedFaces: quads.length }
}

/**
 * 大长方体合并：反复取首个体素，沿三轴扩张到最大同色实心盒，取出
 * 返回 [{x,y,z,w,h,d,color,count}]（count=包含体素数）
 */
export function mergeCuboids (model) {
  const remain = new Map(model.voxels)
  const boxes = []
  while (remain.size) {
    const firstKey = remain.keys().next().value
    const { x, y, z } = parseKey(firstKey)
    const color = remain.get(firstKey)
    let x0 = x, x1 = x, y0 = y, y1 = y, z0 = z, z1 = z
    let grew = true
    const solid = (a, b, c) => remain.get(keyOf(a, b, c)) === color
    while (grew) {
      grew = false
      // 扩 -X
      if (x0 > 0) {
        let ok = true
        for (let b = y0; b <= y1 && ok; b++) for (let c = z0; c <= z1; c++) if (!solid(x0 - 1, b, c)) ok = false
        if (ok) { x0--; grew = true }
      }
      // 扩 +X
      {
        let ok = true
        for (let b = y0; b <= y1 && ok; b++) for (let c = z0; c <= z1; c++) if (!solid(x1 + 1, b, c)) ok = false
        if (ok) { x1++; grew = true }
      }
      // 扩 -Y
      if (y0 > 0) {
        let ok = true
        for (let a = x0; a <= x1 && ok; a++) for (let c = z0; c <= z1; c++) if (!solid(a, y0 - 1, c)) ok = false
        if (ok) { y0--; grew = true }
      }
      // 扩 +Y
      {
        let ok = true
        for (let a = x0; a <= x1 && ok; a++) for (let c = z0; c <= z1; c++) if (!solid(a, y1 + 1, c)) ok = false
        if (ok) { y1++; grew = true }
      }
      // 扩 -Z
      if (z0 > 0) {
        let ok = true
        for (let a = x0; a <= x1 && ok; a++) for (let b = y0; b <= y1; b++) if (!solid(a, b, z0 - 1)) ok = false
        if (ok) { z0--; grew = true }
      }
      // 扩 +Z
      {
        let ok = true
        for (let a = x0; a <= x1 && ok; a++) for (let b = y0; b <= y1; b++) if (!solid(a, b, z1 + 1)) ok = false
        if (ok) { z1++; grew = true }
      }
    }
    for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) for (let c = z0; c <= z1; c++) remain.delete(keyOf(a, b, c))
    boxes.push({
      x: x0, y: y0, z: z0,
      w: x1 - x0 + 1, h: y1 - y0 + 1, d: z1 - z0 + 1,
      color, count: (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1)
    })
  }
  boxes.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x)
  return boxes
}

/** 逐体素统计原始暴露面数（减面前的基准） */
export function rawExposedFaces (model) {
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
  let n = 0
  for (const k of model.voxels.keys()) {
    const { x, y, z } = parseKey(k)
    for (const [dx, dy, dz] of dirs) {
      if (!model.voxels.has(keyOf(x + dx, y + dy, z + dz))) n++
    }
  }
  return n
}
