import type { Vec3 } from '@pg/shared';
import { vec3 } from '@pg/geom-kernel';
import type { ForwardKinematicsResult, JointPose, RobotConfig } from './types.js';

/** 4x4 齐次矩阵，列主序（与 WebGPU/three 习惯一致） */
export type Mat4 = number[];

export function identity(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row]! * b[col * 4 + k]!;
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  const x = p[0];
  const y = p[1];
  const z = p[2];
  return [
    m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
    m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
    m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
  ];
}

export function transformDir(m: Mat4, d: Vec3): Vec3 {
  return vec3.normalize([
    m[0]! * d[0] + m[4]! * d[1] + m[8]! * d[2],
    m[1]! * d[0] + m[5]! * d[1] + m[9]! * d[2],
    m[2]! * d[0] + m[6]! * d[1] + m[10]! * d[2],
  ]);
}

/** 改进 DH 变换：Rx(α)·Dx(a)·Rz(θ)·Dz(d) */
export function dhTransform(alpha: number, a: number, d: number, theta: number): Mat4 {
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  return [
    ct,
    st * ca,
    st * sa,
    0,
    -st,
    ct * ca,
    ct * sa,
    0,
    0,
    -sa,
    ca,
    0,
    a * ct,
    a * st,
    d,
    1,
  ];
}

function translation(p: Vec3): Mat4 {
  const m = identity();
  m[12] = p[0];
  m[13] = p[1];
  m[14] = p[2];
  return m;
}

/**
 * 正运动学：逐关节累积 DH 变换，输出每个关节在世界坐标下的位姿。
 * angles 以 jointId 为键，缺省取 defaultAngle。
 */
export function forwardKinematics(
  robot: RobotConfig,
  angles: Record<string, number>,
): ForwardKinematicsResult {
  let T = translation(robot.baseOrigin);
  const poses: JointPose[] = [];

  for (const joint of robot.joints) {
    const angle = angles[joint.id] ?? joint.defaultAngle;
    const jointT = dhTransform(joint.alpha, joint.a, joint.d, angle);
    T = multiply(T, jointT);
    const origin = transformPoint(T, [0, 0, 0]);
    const axisDir = transformDir(T, joint.axis);
    poses.push({
      jointId: joint.id,
      origin,
      axisDir,
      angle,
      inRange: angle >= joint.minAngle && angle <= joint.maxAngle,
    });
  }

  return { poses, toolPosition: transformPoint(T, [0, 0, 0]) };
}

/** 校验关节角是否在活动范围内，返回越界关节 id */
export function findOutOfRangeJoints(
  robot: RobotConfig,
  angles: Record<string, number>,
): string[] {
  return robot.joints
    .filter((j) => {
      const angle = angles[j.id] ?? j.defaultAngle;
      return angle < j.minAngle || angle > j.maxAngle;
    })
    .map((j) => j.id);
}
