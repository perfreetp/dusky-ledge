import assert from 'node:assert/strict'
import {
  circleContour, rectContour, polygonArea, sampleContour, shapeMetrics, v,
} from '../src/lib/geometry.ts'
import { booleanShapes, dedupeLoop } from '../src/lib/boolean.ts'
import type { Contour, PathShape } from '../src/types.ts'

let pass = 0
const ok = (name: string, fn: () => void) => { fn(); pass++; console.log('  ✓', name) }

const mkShape = (id: string, contour: Contour): PathShape => ({
  id, name: id, layerId: 'L1', color: '#f00',
  contours: [contour], createdAt: 0,
})

ok('圆面积逼近 πr² (r=1000)', () => {
  const c = circleContour(v(0, 0), 1000)
  const area = Math.abs(polygonArea(sampleContour(c, 0.05)))
  assert.ok(Math.abs(area - Math.PI * 1e6) / (Math.PI * 1e6) < 0.001, `area=${area}`)
})

ok('圆周长逼近 2πr', () => {
  const s = mkShape('c', circleContour(v(0, 0), 500))
  const m = shapeMetrics(s)
  assert.ok(Math.abs(m.perimeter - 2 * Math.PI * 500) / (2 * Math.PI * 500) < 0.002)
})

ok('两矩形并集面积', () => {
  const a = mkShape('a', rectContour(v(0, 0), v(10, 10)))
  const b = mkShape('b', rectContour(v(5, 0), v(15, 10)))
  const r = booleanShapes([a], [b], 'union', { id: 'r', name: 'r', layerId: 'L1', color: '#000', version: 'v1' })
  const area = r.contours.reduce((s, c) => s + Math.abs(polygonArea(c.points)), 0)
  assert.equal(Math.round(area), 150) // 100+100-50
  assert.equal(r.contours.length, 1)
})

ok('两矩形交集面积=50', () => {
  const a = mkShape('a', rectContour(v(0, 0), v(10, 10)))
  const b = mkShape('b', rectContour(v(5, 0), v(15, 10)))
  const r = booleanShapes([a], [b], 'intersect', { id: 'r', name: 'r', layerId: 'L1', color: '#000', version: 'v1' })
  const area = r.contours.reduce((s, c) => s + Math.abs(polygonArea(c.points)), 0)
  assert.equal(Math.round(area), 50)
})

ok('差集在内部产生孔洞', () => {
  const outer = mkShape('a', rectContour(v(0, 0), v(100, 100)))
  const inner = mkShape('b', rectContour(v(40, 40), v(60, 60)))
  const r = booleanShapes([outer], [inner], 'subtract', { id: 'r', name: 'r', layerId: 'L1', color: '#000', version: 'v1' })
  assert.equal(r.contours.length, 2)
  const signed = r.contours.map(c => polygonArea(c.points))
  assert.ok(signed.some(a => a > 0) && signed.some(a => a < 0), '应含外环与反向孔洞')
  const net = signed.reduce((s, x) => s + x, 0)
  assert.equal(Math.round(net), 10000 - 400)
})

ok('布尔结果全部为可编辑 line 节点', () => {
  const a = mkShape('a', rectContour(v(0, 0), v(10, 10)))
  const b = mkShape('b', rectContour(v(5, 5), v(15, 15)))
  const r = booleanShapes([a], [b], 'union', { id: 'r', name: 'r', layerId: 'L1', color: '#000', version: 'v1' })
  assert.ok(r.contours.every(c => c.segments.every(s => s.type === 'line')))
  assert.ok(r.contours.every(c => c.points.length >= 4))
})

ok('节点重合去重', () => {
  const d = dedupeLoop([v(0, 0), v(0.0001, 0), v(10, 0), v(10, 10), v(0, 10), v(0, 0)])
  assert.equal(d.length, 4)
})

ok('布尔来源可追溯', () => {
  const a = mkShape('a', rectContour(v(0, 0), v(10, 10)))
  const b = mkShape('b', rectContour(v(5, 5), v(15, 15)))
  const r = booleanShapes([a], [b], 'union', { id: 'r', name: 'r', layerId: 'L1', color: '#000', version: 'v9' })
  assert.deepEqual(r.booleanOrigin?.sources, ['a', 'b'])
  assert.equal(r.booleanOrigin?.op, 'union')
})

console.log(`\n${pass} 项测试全部通过`)
