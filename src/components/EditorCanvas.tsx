// 主画布：绘制工具、点选/框选、节点拖拽、形状移动、吸附、批注打点
import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'
import type { Annotation, PathShape, Vec2 } from '../types.ts'
import {
  state, setTool, selectOnly, selectMany, toggleSelection, clearSelection,
  makeRect, makeCircle, makePolygon, addShape,
  setActiveNode, dragNodeLive, commitNodeDrag,
  dragControlLive, commitControlDrag,
  dragShapesLive, commitShapesDrag, dedupeShapeNodes,
  isLayerLocked, selectedShapes, makeAnnotation,
} from '../store/app.ts'
import { createView } from '../lib/view.ts'
import { hitControl, hitTest, renderCanvas } from '../lib/renderer.ts'
import type { ControlHit } from '../lib/renderer.ts'
import { snapPoint, type SnapGuide } from '../lib/snap.ts'
import { circleContour, arcContour, bezierContour } from '../lib/geometry.ts'
import { uid } from '../lib/utils.ts'

type NodeLoc = { shapeId: string; contourIdx: number; pointIdx: number }
type DragMode =
  | { kind: 'none' }
  | { kind: 'node'; loc: NodeLoc }
  | { kind: 'move'; ids: string[]; startWorld: Vec2; lastWorld: Vec2 }
  | { kind: 'marquee'; start: Vec2 }
  | { kind: 'pan'; startX: number; startY: number; ox: number; oy: number }
  | { kind: 'draw-rect'; start: Vec2 }
  | { kind: 'draw-circle'; center: Vec2 }
  | { kind: 'control'; loc: ControlHit }

export interface EditorCanvasProps {
  annotations: Annotation[]
  onAddAnnotation?: (a: Annotation) => void
  annotationMode: boolean
  overlay?: Parameters<typeof renderCanvas>[2]['overlay']
  registerView?: (api: ReturnType<typeof createView>) => void
}

