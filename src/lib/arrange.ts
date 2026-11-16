// 多选对齐与等间距分布
import type { AlignMode, DistributeMode, PathShape, Vec2 } from '../types.ts'
import { shapeBBox } from './geometry.ts'

/** 返回每个形状包围盒 + 平移函数所需数据 */
function boxes(shapes: PathShape[]) {
  return shapes.map(s => ({ s, b: shapeBBox(s) }))
}

/** 平移一个形状的全部节点 */
export function translateShape(shape: PathShape, dx: number, dy: number): PathShape {
  const move = (p: Vec2): Vec2 => ({ x: p.x + dx, y: p.y + dy })
  return {
    ...shape,
    contours: shape.contours.map(c => ({
      ...c,
      points: c.points.map(move),
      segments: c.segments.map(seg => ({
        ...seg,
        e: move(seg.e),
        ...(seg.c1 ? { c1: move(seg.c1) } : {}),
        ...(seg.c2 ? { c2: move(seg.c2) } : {}),
      })),
    })),
  }
}

/** 左右上下对齐：返回 id -> 平移量 */
export function alignShapes(
  shapes: PathShape[],
  mode: AlignMode,
): Map<string, Vec2> {
  const bs = boxes(shapes)
  const result = new Map<string, Vec2>()
  if (bs.length < 2) return result
  const minX = Math.min(...bs.map(x => x.b.minX))
  const maxX = Math.max(...bs.map(x => x.b.maxX))
  const minY = Math.min(...bs.map(x => x.b.minY))
  const maxY = Math.max(...bs.map(x => x.b.maxY))
  for (const { s, b } of bs) {
    let dx = 0, dy = 0
    switch (mode) {
      case 'left': dx = minX - b.minX; break
      case 'right': dx = maxX - b.maxX; break
      case 'hcenter': dx = (minX + maxX) / 2 - (b.minX + b.maxX) / 2; break
      case 'top': dy = maxY - b.maxY; break
      case 'bottom': dy = minY - b.minY; break
      case 'vcenter': dy = (minY + maxY) / 2 - (b.minY + b.maxY) / 2; break
    }
    result.set(s.id, { x: dx, y: dy })
  }
  return result
}

/** 等间距分布（按包围盒间距，而非中心） */
export function distributeShapes(
  shapes: PathShape[],
  mode: DistributeMode,
): Map<string, Vec2> {
  const result = new Map<string, Vec2>()
  if (shapes.length < 3) return result
  const bs = boxes(shapes)
  if (mode === 'hgap') {
    const sorted = [...bs].sort((a, b) => a.b.minX - b.b.minX)
    const total = sorted[sorted.length - 1].b.maxX - sorted[0].b.minX
    const sumSize = sorted.reduce((s, x) => s + (x.b.maxX - x.b.minX), 0)
    const gap = (total - sumSize) / (sorted.length - 1)
    let cursor = sorted[0].b.maxX
    for (let i = 1; i < sorted.length - 1; i++) {
      const targetMin = cursor + gap
      result.set(sorted[i].s.id, { x: targetMin - sorted[i].b.minX, y: 0 })
      cursor = targetMin + (sorted[i].b.maxX - sorted[i].b.minX)
    }
  } else {
    const sorted = [...bs].sort((a, b) => a.b.minY - b.b.minY)
    const total = sorted[sorted.length - 1].b.maxY - sorted[0].b.minY
    const sumSize = sorted.reduce((s, x) => s + (x.b.maxY - x.b.minY), 0)
    const gap = (total - sumSize) / (sorted.length - 1)
    let cursor = sorted[0].b.maxY
    for (let i = 1; i < sorted.length - 1; i++) {
      const targetMin = cursor + gap
      result.set(sorted[i].s.id, { x: 0, y: targetMin - sorted[i].b.minY })
      cursor = targetMin + (sorted[i].b.maxY - sorted[i].b.minY)
    }
  }
  return result
}
