// ===== 骨架：默认人形骨架、层级工具、世界变换 =====
import type { Bone } from './types';
import { m4, q, type Mat4, type Quat, type Vec3 } from './math';
import { uid } from './math';

// 固定调色板，保证骨骼颜色可区分且稳定
const PALETTE: [number, number, number][] = [
  [0.95, 0.30, 0.30], [0.30, 0.75, 0.95], [0.45, 0.90, 0.45],
  [0.95, 0.80, 0.30], [0.75, 0.45, 0.95], [0.95, 0.55, 0.25],
  [0.25, 0.90, 0.85], [0.90, 0.45, 0.70], [0.60, 0.80, 0.30],
  [0.50, 0.60, 0.95], [0.95, 0.65, 0.65], [0.65, 0.95, 0.75]
];

export function boneColor(index: number): [number, number, number] {
  return PALETTE[index % PALETTE.length];
}

interface BoneSpec {
  name: string;
  parent: string | null;
  pos: Vec3;          // 绑定姿态世界坐标（构建时换算为局部）
  length: number;
}

// 面向 -Z 的标准人形骨架，脚底在 y=0
const HUMANOID: BoneSpec[] = [
  { name: '骨盆', parent: null, pos: [0, 0.95, 0], length: 0.12 },
  { name: '脊柱', parent: '骨盆', pos: [0, 1.20, 0], length: 0.25 },
  { name: '胸腔', parent: '脊柱', pos: [0, 1.45, 0], length: 0.25 },
  { name: '颈部', parent: '胸腔', pos: [0, 1.62, 0], length: 0.10 },
  { name: '头部', parent: '颈部', pos: [0, 1.78, 0], length: 0.16 },
  { name: '左锁骨', parent: '胸腔', pos: [0.10, 1.52, 0], length: 0.12 },
  { name: '左上臂', parent: '左锁骨', pos: [0.28, 1.50, 0], length: 0.30 },
  { name: '左前臂', parent: '左上臂', pos: [0.28, 1.20, 0], length: 0.27 },
  { name: '左手', parent: '左前臂', pos: [0.28, 0.93, 0], length: 0.10 },
  { name: '右锁骨', parent: '胸腔', pos: [-0.10, 1.52, 0], length: 0.12 },
  { name: '右上臂', parent: '右锁骨', pos: [-0.28, 1.50, 0], length: 0.30 },
  { name: '右前臂', parent: '右上臂', pos: [-0.28, 1.20, 0], length: 0.27 },
  { name: '右手', parent: '右前臂', pos: [-0.28, 0.93, 0], length: 0.10 },
  { name: '左大腿', parent: '骨盆', pos: [0.11, 0.90, 0], length: 0.42 },
  { name: '左小腿', parent: '左大腿', pos: [0.11, 0.48, 0], length: 0.40 },
  { name: '左脚', parent: '左小腿', pos: [0.11, 0.08, 0], length: 0.18 },
  { name: '右大腿', parent: '骨盆', pos: [-0.11, 0.90, 0], length: 0.42 },
  { name: '右小腿', parent: '右大腿', pos: [-0.11, 0.48, 0], length: 0.40 },
  { name: '右脚', parent: '右小腿', pos: [-0.11, 0.08, 0], length: 0.18 }
];

export function createDefaultSkeleton(): Bone[] {
  const worldPos = new Map<string, Vec3>();
  const bones: Bone[] = HUMANOID.map((spec, i) => {
    worldPos.set(spec.name, spec.pos);
    return {
      id: uid('bone'),
      name: spec.name,
      parentId: null,
      localPos: [...spec.pos] as Vec3,
      localRot: q.identity(),
      length: spec.length,
      color: boneColor(i)
    };
  });
  const byName = new Map<string, Bone>();
  bones.forEach((b, i) => byName.set(HUMANOID[i].name, b));
  HUMANOID.forEach((spec, i) => {
    const bone = bones[i];
    if (spec.parent) {
      const parent = byName.get(spec.parent)!;
      bone.parentId = parent.id;
      const pp = worldPos.get(spec.parent)!;
      bone.localPos = [spec.pos[0] - pp[0], spec.pos[1] - pp[1], spec.pos[2] - pp[2]];
    }
  });
  return bones;
}

export function childrenOf(bones: Bone[], id: string): Bone[] {
  return bones.filter((b) => b.parentId === id);
}

export function rootBones(bones: Bone[]): Bone[] {
  return bones.filter((b) => !b.parentId);
}

export function boneIndex(bones: Bone[], id: string): number {
  return bones.findIndex((b) => b.id === id);
}

/** 检测修改 parent 是否会形成环 */
export function wouldCycle(bones: Bone[], boneId: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (newParentId === boneId) return true;
  let cur: string | null = newParentId;
  const byId = new Map(bones.map((b) => [b.id, b]));
  while (cur) {
    if (cur === boneId) return true;
    cur = byId.get(cur)?.parentId ?? null;
  }
  return false;
}

export interface Pose {
  // 每根骨骼的局部覆盖（关键帧动画用）；未覆盖的骨骼用绑定姿态
  positions: Map<string, Vec3>;
  rotations: Map<string, Quat>;
}

export function emptyPose(): Pose {
  return { positions: new Map(), rotations: new Map() };
}

/**
 * 计算全部骨骼世界矩阵。
 * pose 为空时即绑定姿态。返回每根骨骼（按 bones 数组顺序）的世界矩阵。
 */
export function computeWorldMatrices(bones: Bone[], pose: Pose = emptyPose()): Mat4[] {
  const byId = new Map(bones.map((b) => [b.id, b]));
  const cache = new Map<string, Mat4>();

  function world(b: Bone): Mat4 {
    const cached = cache.get(b.id);
    if (cached) return cached;
    const pos = pose.positions.get(b.id) ?? b.localPos;
    const rot = pose.rotations.get(b.id) ?? b.localRot;
    const local = m4.compose(pos, rot);
    const w = b.parentId && byId.has(b.parentId)
      ? m4.multiply(world(byId.get(b.parentId)!), local)
      : local;
    cache.set(b.id, w);
    return w;
  }
  return bones.map((b) => world(b));
}

/** 取骨骼世界坐标（关节位置） */
export function boneWorldPositions(bones: Bone[], pose: Pose = emptyPose()): Map<string, Vec3> {
  const mats = computeWorldMatrices(bones, pose);
  const out = new Map<string, Vec3>();
  bones.forEach((b, i) => out.set(b.id, m4.getTranslation(mats[i])));
  return out;
}

/** 计算蒙皮用 offset 矩阵（绑定姿态逆世界矩阵） */
export function computeOffsetMatrices(bones: Bone[]): Mat4[] {
  return computeWorldMatrices(bones).map((m) => m4.invert(m));
}

/** 新增骨骼：挂在 parentId 下，位置为父骨骼世界位置 + 偏移 */
export function makeBone(name: string, parentId: string | null, at: Vec3, index: number): Bone {
  return {
    id: uid('bone'),
    name,
    parentId,
    localPos: [...at] as Vec3,
    localRot: q.identity(),
    length: 0.15,
    color: boneColor(index)
  };
}

/** 删除骨骼：其子骨骼改挂到被删骨骼的父节点，保持层级不断裂 */
export function deleteBone(bones: Bone[], id: string): Bone[] {
  const target = bones.find((b) => b.id === id);
  if (!target) return bones;
  return bones
    .filter((b) => b.id !== id)
    .map((b) => b.parentId === id ? { ...b, parentId: target.parentId } : b);
}
