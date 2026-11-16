// 布尔运算引擎：边对裁剪（edge-clipping，Vatti 思路）
// 输入轮廓先按容差采样为折线并在交点处互相切开，按 inside/outside 逐边发射输出环。
// 输出全部为 line 段，交点作为可编辑节点保留；顶点命中正确处理，支持孔洞。
import type { BooleanOp, Contour, PathShape, Segment, Vec2 } from '../types.ts'
import {
  GEOM_EPS, clamp, dist, lerp, pointInPolygon, polygonArea, ptEq,
  sampleContour, sub, v,
} from './geometry.ts'

interface Edge {
  s: Vec2
  e: Vec2
  /** 交点参数（含 0/1 端点），升序 */
  ts: number[]
  poly: 0 | 1
}

function edgeIntersect(
  p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2,
): { t: number; u: number; p: Vec2 } | null {
  const d1 = sub(p2, p1), d2 = sub(p4, p3)
  const denom = d1.x * d2.y - d1.y * d2.x
  if (Math.abs(denom) < GEOM_EPS) return null
  const d3 = sub(p3, p1)
  const t = (d3.x * d2.y - d3.y * d2.x) / denom
  const u = (d3.x * d1.y - d3.y * d1.x) / denom
  if (t < -GEOM_EPS || t > 1 + GEOM_EPS || u < -GEOM_EPS || u > 1 + GEOM_EPS) return null
  return { t: clamp(t, 0, 1), u: clamp(u, 0, 1), p: lerp(p1, p2, clamp(t, 0, 1)) }
}

/** 把一个折线环切成边，并给每条边预置 0、1 参数 */
function ringToEdges(pts: Vec2[], poly: 0 | 1): Edge[] {
  const edges: Edge[] = []
  for (let i = 0; i < pts.length; i++) {
    edges.push({ s: pts[i], e: pts[(i + 1) % pts.length], ts: [0, 1], poly })
  }
  return edges
}

function dot2(a: Vec2, b: Vec2): number { return a.x * b.x + a.y * b.y }

/** 点是否落在（另一组）环内：偶数规则，对所有环做奇偶叠加 */
function insideAny(p: Vec2, rings: Vec2[][]): boolean {
  let odd = false
  for (const r of rings) if (pointInPolygon(p, r)) odd = !odd
  return odd
}

/**
 * 判定一条边上每个参数子段的 inside 状态（保留接口，当前用中点偏移法）。
 */
function add2(a: Vec2, b: Vec2): Vec2 { return v(a.x + b.x, a.y + b.y) }
function mul2(a: Vec2, s: number): Vec2 { return v(a.x * s, a.y * s) }

/** 按无向几何边去重：端点键相同（不分方向）的子边只保留一份 */
function dedupePiecesByGeom(pieces: { a: Vec2; b: Vec2 }[]): { a: Vec2; b: Vec2 }[] {
  const key = (p: Vec2) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)}`
  const seen = new Set<string>()
  const out: { a: Vec2; b: Vec2 }[] = []
  for (const p of pieces) {
    const directed = `${key(p.a)}>${key(p.b)}`
    if (seen.has(directed)) continue
    seen.add(directed)
    out.push(p)
  }
  return out
}

/** 用一组子边（相邻参数点之间）拼接成闭合环；分岔点按转角规则选择接续边 */
function chainLoops(pieces: { a: Vec2; b: Vec2 }[]): Vec2[][] {
  const out: Vec2[][] = []
  const rem = pieces.map(p => ({ a: p.a, b: p.b, used: false }))
  const key = (p: Vec2) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)}`
  const head = new Map<string, number[]>()
  const tail = new Map<string, number[]>()
  rem.forEach((p, i) => {
    if (!head.has(key(p.a))) head.set(key(p.a), [])
    head.get(key(p.a))!.push(i)
    if (!tail.has(key(p.b))) tail.set(key(p.b), [])
    tail.get(key(p.b))!.push(i)
  })

  const ang = (p: Vec2): number => {
    const a = Math.atan2(p.y, p.x)
    return a < 0 ? a + Math.PI * 2 : a
  }

  for (let i = 0; i < rem.length; i++) {
    if (rem[i].used) continue
    const loop: Vec2[] = []
    let cur = i
    let prevPt: Vec2 | null = null
    let guard = 0
    while (guard++ < rem.length + 2) {
      rem[cur].used = true
      loop.push({ ...rem[cur].a })
      const k = key(rem[cur].b)
      const cands = (head.get(k) || []).filter(j => !rem[j].used)
      if (!cands.length) break
      let nxt: number
      if (cands.length === 1 || !prevPt) {
        nxt = cands[0]
      } else {
        // 来边方向角；候选方向相对它归一化到 [0,2π)，取最小=最右（急右转），
        // 使外环保持逆时针、孔洞保持顺时针
        const inAng = ang(sub(rem[cur].b, prevPt!))
        nxt = cands.reduce((best, j) => {
          const rel = (ang(sub(rem[j].b, rem[cur].b)) - inAng + Math.PI * 2) % (Math.PI * 2)
          const relBest = (ang(sub(rem[best].b, rem[cur].b)) - inAng + Math.PI * 2) % (Math.PI * 2)
          return rel < relBest ? j : best
        })
      }
      prevPt = rem[cur].a
      cur = nxt
      if (rem[cur].used || cur === i) break
    }
    if (loop.length >= 3 && ptEq(loop[0], loop[loop.length - 1])) loop.pop()
    if (loop.length >= 3) out.push(loop)
  }
  return out
}

