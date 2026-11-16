import { writable, derived, get } from 'svelte/store'

// ---------- 常量 ----------
export const MIN_GAP = 0.08        // 支点间最小净距(米)
export const BOLT_SEAM_MARGIN = 0.03 // 锚栓距板缝最小距离(米)
export const HEIGHT_LIMIT = 4.0    // 支点超高限值(米)

// ---------- 基础数据 ----------
export const panels = writable([])        // [{id,name,x,y,z,width,height,angleY,thickness}]
export const routes = writable([])        // [{id,name,color,grade}]
export const holds = writable([])         // [{id,typeId,routeId,panelId,x,y,z,rotY}]
export const violations = writable([])    // 实时碰撞结果 [{kind,aId,bId?,msg,dist}]
export const selectedHoldId = writable(null)
export const activeRouteId = writable(null)

// 批次: draft 草稿 / submitted 已提交待复核 / approved 已放行 / returned 已退回
export const batch = writable({
  status: 'draft',
  items: [],        // [{id,level,type,message,detail,status:'pending'|'confirmed'|'rejected',reason}]
  submittedAt: null,
  history: []       // [{time,action,note}]
})

export const screen = writable('editor')  // editor | views | check | review

// ---------- 支点库 ----------
export const holdTypes = [
  { id: 'jug',     name: '大点 JUG',   shape: 'sphere', w: 0.22, h: 0.16, d: 0.10, bolts: 2 },
  { id: 'crimp',   name: '指力 CRIMP', shape: 'box',    w: 0.16, h: 0.05, d: 0.04, bolts: 1 },
  { id: 'sloper',  name: '包 SLOPER',  shape: 'dome',   w: 0.20, h: 0.14, d: 0.09, bolts: 2 },
  { id: 'pocket',  name: '洞 POCKET',  shape: 'cyl',    w: 0.14, h: 0.14, d: 0.07, bolts: 1 },
  { id: 'volume',  name: '造型 VOLUME',shape: 'pyr',    w: 0.40, h: 0.40, d: 0.18, bolts: 4 },
  { id: 'foothold',name: '脚点 FOOT',  shape: 'box',    w: 0.10, h: 0.06, d: 0.05, bolts: 1 }
]

export function holdType(id) { return holdTypes.find(t => t.id === id) }

// 支点近似包围半径(用于间距检测)
export function holdRadius(typeId) {
  const t = holdType(typeId)
  return Math.max(t.w, t.h) / 2
}

// ---------- 统计(每条线路) ----------
export const routeStats = derived([routes, holds, panels], ([$routes, $holds, $panels]) => {
  const totalArea = $panels.reduce((s, p) => s + p.width * p.height, 0)
  return $routes.map(r => {
    const hs = $holds.filter(h => h.routeId === r.id)
    const bolts = hs.reduce((s, h) => s + holdType(h.typeId).bolts, 0)
    const area = hs.reduce((s, h) => { const t = holdType(h.typeId); return s + t.w * t.h }, 0)
    const usedPanels = new Set(hs.map(h => h.panelId).filter(Boolean))
    return {
      route: r,
      count: hs.length,
      bolts,
      panels: usedPanels.size,
      area,
      ratio: totalArea > 0 ? area / totalArea : 0
    }
  })
})

// ---------- 批次流转 ----------
export function pushHistory(action, note = '') {
  batch.update(b => ({ ...b, history: [...b.history, { time: new Date().toLocaleString(), action, note }] }))
}

export function markDirty() {
  // 编辑后若批次已提交/放行,回到草稿态
  const b = get(batch)
  if (b.status === 'submitted' || b.status === 'approved' || b.status === 'returned') {
    batch.update(x => ({ ...x, status: 'draft', items: [] }))
    pushHistory('编辑变更', '方案被修改,批次回到草稿态,需重新提交检查')
  }
}

// ---------- 本地持久化 ----------
const KEY = 'climb-editor-v1'
export function saveLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      panels: get(panels), routes: get(routes), holds: get(holds), batch: get(batch)
    }))
  } catch (e) { /* 忽略 */ }
}
export function loadLocal() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const d = JSON.parse(raw)
    if (d.panels) panels.set(d.panels)
    if (d.routes) routes.set(d.routes)
    if (d.holds) holds.set(d.holds)
    if (d.batch) batch.set(d.batch)
    return true
  } catch (e) { return false }
}
