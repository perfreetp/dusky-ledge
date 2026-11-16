// 几何构建：中心线 + 断面参数 → 体块/支护/管线/风门/设备五类网格
// 所有网格带 roadwayId 顶点属性与分段（AABB + 索引范围）表，供视锥裁剪与 LOD
import type {
  DoorInfo,
  EquipmentInfo,
  MineDataset,
  PipelineInfo,
  Roadway,
  SectionParams,
  Vec3,
} from './types';
import { v3Cross, v3Normalize, v3Sub } from './math';

export type PrimitiveKind = 'tri' | 'line';
export type LodMode = 'all' | 'nearOnly' | 'farOnly';

export interface CullSegment {
  rwId: number;
  min: Vec3;
  max: Vec3;
  /** 在静态索引数组中的起止 */
  indexStart: number;
  indexCount: number;
}

export interface RenderMesh {
  layer: string;
  primitive: PrimitiveKind;
  lodMode: LodMode;
  lodDistance: number;
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  rwIds: Uint32Array;
  indices: Uint32Array;
  segments: CullSegment[];
}

class GeoBuilder {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  rw: number[] = [];
  idx: number[] = [];
  segments: CullSegment[] = [];

  vertex(p: Vec3, n: Vec3, color: [number, number, number], rwId: number): number {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.col.push(color[0], color[1], color[2]);
    this.rw.push(rwId);
    return this.pos.length / 3 - 1;
  }

  beginSegment(rwId: number): { start: number; min: Vec3; max: Vec3 } {
    return {
      start: this.idx.length,
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
    };
  }

  endSegment(rwId: number, s: { start: number; min: Vec3; max: Vec3 }) {
    this.segments.push({
      rwId,
      min: s.min,
      max: s.max,
      indexStart: s.start,
      indexCount: this.idx.length - s.start,
    });
  }

  growBox(s: { min: Vec3; max: Vec3 }, p: Vec3) {
    for (let i = 0; i < 3; i++) {
      s.min[i] = Math.min(s.min[i], p[i]);
      s.max[i] = Math.max(s.max[i], p[i]);
    }
  }

  build(layer: string, primitive: PrimitiveKind, lodMode: LodMode, lodDistance: number): RenderMesh {
    return {
      layer,
      primitive,
      lodMode,
      lodDistance,
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nor),
      colors: new Float32Array(this.col),
      rwIds: new Uint32Array(this.rw),
      indices: new Uint32Array(this.idx),
      segments: this.segments,
    };
  }
}

/** 断面轮廓：返回环上各点的 [side 分量, up 分量, 法线 side, 法线 up] */
function sectionProfile(sec: SectionParams): { pts: [number, number][]; nrm: [number, number][] } {
  const w = sec.width, h = sec.height;
  const pts: [number, number][] = [];
  const nrm: [number, number][] = [];
  if (sec.type === 'rect') {
    pts.push([-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]);
    nrm.push([0, -1], [1, 0], [0, 1], [-1, 0]);
  } else if (sec.type === 'circle') {
    const r = sec.radius ?? w / 2;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([Math.cos(a) * r, h / 2 + Math.sin(a) * r]);
      nrm.push([Math.cos(a), Math.sin(a)]);
    }
  } else {
    // 直墙半圆拱
    const r = sec.radius ?? w / 2;
    const spring = h - r; // 起拱线
    pts.push([-w / 2, 0], [w / 2, 0], [w / 2, spring]);
    nrm.push([0, -1], [1, 0], [1, 0]);
    const arcN = 8;
    for (let i = 1; i <= arcN; i++) {
      const a = (i / arcN) * Math.PI;
      pts.push([Math.cos(a) * r, spring + Math.sin(a) * r]);
      nrm.push([Math.cos(a), Math.sin(a)]);
    }
    pts.push([-w / 2, spring]);
    nrm.push([-1, 0]);
  }
  return { pts, nrm };
}

