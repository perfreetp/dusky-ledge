import type { FlatPattern, Vec2 } from '@pg/shared';
import type { TubeMesh } from './tube.js';
import type { SegmentRange } from './segments.js';

export interface UnfoldOptions {
  /** 分段边界（用于对位线与分段切口） */
  segmentRanges: SegmentRange[];
  /** 段名（与 segmentRanges 对齐） */
  segmentNames: string[];
  /** 图纸边距 (mm) */
  margin?: number;
}

/**
 * 母线实长展开法（v1）：
 * - 环向坐标 y = r·θ，接缝取 θ=0
 * - 纵向坐标 x：沿每条母线把真实 mesh 边长逐段累积，
 *   弯管内外侧因路径长度不同自然形成梯形补偿，无需迭代求解
 */
export function unfoldTube(mesh: TubeMesh, options: UnfoldOptions): FlatPattern {
  const margin = options.margin ?? 10;
  const { radialSegments, tubularSegments, radius } = mesh;
  const cols = radialSegments + 1;
  const rows = tubularSegments + 1;
  const circumference = 2 * Math.PI * radius;

  // 每条环向母线 j 的累计实长 x[j][i]
  const x: number[][] = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let j = 0; j < cols; j++) {
    for (let i = 1; i < rows; i++) {
      const a = (i - 1) * cols + j;
      const b = i * cols + j;
      const dx = mesh.positions[b * 3]! - mesh.positions[a * 3]!;
      const dy = mesh.positions[b * 3 + 1]! - mesh.positions[a * 3 + 1]!;
      const dz = mesh.positions[b * 3 + 2]! - mesh.positions[a * 3 + 2]!;
      x[j]![i] = x[j]![i - 1]! + Math.hypot(dx, dy, dz);
    }
  }

  // 用接缝母线（j=0）的 x 作为分段定位基准
  const seamX = x[0]!;
  const maxX = Math.max(...x.map((row) => row[rows - 1]!));
  const width = maxX + margin * 2;
  const height = circumference + margin * 2;

  // 轮廓：沿 j=0 底边去、末端竖边、j=radialSegments 顶边回、始端竖边
  const outline: Vec2[] = [];
  for (let i = 0; i < rows; i++) outline.push([margin + seamX[i]!, margin]);
  for (let j = 1; j <= radialSegments; j++) {
    outline.push([margin + x[j]![rows - 1]!, margin + (j / radialSegments) * circumference]);
  }
  for (let i = rows - 1; i >= 0; i--) {
    outline.push([
      margin + x[radialSegments]![i]!,
      margin + circumference,
    ]);
  }
  for (let j = radialSegments - 1; j >= 1; j--) {
    outline.push([margin + x[j]![0]!, margin + (j / radialSegments) * circumference]);
  }

  // 切口线：两端环向缝 + 纵向接缝（顶/底边）+ 分段切口
  const cutLines: FlatPattern['cutLines'] = [];
  // 端部环向切口
  cutLines.push({
    from: [margin, margin],
    to: [margin, margin + circumference],
    kind: 'seam',
  });
  cutLines.push({
    from: [margin + maxX, margin],
    to: [margin + maxX, margin + circumference],
    kind: 'seam',
  });
  // 纵向接缝（θ=0 与 θ=2π 同一条物理缝）
  cutLines.push({
    from: [margin, margin],
    to: [margin + seamX[rows - 1]!, margin],
    kind: 'seam',
  });

  // 网格参考线：每隔一段环向角度画纵向母线投影
  const gridLines: FlatPattern['gridLines'] = [];
  for (let j = 1; j < radialSegments; j += 4) {
    const y = margin + (j / radialSegments) * circumference;
    gridLines.push({
      from: [margin + x[j]![0]!, y],
      to: [margin + x[j]![rows - 1]!, y],
    });
  }

  // 对位线与分段切口：在分段 t 边界处
  const alignmentMarks: FlatPattern['alignmentMarks'] = [];
  const labels: FlatPattern['labels'] = [];
  const tToRow = (t: number) => Math.round(t * tubularSegments);

  options.segmentRanges.forEach((r, idx) => {
    const row = tToRow(r.tEnd);
    const xPos = margin + seamX[Math.min(row, rows - 1)]!;
    if (idx < options.segmentRanges.length - 1) {
      cutLines.push({
        from: [xPos, margin],
        to: [xPos, margin + circumference],
        kind: 'segment',
      });
    }
    // 对位线：圆周 1/4、1/2、3/4 处的短横标记
    for (const frac of [0.25, 0.5, 0.75]) {
      const y = margin + frac * circumference;
      alignmentMarks.push({
        from: [xPos - 3, y],
        to: [xPos + 3, y],
        label: `${options.segmentNames[idx] ?? ''}`,
      });
    }
    // 段名标注：段中点
    const midRow = tToRow((r.tStart + r.tEnd) / 2);
    labels.push({
      position: [margin + seamX[Math.min(midRow, rows - 1)]! + 2, margin + circumference / 2],
      text: options.segmentNames[idx] ?? `SEG${idx + 1}`,
      size: 5,
    });
  });

  // 面积（多边形 shoelace）
  const area = polygonArea(outline);

  return {
    width,
    height,
    outline,
    alignmentMarks,
    cutLines,
    labels,
    gridLines,
    area,
  };
}

export function polygonArea(poly: Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}
