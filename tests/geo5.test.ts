import assert from 'node:assert/strict'
import { rectContour, circleContour, v } from '../src/lib/geometry.ts'
import { diffDocs } from '../src/lib/diff.ts'
import type { Doc, PathShape } from '../src/types.ts'

let pass = 0
const ok = (n: string, f: () => void) => { f(); pass++; console.log('  ✓', n) }

const mk = (id: string, c: PathShape['contours'][0]): PathShape => ({
  id, name: id, layerId: 'L', color: '#000', contours: [c], createdAt: 0,
})
const doc = (...shapes: PathShape[]): Doc => ({
  projectNo: 'P', equipmentNo: 'E', equipmentName: 'd', gridSize: 100,
  layers: [{ id: 'L', name: '层', visible: true, locked: false, color: '#000' }],
  shapes,
})

ok('相同文档无差异', () => {
  const d1 = doc(mk('a', rectContour(v(0, 0), v(100, 100))))
  const d2 = doc(mk('a', rectContour(v(0, 0), v(100, 100))))
  const r = diffDocs(d1, d2)
  assert.equal(r.removed.length, 0)
  assert.equal(r.added.length, 0)
})

ok('平移矩形检出差异段', () => {
  const d1 = doc(mk('a', rectContour(v(0, 0), v(200, 100))))
  const d2 = doc(mk('b', rectContour(v(50, 0), v(250, 100))))
  const r = diffDocs(d1, d2)
  assert.ok(r.removed.length >= 1, '应有移除段')
  assert.ok(r.added.length >= 1, '应有新增段')
  assert.ok(r.diffLength > 0)
})

ok('尺寸放大产生差异', () => {
  const d1 = doc(mk('a', rectContour(v(0, 0), v(100, 100))))
  const d2 = doc(mk('b', rectContour(v(0, 0), v(150, 100))))
  const r = diffDocs(d1, d2)
  assert.ok(r.diffLength > 0)
})

ok('圆改半径产生差异', () => {
  const d1 = doc(mk('a', circleContour(v(0, 0), 50)))
  const d2 = doc(mk('b', circleContour(v(0, 0), 80)))
  const r = diffDocs(d1, d2)
  assert.ok(r.added.length > 0 && r.removed.length > 0)
})

console.log(`\n${pass} 项版本对比测试通过`)