export default function EditorCanvas(props: EditorCanvasProps) {
  let canvasRef!: HTMLCanvasElement
  const viewApi = createView()
  const [size, setSize] = createSignal({ w: 800, h: 600 })
  const [guides, setGuides] = createSignal<SnapGuide[]>([])
  const [hover, setHover] = createSignal<string | null>(null)
  const [marquee, setMarquee] = createSignal<{ a: Vec2; b: Vec2 } | null>(null)
  // 多边形/贝塞尔/圆弧的进行中顶点
  const [pendingPts, setPendingPts] = createSignal<Vec2[]>([])
  const [cursorWorld, setCursorWorld] = createSignal<Vec2>({ x: 0, y: 0 })
  let drag: DragMode = { kind: 'none' }
  let resizeObs: ResizeObserver | null = null

  onMount(() => {
    const parent = canvasRef.parentElement!
    const ro = new ResizeObserver(() => {
      setSize({ w: parent.clientWidth, h: parent.clientHeight })
    })
    ro.observe(parent)
    setSize({ w: parent.clientWidth, h: parent.clientHeight })
    resizeObs = ro
    props.registerView?.(viewApi)
  })
  onCleanup(() => resizeObs?.disconnect())

  // 响应式重绘
  createEffect(() => {
    // 依赖全部相关信号
    const doc = state.doc
    const sel = state.selection
    const active = state.activeNode
    const grid = state.showGrid
    const g = guides()
    const anns = props.annotations
    const ov = props.overlay
    const hv = hover()
    const sz = size()
    renderCanvas(canvasRef, viewApi, {
      doc, selection: new Set(sel), activeNode: active, showGrid: grid,
      guides: g, annotations: anns, overlay: ov, hoverShapeId: hv,
      width: sz.w, height: sz.h,
    })
    // 框选矩形
    const mq = marquee()
    if (mq) drawMarquee(mq)
    // 进行中的多边形
    if (pendingPts().length && (state.tool === 'polygon' || state.tool === 'bezier' || state.tool === 'arc')) {
      drawPending()
    }
  })

  function drawMarquee(mq: { a: Vec2; b: Vec2 }) {
    const ctx = canvasRef.getContext('2d')!
    const a = viewApi.toScreen(mq.a), b = viewApi.toScreen(mq.b)
    ctx.strokeStyle = '#38bdf8'
    ctx.fillStyle = 'rgba(56,189,248,0.12)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
    ctx.fillRect(x, y, Math.abs(a.x - b.x), Math.abs(a.y - b.y))
    ctx.strokeRect(x, y, Math.abs(a.x - b.x), Math.abs(a.y - b.y))
    ctx.setLineDash([])
  }

  function drawPending() {
    const ctx = canvasRef.getContext('2d')!
    const pts = pendingPts()
    ctx.strokeStyle = '#fbbf24'
    ctx.fillStyle = '#fbbf24'
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.beginPath()
    pts.forEach((p, i) => {
      const sp = viewApi.toScreen(p)
      if (i === 0) ctx.moveTo(sp.x, sp.y)
      else ctx.lineTo(sp.x, sp.y)
    })
    const cur = viewApi.toScreen(cursorWorld())
    ctx.lineTo(cur.x, cur.y)
    ctx.stroke()
    for (const p of pts) {
      const sp = viewApi.toScreen(p)
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2); ctx.fill()
    }
  }

  function pointerPos(e: { clientX: number; clientY: number }): Vec2 {
    const rect = canvasRef.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function applySnap(world: Vec2): Vec2 {
    if (!state.snapEnabled) return world
    const threshold = 12 / viewApi.view().scale
    const exclude = new Set(state.selection)
    const endpoints = state.doc.shapes
      .filter(s => !exclude.has(s.id))
      .flatMap(s => s.contours.flatMap(c => c.points))
    const movedRefs = selectedShapes().flatMap(s => s.contours.flatMap(c => c.points))
    const res = snapPoint(world, threshold, state.doc.gridSize, endpoints, movedRefs)
    setGuides(res.guides)
    return res.point
  }

  function onPointerDown(e: PointerEvent) {
    canvasRef.setPointerCapture(e.pointerId)
    const screen = pointerPos(e)
    const world = viewApi.toWorld(screen)
    setCursorWorld(world)

    // 批注打点模式
    if (props.annotationMode) {
      const a = makeAnnotation(world, '', e.shiftKey ? '审核人' : '审核人')
      props.onAddAnnotation?.(a)
      return
    }

    // 平移
    if (state.tool === 'pan' || e.button === 1 || e.button === 2) {
      drag = { kind: 'pan', startX: e.clientX, startY: e.clientY, ox: viewApi.view().ox, oy: viewApi.view().oy }
      canvasRef.classList.add('pan')
      return
    }

    // 选择工具：贝塞尔控制柄 / 节点 / 形状 / 框选
    if (state.tool === 'select') {
      const tol = 8 / viewApi.view().scale
      // 仅在已选中的形状上检测控制柄
      const ctrl = hitControl(
        { ...state.doc, shapes: state.doc.shapes.filter(s => state.selection.includes(s.id)) },
        world, tol)
      if (ctrl) {
        if (isLayerLocked(state.doc.shapes.find(s => s.id === ctrl.shapeId)!.layerId)) return
        drag = { kind: 'control', loc: ctrl }
        return
      }
      const hit = hitTest(state.doc, world, tol)
      if (hit.node) {
        const loc = hit.node
        if (isLayerLocked(state.doc.shapes.find(s => s.id === loc.shapeId)!.layerId)) return
        setActiveNode(loc)
        drag = { kind: 'node', loc }
        return
      }
      if (hit.shapeId) {
        const shape = state.doc.shapes.find(s => s.id === hit.shapeId)!
        if (isLayerLocked(shape.layerId)) return
        if (e.shiftKey) {
          toggleSelection(hit.shapeId)
        } else if (!state.selection.includes(hit.shapeId)) {
          selectOnly(hit.shapeId)
        }
        drag = {
          kind: 'move',
          ids: state.selection.includes(hit.shapeId) ? [...state.selection] : [hit.shapeId],
          startWorld: world, lastWorld: world,
        }
        canvasRef.classList.add('move')
        return
      }
      // 空白：框选
      if (!e.shiftKey) clearSelection()
      drag = { kind: 'marquee', start: world }
      setMarquee({ a: world, b: world })
      return
    }

    // 绘制工具
    if (state.tool === 'rect') {
      drag = { kind: 'draw-rect', start: world }
    } else if (state.tool === 'circle') {
      drag = { kind: 'draw-circle', center: world }
    } else if (state.tool === 'polygon' || state.tool === 'bezier' || state.tool === 'arc') {
      // 逐点采集
      setPendingPts(p => [...p, world])
    }
  }

  function onPointerMove(e: PointerEvent) {
    const screen = pointerPos(e)
    const rawWorld = viewApi.toWorld(screen)
    setCursorWorld(rawWorld)

    if (drag.kind === 'pan') {
      const pan0 = drag
      viewApi.setView(v => ({ ...v, ox: pan0.ox + (e.clientX - pan0.startX), oy: pan0.oy + (e.clientY - pan0.startY) }))
      return
    }

    const world = state.snapEnabled ? applySnap(rawWorld) : rawWorld

    const d: DragMode = drag
    if (d.kind === 'control') {
      dragControlLive(d.loc, world)
      return
    }
    if (d.kind === 'node') {
      dragNodeLive(d.loc, world)
      return
    }
    if (d.kind === 'move') {
      const delta = { x: world.x - d.lastWorld.x, y: world.y - d.lastWorld.y }
      dragShapesLive(d.ids, delta)
      d.lastWorld = world
      return
    }
    if (d.kind === 'marquee') {
      setMarquee({ a: d.start, b: world })
      return
    }
    if (d.kind === 'draw-rect' || d.kind === 'draw-circle') {
      // 实时预览通过 hover 信号临时绘制
      setHover(`__preview_${d.kind}`)
      previewShape(d, world)
      return
    }

    // 悬停命中
    if (state.tool === 'select') {
      const hit = hitTest(state.doc, rawWorld, 8 / viewApi.view().scale)
      setHover(hit.shapeId ?? null)
    }
  }

  // 临时预览形状（不写 store，直接画）
  let preview: PathShape | null = null
  function previewShape(d: DragMode, world: Vec2) {
    if (d.kind === 'draw-rect') preview = makeRect(d.start, world)
    else if (d.kind === 'draw-circle') {
      const r = Math.hypot(world.x - d.center.x, world.y - d.center.y)
      preview = makeCircle(d.center, r)
    }
    const ctx = canvasRef.getContext('2d')!
    requestAnimationFrame(() => {
      if (!preview) return
      renderCanvas(canvasRef, viewApi, {
        doc: state.doc, selection: new Set(state.selection), activeNode: null,
        showGrid: state.showGrid, guides: guides(), annotations: props.annotations,
        overlay: props.overlay, width: size().w, height: size().h,
      })
      const layer = state.doc.layers[0]
      ctx.save()
      ctx.globalAlpha = 0.7
      tracePreview(preview, layer?.color ?? '#fbbf24')
      ctx.restore()
    })
  }

  function tracePreview(shape: PathShape, color: string) {
    const ctx = canvasRef.getContext('2d')!
    ctx.strokeStyle = color
    ctx.fillStyle = `${color}22`
    ctx.lineWidth = 1.5
    for (const c of shape.contours) {
      ctx.beginPath()
      c.points.forEach((p, i) => {
        const sp = viewApi.toScreen(p)
        if (i === 0) ctx.moveTo(sp.x, sp.y)
        else ctx.lineTo(sp.x, sp.y)
      })
      ctx.closePath(); ctx.fill(); ctx.stroke()
    }
  }

  function onPointerUp(e: PointerEvent) {
    canvasRef.releasePointerCapture?.(e.pointerId)
    canvasRef.classList.remove('pan', 'move')
    const world = state.snapEnabled ? applySnap(viewApi.toWorld(pointerPos(e))) : viewApi.toWorld(pointerPos(e))
    const d: DragMode = drag

    if (d.kind === 'control') {
      commitControlDrag()
      setGuides([])
    } else if (d.kind === 'node') {
      commitNodeDrag()
      dedupeShapeNodes(d.loc.shapeId)
      setGuides([])
    } else if (d.kind === 'move') {
      if (Math.hypot(world.x - d.startWorld.x, world.y - d.startWorld.y) > 1e-6) {
        commitShapesDrag()
      }
      setGuides([])
    } else if (d.kind === 'marquee') {
      applyMarquee(d.start, world, e.shiftKey)
      setMarquee(null)
    } else if (d.kind === 'draw-rect') {
      if (Math.hypot(world.x - d.start.x, world.y - d.start.y) > 2 / viewApi.view().scale) {
        addShape(makeRect(d.start, world), '绘制矩形')
      }
      preview = null
    } else if (d.kind === 'draw-circle') {
      const r = Math.hypot(world.x - d.center.x, world.y - d.center.y)
      if (r > 2 / viewApi.view().scale) addShape(makeCircle(d.center, r), '绘制圆')
      preview = null
    }
    drag = { kind: 'none' }
    setHover(null)
  }

  function applyMarquee(a: Vec2, b: Vec2, additive: boolean) {
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x)
    const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y)
    const ids = state.doc.shapes
      .filter(s => {
        const layer = state.doc.layers.find(l => l.id === s.layerId)
        if (layer?.locked || layer?.visible === false) return false
        // 用首节点判断是否在框内（简化）
        return s.contours.some(c => c.points.every(p =>
          p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY))
      })
      .map(s => s.id)
    if (additive) {
      selectMany([...new Set([...state.selection, ...ids])])
    } else {
      selectMany(ids)
    }
  }

  function onDblClick() {
    // 双击/Enter 结束采集
    const pts = pendingPts()
    if (state.tool === 'arc') {
      if (pts.length >= 3) {
        // 三点定弧：起点、弧上点、终点
        const shape: PathShape = {
          id: uid('shape'), name: `圆弧 ${state.doc.shapes.length + 1}`,
          layerId: state.doc.layers[0].id, color: state.doc.layers[0].color,
          contours: [arcContour(pts[0], pts[1], pts[pts.length - 1])],
          createdAt: Date.now(),
        }
        addShape(shape, '绘制圆弧')
      }
      setPendingPts([]); setTool('select')
      return
    }
    if ((state.tool === 'polygon' || state.tool === 'bezier') && pts.length >= 3) {
      if (state.tool === 'polygon') {
        addShape(makePolygon(pts), '绘制多边形')
      } else {
        const shape: PathShape = {
          id: uid('shape'), name: `贝塞尔 ${state.doc.shapes.length + 1}`,
          layerId: state.doc.layers[0].id, color: state.doc.layers[0].color,
          contours: [bezierContour(pts)],
          createdAt: Date.now(),
        }
        addShape(shape, '绘制贝塞尔曲线')
      }
      setPendingPts([]); setTool('select')
    } else if (pts.length) {
      setPendingPts([])
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    viewApi.zoomAt(pointerPos(e), factor)
  }

  function onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
    if (e.key === 'Escape') { setPendingPts([]); setTool('select'); clearSelection() }
    if (e.key === 'Enter') onDblClick()
  }

  onMount(() => window.addEventListener('keydown', onKey))
  onCleanup(() => window.removeEventListener('keydown', onKey))

  return (
    <div class="canvas-wrap">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDblClick={onDblClick}
        onWheel={onWheel}
        onContextMenu={e => e.preventDefault()}
      />
      <div class="hud">
        <Show when={pendingPts().length}>
          <div>已采集 {pendingPts().length} 点 · 双击/Enter 结束 · Esc 取消</div>
        </Show>
        <div>
          坐标 {cursorWorld().x.toFixed(1)}, {cursorWorld().y.toFixed(1)} mm
          {' · '}缩放 {viewApi.view().scale.toFixed(2)} px/mm
          {' · '}{state.snapEnabled ? '吸附开' : '吸附关'}
        </div>
      </div>
    </div>
  )
}

// 保持 circleContour 引用（圆弧工具扩展用）
void circleContour
