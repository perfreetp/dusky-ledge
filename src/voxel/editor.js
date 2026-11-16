// 编辑核心：所有对体素的改动都走这里，统一产生撤销记录、镜像补齐与统计失效
import { packCell, cellGroup, cellMat, cellAlphaQ, mirrorPoint } from './model.js'

let uid = 1
export const nextUid = () => uid++

/**
 * 撤销快照：记录被改动格子的前后值
 */
export class EditLog {
  constructor() {
    this.undoStack = []
    this.redoStack = []
    this.limit = 120
  }

  begin(model, label) {
    return { model, label, changes: new Map(), before: new Map(), after: new Map() }
  }

  write(tx, x, y, z, newValue) {
    const old = tx.model.get(x, y, z)
    if (old === newValue) return false
    const k = tx.model.key(x, y, z)
    if (!tx.before.has(k)) tx.before.set(k, old)
    tx.after.set(k, newValue)
    tx.model.set(x, y, z, newValue)
    return true
  }

  commit(tx) {
    const entries = []
    for (const [k, after] of tx.after) {
      const before = tx.before.get(k)
      if (before === after) continue
      entries.push([k, before, after])
    }
    if (!entries.length) return false
    this.undoStack.push({ label: tx.label, model: tx.model, entries })
    if (this.undoStack.length > this.limit) this.undoStack.shift()
    this.redoStack.length = 0
    return true
  }

  undo() {
    const entry = this.undoStack.pop()
    if (!entry) return null
    for (let i = entry.entries.length - 1; i >= 0; i--) {
      const [k, before] = entry.entries[i]
      const [x, y, z] = entry.model.coords(k)
      entry.model.set(x, y, z, before)
    }
    this.redoStack.push(entry)
    return entry.label
  }

  redo() {
    const entry = this.redoStack.pop()
    if (!entry) return null
    for (const [k, , after] of entry.entries) {
      const [x, y, z] = entry.model.coords(k)
      entry.model.set(x, y, z, after)
    }
    this.undoStack.push(entry)
    return entry.label
  }

  get canUndo() {
    return this.undoStack.length > 0
  }
  get canRedo() {
    return this.redoStack.length > 0
  }
}

export class Editor {
  constructor(model) {
    this.model = model
    this.log = new EditLog()
    this.mirror = { on: false, axis: 'x' }
    this.onChange = null
  }

  setModel(model) {
    this.model = model
    this.log = new EditLog()
    this.notify('load')
  }

  notify(kind) {
    if (this.onChange) this.onChange(kind)
  }

  /** 写入一格，并按镜像设置补齐对称格 */
  paint(x, y, z, group, mat = -1, alphaQ = 15, tx = null) {
    const own = tx || this.log.begin(this.model, '绘制')
    const v = packCell(group, mat, alphaQ)
    this.log.write(own, x, y, z, v)
    if (this.mirror.on) {
      const [mx, my, mz] = mirrorPoint({ x: this.model.sx, y: this.model.sy, z: this.model.sz }, [x, y, z], this.mirror.axis)
      this.log.write(own, mx, my, mz, v)
    }
    if (!tx) this.finish(own)
    return own
  }

  erase(x, y, z, tx = null) {
    const own = tx || this.log.begin(this.model, '擦除')
    this.log.write(own, x, y, z, undefined)
    if (this.mirror.on) {
      const [mx, my, mz] = mirrorPoint({ x: this.model.sx, y: this.model.sy, z: this.model.sz }, [x, y, z], this.mirror.axis)
      this.log.write(own, mx, my, mz, undefined)
    }
    if (!tx) this.finish(own)
    return own
  }

