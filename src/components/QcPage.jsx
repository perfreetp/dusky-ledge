// 质检页:批量自动检查 -> 问题分级 -> 复核员确认/驳回 -> 放行或退回
import { For, Show, createMemo, createSignal } from 'solid-js';
import { state, runQc, reviewIssue, qcSummary, releaseBatch, returnBatch } from '../state/store.js';

const SEV_LABEL = { error: '严重', warning: '一般', info: '提示' };
const REVIEW_LABEL = { pending: '待复核', confirmed: '已确认', dismissed: '已驳回' };

function IssueRow(props) {
  const [note, setNote] = createSignal(props.issue.note || '');
  const i = () => props.issue;
  return (
    <tr class={`sev-${i().severity}`}>
      <td><span class={`badge sev-badge-${i().severity}`}>{SEV_LABEL[i().severity]}</span></td>
      <td>{i().animName}</td>
      <td>{i().type}</td>
      <td class="msg">{i().message}</td>
      <td>
        <span class={`badge rev-${i().review}`}>{REVIEW_LABEL[i().review]}</span>
      </td>
      <td class="review-cell">
        <input
          class="text slim" placeholder="复核备注"
          value={note()}
          onInput={(e) => setNote(e.currentTarget.value)}
          onChange={() => reviewIssue(i().id, i().review, note())}
        />
        <button class="btn small" disabled={i().review === 'confirmed'}
          onClick={() => reviewIssue(i().id, 'confirmed', note())}>确认</button>
        <button class="btn small" disabled={i().review === 'dismissed'}
          onClick={() => reviewIssue(i().id, 'dismissed', note())}>驳回</button>
      </td>
    </tr>
  );
}

export default function QcPage() {
  const summary = createMemo(() => qcSummary());
  const grouped = createMemo(() => {
    const g = {};
    for (const i of state.qc.issues) {
      (g[i.animId] = g[i.animId] || []).push(i);
    }
    return g;
  });

  return (
    <div class="page">
      <div class="panel">
        <div class="panel-title">
          质检批次({state.qc.batch.length} 条动画)
          <span class="spacer" />
          <button class="btn primary" disabled={!state.qc.batch.length} onClick={runQc}>
            ▶ 运行自动检查
          </button>
        </div>
        <Show when={state.qc.batch.length} fallback={
          <div class="hint-block">尚未送检 —— 请到「动作库」勾选条目后点击「送质检」</div>
        }>
          <div class="row wrap">
            <For each={state.qc.batch}>
              {(b) => <span class="chip">{b.name} · {b.anim.frames} 帧 @ {b.anim.fps}fps</span>}
            </For>
          </div>
          <Show when={state.qc.ran}>
            <div class="qc-summary">
              <span>问题总数 <b>{summary().total}</b></span>
              <span class="c-err">严重 <b>{summary().errors}</b>(待复核 {summary().pendingErrors} / 已确认 {summary().confirmedErrors})</span>
              <span class="c-warn">一般 <b>{summary().warnings}</b></span>
            </div>
          </Show>
        </Show>
      </div>

      <Show when={state.qc.ran}>
        <div class="panel">
          <div class="panel-title">检查明细(按严重度排序)</div>
          <Show when={state.qc.issues.length} fallback={<div class="hint-block ok">✅ 全部通过,未发现问题</div>}>
            <table class="tbl issues">
              <thead>
                <tr><th>严重度</th><th>动画</th><th>类型</th><th>问题描述</th><th>复核状态</th><th>复核操作</th></tr>
              </thead>
              <tbody>
                <For each={state.qc.issues}>{(i) => <IssueRow issue={i} />}</For>
              </tbody>
            </table>
          </Show>
        </div>

        <div class="panel">
          <div class="panel-title">批次结论</div>
          <Show when={!state.qc.finished}>
            <div class="row">
              <button
                class="btn primary"
                disabled={!summary().canRelease}
                onClick={releaseBatch}
                title={summary().canRelease ? '' : '存在待复核或已确认的严重问题,不能放行'}
              >
                ✅ 整批放行给演出方
              </button>
              <button class="btn danger" onClick={returnBatch}>↩ 退回重新制作</button>
              <Show when={summary().pendingErrors > 0}>
                <span class="hint c-err">还有 {summary().pendingErrors} 条严重问题待复核</span>
              </Show>
              <Show when={summary().needsReturn}>
                <span class="hint c-err">存在已确认的严重问题,应退回重做</span>
              </Show>
            </div>
          </Show>
          <Show when={state.qc.finished === 'released'}>
            <div class="hint-block ok">✅ 本批已放行给演出方,动作库条目状态已更新为「已放行」。</div>
          </Show>
          <Show when={state.qc.finished === 'returned'}>
            <div class="hint-block bad">↩ 本批已退回重新制作,动作库条目状态已更新为「已退回」。</div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
