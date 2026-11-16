import type { Feature, FeatureKind, FeatureStyle, HatchStyle, Pt } from '@shared/types';
import { strokeOutline, unionPolygons } from './clipper';
import { dist, rectFromPoints, type Rect, unionBounds, dedupeLine } from './math';

export interface KindPreset {
  kind: FeatureKind;
  label: string;
  short: string;
  geom: 'path' | 'area';
  description: string;
  style: FeatureStyle;
  spec: string;
  color: string;
}

export const KIND_PRESETS: Record<FeatureKind, KindPreset> = {
  'main-channel': {
    kind: 'main-channel',
    label: '主通道线',
    short: '通道',
    geom: 'path',
    description: '车间主物流通道边线，通道净宽不小于 1.2m',
    spec: 'GB 2894 / 厂内 EHS：黄色实线 100mm，转角圆弧过渡',
    color: '#f2c200',
    style: {
      lineWidth: 100,
      outlineWidth: 0,
      strokeColor: '#f2c200',
      fillColor: null,
      fillOpacity: 0,
      strokeStyle: 'solid',
      hatch: null,
    },
  },
  walkway: {
    kind: 'walkway',
    label: '人行通道',
    short: '人行',
    geom: 'path',
    description: '人员安全通道边线，建议绿色与物流通道区分',
    spec: '厂内 EHS：绿色实线 100mm，两侧边界连续闭合',
    color: '#1f9d55',
    style: {
      lineWidth: 100,
      outlineWidth: 0,
      strokeColor: '#1f9d55',
      fillColor: null,
      fillOpacity: 0,
      strokeStyle: 'solid',
      hatch: null,
    },
  },
  'fire-lane': {
    kind: 'fire-lane',
    label: '消防通道',
    short: '消防',
    geom: 'path',
    description: '消防车道/疏散通道，禁止占用，宽度不小于 4m',
    spec: 'GB 50016：红色实线 120mm，路口黄色网格禁止停车',
    color: '#e04545',
    style: {
      lineWidth: 120,
      outlineWidth: 0,
      strokeColor: '#e04545',
      fillColor: null,
      fillOpacity: 0,
      strokeStyle: 'solid',
      hatch: null,
    },
  },
  'no-park': {
    kind: 'no-park',
    label: '禁停区',
    short: '禁停',
    geom: 'area',
    description: '禁止停放物料、车辆的区域，黄黑斜纹填充',
    spec: '厂内 EHS：黄色/黑色 45° 斜纹，间距 200mm，外加 100mm 边框',
    color: '#f2c200',
    style: {
      lineWidth: 100,
      outlineWidth: 100,
      strokeColor: '#1a1a1a',
      fillColor: '#f2c200',
      fillOpacity: 0.1,
      strokeStyle: 'solid',
      hatch: {
        type: 'diagonal',
        spacing: 200,
        angle: 45,
        lineWidth: 60,
        color: '#f2c200',
        color2: '#1a1a1a',
        alpha: 1,
      },
    },
  },
  station: {
    kind: 'station',
    label: '工位框',
    short: '工位',
    geom: 'area',
    description: '设备/工位定位框，虚线边框，标注工位号',
    spec: '厂内 EHS：白色 50mm 虚线，工位内部留 500mm 安全间距',
    color: '#64748b',
    style: {
      lineWidth: 50,
      outlineWidth: 50,
      strokeColor: '#7b8798',
      fillColor: '#7c8698',
      fillOpacity: 0.06,
      strokeStyle: 'dashed',
      hatch: null,
    },
  },
  material: {
    kind: 'material',
    label: '物料暂存区',
    short: '物料',
    geom: 'area',
    description: '物料/半成品暂存区域，蓝色边框加浅色底',
    spec: '厂内 EHS：蓝色 100mm 实线 + 浅蓝底，堆放高度不超过 1.8m',
    color: '#3d7fd6',
    style: {
      lineWidth: 100,
      outlineWidth: 100,
      strokeColor: '#3d7fd6',
      fillColor: '#3d7fd6',
      fillOpacity: 0.1,
      strokeStyle: 'solid',
      hatch: null,
    },
  },
  hazard: {
    kind: 'hazard',
    label: '危险区域',
    short: '危险',
    geom: 'area',
    description: '机械臂、冲压、高温等危险作业半径',
    spec: '厂内 EHS：红白斜纹 45°，间距 150mm，红色 100mm 边框',
    color: '#d43f3f',
    style: {
      lineWidth: 100,
      outlineWidth: 100,
      strokeColor: '#d43f3f',
      fillColor: '#d43f3f',
      fillOpacity: 0.06,
      strokeStyle: 'solid',
      hatch: {
        type: 'diagonal',
        spacing: 150,
        angle: -45,
        lineWidth: 50,
        color: '#d43f3f',
        color2: '#ffffff',
        alpha: 0.9,
      },
    },
  },
};

