// 分组与材质定义：设备教具分为外壳 / 机架 / 传动 / 电控四组
export const GROUPS = [
  {
    id: 0,
    key: 'shell',
    name: '外壳',
    en: 'SHELL',
    color: '#b9ad90',
    desc: '防护罩、钣金、视窗、装饰板',
  },
  {
    id: 1,
    key: 'frame',
    name: '机架',
    en: 'FRAME',
    color: '#46545f',
    desc: '床身、立柱、底座、横梁',
  },
  {
    id: 2,
    key: 'drive',
    name: '传动',
    en: 'DRIVE',
    color: '#cf672a',
    desc: '主轴、导轨、丝杠、减速机',
  },
  {
    id: 3,
    key: 'elec',
    name: '电控',
    en: 'ELECTRIC',
    color: '#2b8371',
    desc: '电柜、线束、传感器、操作台',
  },
]

// 材质调色板；color 为 null 表示沿用所属分组的颜色
export const MATERIALS = [
  { id: -1, name: '随组色', short: '组色', color: null, alpha: 1, metal: 0.15, rough: 0.72 },
  { id: 0, name: '拉丝不锈钢', short: '不锈钢', color: '#aeb4b8', alpha: 1, metal: 0.85, rough: 0.34 },
  { id: 1, name: '铸铁', short: '铸铁', color: '#6d7274', alpha: 1, metal: 0.55, rough: 0.82 },
  { id: 2, name: '阳极氧化铝', short: '铝', color: '#d3d7d8', alpha: 1, metal: 0.5, rough: 0.42 },
  { id: 3, name: '防爆玻璃', short: '玻璃', color: '#9cc6c4', alpha: 0.28, metal: 0.1, rough: 0.1 },
  { id: 4, name: '亚克力板', short: '亚克力', color: '#bcd7c6', alpha: 0.45, metal: 0.05, rough: 0.2 },
  { id: 5, name: '橡胶', short: '橡胶', color: '#3a3e3c', alpha: 1, metal: 0.0, rough: 0.95 },
  { id: 6, name: '紫铜', short: '铜', color: '#b56a3a', alpha: 1, metal: 0.9, rough: 0.36 },
  { id: 7, name: '安全黄', short: '安全黄', color: '#e0a92f', alpha: 1, metal: 0.1, rough: 0.6 },
]

export const MATERIAL_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]))

// 每格透明度用 1..15 的档位量化后存进 cell，渲染时换算回 0.07..1
export const qToAlpha = (q) => Math.max(1, Math.min(15, q || 15)) / 15
// 界面滑杆用百分比（5%..100%）映射到档位
export const qToPercent = (q) => Math.round((Math.max(1, Math.min(15, q || 15)) / 15) * 100)
export const percentToQ = (p) => Math.max(1, Math.min(15, Math.round((p / 100) * 15)))
