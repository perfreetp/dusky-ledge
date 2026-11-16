import { BaseElement, define } from './base';
import { h, clear, fmt, pct, download } from './dom';
import { modal } from './modal';
import { toast } from './toast';
import { getStore, updateStore, reloadStore } from '../state/store';
import { ISSUE_LABELS } from '../state/store';
import {
  assignmentExpectedShares,
  countdownText,
  deadlineState,
  formatDeadline,
  makeId,
  type Assignment,
  type Submission,
} from '../state/assignment';
import { VoxelGrid } from '../core/voxelGrid';
import { meshGrid } from '../core/mesher';
import { meshToObj } from '../core/exportObj';
import { layerLabel } from '../core/layers';
import { hexToRgb } from '../core/materials';

const CSS = `
:host { display: block; padding: 18px 22px 40px; max-width: 1180px; margin: 0 auto; }
h2 { font-size: 16px; margin: 0 0 4px; font-weight: 600; }
.sub { font-size: 12px; color: var(--fg-dim); margin-bottom: 16px; }
.toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.card {
  background: #16191d; border: 1px solid var(--border-soft); border-radius: 10px; padding: 14px;
  display: flex; flex-direction: column; gap: 9px;
}
.card.draft { border-style: dashed; }
.card-head { display: flex; align-items: flex-start; gap: 8px; }
.card-title { font-size: 13.5px; font-weight: 600; flex: 1 1 auto; min-width: 0; }
.card-brief { font-size: 11.5px; color: var(--fg-dim); line-height: 1.55; }
.specs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 11px; }
.specs .k { color: var(--fg-faint); }
.specs .v { font-family: var(--mono); }
.card-foot { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; padding-top: 4px; }
.deadline { font-size: 11px; display: flex; gap: 6px; align-items: center; }
.deadline .cd { font-family: var(--mono); }
.deadline .cd.expired { color: #f0a8b5; }
.empty { padding: 40px; text-align: center; color: var(--fg-faint); border: 1px dashed var(--border); border-radius: 10px; }
.form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
.form .full { grid-column: 1 / -1; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 11px; }
.field input, .field textarea, .field select { width: 100%; }
.hintline { font-size: 10.5px; color: var(--fg-faint); line-height: 1.5; }
.layers-editor { display: flex; flex-direction: column; gap: 5px; }
.layer-row { display: grid; grid-template-columns: 52px 1fr 28px; gap: 8px; align-items: center; }
.layer-row input { width: 100%; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.rows { display: flex; flex-direction: column; gap: 7px; }
.section { margin-top: 22px; }
.section > h3 { font-size: 13px; font-weight: 600; margin: 0 0 10px; }
.srow {
  display: grid; grid-template-columns: minmax(90px, 1fr) 90px 120px 1fr auto; gap: 10px; align-items: center;
  padding: 9px 11px; background: #16191d; border: 1px solid var(--border-soft); border-radius: 8px; font-size: 12px;
}
.srow.done { border-color: #324a2c; }
.srow.late { border-color: #5a4526; }
.score { font-family: var(--mono); }
.ok { color: #a9cd96; } .bad { color: #f0a8b5; } .warn { color: #f0cb91; }
.review-form { display: flex; flex-direction: column; gap: 12px; }
.review-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.rcheck { background: #101216; border: 1px solid var(--border-soft); border-radius: 8px; padding: 10px; }
.rcheck .lbl { font-size: 11px; color: var(--fg-dim); margin-bottom: 6px; }
.rcheck .det { font-size: 10.5px; color: var(--fg-faint); margin-top: 5px; line-height: 1.4; }
.statgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat { background: #101216; border: 1px solid var(--border-soft); border-radius: 7px; padding: 8px 10px; }
.stat .v { font-family: var(--mono); font-size: 15px; }
.stat .k { font-size: 10px; color: var(--fg-faint); margin-top: 2px; }
.preview-canvas { width: 100%; height: 260px; border-radius: 8px; background: #0f1114; border: 1px solid var(--border-soft); }
.layerbar { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.lb { display: grid; grid-template-columns: 58px 1fr 92px; gap: 8px; align-items: center; font-size: 10.5px; }
.lbt { height: 8px; background: #22262d; border-radius: 3px; overflow: hidden; position: relative; }
.lbf { height: 100%; background: #b89966; }
.lbm { position: absolute; top: 0; bottom: 0; width: 1.5px; background: #bde0ff; }
`;

