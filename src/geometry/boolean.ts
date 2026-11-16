import polygonClipping, {
  type MultiPolygon,
  type Polygon,
  type Ring,
} from 'polygon-clipping';
import * as THREE from 'three';
import type { Contour, Pt } from '../types';
import { isContourValid } from './validate';

function contourToRing(c: Contour): Ring {
  const ring: Ring = c.points.map((p) => [p.x, p.y] as [number, number]);
  // polygon-clipping 要求首尾点相同
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  return ring;
}

/**
 * 按轮廓列表顺序应用布尔运算得到最终花型。
 * 第一个有效轮廓作为基底(无论其标记为何),后续轮廓按 并/差/交 依次作用。
 */
export function buildPattern(contours: Contour[]): MultiPolygon {
  const valid = contours.filter(isContourValid);
  if (valid.length === 0) return [];
  let result = polygonClipping.union(
    [contourToRing(valid[0])] as unknown as Polygon,
    [] as unknown as MultiPolygon,
  );
  for (let i = 1; i < valid.length; i++) {
    const poly = [contourToRing(valid[i])] as unknown as Polygon;
    try {
      if (valid[i].op === 'union') {
        result = polygonClipping.union(result, poly);
      } else if (valid[i].op === 'subtract') {
        result = polygonClipping.difference(result, poly);
      } else {
        result = polygonClipping.intersection(result, poly);
      }
    } catch {
      // 几何退化时保持原结果,避免整个花型丢失
    }
  }
  return result;
}

/** MultiPolygon → three.js Shape 数组(外环 + 孔洞) */
export function multiPolygonToShapes(mp: MultiPolygon): THREE.Shape[] {
  const shapes: THREE.Shape[] = [];
  // 去掉首尾重复的闭合点,避免三角化退化
  const open = (ring: Ring): Ring =>
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  for (const poly of mp) {
    if (poly.length === 0) continue;
    const outer = open(poly[0]);
    const shape = new THREE.Shape(
      outer.map(([x, y]) => new THREE.Vector2(x, y)),
    );
    for (let h = 1; h < poly.length; h++) {
      shape.holes.push(
        new THREE.Path(open(poly[h]).map(([x, y]) => new THREE.Vector2(x, y))),
      );
    }
    shapes.push(shape);
  }
  return shapes;
}

/** 花型包围盒(mm) */
export function patternBounds(mp: MultiPolygon): {
  min: Pt;
  max: Pt;
} | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const poly of mp)
    for (const ring of poly)
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
  if (!isFinite(minX)) return null;
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}
