// ===== 项目工厂 =====
import type { Project } from './types';
import { createDefaultSkeleton } from './skeleton';
import { uid } from './math';

export function createProject(name: string, orderId: string | null): Project {
  const now = Date.now();
  return {
    id: uid('prj'),
    orderId,
    name,
    skeleton: createDefaultSkeleton(),
    mesh: null,
    versions: [],
    activeVersionId: null,
    groundY: 0,
    showBones: true,
    showMesh: true,
    showWeightColor: false,
    showPenetration: true,
    createdAt: now,
    updatedAt: now
  };
}