/** 中心线各点的局部标架（切线 T、侧向 S、上向 U） */
function frames(points: Vec3[]): { t: Vec3; s: Vec3; u: Vec3 }[] {
  const out: { t: Vec3; s: Vec3; u: Vec3 }[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const t = v3Normalize(v3Sub(b, a));
    const upRef: Vec3 = Math.abs(t[2]) > 0.92 ? [1, 0, 0] : [0, 0, 1];
    const s = v3Normalize(v3Cross(upRef, t));
    const u = v3Cross(t, s);
    out.push({ t, s, u });
  }
  return out;
}

const RW_COLOR: [number, number, number] = [0.56, 0.64, 0.75];
const SUPPORT_COLOR: [number, number, number] = [0.85, 0.64, 0.25];
const DOOR_COLOR: [number, number, number] = [1.0, 0.48, 0.35];
const PIPE_COLORS: Record<PipelineInfo['kind'], [number, number, number]> = {
  water: [0.3, 0.75, 0.95],
  air: [0.55, 0.85, 0.55],
  gas: [0.95, 0.7, 0.35],
  power: [0.8, 0.6, 0.95],
};
const EQUIP_COLOR: [number, number, number] = [0.61, 0.8, 0.4];

function buildRoadwayMesh(ds: MineDataset, rwIndex: Map<string, number>): RenderMesh {
  const gb = new GeoBuilder();
  for (const rw of ds.roadways) {
    const rwId = rwIndex.get(rw.id)!;
    const { pts, nrm } = sectionProfile(rw.section);
    const fr = frames(rw.centerline);
    const ringCount = pts.length;
    const seg = gb.beginSegment(rwId);

    // 环顶点
    for (let i = 0; i < rw.centerline.length; i++) {
      const c = rw.centerline[i];
      for (let k = 0; k < ringCount; k++) {
        const p: Vec3 = [
          c[0] + fr[i].s[0] * pts[k][0] + fr[i].u[0] * pts[k][1],
          c[1] + fr[i].s[1] * pts[k][0] + fr[i].u[1] * pts[k][1],
          c[2] + fr[i].s[2] * pts[k][0] + fr[i].u[2] * pts[k][1],
        ];
        const n = v3Normalize([
          fr[i].s[0] * nrm[k][0] + fr[i].u[0] * nrm[k][1],
          fr[i].s[1] * nrm[k][0] + fr[i].u[1] * nrm[k][1],
          fr[i].s[2] * nrm[k][0] + fr[i].u[2] * nrm[k][1],
        ]);
        gb.growBox(seg, p);
        gb.vertex(p, n, RW_COLOR, rwId);
      }
    }
    // 环间四边形
    for (let i = 0; i < rw.centerline.length - 1; i++) {
      for (let k = 0; k < ringCount; k++) {
        const a = i * ringCount + k;
        const b = i * ringCount + (k + 1) % ringCount;
        const c = (i + 1) * ringCount + (k + 1) % ringCount;
        const d = (i + 1) * ringCount + k;
        gb.idx.push(a, b, c, a, c, d);
      }
    }
    // 两端封口（扇形）
    const cap = (ringBase: number, center: Vec3, flip: boolean) => {
      const ci = gb.vertex(center, [0, 0, flip ? -1 : 1], RW_COLOR, rwId);
      for (let k = 0; k < ringCount; k++) {
        const a = ringBase + k;
        const b = ringBase + (k + 1) % ringCount;
        if (flip) gb.idx.push(ci, b, a);
        else gb.idx.push(ci, a, b);
      }
    };
    cap(0, rw.centerline[0], true);
    cap((rw.centerline.length - 1) * ringCount, rw.centerline[rw.centerline.length - 1], false);
    gb.endSegment(rwId, seg);
  }
  return gb.build('roadway', 'tri', 'all', 0);
}

