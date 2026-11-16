import type { VoxelGrid } from './voxelGrid';
import { mirrorConsistency } from './voxelGrid';
import type { LayerSpec } from './layers';

export interface ModelStats {
  voxelCount: number;
  layerFilled: number[];
  layerCapacity: number[];
  shares: number[];
  mirrorRatio: number;
  mirrorMatched: number;
  mirrorTotal: number;
}

export function computeModelStats(grid: VoxelGrid, layers: readonly LayerSpec[]): ModelStats {
  const layerFilled = Array.from(grid.countsByLayer(layers));
  const layerCapacity = layers.map((l) => l.rows * grid.dims.nx * grid.dims.nz);
  const total = layerFilled.reduce((a, b) => a + b, 0);
  const shares = layerFilled.map((v) => (total ? v / total : 0));
  const mirror = mirrorConsistency(grid);
  return {
    voxelCount: total,
    layerFilled,
    layerCapacity,
    shares,
    mirrorRatio: mirror.ratio,
    mirrorMatched: mirror.matched,
    mirrorTotal: mirror.total,
  };
}

export type IssueCode =
  | 'empty'
  | 'layers-missing'
  | 'layers-extra'
  | 'layers-gap'
  | 'share-off'
  | 'mirror-low'
  | 'mirror-mid'
  | 'faces-over'
  | 'hidden-voxels';

export interface Issue {
  code: IssueCode;
  label: string;
  detail: string;
  severity: 'fail' | 'warn';
}

export interface CheckResult {
  key: 'layers' | 'shares' | 'mirror';
  label: string;
  score: number;
  max: number;
  pass: boolean;
  detail: string;
}

export interface AutoGradeInput {
  layerFilled: number[];
  shares: number[];
  expectedShares: number[];
  mirrorRatio: number;
  mirrorRequired: boolean;
  triCount: number;
  faceBudget: number;
  hiddenCount?: number;
}

export interface AutoGradeResult {
  total: number;
  max: number;
  checks: CheckResult[];
  issues: Issue[];
}

export const AUTO_TOTAL = 70;
export const REVIEW_TOTAL = 30;
/**
 * 自动分权重。要求镜像时三项都计；不要求镜像时，
 * 镜像的 15 分按 30:25 的比例并入前两项（→ 39 / 31），总和恒为 70。
 */
const BASE_WEIGHTS = { layers: 30, shares: 25, mirror: 15 } as const;
const NO_MIRROR_WEIGHTS = { layers: 39, shares: 31, mirror: 0 } as const;
const SHARE_TOLERANCE = 0.08;
const MIRROR_PASS = 0.95;
const MIRROR_WARN = 0.8;

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** 依据层厚计算“理论体积占比”：一层厚度占总厚度的比例。 */
export function expectedSharesFromRows(rows: readonly number[]): number[] {
  const total = rows.reduce((a, b) => a + b, 0) || 1;
  return rows.map((r) => r / total);
}

/**
 * 自动评分：层数 / 体积占比 / 镜像一致性，合计 AUTO_TOTAL 分。
 * 未要求镜像时，镜像权重按比例并入前两项。
 */
