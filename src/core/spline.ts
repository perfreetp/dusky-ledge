/**
 * Catmull-Rom 样条、弧长等距重采样、平行传输标架（Parallel Transport Frame）。
 * 平行传输避免 Frenet 标架在平缓段翻转，是扫掠网格稳定的关键。
 */
import type { Station } from './geometry';
import { quat, v3 } from './vec';
import type { Vec3 } from './geometry';
import type { ControlPoint } from '../types';
import { Domain, substream } from './rng';

/** 非均匀 Catmull-Rom 插值（相邻点间距作为参数间隔）。 */
function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const a = v3.scale(p0, -0.5);
  const b = v3.scale(p1, 1.5);
  const c = v3.scale(p2, -1.5);
  const d = v3.scale(p3, 0.5);
  return [
    t3 * (a[0] + b[0] + c[0] + d[0]) +
      t2 * (p0[0] - 2.5 * p1[0] + 2 * p2[0] - 0.5 * p3[0]) +
      t * (-0.5 * p0[0] + 0.5 * p2[0]) +
      p1[0],
    t3 * (a[1] + b[1] + c[1] + d[1]) +
      t2 * (p1[1] - 2.5 * p1[1] + 2 * p2[1] - 0.5 * p3[1]) +
      t * (-0.5 * p0[1] + 0.5 * p2[1]) +
      p1[1],
    t3 * (a[2] + b[2] + c[2] + d[2]) +
      t2 * (p0[2] - 2.5 * p1[2] + 2 * p2[2] - 0.5 * p3[2]) +
      t * (-0.5 * p0[2] + 0.5 * p2[2]) +
      p1[2],
  ];
}

/** 密采样整条样条（端点用幻影点钳位）。 */
export function sampleSpline(control: ControlPoint[], samplesPerSpan = 24): Vec3[] {
  if (control.length < 2) return control.map((p) => [p.x, p.y, p.z] as Vec3);
  const pts: Vec3[] = control.map((p) => [p.x, p.y, p.z]);
  const out: Vec3[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    for (let j = 0; j < samplesPerSpan; j++) {
      out.push(catmullRom(p0, p1, p2, p3, j / samplesPerSpan));
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** 按累计弧长等距重采样，step 为目标站间距。返回点与累计长度表。 */
export function resampleByArcLength(dense: Vec3[], step: number): { points: Vec3[]; lengths: number[] } {
  if (dense.length < 2) return { points: dense, lengths: [0] };
  const segLen: number[] = [];
  let total = 0;
  for (let i = 1; i < dense.length; i++) {
    const l = v3.dist(dense[i - 1]!, dense[i]!);
    segLen.push(l);
    total += l;
  }
  const targetCount = Math.max(2, Math.round(total / step) + 1);
  const points: Vec3[] = [];
  const lengths: number[] = [];
  let seg = 0;
  let segStart = 0;
  for (let k = 0; k < targetCount; k++) {
    const target = (total * k) / (targetCount - 1);
    while (seg < segLen.length - 1 && segStart + segLen[seg]! < target) {
      segStart += segLen[seg]!;
      seg++;
    }
    const l = segLen[seg] || 1e-9;
    const t = (target - segStart) / l;
    points.push(v3.lerp(dense[seg]!, dense[seg + 1]!, t));
    lengths.push(target);
  }
  return { points, lengths };
}

/** 中心线确定性微扰（走向域独立种子，只影响中心线，不影响洞壁噪声）。 */
function jitterPoints(points: Vec3[], seed: number): Vec3[] {
  return points.map((p, i) => {
    const rng = substream(seed, Domain.CENTERLINE, i * 131 + 7);
    // 微扰幅度 0.15m，端点保持不动
    if (i === 0 || i === points.length - 1) return p;
    const amp = 0.15;
    return [p[0] + (rng() - 0.5) * amp, p[1] + (rng() - 0.5) * amp * 0.5, p[2] + (rng() - 0.5) * amp];
  });
}

/**
 * 生成平行传输标架站序列。
 * floorY 占位由 tunnel 阶段按实际断面压平高度回填。
 */
export function buildStations(control: ControlPoint[], step: number, seed: number): Station[] {
  const dense = sampleSpline(control);
  const { points, lengths } = resampleByArcLength(dense, step);
  const jittered = jitterPoints(points, seed);

  const tangents: Vec3[] = [];
  for (let i = 0; i < jittered.length; i++) {
    const a = jittered[Math.max(0, i - 1)]!;
    const b = jittered[Math.min(jittered.length - 1, i + 1)]!;
    tangents.push(v3.normalize(v3.sub(b, a)));
  }

  // 初始 right：取与首切向正交的水平向量
  const t0 = tangents[0]!;
  let right = v3.normalize(v3.cross([0, 1, 0], t0));
  if (v3.len(right) < 1e-6) right = [1, 0, 0];

  const stations: Station[] = [];
  for (let i = 0; i < jittered.length; i++) {
    if (i > 0) {
      // 把上一时刻切向旋转到当前切向，right 跟随平行传输
      const q = quat.fromUnitVectors(tangents[i - 1]!, tangents[i]!);
      right = v3.normalize(quat.rotate(q, right));
    }
    const up = v3.normalize(v3.cross(tangents[i]!, right));
    // 重新正交化 right，消除累积误差
    const rOrtho = v3.normalize(v3.cross(up, tangents[i]!));
    stations.push({
      center: jittered[i]!,
      tangent: tangents[i]!,
      right: rOrtho,
      up,
      floorY: jittered[i]![1],
      length: lengths[i]!,
    });
  }
  return stations;
}
