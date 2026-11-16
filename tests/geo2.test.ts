import assert from 'node:assert/strict'
import { rectContour, circleContour, polygonArea, v, sampleContour } from '../src/lib/geometry.ts'
import { booleanShapes } from '../src/lib/boolean.ts'
import { mkShapeHelper } from './helper.ts'
let pass=0
const ok=(n:string,f:()=>void)=>{f();pass++;console.log('  ✓',n)}
const opt={id:'r',name:'r',layerId:'L1',color:'#000',version:'v1'}
const area=(r:any)=>r.contours.reduce((s:number,c:any)=>s+Math.abs(polygonArea(c.points)),0)

ok('分离两矩形并集=两环',()=>{
  const a=mkShapeHelper('a',rectContour(v(0,0),v(10,10)))
  const b=mkShapeHelper('b',rectContour(v(20,20),v(30,30)))
  const r=booleanShapes([a],[b],'union',opt)
  assert.equal(r.contours.length,2)
  assert.equal(area(r),200)
})
ok('分离两矩形交集=空',()=>{
  const a=mkShapeHelper('a',rectContour(v(0,0),v(10,10)))
  const b=mkShapeHelper('b',rectContour(v(20,20),v(30,30)))
  const r=booleanShapes([a],[b],'intersect',opt)
  assert.equal(r.contours.length,0)
})
ok('包含关系并集=外环',()=>{
  const a=mkShapeHelper('a',rectContour(v(0,0),v(100,100)))
  const b=mkShapeHelper('b',rectContour(v(40,40),v(60,60)))
  const r=booleanShapes([a],[b],'union',opt)
  assert.equal(r.contours.length,1)
  assert.equal(Math.round(area(r)),10000)
})
ok('包含关系交集=内环',()=>{
  const a=mkShapeHelper('a',rectContour(v(0,0),v(100,100)))
  const b=mkShapeHelper('b',rectContour(v(40,40),v(60,60)))
  const r=booleanShapes([a],[b],'intersect',opt)
  assert.equal(Math.round(area(r)),400)
})
ok('圆与矩形布尔不崩溃且面积合理',()=>{
  const c=mkShapeHelper('c',circleContour(v(0,0),100))
  const sq=mkShapeHelper('s',rectContour(v(0,-100),v(200,100)))
  const r=booleanShapes([c],[sq],'intersect',opt)
  const a=area(r)
  assert.ok(a>14000 && a<17000,`半圆附近, got ${a}`)
})
ok('三矩形并集折叠',()=>{
  const a=mkShapeHelper('a',rectContour(v(0,0),v(10,10)))
  const b=mkShapeHelper('b',rectContour(v(10,0),v(20,10)))
  const c=mkShapeHelper('c',rectContour(v(5,10),v(15,20)))
  const r=booleanShapes([a,b],[c],'union',opt)
  assert.ok(r.contours.length>=1)
  assert.ok(area(r)>150)
})
ok('差集分离时主体保留',()=>{
  const a=mkShapeHelper('a',rectContour(v(0,0),v(10,10)))
  const b=mkShapeHelper('b',rectContour(v(20,20),v(30,30)))
  const r=booleanShapes([a],[b],'subtract',opt)
  assert.equal(r.contours.length,1)
  assert.equal(Math.round(area(r)),100)
})
console.log(`\n${pass} 项边界测试全部通过`)
