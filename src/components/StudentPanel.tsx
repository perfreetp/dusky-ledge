import { createMemo, createSignal } from 'solid-js';
import { eduStore } from '../store/education';
import { evaluated } from '../store/evaluated';
import type { AssignmentSpec, Submission } from '../core/types';

export default function StudentPanel() {
  const [selectedId, setSelectedId] = createSignal<string>('');
  const [lastSub, setLastSub] = createSignal<Submission | null>(null);
  const entry = createMemo(() => evaluated());

  const assignments = createMemo(() => eduStore.assignments());
  const current = createMemo<AssignmentSpec | undefined>(() =>
    assignments().find((a) => a.id === selectedId()),
  );

  const mySubs = createMemo(() =>
    eduStore
      .submissions()
      .filter((s) => s.studentName === eduStore.profile().name)
      .filter((s) => !selectedId() || s.assignmentId === selectedId()),
  );

  const onSubmit = () => {
    const asg = current();
    if (!asg) return;
    const sub = eduStore.submitWork(asg.id, eduStore.profile().name);
    if (sub) setLastSub(sub);
  };

  return (
    <div>
      <h3>老师布置的作业</h3>
      {assignments().length === 0 && <p class="muted">暂无作业。切换到「老师」角色可布置作业。</p>}
      <select value={selectedId()} onChange={(e) => setSelectedId(e.currentTarget.value)}>
        <option value="">— 选择作业 —</option>
        {assignments().map((a) => (
          <option value={a.id}>{a.title}</option>
        ))}
      </select>

      {current() && (
        <div class="card" style={{ margin: '10px 0', padding: '12px' }}>
          <h4>{current()!.title}</h4>
          <p class="muted" style={{ 'white-space': 'pre-wrap' }}>
            {current()!.description}
          </p>
          <table class="table">
            <tr>
              <th>目标体积</th>
              <td class="mono">
                {current()!.targetVolume.toFixed(0)} mm³ ±{(current()!.volumeTolerance * 100).toFixed(0)}%
              </td>
            </tr>
            <tr>
              <th>当前体积</th>
              <td class="mono">{entry().result.volume.toFixed(1)} mm³</td>
            </tr>
            <tr>
              <th>要求运算</th>
              <td>{current()!.requiredOps.map((o) => (o === 'add' ? '并集' : o === 'subtract' ? '差集' : '交集')).join('、')}</td>
            </tr>
            <tr>
              <th>最少体块</th>
              <td>{current()!.minFeatures} 个</td>
            </tr>
          </table>
          <button class="primary" style={{ width: '100%', 'margin-top': '10px' }} onClick={onSubmit}>
            提交当前模型并自动核对
          </button>
        </div>
      )}

      {lastSub() && (
        <>
          <h3>本次自动核对结果</h3>
          <div style={{ margin: '6px 0 10px' }}>
            {lastSub()!.autoPassed ? (
              <span class="pill ok">自动核对通过，等待老师复核打分</span>
            ) : (
              <span class="pill bad">自动核对未通过，可修改后重新提交</span>
            )}
          </div>
          {lastSub()!.checks.map((c) => (
            <div class={`check-item ${c.status}`}>
              <div class="head">
                <span>{c.item}</span>
                <span class={`tag ${c.status}`}>{c.status === 'pass' ? '通过' : c.status === 'fail' ? '未过' : '提醒'}</span>
              </div>
              <div class="detail">{c.detail}</div>
            </div>
          ))}
        </>
      )}

      <h3>我的提交记录</h3>
      {mySubs().length === 0 && <p class="muted">还没有提交记录。</p>}
      {mySubs().map((s) => (
        <div class="check-item">
          <div class="head">
            <span>{new Date(s.submittedAt).toLocaleString('zh-CN')}</span>
            {s.gradedAt !== null ? <span class="tag pass">得分 {s.score}</span> : s.autoPassed ? <span class="pill ok">待复核</span> : <span class="pill bad">待修改</span>}
          </div>
          <div class="detail">
            体积 {s.volume.toFixed(1)} mm³ · 视图 {s.viewCount} 个
            {s.teacherComment && <div>老师评语：{s.teacherComment}</div>}
          </div>
          <button style={{ 'margin-top': '6px' }} onClick={() => eduStore.loadSubmissionModel(s)}>
            载入该模型
          </button>
        </div>
      ))}
    </div>
  );
}
