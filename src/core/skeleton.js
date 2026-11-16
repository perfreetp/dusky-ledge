// 骨架:骨骼树、前向运动学、关节限位
import { mat4FromTRS, mat4Multiply, mat4TransformPoint, mat3FromMat4 } from './math.js';

// 骨骼姿态 = 静止姿态 + 动画偏移(编辑器中直接以当前 pos/rot 表示姿态)
export function computeFK(bones, boneOrder, pose) {
  // pose: {boneId: {pos:[...], rot:[...]}} 缺省用骨骼自身 rest
  const world = {}; // id -> mat4
  for (const id of boneOrder) {
    const b = bones[id];
    const p = pose && pose[id] ? pose[id] : b;
    const local = mat4FromTRS(p.pos, p.rot);
    world[id] = b.parentId ? mat4Multiply(world[b.parentId], local) : local;
  }
  return world;
}

export function jointPositions(bones, boneOrder, world) {
  const out = {};
  for (const id of boneOrder) {
    out[id] = mat4TransformPoint(world[id], [0, 0, 0]);
  }
  return out;
}

export function boneWorldAxis(bones, world, id, axisIndex) {
  // 骨骼世界矩阵的第 axisIndex 根轴
  const m = world[id];
  const o = [m[axisIndex * 4], m[axisIndex * 4 + 1], m[axisIndex * 4 + 2]];
  const l = Math.hypot(...o) || 1;
  return [o[0] / l, o[1] / l, o[2] / l];
}

export function clampToLimits(bones, id, rot) {
  const lim = bones[id].limits;
  if (!lim) return rot;
  const axes = ['x', 'y', 'z'];
  return rot.map((v, i) => {
    const [mn, mx] = lim[axes[i]] || [-180, 180];
    return Math.max(mn, Math.min(mx, v));
  });
}

// 深度(用于缩进显示与严重度分级)
export function boneDepth(bones, id) {
  let d = 0, cur = bones[id];
  while (cur && cur.parentId) { d++; cur = bones[cur.parentId]; }
  return d;
}

// 左右镜像配对:按名字中的 左/右 或 L/R 后缀
export function mirrorPair(bones, boneOrder) {
  const map = {};
  for (const id of boneOrder) {
    const n = bones[id].name;
    let other = null;
    if (n.includes('左')) other = n.replace('左', '右');
    else if (n.includes('右')) other = n.replace('右', '左');
    else if (/(^|_)L$/.test(n)) other = n.replace(/L$/, 'R');
    else if (/(^|_)R$/.test(n)) other = n.replace(/R$/, 'L');
    if (other) {
      const oid = boneOrder.find((k) => bones[k].name === other);
      if (oid) map[id] = oid;
    }
  }
  return map;
}
