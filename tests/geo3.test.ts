import assert from 'node:assert/strict'
import { arcFromThreePoints, arcGeom, arcPoint, v, bezierContour, sampleContour } from '../src/lib/geometry.ts'
let pass=0
const ok=(n:string,f:()=>void)=>{f();pass++;console.log('  ✓',n)}

ok('三点定弧：上半圆(CW数学) bulge≈+1 且弧过顶点',()=>{
  const r=arcFromThreePoints(v(-10,0),v(0,10),v(10,0))
  assert.ok(Math.abs(r.bulge-1)<1e-6,`bulge=${r.bulge}`)
  const g=arcGeom(r.p1,r.p2,r.bulge)
  assert.ok(Math.abs(g.center.x)<1e-6 && Math.abs(g.center.y)<1e-6)
  const mid=arcPoint(r.p1,r.p2,r.bulge,0.5)
  assert.ok(Math.abs(mid.x-0)<1e-6 && Math.abs(mid.y-10)<1e-6, JSON.stringify(mid))
})
ok('三点定弧：下半圆(CCW数学) bulge≈-1',()=>{
  const r=arcFromThreePoints(v(-10,0),v(0,-10),v(10,0))
  assert.ok(Math.abs(r.bulge+1)<1e-6,`bulge=${r.bulge}`)
  const mid=arcPoint(r.p1,r.p2,r.bulge,0.5)
  assert.ok(Math.abs(mid.y+10)<1e-6, JSON.stringify(mid))
})
ok('三点定弧：90度弧',()=>{
  // (10,0)->(0,10) 经 (7.07,7.07)，角度递增=CCW（负 bulge）
  const r=arcFromThreePoints(v(10,0),v(7.071,7.071),v(0,10))
  assert.ok(r.bulge<0,`bulge=${r.bulge}`)
  assert.ok(Math.abs(r.bulge+(Math.SQRT2-1))<1e-3,`bulge=${r.bulge}`)
  const mid=arcPoint(r.p1,r.p2,r.bulge,0.5)
  assert.ok(Math.abs(mid.x-7.071)<0.01 && Math.abs(mid.y-7.071)<0.01, JSON.stringify(mid))
})
ok('共线三点退化为直线 bulge=0',()=>{
  const r=arcFromThreePoints(v(0,0),v(5,0),v(10,0))
  assert.equal(r.bulge,0)
})
ok('贝塞尔轮廓保留 cubic 段与控制点',()=>{
  const c=bezierContour([v(0,0),v(1,5),v(4,5),v(5,0)])
  assert.equal(c.segments[0].type,'cubic')
  assert.equal(c.closed,false)
  assert.equal(c.points.length,2)
  assert.ok(sampleContour(c,0.1).length>4)
})
console.log(`\n${pass} 项圆弧/贝塞尔测试通过`)
