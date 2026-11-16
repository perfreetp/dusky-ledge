// 模拟矿山测量数据：确定性 PRNG，两期数据可复现，总长约 12 万米
import type {
  DoorInfo,
  EquipmentInfo,
  EquipmentKind,
  MineDataset,
  PipelineInfo,
  Roadway,
  RoadwayPurpose,
  SectionParams,
  Vec3,
} from './types';

/** mulberry32 确定性随机数 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

const DISTRICTS = ['一采区', '二采区', '三采区', '四采区', '五采区', '六采区'];
const PURPOSES: RoadwayPurpose[] = ['haulage', 'return', 'intake', 'development', 'chamber'];
const SECTION_TEMPLATES: SectionParams[] = [
  { type: 'arch', width: 4.8, height: 3.6 },
  { type: 'arch', width: 5.4, height: 4.0 },
  { type: 'rect', width: 4.2, height: 3.2 },
  { type: 'rect', width: 5.0, height: 3.8 },
  { type: 'circle', width: 3.6, height: 3.6, radius: 1.8 },
];
const EQUIP_KINDS: EquipmentKind[] = ['绞车', '水泵', '变电站', '局部通风机', '皮带机头', '移变站'];

interface GenOptions {
  period: 1 | 2;
  seed: number;
  /** 目标总长度（米） */
  targetLength: number;
  /** 期 2 相对期 1 的改造配置 */
  mutate?: boolean;
}

/** 生成一条带走向变化的巷道中心线 */
function genCenterline(
  r: () => number,
  start: Vec3,
  len: number,
  heading: number,
  step: number,
): { points: Vec3[]; levelMin: number; levelMax: number } {
  const points: Vec3[] = [start];
  let x = start[0], y = start[1], z = start[2];
  let dir = heading;
  let grade = (r() - 0.5) * 0.04; // 坡度 ±2%
  const n = Math.max(2, Math.round(len / step));
  let levelMin = z, levelMax = z;
  for (let i = 1; i <= n; i++) {
    // 走向缓慢偏转，模拟实测巷道的弯曲
    dir += (r() - 0.5) * 0.12;
    grade += (r() - 0.5) * 0.008;
    grade = Math.max(-0.06, Math.min(0.06, grade));
    const ds = (len / n) * (0.9 + r() * 0.2);
    x += Math.cos(dir) * ds;
    y += Math.sin(dir) * ds;
    z += grade * ds;
    points.push([x, y, z]);
    levelMin = Math.min(levelMin, z);
    levelMax = Math.max(levelMax, z);
  }
  return { points, levelMin, levelMax };
}

function roadwayName(district: string, purpose: RoadwayPurpose, idx: number): string {
  const p = { haulage: '运输', return: '回风', intake: '进风', development: '掘进', chamber: '硐室' }[purpose];
  return `${district}${p}${String(idx + 1).padStart(2, '0')}巷`;
}

