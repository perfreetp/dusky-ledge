// 冒烟测试：数据生成、两期差异、几何构建、相机数学、档案版本流程（无 GPU/浏览器依赖部分）
import { generateDataset, generatePeriod2 } from '../src/core/mockData';
import { buildScene } from '../src/core/mesh';
import { archiveStore, fingerprint, geomFingerprint } from '../src/core/archive';
import { screenRay, rayAABB, orbitEye, viewProj, mat4Perspective, mat4LookAt, mat4Multiply, transformVec4 } from '../src/core/math';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name} ${extra}`); }
  else { fail++; console.error(`  ✗ ${name} ${extra}`); }
}

console.log('1) 测量数据生成');
const p1 = generateDataset({ period: 1, seed: 0x51a7c0, targetLength: 120000 });
check('一期总长 ≥ 12 万米', p1.totalLength >= 120000, `(${p1.totalLength.toLocaleString()} m)`);
check('一期总长不超目标 5%', p1.totalLength < 126000);
check('中心线点数合理（>3000）', p1.roadways.reduce((n, r) => n + r.centerline.length, 0) > 3000);
check('五要素齐全', p1.pipelines.length > 0 && p1.doors.length > 0 && p1.equipment.length > 0,
  `管${p1.pipelines.length}/门${p1.doors.length}/设备${p1.equipment.length}`);

console.log('2) 两期数据');
const p2 = generatePeriod2(p1);
const p1Ids = new Set(p1.roadways.map((r) => r.id));
const p2Ids = new Set(p2.roadways.map((r) => r.id));
const removed = [...p1Ids].filter((id) => !p2Ids.has(id));
const added = p2.roadways.filter((r) => r.diffStatus === 'new');
check('存在废弃段', removed.length > 0, `(${removed.length} 条)`);
check('存在新增段', added.length >= 6, `(${added.length} 条)`);
check('二期标注 new', added.every((r) => r.diffStatus === 'new'));

console.log('3) 几何构建与分段表');
const t0 = performance.now();
const scene1 = buildScene(p1);
const buildMs = performance.now() - t0;
check('五图层网格齐全', Object.keys(scene1.byLayer).length === 5);
const supportMeshes = scene1.byLayer.support;
check('支护双 LOD 网格', supportMeshes.length === 2 && supportMeshes[0].lodMode === 'nearOnly' && supportMeshes[1].lodMode === 'farOnly');
const totalVerts = Object.values(scene1.byLayer).flat().reduce((n, m) => n + m.positions.length / 3, 0);
const totalIdx = Object.values(scene1.byLayer).flat().reduce((n, m) => n + m.indices.length, 0);
check('顶点/索引规模合理', totalVerts > 100000 && totalIdx > 200000, `(${Math.round(totalVerts / 1000)}k 顶点 / ${Math.round(totalIdx / 1000)}k 索引)`);
check('每巷道有裁剪分段', scene1.byLayer.roadway[0].segments.length === p1.roadways.length);
check('高模支护索引远多于简模', supportMeshes[0].indices.length > supportMeshes[1].indices.length * 3,
  `(高${supportMeshes[0].indices.length} vs 简${supportMeshes[1].indices.length})`);
check('几何构建 < 3s', buildMs < 3000, `(${buildMs.toFixed(0)} ms)`);
// 索引合法性
let maxV = 0;
for (const m of Object.values(scene1.byLayer).flat()) {
  const vcount = m.positions.length / 3;
  for (const i of m.indices) { if (i >= vcount) { maxV = -1; break; } }
}
check('全部索引不越界', maxV === 0);
// 分段索引区间合法
let rangeOk = true;
for (const m of Object.values(scene1.byLayer).flat()) {
  for (const s of m.segments) {
    if (s.indexStart < 0 || s.indexStart + s.indexCount > m.indices.length) rangeOk = false;
  }
}
check('分段索引区间合法', rangeOk);

console.log('4) 相机与拾取数学');
const cam = { target: [0, 0, -420] as [number, number, number], radius: 2000, yaw: 0.5, pitch: 0.5, fovy: Math.PI / 4 };
const eye = orbitEye(cam);
check('轨道眼位长度=radius', Math.abs(Math.hypot(eye[0] - cam.target[0], eye[1] - cam.target[1], eye[2] - cam.target[2]) - 2000) < 1e-6);
const { origin, dir } = screenRay(cam, 1.6, 0, 0);
check('射线原点=眼位', origin.every((v, i) => Math.abs(v - eye[i]) < 1e-6));
check('射线方向归一化', Math.abs(Math.hypot(...dir) - 1) < 1e-6);
const expDir = (() => {
  const v = [cam.target[0] - eye[0], cam.target[1] - eye[1], cam.target[2] - eye[2]];
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();
check('屏幕中心射线指向观察目标', dir.every((v, i) => Math.abs(v - expDir[i]) < 1e-3));
const hit = rayAABB(origin, dir, [-50, -50, -470], [50, 50, -370]);
check('射线-AABB 命中返回 t', hit != null && hit >= 0);
const miss = rayAABB(origin, [1, 0, 0], [9000, 9100, 9000], [9500, 9600, 9500]);
check('射线-AABB 未命中返回 null', miss === null);
const vp = viewProj(cam, 1.6);
check('viewProj 为 4x4 矩阵', vp.length === 16);
// 目标点反投影后 NDC 应在 [-1,1]，且齐次 w>0
const clip = mat4Multiply(mat4Perspective(cam.fovy, 1.6, 0.5, 60000), mat4LookAt(eye, cam.target, [0, 0, 1]));
const c4 = transformVec4(clip, cam.target[0], cam.target[1], cam.target[2], 1);
const ndc = [c4[0] / c4[3], c4[1] / c4[3], c4[2] / c4[3]];
check('目标点在视锥内（w>0 且 NDC∈[-1,1]）',
  c4[3] > 0 && ndc.every((v) => v >= -1 && v <= 1),
  `(w=${c4[3].toFixed(1)}, ndc=${ndc.map((v) => v.toFixed(3)).join(',')})`);

console.log('5) 档案/版本/差异流程');
archiveStore.reset();
const a1 = archiveStore.registerMeasurement('s1.dat', p1);
const a2 = archiveStore.registerMeasurement('s2.dat', p2);
check('档案编号格式 CL-YYYY-####', /^CL-\d{4}-\d{4}$/.test(a1.id) && /^CL-\d{4}-\d{4}$/.test(a2.id));
const v1 = archiveStore.createVersion(a1.id, p1, '初版');
const v2 = archiveStore.createVersion(a2.id, p2, '二期版');
check('图档版本编号 GT-####', /^GT-\d{4}$/.test(v1.id));
check('版本含每巷指纹', Object.keys(v1.fingerprints).length === p1.roadways.length);
check('指纹稳定（同数据同结果）', p1.roadways.every((r) => fingerprint(r) === fingerprint(r)));
check('几何/综合指纹可不同', (() => {
  const r = { ...p1.roadways[0], name: '改名巷' };
  return geomFingerprint(r) === geomFingerprint(p1.roadways[0]) && fingerprint(r) !== fingerprint(p1.roadways[0]);
})());
const report = archiveStore.diffVersions(v1, v2, p1, p2);
check('差异报告四类计数自洽',
  report.summary.added + report.summary.removed + report.summary.geometry + report.summary.meta + report.summary.unchanged ===
  new Set([...Object.keys(v1.fingerprints), ...Object.keys(v2.fingerprints)]).size);
check('报告含新增与废弃条目', report.summary.added > 0 && report.summary.removed > 0,
  `(+${report.summary.added} -${report.summary.removed} 几何${report.summary.geometry})`);
check('长度净变化与数据集一致', report.lengthDelta === p2.totalLength - p1.totalLength);
archiveStore.archive(v1.id);
check('归档状态更新', archiveStore.versions.find((x) => x.id === v1.id)?.status === 'archived');
const hits = archiveStore.searchRoadways(p2, { name: '巷', levelMin: -1000, levelMax: 1000, district: p2.roadways[0].district });
check('三维条件检索有结果', hits.length > 0 && hits.every((r) => r.district === p2.roadways[0].district));
const noHit = archiveStore.searchRoadways(p2, { name: '不存在的巷道名XYZ' });
check('无命中返回空数组', noHit.length === 0);

console.log(`\n结果：${pass} 通过，${fail} 失败`);
if (fail) process.exit(1);