export class TeacherView extends BaseElement {
  private content!: HTMLElement;

  protected render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.content = h('div', {});
    this.root.append(style, this.content);
    this.paint();
  }

  refresh(): void {
    reloadStore();
    if (this.content) this.paint();
  }

  private paint(): void {
    const state = getStore();
    clear(this.content);
    this.content.append(
      h('div', {},
        h('h2', {}, '教师工作台'),
        h('div', { class: 'sub' }, '出题、设置截止时间、复核学员提交。学员端提交后系统按层数、体积占比与镜像一致性自动计分（70 分），复核 30 分。'),
      ),
      h('div', { class: 'toolbar' },
        h('button', { class: 'primary', onclick: () => this.openEditor(null) }, '＋ 新建题目'),
        h('button', { onclick: () => this.openRoster() }, '学员名单'),
        h('span', { class: 'grow' }),
        h('span', { class: 'dim tiny' }, `共 ${state.assignments.length} 题 · ${state.submissions.length} 份提交`),
      ),
    );

    if (!state.assignments.length) {
      this.content.append(h('div', { class: 'empty' }, '还没有题目。点击“新建题目”设置探方尺寸、地层数与截止时间。'));
      return;
    }

    const cards = h('div', { class: 'cards' });
    for (const a of state.assignments) {
      cards.append(this.assignmentCard(a));
    }
    this.content.append(cards);

    // 提交列表
    const subs = [...state.submissions].sort((x, y) => y.submittedAt.localeCompare(x.submittedAt));
    const list = h('div', { class: 'rows' });
    if (!subs.length) list.append(h('div', { class: 'empty' }, '暂无学员提交'));
    for (const s of subs) {
      const a = state.assignments.find((x) => x.id === s.assignmentId);
      const reviewScore = s.review ? s.review.score : null;
      list.append(
        h('div', { class: `srow ${s.review ? 'done' : ''} ${s.late ? 'late' : ''}` },
          h('div', {},
            h('div', { class: 'strong' }, s.student),
            h('div', { class: 'tiny faint' }, a?.title ?? '题目已删除'),
          ),
          h('div', { class: 'score' },
            h('div', {}, `自动 ${s.autoScore.toFixed(1)}`),
            h('div', { class: 'tiny faint' }, `/${s.autoMax}`),
          ),
          h('div', { class: 'score' },
            reviewScore === null
              ? h('span', { class: 'warn' }, '待复核')
              : h('div', {}, `复核 ${reviewScore.toFixed(1)}`),
          ),
          h('div', { class: 'tiny' },
            h('span', {},
              ...(s.issues.length
                ? s.issues.slice(0, 2).map((i) => h('span', { class: 'tag bad', style: 'margin-right:4px' }, i.label))
                : [h('span', { class: 'tag ok' }, '自动核对通过')]),
            ),
            s.late ? h('span', { class: 'tag warn' }, '迟交') : null,
          ),
          h('div', { class: 'row' },
            h('button', { onclick: () => this.openReview(s) }, s.review ? '重新复核' : '复核给分'),
            h('button', { class: 'ghost', onclick: () => this.downloadSubmission(s) }, 'OBJ'),
          ),
        ),
      );
    }
    this.content.append(
      h('div', { class: 'section' },
        h('h3', {}, '学员提交'),
        list,
      ),
    );
  }

  private assignmentCard(a: Assignment): HTMLElement {
    const subs = getStore().submissions.filter((s) => s.assignmentId === a.id);
    const due = deadlineState(a);
    const cd = countdownText(a.dueAt);
    const shares = assignmentExpectedShares(a);
    return h('div', { class: `card ${a.status === 'draft' ? 'draft' : ''}` },
      h('div', { class: 'card-head' },
        h('div', { class: 'card-title' }, a.title),
        a.status === 'draft'
          ? h('span', { class: 'tag' }, '草稿')
          : a.status === 'closed'
            ? h('span', { class: 'tag bad' }, '已关闭')
            : h('span', { class: 'tag ok' }, '进行中'),
      ),
      a.brief ? h('div', { class: 'card-brief' }, a.brief) : null,
      h('div', { class: 'specs' },
        h('span', { class: 'k' }, '探方尺寸'), h('span', { class: 'v' }, `${a.nx} × ${a.nz} 格`),
        h('span', { class: 'k' }, '深度'), h('span', { class: 'v' }, `${a.ny} 行`),
        h('span', { class: 'k' }, '地层数'), h('span', { class: 'v' }, `${a.layerRows.length} 层`),
        h('span', { class: 'k' }, '层厚'), h('span', { class: 'v' }, a.layerRows.join(' / ')),
        h('span', { class: 'k' }, '理论占比'), h('span', { class: 'v' }, shares.map((s) => pct(s, 0)).join(' / ')),
        h('span', { class: 'k' }, '镜像要求'), h('span', { class: 'v' }, a.mirrorRequired ? '必做' : '不要求'),
        h('span', { class: 'k' }, '面数预算'), h('span', { class: 'v' }, a.faceBudget > 0 ? fmt(a.faceBudget) : '不限'),
        h('span', { class: 'k' }, '提交'), h('span', { class: 'v' }, `${subs.length} 份`),
      ),
      h('div', { class: 'deadline' },
        h('span', { class: 'dim' }, '截止'),
        h('span', {}, formatDeadline(a.dueAt)),
        h('span', { class: `cd ${cd.expired ? 'expired' : ''}` }, cd.text),
        due === 'late' ? h('span', { class: 'tag warn' }, '允许迟交') : null,
        due === 'closed' ? h('span', { class: 'tag bad' }, '已停止接收') : null,
      ),
      h('div', { class: 'card-foot' },
        h('button', { class: 'primary', onclick: () => this.openEditor(a) }, '编辑'),
        h('button', { onclick: () => this.toggleStatus(a) }, a.status === 'open' ? '关闭收题' : '开放收题'),
        h('button', { class: 'ghost danger', onclick: () => this.removeAssignment(a) }, '删除'),
      ),
    );
  }

  private toggleStatus(a: Assignment): void {
    updateStore((s) => {
      const target = s.assignments.find((x) => x.id === a.id);
      if (!target) return;
      target.status = target.status === 'open' ? 'closed' : 'open';
    });
    this.refresh();
  }

  private removeAssignment(a: Assignment): void {
    const subs = getStore().submissions.filter((s) => s.assignmentId === a.id);
    const content = h('div', {},
      h('p', { style: 'font-size:12.5px;line-height:1.7' },
        `确定删除题目「${a.title}」？`,
        subs.length ? ` 该题下 ${subs.length} 份提交将一并删除，此操作不可恢复。` : ''),
    );
    content.append(
      h('div', { class: 'actions' },
        h('button', { onclick: () => modal.close() }, '取消'),
        h('button', {
          class: 'primary danger',
          onclick: () => {
            updateStore((s) => {
              s.assignments = s.assignments.filter((x) => x.id !== a.id);
              s.submissions = s.submissions.filter((x) => x.assignmentId !== a.id);
            });
            modal.close();
            this.refresh();
            toast('题目已删除', 'ok');
          },
        }, '删除'),
      ),
    );
    modal.open('删除题目', content);
  }

  private openRoster(): void {
    const state = getStore();
    const ta = h('textarea', {
      rows: '8',
      placeholder: '每行一位学员，格式：姓名,学号',
      style: 'width:100%;font-family:var(--mono);font-size:12px',
    }) as HTMLTextAreaElement;
    ta.value = state.roster.map((r) => `${r.name},${r.studentNo}`).join('\n');
    const content = h('div', {},
      h('p', { class: 'hintline', style: 'margin:0 0 8px' }, '名单仅用于登记与统计，不限制学号格式。留空则从提交时填写的姓名统计。'),
      ta,
      h('div', { class: 'actions' },
        h('button', { onclick: () => modal.close() }, '取消'),
        h('button', {
          class: 'primary',
          onclick: () => {
            const roster = ta.value
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [name, no = ''] = line.split(/[,，\t]/);
                return { name: name.trim(), studentNo: no.trim() };
              })
              .filter((r) => r.name);
            updateStore((s) => {
              s.roster = roster;
            });
            modal.close();
            this.refresh();
            toast(`已保存 ${roster.length} 位学员`, 'ok');
          },
        }, '保存名单'),
      ),
    );
    modal.open('学员名单', content);
  }

  private openEditor(existing: Assignment | null): void {
    const a: Assignment = existing
      ? JSON.parse(JSON.stringify(existing))
      : {
          id: makeId('task'),
          title: '',
          brief: '',
          nx: 12,
          ny: 12,
          nz: 12,
          layerRows: [3, 3, 3, 3],
          mirrorRequired: false,
          faceBudget: 4000,
          dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          allowLate: true,
          status: 'open',
          createdAt: new Date().toISOString(),
        };

    const title = input('text', a.title, '例：T0601 南段第 1 次地层实习');
    const brief = h('textarea', { rows: '3', placeholder: '给学员的说明…' }) as HTMLTextAreaElement;
    brief.value = a.brief;
    const nx = input('number', String(a.nx));
    const nz = input('number', String(a.nz));
    const mirror = h('input', { type: 'checkbox' }) as HTMLInputElement;
    mirror.checked = a.mirrorRequired;
    const budget = input('number', String(a.faceBudget));
    const due = h('input', { type: 'datetime-local' }) as HTMLInputElement;
    due.value = toLocalInput(a.dueAt);
    const late = h('input', { type: 'checkbox' }) as HTMLInputElement;
    late.checked = a.allowLate;

    const layersBox = h('div', { class: 'layers-editor' });
    const totalEl = h('span', { class: 'hintline' });
    const depthEl = h('span', { class: 'hintline' });
    // 以数字数组为唯一数据源，输入框只是它的视图
    const values: number[] = a.layerRows.length ? [...a.layerRows] : [3];

    const readRows = () => {
      const inputs = Array.from(layersBox.querySelectorAll('input[type=number]')) as HTMLInputElement[];
      inputs.forEach((inp, i) => {
        values[i] = Math.max(1, Math.min(48, Math.round(Number(inp.value) || 1)));
      });
      return values;
    };

    const recompute = () => {
      readRows();
      const total = values.reduce((x, y) => x + y, 0);
      totalEl.textContent = `${values.length} 层，合计 ${total} 行`;
      depthEl.textContent = `探方 Y 轴深度将设为 ${total} 行（每层厚度之和）`;
    };

    const paintRows = () => {
      clear(layersBox);
      values.forEach((v, i) => {
        const inp = input('number', String(v), '1');
        inp.min = '1';
        inp.max = '48';
        inp.addEventListener('input', recompute);
        layersBox.append(
          h('div', { class: 'layer-row' },
            h('span', { class: 'tiny dim' }, `第 ${i + 1} 层`),
            inp,
            h('button', {
              class: 'ghost tiny',
              title: values.length > 1 ? '删除该层' : '至少保留一层',
              disabled: values.length <= 1,
              onclick: () => {
                readRows();
                values.splice(i, 1);
                paintRows();
                recompute();
              },
            }, '−'),
          ),
        );
      });
      recompute();
    };
    paintRows();

    const content = h('div', {},
      h('div', { class: 'form' },
        field('题目名称', title, true),
        field('探方边长（X 格）', nx),
        field('探方边长（Z 格）', nz),
        field('三角面预算', budget, false, '0 表示不限；超预算时学员需减面才能导出'),
        h('div', { class: 'field full' }, h('label', {}, '题目说明'), brief),
        h('div', { class: 'field full' },
          h('div', { class: 'row', style: 'justify-content:space-between' },
            h('label', {}, '地层划分（自上而下的层厚，单位为体素行）'),
            h('div', { class: 'row' },
              totalEl,
              h('button', {
                class: 'ghost tiny',
                onclick: () => {
                  readRows();
                  values.push(3);
                  paintRows();
                },
              }, '＋ 加层'),
            ),
          ),
          layersBox,
          depthEl,
        ),
        h('div', { class: 'field' }, h('label', {}, '截止时间'), due),
        h('div', { class: 'check-field' }, checkboxRow('截止后允许迟交', late)),
        h('div', { class: 'check-field' }, checkboxRow('要求左右镜像对称', mirror)),
      ),
      h('div', { class: 'actions' },
        h('button', { onclick: () => modal.close() }, '取消'),
        h('button', {
          class: 'primary',
          onclick: () => {
            readRows();
            const name = title.value.trim();
            if (!name) {
              toast('请填写题目名称', 'warn');
              title.focus();
              return;
            }
            const totalRows = values.reduce((x, y) => x + y, 0);
            const next: Assignment = {
              ...a,
              title: name,
              brief: brief.value.trim(),
              nx: clampInt(Number(nx.value), 4, 40, 12),
              nz: clampInt(Number(nz.value), 4, 40, 12),
              ny: totalRows,
              layerRows: [...values],
              mirrorRequired: mirror.checked,
              faceBudget: Math.max(0, Math.floor(Number(budget.value) || 0)),
              dueAt: fromLocalInput(due.value),
              allowLate: late.checked,
            };
            updateStore((s) => {
              const i = s.assignments.findIndex((x) => x.id === next.id);
              if (i >= 0) s.assignments[i] = next;
              else s.assignments.push(next);
            });
            modal.close();
            this.refresh();
            toast(existing ? '题目已更新' : '题目已发布', 'ok');
          },
        }, existing ? '保存修改' : '发布题目'),
      ),
    );
    modal.open(existing ? '编辑题目' : '新建题目', content, { wide: true });
  }

  // ── 复核 ──
  private openReview(sub: Submission): void {
    const state = getStore();
    const a = state.assignments.find((x) => x.id === sub.assignmentId);
    const expected = a ? assignmentExpectedShares(a) : [];
    const scoreInput = input('number', String(sub.review?.score ?? Math.round((sub.autoScore / sub.autoMax) * 30)));
    scoreInput.min = '0';
    scoreInput.max = '30';
    scoreInput.step = '0.5';
    const gradeInput = input('text', sub.review?.grader ?? state.teacher);
    const comment = h('textarea', { rows: '4', placeholder: '逐层复核意见、层位判断说明…' }) as HTMLTextAreaElement;
    comment.value = sub.review?.comment ?? '';

    const checkCells = h('div', { class: 'review-grid' });
    for (const c of sub.checks) {
      checkCells.append(
        h('div', { class: 'rcheck' },
          h('div', { class: 'lbl' }, `${c.label} · ${c.score.toFixed(1)} / ${c.max.toFixed(0)}`),
          h('div', { class: c.pass ? 'ok tiny' : 'bad tiny' }, c.pass ? '系统判定通过' : '系统判定未通过'),
          h('div', { class: 'det' }, c.detail),
        ),
      );
    }

    const layerBars = h('div', { class: 'layerbar' });
    sub.stats.layerFilled.forEach((filled, i) => {
      const share = sub.stats.shares[i] ?? 0;
      const exp = expected[i] ?? 0;
      layerBars.append(
        h('div', { class: 'lb' },
          h('span', { class: 'dim' }, layerLabel(i)),
          h('div', { class: 'lbt' },
            h('div', { class: 'lbf', style: `width:${Math.min(100, share * 100)}%` }),
            h('div', { class: 'lbm', style: `left:${Math.min(100, exp * 100)}%` }),
          ),
          h('span', { class: 'tiny faint', style: 'font-family:var(--mono);text-align:right' },
            `${pct(share, 0)} / ${pct(exp, 0)}`),
        ),
      );
    });

    let preview: HTMLElement | null = null;
    try {
      const grid = VoxelGrid.deserialize(sub.payload);
      const mesh = meshGrid(grid);
      preview = this.buildPreview(grid, mesh);
    } catch (err) {
      preview = h('div', { class: 'tiny bad' }, '提交数据无法解析：' + (err instanceof Error ? err.message : String(err)));
    }

    const content = h('div', { class: 'review-form' },
      h('div', { class: 'row', style: 'justify-content:space-between' },
        h('div', {},
          h('div', { class: 'strong' }, `${sub.student} · ${a?.title ?? '题目已删除'}`),
          h('div', { class: 'tiny faint' }, `提交于 ${sub.submittedAt.slice(0, 16).replace('T', ' ')}${sub.late ? '（迟交）' : ''}`),
        ),
        h('span', { class: `tag ${sub.autoScore >= sub.autoMax * 0.6 ? 'ok' : 'bad'}` },
          `自动 ${sub.autoScore.toFixed(1)} / ${sub.autoMax}`),
      ),
      h('div', { class: 'statgrid' },
        stat(String(sub.stats.voxelCount), '体素总数'),
        stat(String(sub.checks.find((c) => c.key === 'layers')?.detail.match(/(\d+)\s*层/)?.[1] ?? '—'), '已建层数'),
        stat(pct(sub.stats.mirrorRatio, 0), '镜像一致率'),
        stat(fmt(sub.stats.triCount), '三角面'),
      ),
      h('div', { class: 'split' },
        h('div', {}, checkCells, layerBars),
        h('div', {}, preview ?? h('div', {})),
      ),
      sub.issues.length
        ? h('div', { class: 'issue-box' },
            h('div', { class: 'tiny dim', style: 'margin-bottom:5px' }, '系统核对问题'),
            h('div', { class: 'chips' },
              ...sub.issues.map((i) => h('span', { class: `tag ${i.severity === 'fail' ? 'bad' : 'warn'}` }, `${ISSUE_LABELS[i.code] ?? i.label}：${i.detail}`)),
            ),
          )
        : h('div', { class: 'ok tiny issue-box' }, '系统自动核对通过'),
      h('div', { class: 'form' },
        field('复核得分（0–30）', scoreInput),
        field('复核教师', gradeInput),
        h('div', { class: 'field full' }, h('label', {}, '评语'), comment),
      ),
      h('div', { class: 'actions' },
        h('div', { class: 'grow' }),
        h('button', { onclick: () => this.downloadSubmission(sub) }, '导出 OBJ'),
        h('button', { onclick: () => modal.close() }, '取消'),
        h('button', {
          class: 'primary',
          onclick: () => {
            const score = Math.max(0, Math.min(30, Number(scoreInput.value) || 0));
            updateStore((s) => {
              const target = s.submissions.find((x) => x.id === sub.id);
              if (!target) return;
              target.review = {
                score,
                max: 30,
                comment: comment.value.trim(),
                gradedAt: new Date().toISOString(),
                grader: gradeInput.value.trim() || s.teacher,
              };
            });
            modal.close();
            this.refresh();
            toast(`已复核 ${sub.student}：${score.toFixed(1)} 分`, 'ok');
          },
        }, '提交评分'),
      ),
    );
    modal.open('复核提交', content, { wide: true });
  }

  private buildPreview(grid: VoxelGrid, mesh: ReturnType<typeof meshGrid>): HTMLElement {
    const canvas = h('canvas', { class: 'preview-canvas' }) as HTMLCanvasElement;
    // 简易离屏绘制：用 2D 投影画等轴测方块点云（避免一个弹窗里再开一个 WebGL 上下文）
    requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 400;
      const hgt = canvas.clientHeight || 260;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(hgt * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0f1114';
      ctx.fillRect(0, 0, w, hgt);
      const { nx, ny, nz } = grid.dims;
      const scale = Math.min(w / (nx + nz) / 0.86, hgt / (ny + (nx + nz) * 0.5)) * 0.9;
      const cx = w / 2;
      const baseY = hgt * 0.78;
      const cells: Array<{ x: number; y: number; z: number; depth: number }> = [];
      for (let y = 0; y < ny; y++)
        for (let z = 0; z < nz; z++)
          for (let x = 0; x < nx; x++) {
            if (!grid.mat[grid.index(x, y, z)]) continue;
            cells.push({ x, y, z, depth: x + z + (ny - y) * 0.001 });
          }
      cells.sort((p, q) => p.depth - q.depth);
      for (const c of cells) {
        const px = cx + (c.x - c.z) * scale * 0.86;
        const py = baseY - c.y * scale - (c.x + c.z) * scale * 0.5;
        const m = grid.mat[grid.index(c.x, c.y, c.z)];
        const hex = materialHex(m);
        const [rr, gg, bb] = hexToRgb(hex);
        const shade = 0.55 + 0.45 * (c.y / Math.max(1, ny));
        ctx.fillStyle = `rgb(${Math.round(rr * 255 * shade)},${Math.round(gg * 255 * shade)},${Math.round(bb * 255 * shade)})`;
        ctx.fillRect(px, py, scale * 0.86, scale * 0.86);
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.strokeRect(px, py, scale * 0.86, scale * 0.86);
      }
      ctx.fillStyle = 'rgba(220,225,230,.6)';
      ctx.font = '10px monospace';
      ctx.fillText(`体素 ${cells.length} · 面 ${mesh.triCount}`, 10, hgt - 10);
    });
    return h('div', {}, h('div', { class: 'tiny faint', style: 'margin-bottom:5px' }, '提交内容预览'), canvas);
  }

  private downloadSubmission(sub: Submission): void {
    try {
      const grid = VoxelGrid.deserialize(sub.payload);
      const mesh = meshGrid(grid);
      const obj = meshToObj(mesh, grid.dims);
      download(`${sub.student}_${sub.assignmentId}.obj`, obj, 'model/obj');
      toast('已导出 OBJ', 'ok');
    } catch (err) {
      toast('导出失败：' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  }
}

function materialHex(id: number): string {
  const map = ['#888888', '#8d7c66', '#b89966', '#a2674c', '#5f5d59', '#d2bb8a', '#413d38', '#b7b2a2', '#2e2a25'];
  return map[id] ?? '#888888';
}

function input(type: string, value: string, placeholder = ''): HTMLInputElement {
  const el = h('input', { type, placeholder }) as HTMLInputElement;
  el.value = value;
  return el;
}

function field(label: string, control: HTMLElement, full = false, hint = ''): HTMLElement {
  return h('div', { class: `field ${full ? 'full' : ''}` },
    h('label', {}, label),
    control,
    hint ? h('div', { class: 'hintline' }, hint) : null,
  );
}

function checkboxRow(label: string, box: HTMLInputElement): HTMLElement {
  return h('label', { class: 'check-row-inline' }, box, h('span', {}, label));
}

function stat(v: string, k: string): HTMLElement {
  return h('div', { class: 'stat' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k));
}

function clampInt(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string {
  if (!v) return new Date(Date.now() + 7 * 86400000).toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

define('teacher-view', TeacherView);
