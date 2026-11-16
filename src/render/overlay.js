import { CELL_SIZE } from '../voxel/model.js'
import { boxCornersWorld, BOX_EDGES, boxFromPoints } from '../voxel/geometry.js'

const OFFSET = (model) => [-model.sx / 2, 0, -model.sz / 2]

export function cellWorld(model, v, pad = 0) {
  const o = OFFSET(model)
  const x0 = (v[0] + o[0]) * CELL_SIZE - pad
  const y0 = v[1] * CELL_SIZE - pad
  const z0 = (v[2] + o[2]) * CELL_SIZE - pad
  return {
    min: [x0, y0, z0],
    max: [x0 + CELL_SIZE + pad * 2, y0 + CELL_SIZE + pad * 2, z0 + CELL_SIZE + pad * 2],
  }
}

function edgesOf(min, max) {
  const c = [
    [min[0], min[1], min[2]],
    [max[0], min[1], min[2]],
    [max[0], min[1], max[2]],
    [min[0], min[1], max[2]],
    [min[0], max[1], min[2]],
    [max[0], max[1], min[2]],
    [max[0], max[1], max[2]],
    [min[0], max[1], max[2]],
  ]
  return BOX_EDGES.map(([a, b]) => [c[a], c[b]])
}

export function buildOverlay(model, opts) {
  const lines = []
  const {
    showGrid,
    hover,
    hoverPlace,
    showEdges,
    selection,
    clipboard,
    clipboardTarget,
    clipboardCollision,
    clipboardOutOfBounds,
    mirrorOn,
    mirrorAxis,
    sectionOn,
    section,
  } = opts

  // 地面网格
  if (showGrid) {
    const o = OFFSET(model)
    const x0 = (o[0]) * CELL_SIZE
    const x1 = (o[0] + model.sx) * CELL_SIZE
    const z0 = (o[2]) * CELL_SIZE
    const z1 = (o[2] + model.sz) * CELL_SIZE
    const step = CELL_SIZE
    const nx = model.sx
    const nz = model.sz
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * step
      const major = i % 2 === 0
      lines.push({ a: [x, 0, z0], b: [x, 0, z1], color: major ? [0.34, 0.40, 0.48, 1] : [0.22, 0.27, 0.33, 1], width: major ? 1.1 : 0.9, xray: true })
    }
    for (let i = 0; i <= nz; i++) {
      const z = z0 + i * step
      const major = i % 2 === 0
      lines.push({ a: [x0, 0, z], b: [x1, 0, z], color: major ? [0.34, 0.40, 0.48, 1] : [0.22, 0.27, 0.33, 1], width: major ? 1.1 : 0.9, xray: true })
    }
    // 台面边框
    lines.push({ a: [x0, 0, z0], b: [x1, 0, z0], color: [0.42, 0.5, 0.6, 0.9], width: 2.0 })
    lines.push({ a: [x1, 0, z0], b: [x1, 0, z1], color: [0.42, 0.5, 0.6, 0.9], width: 2.0 })
    lines.push({ a: [x1, 0, z1], b: [x0, 0, z1], color: [0.42, 0.5, 0.6, 0.9], width: 2.0 })
    lines.push({ a: [x0, 0, z1], b: [x0, 0, z0], color: [0.42, 0.5, 0.6, 0.9], width: 2.0 })
  }

  // 工作台空间外框（顶面）
  {
    const o = OFFSET(model)
    const min = [o[0] * CELL_SIZE, 0, o[2] * CELL_SIZE]
    const max = [(o[0] + model.sx) * CELL_SIZE, model.sy * CELL_SIZE, (o[2] + model.sz) * CELL_SIZE]
    for (const [a, b] of edgesOf(min, max)) {
      // 只画顶面和竖直棱，避免干扰地面
      const top = a[1] === max[1] && b[1] === max[1]
      const vert = a[0] === b[0] && a[2] === b[2]
      if (!top && !vert) continue
      lines.push({ a, b, color: [0.34, 0.40, 0.48, 0.55], width: 1.1 })
    }
  }

  // 悬停格描边
  if (showEdges && hover) {
    const { min, max } = cellWorld(model, hover, 0.004)
    for (const [a, b] of edgesOf(min, max)) {
      lines.push({ a, b, color: [1, 1, 1, 0.32], width: 1.0 })
    }
  }

  // 落点格（实心高亮边）
  if (hoverPlace) {
    const { min, max } = cellWorld(model, hoverPlace, 0.012)
    for (const [a, b] of edgesOf(min, max)) {
      lines.push({ a, b, color: [1.0, 0.86, 0.42, 0.95], width: 2.2, dash: 0 })
    }
  }

  // 选区
  if (selection) {
    const corners = boxCornersWorld(model, selection, CELL_SIZE, 0.01)
    for (const [ai, bi] of BOX_EDGES) {
      lines.push({ a: corners[ai], b: corners[bi], color: [0.42, 0.86, 1.0, 0.95], width: 1.8, xray: false })
    }
  }

  // 剪贴板落点包围盒
  if (clipboard) {
    const box = {
      min: clipboardTarget,
      max: [
        clipboardTarget[0] + clipboard.size[0] - 1,
        clipboardTarget[1] + clipboard.size[1] - 1,
        clipboardTarget[2] + clipboard.size[2] - 1,
      ],
    }
    const corners = boxCornersWorld(model, box, CELL_SIZE, 0.015)
    const tone =
      clipboardOutOfBounds || clipboardCollision > 0 ? [1.0, 0.36, 0.34, 0.98] : [0.42, 1.0, 0.62, 0.98]
    for (const [ai, bi] of BOX_EDGES) {
      lines.push({ a: corners[ai], b: corners[bi], color: tone, width: 2.4, dash: 1 })
    }
    // 落点底面十字标记
    const c = [
      (corners[0][0] + corners[6][0]) / 2,
      0.005,
      (corners[0][2] + corners[6][2]) / 2,
    ]
    lines.push({ a: [c[0] - 0.18, c[1], c[2]], b: [c[0] + 0.18, c[1], c[2]], color: tone, width: 1.6 })
    lines.push({ a: [c[0], c[1], c[2] - 0.18], b: [c[0], c[1], c[2] + 0.18], color: tone, width: 1.6 })

    // 镜像后的落点也标出来
    if (mirrorOn) {
      const dims = { x: model.sx, y: model.sy, z: model.sz }
      const m0 = mirrorV(dims, clipboardTarget, mirrorAxis)
      const mbox = {
        min: m0,
        max: [m0[0] + box.max[0] - box.min[0], m0[1] + box.max[1] - box.min[1], m0[2] + box.max[2] - box.min[2]],
      }
      const mc = boxCornersWorld(model, mbox, CELL_SIZE, 0.015)
      for (const [ai, bi] of BOX_EDGES) {
        lines.push({ a: mc[ai], b: mc[bi], color: [0.86, 0.64, 1.0, 0.75], width: 1.8, dash: 1 })
      }
    }
  }

  // 切片平面
  if (sectionOn) {
    const o = OFFSET(model)
    const min = [o[0] * CELL_SIZE, 0, o[2] * CELL_SIZE]
    const max = [(o[0] + model.sx) * CELL_SIZE, model.sy * CELL_SIZE, (o[2] + model.sz) * CELL_SIZE]
    const planeColor = [1.0, 0.68, 0.30, 0.9]
    const fillColor = [1.0, 0.68, 0.30, 0.09]
    const drawPlane = (corners, uCount, vCount, uMin, vMin, uDir, vDir) => {
      for (let i = 0; i < 4; i++) {
        lines.push({ a: corners[i], b: corners[(i + 1) % 4], color: planeColor, width: 1.8, dash: 1 })
      }
      for (let i = 1; i < uCount; i++) {
        const a = corners[0]
        const b = corners[3]
        lines.push({
          a: [a[0] + uDir[0] * i * CELL_SIZE, a[1] + uDir[1] * i * CELL_SIZE, a[2] + uDir[2] * i * CELL_SIZE],
          b: [b[0] + uDir[0] * i * CELL_SIZE, b[1] + uDir[1] * i * CELL_SIZE, b[2] + uDir[2] * i * CELL_SIZE],
          color: fillColor,
          width: 1.0,
        })
      }
    }
    if (section.x) {
      const x = (o[0] + section.x.at + (section.x.dir === 'min' ? 1 : 0)) * CELL_SIZE
      const corners = [
        [x, min[1], min[2]],
        [x, max[1], min[2]],
        [x, max[1], max[2]],
        [x, min[1], max[2]],
      ]
      for (let i = 0; i < 4; i++) lines.push({ a: corners[i], b: corners[(i + 1) % 4], color: planeColor, width: 1.8, dash: 1 })
      for (let y = 1; y < model.sy; y++) {
        lines.push({ a: [x, min[1] + y * CELL_SIZE, min[2]], b: [x, min[1] + y * CELL_SIZE, max[2]], color: fillColor, width: 1.0 })
      }
    }
    if (section.y) {
      const y = (section.y.at + (section.y.dir === 'min' ? 1 : 0)) * CELL_SIZE
      const corners = [
        [min[0], y, min[2]],
        [max[0], y, min[2]],
        [max[0], y, max[2]],
        [min[0], y, max[2]],
      ]
      for (let i = 0; i < 4; i++) lines.push({ a: corners[i], b: corners[(i + 1) % 4], color: planeColor, width: 1.8, dash: 1 })
      for (let x = 1; x < model.sx; x++) {
        lines.push({ a: [min[0] + x * CELL_SIZE, y, min[2]], b: [min[0] + x * CELL_SIZE, y, max[2]], color: fillColor, width: 1.0 })
      }
    }
    if (section.z) {
      const z = (o[2] + section.z.at + (section.z.dir === 'min' ? 1 : 0)) * CELL_SIZE
      const corners = [
        [min[0], min[1], z],
        [max[0], min[1], z],
        [max[0], max[1], z],
        [min[0], max[1], z],
      ]
      for (let i = 0; i < 4; i++) lines.push({ a: corners[i], b: corners[(i + 1) % 4], color: planeColor, width: 1.8, dash: 1 })
      for (let y = 1; y < model.sy; y++) {
        lines.push({ a: [min[0], min[1] + y * CELL_SIZE, z], b: [max[0], min[1] + y * CELL_SIZE, z], color: fillColor, width: 1.0 })
      }
    }
  }

  // 镜像参考面
  if (mirrorOn) {
    const o = OFFSET(model)
    const min = [o[0] * CELL_SIZE, 0, o[2] * CELL_SIZE]
    const max = [(o[0] + model.sx) * CELL_SIZE, model.sy * CELL_SIZE, (o[2] + model.sz) * CELL_SIZE]
    const color = [0.86, 0.64, 1.0, 0.5]
    if (mirrorAxis === 'x') {
      const x = (o[0] + model.sx / 2) * CELL_SIZE
      lines.push({ a: [x, min[1], min[2]], b: [x, max[1], min[2]], color, width: 1.4, dash: 1 })
      lines.push({ a: [x, max[1], min[2]], b: [x, max[1], max[2]], color, width: 1.4, dash: 1 })
      lines.push({ a: [x, min[1], max[2]], b: [x, max[1], max[2]], color, width: 1.4, dash: 1 })
      lines.push({ a: [x, min[1], min[2]], b: [x, min[1], max[2]], color, width: 1.4, dash: 1 })
    } else if (mirrorAxis === 'z') {
      const z = (o[2] + model.sz / 2) * CELL_SIZE
      lines.push({ a: [min[0], min[1], z], b: [max[0], min[1], z], color, width: 1.4, dash: 1 })
      lines.push({ a: [max[0], min[1], z], b: [max[0], max[1], z], color, width: 1.4, dash: 1 })
      lines.push({ a: [max[0], max[1], z], b: [min[0], max[1], z], color, width: 1.4, dash: 1 })
      lines.push({ a: [min[0], max[1], z], b: [min[0], min[1], z], color, width: 1.4, dash: 1 })
    } else {
      const y = (model.sy / 2) * CELL_SIZE
      lines.push({ a: [min[0], y, min[2]], b: [max[0], y, min[2]], color, width: 1.4, dash: 1 })
      lines.push({ a: [max[0], y, min[2]], b: [max[0], y, max[2]], color, width: 1.4, dash: 1 })
      lines.push({ a: [max[0], y, max[2]], b: [min[0], y, max[2]], color, width: 1.4, dash: 1 })
      lines.push({ a: [min[0], y, max[2]], b: [min[0], y, min[2]], color, width: 1.4, dash: 1 })
    }
  }

  return lines
}

export function mirrorV(dims, v, axis) {
  if (axis === 'x') return [dims.x - 1 - v[0], v[1], v[2]]
  if (axis === 'y') return [v[0], dims.y - 1 - v[1], v[2]]
  return [v[0], v[1], dims.z - 1 - v[2]]
}
