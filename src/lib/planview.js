// 分层切片平面视图（俯视）：Canvas2D 网格 + 数学反算拾取，支持镜像轴/选区/幽灵块
import { PALETTE } from './palette.js'
import { keyOf, mirrorCoord } from './voxel.js'

export class PlanRenderer {
  constructor (canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.model = null
    this.layer = 0
    this.mirror = 'off'
    this.selection = new Set()
    this.hoverCell = null
    this.ghost = null // {x,y,color}
    this.dpr = 1
    this.cell = 28
    this.originX = 0
    this.originY = 0
  }

  resize (cssW, cssH, dpr) {
    this.dpr = dpr
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr))
    if (this.canvas.width !== w) this.canvas.width = w
    if (this.canvas.height !== h) this.canvas.height = h
  }

  layout () {
    const n = this.model.size
    this.cell = Math.max(10, Math.min(34, Math.floor(Math.min(
      this.canvas.width / this.dpr, this.canvas.height / this.dpr
    ) / (n + 1.4))))
    const total = this.cell * n
    this.originX = (this.canvas.width / this.dpr - total) / 2
    this.originY = (this.canvas.height / this.dpr - total) / 2
  }

  cellAt (cssX, cssY) {
    const n = this.model.size
    const x = Math.floor((cssX - this.originX) / this.cell)
    const y = Math.floor((cssY - this.originY) / this.cell)
    if (x < 0 || y < 0 || x >= n || y >= n) return null
    return { x, y }
  }

  render () {
    const { ctx, canvas } = this
    this.layout()
    const n = this.model.size
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(this.dpr, this.dpr)
    ctx.clearRect(0, 0, canvas.width / this.dpr, canvas.height / this.dpr)
    const ox = this.originX, oy = this.originY, c = this.cell

    // 底盘
    ctx.fillStyle = 'rgba(96,125,159,0.10)'
    ctx.fillRect(ox, oy, c * n, c * n)

    // 体素格
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const color = this.model.voxels.get(keyOf(x, y, this.layer))
        const px = ox + x * c, py = oy + y * c
        if (color !== undefined) {
          const col = PALETTE[color % PALETTE.length]
          ctx.fillStyle = col.hex
          ctx.fillRect(px + 0.5, py + 0.5, c - 1, c - 1)
          // 顶面高光，增加积木质感
          ctx.fillStyle = 'rgba(255,255,255,0.18)'
          ctx.fillRect(px + 1, py + 1, c - 2, Math.max(2, c * 0.22))
        }
      }
    }

    // 网格线
    ctx.strokeStyle = 'rgba(96,125,159,0.35)'
    ctx.lineWidth = 0.6
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(ox + i * c, oy); ctx.lineTo(ox + i * c, oy + n * c); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ox, oy + i * c); ctx.lineTo(ox + n * c, oy + i * c); ctx.stroke()
    }

    // 镜像轴
    const mid = (n - 1) / 2
    const axis = (dir) => {
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 1.4
      if (dir === 'x') {
        const ax = ox + (mid + 0.5) * c
        ctx.strokeStyle = 'rgba(231,76,60,0.95)'
        ctx.beginPath(); ctx.moveTo(ax, oy); ctx.lineTo(ax, oy + n * c); ctx.stroke()
      } else {
        const ay = oy + (mid + 0.5) * c
        ctx.strokeStyle = 'rgba(46,134,193,0.95)'
        ctx.beginPath(); ctx.moveTo(ox, ay); ctx.lineTo(ox + n * c, ay); ctx.stroke()
      }
      ctx.setLineDash([])
    }
    if (this.mirror === 'x' || this.mirror === 'both') axis('x')
    if (this.mirror === 'y' || this.mirror === 'both') axis('y')

    // 选区
    if (this.selection.size) {
      ctx.strokeStyle = '#FFB300'
      ctx.fillStyle = 'rgba(255,179,0,0.22)'
      ctx.lineWidth = 1.6
      for (const k of this.selection) {
        const [x, y, z] = k.split(',').map(Number)
        if (z !== this.layer) continue
        ctx.fillRect(ox + x * c, oy + y * c, c, c)
        ctx.strokeRect(ox + x * c + 0.8, oy + y * c + 0.8, c - 1.6, c - 1.6)
      }
    }

    // 悬停/幽灵
    if (this.hoverCell) {
      const { x, y } = this.hoverCell
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = 1.6
      ctx.strokeRect(ox + x * c + 1, oy + y * c + 1, c - 2, c - 2)
    }
    if (this.ghost) {
      const { x, y, color } = this.ghost
      const col = PALETTE[color % PALETTE.length]
      ctx.globalAlpha = 0.55
      ctx.fillStyle = col.hex
      ctx.fillRect(ox + x * c + 1, oy + y * c + 1, c - 2, c - 2)
      ctx.globalAlpha = 1
    }
  }

  /** 当前镜像设置下，悬停格对应的全部落点 */
  fanCells (x, y) {
    const n = this.model.size
    const pts = [[x, y]]
    if (this.mirror === 'x' || this.mirror === 'both') pts.push([mirrorCoord(this.model, 'x', x), y])
    if (this.mirror === 'y' || this.mirror === 'both') pts.push([x, mirrorCoord(this.model, 'y', y)])
    if (this.mirror === 'both') pts.push([mirrorCoord(this.model, 'x', x), mirrorCoord(this.model, 'y', y)])
    const seen = new Set()
    return pts.filter(([cx, cy]) => {
      const k = `${cx},${cy}`
      if (seen.has(k)) return false
      seen.add(k); return true
    })
  }
}
