// ===== 动画片段：关键帧管理、插值采样、姿势复制 =====
import type { Clip, Keyframe, Track, AnimationVersion } from './types';
import type { Pose } from './skeleton';
import { emptyPose } from './skeleton';
import { q, solveBezierEase, uid, v3, type Quat, type Vec3 } from './math';

export function createClip(name: string, duration = 4, fps = 24): Clip {
  return { id: uid('clip'), name, duration, fps, tracks: [] };
}

export function createVersion(label: string, clip: Clip, note = ''): AnimationVersion {
  return {
    id: uid('ver'), label, clip, note,
    createdAt: Date.now(), exports: [], submittedForReview: false
  };
}

export function getTrack(clip: Clip, boneId: string): Track | undefined {
  return clip.tracks.find((t) => t.boneId === boneId);
}

export function ensureTrack(clip: Clip, boneId: string): Track {
  let t = getTrack(clip, boneId);
  if (!t) {
    t = { boneId, keys: [] };
    clip.tracks.push(t);
  }
  return t;
}

export function makeKey(time: number, pos: Vec3, rot: Quat): Keyframe {
  return {
    id: uid('key'), time,
    pos: [...pos] as Vec3,
    rot: [...rot] as Quat,
    inX: 0.75, outX: 0.25
  };
}

/** 插入或覆盖同时间关键帧（容差 1e-4 秒），返回受影响 track */
export function upsertKey(clip: Clip, boneId: string, key: Keyframe): Track {
  const track = ensureTrack(clip, boneId);
  const exist = track.keys.find((k) => Math.abs(k.time - key.time) < 1e-4);
  if (exist) {
    exist.pos = key.pos;
    exist.rot = key.rot;
  } else {
    track.keys.push(key);
    track.keys.sort((a, b) => a.time - b.time);
  }
  return track;
}

export function deleteKey(clip: Clip, boneId: string, keyId: string) {
  const t = getTrack(clip, boneId);
  if (!t) return;
  t.keys = t.keys.filter((k) => k.id !== keyId);
}

/** 拖拽改时间，自动排序并夹在 [0, duration] */
export function moveKey(clip: Clip, boneId: string, keyId: string, newTime: number) {
  const t = getTrack(clip, boneId);
  if (!t) return;
  const k = t.keys.find((x) => x.id === keyId);
  if (!k) return;
  k.time = Math.max(0, Math.min(clip.duration, newTime));
  t.keys.sort((a, b) => a.time - b.time);
}

export function setKeyTangent(clip: Clip, boneId: string, keyId: string, patch: Partial<Pick<Keyframe, 'inX' | 'outX'>>) {
  const k = getTrack(clip, boneId)?.keys.find((x) => x.id === keyId);
  if (!k) return;
  if (patch.inX !== undefined) k.inX = patch.inX;
  if (patch.outX !== undefined) k.outX = patch.outX;
}

/** 该关键帧到下一帧是否匀速（线性）。segmentLinear 标记存在 key 上 */
export function isSegmentLinear(key: Keyframe): boolean {
  return (key as Keyframe & { segmentLinear?: boolean }).segmentLinear === true;
}
export function setSegmentLinear(key: Keyframe, linear: boolean) {
  (key as Keyframe & { segmentLinear?: boolean }).segmentLinear = linear;
}

function segmentEase(key: Keyframe, u: number): number {
  if (isSegmentLinear(key)) return u;
  // outX 为出柄（本段起点），下一帧的 inX 为入柄（本段终点）
  return solveBezierEase(u, key.outX, 1);
}

/** 在 time 处对整个 clip 采样，返回局部 pose */
export function sampleClip(clip: Clip, time: number): Pose {
  const pose = emptyPose();
  const t = Math.max(0, Math.min(clip.duration, time));
  for (const track of clip.tracks) {
    const keys = track.keys;
    if (keys.length === 0) continue;
    if (t <= keys[0].time) {
      pose.positions.set(track.boneId, [...keys[0].pos] as Vec3);
      pose.rotations.set(track.boneId, q.copy(keys[0].rot));
      continue;
    }
    if (t >= keys[keys.length - 1].time) {
      const last = keys[keys.length - 1];
      pose.positions.set(track.boneId, [...last.pos] as Vec3);
      pose.rotations.set(track.boneId, q.copy(last.rot));
      continue;
    }
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t >= a.time && t <= b.time) {
        const span = b.time - a.time || 1;
        const u = (t - a.time) / span;
        const e = segmentEase(a, u);
        pose.positions.set(track.boneId, v3.lerp(a.pos, b.pos, e));
        pose.rotations.set(track.boneId, q.slerp(a.rot, b.rot, e));
        break;
      }
    }
  }
  return pose;
}

/** 复制某一帧的完整姿势，粘贴到目标时间（对已有全部骨骼生成关键帧） */
export function copyPoseAt(clip: Clip, srcTime: number): { time: number; bones: { boneId: string; pos: Vec3; rot: Quat }[] } {
  const pose = sampleClip(clip, srcTime);
  return {
    time: srcTime,
    bones: [...pose.positions.entries()].map(([boneId, pos]) => ({
      boneId, pos, rot: pose.rotations.get(boneId) ?? q.identity()
    }))
  };
}

export function pastePose(clip: Clip, snapshot: { bones: { boneId: string; pos: Vec3; rot: Quat }[] }, destTime: number) {
  for (const b of snapshot.bones) {
    upsertKey(clip, b.boneId, makeKey(destTime, [...b.pos] as Vec3, q.copy(b.rot)));
  }
}

/** 深拷贝 clip（版本管理用） */
export function cloneClip(clip: Clip): Clip {
  return JSON.parse(JSON.stringify(clip)) as Clip;
}

export function totalKeyCount(clip: Clip): number {
  return clip.tracks.reduce((s, t) => s + t.keys.length, 0);
}
