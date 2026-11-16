import { savePlan, saveTask, upsertWorkshop, type Db } from './db';
import { sampleBaseDoc, sampleReferenceDoc, sampleWorkshopDoc } from '../shared/samples';
import type { TrainingRequirements } from '../shared/types';

export const DEMO_REQUIREMENTS: TrainingRequirements = {
  expected: {
    'main-channel': { width: 100, count: 2, required: true },
    walkway: { width: 100, count: 3, required: true },
    'fire-lane': { width: 120, count: 1, required: true },
    'no-park': { width: 100, count: 1, required: true },
    station: { width: 50, count: 6, required: true },
    material: { width: 100, count: 1, required: true },
    hazard: { width: 100, count: 2, required: true },
  },
  positionTolerance: 300,
  widthTolerance: 0.15,
  weights: { coverage: 0.5, width: 0.3, closure: 0.2 },
  notes:
    '按《车间地面安全标线规范》绘制：主通道 100mm 黄实线、人行道 100mm 绿实线、消防通道 120mm 红实线、禁停区黄黑斜纹、工位框 50mm 白虚线。',
};

/** Create the demo workshop, plan and training task on an empty database. */
export function seedDemo(db: Db): { workshopId: string; planId: string; taskId: string } {
  const workshop = upsertWorkshop(db, {
    name: '一号机加车间',
    code: 'WS-01',
    description: '含 6 个加工工位、主物流通道与两处危险作业区',
  });
  const doc = sampleWorkshopDoc();
  doc.workshopId = workshop.id;
  const plan = savePlan(
    db,
    { name: doc.name, workshopId: workshop.id, doc },
    { createVersion: true, versionName: 'v1', versionNote: '初始标线总图', author: 'EHS 管理员' }
  );
  const task = saveTask(db, {
    title: '机加工车间标线实操考核（第一期）',
    description: '在空白厂房底图上，按规范复现通道、人行道、消防通道、禁停区与工位框。',
    workshopId: workshop.id,
    baseDoc: sampleBaseDoc(),
    referenceDoc: sampleReferenceDoc(),
    requirements: DEMO_REQUIREMENTS,
    createdBy: '培训老师',
    published: true,
  });
  return { workshopId: workshop.id, planId: plan.id, taskId: task.id };
}
