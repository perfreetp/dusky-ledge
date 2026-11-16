import { BaseElement, define } from './base';
import { h, clear, fmt, pct } from './dom';
import { buildDashboard, ISSUE_LABELS, updateStore, getStore } from '../state/store';
import { formatDeadline, type Assignment } from '../state/assignment';

const CSS = `
:host { display: block; padding: 18px 22px 34px; max-width: 1180px; margin: 0 auto; }
h2 { font-size: 16px; margin: 0 0 4px; font-weight: 600; }
.sub { font-size: 12px; color: var(--fg-dim); margin-bottom: 16px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 18px; }
.kpi { background: #16191d; border: 1px solid var(--border-soft); border-radius: 9px; padding: 11px 13px; }
.kpi .v { font-family: var(--mono); font-size: 22px; font-weight: 600; letter-spacing: -.5px; }
.kpi .k { font-size: 11px; color: var(--fg-faint); margin-top: 3px; }
.kpi .s { font-size: 10px; color: var(--fg-dim); margin-top: 2px; }
.section { background: #16191d; border: 1px solid var(--border-soft); border-radius: 9px; padding: 14px 16px; margin-bottom: 14px; }
.section h3 { font-size: 13px; margin: 0 0 11px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.section h3 .hint { font-size: 10.5px; color: var(--fg-faint); font-weight: 400; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid #24282f; }
th { font-size: 10.5px; color: var(--fg-faint); font-weight: 500; text-transform: none; }
tr:last-child td { border-bottom: 0; }
td.num, th.num { text-align: right; font-family: var(--mono); }
.empty { color: var(--fg-faint); font-size: 12px; padding: 14px 0; }
.bars { display: flex; flex-direction: column; gap: 7px; }
.bar-row { display: grid; grid-template-columns: 118px 1fr 42px; gap: 10px; align-items: center; font-size: 11.5px; }
.bar-track { height: 9px; border-radius: 3px; background: #22262d; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #8a4a3c, #cf6679); }
.bar-fill.blue { background: linear-gradient(90deg, #3a5c74, #6f9bc4); }
.bar-fill.green { background: linear-gradient(90deg, #4a7a3c, #7fb069); }
.bar-num { font-family: var(--mono); color: var(--fg-dim); text-align: right; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 820px) { .split { grid-template-columns: 1fr; } }
.legend { display: flex; gap: 12px; font-size: 10px; color: var(--fg-faint); margin-top: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.mini { font-size: 10px; color: var(--fg-faint); }
`;