export function generateDataset(opts: GenOptions): MineDataset {
  const r = rng(opts.seed);
  const roadways: Roadway[] = [];
  const pipelines: PipelineInfo[] = [];
  const doors: DoorInfo[] = [];
  const equipment: EquipmentInfo[] = [];
  const boundsMin: Vec3 = [Infinity, Infinity, Infinity];
  const boundsMax: Vec3 = [-Infinity, -Infinity, -Infinity];

  let total = 0;
  let idx = 0;
  const baseLevel = -420; // 主水平标高

  const eat = (p: Vec3) => {
    for (let i = 0; i < 3; i++) {
      boundsMin[i] = Math.min(boundsMin[i], p[i]);
      boundsMax[i] = Math.max(boundsMax[i], p[i]);
    }
  };

  while (total < opts.targetLength) {
    const district = pick(r, DISTRICTS);
    const purpose = pick(r, PURPOSES);
    const section = { ...pick(r, SECTION_TEMPLATES) };
    if (section.type === 'arch') section.radius = section.width / 2;
    const len = purpose === 'chamber' ? 40 + r() * 80 : 600 + r() * 2600;
    const start: Vec3 = [
      (r() - 0.5) * 5200,
      (r() - 0.5) * 4200,
      baseLevel + (r() - 0.5) * 260,
    ];
    const heading = r() * Math.PI * 2;
    const step = 24 + r() * 10; // 测量点间距 24~34m
    const { points, levelMin, levelMax } = genCenterline(r, start, len, heading, step);
    points.forEach(eat);
    const id = `rw-${opts.period}-${String(idx).padStart(4, '0')}`;
    const rw: Roadway = {
      id,
      name: roadwayName(district, purpose, idx),
      district,
      purpose,
      section,
      levelMin: Math.round(levelMin * 10) / 10,
      levelMax: Math.round(levelMax * 10) / 10,
      length: Math.round(len),
      centerline: points,
      period: opts.period,
      diffStatus: 'common',
      supportSpacing: 0.8 + Math.round(r() * 6) / 10,
      buildYear: 2018 + Math.floor(r() * 8),
    };
    roadways.push(rw);
    total += len;
    idx++;

    // —— 沿线设施 ——
    // 管线：每条主巷 1~3 条
    if (purpose !== 'chamber') {
      const nPipe = 1 + Math.floor(r() * 3);
      for (let k = 0; k < nPipe; k++) {
        pipelines.push({
          id: `pl-${id}-${k}`,
          roadwayId: id,
          kind: (['water', 'air', 'gas', 'power'] as const)[Math.floor(r() * 4)],
          radius: 0.06 + r() * 0.12,
          offset: (r() - 0.5) * section.width * 0.7,
          height: section.height * (0.55 + r() * 0.35),
        });
      }
    }
    // 风门：回风/进风巷偶发
    if ((purpose === 'return' || purpose === 'intake') && r() < 0.55) {
      const pi = 1 + Math.floor(r() * (points.length - 2));
      doors.push({
        id: `dr-${id}`,
        roadwayId: id,
        position: [...points[pi]] as Vec3,
        kind: pick(r, ['风门', '风门', '风墙', '调节风窗'] as const),
        size: [section.width * 0.9, section.height * 0.95],
      });
    }
    // 机电设备：硐室必放，主巷偶发
    const eqCount = purpose === 'chamber' ? 1 + Math.floor(r() * 3) : r() < 0.3 ? 1 : 0;
    for (let k = 0; k < eqCount; k++) {
      const pi = Math.floor(r() * points.length);
      const kind = pick(r, EQUIP_KINDS);
      equipment.push({
        id: `eq-${id}-${k}`,
        roadwayId: id,
        position: [...points[pi]] as Vec3,
        kind,
        size: [1.2 + r() * 2.4, 1.0 + r() * 1.6, 1.0 + r() * 1.2],
        power: Math.round((15 + r() * 480) / 5) * 5,
      });
    }
  }

  return {
    period: opts.period,
    label: opts.period === 1 ? '一期（2025-06 测量）' : '二期（2026-06 测量）',
    roadways,
    pipelines,
    doors,
    equipment,
    totalLength: Math.round(total),
    bounds: { min: boundsMin, max: boundsMax },
  };
}

/**
 * 基于一期生成二期：部分巷道几何改造（geometry）、新增、废弃，其余保持不变。
 * 用同名配对，保证两期对比能展示 added/removed/geometry/meta 四类差异。
 */
