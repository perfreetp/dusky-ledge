import { reactive, computed, shallowRef, markRaw } from 'vue'
import { VoxelModel, packCell, cellGroup, cellMat, cellAlphaQ } from '../voxel/model.js'
import { Editor, makeClipboard } from '../voxel/editor.js'
import { buildMesh, modelStats } from '../voxel/mesh.js'
import { PRESETS, createModel } from '../voxel/presets.js'
import {
  collectVoxels,
  boxFromPoints,
  clipboardInBounds,
  checkClipboardCollision,
  clipFromSection,
} from '../voxel/geometry.js'
import { GROUPS, MATERIALS } from './materials.js'

export const TOOLS = [
  { id: 'orbit', label: '观察', hint: '左键拖动旋转，右键或中键平移，滚轮缩放', key: 'Q' },
  { id: 'paint', label: '落格', hint: '左键在面外落一格，按住的格子自动连续填充', key: 'B' },
  { id: 'erase', label: '擦除', hint: '左键删掉命中的格子，拖动可连续擦', key: 'E' },
  { id: 'restyle', label: '改属性', hint: '左键点格子，套用当前材质与透明度', key: 'R' },
  { id: 'pick', label: '取样', hint: '左键吸取格子所属组与材质', key: 'I' },
  { id: 'select', label: '框选', hint: '拖一个矩形框，选中立方体区域内的体素', key: 'M' },
  { id: 'blit', label: '粘贴定位', hint: '移动指针预览落点，左键确认粘贴', key: 'P' },
]

const state = reactive({
  presetId: 'cnc',
  model: markRaw(createModel(PRESETS[0])),
  editor: null,
  tool: 'orbit',
  group: 2,
  mat: -1,
  alphaQ: 15,
  brush: 1,
  mirrorOn: false,
  mirrorAxis: 'x',
  visible: [true, true, true, true],
  soloGroup: null,
  section: { x: null, y: null, z: null }, // { at, dir } | null
  sectionOn: false,
  showGrid: true,
  showEdges: true,
  xray: true,
  selection: null, // {min,max}
  hover: null, // {voxel, normal}
  hoverPlace: null, // 落点体素坐标
  clipboard: null,
  clipboardTarget: [0, 0, 0],
  clipboardCollision: 0,
  clipboardOutOfBounds: false,
  meshVersion: 0,
  stats: { count: 0, byGroup: [0, 0, 0, 0], byMat: {} },
  exporting: false,
  lastExport: null,
  notice: null,
})

state.editor = markRaw(new Editor(state.model))

export const editorState = state
export const currentModel = computed(() => state.model)
export const editorApi = computed(() => state.editor)

let noticeTimer = null
export function toast(text, tone = 'info') {
  state.notice = { text, tone, id: Date.now() }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    state.notice = null
  }, 2600)
}

export function refreshStats() {
  const s = modelStats(state.model)
  state.stats = { count: s.count, byGroup: s.byGroup, byMat: s.byMat, bounds: s.bounds }
}

export const meshCache = shallowRef({ mesh: null, version: -1 })

export function rebuildMesh() {
  const visible = new Set()
  for (let i = 0; i < 4; i++) {
    if (state.soloGroup != null) {
      if (i === state.soloGroup) visible.add(i)
    } else if (state.visible[i]) visible.add(i)
  }
  const clip = state.sectionOn ? clipFromSection(state.section) : null
  const mesh = buildMesh(state.model, { visibleGroups: visible, clip })
  state.meshVersion++
  meshCache.value = { mesh, version: state.meshVersion, visibleGroups: [...visible] }
  return mesh
}

let rebuildQueued = false
export function requestRebuild() {
  if (rebuildQueued) return
  rebuildQueued = true
  requestAnimationFrame(() => {
    rebuildQueued = false
    rebuildMesh()
  })
}

state.editor.onChange = () => {
  refreshStats()
  requestRebuild()
  // 剪贴板落点高亮需要跟着模型变化
  if (state.clipboard && state.tool === 'blit') updateClipboardPreview(state.clipboardTarget)
}

export function loadPreset(id) {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) return
  state.presetId = id
  const model = markRaw(createModel(preset))
  state.model = model
  state.editor.setModel(model)
  state.section = { x: null, y: null, z: null }
  state.sectionOn = false
  state.selection = null
  state.clipboard = null
  refreshStats()
  requestRebuild()
  toast(`已载入「${preset.name}」${preset.model}，共 ${model.count} 格`, 'ok')
  return model
}

