import { createMemo, createSignal } from 'solid-js';
import { eduStore } from '../store/education';
import AssignmentModal from './AssignmentModal';
import type { Submission } from '../core/types';

function BoardTab() {
  const rows = createMemo(() => eduStore.buildDashboard());
  return (
    <div>
      <h3 style={{ margin: '4px 0 12px' }}>班级看板 · 错题与常见错法汇总</h3>
      {rows().length === 0 && <p class="muted">还没有作业数据。</p>}
      <div class="card-grid">
        {rows().map((r) => (
          <div class="card">
            <h4>{r.assignmentTitle}</h4>
            <div class="row" style={{ 'margin-bottom': '10px', 'flex-wrap': 'wrap' }}>
              <span class="pill">提交 {r.total} 人</span>
              <span class="pill ok">自动通过 {r.autoPassed} 人</span>
              <span class="pill">已批改 {r.graded} 人</span>
              {r.avgScore !== null && <span class="pill">平均分 {r.avgScore.toFixed(1)}</span>}
            </div>
            {r.commonMistakes.length === 0 ? (
              <p class="muted" style={{ 'font-size': '12px' }}>暂无错题记录 🎉</p>
            ) : (
              <table class="table">
                <thead>
                  <tr>
                    <th>常见错法</th>
                    <th style={{ width: '70px' }}>人次</th>
                  </tr>
                </thead>
                <tbody>
                  {r.commonMistakes.map((m) => (
                    <tr>
                      <td>{m.label}</td>
                      <td class="mono">{m.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {r.failureItems.length > 0 && (
              <div style={{ 'margin-top': '10px' }}>
                {r.failureItems.map((f) => (
                  <details style={{ 'margin-bottom': '6px' }}>
                    <summary style={{ cursor: 'pointer', 'font-weight': 600 }}>
                      {f.item}（{f.count} 人未通过）
                    </summary>
                    <ul style={{ margin: '6px 0', 'padding-left': '18px' }}>
                      {f.samples.map((s) => (
                        <li class="muted" style={{ 'font-size': '12px', 'margin-bottom': '4px' }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmissionsTab() {
  const subs = createMemo(() => eduStore.submissions());
  const [scoreDraft, setScoreDraft] = createSignal<Record<string, string>>({});
  const [commentDraft, setCommentDraft] = createSignal<Record<string, string>>({});

  const grade = (s: Submission) => {
    const score = parseFloat(scoreDraft()[s.id] ?? '');
    if (!Number.isFinite(score)) return;
    eduStore.gradeSubmission(s.id, score, commentDraft()[s.id] ?? '');
  };

  return (
    <div>
      <h3 style={{ margin: '4px 0 12px' }}>学员提交 · 复核打分</h3>
      {subs().length === 0 && <p class="muted">暂无学员提交。</p>}
      {subs().map((s) => {
        const asg = eduStore.assignments().find((a) => a.id === s.assignmentId);
        return (
          <div class="card" style={{ margin: '0 0 12px', padding: '14px' }}>
            <div class="row" style={{ 'align-items': 'flex-start' }}>
              <div style={{ flex: 2 }}>
                <h4 style={{ margin: '0 0 4px' }}>
                  {s.studentName} · {asg?.title ?? '（作业已删除）'}
                </h4>
                <div class="muted" style={{ 'font-size': '12px', 'margin-bottom': '8px' }}>
                  {new Date(s.submittedAt).toLocaleString('zh-CN')} · 体积 {s.volume.toFixed(1)} mm³ · 视图 {s.viewCount} 个
                </div>
                <div>
                  {s.checks.map((c) => (
                    <span
                      class={`tag ${c.status}`}
                      style={{ 'margin-right': '6px', 'margin-bottom': '4px', display: 'inline-block' }}
                      title={c.detail}
                    >
                      {c.item} {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : '!'}
                    </span>
                  ))}
                </div>
                {s.gradedAt !== null && (
                  <div style={{ 'margin-top': '8px' }}>
                    <span class="pill ok">得分 {s.score}</span>
                    {s.teacherComment && <span class="muted" style={{ 'margin-left': '10px' }}>评语：{s.teacherComment}</span>}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, 'min-width': '220px' }}>
                <div class="row">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="分数 0-100"
                    value={scoreDraft()[s.id] ?? (s.score !== null ? String(s.score) : '')}
                    onInput={(e) => setScoreDraft((m) => ({ ...m, [s.id]: e.currentTarget.value }))}
                  />
                  <button class="primary" onClick={() => grade(s)}>
                    打分
                  </button>
                </div>
                <input
                  style={{ 'margin-top': '6px' }}
                  placeholder="复核评语（可选）"
                  value={commentDraft()[s.id] ?? s.teacherComment}
                  onInput={(e) => setCommentDraft((m) => ({ ...m, [s.id]: e.currentTarget.value }))}
                />
                <button style={{ 'margin-top': '6px', width: '100%' }} onClick={() => eduStore.loadSubmissionModel(s)}>
                  载入模型查看
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssignmentsTab(props: { onCreate: () => void }) {
  return (
    <div>
      <div class="row" style={{ margin: '4px 0 12px' }}>
        <h3 style={{ margin: 0, border: 'none', flex: 1 }}>作业列表（尺寸要求）</h3>
        <button class="primary" onClick={props.onCreate} style={{ width: 'auto' }}>
          + 布置作业
        </button>
      </div>
      {eduStore.assignments().length === 0 && <p class="muted">还没有布置过作业。</p>}
      <div class="card-grid">
        {eduStore.assignments().map((a) => (
          <div class="card">
            <h4>{a.title}</h4>
            <p class="muted" style={{ 'white-space': 'pre-wrap' }}>{a.description}</p>
            <table class="table">
              <tr>
                <th>目标体积</th>
                <td class="mono">
                  {a.targetVolume.toFixed(0)} mm³ ±{(a.volumeTolerance * 100).toFixed(0)}%
                </td>
              </tr>
              <tr>
                <th>运算要求</th>
                <td>{a.requiredOps.map((o) => (o === 'add' ? '并集' : o === 'subtract' ? '差集' : '交集')).join('、')}</td>
              </tr>
              <tr>
                <th>三视图</th>
                <td>{a.requireThreeViews ? '要求主/俯/左' : '不要求'}</td>
              </tr>
              <tr>
                <th>最少体块</th>
                <td>{a.minFeatures}</td>
              </tr>
            </table>
            <button class="danger" style={{ 'margin-top': '10px' }} onClick={() => eduStore.deleteAssignment(a.id)}>
              撤回作业
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherView() {
  const [tab, setTab] = createSignal<'board' | 'subs' | 'asg'>('board');
  const [showCreate, setShowCreate] = createSignal(false);

  return (
    <div style={{ padding: '16px 22px', overflow: 'auto', height: '100%' }}>
      <div class="tabs">
        <button classList={{ toggled: tab() === 'board' }} onClick={() => setTab('board')}>
          班级看板
        </button>
        <button classList={{ toggled: tab() === 'subs' }} onClick={() => setTab('subs')}>
          提交复核（{eduStore.submissions().length}）
        </button>
        <button classList={{ toggled: tab() === 'asg' }} onClick={() => setTab('asg')}>
          作业管理（{eduStore.assignments().length}）
        </button>
      </div>
      {tab() === 'board' && <BoardTab />}
      {tab() === 'subs' && <SubmissionsTab />}
      {tab() === 'asg' && <AssignmentsTab onCreate={() => setShowCreate(true)} />}
      {showCreate() && <AssignmentModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
