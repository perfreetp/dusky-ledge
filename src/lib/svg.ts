// SVG 导出：保留图层名（inkscape:label / g id）与毫米单位（viewBox + width/height mm）
import type { Contour, Doc, PathShape } from '../types.ts'
import { arcGeom, contourBBox, cubicPoint, shapeBBox } from './geometry.ts'

function esc(s: string): string {
  return s.replace(/[<>&"']/g, ch => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[ch] as string))
}

/** 单轮廓转 SVG path d（y 轴向上 -> SVG y 轴向下，用 transform 翻转而非改坐标，保证毫米数值原样） */
function contourPathD(c: Contour): string {
  const n = c.points.length
  const lim = c.closed ? n : n - 1
  let d = `M ${fmt(c.points[0].x)} ${fmt(c.points[0].y)}`
  for (let i = 0; i < lim; i++) {
    const p0 = c.points[i]
    const seg = c.segments[i]
    const p1 = seg.e
    if (seg.type === 'line') {
      d += ` L ${fmt(p1.x)} ${fmt(p1.y)}`
    } else if (seg.type === 'arc') {
      const g = arcGeom(p0, p1, seg.bulge!)
      // 整图经 scale(1,-1) 翻转 y：数学 CCW(sweep>0) 在 SVG 坐标下为 sweep-flag=1
      const sweepFlag = g.sweep > 0 ? 1 : 0
      d += ` A ${fmt(g.r)} ${fmt(g.r)} 0 0 ${sweepFlag} ${fmt(p1.x)} ${fmt(p1.y)}`
    } else {
      // 三次贝塞尔
      const c1 = seg.c1!, c2 = seg.c2!
      d += ` C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p1.x)} ${fmt(p1.y)}`
      void cubicPoint
    }
  }
  if (c.closed) d += ' Z'
  return d
}

function fmt(n: number): string {
  // 毫米，保留 3 位小数并去尾零
  return Number(n.toFixed(3)).toString()
}

export function exportSVG(doc: Doc): string {
  const visible = doc.shapes.filter(s =>
    doc.layers.find(l => l.id === s.layerId)?.visible !== false)
  if (!visible.length) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100"/>`
  }
  const boxes = visible.map(shapeBBox)
  const minX = Math.min(...boxes.map(b => b.minX))
  const minY = Math.min(...boxes.map(b => b.minY))
  const maxX = Math.max(...boxes.map(b => b.maxX))
  const maxY = Math.max(...boxes.map(b => b.maxY))
  const w = maxX - minX, h = maxY - minY
  const pad = Math.max(w, h) * 0.05

  const layerGroups = doc.layers.map(layer => {
    const shapes = visible.filter(s => s.layerId === layer.id)
    if (!shapes.length) return ''
    const paths = shapes.map(s => {
      const ds = s.contours.map(contourPathD).join(' ')
      return `    <path id="${esc(s.id)}" inkscape:label="${esc(s.name)}" d="${ds}" fill="none" stroke="${layer.color}" stroke-width="${fmt(Math.max(w, h) / 400)}" stroke-linejoin="round"/>`
    }).join('\n')
    return `  <g id="${esc(layer.id)}" inkscape:label="${esc(layer.name)}" data-layer-name="${esc(layer.name)}">\n${paths}\n  </g>`
  }).filter(Boolean).join('\n')

  const vbW = w + pad * 2, vbH = h + pad * 2
  // viewBox 用世界坐标（y 向上），通过外层 transform scale(1,-1) 转到 SVG 坐标系
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- 智慧工厂非标设备轮廓矢量编辑台导出；单位：毫米(mm)；项目:${esc(doc.projectNo)} 设备:${esc(doc.equipmentNo)} -->
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="${fmt(vbW)}mm" height="${fmt(vbH)}mm"
     viewBox="${fmt(minX - pad)} ${fmt(-maxY - pad)} ${fmt(vbW)} ${fmt(vbH)}"
     data-unit="mm" data-project-no="${esc(doc.projectNo)}" data-equipment-no="${esc(doc.equipmentNo)}">
  <title>${esc(doc.equipmentName)} 占地轮廓图</title>
  <g transform="scale(1,-1)">
${layerGroups}
  </g>
</svg>
`
}

export function downloadSVG(doc: Doc, filename: string) {
  const text = exportSVG(doc)
  const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export { contourBBox }
