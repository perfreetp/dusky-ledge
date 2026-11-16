// 狮被蒙皮:同时受狮头骨架链与狮尾骨架链驱动
import { mat4Invert, mat4Multiply, mat4TransformPoint, mat4TransformDir, V3 } from './math.js';

// 蒙皮骨骼沿身长的锚点(纵向参数 s):前段挂狮头链,后段挂狮尾链
const SKIN_SPOTS = [
  { bone: 'neck', s: 0.04, w: 1.2 },
  { bone: 'head', s: 0.0, w: 0.6 },
  { bone: 'root', s: 0.42, w: 1.0 },
  { bone: 'tailBase', s: 0.68, w: 1.0 },
  { bone: 'tail1', s: 0.84, w: 0.9 },
  { bone: 'tail2', s: 0.97, w: 0.8 },
];

// 依据每顶点纵向参数计算混合权重(高斯衰减 + 归一化)
export function computeClothWeights(sParam) {
  const n = sParam.length;
  const weights = []; // 每顶点 [{bone, w}]
  for (let i = 0; i < n; i++) {
    const s = sParam[i];
    const list = [];
    let sum = 0;
    for (const spot of SKIN_SPOTS) {
      const d = (s - spot.s) / 0.22;
      const w = spot.w * Math.exp(-d * d);
      if (w > 0.02) {
        list.push({ bone: spot.bone, w });
        sum += w;
      }
    }
    if (!sum) list.push({ bone: 'root', w: 1 }), (sum = 1);
    for (const e of list) e.w /= sum;
    weights.push(list);
  }
  return weights;
}

// 以静止姿态计算绑定矩阵(逆绑定矩阵)
export function computeBindMatrices(bones, boneOrder, restWorld) {
  const inv = {};
  for (const id of boneOrder) inv[id] = mat4Invert(restWorld[id]);
  return inv;
}

// CPU 蒙皮:restPositions + 权重 + 当前世界矩阵 => 变形后位置/法线
export function skinCloth(restPositions, restNormals, weights, world, invBind) {
  const n = restPositions.length / 3;
  const outPos = new Float32Array(restPositions.length);
  const outNrm = new Float32Array(restNormals.length);
  for (let i = 0; i < n; i++) {
    const p = [restPositions[i * 3], restPositions[i * 3 + 1], restPositions[i * 3 + 2]];
    const nm = [restNormals[i * 3], restNormals[i * 3 + 1], restNormals[i * 3 + 2]];
    let acc = [0, 0, 0], accN = [0, 0, 0];
    for (const { bone, w } of weights[i]) {
      const skin = mat4Multiply(world[bone], invBind[bone]);
      const tp = mat4TransformPoint(skin, p);
      const tn = mat4TransformDir(skin, nm);
      acc = V3.add(acc, V3.scale(tp, w));
      accN = V3.add(accN, V3.scale(tn, w));
    }
    outPos[i * 3] = acc[0]; outPos[i * 3 + 1] = acc[1]; outPos[i * 3 + 2] = acc[2];
    const nn = V3.norm(accN);
    outNrm[i * 3] = nn[0]; outNrm[i * 3 + 1] = nn[1]; outNrm[i * 3 + 2] = nn[2];
  }
  return { positions: outPos, normals: outNrm };
}
