/** 灯光：沿步道每约 10m 在洞顶侧布置一盏确定性暖色点光源，里程锚定。 */
import type { LightEntity, Station } from './geometry';
import { Domain, pairId, substream } from './rng';
import { v3 } from './vec';

const LIGHT_SPACING_M = 10;

export function buildLights(stations: Station[], seed: number): LightEntity[] {
  if (stations.length === 0) return [];
  const total = stations[stations.length - 1]!.length || 1;
  const count = Math.max(1, Math.floor(total / LIGHT_SPACING_M));
  const lights: LightEntity[] = [];
  for (let k = 0; k < count; k++) {
    const targetLen = ((k + 0.5) / count) * total;
    // 找最近站（里程单调，顺序扫描即可）
    let si = 0;
    let best = Infinity;
    for (let i = 0; i < stations.length; i++) {
      const d = Math.abs(stations[i]!.length - targetLen);
      if (d < best) {
        best = d;
        si = i;
      }
    }
    const st = stations[si]!;
    const rng = substream(seed, Domain.LIGHTS, pairId(k, 4242));
    const side = rng() > 0.5 ? 1 : -1;
    const position = v3.add(
      v3.add(st.center, v3.scale(st.right, side * (1.2 + rng() * 0.6))),
      v3.scale(st.up, 1.1),
    );
    const warm: [number, number, number] = [1.0, 0.82 + rng() * 0.1, 0.55 + rng() * 0.15];
    lights.push({
      id: `light-${k}`,
      s: st.length / total,
      position,
      color: warm,
      intensity: 1.2 + rng() * 0.6,
    });
  }
  return lights;
}
