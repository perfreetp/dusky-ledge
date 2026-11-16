/**
 * 步道：沿洞底自动布线，叠加手动 override（按归一化弧长锚点存储）。
 * override 只改变锚点邻域的线位，影响窗外保持自动线形；
 * 参数微调重生成时，override 数据不丢失（由上层持久化保证）。
 */
import type { Overrides, TrailOverride } from '../types';
import type { Mesh, Station, TrailPath, Vec3 } from './geometry';
import { Domain, substream } from './rng';
import { v3 } from './vec';
import { makeMesh } from './meshUtils';

/** 自动线位：洞底之上 0.06m，叠加低幅确定性蜿蜒（自然步道不走死直线）。 */
function autoPoint(st: Station, index: number, seed: number): Vec3 {
  const rng = substream(seed, Domain.TRAIL, index * 97 + 13);
  const meander = Math.sin(st.length * 0.35) * 0.35 + (rng() - 0.5) * 0.15;
  const p = v3.add(st.center, v3.scale(st.right, meander));
  p[1] = st.floorY + 0.06;
  return p;
}

/** Catmull-Rom 一维插值，用于 override 偏移沿里程平滑。 */
function smoothOffset(anchors: TrailOverride[], s: number): { lateral: number; up: number } {
  if (anchors.length === 0) return { lateral: 0, up: 0 };
  if (s <= anchors[0]!.s) {
    const a = anchors[0]!;
    return { lateral: a.lateral, up: a.up };
  }
  const last = anchors[anchors.length - 1]!;
  if (s >= last.s) return { lateral: last.lateral, up: last.up };
  let i = 0;
  while (anchors[i + 1]!.s < s) i++;
  const p0 = anchors[Math.max(0, i - 1)]!;
  const p1 = anchors[i]!;
  const p2 = anchors[i + 1]!;
  const p3 = anchors[Math.min(anchors.length - 1, i + 2)]!;
  const span = p2.s - p1.s || 1e-9;
  const t = (s - p1.s) / span;
  const t2 = t * t;
  const t3 = t2 * t;
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { lateral: cr(p0.lateral, p1.lateral, p2.lateral, p3.lateral), up: cr(p0.up, p1.up, p2.up, p3.up) };
}

export function buildTrailPath(stations: Station[], overrides: Overrides, seed: number, width: number): TrailPath {
  const anchors = [...overrides.trail].sort((a, b) => a.s - b.s);
  const total = stations[stations.length - 1]!.length || 1;
  const points: Vec3[] = stations.map((st, i) => {
    const s = st.length / total;
    const base = autoPoint(st, i, seed);
    const off = smoothOffset(anchors, s);
    const p = v3.add(base, v3.scale(st.right, off.lateral));
    p[1] += off.up;
    return p;
  });
  return { points, sValues: stations.map((st) => st.length / total), width };
}

/** 中心线 → 带状 Mesh（左右各半宽，用站 right 定向，末端封口）。 */
export function buildTrailMesh(path: TrailPath, stations: Station[]): Mesh {
  const half = path.width / 2;
  const positions: number[] = [];
  const indices: number[] = [];
  path.points.forEach((p, i) => {
    const r = stations[i]!.right;
    const left = v3.add(p, v3.scale(r, half));
    const right = v3.sub(p, v3.scale(r, half));
    positions.push(left[0], left[1], left[2], right[0], right[1], right[2]);
  });
  for (let i = 0; i < path.points.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return makeMesh(new Float32Array(positions), new Uint32Array(indices), [0, 1, 0]);
}

/** 步道最近点查询（按归一化里程的单调表二分），供净空检测与拾取使用。 */
export function nearestOnTrail(path: TrailPath, p: Vec3): { point: Vec3; s: number; dist: number } {
  let best = Infinity;
  let bestPoint = path.points[0]!;
  let bestS = path.sValues[0]!;
  for (let i = 0; i < path.points.length; i++) {
    const d = v3.dist(path.points[i]!, p);
    if (d < best) {
      best = d;
      bestPoint = path.points[i]!;
      bestS = path.sValues[i]!;
    }
  }
  return { point: bestPoint, s: bestS, dist: best };
}
