// 二维几何内核：数学工具 / 采样 / 度量 / 凸包 / 布尔运算
// 世界坐标为毫米，y 轴向上；Canvas 渲染时由 view 变换负责翻转
import type { Contour, PathShape, Segment, Vec2 } from '../types.ts'

// ---------- 基础数学 ----------
export const v = (x: number, y: number): Vec2 => ({ x, y })
export const add = (a: Vec2, b: Vec2): Vec2 => v(a.x + b.x, a.y + b.y)
export const sub = (a: Vec2, b: Vec2): Vec2 => v(a.x - b.x, a.y - b.y)
export const mul = (a: Vec2, s: number): Vec2 => v(a.x * s, a.y * s)
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x
export const len = (a: Vec2): number => Math.hypot(a.x, a.y)
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y)
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 =>
  v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)

export const EPS = 1e-9
export const GEOM_EPS = 1e-6 // 毫米级容差

export function ptEq(a: Vec2, b: Vec2, eps = GEOM_EPS): boolean {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

/** 极角（-π..π]） */
export function angle(a: Vec2): number {
  return Math.atan2(a.y, a.x)
}

export function angleBetween(a: Vec2, b: Vec2): number {
  let d = angle(b) - angle(a)
  while (d <= -Math.PI) d += Math.PI * 2
  while (d > Math.PI) d -= Math.PI * 2
  return d
}

/** 两个标量角之差，归一到 (-π, π] */
export function angleDiff(a: number, b: number): number {
  let d = b - a
  while (d <= -Math.PI) d += Math.PI * 2
  while (d > Math.PI) d -= Math.PI * 2
  return d
}

// ---------- 圆弧（DXF bulge 表示） ----------
/**
 * bulge -> 圆心/半径/起止角/扫角。
 * DXF 约定：bulge = tan(θ/4)，正 bulge 表示从 p1 到 p2 顺时针(CW)，负为逆时针(CCW)。
 * 返回的 sweep 为实际有向扫角（CW 为负，与数学角度方向一致）。
 */
export function arcGeom(p1: Vec2, p2: Vec2, bulge: number) {
  const d = sub(p2, p1)
  const chord = len(d)
  const theta = 4 * Math.atan(bulge) // DXF 有符号角：正=CW
  const r = Math.abs(chord / (2 * Math.sin(theta / 2)))
  const mid = mul(add(p1, p2), 0.5)
  const n = v(-d.y / chord, d.x / chord) // 弦左侧法向
  const off = chord / (2 * Math.tan(theta / 2)) // 带符号
  // 统一式：center = mid - n·off（CW 圆心在左、CCW 在右，均成立）
  const center = sub(mid, mul(n, off))
  const norm = (a: number) => (a < 0 ? a + Math.PI * 2 : a)
  const a1Raw = norm(angle(sub(p1, center)))
  const a2Raw = norm(angle(sub(p2, center)))
  const sweep = -theta // 数学扫角（CCW 为正）
  // 让 a2 沿 sweep 方向从 a1 可达：调整 2π 整数倍，使 (a2-a1) 与 sweep 同号且最小
  let a1 = a1Raw, a2 = a2Raw
  while (sweep > 0 && a2 <= a1) a2 += Math.PI * 2
  while (sweep < 0 && a2 >= a1) a2 -= Math.PI * 2
  return { center, r, a1, a2, sweep }
}

/** 圆弧长度 */
export function arcLength(p1: Vec2, p2: Vec2, bulge: number): number {
  const { r, sweep } = arcGeom(p1, p2, bulge)
  return Math.abs(sweep) * r
}

/** 圆弧上按参数 t∈[0,1] 取点（沿 sweep 有向扫角） */
export function arcPoint(p1: Vec2, p2: Vec2, bulge: number, t: number): Vec2 {
  const g = arcGeom(p1, p2, bulge)
  // 直接用有向扫角 sweep 从 a1 出发，避免端点角度的 0/2π 表示歧义
  const a = g.a1 + g.sweep * t
  return v(g.center.x + g.r * Math.cos(a), g.center.y + g.r * Math.sin(a))
}

/** 整圆（圆心+半径）转 bulge 轮廓（4 段 90° 弧；负 bulge=CCW，保持逆时针） */
export function circleContour(center: Vec2, r: number): Contour {
  const b = -(Math.SQRT2 - 1)
  const pts: Vec2[] = [
    v(center.x + r, center.y),
    v(center.x, center.y + r),
    v(center.x - r, center.y),
    v(center.x, center.y - r),
  ]
  const segments: Segment[] = pts.map((p, i) => ({
    type: 'arc',
    e: pts[(i + 1) % 4],
    bulge: b,
  }))
  return { points: pts, segments, closed: true }
}

/** 由圆弧上三点（起点、弧上点、终点）构造 bulge 弧段；共线时退化为直线 bulge=0 */
export function arcFromThreePoints(p1: Vec2, pm: Vec2, p2: Vec2): { p1: Vec2; p2: Vec2; bulge: number } {
  // 外接圆心：p1-pm 与 pm-p2 两弦中垂线交点
  const m1 = mul(add(p1, pm), 0.5)
  const m2 = mul(add(pm, p2), 0.5)
  const d1 = sub(pm, p1), d2 = sub(p2, pm)
  // 法向
  const n1 = v(-d1.y, d1.x), n2 = v(-d2.y, d2.x)
  // 解 m1 + t*n1 = m2 + u*n2
  const w = sub(m2, m1)
  const den = cross(n1, n2)
  if (Math.abs(den) < GEOM_EPS) return { p1: { ...p1 }, p2: { ...p2 }, bulge: 0 }
  const t = cross(w, n2) / den
  const center = add(m1, mul(n1, t))
  const r = dist(center, p1)
  const a1 = angle(sub(p1, center))
  const am = angle(sub(pm, center))
  const a2 = angle(sub(p2, center))
  // 候选数学扫角（CCW 为正）：短弧与其补弧，二选一使 am 落在弧上
  const base = angleDiff(a1, a2) // (-π,π]
  const candidates = [base, base > 0 ? base - Math.PI * 2 : base + Math.PI * 2]
  const onArc = (sw: number) => {
    const dm = angleDiff(a1, am) // am 相对 a1 的有向角
    if (sw > 0) return dm > 0 && dm <= sw + GEOM_EPS
    return dm < 0 && dm >= sw - GEOM_EPS
  }
  let sweep = candidates.find(onArc) ?? base
  void r
  // DXF bulge 与数学扫角符号相反（正 bulge = CW/负数学扫角）
  return { p1: { ...p1 }, p2: { ...p2 }, bulge: Math.tan(-sweep / 4) }
}

/** 单段圆弧闭合轮廓（弦 + 弧），bulge 由三点给出 */
export function arcContour(p1: Vec2, pm: Vec2, p2: Vec2): Contour {
  const arc = arcFromThreePoints(p1, pm, p2)
  const points = [{ ...arc.p1 }, { ...arc.p2 }]
  const segments: Segment[] = [
    { type: 'arc', e: { ...arc.p2 }, bulge: arc.bulge },
    { type: 'line', e: { ...arc.p1 } },
  ]
  return { points, segments, closed: true }
}

/** 贝塞尔开放轮廓：每相邻 4 点一条三次贝塞尔，余量用直线连接 */
export function bezierContour(pts: Vec2[]): Contour {
  const points: Vec2[] = [{ ...pts[0] }]
  const segments: Segment[] = []
  let i = 0
  while (i + 3 < pts.length) {
    const p3 = pts[i + 3]
    points.push({ ...p3 })
    segments.push({ type: 'cubic', e: { ...p3 }, c1: { ...pts[i + 1] }, c2: { ...pts[i + 2] } })
    i += 3
  }
  for (let k = i + 1; k < pts.length; k++) {
    points.push({ ...pts[k] })
    segments.push({ type: 'line', e: { ...pts[k] } })
  }
  if (segments.length < points.length) {
    segments.push({ type: 'line', e: { ...points[points.length - 1] } })
  }
  return { points, segments, closed: false }
}

/** 矩形轮廓 */
export function rectContour(a: Vec2, b: Vec2): Contour {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x)
  const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y)
  const pts = [v(x0, y0), v(x1, y0), v(x1, y1), v(x0, y1)]
  return {
    points: pts,
    segments: pts.map((p, i) => ({ type: 'line', e: pts[(i + 1) % 4] })),
    closed: true,
  }
}

