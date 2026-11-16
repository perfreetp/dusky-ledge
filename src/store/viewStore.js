import { ref } from 'vue'

// 视图层共享的交互状态：3D 画布把命中结果回写，面板读取
export const viewport = ref(null)

export const drag = ref({
  active: false,
  mode: null, // orbit | pan | paint | erase | restyle | select | blit
  x0: 0,
  y0: 0,
  x: 0,
  y: 0,
})

export const selectDrag = ref(null) // { startVoxel, endVoxel, x0,y0, x1,y1 }

export function setViewport(v) {
  viewport.value = v
}

export function frameAll() {
  if (viewport.value?.frameAll) viewport.value.frameAll()
}

export function setViewAngle(name) {
  if (viewport.value?.setAngle) viewport.value.setAngle(name)
}
