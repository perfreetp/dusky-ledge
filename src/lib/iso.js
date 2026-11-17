// 等轴测渲染器：Canvas2D 深浅着色 + 画家算法深度排序；OffscreenCanvas 逐面拾取
import { PALETTE, shade } from './palette.js'
import { keyOf, parseKey } from './voxel.js'

const COS30 = Math.cos(Math.PI / 6)
const SIN30 = 0.5
// 立方体面：顶点（局部 0/1）+ 法线
const FACES = [
  { idx: 0, n: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { idx: 1, n: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { idx: 2, n: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { idx: 3, n: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { idx: 4, n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { idx: 5, n: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
]
const DIR = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]

export class IsoRenderer {
  constructor (canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    // 离屏拾取画布：优先 OffscreenCanvas，不支持时退回普通 canvas
    if (typeof OffscreenCanvas !== 'undefined') {
      this.off = new OffscreenCanvas(1, 1)
    } else {
      this.off = document.createElement('canvas')
    }
    this.pctx = this.off.getContext('2d', { willReadFrequently: true })
    this.pickDirty = true
    this.model = null
    this.yaw = Math.PI / 6
    this.tile = 26
    this.activeLayer = null // null = 全高度编辑；数字 = 仅该层
    this.mirror = 'off'
    this.selection = new Set()
    this.hover = null // {x,y,z,face}
    this.dpr = 1
    this._order = []
  }

  resize (cssW, cssH, dpr) {
    this.dpr = dpr
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h
    }
    this.off.width = w; this.off.height = h
    this.pickDirty = true
  }

  markDirty () { this.pickDirty = true }

  // 世界坐标 -> 屏幕坐标（相对画布中心）
  project (x, y, z) {
    const n = this.model.size
    const c = (n - 1) / 2 + 0.5
    const dx = x - c, dy = y - c, dz = z - c
    const cos = Math.cos(this.yaw), sin = Math.sin(this.yaw)
    const rx = dx * cos - dy * sin
    const ry = dx * sin + dy * cos
    return {
      sx: (rx - ry) * COS30 * this.tile,
      sy: ((rx + ry) * SIN30 - dz) * this.tile,
      depth: rx + ry - dz
    }
  }

  /** 光照：旋转坐标系里固定左上方光源，换算回世界法线取亮度 */
  lightFactor (normal) {
    const t = this.yaw
    const lrx = 0.45, lry = 0.3, lrz = 0.84
    const lx = Math.cos(t) * lrx + Math.sin(t) * lry
    const ly = -Math.sin(t) * lrx + Math.cos(t) * lry
    const dot = normal[0] * lx + normal[1] * ly + normal[2] * lrz
    return 0.52 + 0.48 * Math.max(0, dot)
  }

  /** 当前视角下可见的侧面面号（顶面 4 恒可见） */
  visibleSideFaces () {
    const t = this.yaw, cos = Math.cos(t), sin = Math.sin(t)
    const out = []
    // +x 轴向旋转坐标 (cos, sin)，朝观察者分量 cos+sin
    out.push(cos + sin > 0 ? 0 : 1)
    // +y 轴向旋转坐标 (-sin, cos)，朝观察者分量 cos-sin
    out.push(cos - sin > 0 ? 2 : 3)
    return out
  }

  buildOrder () {
    const m = this.model
    const order = []
    let i = 0
    for (const [k, color] of m.voxels) {
      const { x, y, z } = parseKey(k)
      order.push({ k, x, y, z, color, i: i++, depth: this.project(x, y, z).depth })
    }
    order.sort((a, b) => a.depth - b.depth)
    this._order = order
    return order
  }

  facePoly (v, face) {
    return face.corners.map(([cx, cy, cz]) => {
      const p = this.project(v.x + cx, v.y + cy, v.z + cz)
      return [p.sx, p.sy]
    })
  }

  drawFace (ctx, poly, fill, stroke = true) {
    ctx.beginPath()
    ctx.moveTo(poly[0][0], poly[0][1])
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1])
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    if (stroke) ctx.stroke()
  }

  render () {
    const { ctx, canvas } = this
    const n = this.model.size
    ctx.save()
    ctx.scale(this.dpr, this.dpr)
    ctx.clearRect(0, 0, canvas.width / this.dpr, canvas.height / this.dpr)
    ctx.translate(canvas.width / this.dpr / 2, canvas.height / this.dpr / 2)
    ctx.lineJoin = 'round'
    ctx.lineWidth = 0.6
    ctx.strokeStyle = 'rgba(20,28,38,0.35)'

    this.drawGround(ctx, n)
    const sideFaces = this.visibleSideFaces()
    const order = this.buildOrder()

    for (const v of order) {
      const inLayer = this.activeLayer === null || v.z === this.activeLayer
      ctx.globalAlpha = inLayer ? 1 : 0.16
      const hex = PALETTE[v.color % PALETTE.length].hex
      // 顶面
      this.drawVoxelFace(v, FACES[4], shade(hex, this.lightFactor(FACES[4].n)), ctx)
      for (const fi of sideFaces) {
        const d = DIR[fi]
        if (!this.model.voxels.has(keyOf(v.x + d[0], v.y + d[1], v.z + d[2]))) {
          this.drawVoxelFace(v, FACES[fi], shade(hex, this.lightFactor(FACES[fi].n)), ctx)
        }
      }
    }
    ctx.globalAlpha = 1

    // 选中体素：金色描边 + 半透明覆盖
    if (this.selection.size) {
      ctx.strokeStyle = '#FFB300'
      ctx.lineWidth = 1.6
      for (const v of order) {
        if (!this.selection.has(v.k)) continue
        const faces = [FACES[4], ...sideFaces.map(f => FACES[f])]
        for (const f of faces) {
          const poly = this.facePoly(v, f)
          ctx.beginPath()
          ctx.moveTo(poly[0][0], poly[0][1])
          for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1])
          ctx.closePath()
          ctx.fillStyle = 'rgba(255,179,0,0.28)'
          ctx.fill()
          ctx.stroke()
        }
      }
    }

    // 悬停幽灵块（加体模式提示落点）
    if (this.hover && this.hover.ghost) {
      const g = this.hover.ghost
      const gv = { x: g.x, y: g.y, z: g.z }
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = 1.2
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      const faces = [FACES[4], ...sideFaces.map(f => FACES[f])]
      for (const f of faces) {
        const poly = this.facePoly(gv, f)
        this.drawFace(ctx, poly, 'rgba(255,255,255,0.16)')
      }
    }
    ctx.restore()
    this.pickDirty = true
  }

  drawVoxelFace (v, face, fill, ctx) {
    const poly = this.facePoly(v, face)
    this.drawFace(ctx, poly, fill)
  }

  /** 地面网格 + 镜像轴 */
  drawGround (ctx, n) {
    const c = (n - 1) / 2 + 0.5
    const corners = [[0, 0], [n, 0], [n, n], [0, n]]
    const pts = corners.map(([x, y]) => this.project(x, y, 0))
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(pts[0].sx, pts[0].sy)
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].sx, pts[i].sy)
    ctx.closePath()
    ctx.fillStyle = 'rgba(96,125,159,0.10)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(96,125,159,0.45)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.strokeStyle = 'rgba(96,125,159,0.22)'
    ctx.lineWidth = 0.6
    for (let i = 1; i < n; i++) {
      const a = this.project(i, 0, 0), b = this.project(i, n, 0)
      const e = this.project(0, i, 0), d = this.project(n, i, 0)
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(e.sx, e.sy); ctx.lineTo(d.sx, d.sy); ctx.stroke()
    }
    // 镜像轴
    const axisColor = { x: 'rgba(231,76,60,0.9)', y: 'rgba(46,134,193,0.9)', both: '', off: '' }
    const drawAxis = (axis, color) => {
      if (axis === 'x') {
        const a = this.project(c, 0, 0.02), b = this.project(c, n, 0.02)
        ctx.strokeStyle = color; ctx.setLineDash([6, 5])
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke()
      } else {
        const a = this.project(0, c, 0.02), b = this.project(n, c, 0.02)
        ctx.strokeStyle = color; ctx.setLineDash([6, 5])
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke()
      }
      ctx.setLineDash([])
    }
    if (this.mirror === 'x' || this.mirror === 'both') drawAxis('x', axisColor.x)
    if (this.mirror === 'y' || this.mirror === 'both') drawAxis('y', axisColor.y)
    ctx.restore()
  }

  /** 离屏画布重绘：每个面用唯一 RGB 编码 (voxelIndex, face) */
  renderPick () {
    const { pctx, off } = this
    pctx.setTransform(1, 0, 0, 1, 0, 0)
    pctx.clearRect(0, 0, off.width, off.height)
    pctx.save()
    pctx.scale(this.dpr, this.dpr)
    pctx.translate(off.width / this.dpr / 2, off.height / this.dpr / 2)
    const sideFaces = this.visibleSideFaces()
    const full = this._order.length ? this._order : this.buildOrder()
    // 切片模式下拾取数组也要过滤，否则 id 与数组下标错位
    const order = this.activeLayer === null ? full : full.filter(v => v.z === this.activeLayer)
    order.forEach((v, localIdx) => {
      const faces = [4, ...sideFaces]
      for (const fi of faces) {
        const face = FACES[fi]
        if (fi !== 4) {
          const d = DIR[fi]
          if (this.model.voxels.has(keyOf(v.x + d[0], v.y + d[1], v.z + d[2]))) continue
        }
        const id = (localIdx + 1) * 8 + fi // 低 3 位存面号，序号对应过滤后的拾取数组
        const r = id & 255, g = (id >> 8) & 255, b = (id >> 16) & 255
        const poly = this.facePoly(v, face)
        pctx.beginPath()
        pctx.moveTo(poly[0][0], poly[0][1])
        for (let i = 1; i < poly.length; i++) pctx.lineTo(poly[i][0], poly[i][1])
        pctx.closePath()
        pctx.fillStyle = `rgb(${r},${g},${b})`
        pctx.fill()
      }
    })
    pctx.restore()
    this._pickOrder = order
    this.pickDirty = false
  }

  /** 屏幕像素拾取：返回体素与命中面；空白返回 null */
  pick (cssX, cssY) {
    if (this.pickDirty) this.renderPick()
    const px = Math.round(cssX * this.dpr), py = Math.round(cssY * this.dpr)
    if (px < 0 || py < 0 || px >= this.off.width || py >= this.off.height) return null
    const data = this.pctx.getImageData(px, py, 1, 1).data
    const id = data[0] | (data[1] << 8) | (data[2] << 16)
    if (!id) return null
    const face = id & 7
    const vIndex = (id >> 3) - 1
    const v = this._pickOrder[vIndex]
    if (!v) return null
    const d = DIR[face]
    return { x: v.x, y: v.y, z: v.z, key: v.k, face, nx: d[0], ny: d[1], nz: d[2], color: v.color }
  }

  /** 体素中心点的屏幕位置（框选用） */
  screenCenter (key) {
    const { x, y, z } = parseKey(key)
    const p = this.project(x + 0.5, y + 0.5, z + 0.5)
    const cw = this.canvas.width / this.dpr / 2, ch = this.canvas.height / this.dpr / 2
    return { x: cw + p.sx, y: ch + p.sy }
  }

  /** 屏幕矩形框内的体素 key（仅当前层/全部） */
  marquee (rect) {
    const out = []
    for (const v of this._order.length ? this._order : this.buildOrder()) {
      if (this.activeLayer !== null && v.z !== this.activeLayer) continue
      const c = this.screenCenter(v.k)
      if (c.x >= rect.x1 && c.x <= rect.x2 && c.y >= rect.y1 && c.y <= rect.y2) out.push(v.k)
    }
    return out
  }
}