/** 多边形轮廓 */
export function polygonContour(pts: Vec2[]): Contour {
  const n = pts.length
  return {
    points: pts.map(p => ({ ...p })),
    segments: pts.map((p, i) => ({ type: 'line', e: pts[(i + 1) % n] })),
    closed: true,
  }
}

// ---------- 三次贝塞尔 ----------
export function cubicPoint(p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t
  return v(
    a * p0.x + b * c1.x + c * c2.x + d * p3.x,
    a * p0.y + b * c1.y + c * c2.y + d * p3.y,
  )
}

export function cubicDeriv(p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t
  return v(
    3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x),
    3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c2.y) + 3 * t * t * (p3.y - c2.y),
  )
}

// ---------- 采样：Contour -> 折线（用于布尔/渲染/命中） ----------
export function sampleContour(c: Contour, tol = 0.25): Vec2[] {
  const out: Vec2[] = []
  const n = c.points.length
  const segCount = c.closed ? n : n - 1
  for (let i = 0; i < segCount; i++) {
    const p0 = c.points[i]
    const seg = c.segments[i]
    const p1 = seg.e
    if (i === 0) out.push({ ...p0 })
    if (seg.type === 'line') {
      out.push({ ...p1 })
    } else if (seg.type === 'arc') {
      const g = arcGeom(p0, p1, seg.bulge ?? 0)
      const steps = Math.max(4, Math.ceil((Math.abs(g.sweep) * g.r) / tol))
      for (let k = 1; k <= steps; k++) out.push(arcPoint(p0, p1, seg.bulge!, k / steps))
    } else {
      // 三次贝塞尔：按弦高容差自适应细分
      const c1 = seg.c1!, c2 = seg.c2!
      const steps = bezierSteps(p0, c1, c2, p1, tol)
      for (let k = 1; k <= steps; k++) out.push(cubicPoint(p0, c1, c2, p1, k / steps))
    }
  }
  return out
}

