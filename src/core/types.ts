// 全局类型定义：建模特征树、剖切、作业与提交

export type PrimitiveType = 'box' | 'cylinder' | 'frustum';
export type BoolOp = 'add' | 'subtract' | 'intersect';
export type Vec3Tuple = [number, number, number];

export interface BoxDims {
  width: number; // X
  height: number; // Y
  depth: number; // Z
}
export interface CylinderDims {
  radius: number;
  height: number; // 轴向 Y
  segments: number;
}
export interface FrustumDims {
  bottom: number; // 下底外接边长/直径
  top: number; // 上底外接边长/直径
  height: number; // 轴向 Y
  segments: number; // 4 = 四棱台，越大越接近圆台
}
export type Dims = BoxDims | CylinderDims | FrustumDims;

export interface Feature {
  id: string;
  type: PrimitiveType;
  op: BoolOp;
  name: string;
  dims: Dims;
  position: Vec3Tuple;
}

export interface ClipState {
  enabled: boolean;
  point: Vec3Tuple;
  normal: Vec3Tuple;
  showHatch: boolean;
  hatchGap: number; // 模型单位下的剖面线间距
}

export interface ModelState {
  featureSeq: number;
  features: Feature[];
  clip: ClipState;
}

// 面编号约定
// box:      0 +X, 1 -X, 2 +Y, 3 -Y, 4 +Z, 5 -Z
// cylinder: 0 侧面, 1 顶面(+Y), 2 底面(-Y)
// frustum:  0 侧面, 1 顶面(+Y), 2 底面(-Y)
export const FACE_SIDE = 0;
export const FACE_TOP = 1;
export const FACE_BOTTOM = 2;

export interface FaceRef {
  featureId: string;
  faceId: number;
  isCap: boolean; // 是否为剖切面（不可直接编辑尺寸）
}

export interface SnapPoint {
  p: Vec3Tuple;
  kind: 'vertex' | 'edge-mid' | 'face-center';
}

// ---------- 作业 / 提交 / 看板 ----------

export interface AssignmentSpec {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  // 尺寸要求（单位 mm），用于自动核对
  targetVolume: number; // 期望体积
  volumeTolerance: number; // 相对容差，如 0.05 = ±5%
  requireThreeViews: boolean; // 是否要求三视图
  requiredOps: BoolOp[]; // 要求使用的布尔运算
  minFeatures: number;
}

export type CheckItemStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  item: string;
  status: CheckItemStatus;
  detail: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentName: string;
  submittedAt: number;
  model: ModelState;
  volume: number;
  viewCount: number;
  checks: CheckResult[];
  autoPassed: boolean;
  score: number | null; // 老师复核打分（百分制）
  teacherComment: string;
  gradedAt: number | null;
}

export type Role = 'student' | 'teacher';

export interface Profile {
  role: Role;
  name: string;
}
