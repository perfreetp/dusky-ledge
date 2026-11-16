/** 要素类型：网箱、浮标、锚链、航标、警戒区、航道 */
export type FeatureType =
  | 'cage'
  | 'buoy'
  | 'chain'
  | 'marker'
  | 'warningZone'
  | 'channel';

/** 四个业务图层 */
export type LayerId = 'cage' | 'chain' | 'warning' | 'channel';

export type ProjectStatus =
  | 'editing' // 制作中
  | 'submitted' // 已提交待审
  | 'returned' // 退回返工
  | 'approved' // 主管通过
  | 'delivered'; // 已打包交付

export type UserRole = 'maker' | 'supervisor';

export interface Feature {
  /** 项目内唯一编号，同时也是业务编号（如 WX-00001） */
  id: string;
  type: FeatureType;
  /** 当前图层归属（框选可改） */
  layer: LayerId;
  /** 世界坐标，单位米；y 一般为海平面 0 */
  x: number;
  y: number;
  z: number;
  /** 特征半径 / 主尺寸（米） */
  radius: number;
  /** 网衣深度 / 锚链入水深度 / 警戒区壁高 */
  depth: number;
  /** 朝向（弧度，绕 Y 轴） */
  heading: number;
  /** 投放日期 YYYY-MM-DD */
  deployDate: string;
  /** 非均匀尺寸或锚链端点等附加参数 */
  extra?: {
    sx?: number;
    sy?: number;
    sz?: number;
    /** 锚链末端相对偏移 */
    ex?: number;
    ez?: number;
  };
}

/** 主管在视口里圈出的退回位置 */
export interface ReworkCircle {
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface Rework {
  id: string;
  reason: string;
  circle: ReworkCircle;
  at: number;
}

export interface ProjectMeta {
  id: string;
  /** 养殖区名称，一个养殖区立一个项目 */
  zone: string;
  status: ProjectStatus;
  createdAt: number;
  /** 交付截止时间 */
  deadline: number;
  /** 要素生成种子（确定性，上万要素不入库） */
  seed: number;
  /** 返工记录，最多 3 次 */
  reworks: Rework[];
  /** 框选改图层归属：featureId -> LayerId */
  layerOverrides: Record<string, LayerId>;
  submittedAt?: number;
  approvedAt?: number;
  deliveredAt?: number;
}

export interface MeasurePoint {
  x: number;
  y: number;
  z: number;
}
