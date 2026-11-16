import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoGrade, expectedSharesFromRows, AUTO_TOTAL } from '../src/core/grading';
import { buildLayers, layerAtY } from '../src/core/layers';
import { buildDashboard, emptyState } from '../src/state/store';
import { assignmentExpectedShares, deadlineState, countdownText, type Assignment } from '../src/state/assignment';
import { meshToObj, countObj } from '../src/core/exportObj';
import { VoxelGrid } from '../src/core/voxelGrid';
import { meshGrid } from '../src/core/mesher';

const base = {
  expectedShares: [0.4, 0.35, 0.25],
  mirrorRatio: 1,
  mirrorRequired: true,
  triCount: 100,
  faceBudget: 1000,
};

test('地层划分自上而下连续', () => {
  const layers = buildLayers([2, 3, 4]);
  assert.deepEqual(layers.map((l) => l.start), [7, 4, 0]);
  assert.equal(layerAtY(layers, 8), 0);
  assert.equal(layerAtY(layers, 6), 1);
  assert.equal(layerAtY(layers, 0), 2);
  assert.equal(layerAtY(layers, -1), -1);
});

test('层厚非法时报错', () => {
  assert.throws(() => buildLayers([0]));
  assert.throws(() => buildLayers([-1]));
});

test('理论占比按层厚分配', () => {
  assert.deepEqual(expectedSharesFromRows([2, 3, 5]), [0.2, 0.3, 0.5]);
  assert.deepEqual(expectedSharesFromRows([]).length, 0);
});

test('完美模型得满分', () => {
  const r = autoGrade({ ...base, layerFilled: [40, 35, 25], shares: [0.4, 0.35, 0.25] });
  assert.equal(r.total, AUTO_TOTAL);
  assert.ok(r.checks.every((c) => c.pass));
  assert.equal(r.issues.length, 0);
});

test('缺层扣分并给出错题', () => {
  const r = autoGrade({ ...base, layerFilled: [40, 35, 0], shares: [0.53, 0.47, 0] });
  assert.ok(r.total < AUTO_TOTAL);
  const codes = r.issues.map((i) => i.code);
  assert.ok(codes.includes('layers-missing'));
  assert.ok(codes.includes('layers-gap'));
});

test('层数超出不加分并报错', () => {
  const r = autoGrade({ ...base, layerFilled: [30, 25, 20, 15], shares: [0.33, 0.28, 0.22, 0.17] });
  assert.ok(r.issues.some((i) => i.code === 'layers-extra'));
});

test('空模型 0 分', () => {
  const r = autoGrade({ ...base, layerFilled: [0, 0, 0], shares: [0, 0, 0] });
  assert.equal(r.total, 0);
  assert.ok(r.issues.some((i) => i.code === 'empty'));
});

test('镜像不足按比例扣分', () => {
  const full = autoGrade({ ...base, layerFilled: [40, 35, 25], shares: [0.4, 0.35, 0.25] });
  const half = autoGrade({ ...base, mirrorRatio: 0.6, layerFilled: [40, 35, 25], shares: [0.4, 0.35, 0.25] });
  assert.ok(half.total < full.total);
  assert.ok(half.issues.some((i) => i.code === 'mirror-low'));
});

test('未要求镜像时权重并入其他项', () => {
  const r = autoGrade({
    ...base,
    mirrorRequired: false,
    layerFilled: [40, 35, 25],
    shares: [0.4, 0.35, 0.25],
  });
  assert.equal(r.total, AUTO_TOTAL);
  assert.equal(r.checks.find((c) => c.key === 'mirror')!.max, 0);
});

test('面数超预算给出警告但不扣自动分', () => {
  const ok = autoGrade({ ...base, layerFilled: [40, 35, 25], shares: [0.4, 0.35, 0.25] });
  const over = autoGrade({ ...base, layerFilled: [40, 35, 25], shares: [0.4, 0.35, 0.25], triCount: 5000 });
  assert.equal(over.total, ok.total);
  assert.ok(over.issues.some((i) => i.code === 'faces-over'));
});

test('占比容差内不扣满', () => {
  const r = autoGrade({ ...base, layerFilled: [42, 34, 24], shares: [0.42, 0.34, 0.24] });
  assert.ok(r.total > AUTO_TOTAL * 0.85);
});

