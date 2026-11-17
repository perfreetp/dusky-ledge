// 核心逻辑冒烟测试（node tests/smoke.mjs），不依赖浏览器/DOM
import {
  createModel, setVoxel, removeVoxel, keyOf, fanOut, symmetryScore,
  seedHouse, serialize, deserialize, boundsOf
} from '../src/lib/voxel.js'
import { greedyMesh, mergeCuboids, rawExposedFaces } from '../src/lib/merge.js'
import { buildList } from '../src/lib/buildlist.js'
import { evaluate, mistakeSummary, findSuspended } from '../src/lib/grading.js'

let pass = 0, fail = 0
function check (name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.error(`  ✗ ${name} ${extra}`) }
}

// 1. 基础增删
{
  const m = createModel(8)
  setVoxel(m, 1, 1, 1, 0)
  check('set/get', m.voxels.get(keyOf(1, 1, 1)) === 0)
  check('越界拦截', setVoxel(m, 9, 0, 0, 0) === false)
  removeVoxel(m, 1, 1, 1)
  check('remove', !m.voxels.has(keyOf(1, 1, 1)))
}

// 2. 镜像扇出
{
  const m = createModel(8)
  const pts = fanOut(m, 0, 2, 3, 'x')
  check('X 镜像两点', pts.length === 2 && pts.some(p => p[0] === 7))
  const both = fanOut(m, 1, 2, 3, 'both')
  check('双轴四点去重', both.length === 4)
  const center = fanOut(m, 3.5 - 0.5, 0, 0, 'x') // 镜像落在自身
  const m2 = createModel(7) // 中心格 x=3，镜像即自身
  check('中心格不重复', fanOut(m2, 3, 0, 0, 'x').length === 1)
}

// 3. 对称度：完全对称模型=100%
{
  const m = createModel(8)
  for (const [x, y, z, c] of [[0, 0, 0, 1], [7, 0, 0, 1], [2, 3, 1, 2], [5, 3, 1, 2]]) setVoxel(m, x, y, z, c)
  check('完全 X 对称=1', symmetryScore(m, ['x']) === 1)
  setVoxel(m, 7, 0, 0, 3) // 颜色不一致
  check('颜色破坏对称<1', symmetryScore(m, ['x']) < 1)
}

// 4. 贪心减面：3x3x3 实心立方体
{
  const m = createModel(8)
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) setVoxel(m, x, y, z, 5)
  const raw = rawExposedFaces(m)
  check('实心 3³ 原始暴露面=54', raw === 54, `got ${raw}`)
  const mesh = greedyMesh(m)
  check('贪心合并为 6 个大面', mesh.quads.length === 6, `got ${mesh.quads.length}`)
  check('合并面面积和=54', mesh.quads.reduce((s, q) => s + q.w * q.h, 0) === 54)
  const boxes = mergeCuboids(m)
  check('同色合并为 1 个长方体', boxes.length === 1 && boxes[0].count === 27)
}

// 5. L 形不会被错误合并
{
  const m = createModel(8)
  for (let x = 0; x < 3; x++) setVoxel(m, x, 0, 0, 0)
  for (let y = 1; y < 3; y++) setVoxel(m, 0, y, 0, 0)
  const boxes = mergeCuboids(m)
  check('L 形至少 2 个长方体', boxes.length >= 2)
  check('长方体体素数守恒', boxes.reduce((s, b) => s + b.count, 0) === 5)
}

// 6. 拼搭清单
{
  const m = createModel(8)
  setVoxel(m, 0, 0, 0, 1); setVoxel(m, 1, 0, 0, 1); setVoxel(m, 0, 0, 1, 2)
  const list = buildList(m)
  check('清单 2 层', list.rows.length === 2)
  check('第 1 层 2 块', list.rows[0].total === 2)
  check('用色汇总 2 色', list.summary.length === 2)
}

// 7. 考评
{
  const m = createModel(8)
  setVoxel(m, 0, 0, 0, 0)
  setVoxel(m, 3, 3, 3, 0) // 悬空
  const task = { maxVoxels: 1, mirror: 'x' }
  const e = evaluate(m, task)
  check('超限检出', e.overLimit && e.voxelCount === 2)
  check('悬空检出', e.suspendedCount === 1)
  check('对称度低', e.symmetry < 1)
  check('初评分 0-100', e.autoScore >= 0 && e.autoScore <= 100)
  check('悬空定位', findSuspended(m).length === 1)

  const sub = [{ id: 's1', taskId: 't1', eval: e, status: 'pending' }]
  const sum = mistakeSummary(sub, [{ id: 't1', ...task }])
  check('错法汇总统计', sum.total === 1 && sum.items[0].count >= 1)
}

// 8. 演示房子
{
  const m = seedHouse(16)
  check('房子体素 >100', m.voxels.size > 100, `got ${m.voxels.size}`)
  check('房子 X 对称', symmetryScore(m, ['x']) === 1)
  check('房子无悬空', findSuspended(m).length === 0)
  const b = boundsOf(m)
  check('包围盒合理', b.maxZ >= 7 && b.maxZ <= 9)
  const json = serialize(m)
  const back = deserialize(json)
  check('序列化往返一致', back.voxels.size === m.voxels.size)
  const mesh = greedyMesh(m)
  check('房子减面有效', mesh.quads.length < rawExposedFaces(m))
  const boxes = mergeCuboids(m)
  check('长方体体素守恒', boxes.reduce((s, x) => s + x.count, 0) === m.voxels.size)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