function bezierSteps(p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2, tol: number): number {
  // 经验：控制点偏离弦越远分段越多
  const chord = dist(p0, p3) || 1
  const dev =
    (dist(c1, lerp(p0, p3, 1 / 3)) + dist(c2, lerp(p0, p3, 2 / 3))) / 2
  const base = Math.max(4, Math.ceil(6 * Math.sqrt(dev / chord)))
  // 长度上限保护
  const approxLen =
    dist(p0, c1) + dist(c1, c2) + dist(c2, p3)
  return Math.max(base, Math.min(64, Math.ceil(approxLen / (tol * 4))))
}

// ---------- 度量 ----------
/** 有符号面积（y 向上：逆时针为正） */
export function polygonArea(pts: Vec2[]): number {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    s += cross(a, b)
  }
  return s / 2
}

/** 折线周长 */
export function polylineLength(pts: Vec2[], closed: boolean): number {
  let s = 0
  const n = pts.length
  const lim = closed ? n : n - 1
  for (let i = 0; i < lim; i++) s += dist(pts[i], pts[(i + 1) % n])
  return s
}

/** 精确周长（弧与贝塞尔按解析/积分长度计算） */
export function contourPerimeter(c: Contour): number {
  let s = 0
  const n = c.points.length
  const lim = c.closed ? n : n - 1
  for (let i = 0; i < lim; i++) {
    const p0 = c.points[i]
    const seg = c.segments[i]
    if (seg.type === 'line') s += dist(p0, seg.e)
    else if (seg.type === 'arc') s += arcLength(p0, seg.e, seg.bulge!)
    else s += cubicLength(p0, seg.c1!, seg.c2!, seg.e)
  }
  return s
}

/** 贝塞尔弧长：高斯-勒让德积分 */
function cubicLength(p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2): number {
  // 5 点 Gauss-Legendre
  const gx = [0, 0.5384693101056831, -0.5384693101056831, 0.906179845938664, -0.906179845938664]
  const gw = [0.5688888888888889, 0.4786286704993665, 0.4786286704993665, 0.2369268850561891, 0.2369268850561891]
  let s = 0
  for (let i = 0; i < 5; i++) {
    const t = (gx[i] + 1) / 2
    const d = cubicDeriv(p0, c1, c2, p3, t)
    s += gw[i] * len(d) * 0.5
  }
  return s
}

/** 形状总面积（各轮廓带符号求和，支持孔洞）与总周长 */
export function shapeMetrics(shape: PathShape): { area: number; perimeter: number } {
  let area = 0, perimeter = 0
  for (const c of shape.contours) {
    area += polygonArea(sampleContour(c, 0.1))
    perimeter += contourPerimeter(c)
  }
  return { area: Math.abs(area), perimeter }
}

// ---------- 包围盒 ----------
export interface BBox { minX: number; minY: number; maxX: number; maxY: number }

export function contourBBox(c: Contour): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of sampleContour(c, 0.5)) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

export function shapeBBox(s: PathShape): BBox {
  const bs = s.contours.map(contourBBox)
  return {
    minX: Math.min(...bs.map(b => b.minX)),
    minY: Math.min(...bs.map(b => b.minY)),
    maxX: Math.max(...bs.map(b => b.maxX)),
    maxY: Math.max(...bs.map(b => b.maxY)),
  }
}

// ---------- 点在多边形内（射线法，折线采样） ----------
export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

export function pointOnPolygon(p: Vec2, poly: Vec2[], tol: number): boolean {
  for (let i = 0; i < poly.length; i++) {
    if (distToSegment(p, poly[i], poly[(i + 1) % poly.length]) <= tol) return true
  }
  return false
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const d = sub(b, a)
  const l2 = dot(d, d)
  if (l2 < EPS) return dist(p, a)
  const t = clamp(dot(sub(p, a), d) / l2, 0, 1)
  return dist(p, lerp(a, b, t))
}

// ---------- 凸包（Andrew monotone chain），用于求交兜底/轮廓归并 ----------
export function convexHull(pts: Vec2[]): Vec2[] {
  const p = pts.map(q => ({ ...q })).sort((a, b) => a.x - b.x || a.y - b.y)
  if (p.length <= 2) return p
  const cross3 = (o: Vec2, a: Vec2, b: Vec2) => cross(sub(a, o), sub(b, o))
  const lo: Vec2[] = []
  for (const q of p) {
    while (lo.length >= 2 && cross3(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  const up: Vec2[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (up.length >= 2 && cross3(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop()
    up.push(q)
  }
  lo.pop(), up.pop()
  return lo.concat(up)
}
