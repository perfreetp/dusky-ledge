// 动画轨道:关键帧、插值(贝塞尔/线性/缓入缓出)、镜像
// 关键帧: { f, v:[x,y,z], mode:'bezier'|'linear'|'ease',
//           hin:{df,dv:[3]}, hout:{df,dv:[3]} }  —— 贝塞尔手柄(帧, 值偏移)

export function makeKey(f, v, mode = 'bezier') {
  return {
    f,
    v: [...v],
    mode,
    hin: { df: -2, dv: [0, 0, 0] },
    hout: { df: 2, dv: [0, 0, 0] },
  };
}

export function sortKeys(keys) {
  keys.sort((a, b) => a.f - b.f);
  return keys;
}

export function upsertKey(keys, f, v, mode) {
  const EPS = 1e-4;
  const found = keys.find((k) => Math.abs(k.f - f) < EPS);
  if (found) {
    found.v = [...v];
    return found;
  }
  const k = makeKey(f, v, mode || (keys[0] ? keys[0].mode : 'bezier'));
  keys.push(k);
  sortKeys(keys);
  return k;
}

// 三次贝塞尔(单分量):P0=0 相对系
function cubicAt(p1, p2, t) {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

// 给定 x(归一化帧进度)解贝塞尔参数 t
function solveT(x, cx1, cx2) {
  let t = x;
  for (let i = 0; i < 6; i++) {
    const u = 1 - t;
    const cx = 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t;
    const dx = 3 * u * u * cx1 + 6 * u * t * (cx2 - cx1) + 3 * t * t * (1 - cx2);
    if (Math.abs(dx) < 1e-5) break;
    t -= (cx - x) / dx;
    t = Math.max(0, Math.min(1, t));
  }
  return t;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// 求轨道在帧 f 的值(3 分量)
export function evalTrack(keys, f) {
  if (!keys || keys.length === 0) return null;
  if (f <= keys[0].f) return [...keys[0].v];
  const last = keys[keys.length - 1];
  if (f >= last.f) return [...last.v];
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].f <= f) i++;
  const k1 = keys[i], k2 = keys[i + 1];
  const span = k2.f - k1.f;
  const t = (f - k1.f) / span;
  const mode = k1.mode || 'bezier';
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const v0 = k1.v[c], v3 = k2.v[c];
    if (mode === 'linear') {
      out[c] = v0 + (v3 - v0) * t;
    } else if (mode === 'ease') {
      out[c] = v0 + (v3 - v0) * smooth(t);
    } else {
      // 贝塞尔:手柄以(帧,值)存储,归一化到段内
      const cx1 = Math.max(0, Math.min(1, (k1.hout.df || 0) / span));
      const cx2 = Math.max(0, Math.min(1, 1 + (k2.hin.df || 0) / span));
      const cy1 = (v0 + (k1.hout.dv ? k1.hout.dv[c] : 0) - v0) / (v3 - v0 || 1);
      const cy2 = (v3 + (k2.hin.dv ? k2.hin.dv[c] : 0) - v0) / (v3 - v0 || 1);
      const bt = solveT(t, cx1, cx2);
      const y = cubicAt(cy1, cy2, bt);
      out[c] = v0 + (v3 - v0) * y;
    }
  }
  return out;
}

// 求整条动画在帧 f 的姿态:{boneId:{pos,rot}}
export function evalPose(anim, bones, boneOrder, f) {
  const pose = {};
  for (const id of boneOrder) {
    const tr = anim.tracks[id];
    const b = bones[id];
    pose[id] = {
      pos: tr && tr.pos && tr.pos.length ? evalTrack(tr.pos, f) : [...b.pos],
      rot: tr && tr.rot && tr.rot.length ? evalTrack(tr.rot, f) : [...b.rot],
    };
  }
  return pose;
}

export function ensureTrack(anim, boneId, kind) {
  if (!anim.tracks[boneId]) anim.tracks[boneId] = { pos: [], rot: [] };
  if (!anim.tracks[boneId][kind]) anim.tracks[boneId][kind] = [];
  return anim.tracks[boneId][kind];
}

// 左右镜像:交换左右骨骼轨道,并对所有轨道做镜像变换(negate pos.x, rot.y, rot.z)
export function mirrorAnimation(anim, pairMap) {
  const mirrorVals = (keys, kind) =>
    keys.map((k) => {
      const v = kind === 'pos' ? [-k.v[0], k.v[1], k.v[2]] : [k.v[0], -k.v[1], -k.v[2]];
      const flipDv = (dv) =>
        kind === 'pos' ? [-dv[0], dv[1], dv[2]] : [dv[0], -dv[1], -dv[2]];
      return {
        ...k,
        v,
        hin: { df: k.hin.df, dv: flipDv(k.hin.dv) },
        hout: { df: k.hout.df, dv: flipDv(k.hout.dv) },
      };
    });

  const newTracks = {};
  const done = new Set();
  for (const [boneId, tr] of Object.entries(anim.tracks)) {
    if (done.has(boneId)) continue;
    const other = pairMap[boneId];
    const trOther = other ? anim.tracks[other] : null;
    if (other) {
      // 交换并镜像(对侧没有轨道时也要把本侧搬过去)
      newTracks[boneId] = {
        pos: mirrorVals(trOther ? trOther.pos : [], 'pos'),
        rot: mirrorVals(trOther ? trOther.rot : [], 'rot'),
      };
      newTracks[other] = {
        pos: mirrorVals(tr.pos, 'pos'),
        rot: mirrorVals(tr.rot, 'rot'),
      };
      done.add(boneId); done.add(other);
    } else {
      newTracks[boneId] = {
        pos: mirrorVals(tr.pos, 'pos'),
        rot: mirrorVals(tr.rot, 'rot'),
      };
      done.add(boneId);
    }
  }
  anim.tracks = newTracks;
}

export function animationDuration(anim) {
  return anim.frames / anim.fps;
}