/** 清空所有体素，走编辑事务，可撤销 */
export function clearAll() {
  const voxels = []
  state.model.forEach((x, y, z) => voxels.push([x, y, z]))
  if (!voxels.length) {
    toast('工作台已经是空的', 'info')
    return false
  }
  state.editor.deleteVoxels(voxels)
  state.selection = null
  toast(`已清空 ${voxels.length} 格，可用撤销恢复`, 'ok')
  return true
}

export function emptyModel(sx = 20, sy = 12, sz = 20) {
  const model = markRaw(new VoxelModel(sx, sy, sz))
  state.presetId = null
  state.model = model
  state.editor.setModel(model)
  state.section = { x: null, y: null, z: null }
  state.sectionOn = false
  state.selection = null
  state.clipboard = null
  refreshStats()
  requestRebuild()
}

export function setGroup(g) {
  state.group = g
}

export function setMat(m) {
  state.mat = m
}

export function toggleVisible(i) {
  state.visible[i] = !state.visible[i]
  if (!state.visible[i] && state.soloGroup === i) state.soloGroup = null
  state.editor.notify('visibility')
  requestRebuild()
}

export function soloGroupToggle(i) {
  state.soloGroup = state.soloGroup === i ? null : i
  state.editor.notify('visibility')
  requestRebuild()
}

export function allGroupsVisible() {
  state.visible = [true, true, true, true]
  state.soloGroup = null
  state.editor.notify('visibility')
  requestRebuild()
}

export function setSection(axis, at, dir = 'min') {
  state.section[axis] = { at, dir }
  state.sectionOn = true
  requestRebuild()
}

export function flipSection(axis) {
  const cur = state.section[axis]
  if (!cur) return
  cur.dir = cur.dir === 'min' ? 'max' : 'min'
  requestRebuild()
}

export function clearSection() {
  state.section = { x: null, y: null, z: null }
  state.sectionOn = false
  requestRebuild()
}

export function toggleMirror() {
  state.mirrorOn = !state.mirrorOn
  state.editor.mirror.on = state.mirrorOn
  toast(state.mirrorOn ? `镜像已开：沿 ${state.mirrorAxis.toUpperCase()} 轴自动补齐` : '镜像已关', 'info')
}

export function setMirrorAxis(axis) {
  state.mirrorAxis = axis
  state.editor.mirror.axis = axis
  if (state.clipboard && state.tool === 'blit') updateClipboardPreview(state.clipboardTarget)
}

export function onPointerDownWorld({ voxel, normal, shift, tool }) {
  const t = tool || state.tool
  if (t === 'paint') {
    const target = normal && (normal[0] || normal[1] || normal[2]) ? addV(normal, voxel) : voxel
    state.editor.brush(target, state.brush, state.group, state.mat, state.alphaQ, 'paint')
  } else if (t === 'erase') {
    state.editor.brush(voxel, state.brush, state.group, state.mat, state.alphaQ, 'erase')
  } else if (t === 'restyle') {
    state.editor.restyle([voxel], { group: null, mat: state.mat === -1 ? null : state.mat, alphaQ: state.alphaQ })
  } else if (t === 'pick') {
    const c = state.model.get(...voxel)
    if (c !== undefined) {
      state.group = cellGroup(c)
      state.mat = cellMat(c)
      state.alphaQ = cellAlphaQ(c)
      toast(`取样：${GROUPS[state.group].name} / ${MATERIALS.find((m) => m.id === state.mat)?.name ?? '组色'}`, 'info')
    }
  }
}

export function onPointerDragWorld({ voxel, normal, lastVoxel, shift }) {
  if (state.tool === 'paint') {
    const target = normal && (normal[0] || normal[1] || normal[2]) ? addV(normal, voxel) : voxel
    if (!lastVoxel || lastVoxel[0] !== target[0] || lastVoxel[1] !== target[1] || lastVoxel[2] !== target[2]) {
      state.editor.brush(target, state.brush, state.group, state.mat, state.alphaQ, 'paint')
    }
  } else if (state.tool === 'erase') {
    state.editor.brush(voxel, state.brush, state.group, state.mat, state.alphaQ, 'erase')
  } else if (state.tool === 'restyle') {
    state.editor.restyle([voxel], { group: null, mat: state.mat === -1 ? null : state.mat, alphaQ: state.alphaQ })
  }
}

export const addV = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

export function selectBox(a, b) {
  const box = boxFromPoints(a, b)
  state.selection = box
  const n = collectVoxels(state.model, box).length
  toast(`框选 ${boxSizeLabel(box)}，含 ${n} 格`, 'info')
  return box
}

