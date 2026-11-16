/**
 * 纯数据几何类型与网格工具。所有核心层坐标使用右手系 y-up：
 * x 东、y 高程、z 南。
 */

export type Vec3 = [number, number, number];

export interface Mesh {
  /** 交错顶点：position(3) + normal(3)，每顶点 6 个 float。 */
  vertices: Float32Array;
  indices: Uint32Array;
  /** 轴对齐包围盒，拾取粗筛使用。 */
  bbox: { min: Vec3; max: Vec3 };
}

/** 扫掠标架站：中心点、切向 T、横向 N（右）、纵向 B（上）。 */
export interface Station {
  center: Vec3;
  tangent: Vec3;
  right: Vec3;
  up: Vec3;
  /** 该站洞底世界高程（压平后的地板 y）。 */
  floorY: number;
  /** 累计弧长（米）。 */
  length: number;
}

export interface SpeleoTier {
  key: 'small' | 'medium' | 'large';
  label: string;
  heightMin: number;
  heightMax: number;
  /** 半径相对高度的比例区间。 */
  radiusRatioMin: number;
  radiusRatioMax: number;
}

export const SPELEO_TIERS: SpeleoTier[] = [
  { key: 'small', label: '小型 · 石针', heightMin: 0.3, heightMax: 1.0, radiusRatioMin: 0.06, radiusRatioMax: 0.12 },
  { key: 'medium', label: '中型 · 石柱', heightMin: 1.0, heightMax: 2.5, radiusRatioMin: 0.08, radiusRatioMax: 0.16 },
  { key: 'large', label: '大型 · 石幔', heightMin: 2.5, heightMax: 5.0, radiusRatioMin: 0.1, radiusRatioMax: 0.2 },
];

/** 步道净空要求（米）：步道面以上必须保持无石尖的高度。 */
export const TRAIL_CLEARANCE_M = 2.2;

export interface SpeleoInstance {
  id: string;
  tierIndex: number;
  /** 根部（洞顶附着点）世界坐标。 */
  root: Vec3;
  /** 生长方向（单位向量，指向下）。 */
  axis: Vec3;
  height: number;
  radius: number;
  /** 实例自身形态种子（替换时改变，其它实例不受影响）。 */
  shapeSeed: number;
  /** 包围盒。 */
  bbox: { min: Vec3; max: Vec3 };
}

export interface LightEntity {
  id: string;
  /** 归一化里程 [0,1]。 */
  s: number;
  position: Vec3;
  color: Vec3;
  intensity: number;
}

export interface TrailPath {
  /** 按里程采样的步道中心线世界坐标。 */
  points: Vec3[];
  /** 对应每个点的归一化里程。 */
  sValues: number[];
  width: number;
}

export interface GenStats {
  tunnelTris: number;
  speleoCount: number;
  speleoByTier: [number, number, number];
  rejectedByClearance: number;
  elapsedMs: number;
}
