import type { Vec3 } from '@pg/shared';

/** 单个关节：改进 DH 参数 + 活动范围 */
export interface JointSpec {
  id: string;
  /** 关节轴方向（相对当前连杆坐标系，单位向量） */
  axis: Vec3;
  /** DH: 连杆扭转角 α (rad) */
  alpha: number;
  /** DH: 连杆长度 a (mm) */
  a: number;
  /** DH: 连杆偏距 d (mm) */
  d: number;
  /** 关节角下限 (rad) */
  minAngle: number;
  /** 关节角上限 (rad) */
  maxAngle: number;
  /** 默认关节角 (rad) */
  defaultAngle: number;
  /** 活动包络：绕关节轴/连杆区域的允许半径 (mm) */
  envelopeRadius: number;
  /** 活动包络：轴向半长 (mm) */
  envelopeHalfLength: number;
}

export interface RobotConfig {
  id: string;
  name: string;
  /** 基座位置（世界坐标） */
  baseOrigin: Vec3;
  joints: JointSpec[];
}

export interface JointPose {
  jointId: string;
  /** 关节坐标系原点（世界坐标） */
  origin: Vec3;
  /** 关节轴方向（世界坐标，单位向量） */
  axisDir: Vec3;
  angle: number;
  inRange: boolean;
}

export interface ForwardKinematicsResult {
  poses: JointPose[];
  /** 末端法兰位置 */
  toolPosition: Vec3;
}
