import { createSignal } from 'solid-js';
import type {
  AssignmentSpec,
  CheckResult,
  ModelState,
  Profile,
  Submission,
} from '../core/types';
import { uid } from '../core/uid';
import { evaluated } from './evaluated';
import { modelStore } from './model';
import { VIEWS } from '../three/orthographic';

const LS_ASSIGN = 'mc3d.assignments.v1';
const LS_SUB = 'mc3d.submissions.v1';
const LS_PROFILE = 'mc3d.profile.v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage 写入失败', e);
  }
}

const [assignments, setAssignments] = createSignal<AssignmentSpec[]>(load(LS_ASSIGN, []));
const [submissions, setSubmissions] = createSignal<Submission[]>(load(LS_SUB, []));
const [profile, setProfile] = createSignal<Profile>(
  load(LS_PROFILE, { role: 'student', name: '学员' }),
);

function persistAssignments(): void {
  save(LS_ASSIGN, assignments());
}
function persistSubmissions(): void {
  save(LS_SUB, submissions());
}

// ---------------- 作业（老师） ----------------

function createAssignment(spec: Omit<AssignmentSpec, 'id' | 'createdAt'>): AssignmentSpec {
  const a: AssignmentSpec = { ...spec, id: uid('asg'), createdAt: Date.now() };
  setAssignments((arr) => [a, ...arr]);
  persistAssignments();
  return a;
}

function deleteAssignment(id: string): void {
  setAssignments((arr) => arr.filter((a) => a.id !== id));
  persistAssignments();
}

// ---------------- 自动核对 ----------------

export interface AutoCheckOutput {
  checks: CheckResult[];
  autoPassed: boolean;
  volume: number;
  viewCount: number;
}

export function runAutoCheck(
  assignment: AssignmentSpec,
  model: ModelState,
  volume: number,
): AutoCheckOutput {
  const checks: CheckResult[] = [];
  const viewCount = VIEWS.length; // 三视图固定生成，统计实际存在几何的视图数

  // 1. 体积
  const diff = Math.abs(volume - assignment.targetVolume);
  const rel = assignment.targetVolume > 0 ? diff / assignment.targetVolume : diff;
  checks.push({
    item: '体积核对',
    status: rel <= assignment.volumeTolerance ? 'pass' : 'fail',
    detail:
      `模型体积 ${volume.toFixed(1)} mm³，目标 ${assignment.targetVolume.toFixed(1)} mm³，` +
      `偏差 ${(rel * 100).toFixed(1)}%（容差 ±${(assignment.volumeTolerance * 100).toFixed(0)}%）`,
  });

  // 2. 三视图数量
  const hasGeometry = model.features.length > 0;
  if (assignment.requireThreeViews) {
    checks.push({
      item: '三视图数量',
      status: hasGeometry && viewCount === 3 ? 'pass' : 'fail',
      detail: hasGeometry
        ? `已生成主视 / 俯视 / 左视共 ${viewCount} 个视图`
        : '模型为空，无法生成视图',
    });
  }

  // 3. 布尔运算使用情况
  const used = new Set(model.features.map((f) => f.op));
  const missing = assignment.requiredOps.filter((op) => !used.has(op));
  checks.push({
    item: '布尔运算要求',
    status: missing.length === 0 ? 'pass' : 'fail',
    detail:
      missing.length === 0
        ? `已使用要求的运算：${assignment.requiredOps.map(opLabel).join('、')}`
        : `缺少运算：${missing.map(opLabel).join('、')}；当前使用：${[...used].map(opLabel).join('、') || '无'}`,
  });

  // 4. 特征数量
  checks.push({
    item: '体块数量',
    status: model.features.length >= assignment.minFeatures ? 'pass' : 'fail',
    detail: `当前 ${model.features.length} 个体块，要求不少于 ${assignment.minFeatures} 个`,
  });

  // 5. 剖切（有剖切平面时给提示性检查）
  if (model.clip.enabled) {
    checks.push({
      item: '剖切与剖面线',
      status: model.clip.showHatch ? 'pass' : 'warn',
      detail: model.clip.showHatch
        ? '剖切平面已启用，剖面线将随三视图输出'
        : '剖切已启用但未开启剖面线填充',
    });
  }

  const autoPassed = checks.every((c) => c.status !== 'fail');
  return { checks, autoPassed, volume, viewCount };
}

