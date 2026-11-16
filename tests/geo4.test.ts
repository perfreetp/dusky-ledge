import assert from 'node:assert/strict'
import { rectContour, circleContour, shapeBBox, v } from '../src/lib/geometry.ts'
import { exportSVG } from '../src/lib/svg.ts'
import { alignShapes, distributeShapes } from '../src/lib/arrange.ts'
import { snapPoint } from '../src/lib/snap.ts'
import type { Doc, PathShape } from '../src/types.ts'

let pass = 0
const ok = (n: string, f: () => void) => { f(); pass++; console.log('  ✓', n) }

const mk = (id: string, contour: PathShape['contours'][0], layerId = 'L1'): PathShape => ({
  id, name: id, layerId, color: '#2563eb', contours: [contour], createdAt: 0,
})

function docWith(...shapes: PathShape[]): Doc {
  return {
    projectNo: 'P1', equipmentNo: 'E1', equipmentName: '测试设备', gridSize: 100,
    layers: [
      { id: 'L1', name: '主体层', visible: true, locked: false, color: '#2563eb' },
      { id: 'L2', name: '辅件层', visible: true, locked: false, color: '#dc2626' },
    ],
    shapes,
  }
}

ok('SVG 保留毫米单位与图层名', () => {
  const doc = docWith(mk('s1', rectContour(v(0, 0), v(100, 50))))
  const svg = exportSVG(doc)
  assert.match(svg, /width="[\d.]+mm"/)
  assert.match(svg, /data-unit="mm"/)
  assert.match(svg, /inkscape:label="主体层"/)
  assert.match(svg, /data-layer-name="主体层"/)
  assert.match(svg, /<path/)
})

ok('SVG 隐藏图层的轮廓不导出', () => {
  const doc = docWith(mk('s1', rectContour(v(0, 0), v(10, 10)), 'L1'))
  doc.layers[1].visible = false
  const hidden = mk('s2', rectContour(v(20, 20), v(30, 30)), 'L2')
  doc.shapes.push(hidden)
  const svg = exportSVG(doc)
  assert.ok(!svg.includes('s2'), '隐藏图层形状不应出现')
  assert.ok(svg.includes('s1'))
})

ok('SVG 圆包含 A 弧命令', () => {
  const doc = docWith(mk('c1', circleContour(v(0, 0), 50)))
  const svg = exportSVG(doc)
  assert.match(svg, / A [\d.]+ [\d.]+ 0 0 [01] /)
})

ok('左对齐：所有 minX 相等', () => {
  const a = mk('a', rectContour(v(10, 0), v(20, 10)))
  const b = mk('b', rectContour(v(30, 0), v(45, 10)))
  const d = alignShapes([a, b], 'left')
  const movedA = { ...a }, movedB = { ...b }
  const apply = (s: PathShape, id: string) => {
    const delta = d.get(id)!
    return mk(id, {
      ...s.contours[0],
      points: s.contours[0].points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
      segments: s.contours[0].segments,
    }, s.layerId)
  }
  const na = apply(a, 'a'), nb = apply(b, 'b')
  assert.equal(shapeBBox(na).minX, shapeBBox(nb).minX)
})

ok('等间距分布：三形状水平间隙相等', () => {
  const a = mk('a', rectContour(v(0, 0), v(10, 10)))
  const b = mk('b', rectContour(v(20, 0), v(25, 10)))
  const c = mk('c', rectContour(v(40, 0), v(60, 10)))
  const d = distributeShapes([a, b, c], 'hgap')
  // 移动中间形状后，相邻 maxX->minX 间隙相等
  const db = d.get('b')!
  // b 原始 [20,25]，平移后 minX=20+db.x、maxX=25+db.x
  const newMinX = 20 + db.x, newMaxX = 25 + db.x
  // 总跨 60，尺寸和 10+5+20=35，两间隙各 (60-35)/2=12.5
  const gap1 = newMinX - 10
  const gap2 = 40 - newMaxX
  assert.ok(Math.abs(gap1 - 12.5) < 1e-6, `gap1=${gap1}`)
  assert.ok(Math.abs(gap2 - 12.5) < 1e-6, `gap2=${gap2}`)
})

ok('网格吸附：坐标落到最近网格点', () => {
  const r = snapPoint(v(103, -97), 10, 100, [], [])
  assert.equal(r.point.x, 100)
  assert.equal(r.point.y, -100)
})

ok('端点吸附优先于网格', () => {
  const r = snapPoint(v(50.5, 0), 10, 100, [v(50, 0)], [])
  assert.equal(r.point.x, 50)
  assert.equal(r.point.y, 0)
  assert.equal(r.source, '端点')
})

console.log(`\n${pass} 项 SVG/对齐/吸附测试通过`)
