// 应用核心 store：文档、图层、选择、工具、撤销重做、布尔、对齐分布、节点编辑
import { createStore, produce } from 'solid-js/store'
import { createSignal } from 'solid-js'
import type {
  AlignMode, Annotation, BooleanOp, DistributeMode, Doc, Layer,
  PathShape, ToolId, Vec2,
} from '../types.ts'
import {
  circleContour, polygonContour, rectContour, shapeBBox, shapeMetrics,
} from '../lib/geometry.ts'
import { booleanClient } from '../lib/booleanClient.ts'
import { History } from '../lib/history.ts'
import { alignShapes, distributeShapes, translateShape } from '../lib/arrange.ts'
import { clone, uid } from '../lib/utils.ts'

const PALETTE = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d']

function defaultDoc(): Doc {
  const layer: Layer = { id: uid('layer'), name: '主体轮廓', visible: true, locked: false, color: PALETTE[0] }
  return {
    projectNo: 'PRJ-2026-001',
    equipmentNo: 'EQ-N001',
    equipmentName: '非标输送线本体',
    gridSize: 100,
    layers: [layer],
    shapes: [],
  }
}

interface AppState {
  doc: Doc
  tool: ToolId
  selection: string[]
  /** 当前编辑中的节点定位，null 表示未在拖节点 */
  activeNode: { shapeId: string; contourIdx: number; pointIdx: number } | null
  snapEnabled: boolean
  showGrid: boolean
  busy: boolean
  busyLabel: string
}

const initial = defaultDoc()
export const [state, setState] = createStore<AppState>({
  doc: initial,
  tool: 'select',
  selection: [],
  activeNode: null,
  snapEnabled: true,
  showGrid: true,
  busy: false,
  busyLabel: '',
})

const history = new History<Doc>(clone(initial))
export const [historyDepth, setHistoryDepth] = createSignal(history.depth)

function bumpHistory() { setHistoryDepth({ ...history.depth }) }

/** 把当前 doc 快照入栈并替换为新 doc */
function commitDoc(next: Doc, label: string) {
  history.commit(next, label)
  setState('doc', clone(next))
  bumpHistory()
}

/** 临时替换（拖拽过程中不入栈） */
function liveDoc(next: Doc) {
  history.replace(next)
  setState('doc', clone(next))
}

// ---------- 工具与选择 ----------
export function setTool(tool: ToolId) { setState('tool', tool) }
export function toggleSnap() { setState('snapEnabled', v => !v) }
export function toggleGrid() { setState('showGrid', v => !v) }

export function selectOnly(id: string | null) {
  setState('selection', id ? [id] : [])
}
export function toggleSelection(id: string) {
  setState('selection', sel =>
    sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])
}
export function selectMany(ids: string[]) { setState('selection', ids) }
export function clearSelection() { setState('selection', []) }

export function selectedShapes(): PathShape[] {
  return state.doc.shapes.filter(s => state.selection.includes(s.id))
}

// ---------- 元数据 ----------
export function setMeta(field: 'projectNo' | 'equipmentNo' | 'equipmentName' | 'gridSize', value: string | number) {
  const next = clone(history.value)
  ;(next as any)[field] = value
  commitDoc(next, `修改${field}`)
}

// ---------- 图层 ----------
export function addLayer(name?: string) {
  const next = clone(history.value)
  const color = PALETTE[next.layers.length % PALETTE.length]
  next.layers.push({ id: uid('layer'), name: name || `图层 ${next.layers.length + 1}`, visible: true, locked: false, color })
  commitDoc(next, '新增图层')
}
export function toggleLayerLock(id: string) {
  const next = clone(history.value)
  const l = next.layers.find(x => x.id === id); if (l) l.locked = !l.locked
  commitDoc(next, l?.locked ? '锁定图层' : '解锁图层')
}
export function toggleLayerVisible(id: string) {
  const next = clone(history.value)
  const l = next.layers.find(x => x.id === id); if (l) l.visible = !l.visible
  commitDoc(next, l?.visible ? '显示图层' : '隐藏图层')
}
export function renameLayer(id: string, name: string) {
  const next = clone(history.value)
  const l = next.layers.find(x => x.id === id); if (l) l.name = name
  commitDoc(next, '重命名图层')
}
export function removeLayer(id: string) {
  const next = clone(history.value)
  if (next.layers.length <= 1) return
  next.layers = next.layers.filter(l => l.id !== id)
  next.shapes = next.shapes.filter(s => s.layerId !== id)
  commitDoc(next, '删除图层')
}