/** 支护：高 LOD = 拱架线环 + 径向锚杆/螺栓；低 LOD = 每 5 架一根简化中线标记 */
function buildSupportMeshes(ds: MineDataset, rwIndex: Map<string, number>): RenderMesh[] {
  const hi = new GeoBuilder();
  const lo = new GeoBuilder();
  const { pts } = sectionProfile({ type: 'arch', width: 1, height: 1, radius: 0.5 }); // 占位，实际按巷道断面
  void pts;

  for (const rw of ds.roadways) {
    const rwId = rwIndex.get(rw.id)!;
    const profile = sectionProfile(rw.section);
    const fr = frames(rw.centerline);
    // 沿中心线按间距布站
    let acc = 0;
    const stations: { pointIdx: number; t: number; p: Vec3 }[] = [];
    for (let i = 0; i < rw.centerline.length - 1; i++) {
      const a = rw.centerline[i], b = rw.centerline[i + 1];
      const span = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      let d = rw.supportSpacing - acc;
      while (d <= span) {
        const t = d / span;
        stations.push({
          pointIdx: i,
          t,
          p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
        });
        d += rw.supportSpacing;
      }
      acc = span - (d - rw.supportSpacing);
    }

    // 高 LOD：完整拱架 + 锚杆，每站一个裁剪段（段内对象少，合段开销低，这里整巷一段）
    const segH = hi.beginSegment(rwId);
    const segL = lo.beginSegment(rwId);
    stations.forEach((st, si) => {
      const f = fr[st.pointIdx];
      const ring: number[] = [];
      for (const q of profile.pts) {
        const p: Vec3 = [
          st.p[0] + f.s[0] * q[0] + f.u[0] * q[1],
          st.p[1] + f.s[1] * q[0] + f.u[1] * q[1],
          st.p[2] + f.s[2] * q[0] + f.u[2] * q[1],
        ];
        hi.growBox(segH, p);
        ring.push(hi.vertex(p, f.t, SUPPORT_COLOR, rwId));
      }
      for (let k = 0; k < ring.length; k++) hi.idx.push(ring[k], ring[(k + 1) % ring.length]);

      // 锚杆/螺栓：拱部径向短线（高 LOD 专属）
      const boltCount = rw.section.type === 'rect' ? 4 : 6;
      for (let b = 0; b < boltCount; b++) {
        const q = profile.pts[Math.floor((b + 1) * (profile.pts.length / (boltCount + 1)))];
        const n = v3Normalize([f.s[0] * q[0] + f.u[0] * q[1], f.s[1] * q[0] + f.u[1] * q[1], f.s[2] * q[0] + f.u[2] * q[1]]);
        const p0: Vec3 = [
          st.p[0] + f.s[0] * q[0] + f.u[0] * q[1],
          st.p[1] + f.s[1] * q[0] + f.u[1] * q[1],
          st.p[2] + f.s[2] * q[0] + f.u[2] * q[1],
        ];
        const p1: Vec3 = [p0[0] + n[0] * 1.6, p0[1] + n[1] * 1.6, p0[2] + n[2] * 1.6];
        hi.growBox(segH, p1);
        const i0 = hi.vertex(p0, n, SUPPORT_COLOR, rwId);
        const i1 = hi.vertex(p1, n, [1, 0.85, 0.5], rwId);
        hi.idx.push(i0, i1);
      }

      // 低 LOD：每 5 架仅保留顶部一根短标记线
      if (si % 5 === 0) {
        const q = profile.pts[Math.floor(profile.pts.length * 0.7)];
        const p0: Vec3 = [
          st.p[0] + f.s[0] * q[0] + f.u[0] * q[1],
          st.p[1] + f.s[1] * q[0] + f.u[1] * q[1],
          st.p[2] + f.s[2] * q[0] + f.u[2] * q[1],
        ];
        const p1: Vec3 = [p0[0], p0[1], p0[2] + 0.8];
        lo.growBox(segL, p0);
        lo.growBox(segL, p1);
        const i0 = lo.vertex(p0, [0, 0, 1], SUPPORT_COLOR, rwId);
        const i1 = lo.vertex(p1, [0, 0, 1], [1, 0.85, 0.5], rwId);
        lo.idx.push(i0, i1);
      }
    });
    // 低模 AABB 复用巷道中心线范围
    for (const p of rw.centerline) {
      lo.growBox(segL, p);
      hi.growBox(segH, p);
    }
    hi.endSegment(rwId, segH);
    lo.endSegment(rwId, segL);
  }
  return [
    hi.build('support', 'line', 'nearOnly', 420),
    lo.build('support', 'line', 'farOnly', 420),
  ];
}