export const KIND_ORDER: FeatureKind[] = ['main-channel', 'walkway', 'fire-lane', 'no-park', 'station', 'material', 'hazard'];

export function defaultHatch(): HatchStyle {
  return { type: 'diagonal', spacing: 200, angle: 45, lineWidth: 60, color: '#f2c200', color2: undefined, alpha: 1 };
}

let idCounter = 0;
export function uid(prefix = 'f'): string {
  idCounter = (idCounter + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}_${rand}`;
}

export function createFeature(kind: FeatureKind, overrides: Partial<Feature> = {}): Feature {
  const preset = KIND_PRESETS[kind];
  return {
    id: uid('ft'),
    kind,
    name: preset.label,
    geom: preset.geom,
    paths: [],
    rings: [],
    visible: true,
    locked: false,
    ...structuredClone(preset.style),
    ...overrides,
  };
}

/** Materialize a feature into closed rings for rendering / booleans. */
export function featureRings(f: Feature, cache?: Map<string, Pt[][]>): Pt[][] {
  if (f.geom === 'area') return f.rings;
  const key = `${f.id}:${f.lineWidth}:${f.paths.length}`;
  if (cache?.has(key)) return cache.get(key)!;
  const rings = strokeOutline(f.paths, Math.max(1, f.lineWidth), { join: 'miter', end: 'butt' });
  if (rings.length) cache?.set(key, rings);
  return rings;
}

/** Effective outer fill rings: area rings, or stroke band for path features. */
export function fillRings(f: Feature): Pt[][] {
  if (f.geom === 'area') return f.rings;
  return [];
}

export function featureAllPoints(f: Feature): Pt[] {
  const out: Pt[] = [];
  for (const p of f.paths) out.push(...p);
  for (const r of f.rings) out.push(...r);
  return out;
}

export function featureBounds(f: Feature): Rect {
  const all = featureAllPoints(f);
  if (!all.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return rectFromPoints(all);
}

export function featureBoundsInclStroke(f: Feature): Rect {
  const r = featureBounds(f);
  const pad = f.geom === 'path' ? f.lineWidth / 2 : 0;
  return { minX: r.minX - pad, minY: r.minY - pad, maxX: r.maxX + pad, maxY: r.maxY + pad };
}

export function boundsOfFeatures(features: Feature[]): Rect {
  const rects = features.map(featureBoundsInclStroke);
  if (!rects.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return unionBounds(rects);
}

/** Union all rings of the given features into one closed ring set. */
export function unionFeatures(features: Feature[]): Pt[][] {
  const rings: Pt[][] = [];
  for (const f of features) {
    const r = f.geom === 'area' ? f.rings : featureRings(f);
    rings.push(...r);
  }
  if (rings.length <= 1) return rings;
  return unionPolygons(rings);
}

/** Translate a whole feature. */
export function translateFeature(f: Feature, dx: number, dy: number): Feature {
  return {
    ...f,
    paths: f.paths.map((p) => p.map((q) => ({ x: q.x + dx, y: q.y + dy }))),
    rings: f.rings.map((p) => p.map((q) => ({ x: q.x + dx, y: q.y + dy }))),
  };
}

/** Snap a coordinate to a grid step (mm). */
export function snapValue(v: number, step: number): number {
  return step > 0 ? Math.round(v / step) * step : v;
}

/**
 * Check closure health of a feature:
 * - area: rings closed, enough points, no zero-length segments
 * - path: at least 2 points, consecutive duplicates removed
 */
export function closureReport(f: Feature): { closed: boolean; issues: string[] } {
  const issues: string[] = [];
  if (f.geom === 'area') {
    if (!f.rings.length) issues.push('没有封闭轮廓');
    for (const r of f.rings) {
      if (r.length < 3) issues.push('轮廓顶点不足 3 个');
      let zero = 0;
      for (let i = 0; i < r.length; i++) {
        const a = r[i];
        const b = r[(i + 1) % r.length];
        if (dist(a, b) < 1e-6) zero++;
      }
      if (zero > 0) issues.push(`存在 ${zero} 段零长度边`);
    }
  } else {
    if (!f.paths.some((p) => p.length >= 2)) issues.push('中心线没有有效线段');
    for (const p of f.paths) {
      if (dedupeLine(p).length !== p.length) issues.push('存在重复顶点');
    }
  }
  return { closed: issues.length === 0, issues };
}

export function styleToCss(style: Partial<FeatureStyle>): Record<string, string> {
  return {
    stroke: style.strokeColor ?? '#000',
    'stroke-width': String(style.lineWidth ?? 1),
    fill: style.fillColor ?? 'none',
    'fill-opacity': String(style.fillOpacity ?? 0),
  };
}