export function isLayerLocked(layerId: string): boolean {
  return !!state.doc.layers.find(l => l.id === layerId)?.locked
}
export function isLayerVisible(layerId: string): boolean {
  return state.doc.layers.find(l => l.id === layerId)?.visible !== false
}

// ---------- 形状增删 ----------
export function addShape(shape: PathShape, label = '绘制轮廓') {
  const next = clone(history.value)
  next.shapes.push(shape)
  commitDoc(next, label)
  setState('selection', [shape.id])
}

export function removeSelected() {
  if (!state.selection.length) return
  const next = clone(history.value)
  next.shapes = next.shapes.filter(s => !state.selection.includes(s.id))
  commitDoc(next, '删除轮廓')
  clearSelection()
}

export function renameShape(id: string, name: string) {
  const next = clone(history.value)
  const s = next.shapes.find(x => x.id === id); if (s) s.name = name
  commitDoc(next, '重命名轮廓')
}

export function moveShapeToLayer(shapeId: string, layerId: string) {
  const next = clone(history.value)
  const s = next.shapes.find(x => x.id === shapeId); if (s) s.layerId = layerId
  commitDoc(next, '移动到图层')
}

// ---------- 形状工厂 ----------
export function makeRect(a: Vec2, b: Vec2): PathShape {
  const layer = state.doc.layers[0]
  return {
    id: uid('shape'), name: `矩形 ${state.doc.shapes.length + 1}`,
    layerId: layer.id, color: layer.color,
    contours: [rectContour(a, b)], createdAt: Date.now(),
  }
}
export function makeCircle(center: Vec2, r: number): PathShape {
  const layer = state.doc.layers[0]
  return {
    id: uid('shape'), name: `圆 ${state.doc.shapes.length + 1}`,
    layerId: layer.id, color: layer.color,
    contours: [circleContour(center, Math.max(1, r))], createdAt: Date.now(),
  }
}
export function makePolygon(pts: Vec2[]): PathShape {
  const layer = state.doc.layers[0]
  return {
    id: uid('shape'), name: `多边形 ${state.doc.shapes.length + 1}`,
    layerId: layer.id, color: layer.color,
    contours: [polygonContour(pts)], createdAt: Date.now(),
  }
}

// ---------- 节点编辑 ----------
export function setActiveNode(loc: AppState['activeNode']) { setState('activeNode', loc) }

/** 拖拽单个节点（实时，不入栈）；结束时调用 commitNodeDrag */
export function dragNodeLive(loc: NonNullable<AppState['activeNode']>, p: Vec2) {
  const next = clone(history.value)
  const shape = next.shapes.find(s => s.id === loc.shapeId)
  if (!shape) return
  const c = shape.contours[loc.contourIdx]
  const old = c.points[loc.pointIdx]
  const dx = p.x - old.x, dy = p.y - old.y
  c.points[loc.pointIdx] = { ...p }
  // 同步前一段的终点 e
  const prevIdx = (loc.pointIdx + c.points.length - 1) % c.points.length
  c.segments[prevIdx].e = { ...p }
  // 贝塞尔控制手柄跟随平移
  const seg = c.segments[loc.pointIdx]
  if (seg.c1) seg.c1 = { x: seg.c1.x + dx, y: seg.c1.y + dy }
  liveDoc(next)
}

export function commitNodeDrag() {
  commitDoc(clone(history.value), '拖动节点')
  setActiveNode(null)
}

/** 拖拽贝塞尔控制点（c1/c2）；which 标识当前段的哪个手柄 */
export function dragControlLive(
  loc: { shapeId: string; contourIdx: number; segIdx: number; which: 'c1' | 'c2' },
  p: Vec2,
) {
  const next = clone(history.value)
  const shape = next.shapes.find(s => s.id === loc.shapeId)
  if (!shape) return
  const seg = shape.contours[loc.contourIdx].segments[loc.segIdx]
  if (seg.type !== 'cubic') return
  if (loc.which === 'c1') seg.c1 = { ...p }
  else seg.c2 = { ...p }
  liveDoc(next)
}

export function commitControlDrag() {
  commitDoc(clone(history.value), '拖动贝塞尔控制柄')
  setActiveNode(null)
}

/** 整体平移形状（实时） */
export function dragShapesLive(ids: string[], delta: Vec2) {
  const next = clone(history.value)
  next.shapes = next.shapes.map(s =>
    ids.includes(s.id) ? translateShape(s, delta.x, delta.y) : s)
  liveDoc(next)
}
export function commitShapesDrag() {
  commitDoc(clone(history.value), '移动轮廓')
}

