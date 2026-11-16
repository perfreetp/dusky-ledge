import { MIN_GAP, BOLT_SEAM_MARGIN, HEIGHT_LIMIT, holdType, holdRadius } from '../store.js'

// ---------- 几何工具(纯函数, 不依赖 Babylon) ----------

// 世界坐标 → 岩板局部坐标 (板面为 XY 平面, Z 为法线)
export function toPanelLocal(panel, x, y, z) {
  const dx = x - panel.x, dy = y - panel.y, dz = z - panel.z
  const a = -panel.angleY * Math.PI / 180
  const c = Math.cos(a), s = Math.sin(a)
  return { x: dx * c + dz * s, y: dy, z: -dx * s + dz * c }
}

// 支点各锚栓在岩板局部坐标系中的位置
export function boltLocalPositions(hold, panel) {
  const t = holdType(hold.typeId)
  const offs = []
  if (t.bolts === 1) offs.push([0, 0])
  else if (t.bolts === 2) offs.push([0, t.h * 0.3], [0, -t.h * 0.3])
  else { // 4 螺栓
    offs.push([t.w * 0.3, t.h * 0.3], [-t.w * 0.3, t.h * 0.3],
              [t.w * 0.3, -t.h * 0.3], [-t.w * 0.3, -t.h * 0.3])
  }
  const a = (hold.rotY || 0) * Math.PI / 180
  const c = Math.cos(a), s = Math.sin(a)
  return offs.map(([ox, oy]) => {
    const wx = hold.x + ox * c, wz = hold.z - ox * s, wy = hold.y + oy
    return toPanelLocal(panel, wx, wy, wz)
  })
}

// ---------- 实时碰撞检测(编辑态) ----------
// 1) 与已有支点最小间距  2) 跨板缝
export function computeRealtimeViolations(holds, panels) {
  const out = []
  const panelOf = id => panels.find(p => p.id === id)

  // 支点两两最小间距
  for (let i = 0; i < holds.length; i++) {
    for (let j = i + 1; j < holds.length; j++) {
      const A = holds[i], B = holds[j]
      const d = Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z)
      const need = holdRadius(A.typeId) + holdRadius(B.typeId) + MIN_GAP
      const clear = d - holdRadius(A.typeId) - holdRadius(B.typeId) // 净距
      if (d < need) {
        out.push({
          kind: 'gap', aId: A.id, bId: B.id, dist: clear,
          msg: `${A.id} 与 ${B.id} 净距 ${clear.toFixed(3)}m,小于最小间距 ${MIN_GAP}m`
        })
      }
    }
  }

  // 跨板缝: 支点投影轮廓超出所在板边界
  for (const h of holds) {
    const p = panelOf(h.panelId)
    if (!p) continue
    const t = holdType(h.typeId)
    const l = toPanelLocal(p, h.x, h.y, h.z)
    const overX = Math.abs(l.x) + t.w / 2 - p.width / 2
    const overY = Math.abs(l.y) + t.h / 2 - p.height / 2
    const over = Math.max(overX, overY)
    if (over > 0) {
      out.push({
        kind: 'seam', aId: h.id, dist: -over,
        msg: `${h.id} 跨板缝,超出「${p.name}」边界 ${(over * 1000).toFixed(0)}mm`
      })
    }
  }
  return out
}

// ---------- 整批提交自动检查(三级) ----------
export function runBatchChecks(holds, panels) {
  const items = []
  let n = 1
  const panelOf = id => panels.find(p => p.id === id)

  // 一级: 支点干涉(包围体重叠)
  for (let i = 0; i < holds.length; i++) {
    for (let j = i + 1; j < holds.length; j++) {
      const A = holds[i], B = holds[j]
      const d = Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z)
      const overlap = holdRadius(A.typeId) + holdRadius(B.typeId) - d
      if (overlap > 0) {
        items.push({
          id: 'C' + (n++), level: 1, type: '支点干涉',
          message: `${A.id}(${A.routeId}) 与 ${B.id}(${B.routeId}) 发生干涉`,
          detail: `两支点包围体重叠 ${(overlap * 1000).toFixed(0)}mm,中心距 ${d.toFixed(3)}m`,
          holdIds: [A.id, B.id], status: 'pending', reason: ''
        })
      }
    }
  }

  // 二级: 锚栓落在板缝
  for (const h of holds) {
    const p = panelOf(h.panelId)
    if (!p) continue
    const bolts = boltLocalPositions(h, p)
    bolts.forEach((b, idx) => {
      const dx = p.width / 2 - Math.abs(b.x)
      const dy = p.height / 2 - Math.abs(b.y)
      const m = Math.min(dx, dy)
      if (m < BOLT_SEAM_MARGIN) {
        items.push({
          id: 'C' + (n++), level: 2, type: '锚栓压板缝',
          message: `${h.id} 的 ${idx + 1} 号锚栓距「${p.name}」板缝过近`,
          detail: m >= 0
            ? `锚栓距板边 ${(m * 1000).toFixed(0)}mm,要求 ≥ ${BOLT_SEAM_MARGIN * 1000}mm`
            : `锚栓已超出板边 ${(-m * 1000).toFixed(0)}mm,落在板缝上`,
          holdIds: [h.id], status: 'pending', reason: ''
        })
      }
    })
  }

  // 三级: 超高支点
  for (const h of holds) {
    if (h.y > HEIGHT_LIMIT) {
      items.push({
        id: 'C' + (n++), level: 3, type: '超高支点',
        message: `${h.id} 高度 ${h.y.toFixed(2)}m,超过限高 ${HEIGHT_LIMIT}m`,
        detail: `超出 ${((h.y - HEIGHT_LIMIT) * 100).toFixed(0)}cm,需评估保护点与坠落区`,
        holdIds: [h.id], status: 'pending', reason: ''
      })
    }
  }
  return items
}