export function autoGrade(input: AutoGradeInput): AutoGradeResult {
  const expectedLayers = input.expectedShares.length;
  const issues: Issue[] = [];
  const filledLayers = input.layerFilled.filter((v) => v > 0).length;
  const totalVoxels = input.layerFilled.reduce((a, b) => a + b, 0);

  const active = input.mirrorRequired
    ? { ...BASE_WEIGHTS }
    : { ...NO_MIRROR_WEIGHTS };
  const activeSum = active.layers + active.shares + active.mirror;
  const scale = AUTO_TOTAL / activeSum;
  const weights = {
    layers: active.layers * scale,
    shares: active.shares * scale,
    mirror: active.mirror * scale,
  };

  // ── 1. 层数 ──
  let layerScore = 0;
  let layerPass = false;
  let layerDetail = '';
  if (expectedLayers === 0) {
    layerScore = weights.layers;
    layerPass = true;
    layerDetail = '题目未设置地层';
  } else if (totalVoxels === 0) {
    issues.push({ code: 'empty', label: '未建模', detail: '模型中没有体素', severity: 'fail' });
    layerDetail = `需要 ${expectedLayers} 层，当前 0 层`;
  } else {
    const ratio = Math.min(filledLayers, expectedLayers) / expectedLayers;
    layerScore = weights.layers * ratio;
    const firstEmpty = input.layerFilled.findIndex((v) => v === 0);
    const gaps: number[] = [];
    for (let i = 0; i < expectedLayers; i++) if (input.layerFilled[i] === 0) gaps.push(i);
    const contiguous = gaps.length === 0;
    if (filledLayers < expectedLayers) {
      issues.push({
        code: 'layers-missing',
        label: '层数不足',
        detail: `已建 ${filledLayers} 层 / 要求 ${expectedLayers} 层，第 ${gaps.map((g) => g + 1).join('、')} 层为空`,
        severity: 'fail',
      });
    } else if (filledLayers > expectedLayers) {
      issues.push({
        code: 'layers-extra',
        label: '层数超出',
        detail: `已建 ${filledLayers} 层 / 要求 ${expectedLayers} 层`,
        severity: 'fail',
      });
    }
    if (!contiguous && totalVoxels > 0) {
      issues.push({
        code: 'layers-gap',
        label: '层序不连续',
        detail: `第 ${gaps.map((g) => g + 1).join('、')} 层缺失，层序应从第 1 层向下连续`,
        severity: 'fail',
      });
      layerScore *= 0.7;
    }
    if (filledLayers > expectedLayers) {
      layerScore = Math.min(layerScore, weights.layers * 0.6);
    }
    layerPass = filledLayers === expectedLayers && contiguous;
    layerDetail = `已建 ${filledLayers} 层，要求 ${expectedLayers} 层`;
  }

  // ── 2. 体积占比 ──
  let shareScore = 0;
  let sharePass = false;
  let shareDetail = '';
  const expected = input.expectedShares;
  if (totalVoxels === 0 || expectedLayers === 0) {
    shareDetail = totalVoxels === 0 ? '无体素可分' : '无占比要求';
    sharePass = expectedLayers === 0;
    if (expectedLayers === 0) shareScore = weights.shares;
  } else {
    let deviation = 0;
    for (let i = 0; i < expectedLayers; i++) {
      const a = input.shares[i] ?? 0;
      const e = expected[i] ?? 0;
      deviation += Math.abs(a - e);
      if (Math.abs(a - e) > SHARE_TOLERANCE) {
        issues.push({
          code: 'share-off',
          label: '体积占比偏差',
          detail: `第 ${i + 1} 层实际 ${pct(a)}，应为 ${pct(e)}（偏差 ${pct(a - e)}）`,
          severity: 'fail',
        });
      }
    }
    for (let i = expectedLayers; i < input.shares.length; i++) {
      if ((input.shares[i] ?? 0) > 1e-6) deviation += input.shares[i];
    }
    deviation = Math.min(1, deviation / 2);
    shareScore = weights.shares * (1 - deviation);
    sharePass = deviation <= SHARE_TOLERANCE / 2;
    shareDetail = `各层占比偏差 ${pct(deviation)}（容差每层 ${pct(SHARE_TOLERANCE)}）`;
  }

  // ── 3. 镜像一致性 ──
  let mirrorScore = 0;
  let mirrorPass = true;
  let mirrorDetail = '';
  if (!input.mirrorRequired) {
    mirrorDetail = '本题未要求镜像对称';
    mirrorScore = 0;
  } else if (totalVoxels === 0) {
    mirrorDetail = '无体素可比较';
    mirrorScore = 0;
  } else {
    mirrorScore = weights.mirror * input.mirrorRatio;
    mirrorPass = input.mirrorRatio >= MIRROR_PASS;
    mirrorDetail = `左右对应体素一致率 ${pct(input.mirrorRatio)}`;
    if (input.mirrorRatio < MIRROR_WARN) {
      issues.push({
        code: 'mirror-low',
        label: '镜像严重不对称',
        detail: `一致率仅 ${pct(input.mirrorRatio)}（要求 ≥ ${pct(MIRROR_PASS)}）`,
        severity: 'fail',
      });
    } else if (input.mirrorRatio < MIRROR_PASS) {
      issues.push({
        code: 'mirror-mid',
        label: '镜像轻度不一致',
        detail: `一致率 ${pct(input.mirrorRatio)}（要求 ≥ ${pct(MIRROR_PASS)}）`,
        severity: 'fail',
      });
    }
  }

  if (input.faceBudget > 0 && input.triCount > input.faceBudget) {
    issues.push({
      code: 'faces-over',
      label: '三角面数超预算',
      detail: `${input.triCount.toLocaleString()} 面 / 预算 ${input.faceBudget.toLocaleString()} 面`,
      severity: 'warn',
    });
  }

  if ((input.hiddenCount ?? 0) > 0) {
    issues.push({
      code: 'hidden-voxels',
      label: '存在隐藏体素',
      detail: `${input.hiddenCount} 个体素被单独隐藏，提交前应恢复显示以便评阅`,
      severity: 'warn',
    });
  }

  const checks: CheckResult[] = [
    {
      key: 'layers',
      label: '地层数',
      score: round1(layerScore),
      max: round1(weights.layers),
      pass: layerPass,
      detail: layerDetail,
    },
    {
      key: 'shares',
      label: '体积占比',
      score: round1(shareScore),
      max: round1(weights.shares),
      pass: sharePass,
      detail: shareDetail,
    },
    {
      key: 'mirror',
      label: '镜像一致性',
      score: round1(mirrorScore),
      max: round1(weights.mirror),
      pass: mirrorPass,
      detail: mirrorDetail,
    },
  ];

  const total = round1(
    checks.reduce((sum, c) => sum + c.score, 0),
  );

  return { total, max: AUTO_TOTAL, checks, issues };
}
