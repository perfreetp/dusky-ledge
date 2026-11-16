import type {
  ControlPoint,
  InspectionResult,
  InterpolationType,
  ProjectRules,
  FlatPattern,
} from '@pg/shared';
import { evaluateSpline } from './spline/evaluator.js';
import { analyzeCurvature } from './curvature.js';
import { buildTube, tubeSurfaceArea, type TubeMesh } from './tube.js';
import { checkLayerGap } from './gap.js';
import { checkEnvelope, type JointEnvelope } from './envelope.js';
import { buildSegmentStats, computeSegmentRanges, renderSegmentName } from './segments.js';
import { unfoldTube } from './unfold.js';

export interface PipelineInput {
  controlPoints: ControlPoint[];
  interpolation: InterpolationType;
  rules: ProjectRules;
  projectCode: string;
  envelopes?: JointEnvelope[];
}

export interface PipelineOutput {
  evaluation: ReturnType<typeof evaluateSpline>;
  curvature: ReturnType<typeof analyzeCurvature>;
  innerTube: TubeMesh;
  outerTube: TubeMesh;
  gap: ReturnType<typeof checkLayerGap>;
  envelope: ReturnType<typeof checkEnvelope> | null;
  inspection: InspectionResult;
  flatPattern: FlatPattern;
}

/** 全量几何管线：样条 → 曲率 → 双层 → 间隙 → 包络 → 分段统计 → 展开 */
export function runPipeline(input: PipelineInput): PipelineOutput {
  const { controlPoints, interpolation, rules, projectCode, envelopes } = input;
  const evaluation = evaluateSpline(interpolation, controlPoints, {
    samples: rules.tubularSegments,
  });

  const minBendRadius = rules.bendRadiusFactor * rules.outerDiameter;
  const curvature = analyzeCurvature(evaluation, { minBendRadius });

  const outerRadius = rules.outerDiameter / 2;
  const innerRadius = outerRadius - rules.wallThickness;
  const outerTube = buildTube(evaluation, {
    radius: outerRadius,
    radialSegments: rules.radialSegments,
    tubularSegments: rules.tubularSegments,
    layer: 'outer',
  });
  const innerTube = buildTube(evaluation, {
    radius: innerRadius,
    radialSegments: rules.radialSegments,
    tubularSegments: rules.tubularSegments,
    layer: 'inner',
  });

  const gap = checkLayerGap(
    innerTube,
    outerTube,
    rules.minLayerGap,
    curvature.minBendRadius === Infinity ? Number.POSITIVE_INFINITY : curvature.minBendRadius,
  );

  const envelope = envelopes
    ? checkEnvelope(evaluation, controlPoints, envelopes)
    : null;

  const ranges = computeSegmentRanges(controlPoints, evaluation);
  const segmentNames = ranges.map((r, i) =>
    renderSegmentName(rules.segmentNameTemplate, projectCode, i + 1, r.jointId),
  );
  const segmentStats = buildSegmentStats({
    evalResult: evaluation,
    controlPoints,
    rules,
    projectCode,
    curvatureViolations: curvature.violations,
    envelopeViolations: envelope?.violations ?? [],
  });

  const flatPattern = unfoldTube(outerTube, { segmentRanges: ranges, segmentNames });
  const surfaceArea = tubeSurfaceArea(outerTube);
  const unfoldAreaErrorPct =
    surfaceArea > 0 ? (Math.abs(flatPattern.area - surfaceArea) / surfaceArea) * 100 : null;

  const inspection: InspectionResult = {
    totalLength: evaluation.totalLength,
    minBendRadius: curvature.minBendRadius,
    curvatureViolations: curvature.violations,
    envelopeViolations: envelope?.violations ?? [],
    minMeasuredGap: gap.minMeasuredGap,
    minGapPass: gap.pass,
    segmentStats,
    unfoldAreaErrorPct,
  };

  return {
    evaluation,
    curvature,
    innerTube,
    outerTube,
    gap,
    envelope,
    inspection,
    flatPattern,
  };
}
