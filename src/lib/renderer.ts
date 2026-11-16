// Canvas2D 渲染器：网格、图层轮廓、控制点、吸附参考线、批注、版本叠加
import type { Annotation, Doc, PathShape, Vec2 } from '../types.ts'
import {
  arcGeom, cubicPoint, sampleContour, shapeBBox, shapeMetrics,
} from './geometry.ts'
import { fmtArea, fmtPerim, fmtMm } from './utils.ts'
import type { SnapGuide } from './snap.ts'
import type { ViewApi } from './view.ts'

export interface RenderOptions {
  doc: Doc
  selection: Set<string>
  activeNode: { shapeId: string; contourIdx: number; pointIdx: number } | null
  showGrid: boolean
  guides: SnapGuide[]
  annotations: Annotation[]
  /** 版本对比：半透明叠加的另一版本文档 */
  overlay?: { doc: Doc; alpha: number; diffPaths?: Vec2[][][] }
  hoverShapeId?: string | null
  width: number
  height: number
}

const HANDLE_PX = 5
const SNAP_COLOR = '#f59e0b'

export function renderCanvas(canvas: HTMLCanvasElement, viewApi: ViewApi, opts: RenderOptions) {
  const ctx = canvas.getContext('2d')!
  const { view, toScreen } = viewApi
  const dpr = window.devicePixelRatio || 1
  const w = opts.width, h = opts.height
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  // 背景
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, h)

  if (opts.showGrid) drawGrid(ctx, viewApi, w, h, opts.doc.gridSize)
  drawAxes(ctx, viewApi, w, h)

  // 版本对比半透明叠加（旧轮廓）
  if (opts.overlay) {
    ctx.save()
    ctx.globalAlpha = opts.overlay.alpha
    for (const s of opts.overlay.doc.shapes) {
      const layer = opts.overlay.doc.layers.find(l => l.id === s.layerId)
      if (layer?.visible === false) continue
      drawShape(ctx, viewApi, s, '#94a3b8', false)
    }
    ctx.restore()
    // 差异段高亮
    if (opts.overlay.diffPaths) drawDiff(ctx, viewApi, opts.overlay.diffPaths)
  }

  // 当前文档轮廓
  for (const s of opts.doc.shapes) {
    const layer = opts.doc.layers.find(l => l.id === s.layerId)
    if (layer?.visible === false) continue
    const selected = opts.selection.has(s.id)
    const hover = opts.hoverShapeId === s.id
    drawShape(ctx, viewApi, s, layer?.color ?? '#2563eb', selected, hover)
  }

  // 控制点（仅选中形状）
  for (const s of opts.doc.shapes) {
    if (!opts.selection.has(s.id)) continue
    drawHandles(ctx, viewApi, s, opts.activeNode)
  }

  // 吸附参考线
  drawGuides(ctx, viewApi, opts.guides, w, h)

  // 批注打点
  drawAnnotations(ctx, viewApi, opts.annotations)

  // 选中轮廓的面积/周长标注
  drawMetrics(ctx, viewApi, opts.doc, opts.selection)
}

function drawGrid(ctx: CanvasRenderingContext2D, viewApi: ViewApi, w: number, h: number, grid: number) {
  const { view, toWorld, toScreen } = viewApi
  const vw = view()
  const tl = toWorld({ x: 0, y: 0 }), br = toWorld({ x: w, y: h })
  const startX = Math.floor(tl.x / grid) * grid
  const startY = Math.floor(tl.y / grid) * grid
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(148,163,184,0.12)'
  ctx.beginPath()
  for (let x = startX; x <= br.x; x += grid) {
    const sx = toScreen({ x, y: 0 }).x
    ctx.moveTo(sx, 0); ctx.lineTo(sx, h)
  }
  for (let y = startY; y >= br.y; y -= grid) {
    const sy = toScreen({ x: 0, y }).y
    ctx.moveTo(0, sy); ctx.lineTo(w, sy)
  }
  ctx.stroke()
  // 主网格（每 5 格）亮一点
  ctx.strokeStyle = 'rgba(148,163,184,0.22)'
  ctx.beginPath()
  const big = grid * 5
  for (let x = Math.floor(tl.x / big) * big; x <= br.x; x += big) {
    const sx = toScreen({ x, y: 0 }).x
    ctx.moveTo(sx, 0); ctx.lineTo(sx, h)
  }
  for (let y = Math.floor(tl.y / big) * big; y >= br.y; y -= big) {
    const sy = toScreen({ x: 0, y }).y
    ctx.moveTo(0, sy); ctx.lineTo(w, sy)
  }
  ctx.stroke()
  void vw
}

