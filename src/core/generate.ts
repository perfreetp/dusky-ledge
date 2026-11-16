/**
 * 生成管线编排：纯函数 (seed, params, overrides) → GenResult。
 * 计时用 performance.now() 只写入统计，绝不参与几何决策。
 */
import type { GenParams, GenResult, Overrides } from '../types';
import { buildStations } from './spline';
import { buildTunnel } from './tunnel';
import { buildTrailMesh, buildTrailPath } from './trail';
import { buildSpeleothems } from './speleothem';
import { buildLights } from './lights';

export function generate(seed: number, params: GenParams, overrides: Overrides): GenResult {
  const t0 = performance.now();

  // 1. 中心线 + 平行传输标架
  const rawStations = buildStations(params.controlPoints, params.stationStep, seed);
  // 2. 洞体扫掠（回填 floorY）
  const { mesh: tunnel, stations } = buildTunnel(rawStations, params, seed);
  // 3. 步道（先于钟乳石，供净空避让）
  const trailPath = buildTrailPath(stations, overrides, seed, params.trailWidth);
  const trail = buildTrailMesh(trailPath, stations);
  // 4. 钟乳石群
  const speleoBuild = buildSpeleothems(stations, params, trailPath, overrides, seed);
  // 5. 灯光
  const lights = buildLights(stations, seed);

  const byTier: [number, number, number] = [0, 0, 0];
  for (const ins of speleoBuild.instances) byTier[ins.tierIndex]!++;

  const elapsedMs = performance.now() - t0;
  return {
    tunnel,
    trail,
    trailPath,
    speleo: { prototypes: speleoBuild.prototypes, instances: speleoBuild.instances },
    lights,
    stations,
    stats: {
      tunnelTris: tunnel.indices.length / 3,
      speleoCount: speleoBuild.instances.length,
      speleoByTier: byTier,
      rejectedByClearance: speleoBuild.rejectedByClearance,
      elapsedMs: Math.round(elapsedMs * 100) / 100,
    },
  };
}