export function boxSizeLabel(box) {
  return `${box.max[0] - box.min[0] + 1}×${box.max[1] - box.min[1] + 1}×${box.max[2] - box.min[2] + 1}`
}

export function clearSelection() {
  state.selection = null
}

export function copySelection() {
  if (!state.selection) {
    toast('先框选一片体素再复制', 'warn')
    return false
  }
  const voxels = collectVoxels(state.model, state.selection)
  if (!voxels.length) {
    toast('选区里没有体素', 'warn')
    return false
  }
  const clip = makeClipboard(state.model, voxels)
  state.clipboard = clip
  state.clipboardTarget = [...clip.origin]
  state.tool = 'blit'
  updateClipboardPreview(state.clipboardTarget)
  toast(`已复制 ${clip.items.length} 格（${clip.size.join('×')}），点选落点后粘贴`, 'ok')
  return true
}

export function cutSelection() {
  if (!copySelection()) return
  const voxels = collectVoxels(state.model, state.selection)
  state.editor.deleteVoxels(voxels)
  state.selection = null
  toast('已剪切，移动到落点后粘贴', 'ok')
}

export function deleteSelection() {
  if (!state.selection) return
  const voxels = collectVoxels(state.model, state.selection)
  if (!voxels.length) return
  state.editor.deleteVoxels(voxels)
  toast(`已删除 ${voxels.length} 格`, 'ok')
}

export function updateClipboardPreview(target) {
  if (!state.clipboard) {
    state.clipboardTarget = target
    return
  }
  const dims = { x: state.model.sx, y: state.model.sy, z: state.model.sz }
  // 指针落到工作台外时把落点收回到范围内，避免出现「永远越界」的死角
  const clamped = [
    Math.max(0, Math.min(dims.x - state.clipboard.size[0], target[0])),
    Math.max(0, Math.min(dims.y - state.clipboard.size[1], target[1])),
    Math.max(0, Math.min(dims.z - state.clipboard.size[2], target[2])),
  ]
  target = clamped
  state.clipboardTarget = target
  state.clipboardOutOfBounds = !clipboardInBounds(state.clipboard, target, dims)
  const res = checkClipboardCollision(
    state.model,
    state.clipboard,
    target,
    { on: state.mirrorOn, axis: state.mirrorAxis },
    dims
  )
  state.clipboardCollision = res.hits.length
}

export function pasteClipboard() {
  if (!state.clipboard) return false
  if (state.clipboardOutOfBounds) {
    toast('落点超出工作台范围，往回收一收', 'warn')
    return false
  }
  const hits = state.clipboardCollision
  state.editor.paste(state.clipboard, state.clipboardTarget, {})
  toast(
    hits > 0 ? `已粘贴 ${state.clipboard.items.length} 格，覆盖了 ${hits} 格原有体素` : `已粘贴 ${state.clipboard.items.length} 格`,
    hits > 0 ? 'warn' : 'ok'
  )
  state.selection = state.clipboard
    ? {
        min: [...state.clipboardTarget],
        max: [
          state.clipboardTarget[0] + state.clipboard.size[0] - 1,
          state.clipboardTarget[1] + state.clipboard.size[1] - 1,
          state.clipboardTarget[2] + state.clipboard.size[2] - 1,
        ],
      }
    : null
  return true
}

export function extractGroup(groupId) {
  const pts = []
  state.model.forEach((x, y, z, v) => {
    if (cellGroup(v) === groupId) pts.push([x, y, z])
  })
  if (!pts.length) {
    toast(`${GROUPS[groupId].name}组没有体素`, 'warn')
    return
  }
  // 掏出整个三维范围，便于复制
  state.selection = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (const [x, y, z] of pts) {
    state.selection.min = [Math.min(state.selection.min[0], x), Math.min(state.selection.min[1], y), Math.min(state.selection.min[2], z)]
    state.selection.max = [Math.max(state.selection.max[0], x), Math.max(state.selection.max[1], y), Math.max(state.selection.max[2], z)]
  }
  toast(`已选中${GROUPS[groupId].name}组范围 ${boxSizeLabel(state.selection)}`, 'info')
}

export function undo() {
  const label = state.editor.undo()
  if (label) toast(`撤销：${label}`, 'info')
  else toast('没有可撤销的操作', 'warn')
}

export function redo() {
  const label = state.editor.redo()
  if (label) toast(`重做：${label}`, 'info')
  else toast('没有可重做的操作', 'warn')
}

refreshStats()
rebuildMesh()
