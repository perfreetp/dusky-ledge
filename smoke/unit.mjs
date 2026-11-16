// 核心模块单元测试(node 直接跑)
import { evalTrack, makeKey, mirrorAnimation, evalPose, upsertKey } from '../src/core/animation.js';
import { computeFK, clampToLimits, mirrorPair } from '../src/core/skeleton.js';
import { mat4TransformPoint, mat3FromEuler, eulerFromMat3 } from '../src/core/math.js';
import { buildZip } from '../src/core/exporter.js';
import { parseOBJ } from '../src/core/mesh.js';

let failed = 0;
const eq = (a, b, msg) => {
  const ok = Math.abs(a - b) < 1e-4;
  if (!ok) { console.log(`FAIL ${msg}: ${a} != ${b}`); failed++; }
};
const ok = (v, msg) => { if (!v) { console.log('FAIL', msg); failed++; } };

// 1. 线性插值
{
  const keys = [makeKey(0, [0, 0, 0], 'linear'), makeKey(10, [100, 50, -10], 'linear')];
  const v = evalTrack(keys, 5);
  eq(v[0], 50, 'linear x'); eq(v[1], 25, 'linear y'); eq(v[2], -5, 'linear z');
}
// 2. 缓入缓出端点
{
  const keys = [makeKey(0, [0, 0, 0], 'ease'), makeKey(10, [10, 0, 0], 'ease')];
  eq(evalTrack(keys, 0)[0], 0, 'ease start');
  eq(evalTrack(keys, 10)[0], 10, 'ease end');
  const mid = evalTrack(keys, 5)[0];
  eq(mid, 5, 'ease mid');
}
// 3. 贝塞尔:手柄拉平应接近线性,端点精确
{
  const k1 = makeKey(0, [0, 0, 0], 'bezier');
  const k2 = makeKey(10, [10, 0, 0], 'bezier');
  k1.hout = { df: 3.33, dv: [3.33, 0, 0] };
  k2.hin = { df: -3.33, dv: [-3.33, 0, 0] };
  eq(evalTrack([k1, k2], 0)[0], 0, 'bezier start');
  eq(evalTrack([k1, k2], 10)[0], 10, 'bezier end');
  eq(evalTrack([k1, k2], 5)[0], 5, 'bezier mid ~linear');
  // 上弯手柄:中点应偏高
  k1.hout = { df: 2, dv: [8, 0, 0] };
  ok(evalTrack([k1, k2], 3)[0] > 3, 'bezier handle bends curve');
}
// 4. 越界钳制
{
  const keys = [makeKey(4, [7, 0, 0])];
  eq(evalTrack(keys, 0)[0], 7, 'clamp before first');
  eq(evalTrack(keys, 99)[0], 7, 'clamp after last');
}
// 5. 欧拉角 <-> 矩阵往返
{
  const e = [30, -45, 60];
  const m = mat3FromEuler(e);
  const back = eulerFromMat3(m);
  eq(back[0], e[0], 'euler rt x'); eq(back[1], e[1], 'euler rt y'); eq(back[2], e[2], 'euler rt z');
}
// 6. FK:子骨骼世界位置 = 父链叠加
{
  const bones = {
    a: { id: 'a', parentId: null, pos: [1, 0, 0], rot: [0, 0, 0] },
    b: { id: 'b', parentId: 'a', pos: [0, 2, 0], rot: [0, 0, 90] },
    c: { id: 'c', parentId: 'b', pos: [1, 0, 0], rot: [0, 0, 0] },
  };
  const world = computeFK(bones, ['a', 'b', 'c'], null);
  const pa = mat4TransformPoint(world.a, [0, 0, 0]);
  const pc = mat4TransformPoint(world.c, [0, 0, 0]);
  eq(pa[0], 1, 'fk a x');
  // b 绕 z 转 90°,c 的局部 +x 变为世界 +y
  eq(pc[0], 1, 'fk c x'); eq(pc[1], 3, 'fk c y');
}
// 7. 限位钳制
{
  const bones = { a: { limits: { x: [-10, 10], y: [-90, 90], z: [-5, 5] } } };
  const r = clampToLimits(bones, 'a', [45, 0, -30]);
  eq(r[0], 10, 'clamp x'); eq(r[2], -5, 'clamp z');
}
// 8. 镜像:左右交换 + 轴取反
{
  const bones = {
    l: { id: 'l', name: '左前肢', parentId: null },
    r: { id: 'r', name: '右前肢', parentId: null },
    m: { id: 'm', name: '头', parentId: null },
  };
  const pair = mirrorPair(bones, ['l', 'r', 'm']);
  ok(pair.l === 'r' && pair.r === 'l', 'mirror pair L/R');
  const anim = { tracks: {
    l: { pos: [makeKey(0, [1, 2, 3])], rot: [makeKey(0, [10, 20, 30])] },
    r: { pos: [], rot: [makeKey(0, [-5, 15, 0])] },
    m: { pos: [makeKey(0, [1, 0, 0])], rot: [makeKey(0, [0, 45, 10])] },
  } };
  mirrorAnimation(anim, pair);
  // l 的 rot 现在来自 r 并镜像:y/z 取反
  eq(anim.tracks.l.rot[0].v[0], -5, 'mirror swap x');
  eq(anim.tracks.l.rot[0].v[1], -15, 'mirror swap y neg');
  // 中间骨骼自身镜像
  eq(anim.tracks.m.rot[0].v[1], -45, 'mirror self y neg');
  eq(anim.tracks.m.pos[0].v[0], -1, 'mirror self pos x neg');
  // 对侧无轨道时也要搬过去
  const anim2 = { tracks: { l: { pos: [], rot: [makeKey(3, [1, 2, 3])] } } };
  mirrorAnimation(anim2, pair);
  ok((anim2.tracks.r?.rot?.length || 0) === 1, 'mirror creates track on empty side');
  eq(anim2.tracks.r.rot[0].v[1], -2, 'mirror moved key negated');
}
// 9. ZIP 结构
{
  const zip = buildZip([{ name: 'a.txt', data: new TextEncoder().encode('hello') }]);
  ok(zip[0] === 0x50 && zip[1] === 0x4b, 'zip magic');
  ok(zip.length > 50, 'zip size');
}
// 10. OBJ 解析
{
  const mesh = parseOBJ('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
  ok(mesh.positions.length === 9, 'obj verts');
  ok(mesh.indices.length === 3, 'obj indices');
  eq(mesh.normals[2], 1, 'obj normal +z');
}
// 11. upsertKey 同帧覆盖
{
  const keys = [];
  upsertKey(keys, 5, [1, 2, 3]);
  upsertKey(keys, 5, [9, 9, 9]);
  ok(keys.length === 1 && keys[0].v[0] === 9, 'upsert overwrites same frame');
}

console.log(failed ? `${failed} FAILURES` : 'ALL UNIT TESTS PASSED');
process.exit(failed ? 1 : 0);
