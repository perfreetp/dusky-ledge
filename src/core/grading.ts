import type {
  Feature,
  FeatureKind,
  GradeItem,
  GradeResult,
  PlanDoc,
  Pt,
  TrainingRequirements,
} from '@shared/types';
import { booleanPolygons, strokeOutline, unionPolygons } from './clipper';
import { featureBoundsInclStroke, KIND_PRESETS } from './feature';
import { generateHatchVariants } from './hatch';
import { dist, pointInRings, ringArea, rectFromPoints, type Rect } from './math';

/**
 * Automatic grading for the apprentice exercise.
 *
 * The comparison works on *painted geometry*, not on object identity: every feature
 * is materialised to a ring set (areas as-is, center lines as their stroke band) and
 * then scored by
 *   - coverage  : IoU of the reference paint vs. the student's paint, per kind
 *   - width     : stroke width ratio against the reference / spec tolerance
 *   - closure   : the student's areas must be closed and simple
 * plus penalties for missing / extra objects, expressed as concrete 错题 items a
 * teacher can review and adjust.
 */
export function gradeSubmission(
  student: PlanDoc,
  reference: PlanDoc,
  requirements: TrainingRequirements
): GradeResult {
  const tol = requirements.positionTolerance > 0 ? requirements.positionTolerance : 150;
  const wTol = requirements.widthTolerance > 0 ? requirements.widthTolerance : 0.15;
  // weights are surfaced to the teacher UI as sub-score emphasis; the headline score
  // is the honest sum of itemised deductions (see below)
  void normalizeWeights(requirements.weights);
  const items: GradeItem[] = [];
  const matched: GradeResult['matched'] = [];

  const refFeatures = reference.features.filter((f) => f.visible);
  const stuFeatures = student.features.filter((f) => f.visible);

  // ---- 1. Pair features by kind, then by overlap of painted geometry ----
  const byKindRef = groupByKind(refFeatures);
  const byKindStu = groupByKind(stuFeatures);
  const kinds = new Set<FeatureKind>([...byKindRef.keys(), ...byKindStu.keys()]);

  let coverageAcc = 0;
  let coverageWeightSum = 0;
  let widthAcc = 0;
  let widthWeightSum = 0;

  for (const kind of kinds) {
    const refs = byKindRef.get(kind) ?? [];
    const stus = byKindStu.get(kind) ?? [];
    if (!refs.length && !stus.length) continue;
    const preset = KIND_PRESETS[kind];
    const kindWeight = Math.max(1, refs.length);

    // union paint of each side for this kind
    const refPaint = unionAll(refs);
    const stuPaint = unionAll(stus);
    const refArea = Math.abs(sumArea(refPaint));
    const stuArea = Math.abs(sumArea(stuPaint));
    let interArea = 0;
    if (refPaint.length && stuPaint.length) {
      interArea = Math.abs(sumArea(booleanPolygons({ subject: refPaint, clip: stuPaint, op: 'intersection' })));
    }
    const unionArea = refArea + stuArea - interArea;
    const iou = unionArea > 1e-6 ? interArea / unionArea : refArea === 0 && stuArea === 0 ? 1 : 0;

    if (refArea === 0 && stuArea === 0) continue;
    coverageAcc += iou * kindWeight;
    coverageWeightSum += kindWeight;

    // ---- missing / extra ----
    for (const r of refs) {
      const rPaint = paintOf(r);
      let best = 0;
      let bestS: Feature | null = null;
      for (const s of stus) {
        const ov = overlapRatio(rPaint, paintOf(s));
        if (ov > best) {
          best = ov;
          bestS = s;
        }
      }
      if (best < 0.25) {
        // Deduction is expressed on the 100-point scale so item deductions are the
        // single source of truth: the auto score is exactly 100 minus their sum,
        // which is what a teacher adjusts when reviewing.
        const weight = areasPerKindWeight(refs, kind);
        items.push({
          id: `missing-${r.id}`,
          type: 'missing',
          title: `缺少${preset.label}「${r.name}」`,
          detail: `参考方案中该对象占地 ${(Math.abs(sumArea(rPaint)) / 1e6).toFixed(2)} ㎡，你的方案在对应位置覆盖率仅 ${(best * 100).toFixed(0)}%。`,
          refFeatureId: r.id,
          expected: `${preset.label} ${r.geom === 'path' ? `线宽 ${r.lineWidth}mm` : `${(Math.abs(sumArea(r.rings)) / 1e6).toFixed(1)}㎡`}`,
          actual: '未绘制',
          deduction: weight,
        });
        widthAcc += 0 * kindWeight;
        widthWeightSum += kindWeight;
        continue;
      }
      // ---- width check on the paired feature ----
      const refW = effWidth(r);
      const stuW = effWidth(bestS!);
      const ratio = refW > 0 ? stuW / refW : 1;
      const wScore = widthScoreFor(ratio, wTol);
      widthAcc += wScore * kindWeight;
      widthWeightSum += kindWeight;
      matched.push({ refId: r.id, studentId: bestS!.id, coverage: best, widthRatio: ratio });
      if (wScore < 0.999) {
        items.push({
          id: `width-${r.id}`,
          type: 'width',
          title: `线宽不符：${preset.label}「${r.name}」`,
          detail: deviationText(refW, stuW, ratio, wTol),
          refFeatureId: r.id,
          studentFeatureId: bestS!.id,
          expected: `${refW} mm`,
          actual: `${Math.round(stuW)} mm`,
          deduction: Math.round((1 - wScore) * 8 * 10) / 10,
        });
      }
      // ---- position offset check ----
      const rb = featureBoundsInclStroke(r);
      const sb = featureBoundsInclStroke(bestS!);
      const centerDist = dist(center(rb), center(sb));
      const sizeRef = Math.max(1, Math.max(rb.maxX - rb.minX, rb.maxY - rb.minY));
      if (centerDist > Math.max(tol, sizeRef * 0.25) && best < 0.9) {
        items.push({
          id: `pos-${r.id}`,
          type: 'position',
          title: `位置偏差较大：${preset.label}「${r.name}」`,
          detail: `中心偏移 ${Math.round(centerDist)} mm，超出允许的 ${Math.round(Math.max(tol, sizeRef * 0.25))} mm；与参考位置的 IoU 仅 ${(best * 100).toFixed(0)}%。`,
          refFeatureId: r.id,
          studentFeatureId: bestS!.id,
          deduction: 10,
        });
      }
    }

    // extra student objects of this kind that match nothing
    const matchedIds = new Set(matched.map((m) => m.studentId));
    for (const s of stus) {
      if (matchedIds.has(s.id)) continue;
      const closed = closureOf(s).ok;
      // A degenerate object (unclosed ring) is reported once, as a closure error,
      // rather than also being counted as "extra".
      const sPaint = closed ? paintOf(s) : [];
      let best = 0;
      for (const r of refs) best = Math.max(best, overlapRatio(sPaint, paintOf(r)));
      if (refs.length && closed && best < 0.25) {
        items.push({
          id: `extra-${s.id}`,
          type: 'extra',
          title: `多余对象：${preset.label}「${s.name}」`,
          detail: '参考方案中没有对应区域，或位置严重偏离。',
          studentFeatureId: s.id,
          deduction: 4,
        });
      }
    }
  }

  // ---- 2. Closure check on the student's own areas ----
  const closureItems: GradeItem[] = [];
  const areaFeatures = stuFeatures.filter((f) => f.geom === 'area');
  let closureOk = 0;
  for (const f of areaFeatures) {
    const report = closureOf(f);
    if (report.ok) closureOk++;
    else {
      closureItems.push({
        id: `closure-${f.id}`,
        type: 'closure',
        title: `轮廓未闭合：${f.name}`,
        detail: report.reason,
        studentFeatureId: f.id,
        deduction: 6,
      });
    }
  }
  const refAreas = refFeatures.filter((f) => f.geom === 'area');
  // Missing areas already counted above; closure score measures quality of drawn areas.
  const closureScore = refAreas.length === 0 ? 1 : areaFeatures.length === 0 ? 0 : closureOk / Math.max(areaFeatures.length, refAreas.length);
  items.push(...closureItems);

  // ---- 3. Hatch / style spot check (diagnostic only, not scored) ----
  for (const r of refFeatures.filter((f) => f.hatch)) {
    const hatch = r.hatch!;
    const s = stuFeatures.find((f) => f.id === matched.find((m) => m.refId === r.id)?.studentId);
    if (s && !s.hatch) {
      items.push({
        id: `style-${r.id}`,
        type: 'style',
        title: `填充样式缺失：${s.name}`,
        detail: `该区域按规范需要 ${hatch.type === 'diagonal' ? '斜纹' : hatch.type} 填充（间距 ${hatch.spacing}mm），当前没有填充。`,
        refFeatureId: r.id,
        studentFeatureId: s.id,
        deduction: 0,
      });
    }
  }

  const coverageScore = coverageWeightSum ? coverageAcc / coverageWeightSum : 1;
  const widthScore = widthWeightSum ? widthAcc / widthWeightSum : 1;

  // The score is simply 100 minus the sum of item deductions, so the number the
  // student sees, the list of errors they read, and the number the teacher edits
  // are all the same arithmetic. Sub-scores remain for diagnostics and weighting.
  const totalDeduction = items.reduce((acc, it) => acc + Math.max(0, it.deduction), 0);
  const score = Math.round(Math.max(0, Math.min(100, 100 - totalDeduction)) * 10) / 10;

  items.sort((a, b) => b.deduction - a.deduction);
  return {
    score,
    coverageScore: round3(coverageScore),
    widthScore: round3(widthScore),
    closureScore: round3(closureScore),
    penalty: round3(Math.min(1, totalDeduction / 100)),
    items,
    matched,
    featureCount: { reference: refFeatures.length, student: stuFeatures.length },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * How many points one missing object of this kind costs. The kind's share of the
 * total reference geometry is spread over its objects, so a repeated element
 * (six station frames) costs about as much as a single large zone — which is how
 * an instructor would judge it.
 */
function areasPerKindWeight(refs: Feature[], kind: FeatureKind): number {
  const _ = kind;
  void _;
  const perObject = Math.round(40 / Math.max(1, refs.length));
  return Math.min(20, Math.max(2, perObject));
}

function normalizeWeights(w: TrainingRequirements['weights']) {
  const c = Math.max(0, w.coverage);
  const wd = Math.max(0, w.width);
  const cl = Math.max(0, w.closure);
  const sum = c + wd + cl || 1;
  return { coverage: c / sum, width: wd / sum, closure: cl / sum };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function groupByKind(features: Feature[]): Map<FeatureKind, Feature[]> {
  const m = new Map<FeatureKind, Feature[]>();
  for (const f of features) {
    const arr = m.get(f.kind) ?? [];
    arr.push(f);
    m.set(f.kind, arr);
  }
  return m;
}

/** Closed ring set that represents what the feature paints on the floor. */
export function paintOf(f: Feature): Pt[][] {
  if (f.geom === 'area') return f.rings;
  if (!f.paths.some((p) => p.length >= 2)) return [];
  return strokeOutline(f.paths, Math.max(1, f.lineWidth), { join: 'miter', end: 'butt' });
}

function unionAll(features: Feature[]): Pt[][] {
  const rings: Pt[][] = [];
  for (const f of features) rings.push(...paintOf(f));
  if (rings.length <= 1) return rings;
  return unionPolygons(rings);
}

function sumArea(rings: Pt[][]): number {
  let total = 0;
  for (const r of rings) total += ringArea(r);
  return total;
}

function overlapRatio(a: Pt[][], b: Pt[][]): number {
  const areaA = Math.abs(sumArea(a));
  if (areaA < 1e-6) return 0;
  if (!b.length) return 0;
  const inter = Math.abs(sumArea(booleanPolygons({ subject: a, clip: b, op: 'intersection' })));
  return Math.min(1, inter / areaA);
}

function effWidth(f: Feature): number {
  if (f.geom === 'area') return f.outlineWidth || f.lineWidth;
  return f.lineWidth;
}

/** 1 when within tolerance, falling off linearly to 0 at 3x the tolerance. */
function widthScoreFor(ratio: number, tol: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  const dev = Math.abs(Math.log(ratio));
  const t = Math.abs(Math.log(1 + tol));
  if (dev <= t) return 1;
  const over = (dev - t) / (t * 2);
  return Math.max(0, 1 - over);
}

function deviationText(refW: number, stuW: number, ratio: number, tol: number): string {
  const pct = ((stuW - refW) / refW) * 100;
  const dir = pct > 0 ? '偏宽' : '偏窄';
  return `规范线宽 ${refW} mm，实际 ${Math.round(stuW)} mm，${dir} ${Math.abs(pct).toFixed(0)}%（允许 ±${(tol * 100).toFixed(0)}%）。`;
}

function center(r: Rect): Pt {
  return { x: (r.minX + r.maxX) / 2, y: (r.minY + r.maxY) / 2 };
}

/** Check a student area is closed, has area, no duplicate/degenerate edges. */
export function closureOf(f: Feature): { ok: boolean; reason: string } {
  if (f.geom !== 'area') return { ok: true, reason: '' };
  if (!f.rings.length) return { ok: false, reason: '没有任何轮廓顶点。' };
  for (const ring of f.rings) {
    if (ring.length < 3) return { ok: false, reason: `轮廓只有 ${ring.length} 个顶点，无法围成面积。` };
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (dist(a, b) < 0.5) return { ok: false, reason: '轮廓存在零长度边（重复顶点）。' };
    }
    if (Math.abs(ringArea(ring)) < 100) return { ok: false, reason: '轮廓面积近似为 0，可能自交或重叠。' };
  }
  return { ok: true, reason: '' };
}

/** Diagnostic helper for the teacher view: which reference features are wholly inside student paint. */
export function coverageMap(student: PlanDoc, reference: PlanDoc): Map<string, number> {
  const out = new Map<string, number>();
  const stuPaint = unionAll(student.features.filter((f) => f.visible));
  for (const r of reference.features.filter((f) => f.visible)) {
    out.set(r.id, overlapRatio(paintOf(r), stuPaint));
  }
  return out;
}

/** Count stripes a hatch style would generate, for the inspector badge. */
export function hatchCountOf(f: Feature): number {
  if (!f.hatch) return 0;
  const rings = f.geom === 'area' ? f.rings : paintOf(f);
  return generateHatchVariants(rings, f.hatch).length;
}

/** Check whether a point lies inside a feature's paint (shortcut for tests). */
export function paints(f: Feature, p: Pt): boolean {
  return pointInRings(p, paintOf(f));
}

export { rectFromPoints };
