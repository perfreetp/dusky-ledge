import { snapPoint } from '../src/geometry/snap';
import { validateContour, isContourValid } from '../src/geometry/validate';
import { buildPattern, multiPolygonToShapes, patternBounds } from '../src/geometry/boolean';
import { patternToSvg } from '../src/geometry/svg';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

// ---- 吸附 ----
console.log('snap:');
const square = { id: 'a', points: [{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}], closed: true, op: 'union' };
let r = snapPoint({x: 13, y: 27}, [], [], 10);
ok(r.kind === 'grid' && r.point.x === 10 && r.point.y === 30, '网格吸附 10mm');
r = snapPoint({x: 13, y: 27}, [], [], 2);
ok(r.kind === 'grid' && r.point.x === 14 && r.point.y === 28, '网格吸附 2mm');
r = snapPoint({x: 3, y: 2}, [square], [], 10);
ok(r.kind === 'endpoint' && r.point.x === 0 && r.point.y === 0, '端点吸附');
r = snapPoint({x: 52, y: 3}, [square], [], 10);
ok(r.kind === 'midpoint' && r.point.x === 50 && r.point.y === 0, '中线(中点)吸附');
r = snapPoint({x: 30, y: 4}, [square], [], 10);
ok(r.kind === 'edge' && r.point.x === 30 && r.point.y === 0, '相邻边投影吸附');

// ---- 校验 ----
console.log('validate:');
ok(validateContour({...square, closed: false}).some(i => i.type === 'open'), '未闭合检出');
ok(isContourValid(square), '有效轮廓');
const bowtie = { id: 'b', points: [{x:0,y:0},{x:100,y:100},{x:100,y:0},{x:0,y:100}], closed: true, op: 'union' };
const bi = validateContour(bowtie);
ok(bi.some(i => i.type === 'self-intersect' && i.segA === 0 && i.segB === 2), `自交检出并定位段 (实际: ${JSON.stringify(bi)})`);
ok(!isContourValid(bowtie), '自交轮廓不参与布尔');

// ---- 布尔 ----
console.log('boolean:');
const sq = (x, y, s, op = 'union') => ({ id: Math.random()+'', points: [{x,y},{x:x+s,y},{x:x+s,y:y+s},{x,y:y+s}], closed: true, op });
const area = (mp) => mp.reduce((a, poly) => a + Math.abs(poly[0].reduce((s, p, i, ring) => { const q = ring[(i+1)%ring.length]; return s + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2 - poly.slice(1).reduce((h, hole) => h + Math.abs(hole.reduce((s, p, i, ring) => { const q = ring[(i+1)%ring.length]; return s + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2, 0), 0);
let mp = buildPattern([sq(0,0,100), sq(50,0,100)]);
ok(Math.abs(area(mp) - 15000) < 1, `并集面积 15000 (实际 ${area(mp)})`);
mp = buildPattern([sq(0,0,100), sq(25,25,50,'subtract')]);
ok(Math.abs(area(mp) - 7500) < 1, `差集面积 7500 (实际 ${area(mp)})`);
ok(mp[0].length === 2, '差集产生孔洞');
mp = buildPattern([sq(0,0,100), sq(50,50,100,'intersect')]);
ok(Math.abs(area(mp) - 2500) < 1, `交集面积 2500 (实际 ${area(mp)})`);
const shapes = multiPolygonToShapes(buildPattern([sq(0,0,100), sq(25,25,50,'subtract')]));
ok(shapes.length === 1 && shapes[0].holes.length === 1, 'Shape 含孔洞');

// ---- SVG ----
console.log('svg:');
const svg = patternToSvg(buildPattern([sq(0,0,100), sq(25,25,50,'subtract')]), '测试板');
ok(svg.includes('width="102.000mm"') && svg.includes('viewBox="0 0 102.000 102.000"'), 'SVG 尺寸与 viewBox (mm)');
ok((svg.match(/<path /g) || []).length === 2, 'SVG 含外环+孔洞两条路径');
ok(svg.includes('M1 101') || svg.includes('M1 1') || svg.includes('M101'), 'SVG Y 轴翻转');

const b = patternBounds(buildPattern([sq(10,20,100)]));
ok(b && b.min.x === 10 && b.max.y === 120, '包围盒');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