function buildPipelineMesh(ds: MineDataset, rwIndex: Map<string, number>): RenderMesh {
  const gb = new GeoBuilder();
  const byRoad = new Map<string, PipelineInfo[]>();
  for (const p of ds.pipelines) {
    if (!byRoad.has(p.roadwayId)) byRoad.set(p.roadwayId, []);
    byRoad.get(p.roadwayId)!.push(p);
  }
  for (const rw of ds.roadways) {
    const pipes = byRoad.get(rw.id);
    if (!pipes) continue;
    const rwId = rwIndex.get(rw.id)!;
    const fr = frames(rw.centerline);
    const seg = gb.beginSegment(rwId);
    for (const pipe of pipes) {
      const color = PIPE_COLORS[pipe.kind];
      const n = 6;
      const ringBase: number[][] = [];
      for (let i = 0; i < rw.centerline.length; i++) {
        const c = rw.centerline[i];
        const cx = c[0] + fr[i].s[0] * pipe.offset + fr[i].u[0] * pipe.height;
        const cy = c[1] + fr[i].s[1] * pipe.offset + fr[i].u[1] * pipe.height;
        const cz = c[2] + fr[i].s[2] * pipe.offset + fr[i].u[2] * pipe.height;
        const ring: number[] = [];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const dx = fr[i].s[0] * Math.cos(a) + fr[i].u[0] * Math.sin(a);
          const dy = fr[i].s[1] * Math.cos(a) + fr[i].u[1] * Math.sin(a);
          const dz = fr[i].s[2] * Math.cos(a) + fr[i].u[2] * Math.sin(a);
          const p: Vec3 = [cx + dx * pipe.radius, cy + dy * pipe.radius, cz + dz * pipe.radius];
          gb.growBox(seg, p);
          ring.push(gb.vertex(p, v3Normalize([dx, dy, dz]), color, rwId));
        }
        ringBase.push(ring);
      }
      for (let i = 0; i < ringBase.length - 1; i++) {
        for (let k = 0; k < n; k++) {
          const a = ringBase[i][k], b = ringBase[i][(k + 1) % n];
          const c = ringBase[i + 1][(k + 1) % n], d = ringBase[i + 1][k];
          gb.idx.push(a, b, c, a, c, d);
        }
      }
    }
    gb.endSegment(rwId, seg);
  }
  return gb.build('pipeline', 'tri', 'all', 0);
}

function addBox(
  gb: GeoBuilder,
  center: Vec3,
  sx: number, sy: number, sz: number,
  s: Vec3, u: Vec3, t: Vec3,
  color: [number, number, number],
  rwId: number,
  seg: { min: Vec3; max: Vec3 },
) {
  const base = gb.pos.length / 3;
  const corners: [number, number, number][] = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];
  for (const [cx, cy, cz] of corners) {
    const p: Vec3 = [
      center[0] + s[0] * cx * sx / 2 + u[0] * cz * sz / 2 + t[0] * cy * sy / 2,
      center[1] + s[1] * cx * sx / 2 + u[1] * cz * sz / 2 + t[1] * cy * sy / 2,
      center[2] + s[2] * cx * sx / 2 + u[2] * cz * sz / 2 + t[2] * cy * sy / 2,
    ];
    gb.growBox(seg, p);
    gb.vertex(p, [0, 0, 1], color, rwId);
  }
  const faces = [
    [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4],
    [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4],
  ];
  for (const f of faces) gb.idx.push(base + f[0], base + f[1], base + f[2], base + f[0], base + f[2], base + f[3]);
}