function drawAxes(ctx: CanvasRenderingContext2D, viewApi: ViewApi, w: number, h: number) {
  const o = viewApi.toScreen({ x: 0, y: 0 })
  ctx.strokeStyle = 'rgba(226,232,240,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, o.y); ctx.lineTo(w, o.y)
  ctx.moveTo(o.x, 0); ctx.lineTo(o.x, h)
  ctx.stroke()
  ctx.fillStyle = 'rgba(226,232,240,0.5)'
  ctx.font = '10px sans-serif'
  ctx.fillText('x (mm)', w - 40, o.y - 4)
  ctx.fillText('y (mm)', o.x + 4, 12)
}

function traceContour(ctx: CanvasRenderingContext2D, viewApi: ViewApi, shape: PathShape) {
  const { toScreen } = viewApi
  for (const c of shape.contours) {
    const n = c.points.length
    const lim = c.closed ? n : n - 1
    const p0 = toScreen(c.points[0])
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    for (let i = 0; i < lim; i++) {
      const a = c.points[i]
      const seg = c.segments[i]
      const b = seg.e
      if (seg.type === 'line') {
        const sb = toScreen(b)
        ctx.lineTo(sb.x, sb.y)
      } else if (seg.type === 'arc') {
        const g = arcGeom(a, b, seg.bulge!)
        // 用多段折线近似弧（屏幕精度）
        const steps = Math.max(6, Math.ceil(Math.abs(g.sweep) * g.r * viewApi.view().scale / 6))
        for (let k = 1; k <= steps; k++) {
          const ang = g.a1 + g.sweep * (k / steps)
          const wp = { x: g.center.x + g.r * Math.cos(ang), y: g.center.y + g.r * Math.sin(ang) }
          const sp = toScreen(wp)
          ctx.lineTo(sp.x, sp.y)
        }
      } else {
        const steps = 12
        for (let k = 1; k <= steps; k++) {
          const wp = cubicPoint(a, seg.c1!, seg.c2!, b, k / steps)
          const sp = toScreen(wp)
          ctx.lineTo(sp.x, sp.y)
        }
      }
    }
    if (c.closed) ctx.closePath()
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D, viewApi: ViewApi, shape: PathShape,
  color: string, selected: boolean, hover = false,
) {
  traceContour(ctx, viewApi, shape)
  ctx.fillStyle = selected ? `${color}22` : hover ? `${color}14` : `${color}0a`
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = selected ? 2 : 1.4
  ctx.stroke()
}

function drawHandles(
  ctx: CanvasRenderingContext2D, viewApi: ViewApi, shape: PathShape,
  activeNode: RenderOptions['activeNode'],
) {
  for (let ci = 0; ci < shape.contours.length; ci++) {
    const c = shape.contours[ci]
    // 贝塞尔控制柄（先画连线，再画手柄，避免遮挡节点）
    for (let si = 0; si < c.segments.length; si++) {
      const seg = c.segments[si]
      if (seg.type !== 'cubic' || !seg.c1 || !seg.c2) continue
      const p0 = viewApi.toScreen(c.points[si])
      const p3 = viewApi.toScreen(seg.e)
      const h1 = viewApi.toScreen(seg.c1)
      const h2 = viewApi.toScreen(seg.c2)
      ctx.strokeStyle = 'rgba(251,191,36,0.7)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(h1.x, h1.y)
      ctx.moveTo(p3.x, p3.y); ctx.lineTo(h2.x, h2.y)
      ctx.stroke()
      ctx.setLineDash([])
      for (const hp of [h1, h2]) {
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(hp.x - 4, hp.y - 4, 8, 8)
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 1
        ctx.strokeRect(hp.x - 4, hp.y - 4, 8, 8)
      }
    }
    for (let pi = 0; pi < c.points.length; pi++) {
      const sp = viewApi.toScreen(c.points[pi])
      const active = activeNode?.shapeId === shape.id &&
        activeNode.contourIdx === ci && activeNode.pointIdx === pi
      ctx.beginPath()
      ctx.arc(sp.x, sp.y, active ? HANDLE_PX + 2 : HANDLE_PX, 0, Math.PI * 2)
      ctx.fillStyle = active ? '#fbbf24' : '#e2e8f0'
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
}

export type ControlHit = { shapeId: string; contourIdx: number; segIdx: number; which: 'c1' | 'c2' }

/** 贝塞尔控制柄命中测试（优先级高于普通节点） */
export function hitControl(
  doc: Doc, world: Vec2, tolWorld: number,
): ControlHit | null {
  for (const s of [...doc.shapes].reverse()) {
    const layer = doc.layers.find(l => l.id === s.layerId)
    if (layer?.locked || layer?.visible === false) continue
    for (let ci = 0; ci < s.contours.length; ci++) {
      const c = s.contours[ci]
      for (let si = 0; si < c.segments.length; si++) {
        const seg = c.segments[si]
        if (seg.type !== 'cubic') continue
        if (seg.c1 && Math.hypot(seg.c1.x - world.x, seg.c1.y - world.y) <= tolWorld)
          return { shapeId: s.id, contourIdx: ci, segIdx: si, which: 'c1' }
        if (seg.c2 && Math.hypot(seg.c2.x - world.x, seg.c2.y - world.y) <= tolWorld)
          return { shapeId: s.id, contourIdx: ci, segIdx: si, which: 'c2' }
      }
    }
  }
  return null
}

function drawGuides(ctx: CanvasRenderingContext2D, viewApi: ViewApi, guides: SnapGuide[], w: number, h: number) {
  ctx.strokeStyle = SNAP_COLOR
  ctx.fillStyle = SNAP_COLOR
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  for (const g of guides) {
    const sp = viewApi.toScreen(g.pos)
    ctx.beginPath()
    if (g.kind === 'x') { ctx.moveTo(sp.x, 0); ctx.lineTo(sp.x, h) }
    else if (g.kind === 'y') { ctx.moveTo(0, sp.y); ctx.lineTo(w, sp.y) }
    else if (g.kind === 'point') {
      ctx.arc(sp.x, sp.y, 9, 0, Math.PI * 2)
    } else if (g.kind === 'equidistant') {
      ctx.moveTo(sp.x, 0); ctx.lineTo(sp.x, h)
      ctx.moveTo(0, sp.y); ctx.lineTo(w, sp.y)
    }
    ctx.stroke()
  }
  ctx.setLineDash([])
}

function drawAnnotations(ctx: CanvasRenderingContext2D, viewApi: ViewApi, anns: Annotation[]) {
  for (const a of anns) {
    const sp = viewApi.toScreen(a.point)
    const color = a.status === 'resolved' ? '#22c55e' : a.status === 'replied' ? '#3b82f6' : '#ef4444'
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(a.status === 'resolved' ? '✓' : a.replies.length ? String(a.replies.length) : '!', sp.x, sp.y + 0.5)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  }
}

function drawMetrics(ctx: CanvasRenderingContext2D, viewApi: ViewApi, doc: Doc, selection: Set<string>) {
  const sel = doc.shapes.filter(s => selection.has(s.id))
  if (!sel.length) return
  ctx.font = '11px ui-monospace, monospace'
  let y = 16
  for (const s of sel) {
    const m = shapeMetrics(s)
    const bbox = shapeBBox(s)
    const label = `${s.name}  面积 ${fmtArea(m.area)}  周长 ${fmtPerim(m.perimeter)}  尺寸 ${fmtMm(bbox.maxX - bbox.minX)}×${fmtMm(bbox.maxY - bbox.minY)} mm`
    const tw = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(15,23,42,0.82)'
    ctx.fillRect(12, y - 11, tw + 16, 18)
    ctx.fillStyle = '#7dd3fc'
    ctx.fillText(label, 20, y + 2)
    y += 22
  }
}

function drawDiff(ctx: CanvasRenderingContext2D, viewApi: ViewApi, diffPaths: Vec2[][][]) {
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2.5
  ctx.setLineDash([4, 3])
  for (const loop of diffPaths) {
    for (const poly of loop) {
      if (poly.length < 2) continue
      ctx.beginPath()
      const p0 = viewApi.toScreen(poly[0])
      ctx.moveTo(p0.x, p0.y)
      for (let i = 1; i < poly.length; i++) {
        const sp = viewApi.toScreen(poly[i])
        ctx.lineTo(sp.x, sp.y)
      }
      ctx.stroke()
    }
  }
  ctx.setLineDash([])
}

/** 命中测试：返回屏幕坐标下最靠近的形状 id 与节点定位 */
export function hitTest(
  doc: Doc, world: Vec2, tolWorld: number,
): { shapeId?: string; node?: { shapeId: string; contourIdx: number; pointIdx: number } } {
  // 先测节点（优先级高）
  for (const s of [...doc.shapes].reverse()) {
    const layer = doc.layers.find(l => l.id === s.layerId)
    if (layer?.locked || layer?.visible === false) continue
    for (let ci = 0; ci < s.contours.length; ci++) {
      const c = s.contours[ci]
      for (let pi = 0; pi < c.points.length; pi++) {
        if (Math.hypot(c.points[pi].x - world.x, c.points[pi].y - world.y) <= tolWorld) {
          return { shapeId: s.id, node: { shapeId: s.id, contourIdx: ci, pointIdx: pi } }
        }
      }
    }
  }
  // 再测轮廓内部/边缘（用采样折线）
  for (const s of [...doc.shapes].reverse()) {
    const layer = doc.layers.find(l => l.id === s.layerId)
    if (layer?.locked || layer?.visible === false) continue
    for (const c of s.contours) {
      const poly = sampleContour(c, 1)
      let onEdge = false
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length]
        if (distToSeg(world, a, b) <= tolWorld) { onEdge = true; break }
      }
      if (onEdge) return { shapeId: s.id }
    }
  }
  return {}
}

function distToSeg(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  if (l2 < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}
