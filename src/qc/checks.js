// 质检:缺关键帧 / 关节超限 / 狮被穿插
import { evalPose } from '../core/animation.js';
import { computeFK, boneDepth } from '../core/skeleton.js';
import { computeBindMatrices, skinCloth } from '../core/skinning.js';
import { mat4TransformPoint, V3 } from '../core/math.js';

export const SEV = { error: '严重', warning: '一般', info: '提示' };

let issueSeq = 0;
const mkIssue = (animId, animName, type, severity, message, extra = {}) => ({
  id: `iss_${++issueSeq}`,
  animId, animName, type, severity, message,
  review: 'pending', // pending | confirmed | dismissed
  note: '',
  ...extra,
});

// 1) 缺关键帧检查
function checkMissingKeys(anim, bones, boneOrder, issues) {
  const [ls, le] = anim.loop;
  for (const id of boneOrder) {
    const b = bones[id];
    const tr = anim.tracks[id];
    const rotKeys = tr && tr.rot ? tr.rot : [];
    const posKeys = tr && tr.pos ? tr.pos : [];
    const depth = boneDepth(bones, id);
    if (!rotKeys.length && !posKeys.length) {
      const sev = depth <= 2 ? 'error' : 'warning';
      issues.push(mkIssue(anim.id, anim.name, '缺关键帧', sev,
        `骨骼「${b.name}」整条动画没有任何关键帧`, { bone: b.name }));
      continue;
    }
    if (!rotKeys.length) {
      issues.push(mkIssue(anim.id, anim.name, '缺关键帧', depth <= 2 ? 'error' : 'warning',
        `骨骼「${b.name}」缺少旋转关键帧`, { bone: b.name }));
    }
    const all = [...rotKeys, ...posKeys];
    if (all.length) {
      const first = Math.min(...all.map((k) => k.f));
      const last = Math.max(...all.map((k) => k.f));
      if (first > ls || last < le) {
        issues.push(mkIssue(anim.id, anim.name, '缺关键帧', 'warning',
          `骨骼「${b.name}」关键帧未覆盖循环区间 [${ls}, ${le}](实际 ${first}~${last})`,
          { bone: b.name }));
      }
    }
  }
}

// 2) 关节活动范围检查(逐帧采样)
function checkJointLimits(anim, bones, boneOrder, issues) {
  const axes = ['x', 'y', 'z'];
  const violations = {}; // bone|axis -> {max, frame}
  for (let f = 0; f <= anim.frames; f++) {
    const pose = evalPose(anim, bones, boneOrder, f);
    for (const id of boneOrder) {
      const lim = bones[id].limits;
      if (!lim) continue;
      const rot = pose[id].rot;
      for (let a = 0; a < 3; a++) {
        const [mn, mx] = lim[axes[a]] || [-180, 180];
        const v = rot[a];
        if (v < mn - 1e-3 || v > mx + 1e-3) {
          const key = `${id}|${a}`;
          const over = v < mn ? mn - v : v - mx;
          if (!violations[key] || over > violations[key].over)
            violations[key] = { over, frame: f, value: v, mn, mx };
        }
      }
    }
  }
  for (const [key, v] of Object.entries(violations)) {
    const [id, a] = key.split('|');
    const b = bones[id];
    const sev = v.over > 15 ? 'error' : 'warning';
    issues.push(mkIssue(anim.id, anim.name, '关节超限', sev,
      `骨骼「${b.name}」${'XYZ'[+a]} 轴第 ${v.frame} 帧取值 ${v.value.toFixed(1)}°,超出活动范围 [${v.mn}°, ${v.mx}°](超出 ${v.over.toFixed(1)}°)`,
      { bone: b.name, frame: v.frame }));
  }
}

// 3) 狮被穿插检查:蒙皮后的狮被顶点 vs 头部/躯干球体、尾部胶囊
function checkClothIntersection(anim, bones, boneOrder, cloth, issues) {
  if (!cloth) return;
  const { restPositions, restNormals, weights, sParam } = cloth;
  const restWorld = computeFK(bones, boneOrder, null);
  const invBind = computeBindMatrices(bones, boneOrder, restWorld);
  const hits = [];
  for (let f = 0; f <= anim.frames; f += 2) {
    const pose = evalPose(anim, bones, boneOrder, f);
    const world = computeFK(bones, boneOrder, pose);
    const skinned = skinCloth(restPositions, restNormals, weights, world, invBind);
    // 碰撞体:头(球)、躯干(球)、尾(球列);半径取内芯,两端衔接带(s<0.12 / s>0.92)豁免
    const colliders = [
      { c: mat4TransformPoint(world.head, [0, 0, 0.1]), r: 0.3, label: '狮头' },
      { c: mat4TransformPoint(world.root, [0, 0.05, 0]), r: 0.32, label: '躯干' },
      { c: mat4TransformPoint(world.tail1, [0, 0, 0]), r: 0.08, label: '狮尾' },
      { c: mat4TransformPoint(world.tail2, [0, 0, 0]), r: 0.07, label: '狮尾' },
    ];
    let worst = null;
    const n = skinned.positions.length / 3;
    for (let i = 0; i < n; i++) {
      if (sParam && (sParam[i] < 0.12 || sParam[i] > 0.92)) continue;
      const p = [skinned.positions[i * 3], skinned.positions[i * 3 + 1], skinned.positions[i * 3 + 2]];
      for (const col of colliders) {
        const d = V3.dist(p, col.c);
        const pen = col.r - d;
        if (pen > 0.02 && (!worst || pen > worst.pen)) worst = { pen, label: col.label };
      }
    }
    if (worst) hits.push({ frame: f, ...worst });
  }
  // 按帧段合并报告
  if (hits.length) {
    const maxPen = Math.max(...hits.map((h) => h.pen));
    const sev = maxPen > 0.12 ? 'error' : maxPen > 0.06 ? 'warning' : 'info';
    const frames = hits.map((h) => h.frame);
    issues.push(mkIssue(anim.id, anim.name, '狮被穿插', sev,
      `狮被在第 ${frames[0]}~${frames[frames.length - 1]} 帧与${hits[0].label}等部件发生穿插,最大深度 ${maxPen.toFixed(3)}(共 ${hits.length} 个采样帧)`,
      { frame: frames[0] }));
  }
}

// 对一条动画快照跑全部检查
export function runChecks(anim, bones, boneOrder, cloth) {
  const issues = [];
  checkMissingKeys(anim, bones, boneOrder, issues);
  checkJointLimits(anim, bones, boneOrder, issues);
  checkClothIntersection(anim, bones, boneOrder, cloth, issues);
  const rank = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