/** 节点重合自动去重：合并同一轮廓内距离小于 eps 的节点；仅在发生合并时入栈 */
export function dedupeShapeNodes(shapeId: string, eps = 1e-3) {
  const next = clone(history.value)
  const shape = next.shapes.find(s => s.id === shapeId)
  if (!shape) return
  let changed = false
  for (const c of shape.contours) {
    const keep = new Set<number>()
    const map = new Map<string, number>()
    c.points.forEach((p, i) => {
      const k = `${Math.round(p.x / eps)},${Math.round(p.y / eps)}`
      if (map.has(k)) {
        changed = true
        const j = map.get(k)!
        c.segments[(i + c.points.length - 1) % c.points.length].e = { ...c.points[j] }
      } else { map.set(k, i); keep.add(i) }
    })
    if (keep.size < c.points.length) {
      const idx = [...keep]
      c.points = idx.map(i => c.points[i])
      c.segments = idx.map(i => c.segments[i])
      c.segments.forEach((seg, i) => { seg.e = { ...c.points[(i + 1) % c.points.length] } })
    }
  }
  if (changed) commitDoc(next, '节点去重')
}

// ---------- 对齐 / 分布 ----------
export function alignSelected(mode: AlignMode) {
  const sel = selectedShapes()
  if (sel.length < 2) return
  const deltas = alignShapes(sel, mode)
  const next = clone(history.value)
  next.shapes = next.shapes.map(s => {
    const d = deltas.get(s.id)
    return d ? translateShape(s, d.x, d.y) : s
  })
  commitDoc(next, `对齐-${mode}`)
}

export function distributeSelected(mode: DistributeMode) {
  const sel = selectedShapes()
  if (sel.length < 3) return
  const deltas = distributeShapes(sel, mode)
  const next = clone(history.value)
  next.shapes = next.shapes.map(s => {
    const d = deltas.get(s.id)
    return d ? translateShape(s, d.x, d.y) : s
  })
  commitDoc(next, `等距分布-${mode}`)
}

// ---------- 布尔运算（Worker / OffscreenCanvas） ----------
export async function runBoolean(op: BooleanOp): Promise<{ ms: number; threaded: boolean; fingerprint?: number } | null> {
  const sel = selectedShapes()
  if (sel.length < 2) return null
  setState({ busy: true, busyLabel: `正在 OffscreenCanvas 中计算${op === 'union' ? '并集' : op === 'intersect' ? '交集' : '差集'}…` })
  try {
    // 第一个为主体，其余为裁剪体
    const [subject, ...rest] = sel
    const opts = {
      id: uid('shape'),
      name: `${op === 'union' ? '并集' : op === 'intersect' ? '交集' : '差集'}-${sel.length}`,
      layerId: subject.layerId,
      color: subject.color,
      version: 'v' + (history.depth.past + 1),
      tol: Math.max(0.2, state.doc.gridSize * 0.005),
    }
    const outcome = await booleanClient.run([subject], rest, op, opts)
    const next = clone(history.value)
    // 删除参与运算的形状，加入结果（保留可编辑节点）
    const ids = new Set(sel.map(s => s.id))
    next.shapes = next.shapes.filter(s => !ids.has(s.id))
    next.shapes.push(outcome.result)
    commitDoc(next, `布尔-${op}`)
    setState('selection', [outcome.result.id])
    return { ms: outcome.ms, threaded: outcome.threaded, fingerprint: outcome.fingerprint }
  } finally {
    setState({ busy: false, busyLabel: '' })
  }
}

// ---------- 度量 ----------
export function metricsOf(shapeId: string) {
  const s = state.doc.shapes.find(x => x.id === shapeId)
  if (!s) return null
  return { ...shapeMetrics(s), bbox: shapeBBox(s) }
}

// ---------- 撤销 / 重做 ----------
export function undo() {
  const d = history.undo()
  if (d) { setState('doc', d); bumpHistory() }
}
export function redo() {
  const d = history.redo()
  if (d) { setState('doc', d); bumpHistory() }
}
export const canUndo = () => history.canUndo()
export const canRedo = () => history.canRedo()
export const historyLabel = () => history.label()

// ---------- 文档导入 / 导出（版本提交用） ----------
export function snapshotDoc(): Doc { return clone(history.value) }
export function loadDoc(doc: Doc, label = '载入版本') {
  commitDoc(clone(doc), label)
  clearSelection()
}
export function currentHistory() { return history }

// ---------- 批注（随版本保存，这里提供当前工作集的暂存操作） ----------
export function makeAnnotation(point: Vec2, text: string, author: string): Annotation {
  return {
    id: uid('ann'), point: { ...point }, text, author, createdAt: Date.now(),
    replies: [], status: 'open',
  }
}

// 供画布直接 produce 更新（少量高频场景）
export const docStore = { setState, produce }
