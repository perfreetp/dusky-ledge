import type { Assignment, RosterEntry, Submission } from './assignment';

export interface AppState {
  version: 2;
  assignments: Assignment[];
  submissions: Submission[];
  roster: RosterEntry[];
  teacher: string;
}

const KEY = 'strata-voxel-lab/v2';

export function emptyState(): AppState {
  return { version: 2, assignments: [], submissions: [], roster: [], teacher: '任课教师' };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.assignments)) return emptyState();
    return {
      version: 2,
      assignments: parsed.assignments,
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      roster: Array.isArray(parsed.roster) ? parsed.roster : [],
      teacher: typeof parsed.teacher === 'string' ? parsed.teacher : '任课教师',
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[state] 保存失败', err);
  }
}

export function resetState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// ── 全局单例 ──
let store: AppState | null = null;

export function getStore(): AppState {
  if (!store) store = loadState();
  return store;
}

export function updateStore(mutate: (s: AppState) => void): void {
  const s = getStore();
  mutate(s);
  saveState(s);
}

/** 从 localStorage 重新读取（教师端/看板切换时确保最新） */
export function reloadStore(): AppState {
  store = loadState();
  return store;
}

/** 看板统计数据 */
export interface DashboardData {
  submissionCount: number;
  studentCount: number;
  averageAuto: number;
  averageReview: number | null;
  passRate: number;
  issueCounts: Map<string, number>;
  layerMissByPosition: Map<number, number>;
  perAssignment: Array<{ assignment: Assignment; submissions: Submission[]; average: number | null; pendingReviews: number }>;
  weakestChecks: Array<{ label: string; loss: number; max: number }>;
}

export function buildDashboard(state: AppState, minPassRatio = 0.6): DashboardData {
  const subs = state.submissions;
  const students = new Set(subs.map((s) => s.student));
  const avgAuto = subs.length ? subs.reduce((a, s) => a + s.autoScore, 0) / subs.length : 0;
  const reviewed = subs.filter((s) => s.review);
  const avgReview = reviewed.length
    ? reviewed.reduce((a, s) => a + s.review!.score, 0) / reviewed.length
    : null;

  const issueCounts = new Map<string, number>();
  const layerMiss = new Map<number, number>();
  for (const s of subs) {
    const seen = new Set<string>();
    for (const issue of s.issues) {
      const key = issue.code;
      if (seen.has(key)) continue;
      seen.add(key);
      issueCounts.set(key, (issueCounts.get(key) ?? 0) + 1);
      if (key === 'layers-missing' || key === 'layers-gap') {
        const nums = issue.detail.match(/第\s*([\d、\s]+)\s*层/g) ?? [];
        for (const seg of nums) {
          for (const m of seg.matchAll(/(\d+)/g)) {
            const n = Number(m[1]);
            if (Number.isFinite(n)) layerMiss.set(n, (layerMiss.get(n) ?? 0) + 1);
          }
        }
      }
    }
  }

  const passRatio = (s: Submission) => {
    const total = s.autoMax || 1;
    return s.autoScore / total;
  };
  const passRate = subs.length ? subs.filter((s) => passRatio(s) >= minPassRatio).length / subs.length : 0;

  const perAssignment = state.assignments.map((assignment) => {
    const list = subs.filter((s) => s.assignmentId === assignment.id);
    const avg = list.length ? list.reduce((a, s) => a + s.autoScore, 0) / list.length : null;
    return {
      assignment,
      submissions: list,
      average: avg,
      pendingReviews: list.filter((s) => !s.review).length,
    };
  });

  const losses = new Map<string, { loss: number; max: number }>();
  for (const s of subs) {
    for (const c of s.checks) {
      const cur = losses.get(c.label) ?? { loss: 0, max: 0 };
      cur.loss += c.max - c.score;
      cur.max += c.max;
      losses.set(c.label, cur);
    }
  }
  const weakestChecks = Array.from(losses, ([label, v]) => ({ label, ...v }))
    .map((v) => ({ ...v, loss: Math.round(v.loss * 10) / 10, max: Math.round(v.max * 10) / 10 }))
    .sort((a, b) => b.loss - a.loss);

  return {
    submissionCount: subs.length,
    studentCount: students.size,
    averageAuto: Math.round(avgAuto * 10) / 10,
    averageReview: avgReview === null ? null : Math.round(avgReview * 10) / 10,
    passRate,
    issueCounts,
    layerMissByPosition: new Map([...layerMiss].sort((a, b) => a[0] - b[0])),
    perAssignment,
    weakestChecks,
  };
}

/** 错题/问题标签 */
export const ISSUE_LABELS: Record<string, string> = {
  empty: '未建模',
  'layers-missing': '层数不足',
  'layers-extra': '层数超出',
  'layers-gap': '层序不连续',
  'share-off': '体积占比偏差',
  'mirror-low': '镜像严重不对称',
  'mirror-mid': '镜像轻度不一致',
  'faces-over': '三角面超预算',
  'hidden-voxels': '存在隐藏体素',
};
