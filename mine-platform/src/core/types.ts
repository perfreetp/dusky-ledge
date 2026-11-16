// 核心数据模型 —— 巷道测量、断面、图层对象与档案
export type Vec3 = [number, number, number];

export type LayerId = 'roadway' | 'support' | 'pipeline' | 'door' | 'equipment';

export const LAYER_ORDER: LayerId[] = ['roadway', 'support', 'pipeline', 'door', 'equipment'];

export const LAYER_META: Record<LayerId, { name: string; color: string; desc: string }> = {
  roadway: { name: '巷道体块', color: '#8fa3bf', desc: '中心线+断面参数扫掠生成的巷道实体' },
  support: { name: '支护', color: '#d9a441', desc: '钢拱架、锚杆/螺栓，远景自动降级简模' },
  pipeline: { name: '管线', color: '#4fc3f7', desc: '给排水、压风、瓦斯抽采等管线' },
  door: { name: '风门', color: '#ff7a59', desc: '风门/风墙设施' },
  equipment: { name: '机电设备', color: '#9ccc65', desc: '绞车、水泵、变电、风机等机电硐室设备' },
};

/** 断面形状 */
export type SectionType = 'arch' | 'rect' | 'circle';

/** 断面参数（米）。arch=直墙半圆拱，rect=矩形，circle=圆形 */
export interface SectionParams {
  type: SectionType;
  width: number;
  height: number;
  /** 圆拱半径（arch 时一般为 width/2，可被覆盖） */
  radius?: number;
}

/** 巷道用途/类型 */
export type RoadwayPurpose = 'haulage' | 'return' | 'intake' | 'development' | 'chamber';

export const PURPOSE_LABEL: Record<RoadwayPurpose, string> = {
  haulage: '运输巷',
  return: '回风巷',
  intake: '进风巷',
  development: '掘进巷',
  chamber: '硐室',
};

/** 一条命名巷道（逻辑对象，点选/高亮的单位） */
export interface Roadway {
  id: string;
  name: string;
  district: string; // 采区
  purpose: RoadwayPurpose;
  section: SectionParams;
  levelMin: number; // 标高区间（米，绝对标高）
  levelMax: number;
  length: number; // 累计长度（米）
  centerline: Vec3[]; // 测量中心线，局部矿山坐标（米）
  period: 1 | 2;
  /** 两期对比状态：new=本期新增，abandoned=本期废弃，common=共有 */
  diffStatus: 'common' | 'new' | 'abandoned';
  supportSpacing: number; // 支护间距（米）
  buildYear: number;
}

export interface PipelineInfo {
  id: string;
  roadwayId: string;
  kind: 'water' | 'air' | 'gas' | 'power';
  radius: number;
  /** 相对巷道断面中心的侧向偏移（米） */
  offset: number;
  height: number; // 吊挂高度（米，相对底板）
}

export const PIPELINE_KIND_LABEL: Record<PipelineInfo['kind'], string> = {
  water: '给排水管',
  air: '压风管',
  gas: '瓦斯抽采管',
  power: '电缆桥架',
};

export interface DoorInfo {
  id: string;
  roadwayId: string;
  position: Vec3;
  kind: '风门' | '风墙' | '调节风窗';
  size: [number, number];
}

export type EquipmentKind =
  | '绞车'
  | '水泵'
  | '变电站'
  | '局部通风机'
  | '皮带机头'
  | '移变站';

export interface EquipmentInfo {
  id: string;
  roadwayId: string;
  position: Vec3;
  kind: EquipmentKind;
  size: [number, number, number];
  power: number; // kW
}

/** 一期完整测量数据集 */
export interface MineDataset {
  period: 1 | 2;
  label: string;
  roadways: Roadway[];
  pipelines: PipelineInfo[];
  doors: DoorInfo[];
  equipment: EquipmentInfo[];
  totalLength: number;
  bounds: { min: Vec3; max: Vec3 };
}

// ---------- 档案 ----------
export type ArchiveStatus = 'raw' | 'processed' | 'archived';

/** 原始测量文件建档 */
export interface MeasurementArchive {
  id: string; // 档案编号，如 CL-2026-0007
  fileName: string;
  uploadedAt: string; // ISO
  roadwayCount: number;
  pointCount: number;
  totalLength: number;
  district: string;
  period: 1 | 2;
  status: ArchiveStatus;
  note?: string;
  /** 解析后的巷道快照（加工原料） */
  roadwayIds: string[];
}

/** 加工图档版本 */
export interface DrawingVersion {
  id: string; // GT-...
  basedOn: string; // 来源档案编号
  version: string; // v1.0.0
  createdAt: string;
  period: 1 | 2;
  roadwayCount: number;
  totalLength: number;
  note: string;
  status: ArchiveStatus;
  /** 该版本包含的巷道 id 及每条巷道的几何指纹 */
  fingerprints: Record<string, string>;
}

export interface DiffEntry {
  roadwayId: string;
  name: string;
  change: 'added' | 'removed' | 'geometry' | 'meta' | 'unchanged';
  detail: string;
  lengthDelta?: number;
}

export interface DiffReport {
  id: string;
  fromVersion: string;
  toVersion: string;
  createdAt: string;
  entries: DiffEntry[];
  summary: { added: number; removed: number; geometry: number; meta: number; unchanged: number };
  lengthDelta: number;
}
