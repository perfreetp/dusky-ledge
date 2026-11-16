import type {
  ControlPoint,
  ProjectRules,
  SegmentStat,
  CurvatureViolation,
  EnvelopeViolation,
} from '@pg/shared';
import type { SplineEvaluation } from './spline/types.js';

export interface SegmentRange {
  jointId: string;
  tStart: number;
  tEnd: number;
  sStart: number;
  sEnd: number;
}

/** 按控制点 jointId 变化切分，段边界取相邻异关节控制点的 t 中点 */
export function computeSegmentRanges(
  controlPoints: ControlPoint[],
  evalResult: SplineEvaluation,
): SegmentRange[] {
  if (controlPoints.length === 0) return [];
  const boundaries: number[] = [0];
  for (let i = 1; i < controlPoints.length; i++) {
    if (controlPoints[i]!.jointId !== controlPoints[i - 1]!.jointId) {
      boundaries.push((i - 0.5) / (controlPoints.length - 1));
    }
  }
  boundaries.push(1);

  const jointAt = (t: number): string => {
    const f = t * (controlPoints.length - 1);
    const idx = Math.min(controlPoints.length - 1, Math.round(f));
    return controlPoints[idx]!.jointId;
  };

  const ranges: SegmentRange[] = [];
  for (let b = 0; b < boundaries.length - 1; b++) {
    const tStart = boundaries[b]!;
    const tEnd = boundaries[b + 1]!;
    const sStart = sFromT(evalResult, tStart);
    const sEnd = sFromT(evalResult, tEnd);
    ranges.push({ jointId: jointAt((tStart + tEnd) / 2), tStart, tEnd, sStart, sEnd });
  }
  return ranges;
}

function sFromT(evalResult: SplineEvaluation, t: number): number {
  const lut = evalResult.arcLut;
  if (t <= 0) return 0;
  if (t >= 1) return evalResult.totalLength;
  let lo = 0;
  let hi = lut.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (lut[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const f = (t - lut[lo]!.t) / Math.max(lut[hi]!.t - lut[lo]!.t, 1e-12);
  return lut[lo]!.s + f * (lut[hi]!.s - lut[lo]!.s);
}

export function renderSegmentName(
  template: string,
  projectCode: string,
  seq: number,
  jointId: string,
): string {
  return template
    .replaceAll('{project}', projectCode)
    .replaceAll('{seq}', String(seq).padStart(2, '0'))
    .replaceAll('{joint}', jointId);
}

export interface SegmentStatsInput {
  evalResult: SplineEvaluation;
  controlPoints: ControlPoint[];
  rules: ProjectRules;
  projectCode: string;
  curvatureViolations: CurvatureViolation[];
  envelopeViolations: EnvelopeViolation[];
}

export function buildSegmentStats(input: SegmentStatsInput): SegmentStat[] {
  const { evalResult, controlPoints, rules, projectCode, curvatureViolations, envelopeViolations } =
    input;
  const ranges = computeSegmentRanges(controlPoints, evalResult);
  const overlap = (a0: number, a1: number, b0: number, b1: number) =>
    Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

  return ranges.map((r, idx) => {
    const segSamples = evalResult.samples.filter(
      (s) => s.t >= r.tStart - 1e-9 && s.t <= r.tEnd + 1e-9,
    );
    const maxCurvature = segSamples.reduce((m, s) => Math.max(m, s.curvature), 0);
    const curvatureViolationLength = curvatureViolations.reduce(
      (sum, v) =>
        sum + overlap(r.tStart, r.tEnd, v.tStart, v.tEnd) * (evalResult.totalLength || 1),
      0,
    );
    // 上面按 t 比例折算为近似长度；更精确按弧长差
    const preciseCurvLen = curvatureViolations.reduce((sum, v) => {
      const lo = Math.max(r.tStart, v.tStart);
      const hi = Math.min(r.tEnd, v.tEnd);
      if (hi <= lo) return sum;
      return sum + (sFromT(evalResult, hi) - sFromT(evalResult, lo));
    }, 0);
    const envelopeViolationLength = envelopeViolations.reduce((sum, v) => {
      if (v.jointId !== r.jointId) return sum;
      const lo = Math.max(r.tStart, v.tStart);
      const hi = Math.min(r.tEnd, v.tEnd);
      if (hi <= lo) return sum;
      return sum + (sFromT(evalResult, hi) - sFromT(evalResult, lo));
    }, 0);
    void curvatureViolationLength;
    return {
      segmentId: `seg-${idx + 1}`,
      segmentName: renderSegmentName(rules.segmentNameTemplate, projectCode, idx + 1, r.jointId),
      jointId: r.jointId,
      length: r.sEnd - r.sStart,
      curvatureViolationLength: preciseCurvLen,
      envelopeViolationLength,
      maxCurvature,
    };
  });
}
