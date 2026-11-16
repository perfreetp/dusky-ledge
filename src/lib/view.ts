// 视图变换：平移/缩放，世界坐标（毫米，y 向上）<-> 屏幕像素（y 向下）
import { createSignal } from 'solid-js'
import type { Vec2 } from '../types.ts'

export interface View {
  scale: number // 屏幕像素 / 毫米
  ox: number    // 世界原点在屏幕上的 x
  oy: number    // 世界原点在屏幕上的 y
}

export function createView(initial?: Partial<View>) {
  const [view, setView] = createSignal<View>({
    scale: initial?.scale ?? 2,
    ox: initial?.ox ?? 200,
    oy: initial?.oy ?? 300,
  })

  const toScreen = (p: Vec2): Vec2 => {
    const vw = view()
    return { x: vw.ox + p.x * vw.scale, y: vw.oy - p.y * vw.scale }
  }
  const toWorld = (p: Vec2): Vec2 => {
    const vw = view()
    return { x: (p.x - vw.ox) / vw.scale, y: (vw.oy - p.y) / vw.scale }
  }
  /** 缩放到指定屏幕锚点（鼠标位置保持不动） */
  const zoomAt = (screen: Vec2, factor: number) => {
    setView(vw => {
      const scale = Math.min(200, Math.max(0.05, vw.scale * factor))
      const worldBefore = { x: (screen.x - vw.ox) / vw.scale, y: (vw.oy - screen.y) / vw.scale }
      return {
        scale,
        ox: screen.x - worldBefore.x * scale,
        oy: screen.y + worldBefore.y * scale,
      }
    })
  }
  const pan = (dxScreen: number, dyScreen: number) => {
    setView(vw => ({ ...vw, ox: vw.ox + dxScreen, oy: vw.oy + dyScreen }))
  }
  const fit = (bbox: { minX: number; minY: number; maxX: number; maxY: number }, w: number, h: number) => {
    const bw = Math.max(1, bbox.maxX - bbox.minX), bh = Math.max(1, bbox.maxY - bbox.minY)
    const scale = Math.min((w - 80) / bw, (h - 80) / bh)
    const cx = (bbox.minX + bbox.maxX) / 2, cy = (bbox.minY + bbox.maxY) / 2
    setView({ scale, ox: w / 2 - cx * scale, oy: h / 2 + cy * scale })
  }
  const reset = () => setView({ scale: 2, ox: 200, oy: 300 })

  return { view, setView, toScreen, toWorld, zoomAt, pan, fit, reset }
}

export type ViewApi = ReturnType<typeof createView>
