// 通用工具
let counter = 0

/** 生成唯一 id（时间戳 + 自增 + 随机后缀，避免碰撞） */
export function uid(prefix = 'id'): string {
  counter += 1
  const rand = Math.floor(Math.random() * 1e6).toString(36)
  return `${prefix}_${Date.now().toString(36)}_${counter}_${rand}`
}

/** 深拷贝（结构化数据，无函数/循环引用） */
export function clone<T>(x: T): T {
  return structuredClone(x)
}

/** 数字吸附到网格 */
export function snapGrid(value: number, grid: number): number {
  if (grid <= 0) return value
  return Math.round(value / grid) * grid
}

/** 毫米数字格式化（保留有效小数，去掉多余 0） */
export function fmtMm(n: number): string {
  if (!isFinite(n)) return '—'
  const abs = Math.abs(n)
  const digits = abs >= 1000 ? 1 : abs >= 100 ? 2 : 3
  return `${n.toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: 0 })}`
}

/** 面积/周长度量格式化 */
export function fmtArea(n: number): string {
  if (Math.abs(n) >= 1e6) return `${fmtMm(n / 1e6)} m²`
  return `${fmtMm(n)} mm²`
}

export function fmtPerim(n: number): string {
  if (Math.abs(n) >= 1000) return `${fmtMm(n / 1000)} m`
  return `${fmtMm(n)} mm`
}

export function download(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
