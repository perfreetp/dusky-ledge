/**
 * 钟乳石群：确定性槽位布点 → 三档分级 → 步道净空 2.2m 避让 → 间距哈希复查。
 *
 * 关键不变量：
 *  - 每个候选格用稳定 id（站号+槽号 hash）取随机，删除/替换单株不扰动其它个体；
 *  - 滴水密度只决定占用概率，洞体几何不在本阶段被修改（分域隔离）；
 *  - 替换只改该实例的 shapeSeed，布点/档位/尺寸保持不变。
 */
import type { GenParams, Overrides } from '../types';
import type { Mesh, SpeleoInstance, Station, TrailPath, Vec3 } from './geometry';
import { SPELEO_TIERS, TRAIL_CLEARANCE_M } from './geometry';
import { Domain, pairId, range, substream } from './rng';
import { ringPoint } from './tunnel';
import { nearestOnTrail } from './trail';
import { v3 } from './vec';
import { makeMesh } from './meshUtils';

/** 顶部弧槽位的角度范围（只在洞顶上半周布石）。 */
const SLOT_THETA_MIN = Math.PI * 0.18;
const SLOT_THETA_MAX = Math.PI * 0.82;
const SLOTS_PER_STATION = 6;
/** 净空检测横向余量（米），步道半宽之外再让。 */
const SIDE_MARGIN = 0.3;
/** 个体间最小根部间距（米）。 */
const MIN_ROOT_SPACING = 0.9;
/** 原型回转体参数。 */
const PROTO_RADIAL = 10;
const PROTO_RINGS = 6;

export interface SpeleoBuild {
  instances: SpeleoInstance[];
  prototypes: Mesh[];
  rejectedByClearance: number;
}

function tierFor(r: number): number {
  // r 为该槽位的形态随机值，固定阈值保证可复现且密度变化时同槽档位稳定
  if (r < 0.55) return 0;
  if (r < 0.88) return 1;
  return 2;
}

/** 三档各建一个单位回转体原型（根在原点、向下生长），实例化时按比例缩放。 */
export function buildPrototypes(seed: number): Mesh[] {
  return SPELEO_TIERS.map((tier, tierIdx) => {
    const rng = substream(seed, Domain.SHAPE, 9000 + tierIdx);
    const positions: number[] = [];
    const indices: number[] = [];
    const swayBias = (rng() - 0.5) * 0.25;
    for (let ring = 0; ring <= PROTO_RINGS; ring++) {
      const t = ring / PROTO_RINGS; // 0 根 → 1 尖
      // 指数收分：根部饱满、向尖快速收敛
      const radius = Math.pow(1 - t, 1.6);
      const sway = Math.sin(t * Math.PI) * swayBias;
      for (let j = 0; j < PROTO_RADIAL; j++) {
        const theta = (j / PROTO_RADIAL) * Math.PI * 2;
        const lump = 1 + (rng() - 0.5) * 0.12 * (1 - t);
        const rr = radius * lump;
        positions.push(Math.cos(theta) * rr + sway * t, -t, Math.sin(theta) * rr);
      }
    }
    const idx = (r: number, j: number) => r * PROTO_RADIAL + (j % PROTO_RADIAL);
    for (let r = 0; r < PROTO_RINGS; r++) {
      for (let j = 0; j < PROTO_RADIAL; j++) {
        const a = idx(r, j);
        const b = idx(r + 1, j);
        const c = idx(r + 1, j + 1);
        const d = idx(r, j + 1);
        indices.push(a, b, d, b, c, d);
      }
    }
    // 根部封口
    const cap = positions.length / 3;
    positions.push(0, 0, 0);
    for (let j = 0; j < PROTO_RADIAL; j++) indices.push(cap, j, (j + 1) % PROTO_RADIAL);
    void tier;
    return makeMesh(new Float32Array(positions), new Uint32Array(indices), [0, -1, 0]);
  });
}

function instanceBbox(root: Vec3, axis: Vec3, height: number, radius: number): { min: Vec3; max: Vec3 } {
  const tip = v3.add(root, v3.scale(axis, height));
  const pad = radius;
  const min: Vec3 = [
    Math.min(root[0], tip[0]) - pad,
    Math.min(root[1], tip[1]) - pad,
    Math.min(root[2], tip[2]) - pad,
  ];
  const max: Vec3 = [
    Math.max(root[0], tip[0]) + pad,
    Math.max(root[1], tip[1]) + pad,
    Math.max(root[2], tip[2]) + pad,
  ];
  return { min, max };
}