/** 节点重合去重 + 共线点精简 */
export function dedupeLoop(pts: Vec2[], eps = 1e-3): Vec2[] {
  const out: Vec2[] = []
  for (const p of pts) {
    if (!out.length || dist(out[out.length - 1], p) > eps) out.push({ ...p })
  }
  if (out.length > 1 && ptEq(out[0], out[out.length - 1], eps)) out.pop()
  const res: Vec2[] = []
  const n = out.length
  for (let i = 0; i < n; i++) {
    const a = out[(i + n - 1) % n], b = out[i], c = out[(i + 1) % n]
    const d1 = sub(b, a), d2 = sub(c, b)
    if (Math.abs(d1.x * d2.y - d1.y * d2.x) > eps * 100) res.push(b)
  }
  return res.length >= 3 ? res : out
}

function flattenShape(shape: PathShape, tol: number): Vec2[][] {
  return shape.contours
    .map(c => sampleContour(c, tol))
    .filter(p => p.length >= 3)
    .map(p => dedupeLoop(p))
}

/**
 * 对一组形状执行布尔运算。
 * subjects 为主体；subtract 时 clips 为被减区域。
 * 输出 PathShape 的全部轮廓均为 line 段，每个顶点都是可编辑节点，孔洞为顺时针子轮廓。
 */
