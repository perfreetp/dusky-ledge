// 示例岩板排布与示例线路数据
// 坐标系: X 水平, Y 竖直, Z 法线朝外(朝向定线员)

export function sampleLayout() {
  // 标准 1.22m x 2.44m 岩板, 5 列 x 2 排, 部分板带倾角
  const panels = []
  const W = 1.22, H = 2.44, T = 0.018
  const angles = [0, -8, 0, 8, 0] // 每列下排板倾角(度)
  let n = 1
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const ang = row === 0 ? angles[col] : (col % 2 === 0 ? 0 : -5)
      const rad = ang * Math.PI / 180
      panels.push({
        id: 'P' + (n++),
        name: `板-${row + 1}${col + 1}`,
        x: (col - 2) * W,
        y: H / 2 + row * H,
        z: row === 0 ? Math.abs(Math.sin(rad)) * 0.1 : 0,
        width: W,
        height: H,
        angleY: ang,
        thickness: T
      })
    }
  }
  return panels
}

export function sampleRoutes() {
  return [
    { id: 'R1', name: '红线 V3', color: '#e53935', grade: 'V3' },
    { id: 'R2', name: '蓝线 V5', color: '#1e88e5', grade: 'V5' },
    { id: 'R3', name: '黄线 V2', color: '#fdd835', grade: 'V2' }
  ]
}

// 示例支点: 故意包含 1 处干涉、1 处锚栓压缝、1 处超高, 便于演示三级检查
export function sampleHolds() {
  const H = []
  let i = 1
  const add = (typeId, routeId, x, y, panelId) =>
    H.push({ id: 'H' + (i++), typeId, routeId, panelId, x, y, z: 0.06, rotY: 0 })

  // 红线 R1 (左侧上行)
  add('foothold', 'R1', -2.20, 0.30, 'P1')
  add('jug',      'R1', -2.30, 0.90, 'P1')
  add('crimp',    'R1', -2.10, 1.50, 'P1')
  add('sloper',   'R1', -1.90, 2.10, 'P1')
  add('jug',      'R1', -1.70, 2.70, 'P6')
  add('pocket',   'R1', -1.50, 3.30, 'P6')
  add('jug',      'R1', -1.30, 3.90, 'P7')

  // 蓝线 R2 (中部)
  add('foothold', 'R2', -0.30, 0.25, 'P3')
  add('crimp',    'R2', -0.20, 0.85, 'P3')
  add('crimp',    'R2', -0.14, 0.92, 'P3')   // ← 与上一点干涉(净距<8cm)
  add('sloper',   'R2',  0.10, 1.60, 'P3')
  add('volume',   'R2',  0.61, 2.20, 'P3')   // ← 锚栓压在 P3/P4 板缝上
  add('jug',      'R2',  0.40, 3.00, 'P8')
  add('jug',      'R2',  0.60, 4.30, 'P8')   // ← 超高(>4.0m)

  // 黄线 R3 (右侧)
  add('foothold', 'R3',  1.60, 0.30, 'P4')
  add('jug',      'R3',  1.80, 1.00, 'P4')
  add('pocket',   'R3',  2.00, 1.70, 'P5')
  add('sloper',   'R3',  1.90, 2.50, 'P9')
  add('jug',      'R3',  2.10, 3.20, 'P10')
  return H
}
