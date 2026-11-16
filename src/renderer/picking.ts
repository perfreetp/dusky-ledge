/**
 * CPU 拾取：点击时一次性求交，不做每帧检测。
 * 先用所有实例 AABB + 射线粗筛，再对候选做轴对齐胶囊精测，取最近。
 * 数据量约千株时一次点击 O(n) 完全可接受。
 */
import type { SpeleoInstance } from '../core/geometry';
import { rayAABB, v3, type Ray } from '../core/vec';
import type { Vec3 } from '../core/geometry';

export interface PickHit {
  instance: SpeleoInstance;
  distance: number;
  point: Vec3;
}

/** 射线到线段（root→tip）的最近距离 + 半径膨胀，返回最近点参数 t（沿射线）。 */
function rayVsCapsule(ray: Ray, root: Vec3, tip: Vec3, radius: number): number | null {
  // 采样线段上若干点做球测，稳定且足够拾取精度
  const steps = 5;
  let best: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const c = v3.lerp(root, tip, i / steps);
    const oc = v3.sub(c, ray.origin);
    const proj = v3.dot(oc, ray.dir);
    if (proj < 0) continue;
    const closest = v3.add(ray.origin, v3.scale(ray.dir, proj));
    if (v3.dist(closest, c) <= radius + 0.12) {
      if (best === null || proj < best) best = proj;
    }
  }
  return best;
}

export function pickSpeleothem(ray: Ray, instances: SpeleoInstance[]): PickHit | null {
  let best: PickHit | null = null;
  for (const ins of instances) {
    if (rayAABB(ray, ins.bbox.min, ins.bbox.max) === null) continue;
    const tip = v3.add(ins.root, v3.scale(ins.axis, ins.height));
    const t = rayVsCapsule(ray, ins.root, tip, ins.radius);
    if (t !== null && (best === null || t < best.distance)) {
      best = {
        instance: ins,
        distance: t,
        point: v3.add(ray.origin, v3.scale(ray.dir, t)),
      };
    }
  }
  return best;
}