export function booleanShapes(
  subjects: PathShape[],
  clips: PathShape[],
  op: BooleanOp,
  opts: { tol?: number; id: string; name: string; layerId: string; color: string; version: string } =
    { id: 'bool', name: '布尔结果', layerId: '0', color: '#2563eb', version: 'v1', tol: 0.5 },
): PathShape {
  const tol = opts.tol ?? 0.5
  const ringsA = subjects.flatMap(s => flattenShape(s, tol))
  const ringsB = clips.flatMap(s => flattenShape(s, tol))

  // 无交叉快速路径（包含/分离）
  const pieces: { a: Vec2; b: Vec2 }[] = []
  const edgesA: Edge[] = ringsA.flatMap(r => ringToEdges(r, 0))
  const edgesB: Edge[] = ringsB.flatMap(r => ringToEdges(r, 1))

  // 1) 求所有交点，切分边
  for (const ea of edgesA) {
    for (const eb of edgesB) {
      const hit = edgeIntersect(ea.s, ea.e, eb.s, eb.e)
      if (!hit) continue
      // 交点参数一律登记（含端点 0/1），保证边界子边被切出并参与 inside 判定
      ea.ts.push(hit.t)
      eb.ts.push(hit.u)
      // 端点命中：把端点坐标对齐到精确交点，保证拼接键一致
      if (hit.t <= GEOM_EPS) ea.s = { ...hit.p }
      if (hit.t >= 1 - GEOM_EPS) ea.e = { ...hit.p }
      if (hit.u <= GEOM_EPS) eb.s = { ...hit.p }
      if (hit.u >= 1 - GEOM_EPS) eb.e = { ...hit.p }
    }
  }
  for (const e of [...edgesA, ...edgesB]) {
    e.ts.sort((x, y) => x - y)
    e.ts = e.ts.filter((t, i) => i === 0 || Math.abs(t - e.ts[i - 1]) > GEOM_EPS)
  }

  // 子边相对对方的位置分类：双侧探针
  //  'in' 严格内部（两侧都在）| 'out' 严格外部 | 'boundary' 共享边界（一内一外）
  const classify = (e: Edge, t0: number, t1: number, otherRings: Vec2[][]): 'in' | 'out' | 'boundary' => {
    const mid = lerp(e.s, e.e, (t0 + t1) / 2)
    const d = sub(e.e, e.s)
    const l = Math.hypot(d.x, d.y) || 1
    const nx = -d.y / l, ny = d.x / l
    const eps = 1e-4
    const left = insideAny(v(mid.x + nx * eps, mid.y + ny * eps), otherRings)
    const right = insideAny(v(mid.x - nx * eps, mid.y - ny * eps), otherRings)
    if (left && right) return 'in'
    if (!left && !right) return 'out'
    return 'boundary'
  }

  // 2) 按操作选择子边。
  //   union:      外部边 + 共享边界（一份）
  //   intersect:  内部边 + 共享边界（一份）
  //   subtract:   A 的外部边；B 的内部边反向；共享边界丢弃
  for (const ea of edgesA) {
    for (let k = 0; k < ea.ts.length - 1; k++) {
      const t0 = ea.ts[k], t1 = ea.ts[k + 1]
      if (t1 - t0 < GEOM_EPS) continue
      const a = lerp(ea.s, ea.e, t0), b = lerp(ea.s, ea.e, t1)
      const cls = classify(ea, t0, t1, ringsB)
      if (op === 'union' && cls !== 'in') pieces.push({ a, b })
      if (op === 'intersect' && cls !== 'out') pieces.push({ a, b })
      if (op === 'subtract' && cls === 'out') pieces.push({ a, b })
    }
  }
  for (const eb of edgesB) {
    for (let k = 0; k < eb.ts.length - 1; k++) {
      const t0 = eb.ts[k], t1 = eb.ts[k + 1]
      if (t1 - t0 < GEOM_EPS) continue
      const a = lerp(eb.s, eb.e, t0), b = lerp(eb.s, eb.e, t1)
      const cls = classify(eb, t0, t1, ringsA)
      if (op === 'union' && cls === 'out') pieces.push({ a, b })
      if (op === 'intersect' && cls === 'in') pieces.push({ a, b })
      if (op === 'subtract' && cls === 'in') pieces.push({ a: b, b: a }) // 孔洞反向
      // 共享边界由 A 边在 union/intersect 中输出，B 边跳过，天然只一份
    }
  }

  // 同向重复子边去重（共线重叠的冗余输出）
  const dedupPieces = dedupePiecesByGeom(pieces)

  let loops = chainLoops(dedupPieces)

  // 无任何交点时的包含/分离兜底
  if (!loops.length && pieces.length === 0 && edgesA.length && edgesB.length) {
    const a0 = ringsA[0][0], b0 = ringsB[0][0]
    const aInB = insideAny(a0, ringsB), bInA = insideAny(b0, ringsA)
    if (op === 'union') loops = aInB ? ringsB : bInA ? ringsA : [...ringsA, ...ringsB]
    else if (op === 'intersect') loops = aInB ? ringsA : bInA ? ringsB : []
    else loops = bInA ? [...ringsA, ...ringsB.map(r => r.slice().reverse())] : ringsA
  } else if (!loops.length && pieces.length > 0) {
    // 交点都在端点、未形成闭环的退化情形：按包含关系给整环
    const aInB = ringsA.length && insideAny(ringsA[0][0], ringsB)
    const bInA = ringsB.length && insideAny(ringsB[0][0], ringsA)
    if (op === 'union') loops = aInB ? ringsB : bInA ? ringsA : [...ringsA, ...ringsB]
    else if (op === 'intersect') loops = aInB ? ringsA : bInA ? ringsB : []
    else loops = bInA ? [...ringsA, ...ringsB.map(r => r.slice().reverse())] : ringsA
  }

  // 定向：按包含关系区分外环/孔洞。外环逆时针(正面积)，孔洞顺时针(负面积)。
  const rawLoops = loops.map(l => dedupeLoop(l)).filter(l => l.length >= 3)
  const contours: Contour[] = rawLoops.map(pts => {
    const area = polygonArea(pts)
    // 一个环是孔洞，当且仅当它的首顶点落在另一个更大的环内部
    const isHole = rawLoops.some(other =>
      other !== pts && Math.abs(polygonArea(other)) > Math.abs(area) &&
      pointInPolygon(pts[0], other))
    const wantPositive = !isHole
    const ordered = (area >= 0) === wantPositive ? pts : pts.slice().reverse()
    const n = ordered.length
    const segments: Segment[] = ordered.map((p, i) => ({
      type: 'line', e: ordered[(i + 1) % n],
    }))
    return { points: ordered.map(p => ({ ...p })), segments, closed: true }
  })

  return {
    id: opts.id,
    name: opts.name,
    layerId: opts.layerId,
    color: opts.color,
    contours,
    booleanOrigin: {
      op,
      sources: subjects.map(s => s.id).concat(clips.map(s => s.id)),
      version: opts.version,
    },
    createdAt: Date.now(),
  }
}