export function generatePeriod2(period1: MineDataset): MineDataset {
  const r = rng(0xc0ffee);
  const roadways: Roadway[] = [];
  const pipelines: PipelineInfo[] = [];
  const doors: DoorInfo[] = [];
  const equipment: EquipmentInfo[] = [];
  const boundsMin: Vec3 = [Infinity, Infinity, Infinity];
  const boundsMax: Vec3 = [-Infinity, -Infinity, -Infinity];
  const eat = (p: Vec3) => {
    for (let i = 0; i < 3; i++) {
      boundsMin[i] = Math.min(boundsMin[i], p[i]);
      boundsMax[i] = Math.max(boundsMax[i], p[i]);
    }
  };

  let total = 0;
  const kept = new Set<string>();

  for (const rw1 of period1.roadways) {
    const roll = r();
    if (roll < 0.12) {
      // 废弃：二期不再出现，一期副本标记 abandoned 仅用于对比着色
      const ghost: Roadway = { ...rw1, period: 2, diffStatus: 'abandoned' };
      // ghost 不进二期 roadways（已废弃），但保留在 period1 数据集标记由 diff 阶段处理
      continue;
    }
    if (roll < 0.30) {
      // 几何改造：中心线整体下沉/平移并局部延伸
      const dz = 2 + r() * 6;
      const dx = (r() - 0.5) * 6;
      const points: Vec3[] = rw1.centerline.map((p, i) => {
        const np: Vec3 = [p[0] + dx * (i / rw1.centerline.length), p[1], p[2] - dz];
        eat(np);
        return np;
      });
      // 尾部延伸一段
      const last = points[points.length - 1];
      const ext = genCenterline(r, last, 200 + r() * 400, r() * Math.PI * 2, 30);
      ext.points.slice(1).forEach((p) => { eat(p); points.push(p); });
      const rw2: Roadway = {
        ...rw1,
        period: 2,
        centerline: points,
        length: rw1.length + Math.round(200 + r() * 400),
        levelMin: Math.min(rw1.levelMin - dz, ext.levelMin),
        levelMax: Math.max(rw1.levelMax - dz, ext.levelMax),
        diffStatus: 'common',
      };
      roadways.push(rw2);
      kept.add(rw1.id);
      total += rw2.length;
    } else {
      const rw2: Roadway = { ...rw1, period: 2, diffStatus: 'common' };
      roadways.push(rw2);
      kept.add(rw1.id);
      total += rw2.length;
      rw2.centerline.forEach(eat);
    }
  }

  // 新增巷道
  const addCount = Math.max(6, Math.round(period1.roadways.length * 0.08));
  for (let i = 0; i < addCount; i++) {
    const district = pick(r, DISTRICTS);
    const purpose = pick(r, PURPOSES);
    const section = { ...pick(r, SECTION_TEMPLATES) };
    if (section.type === 'arch') section.radius = section.width / 2;
    const len = 700 + r() * 2000;
    const start: Vec3 = [(r() - 0.5) * 5200, (r() - 0.5) * 4200, -420 + (r() - 0.5) * 260];
    const { points, levelMin, levelMax } = genCenterline(r, start, len, r() * Math.PI * 2, 28);
    points.forEach(eat);
    const id = `rw-2-new-${String(i).padStart(3, '0')}`;
    roadways.push({
      id,
      name: `${district}新增${String(i + 1).padStart(2, '0')}巷`,
      district,
      purpose,
      section,
      levelMin: Math.round(levelMin * 10) / 10,
      levelMax: Math.round(levelMax * 10) / 10,
      length: Math.round(len),
      centerline: points,
      period: 2,
      diffStatus: 'new',
      supportSpacing: 0.8 + Math.round(r() * 6) / 10,
      buildYear: 2026,
    });
    total += len;
    pipelines.push({
      id: `pl-${id}-0`,
      roadwayId: id,
      kind: 'power',
      radius: 0.1,
      offset: 1.2,
      height: section.height * 0.8,
    });
    equipment.push({
      id: `eq-${id}-0`,
      roadwayId: id,
      position: [...points[Math.floor(points.length / 2)]] as Vec3,
      kind: '局部通风机',
      size: [2.4, 1.4, 1.5],
      power: 55,
    });
  }

  // 沿二期巷道重新生成附属设施（保留期 1 中属于 kept 巷道的，再给新增的补齐）
  for (const p of period1.pipelines) if (kept.has(p.roadwayId)) pipelines.push({ ...p });
  for (const d of period1.doors) if (kept.has(d.roadwayId)) doors.push({ ...d });
  for (const e of period1.equipment) if (kept.has(e.roadwayId)) equipment.push({ ...e });

  return {
    period: 2,
    label: '二期（2026-06 测量）',
    roadways,
    pipelines,
    doors,
    equipment,
    totalLength: Math.round(total),
    bounds: { min: boundsMin, max: boundsMax },
  };
}
