/**
 * 洞体扫掠网格：沿平行传输标架放置带噪声的断面环，底部压平为步道基础。
 * 洞壁噪声只依赖 WALL 域种子，与滴水密度等参数解耦（分域隔离）。
 */
import type { GenParams } from '../types';
import type { Mesh, Station, Vec3 } from './geometry';
import { Domain } from './rng';
import { fbm3 } from './noise';
import { v3 } from './vec';
import { makeMesh } from './meshUtils';

/** 洞底压平深度：中心线下 0.42 倍洞高。 */
const FLOOR_RATIO = 0.42;

/**
 * 计算某站某角度的断面环点（世界坐标）。theta=0 指向站 right，逆时针（沿 up）。
 * 同时供钟乳石附着点与剖切视图复用，保证各处几何一致。
 */
export function ringPoint(st: Station, theta: number, params: GenParams, seed: number): Vec3 {
  const rx = params.tunnelWidth / 2;
  const ry = params.tunnelHeight / 2;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  // 用角度的正余弦作为噪声坐标，避免 0/2π 接缝；沿里程取低频走向
  const sNorm = st.length / 8;
  const big = fbm3(cosT * 1.2 + sNorm, sinT * 1.2, sNorm * 0.7, seed + Domain.WALL, 3);
  const fine = fbm3(cosT * 3.4 + st.length * 0.5, sinT * 3.4, st.length * 0.33, seed + Domain.WALL + 1, 2);
  const scale = 1 + big * 0.14 + fine * 0.05;

  let ox = cosT * rx * scale;
  let oy = sinT * ry * scale;

  // 洞底压平：下弧段向 floorY 收敛
  const floorLocalY = -ry * FLOOR_RATIO;
  const blend = sinT < -0.2 ? Math.min(1, (-0.2 - sinT) / 0.5) : 0;
  if (blend > 0) {
    oy = oy * (1 - blend) + floorLocalY * blend;
    ox *= 1 - blend * 0.25;
  }

  return v3.add(st.center, v3.add(v3.scale(st.right, ox), v3.scale(st.up, oy)));
}

/** 该站洞底世界高程（压平面），回填到 station.floorY。 */
export function stationFloorY(st: Station, params: GenParams): number {
  const ry = params.tunnelHeight / 2;
  return st.center[1] - ry * FLOOR_RATIO;
}

export interface TunnelBuild {
  mesh: Mesh;
  stations: Station[];
}

export function buildTunnel(stations: Station[], params: GenParams, seed: number): TunnelBuild {
  const M = params.ringSegments;
  const N = stations.length;
  const positioned = stations.map((st) => ({ ...st, floorY: stationFloorY(st, params) }));

  const ringVerts: Vec3[][] = positioned.map((st) => {
    const ring: Vec3[] = [];
    for (let j = 0; j < M; j++) ring.push(ringPoint(st, (j / M) * Math.PI * 2, params, seed));
    return ring;
  });

  const positions: number[] = [];
  for (const ring of ringVerts) for (const p of ring) positions.push(p[0], p[1], p[2]);

  const indices: number[] = [];
  const idx = (i: number, j: number) => i * M + (j % M);
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < M; j++) {
      const a = idx(i, j);
      const b = idx(i + 1, j);
      const c = idx(i + 1, j + 1);
      const d = idx(i, j + 1);
      indices.push(a, d, b, d, c, b);
    }
  }

  // 两端封口（扇形），法线沿 ±切向
  const startCenter = positions.length / 3;
  positions.push(...positioned[0]!.center);
  for (let j = 0; j < M; j++) indices.push(startCenter, idx(0, j + 1), idx(0, j));
  const endCenter = positions.length / 3;
  positions.push(...positioned[N - 1]!.center);
  const base = (N - 1) * M;
  for (let j = 0; j < M; j++) indices.push(endCenter, base + (j % M), base + ((j + 1) % M));

  const mesh = makeMesh(
    new Float32Array(positions),
    new Uint32Array(indices),
    positioned[Math.floor(N / 2)]!.center,
  );
  return { mesh, stations: positioned };
}
