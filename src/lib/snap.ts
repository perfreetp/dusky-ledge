// 拖拽吸附：网格 + 其他路径端点 + 等距参考线
import type { PathShape, Vec2 } from '../types.ts'
import { dist, ptEq } from './geometry.ts'
import { snapGrid } from './utils.ts'

export interface SnapGuide {
  kind: 'x' | 'y' | 'point' | 'equidistant'
  /** 参考线坐标（x 或 y），point 为点坐标 */
  pos: Vec2
  /** 等距参考线的另两个锚点 */
  anchors?: [Vec2, Vec2]
}

export interface SnapResult {
  point: Vec2
  guides: SnapGuide[]
  /** 实际采用的吸附来源描述 */
  source: string
}

const SNAP_PX = 12 // 屏幕像素吸附半径，调用方换算成世界距离

/** 收集文档中除被拖形状外的全部节点（吸附目标端点） */
export function collectEndpoints(shapes: PathShape[], excludeIds: Set<string>): Vec2[] {
  const pts: Vec2[] = []
  for (const s of shapes) {
    if (excludeIds.has(s.id)) continue
    for (const c of s.contours) for (const p of c.points) pts.push(p)
  }
  return pts
}

/**
 * 对拖拽点做综合吸附。
 * @param world 拖拽点世界坐标
 * @param threshold 世界坐标吸附阈值（由屏幕像素换算）
 * @param gridSize 网格尺寸（毫米），<=0 关闭
 * @param endpoints 其它路径端点
 * @param movedRefs 本次拖拽中形状的原始节点（用于等距参考）
 */
export function snapPoint(
  world: Vec2,
  threshold: number,
  gridSize: number,
  endpoints: Vec2[],
  movedRefs: Vec2[] = [],
): SnapResult {
  const guides: SnapGuide[] = []
  let best: Vec2 = { ...world }
  let bestD = threshold
  let source = ''

  // 1) 端点吸附（含 x/y 单轴投影）
  for (const ep of endpoints) {
    const d = dist(world, ep)
    if (d < bestD) { bestD = d; best = { ...ep }; source = '端点' }
    if (Math.abs(world.x - ep.x) < threshold) {
      guides.push({ kind: 'x', pos: { x: ep.x, y: world.y } })
    }
    if (Math.abs(world.y - ep.y) < threshold) {
      guides.push({ kind: 'y', pos: { x: world.x, y: ep.y } })
    }
  }
  if (source === '端点') guides.push({ kind: 'point', pos: best })

  // 2) 等距参考线：当拖拽点与两个已存在锚点形成等间距时提示
  if (movedRefs.length && endpoints.length) {
    for (const anchor of endpoints) {
      for (const ref of movedRefs) {
        // 预测点 p 满足 |p - anchor| = |anchor - ref|（一维投影等距）
        const px = 2 * anchor.x - ref.x
        const py = 2 * anchor.y - ref.y
        if (Math.abs(world.x - px) < threshold && Math.abs(world.y - anchor.y) < threshold * 2) {
          guides.push({ kind: 'equidistant', pos: { x: px, y: anchor.y }, anchors: [ref, anchor] })
          if (Math.abs(world.x - px) < bestD) { bestD = Math.abs(world.x - px); best = { x: px, y: world.y }; source = '等距' }
        }
        if (Math.abs(world.y - py) < threshold && Math.abs(world.x - anchor.x) < threshold * 2) {
          guides.push({ kind: 'equidistant', pos: { x: anchor.x, y: py }, anchors: [ref, anchor] })
          if (Math.abs(world.y - py) < bestD) { bestD = Math.abs(world.y - py); best = { x: world.x, y: py }; source = '等距' }
        }
      }
    }
  }

  // 3) 网格吸附（优先级最低，仅当没有更强吸附时）
  if (gridSize > 0 && !source) {
    const g = { x: snapGrid(world.x, gridSize), y: snapGrid(world.y, gridSize) }
    if (dist(world, g) <= threshold) {
      best = g
      source = '网格'
      guides.push({ kind: 'x', pos: { x: g.x, y: world.y } })
      guides.push({ kind: 'y', pos: { x: world.x, y: g.y } })
    }
  }

  // 去重参考线
  const seen = new Set<string>()
  const uniq = guides.filter(g => {
    const k = `${g.kind}:${Math.round(g.pos.x * 100)},${Math.round(g.pos.y * 100)}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  void ptEq
  return { point: best, guides: uniq, source }
}

export { SNAP_PX }
