// 相邻同色体素合并(贪心网格化)+ 顶点聚类减面

// 贪心合并:同一平面上相邻且同材质的体素面合并成大矩形
// 返回 { positions, normals, colors, indices, faceCount },单位:米
export function meshGreedy(model, colorOf) {
  const dims = [model.nx, model.ny, model.nz]
  const cell = model.cell
  const data = model.data
  const nx = dims[0], ny = dims[1], nz = dims[2]
  const at = (x, y, z) => data[(y * nz + z) * nx + x]

  const positions = []
  const normals = []
  const colors = []
  const indices = []

  const x = [0, 0, 0]
  const q = [0, 0, 0]

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3
    const v = (d + 2) % 3
    const du = dims[u]
    const dv = dims[v]
    const mask = new Int32Array(du * dv)
    q[0] = q[1] = q[2] = 0
    q[d] = 1

    for (x[d] = -1; x[d] < dims[d];) {
      // 生成当前切片的遮罩:正数=正向面(材质 id),负数=反向面
      let n = 0
      for (x[v] = 0; x[v] < dv; x[v]++) {
        for (x[u] = 0; x[u] < du; x[u]++, n++) {
          const a = x[d] >= 0 ? at(x[0], x[1], x[2]) : 0
          const b = x[d] < dims[d] - 1 ? at(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0
          mask[n] = a === b ? 0 : a !== 0 ? a : -b
        }
      }
      x[d]++

      n = 0
      for (let j = 0; j < dv; j++) {
        for (let i = 0; i < du;) {
          const c = mask[n]
          if (!c) { i++; n++; continue }
          // 沿 u 方向扩展宽度
          let w = 1
          while (i + w < du && mask[n + w] === c) w++
          // 沿 v 方向扩展高度
          let h = 1
          outer: for (; j + h < dv; h++) {
            for (let k = 0; k < w; k++) {
              if (mask[n + k + h * du] !== c) break outer
            }
          }
          // 清掉已合并的遮罩
          for (let jj = 0; jj < h; jj++)
            for (let ii = 0; ii < w; ii++) mask[n + ii + jj * du] = 0

          x[u] = i
          x[v] = j
          const duu = [0, 0, 0]; duu[u] = w
          const dvv = [0, 0, 0]; dvv[v] = h
          const mat = c > 0 ? c : -c
          const col = colorOf(mat)
          const base = positions.length / 3

          // 四个角点(体素坐标,稍后乘 cell)
          const corners = [
            [x[0], x[1], x[2]],
            [x[0] + duu[0], x[1] + duu[1], x[2] + duu[2]],
            [x[0] + duu[0] + dvv[0], x[1] + duu[1] + dvv[1], x[2] + duu[2] + dvv[2]],
            [x[0] + dvv[0], x[1] + dvv[1], x[2] + dvv[2]]
          ]
          const nrm = [0, 0, 0]
          nrm[d] = c > 0 ? 1 : -1
          // c<0 时翻转顶点顺序保持正面朝外
          const order = c > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1]
          for (const oi of order) {
            const p = corners[oi]
            positions.push(p[0] * cell, p[1] * cell, p[2] * cell)
            normals.push(nrm[0], nrm[1], nrm[2])
            colors.push(col[0], col[1], col[2])
          }
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3)

          i += w
          n += w
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: positions.length / 3 > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
    faceCount: indices.length / 3
  }
}

// 顶点聚类减面:ratio 0~1,越大聚类栅格越粗、面数越少
export function decimateMesh(geo, cellWorld, ratio) {
  if (ratio <= 0 || geo.faceCount === 0) return geo
  const grid = cellWorld * (1 + ratio * 6)
  const pos = geo.positions
  const col = geo.colors
  const idx = geo.indices

  // 第一遍:把顶点分配到聚类栅格
  const clusters = new Map() // key -> {sx,sy,sz,cr,cg,cb,count}
  const keys = new Array(pos.length / 3)
  for (let i = 0, vi = 0; i < pos.length; i += 3, vi++) {
    const key =
      Math.floor(pos[i] / grid) + ',' +
      Math.floor(pos[i + 1] / grid) + ',' +
      Math.floor(pos[i + 2] / grid)
    keys[vi] = key
    let c = clusters.get(key)
    if (!c) {
      c = { sx: 0, sy: 0, sz: 0, cr: 0, cg: 0, cb: 0, count: 0 }
      clusters.set(key, c)
    }
    c.sx += pos[i]; c.sy += pos[i + 1]; c.sz += pos[i + 2]
    c.cr += col[i]; c.cg += col[i + 1]; c.cb += col[i + 2]
    c.count++
  }

  // 第二遍:给聚类编号,生成代表顶点(位置/颜色取均值)
  const clusterIndex = new Map()
  const n = clusters.size
  const outPos = new Float32Array(n * 3)
  const outCol = new Float32Array(n * 3)
  {
    let k = 0
    for (const [key, c] of clusters) {
      clusterIndex.set(key, k)
      outPos[k * 3] = c.sx / c.count
      outPos[k * 3 + 1] = c.sy / c.count
      outPos[k * 3 + 2] = c.sz / c.count
      outCol[k * 3] = c.cr / c.count
      outCol[k * 3 + 1] = c.cg / c.count
      outCol[k * 3 + 2] = c.cb / c.count
      k++
    }
  }
  const remap = new Uint32Array(keys.length)
  for (let i = 0; i < keys.length; i++) remap[i] = clusterIndex.get(keys[i])

  // 重建三角形:跳过退化三角形并按顶点组合去重
  const outIdx = []
  const seen = new Set()
  for (let t = 0; t < idx.length; t += 3) {
    const a = remap[idx[t]]
    const b = remap[idx[t + 1]]
    const c = remap[idx[t + 2]]
    if (a === b || b === c || a === c) continue
    const lo = Math.min(a, b, c)
    const hi = Math.max(a, b, c)
    const mid = a + b + c - lo - hi
    const key = lo + '_' + mid + '_' + hi
    if (seen.has(key)) continue
    seen.add(key)
    outIdx.push(a, b, c)
  }

  // 重新计算法线(面积加权平均)
  const outNrm = new Float32Array(n * 3)
  for (let t = 0; t < outIdx.length; t += 3) {
    const a = outIdx[t] * 3, b = outIdx[t + 1] * 3, c = outIdx[t + 2] * 3
    const abx = outPos[b] - outPos[a], aby = outPos[b + 1] - outPos[a + 1], abz = outPos[b + 2] - outPos[a + 2]
    const acx = outPos[c] - outPos[a], acy = outPos[c + 1] - outPos[a + 1], acz = outPos[c + 2] - outPos[a + 2]
    const cx = aby * acz - abz * acy
    const cy = abz * acx - abx * acz
    const cz = abx * acy - aby * acx
    outNrm[a] += cx; outNrm[a + 1] += cy; outNrm[a + 2] += cz
    outNrm[b] += cx; outNrm[b + 1] += cy; outNrm[b + 2] += cz
    outNrm[c] += cx; outNrm[c + 1] += cy; outNrm[c + 2] += cz
  }
  for (let i = 0; i < outNrm.length; i += 3) {
    const l = Math.hypot(outNrm[i], outNrm[i + 1], outNrm[i + 2]) || 1
    outNrm[i] /= l; outNrm[i + 1] /= l; outNrm[i + 2] /= l
  }

  const indices = n > 65535 ? new Uint32Array(outIdx) : new Uint16Array(outIdx)
  return {
    positions: outPos,
    normals: outNrm,
    colors: outCol,
    indices,
    faceCount: outIdx.length / 3
  }
}
