import type { JointEnvelope } from '@pg/geom-kernel';
import type { RobotConfig } from './types.js';
import { forwardKinematics } from './fk.js';

/**
 * 按当前关节姿态生成每个关节的活动包络（圆柱），
 * 供 geom-kernel 的 checkEnvelope 使用。
 */
export function buildEnvelopes(
  robot: RobotConfig,
  angles: Record<string, number>,
): JointEnvelope[] {
  const fk = forwardKinematics(robot, angles);
  return robot.joints.map((joint, i) => ({
    jointId: joint.id,
    axisOrigin: fk.poses[i]!.origin,
    axisDir: fk.poses[i]!.axisDir,
    radius: joint.envelopeRadius,
    halfLength: joint.envelopeHalfLength,
  }));
}