  /** 用笔刷半径填充球形区域（按格心距离） */
  brush(center, radius, group, mat, alphaQ, mode = 'paint', tx = null) {
    const own = tx || this.log.begin(this.model, mode === 'erase' ? '擦除' : '绘制')
    const r = radius - 0.5
    const r2 = r * r
    const n = Math.ceil(radius)
    for (let dz = -n; dz <= n; dz++)
      for (let dy = -n; dy <= n; dy++)
        for (let dx = -n; dx <= n; dx++) {
          if (radius > 0.5 && dx * dx + dy * dy + dz * dz > r2) continue
          const x = center[0] + dx
          const y = center[1] + dy
          const z = center[2] + dz
          if (!this.model.inside(x, y, z)) continue
          if (mode === 'erase') this.log.write(own, x, y, z, undefined)
          else this.log.write(own, x, y, z, packCell(group, mat, alphaQ))
          if (this.mirror.on) {
            const [mx, my, mz] = mirrorPoint(
              { x: this.model.sx, y: this.model.sy, z: this.model.sz },
              [x, y, z],
              this.mirror.axis
            )
            if (mode === 'erase') this.log.write(own, mx, my, mz, undefined)
            else this.log.write(own, mx, my, mz, packCell(group, mat, alphaQ))
          }
        }
    if (!tx) this.finish(own)
    return own
  }

  /** 对一组格子改属性（换组/换材质/改透明度），支持并行多选 */
  restyle(voxels, { group, mat, alphaQ }) {
    const tx = this.log.begin(this.model, '改属性')
    for (const [x, y, z] of voxels) {
      const c = this.model.get(x, y, z)
      if (c === undefined) continue
      const g = group != null ? group : cellGroup(c)
      const m = mat != null ? mat : cellMat(c)
      const a = alphaQ != null ? alphaQ : cellAlphaQ(c)
      const nv = packCell(g, m, a)
      this.log.write(tx, x, y, z, nv)
      if (this.mirror.on) {
        const [mx, my, mz] = mirrorPoint(
          { x: this.model.sx, y: this.model.sy, z: this.model.sz },
          [x, y, z],
          this.mirror.axis
        )
        this.log.write(tx, mx, my, mz, nv)
      }
    }
    this.finish(tx)
  }

  /** 删除一批格子 */
  deleteVoxels(voxels) {
    const tx = this.log.begin(this.model, '删除选区')
    for (const [x, y, z] of voxels) {
      this.log.write(tx, x, y, z, undefined)
      if (this.mirror.on) {
        const [mx, my, mz] = mirrorPoint(
          { x: this.model.sx, y: this.model.sy, z: this.model.sz },
          [x, y, z],
          this.mirror.axis
        )
        this.log.write(tx, mx, my, mz, undefined)
      }
    }
    this.finish(tx)
  }

  /** 粘贴：把剪贴板内容放到目标原点，镜像开启时同时补另一侧 */
  paste(clip, origin, { group, mat, alphaQ } = {}) {
    const tx = this.log.begin(this.model, '粘贴')
    for (const item of clip.items) {
      const x = origin[0] + item.d[0]
      const y = origin[1] + item.d[1]
      const z = origin[2] + item.d[2]
      const g = group != null ? group : cellGroup(item.v)
      const m = mat != null ? mat : cellMat(item.v)
      const a = alphaQ != null ? alphaQ : cellAlphaQ(item.v)
      this.log.write(tx, x, y, z, packCell(g, m, a))
      if (this.mirror.on) {
        const [mx, my, mz] = mirrorPoint(
          { x: this.model.sx, y: this.model.sy, z: this.model.sz },
          [x, y, z],
          this.mirror.axis
        )
        this.log.write(tx, mx, my, mz, packCell(g, m, a))
      }
    }
    this.finish(tx)
  }

  finish(tx) {
    if (this.log.commit(tx)) this.notify('edit')
  }

  undo() {
    const label = this.log.undo()
    if (label) this.notify('undo')
    return label
  }

  redo() {
    const label = this.log.redo()
    if (label) this.notify('redo')
    return label
  }
}

/** 从选区里取出剪贴板结构（局部坐标归一化） */
export function makeClipboard(model, voxels) {
  if (!voxels.length) return null
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const [x, y, z] of voxels) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z)
  }
  const items = []
  for (const [x, y, z] of voxels) {
    const v = model.get(x, y, z)
    if (v === undefined) continue
    items.push({ d: [x - minX, y - minY, z - minZ], v })
  }
  return {
    items,
    size: [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1],
    origin: [minX, minY, minZ],
    sourceKey: voxels.map(([x, y, z]) => model.key(x, y, z)).join(','),
  }
}
