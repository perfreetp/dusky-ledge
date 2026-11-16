import { h, clear } from './dom';
import { modal } from './modal';
import { toast } from './toast';
import type { EditorModel } from '../state/editor';
import type { Assignment } from '../state/assignment';
import { assignmentExpectedShares } from '../state/assignment';
import { layerLabel } from '../core/layers';
import { ISSUE_LABELS } from '../state/store';
import { pct } from './dom';

export interface StudentSession {
  student: string;
  onSubmitted: (s: import('../state/assignment').Submission) => void;
}

export function openSubmitDialog(model: EditorModel, assignment: Assignment, onSubmitted: StudentSession['onSubmitted']): void {
  const nameInput = h('input', { type: 'text', placeholder: '请输入姓名或学号', value: model.student }) as HTMLInputElement;
  nameInput.style.width = '100%';

  const grade = model.grade();
  const expected = assignmentExpectedShares(assignment);
  const stats = model.stats;

  const checkRows = h('div', { style: 'display:flex;flex-direction:column;gap:6px' });
  for (const c of grade.checks) {
    const ratio = c.max > 0 ? c.score / c.max : 0;
    checkRows.append(
      h('div', { class: 'check-row' },
        h('span', { class: 'dim' }, c.label),
        h('div', { class: 'track' },
          h('i', {
            style: `width:${(ratio * 100).toFixed(1)}%;background:${c.max === 0 ? '#4a5058' : c.pass ? '#7fb069' : '#cf6679'}`,
          }),
        ),
        h('span', {
          class: 'mono',
          style: `text-align:right;color:${c.max === 0 ? 'var(--fg-faint)' : c.pass ? '#a9cd96' : '#f0a8b5'}`,
        }, c.max === 0 ? '不计分' : `${c.score.toFixed(1)}/${c.max.toFixed(0)}`),
      ),
    );
  }

  const layerRows = h('div', { style: 'display:flex;flex-direction:column;gap:3px;margin-top:4px' });
  stats.shares.forEach((share, i) => {
    const exp = expected[i] ?? 0;
    const dev = Math.abs(share - exp);
    layerRows.append(
      h('div', { class: 'lrow2' },
        h('span', { class: dev > 0.08 ? 'bad' : 'dim' }, layerLabel(i)),
        h('div', { class: 'track track7 pos' },
          h('i', { style: `width:${Math.min(100, share * 100)}%;background:#b89966` }),
          h('div', { style: `position:absolute;top:0;bottom:0;width:1.5px;background:#bde0ff;left:${Math.min(100, exp * 100)}%` }),
        ),
        h('span', { class: 'mono faint', style: 'text-align:right' }, `${pct(share, 0)} / ${pct(exp, 0)}`),
      ),
    );
  });

  const issueList = h('div', { style: 'display:flex;flex-wrap:wrap;gap:5px' });
  if (grade.issues.length) {
    for (const i of grade.issues) {
      issueList.append(h('span', { class: `tag ${i.severity === 'fail' ? 'bad' : 'warn'}` }, `${ISSUE_LABELS[i.code] ?? i.label}：${i.detail}`));
    }
  } else {
    issueList.append(h('span', { class: 'tag ok' }, '系统核对未发现问题'));
  }

  const content = h('div', { style: 'display:flex;flex-direction:column;gap:13px' },
    h('div', {},
      h('div', { class: 'strong', style: 'margin-bottom:5px' }, '提交前自动核对'),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:8px' },
        h('span', { class: 'hintline' }, '提交后系统自动计分（满分 70），教师再复核 30 分。'),
        h('span', { class: `tag ${grade.total >= grade.max * 0.6 ? 'ok' : 'bad'}` },
          `预计 ${grade.total.toFixed(1)} / ${grade.max}`),
      ),
      checkRows,
      h('div', { class: 'tiny faint', style: 'margin-top:8px' }, '各层体积占比（竖线为目标值）'),
      layerRows,
      h('div', { style: 'margin-top:8px' }, issueList),
      h('div', { class: 'tiny faint', style: 'margin-top:6px' },
        `体素 ${stats.voxelCount} · 三角面 ${model.mesh.triCount}${model.faceBudget > 0 ? ` / 预算 ${model.faceBudget}` : ''} · 镜像一致率 ${pct(stats.mirrorRatio, 1)}`),
    ),
    h('div', { style: 'display:flex;flex-direction:column;gap:5px' },
      h('label', {}, '署名'),
      nameInput,
    ),
    h('div', { style: 'display:flex;justify-content:flex-end;gap:8px' },
      h('button', { onclick: () => modal.close() }, '继续修改'),
      h('button', {
        class: 'primary',
        onclick: () => {
          const name = nameInput.value.trim();
          if (!name) {
            toast('请填写姓名或学号', 'warn');
            nameInput.focus();
            return;
          }
          model.student = name;
          const sub = model.buildSubmission(assignment, name);
          if (model.faceBudget > 0 && model.mesh.triCount > model.faceBudget) {
            toast('三角面数超出预算，可在提交前先减面，教师复核时会看到该提示', 'warn');
          }
          onSubmitted(sub);
          modal.close();
        },
      }, '确认提交'),
    ),
  );
  modal.open('提交作业', content, { wide: true });
}
