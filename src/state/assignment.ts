import { buildLayers, totalRows, type LayerSpec } from '../core/layers';
import { expectedSharesFromRows } from '../core/grading';

export type TaskStatus = 'draft' | 'open' | 'closed';

export interface Assignment {
  id: string;
  title: string;
  brief: string;
  /** 探方尺寸（体素个数） */
  nx: number;
  ny: number;
  nz: number;
  /** 自上而下的层厚（行） */
  layerRows: number[];
  /** 是否要求左右镜像对称 */
  mirrorRequired: boolean;
  /** 三角面预算，0 = 不限 */
  faceBudget: number;
  /** ISO 时间字符串 */
  dueAt: string;
  /** 截止后是否仍允许提交 */
  allowLate: boolean;
  status: TaskStatus;
  createdAt: string;
}

export interface CheckSnapshot {
  key: 'layers' | 'shares' | 'mirror';
  label: string;
  score: number;
  max: number;
  pass: boolean;
  detail: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  student: string;
  submittedAt: string;
  late: boolean;
  /** 网格 RLE（提交内容，带校验） */
  payload: { dims: { nx: number; ny: number; nz: number }; mat: string; hidden: string };
  stats: {
    voxelCount: number;
    layerFilled: number[];
    shares: number[];
    mirrorRatio: number;
    triCount: number;
    hiddenCount: number;
  };
  autoScore: number;
  autoMax: number;
  checks: CheckSnapshot[];
  issues: { code: string; label: string; detail: string; severity: 'fail' | 'warn' }[];
  /** 教师复核分与评语 */
  review?: {
    score: number;
    max: number;
    comment: string;
    gradedAt: string;
    grader: string;
  };
}

export interface RosterEntry {
  name: string;
  studentNo: string;
}

export function assignmentLayers(a: Assignment): LayerSpec[] {
  return buildLayers(a.layerRows);
}

export function assignmentExpectedShares(a: Assignment): number[] {
  return expectedSharesFromRows(a.layerRows);
}

export function assignmentTotalVoxels(a: Assignment): number {
  return a.nx * totalRows(a.layerRows) * a.nz;
}

export function deadlineState(a: Assignment, now = Date.now()): 'open' | 'late' | 'closed' {
  const due = Date.parse(a.dueAt);
  if (Number.isNaN(due)) return 'open';
  if (now <= due) return 'open';
  return a.allowLate ? 'late' : 'closed';
}

export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未设置';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 计时器文本：剩余/已超 */
export function countdownText(iso: string, now = Date.now()): { text: string; expired: boolean } {
  const due = Date.parse(iso);
  if (Number.isNaN(due)) return { text: '未设置截止时间', expired: false };
  const diff = due - now;
  const expired = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);
  const core = days > 0 ? `${days} 天 ${hours} 时` : hours > 0 ? `${hours} 时 ${minutes} 分` : `${minutes} 分 ${seconds} 秒`;
  return { text: expired ? `已超时 ${core}` : `剩余 ${core}`, expired };
}

export function makeId(prefix: string, rand = Math.random): string {
  const s = Math.floor(rand() * 0xfffffff).toString(36).padStart(5, '0');
  return `${prefix}_${Date.now().toString(36)}${s}`;
}
