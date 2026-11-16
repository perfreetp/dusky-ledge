import { assert } from 'node:console';
import { generateZone } from '../src/lib/data/generator';
import { FeatureArrays, TYPE_ORDER, bucketSlot } from '../src/lib/three/featureArrays';
import * as THREE from 'three';
import { LOD_SQ } from '../src/lib/config';
import type { Feature, LayerId } from '../src/lib/types';

let passed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name} ${detail}`);
  passed++;
  console.log(`  ✓ ${name}`);
}

// ---------------- 1. 确定性生成 + 上万要素
const seed = 20261117;
const z1 = generateZone(seed);
const z2 = generateZone(seed);
check('两次同种子生成要素数量一致', z1.features.length === z2.features.length);
check('同种子生成的要素完全一致（编号/坐标/日期）',
  z1.features.every((f, i) =>
    f.id === z2.features[i].id &&
    f.x === z2.features[i].x &&
    f.deployDate === z2.features[i].deployDate
  )
);
check('要素总数达到上万规模', z1.features.length > 10000, `实际 ${z1.features.length}`);
check('六类要素全部存在',
  (['cage', 'buoy', 'chain', 'marker', 'warningZone', 'channel'] as const).every(
    (t) => z1.counts[t] > 0
  )
);
check('网箱为最大量要素', z1.counts.cage > 8000, `网箱 ${z1.counts.cage}`);
check('编号唯一', new Set(z1.features.map((f) => f.id)).size === z1.features.length);
check('每个要素都有投放日期且格式合法',
  z1.features.every((f) => /^\d{4}-\d{2}-\d{2}$/.test(f.deployDate))
);

// ---------------- 2. FeatureArrays 装载
const arr = new FeatureArrays(z1.features);
check('并行数组长度等于要素数', arr.count === z1.features.length);
check('idToIndex 可反查全部要素',
  z1.features.every((f) => arr.idToIndex.get(f.id) !== undefined)
);
check('包围球半径全部为正',
  Array.from({ length: arr.count }, (_, i) => arr.cRadius[i] > 0).every(Boolean)
);

// ---------------- 3. 视锥剔除 + 三档 LOD
const camera = new THREE.PerspectiveCamera(55, 1.6, 1, 12000);
const frustum = new THREE.Frustum();
function runCull(camPos: [number, number, number]) {
  camera.position.set(...camPos);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(m);
  return arr.cullAndLod(camera, frustum);
}

const drawnFar = runCull([0, 6000, 0.001]); // 俯视高空
check('高空俯视有要素通过视锥', drawnFar > 0, `drawn=${drawnFar}`);

const cage = z1.features.find((f) => f.type === 'cage')!;

// 极端近景看向单个网箱，远离的要素（包围球也够不着视锥）应被剔除
camera.position.set(cage.x, 30, cage.z + 20);
camera.lookAt(cage.x, cage.y - 10, cage.z);
camera.updateMatrixWorld();
{
  const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(m);
  const drawnClose = arr.cullAndLod(camera, frustum);
  check('近景有要素通过视锥', drawnClose > 0, `drawn=${drawnClose}`);
  check('视锥外要素被剔除（数量远小于总数）', drawnClose < arr.count * 0.25,
    `drawn=${drawnClose} / total=${arr.count}`);
  check('通过与剔除两种状态同时存在',
    arr.visible.some((v) => v === 1) && arr.visible.some((v) => v === 0)
  );
}

// 把相机贴到第一个网箱上，应进入 LOD2
camera.position.set(cage.x, cage.y + 40, cage.z);
camera.lookAt(cage.x, cage.y, cage.z);
camera.updateMatrixWorld();
{
  const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(m);
  arr.cullAndLod(camera, frustum);
  const idx = arr.idToIndex.get(cage.id)!;
  check('近距离要素落在 LOD2 完整网格档', arr.level[idx] === 2);
  const { count } = arr.listFor(TYPE_ORDER.indexOf('cage'), 2);
  check('LOD2 网箱桶非空', count > 0);
}

// 相机拉到 LOD 阈值之外
camera.position.set(cage.x, 0, cage.z + Math.sqrt(LOD_SQ.FAR) + 500);
camera.lookAt(cage.x, 0, cage.z);
camera.updateMatrixWorld();
{
  const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(m);
  arr.cullAndLod(camera, frustum);
  const idx = arr.idToIndex.get(cage.id)!;
  check('远距离要素落在 LOD0 包围盒档', arr.level[idx] === 0);
}

// ---------------- 4. 图层开关：关闭后不进桶
function countLayerVisible(layer: LayerId): number {
  let n = 0;
  for (let i = 0; i < arr.count; i++) if (arr.layerOf(i) === layer && arr.visible[i]) n++;
  return n;
}
runCull([1800, 1350, 1800]);
const before = countLayerVisible('cage');
check('默认图层开启时网箱可见数>0', before > 0);
arr.setLayerOn('cage', false);
runCull([1800, 1350, 1800]);
check('关闭网箱图层后该图层要素全部不可见', countLayerVisible('cage') === 0);
arr.setLayerOn('cage', true);
runCull([1800, 1350, 1800]);
check('重新开启后恢复可见', countLayerVisible('cage') === before);

// 桶槽位映射稳定
check('bucketSlot 映射为 type*3+lod',
  bucketSlot(2, 1) === 2 * 3 + 1
);

// ---------------- 5. 包围盒数据合理性（框选/描边依赖）
const wz = z1.features.find((f) => f.type === 'warningZone')!;
const wi = arr.idToIndex.get(wz.id)!;
check('包围盒 min<=max',
  arr.bMinX[wi] <= arr.bMaxX[wi] && arr.bMinY[wi] <= arr.bMaxY[wi] && arr.bMinZ[wi] <= arr.bMaxZ[wi]
);
check('警戒区包围盒半径覆盖其声明半径',
  (arr.bMaxX[wi] - arr.bMinX[wi]) / 2 >= wz.radius * 0.99
);

console.log(`\n核心渲染逻辑测试全部通过：${passed} 项`);