export class DashboardView extends BaseElement {
  private content!: HTMLElement;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.content = h('div', {});
    this.root.append(style, this.content);
    this.paint();
  }

  refresh(): void {
    if (this.content) this.paint();
  }

  private paint(): void {
    const state = getStore();
    const d = buildDashboard(state);
    clear(this.content);

    const subs = state.submissions;
    const reviewed = subs.filter((s) => s.review);
    const totalScore = reviewed.length
      ? reviewed.reduce((a, s) => a + s.autoScore + s.review!.score, 0) / reviewed.length
      : null;

    this.content.append(
      h('div', {},
        h('h2', {}, '教学看板'),
        h('div', { class: 'sub' },
          `汇总全部 ${state.assignments.length} 道题、${subs.length} 份提交的自动核对结果与教师复核分数。`),
      ),
      h('div', { class: 'kpis' },
        kpi(String(d.submissionCount), '提交作业', `${subs.filter((s) => s.late).length} 份迟交`),
        kpi(String(d.studentCount), '提交学员', `名单 ${state.roster.length} 人`),
        kpi(d.averageAuto.toFixed(1), '自动评分均分', '满分 70'),
        kpi(totalScore === null ? '—' : totalScore.toFixed(1), '总分均分', `自动 + 复核，满分 100`),
        kpi(pct(d.passRate, 0), '自动通过率', '≥ 60% 自动分'),
      ),
    );

    // 按题目
    const table = h('table', {},
      h('thead', {}, h('tr', {},
        h('th', {}, '题目'),
        h('th', { class: 'num' }, '提交'),
        h('th', { class: 'num' }, '自动均分'),
        h('th', { class: 'num' }, '待复核'),
        h('th', {}, '截止时间'),
        h('th', {}, '状态'),
      )),
    );
    const tbody = h('tbody', {});
    for (const row of d.perAssignment) {
      tbody.append(
        h('tr', {},
          h('td', {}, row.assignment.title, h('div', { class: 'mini' }, `探方 ${row.assignment.nx}×${row.assignment.nz} · ${row.assignment.layerRows.length} 层 · 镜像${row.assignment.mirrorRequired ? '必做' : '自由'}`)),
          h('td', { class: 'num' }, String(row.submissions.length)),
          h('td', { class: 'num' }, row.average === null ? '—' : row.average.toFixed(1)),
          h('td', { class: 'num' }, row.pendingReviews ? String(row.pendingReviews) : '—'),
          h('td', { class: 'mini' }, formatDeadline(row.assignment.dueAt)),
          h('td', {}, statusTag(row.assignment)),
        ),
      );
    }
    if (!d.perAssignment.length) {
      tbody.append(h('tr', {}, h('td', { colspan: '6' }, h('div', { class: 'empty' }, '尚未发布题目'))));
    }
    table.append(tbody);

    this.content.append(
      h('div', { class: 'section' },
        h('h3', {}, '按题目汇总', h('span', { class: 'hint' }, '自动均分满分 70，复核 30 分另行计入')),
        table,
      ),
    );

    // 错题分布
    const issueRows = [...d.issueCounts.entries()].sort((a, b) => b[1] - a[1]);
    const maxIssue = issueRows[0]?.[1] ?? 1;
    const issueBars = h('div', { class: 'bars' });
    if (issueRows.length) {
      for (const [code, count] of issueRows) {
        issueBars.append(
          h('div', { class: 'bar-row' },
            h('span', {}, ISSUE_LABELS[code] ?? code),
            h('div', { class: 'bar-track' },
              h('div', { class: 'bar-fill', style: `width:${(count / maxIssue) * 100}%` }),
            ),
            h('span', { class: 'bar-num' }, String(count)),
          ),
        );
      }
    } else {
      issueBars.append(h('div', { class: 'empty' }, '暂无错题记录'));
    }

    // 层位缺失
    const layerRows = [...d.layerMissByPosition.entries()];
    const maxLayer = Math.max(1, ...layerRows.map((r) => r[1]));
    const layerBars = h('div', { class: 'bars' });
    if (layerRows.length) {
      for (const [layer, count] of layerRows) {
        layerBars.append(
          h('div', { class: 'bar-row' },
            h('span', {}, `第 ${layer} 层`),
            h('div', { class: 'bar-track' },
              h('div', { class: 'bar-fill blue', style: `width:${(count / maxLayer) * 100}%` }),
            ),
            h('span', { class: 'bar-num' }, String(count)),
          ),
        );
      }
    } else {
      layerBars.append(h('div', { class: 'empty' }, '没有层位缺失问题'));
    }

    // 失分项
    const checkBars = h('div', { class: 'bars' });
    if (d.weakestChecks.length) {
      const maxLoss = Math.max(1, ...d.weakestChecks.map((c) => c.loss));
      for (const c of d.weakestChecks) {
        checkBars.append(
          h('div', { class: 'bar-row' },
            h('span', {}, c.label),
            h('div', { class: 'bar-track' },
              h('div', { class: 'bar-fill green', style: `width:${(c.loss / maxLoss) * 100}%` }),
            ),
            h('span', { class: 'bar-num' }, `-${c.loss.toFixed(0)}`),
          ),
        );
      }
    } else {
      checkBars.append(h('div', { class: 'empty' }, '暂无评分数据'));
    }

    this.content.append(
      h('div', { class: 'split' },
        h('div', { class: 'section' },
          h('h3', {}, '错题类型分布', h('span', { class: 'hint' }, '按提交份数计')),
          issueBars,
        ),
        h('div', { class: 'section' },
          h('h3', {}, '层位缺失热点', h('span', { class: 'hint' }, '按出现次数计')),
          layerBars,
        ),
      ),
      h('div', { class: 'section' },
        h('h3', {}, '失分项排行', h('span', { class: 'hint' }, '累计被扣分数')),
        checkBars,
      ),
    );

    // 学员明细
    const detail = h('table', {},
      h('thead', {}, h('tr', {},
        h('th', {}, '学员'),
        h('th', {}, '题目'),
        h('th', { class: 'num' }, '自动分'),
        h('th', { class: 'num' }, '复核分'),
        h('th', { class: 'num' }, '总分'),
        h('th', {}, '主要问题'),
        h('th', {}, '提交时间'),
      )),
    );
    const dtbody = h('tbody', {});
    const sorted = [...subs].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    for (const s of sorted) {
      const a = state.assignments.find((x) => x.id === s.assignmentId);
      const reviewScore = s.review ? s.review.score : null;
      const total = reviewScore === null ? null : s.autoScore + reviewScore;
      const issues = s.issues.filter((i) => i.severity === 'fail').slice(0, 3);
      dtbody.append(
        h('tr', {},
          h('td', {}, s.student),
          h('td', { class: 'mini' }, a?.title ?? '（已删除）'),
          h('td', { class: 'num' }, s.autoScore.toFixed(1)),
          h('td', { class: 'num' }, s.review ? s.review.score.toFixed(1) : '—'),
          h('td', { class: 'num' }, total === null ? '—' : total.toFixed(1)),
          h('td', { class: 'mini' }, issues.length ? issues.map((i) => i.label).join('、') : h('span', { class: 'ok' }, '无')),
          h('td', { class: 'mini' }, s.submittedAt.slice(0, 16).replace('T', ' ')),
        ),
      );
    }
    if (!subs.length) dtbody.append(h('tr', {}, h('td', { colspan: '7' }, h('div', { class: 'empty' }, '还没有提交'))));
    detail.append(dtbody);

    this.content.append(
      h('div', { class: 'section' },
        h('h3', {}, '学员成绩明细'),
        detail,
      ),
    );
  }
}

function kpi(v: string, k: string, s: string): HTMLElement {
  return h('div', { class: 'kpi' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k), h('div', { class: 's' }, s));
}

function statusTag(a: Assignment): HTMLElement {
  if (a.status === 'draft') return h('span', { class: 'tag' }, '草稿');
  if (a.status === 'closed') return h('span', { class: 'tag bad' }, '已关闭');
  return h('span', { class: 'tag ok' }, '进行中');
}

define('dashboard-view', DashboardView);
