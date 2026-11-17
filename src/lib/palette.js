// 积木配色（仿拼装积木经典色），index 即体素颜色值
export const PALETTE = [
  { name: '中国红', hex: '#C91F2C' },
  { name: '屋顶红', hex: '#E2503C' },
  { name: '暖橙', hex: '#F28A2E' },
  { name: '明黄', hex: '#F7C948' },
  { name: '草绿', hex: '#5BA150' },
  { name: '深绿', hex: '#2E7D4F' },
  { name: '湖蓝', hex: '#2E86C1' },
  { name: '底座灰', hex: '#7F8C8D' },
  { name: '雪白', hex: '#F4F6F7' },
  { name: '墙砖色', hex: '#D9B382' },
  { name: '木门棕', hex: '#8B5A2B' },
  { name: '玻璃蓝', hex: '#7FD4E8' },
  { name: '紫罗兰', hex: '#7D5BA6' },
  { name: '桃粉', hex: '#F2A7B3' },
  { name: '墨黑', hex: '#2C3E50' },
  { name: '沙色', hex: '#E8D8A8' }
]

export function hexToRgb (hex) {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** 按三个朝向的光照系数给面上色，返回 rgb 字符串 */
export function shade (hex, factor) {
  const { r, g, b } = hexToRgb(hex)
  const f = Math.max(0, Math.min(1.4, factor))
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `rgb(${c(r)},${c(g)},${c(b)})`
}