function buildDoorMesh(ds: MineDataset, rwIndex: Map<string, number>): RenderMesh {
  const gb = new GeoBuilder();
  const rwMap = new Map(ds.roadways.map((r) => [r.id, r]));
  const byRoad = new Map<string, DoorInfo[]>();
  for (const d of ds.doors) {
    if (!byRoad.has(d.roadwayId)) byRoad.set(d.roadwayId, []);
    byRoad.get(d.roadwayId)!.push(d);
  }
  for (const [rwIdStr, list] of byRoad) {
    const rw = rwMap.get(rwIdStr)!;
    const rwId = rwIndex.get(rwIdStr)!;
    const fr = frames(rw.centerline);
    const seg = gb.beginSegment(rwId);
    for (const door of list) {
      // 找最近中心线点的标架
      let best = 0, bd = Infinity;
      rw.centerline.forEach((p, i) => {
        const d = (p[0] - door.position[0]) ** 2 + (p[1] - door.position[1]) ** 2 + (p[2] - door.position[2]) ** 2;
        if (d < bd) { bd = d; best = i; }
      });
      const f = fr[best];
      const c = rw.centerline[best];
      const center: Vec3 = [c[0], c[1], c[2] + door.size[1] / 2];
      addBox(gb, center, door.size[0], 0.18, door.size[1], f.s, f.u, f.t, DOOR_COLOR, rwId, seg);
    }
    gb.endSegment(rwId, seg);
  }
  return gb.build('door', 'tri', 'all', 0);
}

function buildEquipmentMesh(ds: MineDataset, rwIndex: Map<string, number>): RenderMesh {
  const gb = new GeoBuilder();
  const rwMap = new Map(ds.roadways.map((r) => [r.id, r]));
  const byRoad = new Map<string, EquipmentInfo[]>();
  for (const e of ds.equipment) {
    if (!byRoad.has(e.roadwayId)) byRoad.set(e.roadwayId, []);
    byRoad.get(e.roadwayId)!.push(e);
  }
  for (const [rwIdStr, list] of byRoad) {
    const rw = rwMap.get(rwIdStr)!;
    const rwId = rwIndex.get(rwIdStr)!;
    const fr = frames(rw.centerline);
    const seg = gb.beginSegment(rwId);
    for (const eq of list) {
      let best = 0, bd = Infinity;
      rw.centerline.forEach((p, i) => {
        const d = (p[0] - eq.position[0]) ** 2 + (p[1] - eq.position[1]) ** 2 + (p[2] - eq.position[2]) ** 2;
        if (d < bd) { bd = d; best = i; }
      });
      const f = fr[best];
      const c = rw.centerline[best];
      const center: Vec3 = [c[0], c[1], c[2] + eq.size[2] / 2 + 0.2];
      addBox(gb, center, eq.size[0], eq.size[1], eq.size[2], f.s, f.u, f.t, EQUIP_COLOR, rwId, seg);
      // 顶部电机盒
      addBox(
        gb,
        [center[0], center[1], center[2] + eq.size[2] / 2 + 0.35],
        eq.size[0] * 0.5, eq.size[1] * 0.6, 0.5,
        f.s, f.u, f.t,
        [0.45, 0.6, 0.32], rwId, seg,
      );
    }
    gb.endSegment(rwId, seg);
  }
  return gb.build('equipment', 'tri', 'all', 0);
}

export interface SceneMeshes {
  byLayer: Record<string, RenderMesh[]>;
  rwIndex: Map<string, number>;
  rwList: Roadway[];
  /** 每条巷道的合并 AABB（拾取/检索用） */
  rwAABB: { min: Vec3; max: Vec3; center: Vec3 }[];
}

export function buildScene(ds: MineDataset): SceneMeshes {
  const rwIndex = new Map<string, number>();
  ds.roadways.forEach((r, i) => rwIndex.set(r.id, i));
  const byLayer: Record<string, RenderMesh[]> = {
    roadway: [buildRoadwayMesh(ds, rwIndex)],
    support: buildSupportMeshes(ds, rwIndex),
    pipeline: [buildPipelineMesh(ds, rwIndex)],
    door: [buildDoorMesh(ds, rwIndex)],
    equipment: [buildEquipmentMesh(ds, rwIndex)],
  };
  const rwAABB = ds.roadways.map((rw) => {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    const pad = Math.max(rw.section.width, rw.section.height);
    for (const p of rw.centerline) {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p[i] - pad);
        max[i] = Math.max(max[i], p[i] + pad);
      }
    }
    return {
      min,
      max,
      center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] as Vec3,
    };
  });
  return { byLayer, rwIndex, rwList: ds.roadways, rwAABB };
}