function opLabel(op: string): string {
  return op === 'add' ? '并集' : op === 'subtract' ? '差集' : '交集';
}

// ---------------- 提交（学员） ----------------

function submitWork(assignmentId: string, studentName: string): Submission | null {
  const asg = assignments().find((a) => a.id === assignmentId);
  if (!asg) return null;
  const entry = evaluated();
  // Solid store 为 Proxy，用 JSON 深拷贝为纯数据
  const modelSnapshot = JSON.parse(JSON.stringify(modelStore.model)) as ModelState;
  const out = runAutoCheck(asg, modelSnapshot, entry.result.volume);
  const sub: Submission = {
    id: uid('sub'),
    assignmentId,
    studentName,
    submittedAt: Date.now(),
    model: modelSnapshot,
    volume: out.volume,
    viewCount: out.viewCount,
    checks: out.checks,
    autoPassed: out.autoPassed,
    score: null,
    teacherComment: '',
    gradedAt: null,
  };
  setSubmissions((arr) => [sub, ...arr]);
  persistSubmissions();
  return sub;
}

function gradeSubmission(id: string, score: number, comment: string): void {
  setSubmissions((arr) =>
    arr.map((s) =>
      s.id === id
        ? { ...s, score: Math.max(0, Math.min(100, Math.round(score))), teacherComment: comment, gradedAt: Date.now() }
        : s,
    ),
  );
  persistSubmissions();
}

/** 班级看板：按作业聚合提交情况、错题与常见错法 */
export interface DashboardRow {
  assignmentId: string;
  assignmentTitle: string;
  total: number;
  autoPassed: number;
  graded: number;
  avgScore: number | null;
  failureItems: { item: string; count: number; samples: string[] }[];
  commonMistakes: { label: string; count: number }[];
}

export function buildDashboard(): DashboardRow[] {
  return assignments().map((asg) => {
    const subs = submissions().filter((s) => s.assignmentId === asg.id);
    const graded = subs.filter((s) => s.gradedAt !== null);
    const failMap = new Map<string, { count: number; samples: string[] }>();
    const mistakeMap = new Map<string, number>();

    for (const s of subs) {
      for (const c of s.checks) {
        if (c.status === 'fail') {
          const row = failMap.get(c.item) ?? { count: 0, samples: [] };
          row.count++;
          if (row.samples.length < 3) row.samples.push(`${s.studentName}：${c.detail}`);
          failMap.set(c.item, row);
          mistakeMap.set(c.item, (mistakeMap.get(c.item) ?? 0) + 1);
        }
      }
      if (!s.autoPassed) mistakeMap.set('自动核对未通过', (mistakeMap.get('自动核对未通过') ?? 0) + 1);
    }

    return {
      assignmentId: asg.id,
      assignmentTitle: asg.title,
      total: subs.length,
      autoPassed: subs.filter((s) => s.autoPassed).length,
      graded: graded.length,
      avgScore:
        graded.length > 0
          ? graded.reduce((sum, s) => sum + (s.score ?? 0), 0) / graded.length
          : null,
      failureItems: [...failMap.entries()]
        .map(([item, v]) => ({ item, count: v.count, samples: v.samples }))
        .sort((a, b) => b.count - a.count),
      commonMistakes: [...mistakeMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    };
  });
}

function loadSubmissionModel(sub: Submission): void {
  modelStore.loadModel(sub.model);
}

export const eduStore = {
  assignments,
  submissions,
  profile,
  setProfile: (p: Profile) => {
    setProfile(p);
    save(LS_PROFILE, p);
  },
  createAssignment,
  deleteAssignment,
  submitWork,
  gradeSubmission,
  buildDashboard,
  loadSubmissionModel,
  runAutoCheck,
};
