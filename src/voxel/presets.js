import { VoxelModel, packCell, CELL_SIZE } from './model.js'

// 设备预设：以「剖切后能讲清结构」为目标摆放四组体素
// 网格坐标 x 右 / y 上 / z 前，单位格 0.5 m

const box = (model, g, x0, y0, z0, x1, y1, z1, mat = -1, a = 15) => {
  for (let z = z0; z <= z1; z++)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) model.set(x, y, z, packCell(g, mat, a))
}

const hollowBox = (model, g, x0, y0, z0, x1, y1, z1, wall = 1, mat = -1, a = 15) => {
  for (let z = z0; z <= z1; z++)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const edge = x < x0 + wall || x > x1 - wall || y < y0 + wall || y > y1 - wall || z < z0 + wall || z > z1 - wall
        if (edge) model.set(x, y, z, packCell(g, mat, a))
      }
}

const shell = false
export const PRESETS = [
  {
    id: 'cnc',
    name: '立式加工中心',
    model: 'VMC-850',
    caption: '三轴立式，主轴箱沿立柱升降',
    size: [12, 10, 10],
    build(model) {
      const S = 0, F = 1, D = 2, E = 3
      // 机架：底座 + 立柱 + 顶梁
      box(model, F, 1, 0, 1, 10, 1, 8, 1) // 底座
      box(model, F, 8, 2, 1, 10, 9, 3, 1) // 立柱
      box(model, F, 8, 9, 1, 10, 9, 8, 1) // 顶梁
      box(model, F, 1, 0, 1, 2, 4, 2, 1) // 前左立柱
      box(model, F, 1, 0, 7, 2, 4, 8, 1) // 前右立柱
      // 传动：工作台 + 主轴箱 + 主轴 + 丝杠
      box(model, D, 2, 2, 2, 7, 2, 7, 2) // 工作台
      box(model, D, 2, 3, 3, 3, 3, 6, 4) // 工件夹持（示意）
      box(model, D, 6, 3, 3, 7, 3, 6, 4) // 夹具
      box(model, D, 7, 4, 2, 9, 7, 5, 2) // 主轴箱
      box(model, D, 8, 3, 3, 8, 4, 4, 0) // 主轴
      box(model, D, 9, 2, 2, 9, 8, 2, 0) // 丝杠（前侧）
      box(model, D, 3, 0, 5, 6, 1, 5, 0) // 横向下导轨
      // 电控：电柜 + 操作面板 + 线槽
      box(model, E, 0, 0, 0, 0, 6, 9, 7) // 电柜背板
      box(model, E, 1, 2, 0, 7, 4, 0, 7) // 电柜正面下段（安全黄）
      box(model, E, 8, 5, 0, 10, 6, 0, 0) // 操作面板
      box(model, E, 2, 4, 8, 7, 4, 9, 6) // 顶部线槽
      // 外壳：防护罩做成前侧剖开，直接看到工作台与主轴
      box(model, S, 1, 2, 0, 1, 7, 9, -1) // 左侧板
      box(model, S, 7, 2, 0, 7, 7, 9, -1) // 右侧板（上半）
      box(model, S, 1, 2, 0, 7, 7, 0, -1) // 背板
      box(model, S, 1, 7, 0, 7, 7, 9, -1) // 顶罩
      box(model, S, 1, 2, 9, 7, 2, 9, -1) // 前下裙板
      box(model, S, 1, 6, 9, 1, 7, 9, -1) // 前上角柱
      box(model, S, 2, 3, 9, 6, 6, 9, 3) // 视窗（玻璃）
      box(model, S, 3, 0, 9, 6, 1, 9, 7) // 脚踏板（安全黄）
      box(model, S, 8, 9, 4, 10, 9, 8, -1) // 立柱上罩
    },
  },
  {
    id: 'robot',
    name: '六轴工业机器人',
    model: 'IRB-2600',
    caption: '底座回转 + 大臂小臂 + 腕部',
    size: [10, 12, 10],
    build(model) {
      const S = 0, F = 1, D = 2, E = 3
      // 机架：底座法兰 + 地脚
      box(model, F, 2, 0, 2, 7, 0, 7, 1)
      box(model, F, 3, 1, 3, 6, 1, 6, 1)
      box(model, F, 4, 2, 4, 5, 2, 5, 1)
      // 传动：回转座 + 大臂 + 小臂 + 腕
      box(model, D, 3, 3, 3, 6, 4, 6, 0)
      box(model, D, 4, 5, 4, 5, 5, 5, 0)
      box(model, D, 4, 6, 4, 5, 9, 5, 0) // 大臂
      box(model, D, 4, 9, 4, 5, 9, 8, 0) // 小臂（前伸）
      box(model, D, 4, 8, 8, 5, 9, 9, 0) // 腕部
      box(model, D, 4, 5, 6, 5, 5, 7, 2) // 平衡缸
      // 电控：基座电柜 + 拖链
      box(model, E, 0, 0, 0, 1, 6, 1, 7)
      box(model, E, 5, 4, 3, 6, 4, 6, 6)
      box(model, E, 2, 4, 7, 3, 4, 8, 6)
      // 外壳：腕部护罩（后半包住，前半打开）
      box(model, S, 3, 10, 6, 6, 10, 8, -1)
      box(model, S, 3, 9, 8, 3, 10, 9, -1)
      box(model, S, 6, 9, 8, 6, 10, 9, -1)
      box(model, S, 4, 8, 9, 5, 8, 9, 4) // 前视窗（亚克力）
    },
  },
  {
    id: 'conveyor',
    name: '倍速链装配线',
    model: 'AL-2400',
    caption: '双层输送 + 顶升工位 + 配电',
    size: [16, 8, 8],
    build(model) {
      const S = 0, F = 1, D = 2, E = 3
      // 机架：支腿
      for (const x of [1, 6, 11, 14]) {
        box(model, F, x, 0, 1, x, 3, 1, 1)
        box(model, F, x, 0, 6, x, 3, 6, 1)
      }
      box(model, F, 1, 3, 1, 14, 3, 1, 1) // 侧梁
      box(model, F, 1, 3, 6, 14, 3, 6, 1)
      box(model, F, 1, 5, 1, 14, 5, 1, 1) // 上层侧梁
      box(model, F, 1, 5, 6, 14, 5, 6, 1)
      // 传动：辊筒 + 倍速链 + 顶升
      for (let x = 2; x <= 13; x += 2) box(model, D, x, 4, 2, x, 4, 5, 2)
      box(model, D, 2, 2, 2, 13, 2, 2, 0)
      box(model, D, 2, 2, 5, 13, 2, 5, 0)
      box(model, D, 6, 4, 3, 9, 4, 4, 7) // 顶升台
      box(model, D, 7, 3, 3, 8, 3, 4, 2)
      // 电控：配电柜 + 线槽 + 传感器
      box(model, E, 0, 0, 2, 0, 5, 5, 6)
      box(model, E, 2, 5, 0, 13, 5, 0, 6)
      box(model, E, 5, 4, 6, 5, 4, 7, 7)
      box(model, E, 11, 4, 7, 11, 4, 7, 7)
      // 外壳：工位护板（前侧不封，便于看顶升）
      box(model, S, 4, 5, 0, 4, 7, 2, 4) // 左护板靠后
      box(model, S, 10, 5, 0, 10, 7, 2, 4)
      box(model, S, 4, 7, 0, 10, 7, 0, 1)
      box(model, S, 4, 7, 3, 10, 7, 3, 3) // 顶部视窗框架（玻璃）
      box(model, S, 1, 6, 0, 3, 6, 0, 3)
    },
  },
]

// 预设四周留出可编辑余量，避免模型贴边导致无法在外侧落格
export const PAD = [2, 1, 2]

export function createModel(preset) {
  const [w, h, d] = preset.size
  const [px, py, pz] = PAD
  const model = new VoxelModel(w + px * 2, h + py * 2, d + pz * 2)
  const raw = new VoxelModel(w, h, d)
  preset.build(raw)
  raw.forEach((x, y, z, v) => model.set(x + px, y + py, z + pz, v))
  return model
}
