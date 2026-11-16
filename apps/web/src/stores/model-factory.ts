import type { ControlPoint, InterpolationType, ProjectRules, SplineModel, Vec3 } from '@pg/shared';
import { DEFAULT_PROJECT_RULES } from '@pg/shared';

let seq = 0;
export function newId(prefix = 'cp'): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function makeControlPoint(position: Vec3, jointId: string): ControlPoint {
  return { id: newId(), position, weight: 1, jointId };
}

/** 新编辑器的默认演示样条（沿 J1→J3） */
export function demoControlPoints(): ControlPoint[] {
  return [
    makeControlPoint([0, 0, 0], 'J1'),
    makeControlPoint([80, 0, 0], 'J1'),
    makeControlPoint([160, 40, 20], 'J2'),
    makeControlPoint([200, 120, 40], 'J2'),
    makeControlPoint([160, 200, 60], 'J3'),
  ];
}

export interface EditorState {
  projectId: string | null;
  projectCode: string;
  modelName: string;
  interpolation: InterpolationType;
  controlPoints: ControlPoint[];
  rules: ProjectRules;
  jointAngles: Record<string, number>;
  selectedId: string | null;
  showInner: boolean;
  showOuter: boolean;
  showComb: boolean;
  dirty: boolean;
}

/** JSON 深拷贝：模型要求可序列化（structuredClone 无法克隆 Pinia 响应式 Proxy） */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildSplineModel(state: EditorState): SplineModel {
  const now = new Date().toISOString();
  return {
    version: 0,
    name: state.modelName,
    interpolation: state.interpolation,
    controlPoints: deepClone(state.controlPoints),
    rules: deepClone(state.rules),
    jointAngles: deepClone(state.jointAngles),
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultRules(): ProjectRules {
  return deepClone(DEFAULT_PROJECT_RULES);
}
