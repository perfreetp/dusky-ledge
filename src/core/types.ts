// ===== 全局数据模型与枚举 =====

export type Role = 'coach' | 'animator' | 'director';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export type Difficulty = '入门' | '初级' | '中级' | '高级' | '专业';

export type OrderStatus =
  | 'draft'        // 教练刚建单
  | 'assigned'     // 已分派
  | 'in_progress'  // 动画师制作中
  | 'submitted'    // 已送审
  | 'rejected'     // 打回返工
  | 'approved';    // 通过归档

export interface Order {
  id: string;
  title: string;
  points: string;              // 动作要点
  difficulty: Difficulty;
  status: OrderStatus;
  creatorId: string;           // 教练
  assigneeId: string | null;   // 动画师
  projectId: string | null;
  reworkCount: number;
  rejectReason: string;
  createdAt: number;
  updatedAt: number;
}

export interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  // 相对父骨骼（根骨骼相对世界）的绑定姿态局部变换
  localPos: [number, number, number];
  localRot: [number, number, number, number]; // quaternion xyzw
  length: number;
  color: [number, number, number]; // 0..1 RGB，按骨骼颜色显示影响范围
}

export interface MeshData {
  name: string;
  positions: Float32Array; // vec3 * vcount
  normals: Float32Array;
  indices: Uint32Array;
  // 每顶点最多4个骨骼权重；weights[i*4+k] 为权重，boneIdx 为骨骼索引，-1 表示空槽
  weights: Float32Array;  // 每顶点4个
  boneIdx: Int32Array;    // 每顶点4个
}

export interface Keyframe {
  id: string;
  time: number; // 秒
  pos: [number, number, number];
  rot: [number, number, number, number];
  // 切线手柄：贝塞尔缓动控制柄 x（y 固定为 0/1），用于缓入缓出；segmentLinear 时匀速
  inX: number;  // 入柄控制时间，默认 0.75
  outX: number; // 出柄控制时间，默认 0.25
}

export interface Track {
  boneId: string;
  keys: Keyframe[]; // 按 time 升序
}

export interface Clip {
  id: string;
  name: string;
  duration: number; // 秒
  fps: number;
  tracks: Track[];
}

export interface ExportRecord {
  at: number;
  frameCount: number;
  startFrame: number; // 再导出对齐用的起始帧号
  clipId: string;
  clipName: string;
  zipName: string;
}

export interface AnimationVersion {
  id: string;
  label: string;
  clip: Clip;
  note: string;
  createdAt: number;
  exports: ExportRecord[];
  submittedForReview: boolean; // 提交送审时选中的版本
}

export interface Project {
  id: string;
  orderId: string | null;
  name: string;
  skeleton: Bone[];
  mesh: MeshData | null;
  versions: AnimationVersion[];
  activeVersionId: string | null;
  groundY: number;
  showBones: boolean;
  showMesh: boolean;
  showWeightColor: boolean;
  showPenetration: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DBShape {
  users: User[];
  orders: Order[];
  projects: Project[];
  currentUserId: string | null;
}
