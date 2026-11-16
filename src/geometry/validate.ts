import type { Contour, Pt } from '../types';

export interface ContourIssue {
  type: 'open' | 'self-intersect';
  /** 自交涉及的两条边的索引(第 i 条边 = points[i] → points[i+1]) */
  segA?: number;
  segB?: number;
  message: string;
}

/** 严格线段相交判定(不含仅端点相接) */
function segmentsCross(a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** 闭合轮廓的边集合: [(p0,p1), (p1,p2), ..., (pn-1,p0)] */
export function contourSegments(c: Contour): [Pt, Pt][] {
  const segs: [Pt, Pt][] = [];
  const n = c.points.length;
  const count = c.closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    segs.push([c.points[i], c.points[(i + 1) % n]]);
  }
  return segs;
}

/**
 * 校验轮廓: 未闭合 / 自交。
 * 自交时返回每一对相交边的索引,用于在场景中当场标红。
 */
export function validateContour(c: Contour): ContourIssue[] {
  const issues: ContourIssue[] = [];
  if (!c.closed) {
    issues.push({ type: 'open', message: '轮廓未闭合: 起点与终点未连接' });
    return issues;
  }
  if (c.points.length < 3) {
    issues.push({ type: 'open', message: '轮廓点数不足(至少3点)' });
    return issues;
  }
  const segs = contourSegments(c);
  const n = segs.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // 跳过相邻边(共享端点不算自交)
      if (j === i + 1) continue;
      if (i === 0 && j === n - 1) continue; // 首尾边相邻
      if (segmentsCross(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) {
        issues.push({
          type: 'self-intersect',
          segA: i,
          segB: j,
          message: `轮廓自交: 第 ${i + 1} 段与第 ${j + 1} 段相交`,
        });
      }
    }
  }
  return issues;
}

/** 轮廓是否可用于布尔运算 */
export function isContourValid(c: Contour): boolean {
  return c.closed && c.points.length >= 3 && validateContour(c).length === 0;
}
