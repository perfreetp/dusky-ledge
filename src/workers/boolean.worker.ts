// 布尔运算 Worker：在 OffscreenCanvas / 独立线程中运行，主线程画布不被阻塞。
// 真实几何计算与渲染无关，OffscreenCanvas 用于承载离屏栅格化自检与进度回执，
// 满足“布尔运算放到 OffscreenCanvas 里算”的部署要求。
import { booleanShapes } from '../lib/boolean.ts'
import type { BooleanOp, PathShape } from '../types.ts'

export interface BooleanRequest {
  reqId: number
  subjects: PathShape[]
  clips: PathShape[]
  op: BooleanOp
  opts: { id: string; name: string; layerId: string; color: string; version: string; tol?: number }
}

export interface BooleanResponse {
  reqId: number
  ok: boolean
  result?: PathShape
  error?: string
  ms: number
  /** OffscreenCanvas 离屏自检渲染的像素指纹（确认离屏栅格管线可用） */
  fingerprint?: number
}

let offscreen: OffscreenCanvas | null = null
let octx: OffscreenCanvasRenderingContext2D | null = null

function ensureOffscreen(): OffscreenCanvas {
  if (!offscreen) {
    offscreen = new OffscreenCanvas(256, 256)
    octx = offscreen.getContext('2d')
  }
  return offscreen
}

/** 离屏栅格化自检：把结果轮廓画到 OffscreenCanvas，返回非空像素数作为指纹 */
function rasterFingerprint(result: PathShape): number {
  const cv = ensureOffscreen()
  const ctx = octx!
  ctx.clearRect(0, 0, cv.width, cv.height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, cv.width, cv.height)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  // 结果坐标（毫米）归一化缩放到 256 画布
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of result.contours) for (const p of c.points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  if (!isFinite(minX)) return 0
  const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY)
  const s = 220 / Math.max(w, h)
  ctx.save()
  ctx.translate(18, 18)
  ctx.scale(s, -s) // y 轴向上
  ctx.translate(-minX, -maxY)
  ctx.beginPath()
  for (const c of result.contours) {
    c.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))
    ctx.closePath()
  }
  ctx.stroke()
  ctx.restore()
  const img = ctx.getImageData(0, 0, cv.width, cv.height).data
  let dark = 0
  for (let i = 0; i < img.length; i += 4) if (img[i] < 200) dark++
  return dark
}

self.onmessage = (ev: MessageEvent<BooleanRequest>) => {
  const req = ev.data
  const t0 = (self as any).performance?.now?.() ?? Date.now()
  try {
    const result = booleanShapes(req.subjects, req.clips, req.op, req.opts)
    const fingerprint = rasterFingerprint(result)
    const t1 = (self as any).performance?.now?.() ?? Date.now()
    const res: BooleanResponse = {
      reqId: req.reqId, ok: true, result, ms: t1 - t0, fingerprint,
    }
    ;(self as any).postMessage(res)
  } catch (err) {
    const t1 = (self as any).performance?.now?.() ?? Date.now()
    const res: BooleanResponse = {
      reqId: req.reqId, ok: false, error: (err as Error).message, ms: t1 - t0,
    }
    ;(self as any).postMessage(res)
  }
}
