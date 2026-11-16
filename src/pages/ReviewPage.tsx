// 页面二：批注审核。审核人在画布打点批注，制作方逐条回复并流转状态
import { createMemo, createSignal, For, Show } from 'solid-js'
import EditorCanvas from '../components/EditorCanvas.tsx'
import { state, makeAnnotation, loadDoc, snapshotDoc } from '../store/app.ts'
import { versionStore } from '../lib/versionStore.ts'
import type { Annotation, AnnotationStatus, VersionRecord } from '../types.ts'
import { uid, clone } from '../lib/utils.ts'

const STATUS_LABEL: Record<AnnotationStatus, string> = {
  open: '待处理', replied: '已回复待确认', resolved: '已闭环',
}

export default function ReviewPage() {
  const versions = createMemo(() => versionStore.list())
  const [verId, setVerId] = createSignal<string>('')
  const [record, setRecord] = createSignal<VersionRecord | null>(null)
  const [anns, setAnns] = createSignal<Annotation[]>([])
  const [selected, setSelected] = createSignal<string | null>(null)
  const [draft, setDraft] = createSignal('')
  const [reviewer, setReviewer] = createSignal('审核人-李工')
  const [maker, setMaker] = createSignal('制作方-王工')
  const [filter, setFilter] = createSignal<'all' | AnnotationStatus>('all')

  function openVersion(id: string) {
    const rec = versionStore.get(id)
    if (!rec) return
    setVerId(id)
    setRecord(rec)
    setAnns(clone(rec.annotations))
    setSelected(null)
    loadDoc(clone(rec.doc), `审核 ${rec.version}`)
  }

  function persist(next: Annotation[]) {
    setAnns(next)
    if (verId()) versionStore.update(verId(), { annotations: clone(next) })
  }

  function onCanvasAnnotation(a: Annotation) {
    a.author = reviewer()
    persist([...anns(), a])
    setSelected(a.id)
  }

  function saveAnnotationText(id: string, text: string) {
    persist(anns().map(a => a.id === id ? { ...a, text } : a))
  }

  function reply(id: string) {
    if (!draft().trim()) return
    const next = anns().map(a => {
      if (a.id !== id) return a
      return {
        ...a,
        replies: [...a.replies, { id: uid('rep'), author: maker(), text: draft().trim(), createdAt: Date.now() }],
        status: 'replied' as AnnotationStatus,
      }
    })
    persist(next)
    setDraft('')
  }

  function setStatus(id: string, status: AnnotationStatus) {
    persist(anns().map(a => a.id === id ? { ...a, status } : a))
  }

  const filtered = createMemo(() =>
    filter() === 'all' ? anns() : anns().filter(a => a.status === filter()))

  const sel = createMemo(() => anns().find(a => a.id === selected()) ?? null)

  return (
    <div class="workspace">
      <aside class="sidebar">
        <div class="panel">
          <h3>选择审核版本</h3>
          <Show when={versions().length === 0}>
            <div class="hint">尚无提交版本。请先在「轮廓编辑」页提交。</div>
          </Show>
          <For each={versions()}>
            {v => (
              <div
                class={`ver-item ${verId() === v.id ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => openVersion(v.id)}
              >
                <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                  <b class="pill">{v.version}</b>
                  <span class="muted">{new Date(v.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div class="hint">{v.projectNo} · {v.equipmentNo}</div>
                <div class="hint">批注 {v.annotations.length} 条 · {v.submitter}</div>
              </div>
            )}
          </For>
        </div>
        <div class="panel">
          <h3>身份</h3>
          <label>审核人</label>
          <input value={reviewer()} onInput={e => setReviewer(e.currentTarget.value)} />
          <label style={{ display: 'block', 'margin-top': '6px' }}>制作方</label>
          <input value={maker()} onInput={e => setMaker(e.currentTarget.value)} />
        </div>
      </aside>

      <div style={{ flex: 1, 'min-width': 0, display: 'flex', 'flex-direction': 'column' }}>
        <Show when={record()} fallback={<div class="page"><div class="card">请从左侧选择一个版本进入审核画布。</div></div>}>
          <EditorCanvas
            annotations={anns()}
            annotationMode
            onAddAnnotation={onCanvasAnnotation}
          />
        </Show>
      </div>

      <aside class="sidebar right">
        <div class="panel">
          <h3>批注流（{anns().length}）</h3>
          <div class="grid4" style={{ 'margin-bottom': '8px' }}>
            {(['all', 'open', 'replied', 'resolved'] as const).map(f => (
              <button class={`mini ${filter() === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? '全部' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
          <Show when={filtered().length === 0}><div class="hint">无批注。在画布上点击打点。</div></Show>
          <For each={filtered()}>
            {a => (
              <div
                class="ann-item"
                style={{ cursor: 'pointer', 'border-left-width': '3px', 'border-left-color':
                  a.status === 'resolved' ? 'var(--ok)' : a.status === 'replied' ? '#3b82f6' : 'var(--danger)' }}
                onClick={() => setSelected(a.id)}
              >
                <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                  <b>{a.author}</b>
                  <span class={`tag ${a.status}`}>{STATUS_LABEL[a.status]}</span>
                </div>
                <div class="hint mono">({a.point.x.toFixed(0)}, {a.point.y.toFixed(0)}) mm</div>
                <div style={{ margin: '4px 0' }}>{a.text || <span class="muted">（待填写内容）</span>}</div>
                <Show when={a.id === selected()}>
                  <textarea
                    placeholder="审核意见…"
                    value={a.text}
                    onClick={e => e.stopPropagation()}
                    onInput={e => saveAnnotationText(a.id, e.currentTarget.value)}
                  />
                  <For each={a.replies}>
                    {r => (
                      <div class="reply">
                        <b>{r.author}</b> <span class="muted">{new Date(r.createdAt).toLocaleTimeString('zh-CN')}</span>
                        <div>{r.text}</div>
                      </div>
                    )}
                  </For>
                  <div class="row" style={{ 'margin-top': '6px' }}>
                    <input
                      placeholder="制作方回复…"
                      value={selected() === a.id ? draft() : ''}
                      onClick={e => e.stopPropagation()}
                      onInput={e => setDraft(e.currentTarget.value)}
                    />
                    <button class="fixed" onClick={e => { e.stopPropagation(); reply(a.id) }}>回复</button>
                  </div>
                  <div class="status-flow" style={{ 'margin-top': '6px' }}>
                    <button class="mini" classList={{ active: a.status === 'open' }} onClick={e => { e.stopPropagation(); setStatus(a.id, 'open') }}>待处理</button>
                    <button class="mini" classList={{ active: a.status === 'replied' }} onClick={e => { e.stopPropagation(); setStatus(a.id, 'replied') }}>已回复</button>
                    <button class="mini primary" classList={{ active: a.status === 'resolved' }} onClick={e => { e.stopPropagation(); setStatus(a.id, 'resolved') }}>闭环</button>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
        <Show when={sel()}>
          <div class="panel">
            <h3>当前批注</h3>
            <div class="hint">状态变更与回复均实时写回版本 {record()?.version}，制作方处理后由审核人闭环。</div>
          </div>
        </Show>
      </aside>
    </div>
  )
}

void snapshotDoc