export function buildSpeleothems(
  stations: Station[],
  params: GenParams,
  path: TrailPath,
  overrides: Overrides,
  seed: number,
): SpeleoBuild {
  const deleted = new Set(overrides.speleo.deleted);
  const replaced = new Map(overrides.speleo.replaced.map((r) => [r.id, r.seed]));
  const occupied = new Map<string, number>(); // 空间哈希格 → 上次占用的站号
  const gridKey = (p: Vec3) => `${Math.floor(p[0] / MIN_ROOT_SPACING)},${Math.floor(p[1] / MIN_ROOT_SPACING)},${Math.floor(p[2] / MIN_ROOT_SPACING)}`;

  const instances: SpeleoInstance[] = [];
  let rejectedByClearance = 0;

  for (let i = 1; i < stations.length - 1; i++) {
    const st = stations[i]!;
    for (let slot = 0; slot < SLOTS_PER_STATION; slot++) {
      const slotId = pairId(i, slot);
      const rng = substream(seed, Domain.SCATTER, slotId);
      const occupy = rng();
      // 占用概率：密度 0~1 映射到 0~0.8，落选即跳过，不重摇（确定性 + 密度单调）
      if (occupy >= params.dripDensity * 0.8) continue;

      const theta = range(rng, SLOT_THETA_MIN, SLOT_THETA_MAX);
      const root = ringPoint(st, theta, params, seed);
      const id = `sp-${slotId.toString(36)}`;
      if (deleted.has(id)) continue;

      const shapeRng = substream(seed, Domain.SHAPE, slotId);
      const tierIndex = tierFor(shapeRng());
      const tier = SPELEO_TIERS[tierIndex]!;
      const height = range(shapeRng, tier.heightMin, tier.heightMax);
      const radius = height * range(shapeRng, tier.radiusRatioMin, tier.radiusRatioMax);

      // 生长轴：以 down 为主，带轻微确定性倾斜
      const tilt = (shapeRng() - 0.5) * 0.18;
      const tiltDir = shapeRng() * Math.PI * 2;
      const down: Vec3 = [0, -1, 0];
      const axis = v3.normalize(
        v3.add(down, v3.scale(st.right, Math.cos(tiltDir) * tilt)).map((c, k) =>
          k === 2 ? c + Math.sin(tiltDir) * tilt : c,
        ) as Vec3,
      );

      // 净空检测：石尖与步道的水平距 / 竖向距
      const tip = v3.add(root, v3.scale(axis, height));
      const near = nearestOnTrail(path, tip);
      const horizLimit = path.width / 2 + SIDE_MARGIN;
      const invadesClearance =
        near.dist - Math.abs(tip[1] - near.point[1]) < horizLimit &&
        tip[1] < near.point[1] + TRAIL_CLEARANCE_M;
      if (invadesClearance) {
        rejectedByClearance++;
        continue;
      }

      // 间距复查：3×3×3 邻格
      const gx = Math.floor(root[0] / MIN_ROOT_SPACING);
      const gy = Math.floor(root[1] / MIN_ROOT_SPACING);
      const gz = Math.floor(root[2] / MIN_ROOT_SPACING);
      let tooClose = false;
      for (let dx = -1; dx <= 1 && !tooClose; dx++)
        for (let dy = -1; dy <= 1 && !tooClose; dy++)
          for (let dz = -1; dz <= 1 && !tooClose; dz++) {
            const k = `${gx + dx},${gy + dy},${gz + dz}`;
            if (occupied.has(k)) tooClose = true;
          }
      if (tooClose) continue;
      occupied.set(gridKey(root), i);

      // shapeSeed 仅驱动该实例的几何形态变体（渲染层 per-instance jitter），
      // 不参与布点/档位/尺寸决策，因此替换不影响其它实例也不改变本株结构参数。
      const shapeSeed = replaced.get(id) ?? seed;
      instances.push({
        id,
        tierIndex,
        root,
        axis,
        height,
        radius,
        shapeSeed,
        bbox: instanceBbox(root, axis, height, radius),
      });
    }
  }

  // 稳定排序：先按档位（渲染器按 tier 分段 drawIndexed），档内按 id 字典序，
  // 保证实例缓冲顺序与输入数组顺序解耦且可复现。
  instances.sort((a, b) =>
    a.tierIndex !== b.tierIndex ? a.tierIndex - b.tierIndex : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  return { instances, prototypes: buildPrototypes(seed), rejectedByClearance };
}
