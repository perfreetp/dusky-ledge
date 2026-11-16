// 版本对比：新旧轮廓叠加，计算差异段（采样折线中远离另一版本的部分）
import type { Doc, Vec2 } from '../types.ts'
import { dist, sampleContour } from './geometry.ts'

export interface DiffResult {
  /** 旧版本相对新版本的差异段（红色高亮） */
  removed: Vec2[][]
  /** 新版本相对旧版本的差异段 */
  added: Vec2[][]
  /** 差异总长度（毫米），用于量化变化 */
  diffLength: number
}

function allPolys(doc: Doc, tol = 1): Vec2[][] {
  return doc.shapes
    .filter(s => doc.layers.find(l => l.id === s.layerId)?.visible !== false)
    .flatMap(s => s.contours.map(c => sampleContour(c, tol)))
}

function distPointToPoly(p: Vec2, poly: Vec2[]): number {
  let min = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const dx = b.x - a.x, dy = b.y - a.y
    const l2 = dx * dx + dy * dy
    if (l2 < 1e-12) { min = Math.min(min, dist(p, a)); continue }
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2
    t = Math.max(0, Math.min(1, t))
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
    if (d < min) min = d
  }
  return min
}

function distToPolys(p: Vec2, polys: Vec2[][]): number {
  let min = Infinity
  for (const poly of polys) min = Math.min(min, distPointToPoly(p, poly))
  return min
}

/** 差异判定阈值：取网格的 5%，并夹在 [1, 20] mm，避免漏判小幅真实变更 */
function threshold(oldDoc: Doc, newDoc: Doc): number {
  const g = Math.min(oldDoc.gridSize, newDoc.gridSize)
  return Math.max(1, Math.min(20, g * 0.05))
}

/** 把一条折线按“是否远离另一版本”切成若干差异小段 */
function diffSegments(poly: Vec2[], other: Vec2[][], th: number): Vec2[][] {
  const segs: Vec2[][] = []
  let cur: Vec2[] = []
  let segLen = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const far = distToPolys(p, other) > th
    if (far) {
      if (cur.length) segLen += dist(cur[cur.length - 1], p)
      cur.push(p)
    } else if (cur.length > 1) {
      if (segLen > th) segs.push(cur)
      cur = []; segLen = 0
    } else {
      cur = []; segLen = 0
    }
  }
  if (cur.length > 1 && segLen > th) segs.push(cur)
  return segs
}

export function diffDocs(oldDoc: Doc, newDoc: Doc): DiffResult {
  const th = threshold(oldDoc, newDoc)
  const oldPolys = allPolys(oldDoc)
  const newPolys = allPolys(newDoc)
  const removed = oldPolys.flatMap(p => diffSegments(p, newPolys, th))
  const added = newPolys.flatMap(p => diffSegments(p, oldPolys, th))
  const lengthOf = (segs: Vec2[][]) =>
    segs.reduce((s, seg) => s + seg.reduce((a, p, i) => i ? a + dist(p, seg[i - 1]) : a, 0), 0)
  return {
    removed,
    added,
    diffLength: lengthOf(removed) + lengthOf(added),
  }
}
