import type { LayerType, Vec3 } from '@pg/shared';
import type { SplineEvaluation } from './spline/types.js';
import { vec3 } from './math/vec3.js';

export interface TubeMesh {
  layer: LayerType;
  radius: number;
  /** 顶点：(tubularSegments+1) × (radialSegments+1)，行=纵向，列=环向 */
  positions: Float64Array;
  /** 环向单位方向（展开用），与 positions 同形 */
  radialDirs: Float64Array;
  tubularSegments: number;
  radialSegments: number;
  /** 三角形索引 */
  indices: Uint32Array;
  /** 每个顶点对应的全局 t（纵向重复 radialSegments+1 次） */
  vertexT: Float64Array;
  /** 每个顶点对应的累计弧长 s */
  vertexS: Float64Array;
}

export interface TubeOptions {
  radius: number;
  radialSegments: number;
  tubularSegments: number;
  layer: LayerType;
}

/** 基于平行传输标架生成环向管 mesh */
export function buildTube(evalResult: SplineEvaluation, options: TubeOptions): TubeMesh {
  const { radialSegments, tubularSegments, radius, layer } = options;
  const { samples } = evalResult;
  // samples 数量可能与 tubularSegments 不一致：等 t 重采样 samples
  const rows = tubularSegments + 1;
  const cols = radialSegments + 1;
  const vertexCount = rows * cols;
  const positions = new Float64Array(vertexCount * 3);
  const radialDirs = new Float64Array(vertexCount * 3);
  const vertexT = new Float64Array(vertexCount);
  const vertexS = new Float64Array(vertexCount);

  for (let i = 0; i < rows; i++) {
    const smp = samples[Math.min(i, samples.length - 1)]!;
    for (let j = 0; j < cols; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const radial = vec3.add(
        vec3.scale(smp.normal, Math.cos(theta)),
        vec3.scale(smp.binormal, Math.sin(theta)),
      );
      const idx = i * cols + j;
      const p: Vec3 = vec3.add(smp.position, vec3.scale(radial, radius));
      positions[idx * 3] = p[0];
      positions[idx * 3 + 1] = p[1];
      positions[idx * 3 + 2] = p[2];
      radialDirs[idx * 3] = radial[0];
      radialDirs[idx * 3 + 1] = radial[1];
      radialDirs[idx * 3 + 2] = radial[2];
      vertexT[idx] = smp.t;
      vertexS[idx] = smp.s;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const c = (i + 1) * cols + j + 1;
      const d = i * cols + j + 1;
      indices.push(a, b, d, b, c, d);
    }
  }

  return {
    layer,
    radius,
    positions,
    radialDirs,
    tubularSegments,
    radialSegments,
    indices: Uint32Array.from(indices),
    vertexT,
    vertexS,
  };
}

/** 管侧面积：三角片面积求和（用于展开守恒校验） */
export function tubeSurfaceArea(mesh: TubeMesh): number {
  let area = 0;
  const p = mesh.positions;
  const tri = (ia: number, ib: number, ic: number) => {
    const a: Vec3 = [p[ia * 3]!, p[ia * 3 + 1]!, p[ia * 3 + 2]!];
    const b: Vec3 = [p[ib * 3]!, p[ib * 3 + 1]!, p[ib * 3 + 2]!];
    const c: Vec3 = [p[ic * 3]!, p[ic * 3 + 1]!, p[ic * 3 + 2]!];
    return 0.5 * vec3.length(vec3.cross(vec3.sub(b, a), vec3.sub(c, a)));
  };
  for (let i = 0; i < mesh.indices.length; i += 3) {
    area += tri(mesh.indices[i]!, mesh.indices[i + 1]!, mesh.indices[i + 2]!);
  }
  return area;
}
