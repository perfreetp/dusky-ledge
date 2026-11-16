import type { CurvatureViolation } from '@pg/shared';
import type { SplineEvaluation } from './spline/types.js';
import { vec3 } from './math/vec3.js';

export interface CurvatureCombResult {
  /** 梳齿线段对（每根齿两个端点），渲染为 LineSegments */
  teeth: { base: [number, number, number]; tip: [number, number, number] }[];
  /** 梳背曲线（齿尖连线） */
  spine: [number, number, number][];
  /** 每个采样点是否超差，与 samples 对齐 */
  violationFlags: boolean[];
  violations: CurvatureViolation[];
  maxCurvature: number;
  minBendRadius: number;
}

export interface CurvatureOptions {
  /** 最小允许弯曲半径 (mm) */
  minBendRadius: number;
  /** 梳齿显示比例（mm 显示长度 = κ × scale） */
  combScale?: number;
}

/** 把连续超差采样点合并成子区段并计算弧长 */
export function analyzeCurvature(
  evalResult: SplineEvaluation,
  options: CurvatureOptions,
): CurvatureCombResult {
  const { samples, totalLength } = evalResult;
  const combScale = options.combScale ?? 600;
  const flags: boolean[] = [];
  const teeth: CurvatureCombResult['teeth'] = [];
  const spine: [number, number, number][] = [];
  let maxCurvature = 0;

  for (const smp of samples) {
    maxCurvature = Math.max(maxCurvature, smp.curvature);
    const bendRadius = smp.curvature < 1e-9 ? Infinity : 1 / smp.curvature;
    const bad = bendRadius < options.minBendRadius;
    flags.push(bad);

    const tip = vec3.add(
      smp.position,
      vec3.scale(smp.normal, smp.curvature * combScale),
    );
    teeth.push({
      base: [...smp.position] as [number, number, number],
      tip: tip as [number, number, number],
    });
    spine.push(tip as [number, number, number]);
  }

  const violations: CurvatureViolation[] = [];
  let runStart = -1;
  for (let i = 0; i <= flags.length; i++) {
    const active = i < flags.length && flags[i]!;
    if (active && runStart < 0) runStart = i;
    if (!active && runStart >= 0) {
      const end = i - 1;
      const segSamples = samples.slice(runStart, end + 1);
      const maxK = Math.max(...segSamples.map((s) => s.curvature));
      const length = samples[end]!.s - samples[runStart]!.s;
      violations.push({
        tStart: samples[runStart]!.t,
        tEnd: samples[end]!.t,
        length,
        maxCurvature: maxK,
        minBendRadius: maxK < 1e-9 ? Infinity : 1 / maxK,
      });
      runStart = -1;
    }
  }

  return {
    teeth,
    spine,
    violationFlags: flags,
    violations,
    maxCurvature,
    minBendRadius: maxCurvature < 1e-9 ? Infinity : 1 / maxCurvature,
  };
}
