import { createMemo, createSignal, For } from 'solid-js';
import { actions, state } from '../state/store';
import type { Annotation, AnnotationStatus } from '../types';

import { css } from '../ui/style';
const STATUS_LABEL: Record<AnnotationStatus, string> = {
  open: '待处理',
  inProgress: '处理中',
  resolved: '已解决',
  rejected: '已驳回',
};

const STATUS_FLOW: AnnotationStatus[] = ['open', 'inProgress', 'resolved', 'rejected'];

/** 批注工作流：审核人打点建意见，制作方逐条回复并流转处理状态。 */
export default function AnnotationPanel() {
  const [reply, setReply] = createSignal<Record<string, string>>({});
  const list = createMemo(() =>
    [...state.annotations].sort((a, b) => (a.status === 'resolved' ? 1 : 0) - (b.status === 'resolved' ? 1 : 0) || b.createdAt - a.createdAt),
  );

  const sendReply = (a: Annotation) => {
    const body = reply()[a.id]?.trim();
    if (!body) return;
    actions.replyAnnotation(a.id, body).then(() => setReply((r) => ({ ...r, [a.id]: '' })));
  };

  return (
    <>
      <div class="section-title">
        审核批注（{list().length}）
        <span class="muted" style={css({ 'font-weight': 400, 'margin-left': 6 })}>
          当前角色：{state.role === 'reviewer' ? '审核人' : '制作方'}
        </span>
      </div>
      <p class="muted" style={css({ 'font-size': 11 })}>
        审核人在 3D 视图选择「批注打点」后点击洞壁即可新增；锚点按里程+局部坐标保存，重生成后自动重投影。
      </p>
      <For each={list()}>
        {(a) => (
          <div class="annotation-item">
            <div class="row">
              <span class={`tag status-${a.status}`}>{STATUS_LABEL[a.status]}</span>
              <span class="muted" style={css({ flex: 'none', 'font-size': 11 })}>
                {a.authorRole === 'reviewer' ? '审核人' : '制作方'} · {new Date(a.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div style={css({ margin: '6px 0' })}>{a.body}</div>
            {a.anchor.stale && <div class="muted" style={css({ color: 'var(--accent)', 'font-size': 11 })}>锚点已失效，显示的是打点时的位置快照。</div>}
            <For each={a.replies}>
              {(r) => (
                <div class="reply">
                  <strong>{r.role === 'reviewer' ? '审核人' : '制作方'}：</strong>
                  {r.body}
                </div>
              )}
            </For>
            <div class="row" style={css({ 'margin-top': 6 })}>
              <input
                placeholder="回复处理意见…"
                value={reply()[a.id] ?? ''}
                onInput={(e) => setReply((r) => ({ ...r, [a.id]: e.currentTarget.value }))}
                onKeyDown={(e) => e.key === 'Enter' && sendReply(a)}
              />
              <button style={css({ flex: 'none' })}  onClick={() => sendReply(a)}>
                回复
              </button>
            </div>
            {state.role === 'maker' && (
              <div class="row" style={css({ 'margin-top': 6 })}>
                {STATUS_FLOW.map((s) => (
                  <button
                    classList={{ primary: a.status === s }}
                    onClick={() => actions.setAnnotationStatus(a.id, s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </For>
      {list().length === 0 && <p class="muted">还没有批注。切换到审核人角色，在三维画面上打点即可创建。</p>}
    </>
  );
}
