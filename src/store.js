import { reactive, markRaw } from 'vue'
import { VoxelModel } from './core/voxel'

// 石材材质表:不同石材不同颜色
export const MATERIALS = [
  { id: 1, name: '太湖石', color: '#8f9a90' },
  { id: 2, name: '黄石', color: '#b98a4a' },
  { id: 3, name: '英石', color: '#6e6f75' },
  { id: 4, name: '灵璧石', color: '#3f4148' },
  { id: 5, name: '千层石', color: '#a8856a' },
  { id: 6, name: '斧劈石', color: '#7d7468' },
  { id: 7, name: '笋石', color: '#9aa37a' },
  { id: 8, name: '钟乳石', color: '#c8bfae' }
]

export const VERSION_STATUS = ['草稿', '加工中', '已审定', '已归档']

export function materialColor(id) {
  const m = MATERIALS.find((m) => m.id === id)
  return m ? m.color : '#999999'
}

export function materialColorRGB(id) {
  const hex = materialColor(id)
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  ]
}

export const store = reactive({
  // 体素模型(markRaw 避免深层响应式开销;改动后 bump rev 触发重绘)
  model: markRaw(new VoxelModel(64, 40, 64, 0.1)),
  rev: 0,
  currentLayer: 0,
  material: 1,
  tool: 'paint', // paint | erase | select | paste
  mirrorX: true,
  mirrorZ: false,
  decimation: 0.3,
  mesh: { facesRaw: 0, faces: 0, voxels: 0, volume: 0 },
  selection: null, // {x0,z0,x1,z1}
  clipboard: null, // {w,h,cells}
  // 档案
  stones: [],
  versions: [], // 当前石块的版本
  currentStoneId: null,
  archiveTab: 'stones',
  compareA: null,
  compareB: null,
  recordVersion: null, // 出加工记录单的版本
  notice: ''
})

export function touch() {
  store.rev++
}

export function replaceModel(m) {
  store.model = markRaw(m)
  store.currentLayer = Math.min(store.currentLayer, m.ny - 1)
  store.selection = null
  touch()
}

export function notify(msg) {
  store.notice = msg
  setTimeout(() => {
    if (store.notice === msg) store.notice = ''
  }, 3000)
}
