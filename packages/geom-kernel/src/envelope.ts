import type { ControlPoint, EnvelopeViolation, Vec3 } from '@pg/shared';
import type { SplineEvaluation } from './spline/types.js';
import { vec3 } from './math/vec3.js';

export interface JointEnvelope {
  jointId: string;
  /** 包络圆柱轴起点 */
  axisOrigin: Vec3;
  /** 包络圆柱轴方向（单位向量） */
  axisDir: Vec3;
  /** 圆柱半径 (mm) */
  radius: number;
  /** 轴向半长 (mm)，从 axisOrigin 沿 ±axisDir 各延伸 halfLength */
  halfLength: number;
}

export interface EnvelopeCheckResult {
  /** 每个采样点是否在任一关联包络内（越界=false） */
  insideFlags: boolean[];
  violations: EnvelopeViolation[];
}

function pointInEnvelope(p: Vec3, env: JointEnvelope): boolean {
  const rel = vec3.sub(p, env.axisOrigin);
  const axial = vec3.dot(rel, env.axisDir);
  if (Math.abs(axial) > env.halfLength) return false;
  const radialSq = vec3.lengthSq(rel) - axial * axial;
  return radialSq <= env.radius * env.radius;
}

/**
 * 关节活动范围检查：
 * 每个采样点按其 t 所在控制点区间关联的 jointId 找包络；
 * 落在包络外的连续采样合并为越界子区段。
 */
export function checkEnvelope(
  evalResult: SplineEvaluation,
  controlPoints: ControlPoint[],
  envelopes: JointEnvelope[],
): EnvelopeCheckResult {
  const envByJoint = new Map(envelopes.map((e) => [e.jointId, e]));
  const { samples } = evalResult;

  // t -> jointId：控制点按序在 t 上均分
  const jointAt = (t: number): string => {
    if (controlPoints.length === 1) return controlPoints[0]!.jointId;
    const f = t * (controlPoints.length - 1);
    const idx = Math.min(controlPoints.length - 1, Math.round(f));
    return controlPoints[idx]!.jointId;
  };

  const insideFlags = samples.map((smp) => {
    const jointId = jointAt(smp.t);
    const env = envByJoint.get(jointId);
    if (!env) return true; // 未配置包络的关节不判定
    return pointInEnvelope(smp.position, env);
  });

  const violations: EnvelopeViolation[] = [];
  let runStart = -1;
  let runJoint = '';
  for (let i = 0; i <= insideFlags.length; i++) {
    const outside = i < insideFlags.length && !insideFlags[i]!;
    if (outside && runStart < 0) {
      runStart = i;
      runJoint = jointAt(samples[i]!.t);
    }
    if (!outside && runStart >= 0) {
      const end = i - 1;
      violations.push({
        jointId: runJoint,
        tStart: samples[runStart]!.t,
        tEnd: samples[end]!.t,
        length: samples[end]!.s - samples[runStart]!.s,
      });
      runStart = -1;
    }
  }

  return { insideFlags, violations };
}
