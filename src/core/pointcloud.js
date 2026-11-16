// 点云解析:支持 ASCII PLY 与 xyz/csv/txt 文本(每行 x y z,逗号或空白分隔)
export function parsePointCloud(text) {
  const head = text.slice(0, 256).trimStart()
  if (head.startsWith('ply')) return parsePLY(text)
  return parseXYZ(text)
}

function parseXYZ(text) {
  const pts = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('//')) continue
    const parts = t.split(/[,\s;]+/).map(Number)
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      pts.push(parts[0], parts[1], parts[2])
    }
  }
  if (!pts.length) throw new Error('未解析到任何点,请检查格式(每行 x y z)')
  return Float32Array.from(pts)
}

function parsePLY(text) {
  const endIdx = text.indexOf('end_header')
  if (endIdx < 0) throw new Error('PLY 头不完整')
  const header = text.slice(0, endIdx)
  if (!/format\s+ascii/.test(header)) throw new Error('仅支持 ASCII 格式的 PLY')
  const m = header.match(/element\s+vertex\s+(\d+)/)
  if (!m) throw new Error('PLY 中找不到 vertex 元素')
  const count = parseInt(m[1], 10)
  // 属性顺序
  const props = []
  for (const line of header.split(/\r?\n/)) {
    const pm = line.trim().match(/^property\s+\S+\s+(\S+)$/)
    if (pm) props.push(pm[1])
  }
  const ix = props.indexOf('x')
  const iy = props.indexOf('y')
  const iz = props.indexOf('z')
  if (ix < 0 || iy < 0 || iz < 0) throw new Error('PLY 缺少 x/y/z 属性')

  const body = text.slice(endIdx + 'end_header'.length)
  const lines = body.split(/\r?\n/)
  const pts = new Float32Array(count * 3)
  let got = 0
  for (const line of lines) {
    if (got >= count) break
    const t = line.trim()
    if (!t) continue
    const parts = t.split(/\s+/).map(Number)
    pts[got * 3] = parts[ix]
    pts[got * 3 + 1] = parts[iy]
    pts[got * 3 + 2] = parts[iz]
    got++
  }
  if (!got) throw new Error('PLY 中没有点数据')
  return got === count ? pts : pts.slice(0, got * 3)
}