const assignment: Assignment = {
  id: 'a1',
  title: 'T0601 南段',
  brief: '',
  nx: 6,
  ny: 6,
  nz: 6,
  layerRows: [2, 2, 2],
  mirrorRequired: true,
  faceBudget: 2000,
  dueAt: '2026-01-01T00:00:00.000Z',
  allowLate: false,
  status: 'open',
  createdAt: '2025-12-01T00:00:00.000Z',
};

test('题目的层与占比', () => {
  assert.deepEqual(assignmentExpectedShares(assignment), [1 / 3, 1 / 3, 1 / 3]);
});

test('截止状态', () => {
  assert.equal(deadlineState(assignment, Date.parse('2025-12-31T00:00:00Z')), 'open');
  assert.equal(deadlineState(assignment, Date.parse('2026-01-02T00:00:00Z')), 'closed');
  assert.equal(deadlineState({ ...assignment, allowLate: true }, Date.parse('2026-01-02T00:00:00Z')), 'late');
});

test('倒计时显示', () => {
  const t = countdownText('2026-01-01T01:00:00.000Z', Date.parse('2026-01-01T00:00:00Z'));
  assert.match(t.text, /剩余/);
  assert.equal(t.expired, false);
  const late = countdownText('2026-01-01T00:00:00.000Z', Date.parse('2026-01-01T01:00:00Z'));
  assert.match(late.text, /已超时/);
});

test('OBJ 导出的面数与网格一致', () => {
  const g = new VoxelGrid({ nx: 3, ny: 3, nz: 3 });
  g.setMaterial(1, 1, 1, 2);
  const mesh = meshGrid(g);
  const obj = meshToObj(mesh, g.dims);
  const counts = countObj(obj);
  assert.equal(counts.vertices, mesh.vertexCount);
  assert.equal(counts.triangles, mesh.triCount);
  assert.match(obj, /usemtl 黄褐土/);
});

test('看板汇总错题与通过率', () => {
  const state = emptyState();
  state.assignments.push(assignment);
  const mk = (score: number, issues: any[], checks: any[]): any => ({
    id: `s${Math.random()}`,
    assignmentId: 'a1',
    student: '甲',
    submittedAt: '',
    late: false,
    payload: { dims: { nx: 6, ny: 6, nz: 6 }, mat: '', hidden: '' },
    stats: { voxelCount: 0, layerFilled: [], shares: [], mirrorRatio: 1, triCount: 0, hiddenCount: 0 },
    autoScore: score,
    autoMax: 70,
    checks,
    issues,
  });
  state.submissions.push(
    mk(70, [], [
      { key: 'layers', label: '地层数', score: 30, max: 30, pass: true, detail: '' },
      { key: 'shares', label: '体积占比', score: 25, max: 25, pass: true, detail: '' },
      { key: 'mirror', label: '镜像一致性', score: 15, max: 15, pass: true, detail: '' },
    ]),
    mk(40, [{ code: 'layers-missing', label: '层数不足', detail: '第 3 层为空', severity: 'fail' }], [
      { key: 'layers', label: '地层数', score: 20, max: 30, pass: false, detail: '' },
      { key: 'shares', label: '体积占比', score: 15, max: 25, pass: false, detail: '' },
      { key: 'mirror', label: '镜像一致性', score: 5, max: 15, pass: false, detail: '' },
    ]),
  );
  const d = buildDashboard(state);
  assert.equal(d.submissionCount, 2);
  assert.equal(d.issueCounts.get('layers-missing'), 1);
  assert.equal(d.layerMissByPosition.get(3), 1);
  assert.equal(d.passRate, 0.5);
  assert.deepEqual(
    d.weakestChecks.map((c) => c.loss),
    [...d.weakestChecks.map((c) => c.loss)].sort((a, b) => b - a),
  );
});

test('草稿与题目规格不一致时不恢复', async () => {
  const { EditorModel } = await import('../src/state/editor');
  const draft = { rows: [2, 2, 2], data: { dims: { nx: 6, ny: 6, nz: 6 }, mat: '', hidden: '' } };
  assert.equal(EditorModel.draftMatches(draft, assignment), true);
  assert.equal(EditorModel.draftMatches(draft, { ...assignment, nx: 10 }), false);
  assert.equal(EditorModel.draftMatches(draft, { ...assignment, layerRows: [3, 3] }), false);
  assert.equal(EditorModel.draftMatches(draft, { ...assignment, layerRows: [3, 3, 3] }), false);
  assert.equal(EditorModel.draftMatches(null, assignment), false);
});
