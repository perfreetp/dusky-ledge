/** 应用层共享类型（核心生成、状态、持久化通用）。 */
import type { GenStats, LightEntity, Mesh, SpeleoInstance, Station, TrailPath } from './core/geometry';

export interface ControlPoint {
  x: number;
  y: number;
  z: number;
}

export interface GenParams {
  controlPoints: ControlPoint[];
  /** 断面宽度（米，洞体最大横向尺寸）。 */
  tunnelWidth: number;
  /** 断面高度（米）。 */
  tunnelHeight: number;
  /** 滴水密度（每平方米洞顶候选格的成石概率基准，0~1 映射）。 */
  dripDensity: number;
  trailWidth: number;
  /** 每环顶点数，默认 24。 */
  ringSegments: number;
  /** 站间距（米），默认 1.2。 */
  stationStep: number;
}

export interface TrailOverride {
  /** 归一化弧长锚点 [0,1]。 */
  s: number;
  /** 相对自动线位的横向偏移（米，正=洞体 right 方向）。 */
  lateral: number;
  /** 竖向偏移（米）。 */
  up: number;
}

export interface ReplacedSpeleo {
  id: string;
  seed: number;
}

export interface Overrides {
  trail: TrailOverride[];
  speleo: {
    deleted: string[];
    replaced: ReplacedSpeleo[];
  };
}

export function emptyOverrides(): Overrides {
  return { trail: [], speleo: { deleted: [], replaced: [] } };
}

export interface GenResult {
  tunnel: Mesh;
  trail: Mesh;
  trailPath: TrailPath;
  speleo: {
    /** 三档各一个回转体原型 Mesh。 */
    prototypes: Mesh[];
    instances: SpeleoInstance[];
  };
  lights: LightEntity[];
  stations: Station[];
  stats: GenStats;
}

export type LayerKey = 'tunnel' | 'speleo' | 'trail' | 'lights';
export type LayerVisibility = Record<LayerKey, boolean>;

export type Role = 'reviewer' | 'maker';

export type AnnotationStatus = 'open' | 'inProgress' | 'resolved' | 'rejected';

export interface AnnotationReply {
  id: string;
  role: Role;
  body: string;
  createdAt: number;
}

export interface AnnotationAnchor {
  /** 归一化里程。 */
  s: number;
  /** 局部坐标：沿站 right / up 的偏移（米）。 */
  local: [number, number];
  /** 打点时的世界坐标快照，重投影失败时兜底显示。 */
  worldSnapshot: [number, number, number];
  stale?: boolean;
}

export interface Annotation {
  id: string;
  versionId: string;
  anchor: AnnotationAnchor;
  authorRole: Role;
  body: string;
  createdAt: number;
  status: AnnotationStatus;
  replies: AnnotationReply[];
}

export interface VersionSnapshot {
  id: string;
  parentId?: string;
  createdAt: number;
  label: string;
  seed: number;
  params: GenParams;
  overrides: Overrides;
  stats: GenStats;
}

/** 图层默认全开。 */
export function defaultLayers(): LayerVisibility {
  return { tunnel: true, speleo: true, trail: true, lights: true };
}

export function defaultParams(): GenParams {
  // 一条略带 S 弯的示范走向，平面图上即可编辑。
  return {
    controlPoints: [
      { x: 0, y: 0, z: 0 },
      { x: 12, y: 1, z: 6 },
      { x: 8, y: 0.5, z: 18 },
      { x: 18, y: 2, z: 30 },
      { x: 10, y: 1, z: 42 },
    ],
    tunnelWidth: 6,
    tunnelHeight: 4.2,
    dripDensity: 0.35,
    trailWidth: 1.4,
    ringSegments: 24,
    stationStep: 1.2,
  };
}
